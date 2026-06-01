import { useState } from 'react';
import {
  Box, Title, Text, Group, Button, SimpleGrid, Card,
  Input, Stack, Divider, Badge, ThemeIcon, Select,
  Grid, ActionIcon, Table,
} from '@mantine/core';
import {
  IconPlus, IconDownload, IconSearch, IconFileInvoice,
  IconCheck, IconClock, IconX, IconSend, IconFilter,
  IconEye, IconCurrencyEuro, IconAlertCircle,
} from '@tabler/icons-react';

const STATS = [
  { label: 'Total devis', value: '47', icon: IconFileInvoice, color: '#AB8E3D' },
  { label: 'En attente', value: '12', icon: IconClock, color: '#F59E0B' },
  { label: 'Acceptés', value: '28', icon: IconCheck, color: '#22C55E' },
  { label: 'CA potentiel', value: '84 200 CHF', icon: IconCurrencyEuro, color: '#3B82F6' },
];

type DevisStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED';

const STATUS_CONFIG: Record<DevisStatus, { label: string; color: string }> = {
  DRAFT:    { label: 'Brouillon',  color: 'gray' },
  SENT:     { label: 'Envoyé',     color: 'blue' },
  ACCEPTED: { label: 'Accepté',    color: 'green' },
  REFUSED:  { label: 'Refusé',     color: 'red' },
  EXPIRED:  { label: 'Expiré',     color: 'orange' },
};

const DEVIS_LIST = [
  { ref: 'DD-2026-0012', client: 'SARL Martin', mandat: 'MAN-2024-045', status: 'ACCEPTED' as DevisStatus, totalHT: 4800, totalTTC: 5169.6, date: '2026-05-20', expiry: '2026-06-20' },
  { ref: 'DD-2026-0011', client: 'Mme Dubois', mandat: 'MAN-2024-048', status: 'SENT' as DevisStatus, totalHT: 2400, totalTTC: 2584.8, date: '2026-05-18', expiry: '2026-06-18' },
  { ref: 'DD-2026-0010', client: 'SAS TechCorp', mandat: 'MAN-2024-041', status: 'DRAFT' as DevisStatus, totalHT: 9600, totalTTC: 10339.2, date: '2026-05-15', expiry: '2026-06-15' },
  { ref: 'DD-2026-0009', client: 'Jean-Pierre Moreau', mandat: 'MAN-2024-051', status: 'REFUSED' as DevisStatus, totalHT: 1800, totalTTC: 1938.6, date: '2026-05-10', expiry: '2026-06-10' },
  { ref: 'DD-2026-0008', client: 'Dubois & Associés', mandat: 'MAN-2024-037', status: 'EXPIRED' as DevisStatus, totalHT: 3200, totalTTC: 3446.4, date: '2026-04-01', expiry: '2026-05-01' },
  { ref: 'DD-2026-0007', client: 'SARL Martin', mandat: 'MAN-2024-045', status: 'ACCEPTED' as DevisStatus, totalHT: 6400, totalTTC: 6892.8, date: '2026-03-15', expiry: '2026-04-15' },
];

