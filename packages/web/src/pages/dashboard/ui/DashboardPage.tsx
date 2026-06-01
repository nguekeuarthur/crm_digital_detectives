import { useEffect, useState } from 'react';
import {
  Title, Text, Box, Button, Group, Grid, Card,
  SimpleGrid, Table, ScrollArea, Loader, Center, ThemeIcon,
} from '@mantine/core';
import {
  IconPlus, IconTrendingUp, IconUsers, IconCash,
  IconPercentage, IconAlertCircle, IconCheck, IconActivity,
} from '@tabler/icons-react';
import { StatisticsApi, DashboardStats } from '../../../shared/api/statistics';

const QUICK_STATS = [
  { label: 'Actions urgentes', value: 7, sub: 'Nécessitent votre attention', icon: IconAlertCircle, color: '#EF4444' },
  { label: 'Tâches terminées', value: 18, sub: 'Cette semaine', icon: IconCheck, color: '#22C55E' },
  { label: 'Activités récentes', value: 42, sub: 'Dernières 24h', icon: IconActivity, color: '#3B82F6' },
];

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    StatisticsApi.getDashboardStats()
      .then(setStats)
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
          <Title order={2}>Dashboard</Title>
          <Text c="dimmed" size="sm">Vue d&apos;ensemble de votre activité d&apos;investigation</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} color="brand">
          Nouveau mandat
        </Button>
      </Group>

      {/* Stats principales */}
      {stats && (
        <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="sm" c="dimmed">Mandats actifs</Text>
                <Title order={2} mt={4}>{stats.activeMandates.value}</Title>
                <Text size="xs" c={stats.activeMandates.change >= 0 ? 'green' : 'red'}>
                  {stats.activeMandates.change >= 0 ? '+' : ''}{stats.activeMandates.change}% ce mois
                </Text>
              </div>
              <ThemeIcon variant="light" size="lg" radius="md" color="brand">
                <IconTrendingUp size={18} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="sm" c="dimmed">Clients totaux</Text>
                <Title order={2} mt={4}>{stats.totalClients.value}</Title>
                <Text size="xs" c={stats.totalClients.change >= 0 ? 'green' : 'red'}>
                  {stats.totalClients.change >= 0 ? '+' : ''}{stats.totalClients.change}% ce mois
                </Text>
              </div>
              <ThemeIcon variant="light" size="lg" radius="md" color="blue">
                <IconUsers size={18} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="sm" c="dimmed">CA du mois</Text>
                <Title order={2} mt={4}>
                  {new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(stats.monthRevenue.value)}
                </Title>
                <Text size="xs" c={stats.monthRevenue.change >= 0 ? 'green' : 'red'}>
                  {stats.monthRevenue.change >= 0 ? '+' : ''}{stats.monthRevenue.change}% ce mois
                </Text>
              </div>
              <ThemeIcon variant="light" size="lg" radius="md" color="green">
                <IconCash size={18} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="sm" c="dimmed">Taux de réussite</Text>
                <Title order={2} mt={4}>{stats.successRate.value}%</Title>
                <Text size="xs" c={stats.successRate.change >= 0 ? 'green' : 'red'}>
                  {stats.successRate.change >= 0 ? '+' : ''}{stats.successRate.change}% ce mois
                </Text>
              </div>
              <ThemeIcon variant="light" size="lg" radius="md" color="yellow">
                <IconPercentage size={18} />
              </ThemeIcon>
            </Group>
          </Card>
        </SimpleGrid>
      )}

      <Grid gutter="md">
        {/* Mandats récents */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" mb="md">
              <Text fw={600}>Mandats récents</Text>
              <Text c="dimmed" size="xs">Aperçu des derniers mandats en cours</Text>
            </Group>

            <ScrollArea>
              <Table horizontalSpacing="md" verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ID Mandat</Table.Th>
                    <Table.Th>Client</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>Priorité</Table.Th>
                    <Table.Th>Échéance</Table.Th>
                    <Table.Th>Montant</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td colSpan={7} style={{ textAlign: 'center' }}>
                      <Text c="dimmed" size="sm" py="md">Aucun mandat trouvé</Text>
                    </Table.Td>
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Grid.Col>

        {/* Activité rapide */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <SimpleGrid cols={1} spacing="md">
            {QUICK_STATS.map(({ label, value, sub, icon: Icon, color }) => (
              <Card key={label} withBorder padding="md" radius="md">
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Text size="sm" c="dimmed">{label}</Text>
                    <Title order={3} mt={2}>{value}</Title>
                    <Text size="xs" c="dimmed">{sub}</Text>
                  </div>
                  <ThemeIcon variant="light" size="lg" radius="md" style={{ color }}>
                    <Icon size={18} />
                  </ThemeIcon>
                </Group>
              </Card>
            ))}
          </SimpleGrid>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
