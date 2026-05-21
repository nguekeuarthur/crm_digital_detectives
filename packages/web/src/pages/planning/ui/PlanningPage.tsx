import { useEffect, useState } from 'react';
import { Title, Text, Box, Button, Group, Grid, Card, Table, ScrollArea, Loader, Center, Badge, SimpleGrid } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { IconLogout, IconPlus } from '@tabler/icons-react';
import { useAuthStore } from '../../../features/auth/model/auth.store';
import { StatisticsApi } from '../../../shared/api/statistics';

interface PlanningData {
  id: string;
  title: string;
  client: string;
  assignee: string;
  date: string;
  duration: string;
  status: string;
}

export function PlanningPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ inProgress: 0, hours: 0, completed: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [mandatesByStatus, hoursWorked, completedTasks] = await Promise.all([
          StatisticsApi.getMandatesByStatus(),
          StatisticsApi.getHoursWorked(),
          StatisticsApi.getCompletedTasks()
        ]);

        setStats({
          inProgress: mandatesByStatus.EN_COURS || 0,
          hours: Math.round(hoursWorked * 10) / 10,
          completed: completedTasks.completedTasks
        });
      } catch (error) {
        console.error('Error fetching planning data:', error);
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

  const planningData: PlanningData[] = [
    {
      id: '1',
      title: 'Filature M. Dupont',
      client: 'Jean Méroaux',
      assignee: 'Jean Méroaux',
      date: '2024-12-01',
      duration: '09:00 - 17:00',
      status: 'En cours'
    },
    {
      id: '2',
      title: 'Surveillance domicile',
      client: 'Sophie Laurent',
      assignee: 'Sophie Laurent',
      date: '2024-12-01',
      duration: '14:00 - 22:00',
      status: 'Modifié'
    },
    {
      id: '3',
      title: 'Investigation entreprise',
      client: 'Pierre Durand',
      assignee: 'Pierre Durand',
      date: '2024-12-02',
      duration: '08:00 - 12:00',
      status: 'Planifié'
    },
    {
      id: '4',
      title: 'Recherche d\'adresse',
      client: 'Marie Chen',
      assignee: 'Marie Chen',
      date: '2024-12-02',
      duration: '10:00 - 18:00',
      status: 'En cours'
    },
    {
      id: '5',
      title: 'Rapports hebdomadaires',
      client: 'Thomas Blanc',
      assignee: 'Thomas Blanc',
      date: '2024-12-02',
      duration: '08:00 - 16:00',
      status: 'Planifié'
    }
  ];

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
              <Title order={2}>Planning</Title>
              <Text c="dimmed" size="sm">Organisez vos missions et enquêteurs</Text>
            </div>

            <Group>
              <Button leftSection={<IconPlus size={16} />} color="brand">Nouvelle mission</Button>
              <Button onClick={handleLogout} variant="outline" color="red" leftSection={<IconLogout size={16} />}>Déconnexion</Button>
            </Group>
          </Group>
        </Grid.Col>

        <Grid.Col span={12}>
          <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Missions en cours</Text>
              <Title order={3}>{stats.inProgress}</Title>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Enquêteurs actifs</Text>
              <Title order={3}>5</Title>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Heures planifiées</Text>
              <Title order={3}>124h</Title>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Taux d&apos;occupation</Text>
              <Title order={3}>78%</Title>
            </Card>
          </SimpleGrid>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Title order={4} mb="md">Vue hebdomadaire - 1er à 7 décembre 2024</Title>
            <ScrollArea>
              <Table horizontalSpacing="md" verticalSpacing="sm">
                <thead>
                  <tr>
                    <th>Mandat</th>
                    <th>Client</th>
                    <th>Enquêteur</th>
                    <th>Date</th>
                    <th>Durée</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {planningData.map((item) => (
                    <tr key={item.id}>
                      <td>{item.title}</td>
                      <td>{item.client}</td>
                      <td>{item.assignee}</td>
                      <td>{item.date}</td>
                      <td>{item.duration}</td>
                      <td>
                        <Badge
                          color={
                            item.status === 'En cours'
                              ? 'green'
                              : item.status === 'Modifié'
                                ? 'yellow'
                                : 'blue'
                          }
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td>
                        <Button size="xs" variant="light">Détails</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
