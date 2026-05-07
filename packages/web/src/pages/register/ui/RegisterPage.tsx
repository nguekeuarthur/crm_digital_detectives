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
  Center
} from '@mantine/core';
import { IconLock, IconMail, IconShieldCheck } from '@tabler/icons-react';

const GOLD = '#AB8E3D';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../shared/api/base';
import { useAuthStore } from '../../../features/auth/model/auth.store';

export function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const isMobile = useMediaQuery('(max-width: 768px)') ?? false;

  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);

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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post('/auth/register', { 
        email, 
        password, 
        firstName, 
        lastName 
      });
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      const message = error.response?.data?.message || 'Une erreur est survenue lors de l\'inscription';
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
        alignItems: 'center',
        justifyContent: 'center',
        background: '#020617',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* Interactive Mouse Glow */}
      <Box 
        style={{ 
          position: 'absolute', 
          width: '600px', 
          height: '600px', 
          background: 'radial-gradient(circle, rgba(171, 142, 61, 0.15) 0%, transparent 70%)',
          left: mousePos.x - 300,
          top: mousePos.y - 300,
          pointerEvents: 'none',
          zIndex: 1,
          transition: 'left 0.1s ease, top 0.1s ease',
          filter: 'blur(40px)'
        }} 
      />
      {/* Background decoration */}
      <Box 
        style={{ 
          position: 'absolute', 
          width: '600px', 
          height: '600px', 
          background: 'radial-gradient(circle, rgba(171, 142, 61, 0.15) 0%, transparent 70%)',
          top: '-10%',
          right: '-5%',
          zIndex: 0
        }} 
      />
      <Box 
        style={{ 
          position: 'absolute', 
          width: '400px', 
          height: '400px', 
          background: 'radial-gradient(circle, rgba(138, 112, 48, 0.1) 0%, transparent 70%)',
          bottom: '5%',
          left: '2%',
          zIndex: 0
        }} 
      />

      <Container size={500} style={{ zIndex: 10 }}>
        <Paper 
          radius="xl" 
          p={isMobile ? 24 : 50} 
          style={{ 
            background: 'rgba(15, 23, 42, 0.8)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <Box mb={40} ta="center">
            <Center mb={20}>
              <img src="/logo-dore.png" alt="Digital Detectives" height={60} />
            </Center>
            <Title fw={900} order={2} c="white" style={{ fontSize: '2rem', letterSpacing: '-1px' }}>
              Nouvel Agent
            </Title>
            <Text c="gray.5" size="md" mt={8}>
              Rejoignez le réseau Digital Detectives
            </Text>
          </Box>

          {success ? (
            <Stack gap="xl">
              <Alert color="green" variant="filled" radius="md" title="Dossier créé avec succès" icon={<IconShieldCheck size={20} />}>
                Votre compte agent a été validé. Vous pouvez maintenant accéder au terminal.
              </Alert>
              <Button component={Link} to="/login" size="lg" fullWidth radius="md">
                Accéder au terminal
              </Button>
            </Stack>
          ) : (
            <form onSubmit={handleRegister}>
              <Stack gap="xl">
                {error && <Alert color="red" variant="filled" radius="md">{error}</Alert>}
                
                <Group grow={!isMobile} gap="md" style={{ flexDirection: isMobile ? 'column' : 'row' }}>
                  <TextInput 
                    label={<Text c="gray.4" size="xs" fw={700} mb={5} tt="uppercase">Prénom</Text>}
                    placeholder="Jean" 
                    required 
                    styles={{
                      input: {
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        height: '50px'
                      }
                    }}
                    value={firstName}
                    onChange={(e) => setFirstName(e.currentTarget.value)}
                  />
                  <TextInput 
                    label={<Text c="gray.4" size="xs" fw={700} mb={5} tt="uppercase">Nom</Text>}
                    placeholder="Dupont" 
                    required 
                    styles={{
                      input: {
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        height: '50px'
                      }
                    }}
                    value={lastName}
                    onChange={(e) => setLastName(e.currentTarget.value)}
                  />
                </Group>

                <TextInput 
                  label={<Text c="gray.4" size="xs" fw={700} mb={5} tt="uppercase">Email Agent</Text>}
                  placeholder="agent.smith@digital-detectives.fr" 
                  required 
                  leftSection={<IconMail size={16} color={GOLD} />}
                  styles={{
                    input: {
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      height: '50px'
                    }
                  }}
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                />
                
                <PasswordInput 
                  label={<Text c="gray.4" size="xs" fw={700} mb={5} tt="uppercase">Mot de passe</Text>}
                  placeholder="••••••••••••" 
                  required 
                  leftSection={<IconLock size={16} color={GOLD} />}
                  styles={{
                    input: {
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      height: '50px'
                    },
                    visibilityToggle: { color: GOLD }
                  }}
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                />

                <Button 
                  type="submit" 
                  fullWidth 
                  size="lg"
                  mt={10}
                  loading={loading}
                  style={{ height: '56px', background: `linear-gradient(135deg, ${GOLD} 0%, #8a7030 100%)`, color: '#000', boxShadow: `0 10px 20px rgba(171, 142, 61, 0.3)` }}
                >
                  Finaliser l{"'"}enrôlement
                </Button>

                <Text ta="center" size="sm" c="gray.5">
                  Déjà enregistré ?{' '}
                  <Anchor component={Link} to="/login" c="brand.4" fw={700}>
                    Se connecter
                  </Anchor>
                </Text>
              </Stack>
            </form>
          )}
        </Paper>
      </Container>
    </Box>
  );
}
