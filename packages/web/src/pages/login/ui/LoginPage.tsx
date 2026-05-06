import { useState, useEffect } from 'react';
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

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [require2FA, setRequire2FA] = useState<string | null>(null); // stores the userId when 2FA is needed
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

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
      
      // Backend returns { require2FA: true, userId } when 2FA is active
      if (data.require2FA) {
        setRequire2FA(data.userId);
        setLoading(false);
        return;
      }

      // Normal login: backend returns { accessToken, refreshToken }
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
      // Backend route is /auth/login-2fa with { userId, code }
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
        background: '#020617',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
        position: 'relative'
      }}
    >
      {/* Interactive Mouse Glow */}
      <Box 
        style={{ 
          position: 'absolute', 
          width: '600px', 
          height: '600px', 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)',
          left: mousePos.x - 300,
          top: mousePos.y - 300,
          pointerEvents: 'none',
          zIndex: 1,
          transition: 'left 0.1s ease, top 0.1s ease',
          filter: 'blur(40px)'
        }} 
      />

      {/* Dynamic Background Wrapper (Static) */}
      <Box 
        style={{ 
          position: 'absolute', 
          inset: 0, 
          zIndex: 0,
          opacity: 0.4,
          filter: 'blur(80px)',
          background: 'radial-gradient(circle at 20% 30%, #312e81 0%, transparent 40%), radial-gradient(circle at 80% 70%, #1e1b4b 0%, transparent 40%)'
        }} 
      />

      {/* Left side: Form Panel */}
      <Box 
        style={() => ({ 
          flex: '0 0 500px', 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '3rem',
          background: 'rgba(15, 23, 42, 0.8)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          zIndex: 10,
          '@media (max-width: 900px)': {
            flex: 1,
            maxWidth: '100%'
          }
        })}
      >
        <Stack gap={40} maw={400} mx="auto" w="100%">
          <Box>
            <Group gap={15} mb={30}>
              <Box 
                style={{ 
                  width: 45, 
                  height: 45, 
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', 
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px rgba(79, 70, 229, 0.4)'
                }}
              >
                <IconShieldCheck size={26} color="white" />
              </Box>
              <Title fw={900} order={1} c="white" style={{ fontSize: '1.8rem', letterSpacing: '-1px' }}>
                Digital<Text component="span" c="brand.5" inherit>Detectives</Text>
              </Title>
            </Group>
            
            <Title order={2} c="white" fw={800} style={{ fontSize: '2.2rem', lineHeight: 1.1 }}>
              Content de vous revoir.
            </Title>
            <Text c="gray.5" size="lg" mt={10}>
              Identifiez-vous pour accéder au terminal.
            </Text>
          </Box>
          
          <Box>
            {error && (
              <Alert color="red" mb="xl" variant="filled" radius="md" icon={<IconShieldCheck size={18} />}>
                {error}
              </Alert>
            )}

            {!require2FA ? (
              <form onSubmit={handleLogin}>
                <Stack gap="xl">
                  <TextInput 
                    label={<Text c="gray.4" size="sm" fw={600} mb={5}>Email professionnel</Text>}
                    placeholder="agent.smith@digital-detectives.fr" 
                    required 
                    size="md"
                    styles={{
                      input: {
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        height: '54px',
                        '&:focus': {
                          borderColor: '#6366f1',
                          background: 'rgba(255, 255, 255, 0.05)',
                        }
                      }
                    }}
                    leftSection={<IconMail size={18} color="#6366f1" />}
                    value={email}
                    onChange={(e) => setEmail(e.currentTarget.value)}
                  />
                  <PasswordInput 
                    label={<Text c="gray.4" size="sm" fw={600} mb={5}>Mot de passe</Text>}
                    placeholder="••••••••••••" 
                    required 
                    size="md"
                    styles={{
                      input: {
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        height: '54px',
                        '&:focus': {
                          borderColor: '#6366f1',
                          background: 'rgba(255, 255, 255, 0.05)',
                        }
                      },
                      visibilityToggle: { color: '#6366f1' }
                    }}
                    leftSection={<IconLock size={18} color="#6366f1" />}
                    value={password}
                    onChange={(e) => setPassword(e.currentTarget.value)}
                  />
                  
                  <Group justify="space-between">
                    <Anchor component={Link} to="/forgot-password" size="xs" c="brand.4" fw={600}>
                      Accès perdu ?
                    </Anchor>
                  </Group>

                  <Button 
                    type="submit" 
                    fullWidth 
                    size="lg"
                    loading={loading}
                    variant="filled"
                    color="brand"
                    style={{ 
                      height: '56px', 
                      fontSize: '1rem',
                      boxShadow: '0 10px 20px rgba(99, 102, 241, 0.2)',
                      transition: 'transform 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    Déverrouiller l{"'"}accès
                  </Button>

                  <Text ta="center" size="sm" c="gray.5">
                    Nouvelle recrue ?{' '}
                    <Anchor component={Link} to="/register" c="brand.4" fw={700}>
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
                    background: 'rgba(99, 102, 241, 0.1)', 
                    borderRadius: '50%',
                    border: '2px solid rgba(99, 102, 241, 0.3)',
                    animation: 'pulse 2s infinite'
                  }}
                >
                  <IconShieldCheck size={50} color="#6366f1" />
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
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '2px solid rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '1.5rem',
                      height: '65px',
                      width: '50px'
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
                  style={{ height: '56px' }}
                >
                  Confirmer l{"'"}identité
                </Button>

                <Anchor component="button" type="button" size="xs" c="gray.6" onClick={() => setRequire2FA(null)}>
                  Annuler et revenir
                </Anchor>
              </Stack>
            )}
          </Box>
        </Stack>
        
        <Box mt="auto" ta="center">
          <Text size="xs" c="gray.7" fw={500}>
            © 2026 DIGITAL DETECTIVES SYSTEM • VERSION 4.0.2
          </Text>
        </Box>
      </Box>

      {/* Right side: Cinematic Panel */}
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
        {/* Cinematic Background Image */}
        <Box 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            backgroundImage: `url('https://images.unsplash.com/photo-1550751827-4bd374c3f58b?q=80&w=2070&auto=format&fit=crop')`, // Cyber security high-end image
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            zIndex: 1
          }} 
        />
        <Box 
          style={{ 
            position: 'absolute', 
            inset: 0, 
            background: 'linear-gradient(to top, #020617 0%, rgba(2, 6, 23, 0.4) 50%, transparent 100%)',
            zIndex: 2
          }} 
        />

        <Box style={{ position: 'relative', zIndex: 3, maxWidth: '700px' }}>
          <Badge color="brand" variant="filled" size="lg" mb={20} radius="sm">AGENCE DE RENSEIGNEMENT</Badge>
          <Title fw={900} size="4.5rem" style={{ lineHeight: 0.9, letterSpacing: '-2px' }}>
            L{"'"}INFORMATION EST <Text component="span" variant="gradient" gradient={{ from: '#818cf8', to: '#6366f1' }} inherit>L{"'"}ARME</Text> ULTIME.
          </Title>
          <Text size="xl" mt={30} c="gray.4" style={{ lineHeight: 1.6, maxWidth: '550px' }}>
            Gérez vos enquêtes avec la technologie de pointe Digital Detectives. Sécurité, discrétion et efficacité totale.
          </Text>
          
          <Group mt={50} gap={40}>
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
          </Group>
        </Box>

        {/* Floating elements */}
        <Box 
          style={{ 
            position: 'absolute', 
            top: '10%', 
            right: '10%', 
            width: '150px', 
            height: '150px', 
            background: 'rgba(99, 102, 241, 0.1)', 
            borderRadius: '50%', 
            border: '1px solid rgba(255,255,255,0.05)',
            backdropFilter: 'blur(10px)',
            zIndex: 3
          }} 
        />
      </Box>

      <style>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          70% { box-shadow: 0 0 0 20px rgba(99, 102, 241, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0); }
        }
      `}</style>
    </Box>
  );
}
