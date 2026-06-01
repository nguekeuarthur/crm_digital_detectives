import { useEffect, useState, useCallback } from 'react';
import {
  Title, Text, Box, Button, Group, Grid, Card,
  Table, ScrollArea, Loader, Center, Badge, Input, SimpleGrid, ThemeIcon,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconSearch, IconPlus, IconUsers, IconBriefcase, IconCoin } from '@tabler/icons-react';
import { ClientApi, Client } from '../../../shared/api/client';
import { StatisticsApi } from '../../../shared/api/statistics';
import { formatCurrency } from '../../../shared/constants';
import { ClientFormModal } from './ClientFormModal';

export function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ total: 0, revenue: 0, mandateCount: 0 });
  const [formOpened, { open: openForm, close: closeForm }] = useDisclosure(false);

  const fetchData = useCallback(async () => {
    try {
      const [clientsData, revenueData] = await Promise.all([
        ClientApi.list({ limit: 100 }),
        StatisticsApi.getRevenueByClient(),
      ]);
      setClients(clientsData.clients || []);
      const totalRevenue = revenueData.reduce((s, c) => s + c.estimatedRevenue, 0);
      const totalMandates = revenueData.reduce((s, c) => s + c.mandateCount, 0);
      setStats({ total: clientsData.total || 0, revenue: totalRevenue, mandateCount: totalMandates });
    } catch (err) {
      console.error('Error fetching clients:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = clients.filter(c =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.company?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  if (loading) {
    return (
      <Center style={{ minHeight: '60vh' }}>
        <Loader />
      </Center>
    );
  }

  return (
    <Box p="md">
      <ClientFormModal opened={formOpened} onClose={closeForm} onSuccess={fetchData} />

      {/* Header */}
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Clients &amp; Mandats</Title>
          <Text c="dimmed" size="sm">Gérez vos clients et mandats</Text>
        </div>
        <Button leftSection={<IconPlus size={16} />} color="brand" onClick={openForm}>
          Nouveau client
        </Button>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
        <Card withBorder padding="md" radius="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="sm" c="dimmed">Clients totaux</Text>
              <Title order={2} mt={4}>{stats.total}</Title>
            </div>
            <ThemeIcon variant="light" size="lg" radius="md" color="brand">
              <IconUsers size={18} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card withBorder padding="md" radius="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="sm" c="dimmed">Mandats actifs</Text>
              <Title order={2} mt={4}>{stats.mandateCount}</Title>
            </div>
            <ThemeIcon variant="light" size="lg" radius="md" color="blue">
              <IconBriefcase size={18} />
            </ThemeIcon>
          </Group>
        </Card>
        <Card withBorder padding="md" radius="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Text size="sm" c="dimmed">CA total</Text>
              <Title order={2} mt={4}>{formatCurrency(stats.revenue)}</Title>
            </div>
            <ThemeIcon variant="light" size="lg" radius="md" color="green">
              <IconCoin size={18} />
            </ThemeIcon>
          </Group>
        </Card>
      </SimpleGrid>

      {/* Table */}
      <Grid gutter="md">
        <Grid.Col span={12}>
          <Input
            placeholder="Rechercher par nom, email, téléphone..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={e => setSearchQuery(e.currentTarget.value)}
            mb="md"
          />

          <Card withBorder padding="md" radius="md">
            <ScrollArea>
              <Table horizontalSpacing="md" verticalSpacing="sm" striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>ID</Table.Th>
                    <Table.Th>Nom</Table.Th>
                    <Table.Th>Contact</Table.Th>
                    <Table.Th>Mandats</Table.Th>
                    <Table.Th>Statut</Table.Th>
                    <Table.Th>CA total</Table.Th>
                    <Table.Th>Dernier contact</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filtered.length > 0 ? filtered.map(client => (
                    <Table.Tr key={client.id}>
                      <Table.Td>
                        <Text size="sm" ff="monospace" c="dimmed">{client.id.substring(0, 8)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>{client.firstName} {client.lastName}</Text>
                        {client.company && <Text size="xs" c="dimmed">{client.company}</Text>}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{client.email}</Text>
                        {client.phone && <Text size="xs" c="dimmed">{client.phone}</Text>}
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" ta="center">{client.mandats?.length ?? 0}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={client.status === 'ACTIF' ? 'green' : client.status === 'PROSPECT' ? 'blue' : 'gray'}
                          variant="light"
                          size="sm"
                        >
                          {client.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{formatCurrency((client.mandats?.length ?? 0) * 1500)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">15/12/2024</Text>
                      </Table.Td>
                      <Table.Td>
                        <Button size="xs" variant="light">Détails</Button>
                      </Table.Td>
                    </Table.Tr>
                  )) : (
                    <Table.Tr>
                      <Table.Td colSpan={8} style={{ textAlign: 'center' }}>
                        <Text c="dimmed" size="sm" py="md">Aucun client trouvé</Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
