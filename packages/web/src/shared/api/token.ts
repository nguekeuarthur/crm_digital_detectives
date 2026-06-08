/**
 * Stockage en mémoire du accessToken (jamais dans localStorage pour des raisons de sécurité).
 * Le refreshToken reste dans localStorage pour persister la session entre les rechargements.
 */
let _accessToken: string | null = null;

export const getAccessToken = (): string | null => _accessToken;

export const setAccessToken = (token: string | null): void => {
  _accessToken = token;
};
