import { Router } from 'express';
import { BankingController } from './banking.controller';
import { authorize } from '../../shared/middlewares/authorize';

/**
 * Routes de la connexion bancaire (lecture seule).
 * Réservées aux ADMIN : elles exposent des données financières (permission
 * `finance:read` de la matrice RBAC).
 */
const router = Router();

router.use(authorize('ADMIN'));

/**
 * @openapi
 * /banking/accounts:
 *   get:
 *     summary: Lister les comptes bancaires suivis
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comptes suivis, avec date et résultat de la dernière synchronisation
 */
router.get('/accounts', BankingController.listAccounts);

/**
 * @openapi
 * /banking/accounts:
 *   post:
 *     summary: Déclarer un compte bancaire à suivre
 *     description: "Opération purement CRM : aucune donnée n'est écrite chez la banque."
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [iban, label]
 *             properties:
 *               iban: { type: string, example: "CH5604835012345678009" }
 *               label: { type: string, example: "UBS – Compte courant CHF" }
 *               currency: { type: string, example: "CHF" }
 *               provider:
 *                 type: string
 *                 enum: [UBS_BLINK, CAMT_FILE, MOCK]
 *               providerAccountId: { type: string }
 *     responses:
 *       201:
 *         description: Compte enregistré
 *       422:
 *         description: IBAN invalide
 */
router.post('/accounts', BankingController.registerAccount);

/**
 * @openapi
 * /banking/accounts/discover:
 *   post:
 *     summary: Découvrir les comptes accessibles via le connecteur bancaire
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Comptes détectés et enregistrés
 */
router.post('/accounts/discover', BankingController.discoverAccounts);

/**
 * @openapi
 * /banking/sync:
 *   post:
 *     summary: Importer les écritures bancaires puis lancer le rapprochement
 *     description: "Consultation seule des comptes (scope AIS). Exécuté aussi chaque nuit par le cron."
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               days:
 *                 type: integer
 *                 description: Profondeur d'historique à relire (défaut 30)
 *     responses:
 *       200:
 *         description: Résultat de l'import et du rapprochement
 */
router.post('/sync', BankingController.sync);

/**
 * @openapi
 * /banking/import/camt:
 *   post:
 *     summary: Importer un relevé camt.053 exporté depuis l'E-Banking
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier XML camt.053 (ou camt.052)
 *     responses:
 *       201:
 *         description: Écritures importées et rapprochées
 *       422:
 *         description: Fichier manquant ou illisible
 */
router.post('/import/camt', BankingController.uploadCamtMiddleware, BankingController.importCamt);

/**
 * @openapi
 * /banking/transactions:
 *   get:
 *     summary: Lister les écritures bancaires (file d'attente de vérification)
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [UNMATCHED, SUGGESTED, MATCHED, IGNORED]
 *       - in: query
 *         name: accountId
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 25 }
 *     responses:
 *       200:
 *         description: Écritures paginées
 */
router.get('/transactions', BankingController.listTransactions);

/**
 * @openapi
 * /banking/stats:
 *   get:
 *     summary: Indicateurs de rapprochement bancaire
 *     description: "Inclut le taux de rapprochement automatique sur les paiements référencés (objectif > 70 %)."
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Statistiques de rapprochement
 */
router.get('/stats', BankingController.getStats);

/**
 * @openapi
 * /banking/transactions/{id}/candidates:
 *   get:
 *     summary: Factures candidates pour une écriture donnée
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Candidats classés par score décroissant
 */
router.get('/transactions/:id/candidates', BankingController.getCandidates);

/**
 * @openapi
 * /banking/transactions/{id}/match:
 *   post:
 *     summary: Rapprocher manuellement une écriture d'une facture
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [invoiceId]
 *             properties:
 *               invoiceId: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Écriture rapprochée, facture soldée et reçu envoyé au client
 *       422:
 *         description: Écriture déjà rapprochée ou facture déjà payée
 */
router.post('/transactions/:id/match', BankingController.match);

/**
 * @openapi
 * /banking/transactions/{id}/ignore:
 *   post:
 *     summary: Écarter une écriture (frais bancaires, virement interne…)
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason: { type: string }
 *     responses:
 *       200:
 *         description: Écriture écartée
 */
router.post('/transactions/:id/ignore', BankingController.ignore);

/**
 * @openapi
 * /banking/transactions/{id}/unmatch:
 *   post:
 *     summary: Annuler un rapprochement (la facture repasse en attente)
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Rapprochement annulé
 */
router.post('/transactions/:id/unmatch', BankingController.unmatch);

/**
 * @openapi
 * /banking/reconcile:
 *   post:
 *     summary: Relancer le moteur de rapprochement sans réimporter
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Compteurs du passage de rapprochement
 */
router.post('/reconcile', BankingController.reconcile);

/**
 * @openapi
 * /banking/connect/authorize-url:
 *   get:
 *     summary: Obtenir l'URL de consentement UBS (bLink, scope lecture seule)
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: username
 *         schema: { type: string }
 *         description: Identifiant E-Banking du titulaire (défaut BLINK_USERNAME)
 *     responses:
 *       200:
 *         description: URL de consentement à ouvrir dans le navigateur
 *       422:
 *         description: Connecteur bLink non configuré
 */
router.get('/connect/authorize-url', BankingController.getAuthorizationUrl);

/**
 * @openapi
 * /banking/connect/exchange:
 *   post:
 *     summary: Échanger le code de consentement contre les jetons de lecture
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [code]
 *             properties:
 *               code: { type: string }
 *               username: { type: string }
 *     responses:
 *       200:
 *         description: Consentement actif et comptes découverts
 */
router.post('/connect/exchange', BankingController.exchangeAuthorizationCode);

/**
 * @openapi
 * /banking/invoices/{invoiceId}/payment-reference:
 *   post:
 *     summary: Attribuer une référence QR à une facture
 *     description: "Référence suisse à 27 chiffres imprimée sur la facture ; c'est elle qui permet le rapprochement automatique fiable."
 *     tags: [Banking]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invoiceId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Référence de paiement de la facture
 */
router.post('/invoices/:invoiceId/payment-reference', BankingController.ensurePaymentReference);

export { router as bankingRoutes };
