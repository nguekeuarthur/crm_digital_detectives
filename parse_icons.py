import re

with open('scratch_icons.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract the sections array
match = re.search(r'const sections = \[(.*?)\];', html, re.DOTALL)
if not match:
    print("Could not find sections array")
    exit(1)

array_content = match.group(1)

# Find all { name: "...", inner: `...` }
items = re.findall(r'\{\s*name:\s*"([^"]+)",\s*inner:\s*`([^`]+)`\s*\}', array_content)

mapping_logic = {
    "Profil Particulier": "particuliers",
    "Profil Entreprise": "entreprises",
    "Autres Services": "autres",

    "Infidélité / Adultère": "infidelite",
    "Divorce & Prestations compensatoires": "divorce",
    "Garde d'enfants & Pension alimentaire": "garde-pension",
    "Addictions (drogue, secte, jeu)": "addictions",
    "Conflits de voisinage": "voisinage",
    "Harcèlement & Menaces": "harcelement",

    "Vol et fraude en entreprise": "vol-fraude",
    "Détournement de fonds / Corruption": "detournement",
    "Enquête de moralité (employé / CV)": "moralite-employes",
    "Chantage ou Extorsion en interne": "extorsion-interne",
    "Concurrence déloyale": "concurrence",
    "Espionnage industriel": "espionnage",
    "Contrefaçon de marque": "contrefacon",
    "Enquête commerciale / Solvabilité": "enquete-commerciale",

    "Prévention des vols (client mystère)": "prevention-vols",
    "Renseignements immobiliers (locataire fantôme)": "renseignements-immobiliers",
    "Surveillance de domicile": "surveillance-domicile",
    "Protection privée / Garde du corps (VIP)": "protection-privee",
    "Nettoyage d'e-réputation / Cyber-enquête": "e-reputation",
    "Sensibilisation & Formation": "sensibilisation",

    "Géographie — Local": "local",
    "Géographie — National": "national",
    "Géographie — International": "international",

    "Cible — Citoyen normal": "simple",
    "Cible — Personne sur ses gardes": "protected",
    "Cible — VIP / Personnalité publique": "public_figure",

    "Environnement — Urbain (Ville)": "urban",
    "Environnement — Rural (Campagne)": "rural",
    "Environnement — Hostile": "hostile",

    "Logistique — Standard": "standard",
    "Logistique — Urgent / Complexe": "complex"
}

output = """import React from 'react';
import { motion } from 'framer-motion';

const draw = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => {
    const delay = i * 0.15;
    return {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: { delay, type: "spring", duration: 1.5, bounce: 0 },
        opacity: { delay, duration: 0.1 }
      }
    };
  }
};

const SVGWrapper = ({ children, className = "", strokeWidth = 2 }: any) => (
  <motion.svg 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth={strokeWidth} 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
    initial="hidden"
    animate="visible"
  >
    {children}
  </motion.svg>
);

"""

components = []
map_entries = []

for name, inner in items:
    id_key = mapping_logic.get(name)
    if not id_key:
        print(f"Warning: No ID mapping for {name}")
        continue
    
    component_name = "Icon" + "".join([w.capitalize() for w in id_key.replace("-", " ").replace("_", " ").split()])
    
    # Process inner tags to framer motion tags
    processed_inner = inner.strip()
    processed_inner = re.sub(r'<path', r'<motion.path variants={draw} custom={0}', processed_inner)
    processed_inner = re.sub(r'<circle', r'<motion.circle variants={draw} custom={1}', processed_inner)
    processed_inner = re.sub(r'<rect', r'<motion.rect variants={draw} custom={2}', processed_inner)
    
    # For multiple paths, we should increment custom index, but let's just use generic custom
    lines = processed_inner.split('\n')
    new_lines = []
    custom_idx = 0
    for line in lines:
        if '<motion.' in line:
            line = re.sub(r'custom=\{\d+\}', f'custom={{{custom_idx}}}', line)
            custom_idx += 1
        new_lines.append(line)
        
    final_inner = '\n      '.join(new_lines)
    
    comp = f"export const {component_name} = (props: any) => (\n  <SVGWrapper {{...props}}>\n      {final_inner}\n  </SVGWrapper>\n);\n"
    components.append(comp)
    map_entries.append(f'  "{id_key}": {component_name},')


output += "\n".join(components)
output += "\nexport const CustomIconMap: Record<string, React.FC<any>> = {\n" + "\n".join(map_entries) + "\n};\n"

with open('packages/website/src/components/AnimatedCustomIcons.tsx', 'w') as f:
    f.write(output)

print("Created AnimatedCustomIcons.tsx")
