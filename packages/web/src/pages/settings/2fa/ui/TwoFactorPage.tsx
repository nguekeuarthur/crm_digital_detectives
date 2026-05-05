import { useState, useEffect } from 'react';
import { 
  Paper, 
  Title, 
  Text, 
  Button, 
  Stack, 
  Image, 
  Alert, 
  PinInput, 
  Group, 
  Badge,
  Divider,
  Center,
  Loader
} from '@mantine/core';
import { IconShieldCheck, IconShieldX, IconDeviceMobileCheck } from '@tabler/icons-react';
import { api } from '../../../../shared/api/base';

export function TwoFactorPage() {
  const [status, setStatus] = useState<'LOADING' | 'ENABLED' | 'DISABLED'>('LOADING');
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vérifier le statut actuel
  const checkStatus = async () => {
    try {
      const { data } = await api.get('/auth/me'); // On suppose qu'on a un endpoint /me
      setStatus(data.isTwoFactorEnabled ? 'ENABLED' : 'DISABLED');
    } catch {
      setStatus('DISABLED');
    }
  };

  useEffect(() => { checkStatus(); }, []);

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/2fa/setup');
      setSetupData(data);
    } catch {
      setError('Impossible d\'initier la configuration 2FA');
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/2fa/verify', { code });
      setStatus('ENABLED');
      setSetupData(null);
    } catch {
      setError('Code de vérification invalide');
    } finally {
      setLoading(false);
    }
  };

  const disable2FA = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir désactiver la 2FA ? Votre compte sera moins sécurisé.')) return;
    setLoading(true);
    try {
      await api.post('/auth/2fa/disable');
      setStatus('DISABLED');
    } catch {
      setError('Erreur lors de la désactivation');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'LOADING') return <Center h={400}><Loader /></Center>;

  return (
    <Paper withBorder p="xl" radius="md" shadow="sm" maw={600} mx="auto" mt="xl">
      <Stack gap="md">
        <Group justify="space-between">
          <Title order={2}>Authentification Forte (2FA)</Title>
          <Badge size="lg" color={status === 'ENABLED' ? 'green' : 'red'} variant="light" leftSection={status === 'ENABLED' ? <IconShieldCheck size={14}/> : <IconShieldX size={14}/>}>
            {status === 'ENABLED' ? 'Activée' : 'Désactivée'}
          </Badge>
        </Group>

        <Text c="dimmed" size="sm">
          L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire à votre compte en demandant un code unique généré par votre téléphone.
        </Text>

        <Divider />

        {error && <Alert color="red" title="Erreur">{error}</Alert>}

        {status === 'DISABLED' && !setupData && (
          <Button leftSection={<IconDeviceMobileCheck size={18} />} onClick={startSetup} loading={loading}>
            Activer la 2FA
          </Button>
        )}

        {setupData && (
          <Stack align="center" py="md">
            <Text fw={700}>Étape 1 : Scannez le QR Code</Text>
            <Text size="sm" ta="center">Ouvrez votre application TOTP (Google Authenticator, Authy, Microsoft Authenticator) et scannez cette image.</Text>
            
            <Paper withBorder p="sm" radius="md">
              <Image src={setupData.qrCode} w={200} h={200} alt="QR Code 2FA" />
            </Paper>

            <Divider w="100%" label="Étape 2 : Vérification" labelPosition="center" my="md" />

            <Text size="sm">Saisissez le code à 6 chiffres affiché sur votre application :</Text>
            <PinInput length={6} value={code} onChange={setCode} disabled={loading} />
            
            <Group mt="md">
              <Button variant="light" color="gray" onClick={() => setSetupData(null)}>Annuler</Button>
              <Button onClick={verifyAndEnable} loading={loading} disabled={code.length < 6}>Activer définitivement</Button>
            </Group>
          </Stack>
        )}

        {status === 'ENABLED' && (
          <Alert color="green" icon={<IconShieldCheck size={18} />} title="Sécurité maximale activée">
            Votre compte est protégé par 2FA. Pour changer d'appareil ou désactiver cette sécurité, utilisez le bouton ci-dessous.
            <Button variant="outline" color="red" mt="md" fullWidth onClick={disable2FA} loading={loading}>
              Désactiver la protection 2FA
            </Button>
          </Alert>
        )}
      </Stack>
    </Paper>
  );
}
