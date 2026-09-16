import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Title,
  Tabs,
  Text,
  Paper,
  Table,
  Button,
  Group,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Stack,
  Loader,
  Center,
  Grid,
} from '@mantine/core';
import { IconMail, IconHistory, IconEdit, IconCheck, IconX, IconClock } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { EmailApi, EmailTemplate, AutoEmailLog, QueueStatus } from '../../../../shared/api/email';

export function EmailSettingsPage() {
  const [activeTab, setActiveTab] = useState<string | null>('templates');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<AutoEmailLog[]>([]);
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal d'édition
  const [opened, { open, close }] = useDisclosure(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editSubject, setEditSubject] = useState('');
  const [editHtml, setEditHtml] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'templates') {
        const data = await EmailApi.getTemplates();
        setTemplates(data);
      } else if (activeTab === 'logs') {
        const [logsData, statusData] = await Promise.all([
          EmailApi.getAutoLogs({ limit: 50 }),
          EmailApi.getQueueStatus(),
        ]);
        setLogs(logsData.data);
        setQueueStatus(statusData);
      }
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de charger les données.',
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditClick = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setEditSubject(template.subject);
    setEditHtml(template.htmlBody);
    open();
  };

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return;
    try {
      await EmailApi.updateTemplate(editingTemplate.code, {
        subject: editSubject,
        htmlBody: editHtml,
      });
      notifications.show({
        title: 'Succès',
        message: 'Le modèle a été mis à jour.',
        color: 'green',
      });
      close();
      loadData();
    } catch (error) {
      notifications.show({
        title: 'Erreur',
        message: 'Impossible de sauvegarder le modèle.',
        color: 'red',
      });
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Badge color="green" leftSection={<IconCheck size={14} />}>Envoyé</Badge>;
      case 'FAILED':
        return <Badge color="red" leftSection={<IconX size={14} />}>Échoué</Badge>;
      case 'PENDING':
      case 'PROCESSING':
        return <Badge color="yellow" leftSection={<IconClock size={14} />}>En attente</Badge>;
      default:
        return <Badge color="gray">{status}</Badge>;
    }
  };

  return (
    <Container size="xl" py="xl">
      <Title order={2} mb="lg" c="gray.1">
        Communication Automatique
      </Title>

      <Tabs value={activeTab} onChange={setActiveTab} variant="outline">
        <Tabs.List mb="md">
          <Tabs.Tab value="templates" leftSection={<IconMail size={16} />}>
            Modèles d'e-mails
          </Tabs.Tab>
          <Tabs.Tab value="logs" leftSection={<IconHistory size={16} />}>
            File d'attente & Historique
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="templates">
          <Paper withBorder p="md" bg="dark.7" radius="md">
            <Text c="dimmed" mb="md" size="sm">
              Gérez ici le contenu des e-mails envoyés automatiquement par la plateforme.
              Vous pouvez utiliser les variables indiquées pour personnaliser chaque message.
            </Text>

            {loading ? (
              <Center py="xl"><Loader color="yellow" /></Center>
            ) : (
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Déclencheur</Table.Th>
                    <Table.Th>Sujet</Table.Th>
                    <Table.Th>Variables disponibles</Table.Th>
                    <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {templates.map((tpl) => (
                    <Table.Tr key={tpl.id}>
                      <Table.Td>
                        <Text fw={500} size="sm">{tpl.name}</Text>
                        <Text size="xs" c="dimmed">{tpl.code}</Text>
                      </Table.Td>
                      <Table.Td>{tpl.subject}</Table.Td>
                      <Table.Td>
                        <Group gap={4}>
                          {Object.keys(tpl.variables || {}).map((v) => (
                            <Badge key={v} size="sm" variant="light" color="gray">
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon variant="light" color="yellow" onClick={() => handleEditClick(tpl)}>
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                  {templates.length === 0 && (
                    <Table.Tr>
                      <Table.Td colSpan={4}>
                        <Text c="dimmed" ta="center">Aucun modèle trouvé.</Text>
                      </Table.Td>
                    </Table.Tr>
                  )}
                </Table.Tbody>
              </Table>
            )}
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="logs">
          <Stack gap="lg">
            {queueStatus && (
              <Grid>
                <Grid.Col span={3}>
                  <Paper withBorder p="md" bg="dark.7" radius="md" ta="center">
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>En file d'attente</Text>
                    <Text size="xl" fw={700} c="yellow">{queueStatus.pending}</Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={3}>
                  <Paper withBorder p="md" bg="dark.7" radius="md" ta="center">
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>En traitement</Text>
                    <Text size="xl" fw={700} c="blue">{queueStatus.processing}</Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={3}>
                  <Paper withBorder p="md" bg="dark.7" radius="md" ta="center">
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Envoyés (Succès)</Text>
                    <Text size="xl" fw={700} c="green">{queueStatus.sent}</Text>
                  </Paper>
                </Grid.Col>
                <Grid.Col span={3}>
                  <Paper withBorder p="md" bg="dark.7" radius="md" ta="center">
                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Échecs</Text>
                    <Text size="xl" fw={700} c="red">{queueStatus.failed}</Text>
                  </Paper>
                </Grid.Col>
              </Grid>
            )}

            <Paper withBorder p="md" bg="dark.7" radius="md">
              <Title order={4} mb="md">Historique d'envoi</Title>
              {loading ? (
                <Center py="xl"><Loader color="yellow" /></Center>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Date</Table.Th>
                      <Table.Th>Modèle</Table.Th>
                      <Table.Th>Destinataire</Table.Th>
                      <Table.Th>Statut</Table.Th>
                      <Table.Th>Détails</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {logs.map((log) => (
                      <Table.Tr key={log.id}>
                        <Table.Td>
                          {new Date(log.createdAt).toLocaleString('fr-CH')}
                        </Table.Td>
                        <Table.Td>{log.template?.name || 'Inconnu'}</Table.Td>
                        <Table.Td>{log.recipientEmail}</Table.Td>
                        <Table.Td>{renderStatusBadge(log.status)}</Table.Td>
                        <Table.Td>
                          {log.errorReason && (
                            <Text size="xs" c="red">{log.errorReason}</Text>
                          )}
                        </Table.Td>
                      </Table.Tr>
                    ))}
                    {logs.length === 0 && (
                      <Table.Tr>
                        <Table.Td colSpan={5}>
                          <Text c="dimmed" ta="center">Aucun historique d'envoi.</Text>
                        </Table.Td>
                      </Table.Tr>
                    )}
                  </Table.Tbody>
                </Table>
              )}
            </Paper>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Modal d'édition */}
      <Modal opened={opened} onClose={close} title="Éditer le modèle d'e-mail" size="xl">
        {editingTemplate && (
          <Stack gap="md">
            <Box>
              <Text size="sm" fw={500} mb={4}>Variables disponibles :</Text>
              <Group gap={4}>
                {Object.entries(editingTemplate.variables || {}).map(([key, desc]) => (
                  <Badge key={key} size="sm" variant="light" color="gray" title={desc as string}>
                    {`{{${key}}}`}
                  </Badge>
                ))}
              </Group>
            </Box>

            <TextInput
              label="Sujet de l'e-mail"
              value={editSubject}
              onChange={(e) => setEditSubject(e.currentTarget.value)}
              required
            />

            <Textarea
              label="Corps de l'e-mail (HTML)"
              value={editHtml}
              onChange={(e) => setEditHtml(e.currentTarget.value)}
              minRows={10}
              autosize
              maxRows={20}
              required
              styles={{ input: { fontFamily: 'monospace', fontSize: 13 } }}
            />

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={close}>Annuler</Button>
              <Button color="yellow" onClick={handleSaveTemplate}>Enregistrer</Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Container>
  );
}
