import { useState, useEffect } from 'react';
import { useMediaQuery } from '@mantine/hooks';
import { 
  TextInput, 
  PasswordInput, 
  Button, 
  Title, 
  Text, 
  Group, 
  PinInput, 
  Stack,
  Alert,
  Box,
  Anchor,
  Badge
} from '@mantine/core';
import { IconLock, IconMail, IconShieldCheck } from '@tabler/icons-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../shared/api/base';
import { useAuthStore } from '../../../features/auth/model/auth.store';

const GOLD = '#AB8E3D';
const GOLD_GLOW = 'rgba(171, 142, 61, 0.15)';
const GOLD_BORDER = 'rgba(171, 142, 61, 0.35)';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [require2FA, setRequire2FA] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;

  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);
  const setTokens = useAuthStore((state) => state.setTokens);

  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token, navigate]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      if (data.require2FA) {
        setRequire2FA(data.userId);
        setLoading(false);
        return;
      }

      setTokens(data.accessToken, data.refreshToken);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error.response?.data?.message || 'Identifiants invalides';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login-2fa', { 
        userId: require2FA, 
        code 
      });
      setTokens(data.accessToken, data.refreshToken);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error.response?.data?.message || 'Code de vérification invalide';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box 
      style={{ 
        minHeight: '100vh', 
        display: 'flex',
        flexDirection: 'row',
        background: '#0a0900',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        position: 'relative'
      }}
    >
      {/* Lueur dorée qui suit la souris */}
      <Box 
        style={{ 
          position: 'absolute', 
          width: '600px', 
          height: '600px', 
          background: `radial-gradient(circle, ${GOLD_GLOW} 0%, transparent 70%)`,
          left: mousePos.x - 300,
          top: mousePos.y - 300,
          pointerEvents: 'none',
          zIndex: 1,
          transition: 'left 0.1s ease, top 0.1s ease',
          filter: 'blur(40px)'
        }} 
      />

      {/* Fond ambiant */}
      <Box 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          zIndex: 0,
          opacity: 0.3,
          filter: 'blur(80px)',
          background: 'radial-gradient(circle at 20% 30%, #2a1f00 0%, transparent 40%), radial-gradient(circle at 80% 70%, #1a1300 0%, transparent 40%)'
        }} 
      />

      {/* Panneau gauche : Formulaire */}
      <Box 
        style={{ 
          flex: isMobile ? '1 1 100%' : '0 0 500px', 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          padding: isMobile ? '2rem 1.5rem' : '3rem',
          background: 'rgba(10, 9, 0, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRight: isMobile ? 'none' : `1px solid ${GOLD_BORDER}`,
          zIndex: 10,
        }}
      >
        <Stack gap={40} maw={400} mx="auto" w="100%">
          <Box>
            {/* Logo officiel */}
            <Group gap={15} mb={30} align="center">
              <Box h={50}>
                <img src="/logo-dore.png" alt="Digital Detectives" height={50} />
              </Box>
            </Group>
            
            <Title order={2} c="white" fw={800} style={{ fontSize: isMobile ? '1.7rem' : '2.2rem', lineHeight: 1.1 }}>
              Content de vous revoir.
            </Title>
            <Text c="gray.5" size="lg" mt={10}>
              Identifiez-vous pour accéder au terminal.
            </Text>
          </Box>
          
          <Box>
            {error && (
              <Alert 
                mb="xl" 
                variant="light" 
                radius="md" 
                icon={<IconShieldCheck size={18} />}
                style={{ 
                  background: 'rgba(171, 142, 61, 0.08)', 
                  border: `1px solid ${GOLD_BORDER}`,
                  color: GOLD 
                }}
              >
                <Text c={GOLD} size="sm">{error}</Text>
              </Alert>
            )}

            {!require2FA ? (
              <form onSubmit={handleLogin}>
                <Stack gap="xl">
                  <TextInput 
                    label={<Text size="sm" fw={600} mb={5} style={{ color: '#c4b07a' }}>Email professionnel</Text>}
                    placeholder="agent.smith@digital-detectives.fr" 
                    required 
                    size="md"
                    styles={{
                      input: {
                        background: 'rgba(171, 142, 61, 0.04)',
                        border: `1px solid ${GOLD_BORDER}`,
                        color: 'white',
                        height: '54px',
                        '&:focus': {
                          borderColor: GOLD,
                          background: 'rgba(171, 142, 61, 0.08)',
                        }
                      }
                    }}
                    leftSection={<IconMail size={18} color={GOLD} />}
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                  />
                  <PasswordInput 
                    label={<Text size="sm" fw={600} mb={5} style={{ color: '#c4b07a' }}>Mot de passe</Text>}
                    placeholder="••••••••••••" 
                    required 
                    size="md"
                    styles={{
                      input: {
                        background: 'rgba(171, 142, 61, 0.04)',
                        border: `1px solid ${GOLD_BORDER}`,
                        color: 'white',
                        height: '54px',
                        '&:focus': {
                          borderColor: GOLD,
                          background: 'rgba(171, 142, 61, 0.08)',
                        }
                      },
                      visibilityToggle: { color: GOLD }
                    }}
                    leftSection={<IconLock size={18} color={GOLD} />}
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                  />
                  
                  <Group justify="space-between">
                    <Anchor component={Link} to="/forgot-password" size="xs" fw={600} style={{ color: GOLD }}>
                      Accès perdu ?
                    </Anchor>
                  </Group>

                  <Button 
                    type="submit" 
                    fullWidth 
                    size="lg"
                    loading={loading}
                    style={{ 
                      height: '56px', 
                      fontSize: '1rem',
                      background: `linear-gradient(135deg, ${GOLD} 0%, #8a7030 100%)`,
                      border: 'none',
                      color: '#0a0900',
                      fontWeight: 800,
                      letterSpacing: '0.5px',
                      boxShadow: `0 10px 20px rgba(171, 142, 61, 0.25)`,
                      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                    }}
                    onMouseEnter={(e) => { 
                      e.currentTarget.style.transform = 'translateY(-2px)'; 
                      e.currentTarget.style.boxShadow = `0 15px 30px rgba(171, 142, 61, 0.35)`;
                    }}
                    onMouseLeave={(e) => { 
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 10px 20px rgba(171, 142, 61, 0.25)`;
                    }}
                  >
                    Déverrouiller l{"'"}accès
                  </Button>

                  <Text ta="center" size="sm" c="gray.5">
                    Nouvelle recrue ?{' '}
                    <Anchor component={Link} to="/register" fw={700} style={{ color: GOLD }}>
                      Créer un compte agent
                    </Anchor>
                  </Text>
                </Stack>
              </form>
            ) : (
              <Stack align="center" gap="xl" py={20}>
                <Box 
                  style={{ 
                    padding: 25, 
                    background: GOLD_GLOW,
                    borderRadius: '50%',
                    border: `2px solid ${GOLD_BORDER}`,
                    animation: 'pulse 2s infinite'
                  }}
                >
                  <IconShieldCheck size={50} color={GOLD} />
                </Box>
                <Box ta="center">
                  <Title order={3} c="white">Vérification 2FA</Title>
                  <Text size="sm" c="gray.5" mt={5}>
                    Entrez le code de sécurité généré sur votre appareil autorisé.
                  </Text>
                </Box>
                
                <PinInput 
                  length={6} 
                  oneTimeCode 
                  type="number" 
                  autoFocus 
                  size="xl"
                  gap="md"
                  styles={{
                    input: {
                      background: 'rgba(171, 142, 61, 0.05)',
                      border: `2px solid ${GOLD_BORDER}`,
                      color: 'white',
                      fontSize: isMobile ? '1.2rem' : '1.5rem',
                      height: isMobile ? '52px' : '65px',
                      width: isMobile ? '38px' : '50px',
                      '&:focus': { borderColor: GOLD }
                    }
                  }}
                  value={code}
                  onChange={setCode}
                  disabled={loading}
                />

                <Button 
                  fullWidth 
                  size="lg"
                  onClick={handleVerify2FA} 
                  loading={loading}
                  disabled={code.length < 6}
                  style={{ 
                    height: '56px',
                    background: `linear-gradient(135deg, ${GOLD} 0%, #8a7030 100%)`,
                    border: 'none',
                    color: '#0a0900',
                    fontWeight: 800
                  }}
                >
                  Confirmer l{"'"}identité
                </Button>

                <Anchor 
                  component="button" 
                  type="button" 
                  size="xs" 
                  style={{ color: '#666' }}
                  onClick={() => setRequire2FA(null)}
                >
                  Annuler et revenir
                </Anchor>
              </Stack>
            )}
          </Box>
        </Stack>
        
        <Box mt="auto" ta="center" pt={40}>
          <Text size="xs" c="gray.7" fw={500}>
            © 2026 DIGITAL DETECTIVES • SYSTÈME SÉCURISÉ
          </Text>
        </Box>
      </Box>

      {/* Panneau droit : Visuel cinématographique */}
      <Box 
        style={{ 
          flex: 1, 
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '5rem',
          color: 'white',
          overflow: 'hidden'
        }}
        visibleFrom="md"
      >
        {/* Image de fond */}
        <Box 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            backgroundImage: `url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 1
          }} 
        />
        <Box 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'linear-gradient(to top, #0a0900 0%, rgba(10, 9, 0, 0.5) 50%, transparent 100%)',
            zIndex: 2
          }} 
        />

        <Box style={{ position: 'relative', zIndex: 3, maxWidth: '700px' }}>
          <Badge 
            size="lg" 
            mb={20} 
            radius="sm"
            style={{ 
              background: GOLD_GLOW, 
              border: `1px solid ${GOLD_BORDER}`, 
              color: GOLD,
              fontWeight: 700
            }}
          >
            AGENCE DE RENSEIGNEMENT
          </Badge>
          <Title fw={900} size="4.5rem" style={{ lineHeight: 0.9, letterSpacing: '-2px' }}>
            L{"'"}INFORMATION EST{' '}
            <Text 
              component="span" 
              inherit 
              style={{ color: GOLD }}
            >
              L{"'"}ARME
            </Text>{' '}
            ULTIME.
          </Title>
          <Text size="xl" mt={30} c="gray.4" style={{ lineHeight: 1.6, maxWidth: '550px' }}>
            Gérez vos enquêtes avec la technologie de pointe Digital Detectives. Sécurité, discrétion et efficacité totale.
          </Text>
          
          {/* <Group mt={50} gap={40}>
            <Box>
              <Text fw={900} size="2.5rem" c="white" style={{ lineHeight: 1 }}>0.0ms</Text>
              <Text size="xs" c="gray.5" fw={700} tt="uppercase" mt={5}>Latence Système</Text>
            </Box>
            <Box>
              <Text fw={900} size="2.5rem" c="white" style={{ lineHeight: 1 }}>AES-256</Text>
              <Text size="xs" c="gray.5" fw={700} tt="uppercase" mt={5}>Chiffrement Militaire</Text>
            </Box>
            <Box>
              <Text fw={900} size="2.5rem" c="white" style={{ lineHeight: 1 }}>Global</Text>
              <Text size="xs" c="gray.5" fw={700} tt="uppercase" mt={5}>Réseau d{"'"}Enquête</Text>
            </Box>
          </Group> */}
        </Box>

        {/* Élément flottant décoratif */}
        <Box 
          style={{ 
            position: 'absolute', 
            top: '10%', 
            right: '10%', 
            width: '150px', 
            height: '150px', 
            background: GOLD_GLOW,
            borderRadius: '50%', 
            border: `1px solid ${GOLD_BORDER}`,
            backdropFilter: 'blur(10px)',
            zIndex: 3
          }} 
        />
      </Box>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(171, 142, 61, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(171, 142, 61, 0); }
          100% { box-shadow: 0 0 0 0 rgba(171, 142, 61, 0); }
        }
      `}</style>
    </Box>
  );
}
