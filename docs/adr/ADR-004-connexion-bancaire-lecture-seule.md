# ADR-004 : Connexion bancaire en lecture seule (UBS via SIX bLink)

## Date

2026-09-10

## Statut

Accepté

## Contexte

Le rapprochement des encaissements est aujourd'hui manuel : l'administrateur consulte l'E-Banking UBS, identifie les virements reçus et marque les factures comme payées à la main (`/billing/invoices/:id/pay-manual`). C'est chronophage et source d'oublis, en particulier sur les paiements par QR-facture qui constituent l'essentiel des encaissements suisses.

L'objectif (issue #119) est d'importer automatiquement les écritures bancaires et de les rapprocher des factures en attente, **sans jamais pouvoir écrire sur le compte bancaire**.

### Options évaluées

| Option                                  | Accès aux données                                                              | Prérequis                                                                                                  | Coût                              | Verrous                                                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. SIX bLink (UBS)**                  | API officielle UBS : `camt.053` + endpoints JSON, scope AIS en lecture seule   | Contrat SIX « Service User », certificat client mTLS, enregistrement des URL de redirection, certification | Abonnement SIX + frais UBS        | Onboarding long (contractuel et technique)                                                                                                                     |
| **B. Bexio**                            | Bexio se connecte lui-même à UBS via bLink ; le CRM lirait ensuite l'API Bexio | Abonnement Bexio (rabais UBS 20 % la 1re année)                                                            | Licence mensuelle par utilisateur | Ajoute un intermédiaire et un second référentiel de facturation à synchroniser                                                                                 |
| **C. Agrégateur (Tink, Salt Edge)**     | Agrégation multi-banques, souvent par _screen scraping_ ou PSD2                | Contrat éditeur                                                                                            | Abonnement + coût par compte      | La PSD2 ne s'applique pas en Suisse : couverture UBS incertaine ; transmission des identifiants à un tiers, difficilement défendable pour une agence d'enquête |
| **D. Export `camt.053` de l'E-Banking** | Fichier ISO 20022 téléchargé (ou déposé par SFTP)                              | Activation gratuite du relevé camt.053 dans l'E-Banking UBS                                                | Nul                               | Dépôt manuel ou planifié, pas de temps réel                                                                                                                    |

### Constat déterminant

Les options A et D **fournissent exactement le même contenu** : un document `camt.053` normalisé ISO 20022, avec la référence QR structurée (`RmtInf/Strd/CdtrRefInf/Ref`) qui rend le rapprochement fiable. Elles ne diffèrent que par le mode de transport et le délai d'accès.

## Décision

Nous retenons **l'option A (UBS via bLink) comme cible**, avec **l'option D (import `camt.053`) comme mode de fonctionnement immédiat**, derrière une même abstraction de connecteur.

Le module `packages/api/src/modules/banking` définit l'interface `BankDataProvider` (`listAccounts`, `fetchTransactions`) et trois implémentations :

- `BlinkProvider` — UBS via bLink : OAuth2 _authorization code_ avec certificat client mTLS, scope `urn:blink:xs2a:ais`, lecture des relevés `GET /iso20022/statements` puis repli sur `GET /accounts/{id}/transactions` ;
- `CamtFileProvider` — lecture des relevés déposés dans `BANK_CAMT_IMPORT_DIR`, ou téléversés depuis le CRM ;
- `MockProvider` — jeu de démonstration dérivé des factures réellement en attente.

Le choix du connecteur est porté par chaque compte (`BankAccount.provider`), ce qui permet de basculer de D vers A sans migration : les écritures déjà importées restent valides, la clé d'idempotence `(bankAccountId, externalId)` étant identique.

**Bexio (option B) est écarté** : le CRM porte déjà le cycle devis → facture → encaissement ; y superposer Bexio dupliquerait le référentiel de facturation pour un bénéfice nul sur le rapprochement. **Les agrégateurs (option C) sont écartés** pour des raisons de confidentialité, incompatibles avec l'activité de l'agence.

### Lecture seule : garanties structurelles

