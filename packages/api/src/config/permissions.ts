/**
 * Configuration centralisée des permissions RBAC
 * Matrice des rôles et permissions pour Digitaldetectives CRM
 */

export const ROLES = {
  ADMIN: 'ADMIN',
  ENQUETEUR: 'ENQUETEUR',
  SOUS_TRAITANT: 'SOUS_TRAITANT',
} as const;

export type RoleType = (typeof ROLES)[keyof typeof ROLES];

/**
 * Matrice de permissions granulaire
 * Chaque permission est mappée aux rôles qui y ont accès
 */
export const PERMISSIONS = {
  // Gestion des utilisateurs
  'users:create': [ROLES.ADMIN],
  'users:read': [ROLES.ADMIN],
  'users:update': [ROLES.ADMIN],
  'users:delete': [ROLES.ADMIN],

  // Gestion des clients
  'clients:create': [ROLES.ADMIN, ROLES.ENQUETEUR],
  'clients:read': [ROLES.ADMIN, ROLES.ENQUETEUR],
  'clients:update': [ROLES.ADMIN, ROLES.ENQUETEUR],
  'clients:delete': [ROLES.ADMIN],

  // Gestion des mandats
  'mandats:create': [ROLES.ADMIN, ROLES.ENQUETEUR],
  'mandats:read': [ROLES.ADMIN, ROLES.ENQUETEUR, ROLES.SOUS_TRAITANT],
  'mandats:update': [ROLES.ADMIN, ROLES.ENQUETEUR],
  'mandats:delete': [ROLES.ADMIN],
  'mandats:assign': [ROLES.ADMIN],

  // Gestion des preuves
  'preuves:upload': [ROLES.ADMIN, ROLES.ENQUETEUR, ROLES.SOUS_TRAITANT],
  'preuves:read': [ROLES.ADMIN, ROLES.ENQUETEUR, ROLES.SOUS_TRAITANT],
  'preuves:delete': [ROLES.ADMIN],

  // Devis et contrats
  'devis:create': [ROLES.ADMIN, ROLES.ENQUETEUR],
  'devis:read': [ROLES.ADMIN, ROLES.ENQUETEUR],
  'contrats:create': [ROLES.ADMIN, ROLES.ENQUETEUR],

  // Données financières
  'finance:read': [ROLES.ADMIN],
  'paiements:read': [ROLES.ADMIN],

  // Sous-traitants
  'sous_traitants:create': [ROLES.ADMIN],
  'sous_traitants:read': [ROLES.ADMIN, ROLES.ENQUETEUR],
  'sous_traitants:update': [ROLES.ADMIN],
  'sous_traitants:delete': [ROLES.ADMIN],

  // Export de données
  'export:data': [ROLES.ADMIN],

  // Audit logs
  'audit:read': [ROLES.ADMIN],
} as const;

export type PermissionKey = keyof typeof PERMISSIONS;

/**
 * Vérifie si un rôle possède une permission donnée
 */
export function hasPermission(role: string, permission: PermissionKey): boolean {
  const allowedRoles = PERMISSIONS[permission];
  return allowedRoles.includes(role as RoleType);
}
