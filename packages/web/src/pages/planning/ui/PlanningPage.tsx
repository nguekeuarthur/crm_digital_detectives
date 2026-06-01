import { useEffect, useState } from 'react';
import {
  Title, Text, Box, Button, Group, Grid, Card,
  Table, ScrollArea, Loader, Center, Badge, SimpleGrid, ThemeIcon,
} from '@mantine/core';
import { IconPlus, IconCalendar, IconUsers, IconClock, IconChartPie } from '@tabler/icons-react';
import { StatisticsApi } from '../../../shared/api/statistics';

interface Mission {
  id: string;
  title: string;
  client: string;
  assignee: string;
  date: string;
  duration: string;
  status: 'En cours' | 'Modifié' | 'Planifié';
}

const STATUS_COLOR: Record<Mission['status'], string> = {
  'En cours': 'green',
  'Modifié': 'yellow',
  'Planifié': 'blue',
};

const MISSIONS: Mission[] = [
  { id: '1', title: 'Filature M. Dupont', client: 'Jean Méroaux', assignee: 'Jean Méroaux', date: '2024-12-01', duration: '09:00 – 17:00', status: 'En cours' },
  { id: '2', title: 'Surveillance domicile', client: 'Sophie Laurent', assignee: 'Sophie Laurent', date: '2024-12-01', duration: '14:00 – 22:00', status: 'Modifié' },
  { id: '3', title: 'Investigation entreprise', client: 'Pierre Durand', assignee: 'Pierre Durand', date: '2024-12-02', duration: '08:00 – 12:00', status: 'Planifié' },
  { id: '4', title: "Recherche d'adresse", client: 'Marie Chen', assignee: 'Marie Chen', date: '2024-12-02', duration: '10:00 – 18:00', status: 'En cours' },
  { id: '5', title: 'Rapports hebdomadaires', client: 'Thomas Blanc', assignee: 'Thomas Blanc', date: '2024-12-02', duration: '08:00 – 16:00', status: 'Planifié' },
];

export function PlanningPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ inProgress: 0, hours: 124, completed: 0 });

  useEffect(() => {
    Promise.all([
      StatisticsApi.getMandatesByStatus(),
      StatisticsApi.getHoursWorked(),
      StatisticsApi.getCompletedTasks(),
    ])
      .then(([byStatus, hours, tasks]) => {
        setStats({
          inProgress: byStatus.EN_COURS || 0,
          hours: Math.round(hours * 10) / 10 || 124,
          completed: tasks.completedTasks,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Center style={{ minHeight: '60vh' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Box p="md">
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Planning</Title>
          <Text c="dimmed" size="sm">Organisez vos missions et enquêteurs</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} color="brand">
          Nouvelle mission
        </Button>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
        {[
          { label: 'Missions en cours', value: stats.inProgress, icon: IconCalendar, color: '#AB8E3D' },
          { label: 'Enquêteurs actifs', value: 5, icon: IconUsers, color: '#3B82F6' },
          { label: 'Heures planifiées', value: `${stats.hours}h`, icon: IconClock, color: '#22C55E' },
          { label: "Taux d'occupation", value: '78%', icon: IconChartPie, color: '#8B5CF6' },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} withBorder padding="md" radius="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="sm" c="dimmed">{label}</Text>
                <Title order={2} mt={4}>{value}</Title>
              </div>
              <ThemeIcon variant="light" size="lg" radius="md" style={{ color }}>
                <Icon size={18} />
              </ThemeIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Vue hebdomadaire */}
      <Grid gutter="md">
        <Grid.Col span={12}>
          <Card withBorder padding="md" radius="md">
            <Text fw={600} mb="md">Vue hebdomadaire — 1er au 7 décembre 2024</Text>
            <ScrollArea>
              <Table horizontalSpacing="md" verticalSpacing="sm" striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Mandat</Table.Th>
                    <Table.Th>Client</Table.Th>
                    <Table.Th>Enquêteur</Table.Th>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Horaires</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {MISSIONS.map(m => (
                    <Table.Tr key={m.id}>
                      <Table.Td>
                        <Text size="sm" fw={500}>{m.title}</Text>
                      </Table.Td>
                      <Table.Td><Text size="sm">{m.client}</Text></Table.Td>
                      <Table.Td><Text size="sm">{m.assignee}</Text></Table.Td>
                      <Table.Td><Text size="sm">{m.date}</Text></Table.Td>
                      <Table.Td>
                        <Text size="sm" ff="monospace">{m.duration}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={STATUS_COLOR[m.status]} variant="light" size="sm">
                          {m.status.toUpperCase()}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="light">Détails</Button>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
