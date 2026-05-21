import { useEffect, useState } from 'react';
import { Title, Text, Box, Button, Group, Grid, Card, Table, ScrollArea, Loader, Center, Badge, Input, SimpleGrid } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { IconSearch, IconPlus, IconLogout } from '@tabler/icons-react';
import { useAuthStore } from '../../../features/auth/model/auth.store';
import { ClientApi } from '../../../shared/api/client';
import { StatisticsApi } from '../../../shared/api/statistics';
import { formatCurrency } from '../../../shared/constants';

interface ClientData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  mandats: unknown[];
}

export function ClientsPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, revenue: 0, mandateCount: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [clientsData, revenueData] = await Promise.all([
          ClientApi.list({ limit: 100 }),
          StatisticsApi.getRevenueByClient()
        ]);

        setClients(clientsData.clients || []);
        const totalRevenue = revenueData.reduce((sum, c) => sum + c.estimatedRevenue, 0);
        const totalMandates = revenueData.reduce((sum, c) => sum + c.mandateCount, 0);

        setStats({
          total: clientsData.total || 0,
          revenue: totalRevenue,
          mandateCount: totalMandates
        });
      } catch (error) {
        console.error('Error fetching clients:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredClients = clients.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.company?.toLowerCase().includes(searchQuery.toLowerCase()) || false)
  );

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Box p="md">
      <Grid gutter="md">
        <Grid.Col span={12}>
          <Group justify="space-between" align="center">
            <div>
              <Title order={2}>Clients & Mandats</Title>
              <Text c="dimmed" size="sm">Gérer vos clients et mandats</Text>
            </div>

            <Group>
              <Button leftSection={<IconPlus size={16} />} color="brand">Nouveau client</Button>
              <Button onClick={handleLogout} variant="outline" color="red" leftSection={<IconLogout size={16} />}>Déconnexion</Button>
            </Group>
          </Group>
        </Grid.Col>

        <Grid.Col span={12}>
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Clients totaux</Text>
              <Title order={3}>{stats.total}</Title>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Mandats actifs</Text>
              <Title order={3}>{stats.mandateCount}</Title>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">CA total</Text>
              <Title order={3}>{formatCurrency(stats.revenue)}</Title>
            </Card>
          </SimpleGrid>
        </Grid.Col>

        <Grid.Col span={12}>
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            mb="md"
          />

          <Card shadow="sm" padding="md" radius="md" withBorder>
            <ScrollArea>
              <Table horizontalSpacing="md" verticalSpacing="sm">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nom</th>
                    <th>Contact</th>
                    <th>Mandats</th>
                    <th>Statut</th>
                    <th>CA total</th>
                    <th>Dernier contact</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.length > 0 ? (
                    filteredClients.map((client) => (
                      <tr key={client.id}>
                        <td>{client.id.substring(0, 8)}</td>
                        <td>{`${client.firstName} ${client.lastName}`}</td>
                        <td>
                          <div>
                            <Text size="sm">{client.email}</Text>
                            {client.phone && <Text size="xs" c="dimmed">{client.phone}</Text>}
                          </div>
                        </td>
                        <td>{client.mandats?.length || 0}</td>
                        <td><Badge color="blue">Actif</Badge></td>
                        <td>{formatCurrency((client.mandats?.length || 0) * 1500)}</td>
                        <td>15/12/2024</td>
                        <td>
                          <Button size="xs" variant="light">Détails</Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} align="center">
                        <Text c="dimmed" size="sm">Aucun client trouvé</Text>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
