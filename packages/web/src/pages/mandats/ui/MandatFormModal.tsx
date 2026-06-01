import { useState, useEffect } from 'react';
import { Modal, Stack, TextInput, Textarea, Select, Button, Group } from '@mantine/core';
import { MandatApi } from '../../../shared/api/mandat';
import { ClientApi } from '../../../shared/api/client';

interface Props {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MandatFormModal({ opened, onClose, onSuccess }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [clientOptions, setClientOptions] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!opened) return;
    ClientApi.list({ limit: 100 }).then(data => {
      setClientOptions(
        (data ?? []).map(c => ({
          value: c.id,
          label: `${c.firstName} ${c.lastName}${c.company ? ` — ${c.company}` : ''}`,
        }))
      );
    }).catch(console.error);
  }, [opened]);

  const handleClose = () => {
    setTitle(''); setDescription(''); setClientId(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!title.trim() || !clientId) return;
    setLoading(true);
    try {
      await MandatApi.create({ title: title.trim(), description: description.trim() || undefined, clientId });
      handleClose();
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={handleClose} title="Nouveau mandat" size="md">
      <Stack>
        <TextInput
          label="Titre du mandat"
          placeholder="Ex : Surveillance domicile — M. Dupont"
          required
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <Select
          label="Client"
          placeholder="Sélectionner un client..."
          required
          searchable
          data={clientOptions}
          value={clientId}
          onChange={setClientId}
        />
        <Textarea
          label="Description (optionnel)"
          placeholder="Contexte, objectifs..."
          value={description}
          onChange={e => setDescription(e.target.value)}
          minRows={3}
        />
        <Group justify="flex-end" mt="sm">
          <Button variant="default" onClick={handleClose}>Annuler</Button>
          <Button
            color="brand"
            loading={loading}
            disabled={!title.trim() || !clientId}
            onClick={handleSubmit}
          >
            Créer le mandat
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
