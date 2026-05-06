import { Title, Text, Stack, Box, Button, Group } from '@mantine/core';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/model/auth.store';
import { IconLogout, IconShieldLock } from '@tabler/icons-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Stack gap="xl" p="lg" align="center" justify="center" style={{ minHeight: '60vh' }}>
      <Box ta="center">
        <Title order={1} fw={900} style={{ fontSize: '3.5rem', letterSpacing: '-1.5px' }}>
          Hello <Text component="span" variant="gradient" gradient={{ from: 'brand.5', to: 'indigo.4' }} inherit>World</Text>
        </Title>
        <Text c="dimmed" size="xl" fw={500} mt="md">
          Bienvenue dans votre terminal d{"'"}enquête.
        </Text>

        <Group justify="center" mt={40} gap="md">
          <Button 
            component={Link} 
            to="/settings/2fa" 
            variant="light" 
            color="brand" 
            size="md" 
            radius="md"
            leftSection={<IconShieldLock size={18} />}
          >
            Sécurité 2FA
          </Button>
          
          <Button 
            onClick={handleLogout} 
            variant="subtle" 
            color="red" 
            size="md" 
            radius="md"
            leftSection={<IconLogout size={18} />}
          >
            Déconnexion
          </Button>
        </Group>
      </Box>
    </Stack>
  );
}
