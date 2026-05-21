import { useEffect, useState } from 'react';
import { Title, Text, Box, Button, Group, Grid, Card, Table, ScrollArea, Loader, Center, Badge, SimpleGrid } from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import { IconLogout, IconPlus } from '@tabler/icons-react';
import { useAuthStore } from '../../../features/auth/model/auth.store';
import { StatisticsApi } from '../../../shared/api/statistics';
import { formatCurrency } from '../../../shared/constants';

interface SubcontractorData {
  id: string;
  subcontractor?: { firstName: string; lastName: string };
  startDate?: string;
  hourlyRate?: number;
}

export function SubcontractorsPage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [subcontractors, setSubcontractors] = useState<SubcontractorData[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ active: 0, inMission: 0, hours: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [subData, hoursWorked] = await Promise.all([
          StatisticsApi.getActiveSubcontractors(),
          StatisticsApi.getHoursWorked()
        ]);

        const typedSubData = subData as SubcontractorData[];
        setSubcontractors(typedSubData);
        setStats({
          active: typedSubData.length,
          inMission: typedSubData.filter((s) => s.startDate).length,
          hours: Math.round(hoursWorked.hoursWorked * 10) / 10
        });
      } catch (error) {
        console.error('Error fetching subcontractors:', error);
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
              <Title order={2}>Sous-traitants & Freelances</Title>
              <Text c="dimmed" size="sm">Gérer vos impressionnistes externes</Text>
            </div>

            <Group>
              <Button leftSection={<IconPlus size={16} />} color="brand">Ajouter un sous-traitant</Button>
              <Button onClick={handleLogout} variant="outline" color="red" leftSection={<IconLogout size={16} />}>Déconnexion</Button>
            </Group>
          </Group>
        </Grid.Col>

        <Grid.Col span={12}>
          <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md">
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Sous-traitants actifs</Text>
              <Title order={3}>{stats.active}</Title>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">En mission</Text>
              <Title order={3}>{stats.inMission}</Title>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Heures ce mois</Text>
              <Title order={3}>342h</Title>
            </Card>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Text size="sm" c="dimmed">Disponibilités</Text>
              <Title order={3}>7</Title>
            </Card>
          </SimpleGrid>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Title order={4} mb="md">Liste des sous-traitants</Title>
            <ScrollArea>
              <Table horizontalSpacing="md" verticalSpacing="sm">
                <thead>
                  <tr>
                    <th>Enquêteur</th>
                    <th>Spécialité</th>
                    <th>Missions</th>
                    <th>Heures</th>
                    <th>Tarif</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subcontractors.length > 0 ? (
                    subcontractors.slice(0, 10).map((sub) => (
                      <tr key={sub.id}>
                        <td>{sub.subcontractor?.firstName} {sub.subcontractor?.lastName}</td>
                        <td>Enquêteur</td>
                        <td>24</td>
                        <td>168h</td>
                        <td>{formatCurrency(sub.hourlyRate)}/h</td>
                        <td><Badge color="green">En mission</Badge></td>
                        <td>
                          <Button size="xs" variant="light">Détails</Button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} align="center">
                        <Text c="dimmed" size="sm">Aucun sous-traitant trouvé</Text>
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Grid.Col>

        <Grid.Col span={12}>
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Title order={4} mb="md">Missions en cours</Title>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              {['Sophie Laurent', 'Pierre Durand', 'Thomas Blanc'].map((name) => (
                <Card key={name} shadow="xs" padding="md" radius="md" withBorder>
                  <Group justify="space-between" mb="xs">
                    <Text fw={500}>{name}</Text>
                    <Badge color="green">En cours</Badge>
                  </Group>
                  <Text size="sm" c="dimmed">SPI</Text>
                  <Text size="xs">Tarif: {formatCurrency(85)}/h</Text>
                </Card>
              ))}
            </SimpleGrid>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
