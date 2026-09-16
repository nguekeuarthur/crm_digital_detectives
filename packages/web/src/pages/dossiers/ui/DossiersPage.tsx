import { useState } from 'react';
import {
  Box, Title, Text, Group, Button, SimpleGrid, Card,
  Input, Stack, Divider, Grid, Badge, ActionIcon, ThemeIcon,
} from '@mantine/core';
import {
  IconUpload, IconDownload, IconSearch, IconFolder,
  IconFile, IconPhoto, IconDatabase, IconFileTypePdf,
  IconFileTypeDocx, IconFileDescription,
} from '@tabler/icons-react';

const STATS = [
  { label: 'Dossiers actifs', value: '34', icon: IconFolder },
  { label: 'Documents', value: '1 247', icon: IconFile },
  { label: 'Photos/Vidéos', value: '3 842', icon: IconPhoto },
  { label: 'Stockage utilisé', value: '127 GB', icon: IconDatabase },
];

const MANDATS = [
  {
    ref: 'MAN-2024-045',
    client: 'SARL Martin',
    modified: '2024-12-01 14:23',
    folders: [
      { name: 'Administratif', count: 12, size: '2.4 MB' },
      { name: 'Échanges clients', count: 24, size: '8.1 MB' },
      { name: 'Contrats', count: 3, size: '1.2 MB' },
      { name: 'Preuves', count: 156, size: '1.8 GB' },
      { name: 'Recherches internes', count: 8, size: '3.2 MB' },
    ],
  },
  {
    ref: 'MAN-2024-048',
    client: 'Mme Dubois',
    modified: '2024-11-30 16:45',
    folders: [
      { name: 'Administratif', count: 6, size: '1.1 MB' },
      { name: 'Preuves', count: 42, size: '890 MB' },
      { name: 'Correspondances', count: 15, size: '3.4 MB' },
    ],
  },
  {
    ref: 'MAN-2024-051',
    client: 'Jean-Pierre Moreau',
    modified: '2024-11-28 09:12',
    folders: [
      { name: 'Administratif', count: 4, size: '560 KB' },
      { name: 'Preuves', count: 18, size: '240 MB' },
    ],
  },
];

function fileIcon(name: string) {
  if (name.endsWith('.pdf')) return { icon: IconFileTypePdf, color: '#EF4444' };
  if (name.endsWith('.jpg') || name.endsWith('.png')) return { icon: IconPhoto, color: '#3B82F6' };
  if (name.endsWith('.docx')) return { icon: IconFileTypeDocx, color: '#3B82F6' };
  return { icon: IconFileDescription, color: '#AB8E3D' };
}

const RECENT_FILES = [
  { name: 'Rapport_surveillance_01-12.pdf', size: '2.4 MB', mandat: 'MAN-2024-045' },
  { name: 'Photo_preuve_001.jpg', size: '4.2 MB', mandat: 'MAN-2024-045' },
  { name: 'Contrat_mandat_dubois.pdf', size: '890 KB', mandat: 'MAN-2024-048' },
  { name: 'Notes_entretien.docx', size: '156 KB', mandat: 'MAN-2024-051' },
];

export function DossiersPage() {
  const [search, setSearch] = useState('');

  const filtered = MANDATS.filter(m =>
    m.ref.toLowerCase().includes(search.toLowerCase()) ||
    m.client.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Box p="md">
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Dossiers</Title>
          <Text c="dimmed" size="sm">Gérez vos documents et preuves</Text>
        </div>
        <Group>
          <Button leftSection={<IconUpload size={16} />} variant="outline">Importer</Button>
          <Button leftSection={<IconDownload size={16} />} variant="outline">Exporter</Button>
        </Group>
      </Group>

      {/* Stats */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
        {STATS.map(({ label, value, icon: Icon }) => (
          <Card key={label} withBorder padding="md" radius="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="sm" c="dimmed">{label}</Text>
                <Title order={2} mt={4}>{value}</Title>
              </div>
              <ThemeIcon variant="light" size="lg" radius="md">
                <Icon size={18} />
              </ThemeIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Main content */}
      <Grid>
        {/* Dossiers par mandat */}
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder padding="md" radius="md" h="100%">
            <Group justify="space-between" mb="md">
              <div>
                <Text fw={600}>Dossiers par mandat</Text>
                <Text size="xs" c="dimmed">Organisation automatisée</Text>
              </div>
              <Input
                placeholder="Rechercher..."
                leftSection={<IconSearch size={14} />}
                size="sm"
                w={180}
                value={search}
                onChange={e => setSearch(e.currentTarget.value)}
              />
            </Group>

            <Stack gap="md">
              {filtered.map((mandat, i) => (
                <div key={mandat.ref}>
                  {i > 0 && <Divider mb="md" />}

                  {/* Mandat header */}
                  <Group justify="space-between" mb="sm">
                    <div>
                      <Text fw={700} size="md">{mandat.ref}</Text>
                      <Text size="xs" c="dimmed">{mandat.client}</Text>
                    </div>
                    <Text size="xs" c="dimmed">Modifié {mandat.modified}</Text>
                  </Group>

                  {/* Sub-folders grid */}
                  <SimpleGrid cols={2} spacing="xs">
                    {mandat.folders.map(folder => (
                      <Group
                        key={folder.name}
                        gap="sm"
                        p="xs"
                        style={{
                          borderRadius: 6,
                          cursor: 'pointer',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <ActionIcon variant="light" size="md" radius="sm" color="yellow">
                          <IconFolder size={16} />
                        </ActionIcon>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text size="sm" fw={500} truncate>{folder.name}</Text>
                          <Group gap={4}>
                            <Text size="xs" c="dimmed">{folder.count} fichiers</Text>
                            <Text size="xs" c="dimmed">·</Text>
                            <Text size="xs" c="dimmed">{folder.size}</Text>
                          </Group>
                        </div>
                      </Group>
                    ))}
                  </SimpleGrid>
                </div>
              ))}

              {filtered.length === 0 && (
                <Text c="dimmed" size="sm" ta="center" py="xl">Aucun mandat trouvé</Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Fichiers récents */}
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder padding="md" radius="md" h="100%">
            <Text fw={600} mb={4}>Fichiers récents</Text>
            <Text size="xs" c="dimmed" mb="md">Dernières modifications</Text>

            <Stack gap={0}>
              {RECENT_FILES.map((file, i) => {
                const { icon: FileIcon, color } = fileIcon(file.name);
                return (
                  <div key={file.name}>
                    {i > 0 && <Divider my="xs" />}
                    <Group gap="sm" style={{ cursor: 'pointer' }}>
                      <ThemeIcon variant="light" size="lg" radius="sm" style={{ color, flexShrink: 0 }}>
                        <FileIcon size={16} />
                      </ThemeIcon>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>{file.name}</Text>
                        <Text size="xs" c="dimmed">{file.size}</Text>
                        <Badge size="xs" variant="dot" color="gray">{file.mandat}</Badge>
                      </div>
                    </Group>
                  </div>
                );
              })}
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>
    </Box>
  );
}