const formatCHF = (n: number) =>
  new Intl.NumberFormat('fr-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 }).format(n);

export function DevisPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filtered = DEVIS_LIST.filter(d => {
    const matchSearch =
      d.ref.toLowerCase().includes(search.toLowerCase()) ||
      d.client.toLowerCase().includes(search.toLowerCase()) ||
      d.mandat.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const caAccepte = DEVIS_LIST
    .filter(d => d.status === 'ACCEPTED')
    .reduce((s, d) => s + d.totalHT, 0);

  const caEnAttente = DEVIS_LIST
    .filter(d => d.status === 'SENT')
    .reduce((s, d) => s + d.totalHT, 0);

  return (
    <Box p="md">
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Devis</Title>
          <Text c="dimmed" size="sm">Gérez vos propositions commerciales</Text>
        </div>
        <Group>
          <Button leftSection={<IconPlus size={16} />} color="brand">
            Nouveau devis
          </Button>
          <Button leftSection={<IconDownload size={16} />} variant="outline">
            Exporter
          </Button>
        </Group>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
        {STATS.map(({ label, value, icon: Icon, color }) => (
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

      <Grid gutter="md">
        {/* Liste devis */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" mb="md">
              <Text fw={600}>Tous les devis</Text>
              <Group gap="sm">
                <Input
                  placeholder="Référence, client..."
                  leftSection={<IconSearch size={14} />}
                  size="sm"
                  w={180}
                  value={search}
                  onChange={e => setSearch(e.currentTarget.value)}
                />
                <Select
                  placeholder="Statut"
                  size="sm"
                  w={140}
                  leftSection={<IconFilter size={14} />}
                  clearable
                  value={filterStatus}
                  onChange={setFilterStatus}
                  data={Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({ value, label }))}
                />
              </Group>
            </Group>

            <Table horizontalSpacing="sm" verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Référence</Table.Th>
                  <Table.Th>Client</Table.Th>
                  <Table.Th>Montant HT</Table.Th>
                  <Table.Th>Statut</Table.Th>
                  <Table.Th>Expiration</Table.Th>
                  <Table.Th />
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filtered.map(devis => {
                  const status = STATUS_CONFIG[devis.status];
                  const expired = new Date(devis.expiry) < new Date() && devis.status === 'SENT';
                  return (
                    <Table.Tr key={devis.ref}>
                      <Table.Td>
                        <Text size="sm" fw={600} ff="monospace">{devis.ref}</Text>
                        <Text size="xs" c="dimmed">{devis.mandat}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{devis.client}</Text>
                        <Text size="xs" c="dimmed">{devis.date}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>{formatCHF(devis.totalHT)}</Text>
                        <Text size="xs" c="dimmed">TTC {formatCHF(devis.totalTTC)}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge color={status.color} variant="light" size="sm">
                          {status.label}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {expired && <IconAlertCircle size={12} color="orange" />}
                          <Text size="xs" c={expired ? 'orange' : 'dimmed'}>{devis.expiry}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end">
                          <ActionIcon variant="subtle" size="sm" title="Voir">
                            <IconEye size={14} />
                          </ActionIcon>
                          {devis.status === 'DRAFT' && (
                            <ActionIcon variant="subtle" size="sm" color="blue" title="Envoyer">
                              <IconSend size={14} />
                            </ActionIcon>
                          )}
                          <ActionIcon variant="subtle" size="sm" title="Télécharger PDF">
                            <IconDownload size={14} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  );
                })}
                {filtered.length === 0 && (
                  <Table.Tr>
                    <Table.Td colSpan={6} style={{ textAlign: 'center' }}>
                      <Text c="dimmed" size="sm" py="md">Aucun devis trouvé</Text>
                    </Table.Td>
                  </Table.Tr>
                )}
              </Table.Tbody>
            </Table>
          </Card>
        </Grid.Col>

        {/* Panel droit */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            {/* Résumé financier */}
            <Card withBorder padding="md" radius="md">
              <Text fw={600} mb="md">Résumé financier</Text>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="green"><IconCheck size={12} /></ThemeIcon>
                    <Text size="sm">CA accepté</Text>
                  </Group>
                  <Text size="sm" fw={600} c="green">{formatCHF(caAccepte)}</Text>
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="blue"><IconClock size={12} /></ThemeIcon>
                    <Text size="sm">CA en attente</Text>
                  </Group>
                  <Text size="sm" fw={600} c="blue">{formatCHF(caEnAttente)}</Text>
                </Group>
                <Divider />
                <Group justify="space-between">
                  <Group gap="xs">
                    <ThemeIcon size="sm" variant="light" color="yellow"><IconFileInvoice size={12} /></ThemeIcon>
                    <Text size="sm">Taux d&apos;acceptation</Text>
                  </Group>
                  <Text size="sm" fw={600}>
                    {Math.round((DEVIS_LIST.filter(d => d.status === 'ACCEPTED').length / DEVIS_LIST.length) * 100)}%
                  </Text>
                </Group>
              </Stack>
            </Card>

            {/* À relancer */}
            <Card withBorder padding="md" radius="md">
              <Text fw={600} mb="md">À relancer</Text>
              <Stack gap={0}>
                {DEVIS_LIST.filter(d => d.status === 'SENT').map((d, i) => (
                  <div key={d.ref}>
                    {i > 0 && <Divider my="xs" />}
                    <Group justify="space-between">
                      <div>
                        <Text size="xs" fw={600} ff="monospace">{d.ref}</Text>
                        <Text size="xs" c="dimmed">{d.client}</Text>
                      </div>
                      <Group gap="xs">
                        <Text size="xs" c="dimmed">{formatCHF(d.totalHT)}</Text>
                        <ActionIcon variant="light" size="xs" color="blue">
                          <IconSend size={10} />
                        </ActionIcon>
                      </Group>
                    </Group>
                  </div>
                ))}
                {DEVIS_LIST.filter(d => d.status === 'SENT').length === 0 && (
                  <Group gap="xs">
                    <IconX size={14} />
                    <Text size="sm" c="dimmed">Aucun devis à relancer</Text>
                  </Group>
                )}
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
