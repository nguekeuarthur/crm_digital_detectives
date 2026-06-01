import { useState } from 'react';
import {
  Box, Title, Text, Group, Button, SimpleGrid, Card, Tabs,
  Input, Badge, ActionIcon, Stack, Divider,
} from '@mantine/core';
import {
  IconPhone, IconMail, IconBrandWhatsapp, IconPhoneCall,
  IconFilter, IconSearch, IconPlayerPlay, IconPhoneOff,
} from '@tabler/icons-react';

const STAT_CARDS = [
  { label: 'Appels aujourd\'hui', value: 24, icon: IconPhone, color: '#AB8E3D' },
  { label: 'Emails en attente', value: 8, icon: IconMail, color: '#3B82F6' },
  { label: 'Messages WhatsApp', value: 12, icon: IconBrandWhatsapp, color: '#22C55E' },
  { label: 'À rappeler', value: 5, icon: IconPhoneCall, color: '#EF4444' },
];

const CALLS = [
  { id: 1, name: 'SARL Martin', phone: '+33 1 45 67 89 01', duration: '12:34', date: '2024-12-01 14:23', hasRecording: true, missed: false },
  { id: 2, name: 'Mme Dubois', phone: '+33 1 45 67 89 02', duration: '08:12', date: '2024-12-01 11:15', hasRecording: true, missed: false },
  { id: 3, name: 'M. Lefebvre', phone: '+33 1 45 67 89 03', duration: '—', date: '2024-12-01 09:45', hasRecording: false, missed: true },
  { id: 4, name: 'SAS TechCorp', phone: '+33 1 45 67 89 04', duration: '23:45', date: '2024-11-30 16:30', hasRecording: true, missed: false },
  { id: 5, name: 'Jean Moreau', phone: '+33 1 45 67 89 05', duration: '—', date: '2024-11-30 14:12', hasRecording: false, missed: true },
];

const EMAILS = [
  { id: 1, from: 'client@sarl-martin.fr', subject: 'Demande de devis — surveillance', date: '2024-12-01 09:30', read: false },
  { id: 2, from: 'j.dupont@example.com', subject: 'RE: Rapport d\'investigation', date: '2024-11-30 17:45', read: false },
  { id: 3, from: 'contact@techcorp.ch', subject: 'Confirmation de mandat', date: '2024-11-30 14:00', read: true },
];

const WHATSAPP = [
  { id: 1, name: 'SARL Martin', message: 'Bonjour, avez-vous reçu mon email ?', date: '2024-12-01 15:10', unread: 2 },
  { id: 2, name: 'Mme Dubois', message: 'Merci pour le rapport, tout est en ordre.', date: '2024-12-01 10:30', unread: 0 },
  { id: 3, name: 'M. Lefebvre', message: 'Quand pouvez-vous me rappeler ?', date: '2024-11-30 18:20', unread: 1 },
];

