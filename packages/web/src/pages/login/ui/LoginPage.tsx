import { useState } from 'react';
import { 
  TextInput, 
  PasswordInput, 
  Button, 
  Paper, 
  Title, 
  Text, 
  Container, 
  Group, 
  PinInput, 
  Stack,
  Alert
} from '@mantine/core';
import { IconLock, IconMail, IconShieldCheck } from '@tabler/icons-react';
import { api } from '../../../shared/api/base';
import { useAuthStore } from '../../../features/auth/model/auth.store';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { require2FA, tempUserId, setRequire2FA, setTokens } = useAuthStore();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login', { email, password });
      
      if (data.require2FA) {
        setRequire2FA(data.userId);
      } else {
        setTokens(data.accessToken, data.refreshToken);
        window.location.href = '/';
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post('/auth/login-2fa', { userId: tempUserId, code });
      setTokens(data.accessToken, data.refreshToken);
      window.location.href = '/';
    } catch (err: any) {
      setError('Code incorrect. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Title ta="center" fw={900}>
        Digital Detectives
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Accès réservé aux enquêteurs
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        {error && (
          <Alert color="red" mb="lg" title="Erreur">
            {error}
          </Alert>
        )}

        {!require2FA ? (
          <form onSubmit={handleLogin}>
            <Stack>
              <TextInput 
                label="Email" 
                placeholder="votre@email.com" 
                required 
                leftSection={<IconMail size={16} />}
                value={email}
                onChange={(e) => setEmail(e.currentTarget.value)}
              />
              <PasswordInput 
                label="Mot de passe" 
                placeholder="Votre mot de passe" 
                required 
                leftSection={<IconLock size={16} />}
                value={password}
                onChange={(e) => setPassword(e.currentTarget.value)}
              />
              <Button type="submit" fullWidth mt="xl" loading={loading} gradient={{ from: 'indigo', to: 'cyan' }} variant="gradient">
                Se connecter
              </Button>
            </Stack>
          </form>
        ) : (
          <Stack align="center">
            <IconShieldCheck size={48} color="var(--mantine-color-blue-filled)" />
            <Title order={3}>Double authentification</Title>
            <Text size="sm" c="dimmed" ta="center">
              Saisissez le code à 6 chiffres généré par votre application (Google Authenticator)
            </Text>
            
            <PinInput 
              length={6} 
              oneTimeCode 
              type="number" 
              autoFocus 
              value={code}
              onChange={setCode}
              disabled={loading}
            />

            <Button 
              fullWidth 
              mt="md" 
              onClick={handleVerify2FA} 
              loading={loading}
              disabled={code.length < 6}
            >
              Vérifier le code
            </Button>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
