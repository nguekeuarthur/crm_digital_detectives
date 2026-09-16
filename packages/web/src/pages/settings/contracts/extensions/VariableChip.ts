import { Node, mergeAttributes } from '@tiptap/core';

/**
 * Mapping clé technique → libellé humain lisible.
 * C'est ce que l'utilisateur voit dans l'éditeur.
 */
export const VARIABLE_LABELS: Record<string, string> = {
  'client.firstName': 'Prénom du client',
  'client.lastName': 'Nom du client',
  'client.email': 'Email du client',
  'client.phone': 'Téléphone du client',
  'client.company': 'Entreprise du client',
  'client.address': 'Adresse du client',
  'mandat.title': 'Titre du mandat',
  'mandat.reference': 'Référence du mandat',
  'mandat.date': 'Date du mandat',
};

/**
 * Extension TipTap qui affiche les variables de template sous forme
 * de petits badges colorés et non-éditables dans l'éditeur.
 *
 * En interne, le HTML généré est :
 *   <span data-variable="client.firstName" data-label="Prénom du client"></span>
 *
 * Quand on exporte le HTML pour le backend, on convertit ces spans
 * en {{client.firstName}} via la fonction `chipsToMustache`.
 */
export const VariableChip = Node.create({
  name: 'variableChip',
  group: 'inline',
  inline: true,
  atom: true, // non-éditable, agit comme un bloc atomique

  addAttributes() {
    return {
      variable: {
        default: null,
        parseHTML: element => element.getAttribute('data-variable'),
        renderHTML: attributes => {
          return {
            'data-variable': attributes.variable,
          };
        },
      },
      label: {
        default: null,
        parseHTML: element => element.getAttribute('data-label'),
        renderHTML: attributes => {
          return {
            'data-label': attributes.label,
          };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-variable]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const label =
      HTMLAttributes['data-label'] ||
      HTMLAttributes.label ||
      HTMLAttributes['data-variable'] ||
      HTMLAttributes.variable ||
      '';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        style:
          'display: inline-block; background-color: #fff3bf; color: #e67700; ' +
          'border: 1px solid #ffd43b; border-radius: 12px; padding: 1px 10px; ' +
          'font-size: 13px; font-weight: 600; cursor: default; user-select: all; ' +
          'margin: 0 2px; vertical-align: baseline; line-height: 1.6;',
      }),
      label,
    ];
  },
});

// ─── Fonctions utilitaires de conversion ────────────────────────────

/**
 * Convertit le HTML contenant des <span data-variable="…"> en {{variable}}.
 * Utilisé avant d'envoyer le contenu au backend.
 */
export function chipsToMustache(html: string): string {
  // Remplacer les spans data-variable par {{key}}
  return html.replace(
    /<span[^>]*data-variable="([^"]+)"[^>]*>[^<]*<\/span>/g,
    (_match, key) => `{{${key}}}`
  );
}

/**
 * Convertit les {{variable}} en <span data-variable="…"> pour l'éditeur.
 * Utilisé quand on charge un template existant depuis le backend.
 */
export function mustacheToChips(html: string): string {
  return html.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, key: string) => {
    const label = VARIABLE_LABELS[key] || key;
    return (
      `<span data-variable="${key}" data-label="${label}" ` +
      `style="display: inline-block; background-color: #fff3bf; color: #e67700; ` +
      `border: 1px solid #ffd43b; border-radius: 12px; padding: 1px 10px; ` +
      `font-size: 13px; font-weight: 600; cursor: default; user-select: all; ` +
      `margin: 0 2px; vertical-align: baseline; line-height: 1.6;">${label}</span>`
    );
  });
}
