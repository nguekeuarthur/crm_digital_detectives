import { useState } from 'react';
import {
  Box, Title, Text, Group, Button, SimpleGrid, Card,
  Input, Stack, Divider, Badge, ThemeIcon, Select,
  Grid, Progress, ActionIcon,
} from '@mantine/core';
import {
  IconPlus, IconDownload, IconSearch, IconFileAnalytics,
  IconCheck, IconClock, IconAlertTriangle, IconEye,
  IconFileTypePdf, IconChartBar, IconFilter,
} from '@tabler/icons-react';

const STATS = [
  { label: 'Rapports générés', value: '128', icon: IconFileAnalytics, color: '#AB8E3D' },
  { label: 'En cours', value: '7', icon: IconClock, color: '#3B82F6' },
  { label: 'Validés ce mois', value: '23', icon: IconCheck, color: '#22C55E' },
  { label: 'En attente validation', value: '4', icon: IconAlertTriangle, color: '#F59E0B' },
];

type ReportStatus = 'VALIDE' | 'EN_COURS' | 'BROUILLON' | 'EN_ATTENTE';

const STATUS_CONFIG: Record<ReportStatus, { label: string; color: string }> = {
  VALIDE: { label: 'Validé', color: 'green' },
  EN_COURS: { label: 'En cours', color: 'blue' },
  BROUILLON: { label: 'Brouillon', color: 'gray' },
  EN_ATTENTE: { label: 'En attente', color: 'yellow' },
};

const REPORTS = [
  {
    id: 'RPT-2024-089',
    title: 'Rapport de surveillance — SARL Martin',
    mandat: 'MAN-2024-045',
    type: 'Surveillance',
    status: 'VALIDE' as ReportStatus,
    author: 'Jean Enquêteur',
    date: '2024-12-01',
    pages: 24,
    size: '3.2 MB',
  },
  {
    id: 'RPT-2024-088',
    title: 'Rapport d\'investigation numérique — Mme Dubois',
    mandat: 'MAN-2024-048',
    type: 'Investigation',
    status: 'EN_ATTENTE' as ReportStatus,
    author: 'Sophie Martin',
    date: '2024-11-30',
    pages: 18,
    size: '2.1 MB',
  },
  {
    id: 'RPT-2024-087',
    title: 'Synthèse activités — SAS TechCorp',
    mandat: 'MAN-2024-041',
    type: 'Synthèse',
    status: 'EN_COURS' as ReportStatus,
    author: 'Jean Enquêteur',
    date: '2024-11-29',
    pages: 9,
    size: '—',
  },
  {
    id: 'RPT-2024-086',
    title: 'Rapport photos et preuves — M. Lefebvre',
    mandat: 'MAN-2024-039',
    type: 'Preuves',
    status: 'VALIDE' as ReportStatus,
    author: 'Marc Dupont',
    date: '2024-11-28',
    pages: 41,
    size: '8.7 MB',
  },
  {
    id: 'RPT-2024-085',
    title: 'Rapport préliminaire — Jean-Pierre Moreau',
    mandat: 'MAN-2024-051',
    type: 'Préliminaire',
    status: 'BROUILLON' as ReportStatus,
    author: 'Jean Enquêteur',
    date: '2024-11-27',
    pages: 5,
    size: '—',
  },
];

const ACTIVITY = [
  { label: 'Surveillance', count: 48, color: '#AB8E3D' },
  { label: 'Investigation', count: 31, color: '#3B82F6' },
  { label: 'Preuves', count: 27, color: '#22C55E' },
  { label: 'Synthèse', count: 14, color: '#8B5CF6' },
  { label: 'Autres', count: 8, color: '#6B7280' },
];
const total = ACTIVITY.reduce((s, a) => s + a.count, 0);

