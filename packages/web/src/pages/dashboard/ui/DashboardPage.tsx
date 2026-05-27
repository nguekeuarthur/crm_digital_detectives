import { useEffect, useState } from 'react';
import { Title, Text, Box, Button, Group, Grid, Card, SimpleGrid, Paper, Badge, Table, ScrollArea, Loader, Center } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../../features/auth/model/auth.store';
import { IconLogout, IconSearch, IconPlus, IconTrendingUp, IconUsers, IconCash, IconPercentage } from '@tabler/icons-react';
import { StatCard } from '../../../widgets/layout/ui/StatCard';
import { StatisticsApi, DashboardStats } from '../../../shared/api/statistics';

interface RecentMandate {
  id: string;
  client: string;
  type: string;
  status: string;
  priority: string;
  due: string;
  amount: string;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentMandates] = useState<RecentMandate[]>([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await StatisticsApi.getDashboardStats();
        setStats(data);
        // TODO: Fetch recent mandates
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <Center style={{ minHeight: '100vh' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Box p="md">
      <Grid gap="md">
        <Grid.Col span={12}>
          <Group justify="space-between" align="center">
            <div>
              <Title order={2}>Dashboard</Title>
              <Text c="dimmed" size="sm">Vue d&apos;ensemble de votre activité d&apos;investigation</Text>
            </div>

            <Group>
              <Button leftSection={<IconSearch size={16} />} variant="default">Rechercher</Button>
              <Button leftSection={<IconPlus size={16} />} color="brand">Nouveau mandat</Button>
              <Button onClick={handleLogout} variant="outline" color="red" leftSection={<IconLogout size={16} />}>Déconnexion</Button>
            </Group>
          </Group>
        </Grid.Col>

        {stats && (
          <Grid.Col span={12}>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              <StatCard
                label="Mandats actifs"
                value={stats.activeMandates.value}
                change={stats.activeMandates.change}
                icon={<IconTrendingUp size={20} />}
              />
              <StatCard
                label="Clients totaux"
                value={stats.totalClients.value}
                change={stats.totalClients.change}
                icon={<IconUsers size={20} />}
              />
              <StatCard
                label="CA du mois"
                value={stats.monthRevenue.value}
                change={stats.monthRevenue.change}
                currency
                icon={<IconCash size={20} />}
              />
              <StatCard
                label="Taux de réussite"
                value={`${stats.successRate.value}%`}
                change={stats.successRate.change}
                icon={<IconPercentage size={20} />}
              />
            </SimpleGrid>
          </Grid.Col>
        )}

        <Grid.Col span={{ base: 12, md: 8 }}>
          <Paper p="md" shadow="sm" radius="md" withBorder>
            <Group justify="space-between" align="center" mb="md">
              <Text fw={700}>Mandats récents</Text>
              <Text c="dimmed" size="sm">Aperçu des derniers mandats en cours</Text>
            </Group>

            <ScrollArea>
              <Table horizontalSpacing="md" verticalSpacing="sm">
                <thead>
                  <tr>
                    <th>ID Mandat</th>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Priorité</th>
                    <th>Échéance</th>
                    <th>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {recentMandates.length > 0 ? (
                    recentMandates.map((m) => (
                      <tr key={m.id}>
                        <td>{m.id}</td>
                        <td>{m.client}</td>
                        <td>{m.type}</td>
                        <td><Badge color={m.status === 'En cours' ? 'blue' : 'gray'}>{m.status}</Badge></td>
                        <td>
                          <Badge color={m.priority === 'Haute' ? 'red' : m.priority === 'Moyenne' ? 'yellow' : 'green'}>{m.priority}</Badge>
                        </td>
                        <td>{m.due}</td>
                        <td>{m.amount}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} align="center">
                        <Text c="dimmed" size="sm">Aucun mandat trouvé</Text>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </ScrollArea>
          </Paper>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 4 }}>
          <SimpleGrid cols={1} spacing="md">
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Actions urgentes</Text>
              <Title order={3}>7</Title>
              <Text c="dimmed" size="xs">Nécessitent votre attention</Text>
            </Card>

            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Tâches terminées</Text>
              <Title order={3}>18</Title>
              <Text c="dimmed" size="xs">Cette semaine</Text>
            </Card>

            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Activités récentes</Text>
              <Title order={3}>42</Title>
              <Text c="dimmed" size="xs">Dernières 24h</Text>
            </Card>
          </SimpleGrid>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
