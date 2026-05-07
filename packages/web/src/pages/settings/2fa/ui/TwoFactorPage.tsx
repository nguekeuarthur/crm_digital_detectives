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
  Loader,
  Container,
  Box,
  Breadcrumbs,
  Anchor,
  SimpleGrid
} from '@mantine/core';
import { IconShieldCheck, IconShieldX, IconDeviceMobileCheck, IconChevronRight } from '@tabler/icons-react';
import { api } from '../../../../shared/api/base';
import { Link } from 'react-router-dom';

export function TwoFactorPage() {
  const [status, setStatus] = useState<'LOADING' | 'ENABLED' | 'DISABLED'>('LOADING');
  const [setupData, setSetupData] = useState<{ secret: string; qrCode: string } | null>(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = async () => {
    try {
      const { data } = await api.get('/auth/me');
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
    if (!window.confirm('Êtes-vous sûr de vouloir désactiver la 2FA ?')) return;
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

  if (status === 'LOADING') return <Center h={400}><Loader color="brand" /></Center>;

  return (
    <Box p="xl">
      <Container size="md">
        <Breadcrumbs mb={30} separator={<IconChevronRight size={14} />}>
          <Anchor component={Link} to="/" size="sm" c="dimmed" fw={500}>Dashboard</Anchor>
          <Anchor size="sm" c="dimmed" fw={500}>Paramètres</Anchor>
          <Text size="sm" fw={700} c="brand">Sécurité Avancée</Text>
        </Breadcrumbs>

        <Stack gap="xl">
          <Box>
            <Title order={1} fw={900} style={{ fontSize: '2.5rem', letterSpacing: '-1.5px' }}>
              Authentification <Text component="span" variant="gradient" gradient={{ from: 'brand.6', to: 'indigo.4' }} inherit>Double Facteur</Text>
            </Title>
            <Text c="dimmed" size="lg" fw={500}>Renforcez l{"'"}accès à votre terminal d{"'"}enquête avec le protocole TOTP.</Text>
          </Box>

          <Paper withBorder radius="xl" p={0} shadow="md" style={{ overflow: 'hidden', background: 'white' }}>
            <Box p="xl" bg="brand.7" c="white">
              <Group justify="space-between">
                <Stack gap={4}>
                  <Text fw={800} size="xl">Statut de la Protection</Text>
                  <Text size="sm" style={{ opacity: 0.9 }}>Source de vérité : Terminal Digital Detectives</Text>
                </Stack>
                <Badge 
                  size="xl" 
                  variant="white" 
                  color={status === 'ENABLED' ? 'green' : 'red'}
                  leftSection={status === 'ENABLED' ? <IconShieldCheck size={18}/> : <IconShieldX size={18}/>}
                  style={{ height: '44px', padding: '0 25px', borderRadius: '22px', fontSize: '0.9rem' }}
                >
                  {status === 'ENABLED' ? 'SYSTÈME PROTÉGÉ' : 'VULNÉRABLE'}
                </Badge>
              </Group>
            </Box>

            <Box p={40}>
              <Stack gap={30}>
                {error && <Alert color="red" variant="light" radius="md" title="Erreur de protocole">{error}</Alert>}

                {status === 'DISABLED' && !setupData && (
                  <Box py={40} style={{ textAlign: 'center', background: 'var(--mantine-color-gray-0)', borderRadius: '20px', border: '2px dashed var(--mantine-color-gray-2)' }}>
                    <IconDeviceMobileCheck size={80} color="var(--mantine-color-brand-4)" style={{ marginBottom: '1.5rem' }} />
                    <Title order={2} mb="md" fw={800}>Activer la vérification TOTP</Title>
                    <Text size="md" c="dimmed" mb={30} maw={500} mx="auto">
                      Associez une application d{"'"}authentification (Google Authenticator, Authy) pour générer des codes d{"'"}accès uniques.
                    </Text>
                    <Button 
                      size="xl" 
                      onClick={startSetup} 
                      loading={loading} 
                      color="brand" 
                      radius="md"
                      style={{ boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)' }}
                    >
                      Démarrer l{"'"}initialisation
                    </Button>
                  </Box>
                )}

                {setupData && (
                  <Stack gap={40}>
                    <Divider label="Synchronisation du Nouvel Appareil" labelPosition="center" />
                    
                    <SimpleGrid cols={{ base: 1, md: 2 }} spacing={50}>
                      <Stack align="center" gap="lg">
                        <Box p="xl" style={{ background: 'white', borderRadius: '24px', border: '1px solid var(--mantine-color-gray-2)', boxShadow: 'var(--mantine-shadow-md)' }}>
                          <Image src={setupData.qrCode} w={240} h={240} alt="QR Code 2FA" />
                        </Box>
                        <Text size="xs" c="dimmed" ta="center" fw={600} tt="uppercase" ls={1}>Code d{"'"}appairage chiffré</Text>
                      </Stack>

                      <Stack gap="xl" justify="center">
                        <Box>
                          <Badge color="brand" mb={10}>Étape 1</Badge>
                          <Text fw={800} size="lg" mb={5}>Scan du Secret</Text>
                          <Text size="sm" c="gray.6">Ouvrez votre application d{"'"}authentification et scannez le QR code ci-contre pour importer votre clé privée.</Text>
                        </Box>
                        
                        <Box>
                          <Badge color="brand" mb={10}>Étape 2</Badge>
                          <Text fw={800} size="lg" mb={5}>Validation</Text>
                          <Text size="sm" c="gray.6" mb="md">Entrez le jeton de sécurité à 6 chiffres pour valider la synchronisation :</Text>
                          <PinInput 
                            length={6} 
                            size="lg" 
                            gap="md" 
                            value={code} 
                            onChange={setCode} 
                            disabled={loading} 
                            autoFocus
                            styles={{
                              input: {
                                height: '60px',
                                width: '50px',
                                fontSize: '1.2rem',
                                fontWeight: 800
                              }
                            }}
                          />
                        </Box>

                        <Group mt="lg">
                          <Button variant="subtle" color="gray" size="lg" onClick={() => setSetupData(null)}>
                            Annuler
                          </Button>
                          <Button 
                            color="brand" 
                            size="lg"
                            onClick={verifyAndEnable} 
                            loading={loading} 
                            disabled={code.length < 6}
                            style={{ boxShadow: '0 8px 16px rgba(99, 102, 241, 0.2)' }}
                          >
                            Activer la protection
                          </Button>
                        </Group>
                      </Stack>
                    </SimpleGrid>
                  </Stack>
                )}

                {status === 'ENABLED' && (
                  <Stack gap="xl">
                    <Alert color="green" icon={<IconShieldCheck size={28} />} title="SYSTÈME SOUS HAUTE PROTECTION" variant="light" p="xl" radius="lg">
                      <Text size="md" fw={500}>
                        Votre terminal d{"'"}enquête est actuellement sécurisé par le protocole 2FA. 
                        Toute tentative de connexion non autorisée sera bloquée.
                      </Text>
                    </Alert>
                    
                    <Divider />
                    
                    <Box>
                      <Title order={4} mb="sm" fw={800}>Gestion de la Clé de Sécurité</Title>
                      <Text size="sm" c="dimmed" mb="xl" maw={600}>
                        Si vous perdez l{"'"}accès à votre appareil d{"'"}authentification, vous devrez contacter un administrateur système. 
                        La désactivation ci-dessous nécessite une confirmation immédiate.
                      </Text>
                      <Button 
                        variant="outline" 
                        color="red" 
                        size="md"
                        onClick={disable2FA} 
                        loading={loading}
                        leftSection={<IconShieldX size={18} />}
                        radius="md"
                      >
                        Désactiver le protocole 2FA
                      </Button>
                    </Box>
                  </Stack>
                )}
              </Stack>
            </Box>
          </Paper>
        </Stack>
      </Container>
    </Box>
  );
}
