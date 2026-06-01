# ADR-003 : Choix de Prisma comme ORM

## Date
2026-05-28

## Statut
Accepté

## Contexte
Pour interagir avec PostgreSQL depuis Node.js/TypeScript, nous avons besoin d'une couche d'abstraction (Query Builder ou ORM) afin d'accélérer le développement et d'assurer le typage strict des données. Les alternatives envisagées étaient TypeORM, Sequelize et Knex.

## Décision
Nous avons choisi d'utiliser **Prisma ORM**.

## Conséquences
- **Avantages** :
  - **Type-Safety Absolue** : Le client Prisma est généré automatiquement à partir du schéma (`schema.prisma`), garantissant que les requêtes en base de données sont toujours en phase avec les types TypeScript.
  - **Productivité** : La syntaxe du fichier `.prisma` est très lisible et sert de source de vérité pour la modélisation.
  - **Migrations de schéma** : Prisma Migrate génère des scripts SQL déterministes et gère l'historique des versions de la base de données.
- **Inconvénients** :
  - Prisma n'est pas un ORM traditionnel (Active Record ou Data Mapper), ce qui nécessite une petite courbe d'apprentissage.
  - Moins performant sur des requêtes analytiques extrêmement complexes par rapport à du SQL natif, mais suffisant pour 99% de nos besoins CRUD.
