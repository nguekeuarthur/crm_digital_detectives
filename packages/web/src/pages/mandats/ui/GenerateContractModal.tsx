import { useEffect, useState } from 'react';
import { Modal, Stack, Select, Button, Group, Text, Alert, Card, Loader, Center } from '@mantine/core';
import { IconFileText, IconAlertCircle, IconSignature } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import { ContractApi, ContractTemplate } from '../../../shared/api/contract';

interface Props {
  opened: boolean;
  onClose: () => void;
  mandat: { id: string; title: string; clientName?: string } | null;
}

/**
 * Génère un contrat pour un mandat depuis un modèle.
 *
 * C'était la pièce manquante du circuit de signature : la génération n'était
 * accessible que depuis l'écran des modèles, qui visait toujours le premier
 * mandat de la base. On choisit désormais le mandat par la fiche elle-même.
 */
export function GenerateContractModal({ opened, onClose, mandat }: Props) {
  const navigate = useNavigate();
  const [modeles, setModeles] = useState<ContractTemplate[]>([]);
  const [modeleId, setModeleId] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [generation, setGeneration] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!opened) return;
    setErreur(null);
    setModeleId(null);
    setChargement(true);
    ContractApi.getTemplates()
      .then((data) => setModeles(data))
      .catch((e) => {
        const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
        setErreur(err?.response?.data?.error?.message || err?.message || 'Modèles indisponibles');
      })
      .finally(() => setChargement(false));
  }, [opened]);

  const generer = async () => {
    if (!mandat || !modeleId) return;
    setGeneration(true);
    try {
      await ContractApi.generateContract({ templateId: modeleId, mandatId: mandat.id });
      notifications.show({
        color: 'green',
        title: 'Contrat généré',
        message: 'Il est rangé dans « Contrats et Administratif » et prêt à être envoyé à la signature.',
      });
      onClose();
      navigate('/signatures');
    } catch (e) {
      const err = e as { response?: { data?: { error?: { message?: string } } }; message?: string };
      notifications.show({
        color: 'red',
        title: 'Génération impossible',
        message: err?.response?.data?.error?.message || err?.message || 'Échec de la génération',
      });
    } finally {
      setGeneration(false);
    }
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Générer un contrat" size="lg">
      <Stack gap="md">
        {mandat && (
          <Card withBorder radius="md" p="sm">
            <Text size="sm" fw={600}>{mandat.title}</Text>
            {mandat.clientName && <Text size="xs" c="dimmed">{mandat.clientName}</Text>}
          </Card>
        )}

        {erreur && (
          <Alert icon={<IconAlertCircle size={18} />} color="red" title="Erreur">
            {erreur}
          </Alert>
        )}

        {chargement ? (
          <Center py="lg"><Loader size="sm" /></Center>
        ) : modeles.length === 0 ? (
          <Alert icon={<IconFileText size={18} />} color="orange" title="Aucun modèle">
            Créez d’abord un modèle de contrat dans <strong>Paramètres → Modèles de Mandats</strong>.
          </Alert>
        ) : (
          <Select
            label="Modèle de contrat"
            description="Les variables du modèle sont remplacées par les données du client et du mandat."
            placeholder="Choisir un modèle"
            value={modeleId}
            onChange={setModeleId}
            data={modeles.map((m) => ({ value: m.id, label: `${m.name} (v${m.version})` }))}
          />
        )}

        <Group justify="flex-end">
          <Button variant="default" onClick={onClose}>Annuler</Button>
          <Button
            leftSection={<IconSignature size={16} />}
            disabled={!modeleId || modeles.length === 0}
            loading={generation}
            onClick={generer}
          >
            Générer le contrat
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
