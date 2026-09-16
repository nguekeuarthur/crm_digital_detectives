import { useState, useEffect } from 'react';
import { Modal, Select, Button, Group } from '@mantine/core';
import { MandatApi } from '../../../shared/api/mandat';
import { api } from '../../../shared/api/base';

interface Props {
  opened: boolean;
  onClose: () => void;
  mandatId: string | null;
  onSuccess: () => void;
}

interface User {
  id: string;
  firstName: string;
  lastName: string;
}

export function AssignEnqueteurModal({ opened, onClose, mandatId, onSuccess }: Props) {
  const [enqueteurId, setEnqueteurId] = useState<string | null>(null);
  const [enqueteurs, setEnqueteurs] = useState<{ value: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opened) {
      // Fetch enqueteurs
      api.get('/auth/users?role=ENQUETEUR').then(res => {
        setEnqueteurs((res.data as User[]).map(u => ({
          value: u.id,
          label: `${u.firstName} ${u.lastName}`
        })));
      }).catch(console.error);
    }
  }, [opened]);

  const handleSubmit = async () => {
    if (!mandatId || !enqueteurId) return;
    setLoading(true);
    try {
      await MandatApi.assign(mandatId, enqueteurId);
      onSuccess();
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Assigner un enquêteur" size="sm">
      <Select
        label="Sélectionnez l'enquêteur"
        placeholder="Choisir..."
        data={enqueteurs}
        value={enqueteurId}
        onChange={setEnqueteurId}
        searchable
        required
      />
      <Group justify="flex-end" mt="md">
        <Button variant="default" onClick={onClose}>Annuler</Button>
        <Button loading={loading} onClick={handleSubmit} color="brand" disabled={!enqueteurId}>
          Assigner
        </Button>
      </Group>
    </Modal>
  );
}