export function RapportsPage() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  const filtered = REPORTS.filter(r => {
    const matchSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.mandat.toLowerCase().includes(search.toLowerCase()) ||
      r.id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || r.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <Box p="md">
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Rapports</Title>
          <Text c="dimmed" size="sm">Générez et gérez vos rapports d&apos;investigation</Text>
        </div>
        <Group>
          <Button leftSection={<IconPlus size={16} />} color="brand">
            Nouveau rapport
          </Button>
          <Button leftSection={<IconDownload size={16} />} variant="outline">
            Exporter tout
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

      <Grid>
        {/* Liste des rapports */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" mb="md">
              <Text fw={600}>Tous les rapports</Text>
              <Group gap="sm">
                <Input
                  placeholder="Rechercher..."
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
                  data={[
                    { value: 'VALIDE', label: 'Validé' },
                    { value: 'EN_COURS', label: 'En cours' },
                    { value: 'BROUILLON', label: 'Brouillon' },
                    { value: 'EN_ATTENTE', label: 'En attente' },
                  ]}
                />
              </Group>
            </Group>

            <Stack gap={0}>
              {filtered.map((report, i) => {
                const status = STATUS_CONFIG[report.status];
                return (
                  <div key={report.id}>
                    {i > 0 && <Divider />}
                    <Group justify="space-between" py="sm" px={4} wrap="nowrap">
                      <Group gap="sm" style={{ flex: 1, minWidth: 0 }}>
                        <ThemeIcon variant="light" size="lg" radius="sm" color="brand">
                          <IconFileTypePdf size={16} />
                        </ThemeIcon>
                        <div style={{ minWidth: 0 }}>
                          <Group gap="xs" wrap="nowrap">
                            <Text size="sm" fw={600} truncate>{report.title}</Text>
                          </Group>
                          <Group gap="xs">
                            <Text size="xs" c="dimmed">{report.id}</Text>
                            <Text size="xs" c="dimmed">·</Text>
                            <Text size="xs" c="dimmed">{report.mandat}</Text>
                            <Text size="xs" c="dimmed">·</Text>
                            <Text size="xs" c="dimmed">{report.type}</Text>
                          </Group>
                          <Group gap="xs" mt={2}>
                            <Text size="xs" c="dimmed">{report.author}</Text>
                            <Text size="xs" c="dimmed">·</Text>
                            <Text size="xs" c="dimmed">{report.date}</Text>
                            {report.pages && (
                              <>
                                <Text size="xs" c="dimmed">·</Text>
                                <Text size="xs" c="dimmed">{report.pages} pages</Text>
                              </>
                            )}
                          </Group>
                        </div>
                      </Group>
                      <Group gap="sm" style={{ flexShrink: 0 }}>
                        <Badge color={status.color} variant="light" size="sm">
                          {status.label}
                        </Badge>
                        <ActionIcon variant="subtle" size="sm">
                          <IconEye size={14} />
                        </ActionIcon>
                        {report.size !== '—' && (
                          <ActionIcon variant="subtle" size="sm">
                            <IconDownload size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Group>
                  </div>
                );
              })}

              {filtered.length === 0 && (
                <Text c="dimmed" size="sm" ta="center" py="xl">Aucun rapport trouvé</Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Panel droit */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Stack gap="md">
            {/* Répartition par type */}
            <Card withBorder padding="md" radius="md">
              <Group gap="xs" mb="md">
                <IconChartBar size={16} />
                <Text fw={600}>Répartition par type</Text>
              </Group>
              <Stack gap="sm">
                {ACTIVITY.map(({ label, count, color }) => (
                  <div key={label}>
                    <Group justify="space-between" mb={4}>
                      <Text size="xs">{label}</Text>
                      <Text size="xs" c="dimmed">{count}</Text>
                    </Group>
                    <Progress
                      value={(count / total) * 100}
                      size="sm"
                      radius="xl"
                      color={color}
                    />
                  </div>
                ))}
              </Stack>
            </Card>

            {/* Derniers validés */}
            <Card withBorder padding="md" radius="md">
              <Text fw={600} mb="md">Derniers validés</Text>
              <Stack gap={0}>
                {REPORTS.filter(r => r.status === 'VALIDE').slice(0, 3).map((r, i) => (
                  <div key={r.id}>
                    {i > 0 && <Divider my="xs" />}
                    <Group gap="sm">
                      <ThemeIcon variant="light" size="md" radius="sm" color="green">
                        <IconCheck size={14} />
                      </ThemeIcon>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="xs" fw={500} truncate>{r.title}</Text>
                        <Group gap={4}>
                          <Text size="xs" c="dimmed">{r.date}</Text>
                          <Text size="xs" c="dimmed">·</Text>
                          <Text size="xs" c="dimmed">{r.size}</Text>
                        </Group>
                      </div>
                    </Group>
                  </div>
                ))}
              </Stack>
            </Card>
          </Stack>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
