import { useState } from 'react';
import { Modal, Stack, TextInput, Select, Button, Group } from '@mantine/core';
import { ClientApi, DuplicateResult } from '../../../shared/api/client';
import { DuplicateWarningModal } from './DuplicateWarningModal';

interface Props {
  opened: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const emptyForm = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  company: '',
  status: 'PROSPECT' as 'PROSPECT' | 'ACTIF' | 'INACTIF',
};

export function ClientFormModal({ opened, onClose, onSuccess }: Props) {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateResult[]>([]);
  const [showDuplicates, setShowDuplicates] = useState(false);

  const setField = (field: keyof typeof emptyForm) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setForm(prev => ({ ...prev, [field]: value }));
    };

  const handleClose = () => {
    setForm(emptyForm);
    setDuplicates([]);
    setShowDuplicates(false);
    onClose();
  };

  const doCreate = async () => {
    setLoading(true);
    try {
      await ClientApi.create({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        company: form.company || undefined,
        status: form.status,
      });
      handleClose();
      onSuccess();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { duplicates: found } = await ClientApi.checkDuplicate({
        email: form.email,
        phone: form.phone || undefined,
        firstName: form.firstName,
        lastName: form.lastName,
        company: form.company || undefined,
      });
      if (found.length > 0) {
        setDuplicates(found);
        setShowDuplicates(true);
      } else {
        await doCreate();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleContinueAnyway = async () => {
    setShowDuplicates(false);
    await doCreate();
  };

  const isValid = form.firstName.trim().length >= 2
    && form.lastName.trim().length >= 2
    && form.email.includes('@');

  return (
    <>
      <Modal
        opened={opened && !showDuplicates}
        onClose={handleClose}
        title="Nouveau client"
        size="md"
      >
        <Stack>
          <Group grow>
            <TextInput
              label="Prénom"
              required
              value={form.firstName}
              onChange={setField('firstName')}
            />
            <TextInput
              label="Nom"
              required
              value={form.lastName}
              onChange={setField('lastName')}
            />
          </Group>
          <TextInput
            label="Email"
            required
            type="email"
            value={form.email}
            onChange={setField('email')}
          />
          <TextInput
            label="Téléphone"
            value={form.phone}
            onChange={setField('phone')}
          />
          <TextInput
            label="Société"
            value={form.company}
            onChange={setField('company')}
          />
          <Select
            label="Statut"
            value={form.status}
            onChange={v => setForm(prev => ({ ...prev, status: (v ?? 'PROSPECT') as typeof prev.status }))}
            data={[
              { value: 'PROSPECT', label: 'Prospect' },
              { value: 'ACTIF', label: 'Actif' },
              { value: 'INACTIF', label: 'Inactif' },
            ]}
          />
          <Group justify="flex-end" mt="sm">
            <Button variant="default" onClick={handleClose}>Annuler</Button>
            <Button
              color="brand"
              loading={loading}
              disabled={!isValid}
              onClick={handleSubmit}
            >
              Créer le client
            </Button>
          </Group>
        </Stack>
      </Modal>

      <DuplicateWarningModal
        opened={showDuplicates}
        duplicates={duplicates}
        onClose={() => setShowDuplicates(false)}
        onContinue={handleContinueAnyway}
      />
    </>
  );
}
