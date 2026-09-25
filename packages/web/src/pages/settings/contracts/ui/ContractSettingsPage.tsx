import React, { useEffect, useState } from 'react';
import {
  Container,
  Title,
  Paper,
  Table,
  Button,
  Group,
  ActionIcon,
  Modal,
  TextInput,
  Stack,
  Loader,
  Center,
  Text,
  Badge,
  Tabs,
  Tooltip
} from '@mantine/core';
import { IconEdit, IconPlus, IconFileDescription, IconPrinter } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { RichTextEditor, Link } from '@mantine/tiptap';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import '@mantine/tiptap/styles.css';
import { ContractApi, ContractTemplate } from '../../../../shared/api/contract';
import { getAccessToken } from '../../../../shared/api/token';
import {
  VariableChip,
  VARIABLE_LABELS,
  chipsToMustache,
  mustacheToChips,
} from '../extensions/VariableChip';

/**
 * Liste des variables disponibles.
 * L'utilisateur ne voit que le "label" en français.
 */
const AVAILABLE_VARIABLES = Object.entries(VARIABLE_LABELS).map(([key, label]) => ({
  key,
  label,
}));

// Données fictives pour l'aperçu
const PREVIEW_DATA: Record<string, string> = {
  'client.firstName': 'Jean',
  'client.lastName': 'Dupont',
  'client.email': 'jean.dupont@email.com',
  'client.phone': '+33 6 12 34 56 78',
  'client.company': 'Dupont & Co',
  'client.address': '123 Rue de la Paix, 75000 Paris',
  'mandat.title': 'Enquête de solvabilité',
  'mandat.reference': 'MND-2024-001',
  'mandat.date': new Date().toLocaleDateString('fr-CH'),
};

