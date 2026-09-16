import { Modal, Stack, Text, Group, Button, Badge, Card, List } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import { DuplicateResult } from '../../../shared/api/client';

interface Props {
  opened: boolean;
  duplicates: DuplicateResult[];
  onContinue: () => void;
  onClose: () => void;
}

function scoreColor(score: number) {
  if (score >= 80) return 'red';
  if (score >= 60) return 'orange';
  return 'yellow';
}

export function DuplicateWarningModal({ opened, duplicates, onContinue, onClose }: Props) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconAlertTriangle size={20} color="orange" />
          <Text fw={600}>Doublons potentiels détectés</Text>
        </Group>
      }
      size="lg"
    >
      <Stack>
        <Text size="sm" c="dimmed">
          {duplicates.length} client{duplicates.length > 1 ? 's' : ''} similaire{duplicates.length > 1 ? 's' : ''} trouvé{duplicates.length > 1 ? 's' : ''} dans le CRM.
          Vérifiez qu&apos;il ne s&apos;agit pas du même contact avant de continuer.
        </Text>

        {duplicates.map(({ client, score, reasons }) => (
          <Card key={client.id} withBorder padding="sm" radius="sm">
            <Group justify="space-between" mb={4}>
              <Text fw={500}>{client.firstName} {client.lastName}</Text>
              <Badge color={scoreColor(score)} variant="filled">
                {score}% de similarité
              </Badge>
            </Group>
            <Text size="sm">{client.email}</Text>
            {client.phone && <Text size="xs" c="dimmed">{client.phone}</Text>}
            {client.company && <Text size="xs" c="dimmed">{client.company}</Text>}
            <List size="xs" mt="xs" spacing={2} withPadding>
              {reasons.map(r => <List.Item key={r}>{r}</List.Item>)}
            </List>
          </Card>
        ))}

        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={onClose}>Annuler</Button>
          <Button color="orange" onClick={onContinue}>Continuer quand même</Button>
        </Group>
      </Stack>
    </Modal>
  );
}