export function CommunicationsPage() {
  const [search, setSearch] = useState('');

  const filteredCalls = CALLS.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  return (
    <Box p="md">
      {/* Header */}
      <Group justify="space-between" mb="lg">
        <div>
          <Title order={2}>Communications</Title>
          <Text c="dimmed" size="sm">Gérez vos appels, emails et messages</Text>
        </div>
        <Button leftSection={<IconFilter size={16} />} variant="outline" color="gray">
          Filtrer
        </Button>
      </Group>

      {/* Stat cards */}
      <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
        {STAT_CARDS.map(({ label, value, icon: Icon, color }) => (
          <Card key={label} withBorder padding="md" radius="md">
            <Group justify="space-between" align="flex-start">
              <div>
                <Text size="sm" c="dimmed">{label}</Text>
                <Title order={2} mt={4}>{value}</Title>
              </div>
              <ActionIcon variant="light" size="lg" radius="md" style={{ color }}>
                <Icon size={20} />
              </ActionIcon>
            </Group>
          </Card>
        ))}
      </SimpleGrid>

      {/* Tabs */}
      <Tabs defaultValue="calls">
        <Tabs.List mb="md">
          <Tabs.Tab value="calls" leftSection={<IconPhone size={14} />}>Appels</Tabs.Tab>
          <Tabs.Tab value="emails" leftSection={<IconMail size={14} />}>Emails</Tabs.Tab>
          <Tabs.Tab value="whatsapp" leftSection={<IconBrandWhatsapp size={14} />}>WhatsApp</Tabs.Tab>
        </Tabs.List>

        {/* Appels */}
        <Tabs.Panel value="calls">
          <Card withBorder padding="md" radius="md">
            <Group justify="space-between" mb="md">
              <div>
                <Text fw={600}>Historique des appels</Text>
                <Text size="xs" c="dimmed">Tous vos appels avec enregistrements</Text>
              </div>
              <Input
                placeholder="Rechercher..."
                leftSection={<IconSearch size={14} />}
                size="sm"
                w={200}
                value={search}
                onChange={e => setSearch(e.currentTarget.value)}
              />
            </Group>

            <Stack gap={0}>
              {filteredCalls.map((call, i) => (
                <div key={call.id}>
                  {i > 0 && <Divider />}
                  <Group justify="space-between" py="sm" px={4}>
                    <Group gap="sm">
                      <ActionIcon
                        variant="light"
                        color={call.missed ? 'red' : 'green'}
                        radius="xl"
                        size="lg"
                      >
                        {call.missed ? <IconPhoneOff size={16} /> : <IconPhone size={16} />}
                      </ActionIcon>
                      <div>
                        <Text size="sm" fw={500}>{call.name}</Text>
                        <Text size="xs" c="dimmed">{call.phone}</Text>
                      </div>
                    </Group>
                    <Group gap="xl">
                      <Text size="sm" fw={500}>{call.duration}</Text>
                      <Text size="xs" c="dimmed">{call.date}</Text>
                      {call.hasRecording ? (
                        <Button
                          size="xs"
                          variant="light"
                          leftSection={<IconPlayerPlay size={12} />}
                        >
                          Écouter
                        </Button>
                      ) : (
                        <Badge color="red" variant="light" size="sm">Manqué</Badge>
                      )}
                    </Group>
                  </Group>
                </div>
              ))}
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* Emails */}
        <Tabs.Panel value="emails">
          <Card withBorder padding="md" radius="md">
            <Text fw={600} mb="md">Emails en attente</Text>
            <Stack gap={0}>
              {EMAILS.map((email, i) => (
                <div key={email.id}>
                  {i > 0 && <Divider />}
                  <Group justify="space-between" py="sm" px={4}>
                    <Group gap="sm">
                      <ActionIcon variant="light" color="blue" radius="xl" size="lg">
                        <IconMail size={16} />
                      </ActionIcon>
                      <div>
                        <Group gap="xs">
                          <Text size="sm" fw={email.read ? 400 : 600}>{email.subject}</Text>
                          {!email.read && <Badge size="xs" color="blue">Nouveau</Badge>}
                        </Group>
                        <Text size="xs" c="dimmed">{email.from}</Text>
                      </div>
                    </Group>
                    <Text size="xs" c="dimmed">{email.date}</Text>
                  </Group>
                </div>
              ))}
            </Stack>
          </Card>
        </Tabs.Panel>

        {/* WhatsApp */}
        <Tabs.Panel value="whatsapp">
          <Card withBorder padding="md" radius="md">
            <Text fw={600} mb="md">Messages WhatsApp</Text>
            <Stack gap={0}>
              {WHATSAPP.map((msg, i) => (
                <div key={msg.id}>
                  {i > 0 && <Divider />}
                  <Group justify="space-between" py="sm" px={4}>
                    <Group gap="sm">
                      <ActionIcon variant="light" color="green" radius="xl" size="lg">
                        <IconBrandWhatsapp size={16} />
                      </ActionIcon>
                      <div>
                        <Text size="sm" fw={500}>{msg.name}</Text>
                        <Text size="xs" c="dimmed" lineClamp={1}>{msg.message}</Text>
                      </div>
                    </Group>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">{msg.date}</Text>
                      {msg.unread > 0 && (
                        <Badge size="sm" color="green" variant="filled" circle>
                          {msg.unread}
                        </Badge>
                      )}
                    </Group>
                  </Group>
                </div>
              ))}
            </Stack>
          </Card>
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
