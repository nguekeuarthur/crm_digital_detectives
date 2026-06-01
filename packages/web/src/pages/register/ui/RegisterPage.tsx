import { useState, useEffect } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Container,
  Stack,
  Alert,
  Group,
  Anchor,
  Box,
  Center,
  Image,
  PinInput,
  Divider,
  Badge,
} from '@mantine/core';
import { IconLock, IconMail, IconShieldCheck, IconDeviceMobileCheck } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../shared/api/base';
import { useAuthStore } from '../../../features/auth/model/auth.store';

const GOLD = '#AB8E3D';

type Step = 'form' | 'qr' | 'done';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('form');
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;

  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (token) navigate('/');
  }, [token, navigate]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/register', { email, password, firstName, lastName });
      setQrCode(data.qrCode);
      setUserId(data.id);
      setStep('qr');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } };
      setError(axiosErr.response?.data?.message || 'Une erreur est survenue lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!userId || totpCode.length < 6) return;
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register/verify-2fa', { userId, code: totpCode });
      setStep('done');
    } catch {
      setError('Code invalide. Vérifiez votre application d\'authentification.');
    } finally {
      setLoading(false);
    }
  };

  const background = (
    <>
      <Box style={{ position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(171, 142, 61, 0.15) 0%, transparent 70%)', left: mousePos.x - 300, top: mousePos.y - 300, pointerEvents: 'none', zIndex: 1, transition: 'left 0.1s ease, top 0.1s ease', filter: 'blur(40px)' }} />
      <Box style={{ position: 'absolute', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(171, 142, 61, 0.15) 0%, transparent 70%)', top: '-10%', right: '-5%', zIndex: 0 }} />
      <Box style={{ position: 'absolute', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(138, 112, 48, 0.1) 0%, transparent 70%)', bottom: '5%', left: '2%', zIndex: 0 }} />
    </>
  );

  const inputStyles = {
    input: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', height: '50px' },
  };

  return (
    <Box style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617', position: 'relative', overflow: 'hidden', fontFamily: 'Inter, sans-serif' }}>
      {background}
      <Container size={step === 'qr' ? 680 : 500} style={{ zIndex: 10 }}>
        <Paper radius="xl" p={isMobile ? 24 : 50} style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>

          <Box mb={40} ta="center">
            <Center mb={20}>
              <img src="/logo-dore.png" alt="Digital Detectives" height={60} />
            </Center>
            <Title fw={900} order={2} c="white" style={{ fontSize: '2rem', letterSpacing: '-1px' }}>
              {step === 'form' ? 'Nouvel Agent' : step === 'qr' ? 'Activation 2FA' : 'Enrôlement terminé'}
            </Title>
            <Text c="gray.5" size="md" mt={8}>
              {step === 'form' ? 'Rejoignez le réseau Digital Detectives' : step === 'qr' ? 'Scannez le QR code pour sécuriser votre accès' : 'Votre compte est prêt'}
            </Text>
          </Box>

          {error && <Alert color="red" variant="filled" radius="md" mb="lg">{error}</Alert>}

          {step === 'form' && (
            <form onSubmit={handleRegister}>
              <Stack gap="xl">
                <Group grow gap="sm">
                  <TextInput label={<Text c="gray.4" size="xs" fw={700} mb={5} tt="uppercase">Prénom</Text>} placeholder="Jean" required styles={inputStyles} value={firstName} onChange={(e) => setFirstName(e.currentTarget.value)} />
                  <TextInput label={<Text c="gray.4" size="xs" fw={700} mb={5} tt="uppercase">Nom</Text>} placeholder="Dupont" required styles={inputStyles} value={lastName} onChange={(e) => setLastName(e.currentTarget.value)} />
                </Group>
                <TextInput label={<Text c="gray.4" size="xs" fw={700} mb={5} tt="uppercase">Email Agent</Text>} placeholder="agent.smith@digital-detectives.fr" required leftSection={<IconMail size={16} color={GOLD} />} styles={inputStyles} value={email} onChange={(e) => setEmail(e.currentTarget.value)} />
                <PasswordInput label={<Text c="gray.4" size="xs" fw={700} mb={5} tt="uppercase">Mot de passe</Text>} placeholder="••••••••••••" required leftSection={<IconLock size={16} color={GOLD} />} styles={{ input: inputStyles.input, visibilityToggle: { color: GOLD } }} value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
                <Button type="submit" fullWidth size="lg" mt={10} loading={loading} style={{ height: '56px', background: `linear-gradient(135deg, ${GOLD} 0%, #8a7030 100%)`, color: '#000', boxShadow: `0 10px 20px rgba(171, 142, 61, 0.3)` }}>
                  Finaliser l&apos;enrôlement
                </Button>
                <Text ta="center" size="sm" c="gray.5">
                  Déjà enregistré ?{' '}
                  <Anchor component={Link} to="/login" c="brand.4" fw={700}>Se connecter</Anchor>
                </Text>
              </Stack>
            </form>
          )}

          {step === 'qr' && qrCode && (
            <Stack gap="xl">
              <Divider label="Synchronisation de l'application" labelPosition="center" c="gray.6" />
              <Group align="flex-start" gap={40} wrap={isMobile ? 'wrap' : 'nowrap'} justify="center">
                <Stack align="center" gap="sm">
                  <Box p="md" style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
                    <Image src={qrCode} w={200} h={200} alt="QR Code 2FA" />
                  </Box>
                  <Text size="xs" c="dimmed" ta="center" tt="uppercase" fw={600}>Code d&apos;appairage</Text>
                </Stack>

                <Stack gap="xl" justify="center" style={{ flex: 1 }}>
                  <Box>
                    <Badge color="brand" mb={8}>Étape 1</Badge>
                    <Text c="white" fw={700} size="md" mb={4}>Scanner le QR code</Text>
                    <Text c="gray.4" size="sm">Ouvrez Google Authenticator ou Authy et scannez le code ci-contre.</Text>
                  </Box>
                  <Box>
                    <Badge color="brand" mb={8}>Étape 2</Badge>
                    <Text c="white" fw={700} size="md" mb={8}>Entrer le code à 6 chiffres</Text>
                    <PinInput
                      length={6}
                      size="lg"
                      value={totpCode}
                      onChange={setTotpCode}
                      disabled={loading}
                      autoFocus
                      styles={{ input: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: 'white', fontWeight: 800 } }}
                    />
                  </Box>
                  <Button
                    size="lg"
                    onClick={handleVerify2FA}
                    loading={loading}
                    disabled={totpCode.length < 6}
                    leftSection={<IconDeviceMobileCheck size={20} />}
                    style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #8a7030 100%)`, color: '#000' }}
                  >
                    Activer la protection 2FA
                  </Button>
                </Stack>
              </Group>
            </Stack>
          )}

          {step === 'done' && (
            <Stack gap="xl">
              <Alert color="green" variant="filled" radius="md" title="Dossier créé avec succès" icon={<IconShieldCheck size={20} />}>
                Votre compte est sécurisé par la 2FA. Vous pouvez maintenant accéder au terminal.
              </Alert>
              <Button component={Link} to="/login" size="lg" fullWidth radius="md" style={{ background: `linear-gradient(135deg, ${GOLD} 0%, #8a7030 100%)`, color: '#000' }}>
                Accéder au terminal
              </Button>
            </Stack>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