export function ContractSettingsPage() {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal d'édition/création
  const [opened, { open, close }] = useDisclosure(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [activeTab, setActiveTab] = useState<string | null>('editor');

  // ─── Éditeur TipTap avec l'extension VariableChip ───────────────
  const editor = useEditor({
    extensions: [StarterKit, Link, VariableChip],
    content: '',
    onUpdate: () => {
      // Rien à faire ici, on lit le contenu au moment du save
    },
  });

  // ─── Fonctions utilitaires ──────────────────────────────────────

  /** Charge le contenu dans l'éditeur ({{var}} → chips visuels) */
  const setEditorContent = (html: string) => {
    if (editor) {
      editor.commands.setContent(mustacheToChips(html));
    }
  };

  /** Lit le contenu de l'éditeur (chips visuels → {{var}}) */
  const getEditorContent = (): string => {
    if (!editor) return '';
    return chipsToMustache(editor.getHTML());
  };

  /** Génère l'aperçu avec les variables remplacées par des données fictives */
  const generatePreview = (): string => {
    const rawHtml = getEditorContent();
    let previewHtml = rawHtml;
    Object.entries(PREVIEW_DATA).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{\\s*${key.replace('.', '\\.')}\\s*\\}\\}`, 'g');
      previewHtml = previewHtml.replace(
        regex,
        `<span style="background-color:#ffec99;padding:2px 6px;border-radius:4px;font-weight:600;">${value}</span>`
      );
    });
    return previewHtml;
  };

  // ─── Chargement des données ─────────────────────────────────────

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await ContractApi.getTemplates();
      setTemplates(data);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
      notifications.show({
        title: 'Erreur',
        message:
          'Impossible de charger les modèles de contrats. ' +
          (error.response?.data?.error?.message || error.message),
        color: 'red',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── Handlers ───────────────────────────────────────────────────

  const handleCreateNew = () => {
    setEditingId(null);
    setName('');
    setActiveTab('editor');
    const defaultHtml =
      '<h1>Contrat</h1>' +
      '<p>Entre {{client.firstName}} {{client.lastName}} et Digital Detectives.</p>' +
      '<p>Concerne le mandat : {{mandat.title}}</p>';
    setEditorContent(defaultHtml);
    open();
  };

  const handleEditClick = (template: ContractTemplate) => {
    setEditingId(template.id);
    setName(template.name);
    setActiveTab('editor');
    setEditorContent(template.htmlContent);
    open();
  };

  const handleSave = async () => {
    const htmlContent = getEditorContent();
    if (!name.trim() || !htmlContent.trim()) {
      notifications.show({ message: 'Le nom et le contenu sont requis.', color: 'red' });
      return;
    }

    try {
      if (editingId) {
        await ContractApi.updateTemplate(editingId, {
          name,
          htmlContent,
          variables: AVAILABLE_VARIABLES.map((v) => v.key),
        });
        notifications.show({
          title: 'Succès',
          message: 'Nouvelle version du modèle enregistrée.',
          color: 'green',
        });
      } else {
        await ContractApi.createTemplate({
          name,
          htmlContent,
          variables: AVAILABLE_VARIABLES.map((v) => v.key),
        });
        notifications.show({
          title: 'Succès',
          message: 'Modèle créé avec succès.',
          color: 'green',
        });
      }
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

  /** Insère un chip variable à la position du curseur dans l'éditeur */
  const insertVariable = (key: string) => {
    if (!editor) return;
    const label = VARIABLE_LABELS[key] || key;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'variableChip',
        attrs: { variable: key, label },
      })
      .run();
  };

  const handleTestPdf = async (templateId: string) => {
    try {
      notifications.show({
        title: 'Génération en cours',
        message: 'Génération du PDF de test…',
        color: 'blue',
      });
      const result = await ContractApi.generateContract({ templateId, mandatId: 'test-mandat-id-temporaire' });
      
      const token = getAccessToken();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      const fileUrl = `${apiUrl}/files/stream/${result.file.id}?token=${token}`;
      
      // Ouvrir le PDF généré dans un nouvel onglet
      window.open(fileUrl, '_blank');

      notifications.show({
        title: 'Succès',
        message: 'Contrat généré avec succès et ouvert dans un nouvel onglet !',
        color: 'green',
      });
    } catch (error: any) {
      notifications.show({
        title: 'Erreur',
        message:
          'Impossible de générer le PDF de test. ' +
          (error.response?.data?.error?.message || error.message),
        color: 'red',
      });
    }
  };

  // ─── Rendu ──────────────────────────────────────────────────────

  return (
    <Container size="xl" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={2} c="gray.1">
          Modèles de Contrats (PDF)
        </Title>
        <Button leftSection={<IconPlus size={16} />} color="yellow" onClick={handleCreateNew}>
          Nouveau modèle
        </Button>
      </Group>

      <Paper withBorder p="md" bg="dark.7" radius="md">
        <Text c="dimmed" mb="md" size="sm">
          Ces modèles servent de base pour générer automatiquement les contrats au format PDF pour
          chaque mandat. Lors de la modification, une nouvelle version est créée pour conserver
          l'historique des contrats déjà signés.
        </Text>

        {loading ? (
          <Center py="xl">
            <Loader color="yellow" />
          </Center>
        ) : (
          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Nom du modèle</Table.Th>
                <Table.Th>Version active</Table.Th>
                <Table.Th>Créé le</Table.Th>
                <Table.Th style={{ width: 120 }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {templates.map((tpl) => (
                <Table.Tr key={tpl.id}>
                  <Table.Td>
                    <Group gap="sm">
                      <IconFileDescription size={18} color="gray" />
                      <Text fw={500} size="sm">
                        {tpl.name}
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="blue" variant="light">
                      v{tpl.version}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{new Date(tpl.createdAt).toLocaleDateString('fr-CH')}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Tooltip label="Modifier ce modèle">
                        <ActionIcon
                          variant="light"
                          color="yellow"
                          onClick={() => handleEditClick(tpl)}
                        >
                          <IconEdit size={16} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Tester (générer un PDF)">
                        <ActionIcon
                          variant="light"
                          color="blue"
                          onClick={() => handleTestPdf(tpl.id)}
                        >
                          <IconPrinter size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
              {templates.length === 0 && (
                <Table.Tr>
                  <Table.Td colSpan={4}>
                    <Text c="dimmed" ta="center">
                      Aucun modèle de contrat. Cliquez sur « Nouveau modèle » pour commencer.
                    </Text>
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        )}
      </Paper>

      {/* ─── Modal de création / édition ──────────────────────────── */}
      <Modal
        opened={opened}
        onClose={close}
        title={
          editingId ? 'Modifier le modèle (Créera une nouvelle version)' : 'Nouveau modèle de contrat'
        }
        size="xl"
      >
        <Stack gap="md">
          <TextInput
            label="Nom du modèle"
            placeholder="Ex : Contrat de prestation de services standard"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            required
          />

          {/* Boutons de variables en français */}
          <div>
            <Text size="sm" fw={500} mb={5}>
              Informations à insérer (cliquez pour ajouter au texte) :
            </Text>
            <Group gap={5}>
              {AVAILABLE_VARIABLES.map((v) => (
                <Badge
                  key={v.key}
                  size="md"
                  variant="light"
                  color="yellow"
                  style={{ cursor: 'pointer', textTransform: 'none' }}
                  onClick={() => insertVariable(v.key)}
                >
                  {v.label}
                </Badge>
              ))}
            </Group>
            <Text size="xs" c="dimmed" mt={4}>
              Ces boutons insèrent automatiquement les données du client ou du mandat dans votre
              contrat. Cliquez là où vous voulez placer l'information, puis cliquez sur le bouton.
            </Text>
          </div>

          {/* Onglets Éditeur / Aperçu */}
          <Tabs value={activeTab} onChange={setActiveTab}>
            <Tabs.List mb="sm">
              <Tabs.Tab value="editor" leftSection={<IconEdit size={16} />}>
                Éditeur
              </Tabs.Tab>
              <Tabs.Tab value="preview" leftSection={<IconFileDescription size={16} />}>
                Aperçu du PDF
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="editor">
              <RichTextEditor editor={editor}>
                <RichTextEditor.Toolbar sticky stickyOffset={60}>
                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Bold />
                    <RichTextEditor.Italic />
                    <RichTextEditor.Strikethrough />
                    <RichTextEditor.ClearFormatting />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.H1 />
                    <RichTextEditor.H2 />
                    <RichTextEditor.H3 />
                    <RichTextEditor.H4 />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Blockquote />
                    <RichTextEditor.Hr />
                    <RichTextEditor.BulletList />
                    <RichTextEditor.OrderedList />
                  </RichTextEditor.ControlsGroup>

                  <RichTextEditor.ControlsGroup>
                    <RichTextEditor.Link />
                    <RichTextEditor.Unlink />
                  </RichTextEditor.ControlsGroup>
                </RichTextEditor.Toolbar>

                <RichTextEditor.Content style={{ minHeight: 300 }} />
              </RichTextEditor>
            </Tabs.Panel>

            <Tabs.Panel value="preview">
              <Paper withBorder p="xl" bg="white" c="black" style={{ minHeight: 350 }}>
                <div dangerouslySetInnerHTML={{ __html: generatePreview() }} />
              </Paper>
            </Tabs.Panel>
          </Tabs>

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={close}>
              Annuler
            </Button>
            <Button color="yellow" onClick={handleSave}>
              Enregistrer
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
