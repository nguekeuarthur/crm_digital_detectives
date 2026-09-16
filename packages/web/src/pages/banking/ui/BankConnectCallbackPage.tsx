import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Card, Center, Stack, Title, Text, Loader, Button, Alert, ThemeIcon, List } from '@mantine/core';
import { IconAlertCircle, IconCheck, IconBuildingBank } from '@tabler/icons-react';
import { BankingApi, BankAccount } from '../../../shared/api/banking';

/**
 * Page de retour du consentement bancaire (bLink / UBS).
 *
 * UBS redirige ici avec `code` et `state` après validation par le titulaire du
 * compte. La page vérifie l'anti-rejeu (`state`), échange le code contre les
 * jetons de lecture côté API, puis affiche les comptes découverts.
 *
 * L'URL de cette page doit correspondre exactement à `BLINK_REDIRECT_URI` et
 * être enregistrée dans l'annuaire bLink.
 */

export const BLINK_STATE_STORAGE_KEY = 'blink_oauth_state';

export function BankConnectCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = useState<string>('Validation du consentement en cours…');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  // React 18+ monte deux fois les effets en mode strict : le code OAuth n'est
  // utilisable qu'une seule fois, on garde donc une garde d'exécution.
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const oauthError = searchParams.get('error');

    if (oauthError) {
      setStatus('error');
      setMessage(
        searchParams.get('error_description') ||
          `La banque a refusé la demande de consentement (${oauthError}).`,
      );
      return;
    }

    if (!code) {
      setStatus('error');
      setMessage("Aucun code de consentement n'a été transmis par la banque.");
      return;
    }

    const expectedState = sessionStorage.getItem(BLINK_STATE_STORAGE_KEY);
    if (expectedState && state !== expectedState) {
      setStatus('error');
      setMessage(
        "Le jeton anti-rejeu (state) ne correspond pas à la demande émise. Par sécurité, le consentement n'a pas été activé : relancez la connexion depuis le CRM.",
      );
      return;
    }
    sessionStorage.removeItem(BLINK_STATE_STORAGE_KEY);

    BankingApi.exchangeAuthorizationCode(code)
      .then((result) => {
        setAccounts(result.accounts);
        setStatus('success');
        setMessage(
          result.accounts.length
            ? `Consentement actif. ${result.accounts.length} compte(s) accessible(s) en lecture.`
            : 'Consentement actif, mais aucun compte accessible n\'a été retourné par la banque.',
        );
      })
      .catch((error) => {
        setStatus('error');
        setMessage(
          (error as { response?: { data?: { error?: { message?: string } } } }).response?.data?.error?.message ??
            "L'échange du code de consentement a échoué. Vérifiez la configuration bLink (certificat client, client_id, provider_id).",
        );
      });
  }, [searchParams]);

  return (
    <Center style={{ minHeight: '70vh' }}>
      <Card padding="xl" radius="lg" w={520} style={{ border: '1.5px solid #cbd2d9', boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)' }}>
        <Stack align="center" gap="md">
          <ThemeIcon
            size={64}
            radius="xl"
            variant="light"
            color={status === 'success' ? 'teal' : status === 'error' ? 'red' : 'gray'}
          >
            {status === 'success' ? <IconCheck size={30} /> : status === 'error' ? <IconAlertCircle size={30} /> : <IconBuildingBank size={30} />}
          </ThemeIcon>

          <Title order={3} ta="center">
            {status === 'success' ? 'Compte bancaire relié' : status === 'error' ? 'Connexion impossible' : 'Connexion à UBS'}
          </Title>

          {status === 'pending' && <Loader color="yellow" size="sm" />}

          <Text size="sm" c="dimmed" ta="center">{message}</Text>

          {status === 'success' && accounts.length > 0 && (
            <List size="sm" spacing={4} w="100%">
              {accounts.map((account) => (
                <List.Item key={account.id}>
                  <Text size="sm">
                    {account.label} — <span style={{ fontFamily: 'monospace' }}>{account.iban}</span>
                  </Text>
                </List.Item>
              ))}
            </List>
          )}

          {status === 'success' && (
            <Alert color="gray" variant="light" icon={<IconAlertCircle size={16} />} w="100%">
              L&apos;accès accordé est limité à la <strong>consultation</strong> des écritures. Le CRM ne peut
              émettre aucun ordre de paiement.
            </Alert>
          )}

          <Box>
            <Button onClick={() => navigate('/banque')} variant={status === 'error' ? 'light' : 'filled'} color={status === 'error' ? 'gray' : 'teal'}>
              Retour au rapprochement bancaire
            </Button>
          </Box>
        </Stack>
      </Card>
    </Center>
  );
}