1. L'interface `BankDataProvider` n'expose aucune méthode d'écriture ;
2. seul le scope AIS est demandé ; `assertReadOnlyScope()` rejette tout scope contenant `pss`, `write` ou `payment` ;
3. l'accès aux ressources bancaires passe par une méthode `get()` dont le verbe HTTP est écrit en dur ; le seul `POST` du connecteur vise le serveur d'autorisation OAuth ;
4. les jetons sont chiffrés en base (AES-256, `EncryptionUtils`) ;
5. les routes `/api/v1/banking/*` sont réservées au rôle `ADMIN` et toutes les actions de rapprochement sont journalisées (`AuditLog`).

### Stratégie de rapprochement

Le score combine trois signaux, du plus fiable au plus faible :

1. **référence QR structurée** restituée par la banque (identité stricte) → 1.00 ;
2. **référence CRM citée** dans la communication du payeur (devis `DD-AAAA-NNNN`, n° de facture, id de mandat) → 0.87 à 0.95 ;
3. **montant + nom du donneur d'ordre**, avec similarité tolérante aux libellés bancaires tronqués → jusqu'à 1.00 quand les deux concordent exactement.

Une facture n'est soldée automatiquement que si le score dépasse `BANK_AUTO_MATCH_THRESHOLD` (0.9) **et** devance le second candidat d'au moins `BANK_AMBIGUITY_MARGIN` (0.15). Deux garde-fous complètent la règle :

- une référence correcte avec un **montant différent** (acompte) est plafonnée à 0.75 : elle est proposée, jamais validée d'office ;
- les écritures au **débit** ne soldent jamais une facture.

Tout ce qui n'est pas auto-validé alimente la file d'attente de vérification manuelle (`/banque`), avec ses candidats pré-classés et le détail des motifs de score.

Pour maximiser le signal n° 1, le CRM attribue à chaque facture une référence structurée (`Invoice.paymentReference`), **imprimée sur le document envoyé au client sous forme de QR-facture**.

Le format de la référence n'est pas un choix libre : il est dicté par le compte à créditer. Un **QR-IBAN** (identifiant d'institut 30000–31999) impose une référence QR à 27 chiffres ; un **IBAN ordinaire** l'interdit et n'admet qu'une référence créancier **SCOR** (`RF…`, ISO 11649). `ensureInvoicePaymentReference()` lit `COMPANY_IBAN` et produit le format correspondant, ce qui rend le dispositif exploitable immédiatement avec l'IBAN existant, sans attendre l'ouverture d'un QR-IBAN.

La **section paiement normalisée** (récépissé et QR code, `swissqrbill`) est ajoutée en bas de facture. Elle est déterminante : sans elle, le client devrait recopier 27 caractères à la main, et chaque référence perdue est un virement qui retombe en vérification manuelle. Les mesures sont sans appel — les paiements portant la référence sont rapprochés automatiquement, les autres jamais. Si les coordonnées structurées du bénéficiaire sont incomplètes, aucune section n'est produite : la facture part avec les coordonnées en texte plutôt qu'avec un document que la banque refuserait.

## Conséquences

- **Avantages**
  - Exploitable immédiatement par export `camt.053`, sans attendre la contractualisation SIX.
  - Le passage à l'API UBS ne change qu'une valeur de champ sur le compte suivi.
  - Le parseur `camt.053` est mutualisé entre les deux connecteurs : une seule logique à maintenir et à tester.
  - Aucun identifiant E-Banking ne transite par un tiers.
  - Critère d'acceptation vérifié par `packages/api/test-bank-reconciliation.ts` : **90 % de rapprochement automatique** sur les paiements référencés (objectif > 70 %), sans faux positif sur le jeu de test.

- **Inconvénients / limites**
  - En mode `CAMT_FILE`, la fraîcheur des données dépend du dépôt du relevé (J+1 en pratique, le relevé portant sur une journée close).
  - L'activation bLink reste subordonnée à un contrat SIX et à un certificat client : le connecteur est prêt, son activation ne l'est pas.
  - Le rapprochement sans référence repose sur le nom du donneur d'ordre, que les banques tronquent parfois : ces cas restent volontairement en validation humaine.
  - Un rapprochement automatique déclenche l'envoi du reçu au client (comme un encaissement Stripe) ; le comportement est désactivable via `BANK_SEND_RECEIPT_ON_AUTO_MATCH=false`.
