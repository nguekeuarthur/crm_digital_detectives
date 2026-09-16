#!/usr/bin/env python3
"""
Produit docs/Liaison-bancaire-UBS.pdf à partir de docs/src/liaison-bancaire.html.

    python docs/src/build-pdf.py

Le PDF du dépôt est un produit de construction : modifier le HTML, relancer ce
script, et commiter les deux. Ne jamais éditer le PDF directement.

Le HTML source est écrit comme un fragment (il sert aussi de page web publiée) :
le script l'enveloppe dans un document complet, force le thème clair et ajoute
les règles de pagination — une étape ne doit jamais être coupée entre deux
pages, un titre ne doit jamais rester seul en bas de page.

Le rendu est confié à Chrome sans interface, seul moteur disponible partout ici
qui respecte la mise en page CSS moderne. Ses en-têtes et pieds de page sont
désactivés : ils imprimeraient le chemin local du fichier sur un document
destiné à être transmis.
"""

import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

RACINE = Path(__file__).resolve().parent
SOURCE = RACINE / "liaison-bancaire.html"
CIBLE = RACINE.parent / "Liaison-bancaire-UBS.pdf"

CHROMES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
]

STYLES_IMPRESSION = """
<style>
  /* ── Calage pour l'impression ───────────────────────────── */
  @page {
    size: A4;
    margin: 17mm 16mm 18mm;
  }
  @page :first {
    margin-top: 20mm;
  }

  html { background: #ffffff; }
  body {
    background: #ffffff;
    font-size: 10.6pt;
    line-height: 1.55;
  }
  .wrap {
    max-width: none;
    padding-inline: 0;
    padding-block: 0;
  }

  /* Rythme resserré : l'écran respire, le papier compte ses pages */
  section { margin-block: 26px; }
  .masthead { margin-bottom: 26px; padding-bottom: 16px; }
  h1 { font-size: 27pt; }
  .standfirst { font-size: 12pt; }
  h2 { font-size: 15.5pt; }
  h3 { font-size: 11.5pt; }
  p, ul, ol, table { max-width: none; }

  /* Rien ne se coupe au mauvais endroit */
  .step, .iban-card, .check, .why, .blocker, .status, .figure, tr {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  h1, h2, h3 {
    break-after: avoid;
    page-break-after: avoid;
  }
  .blocker { margin-block: 22px; }

  /* Le diagramme tient dans la largeur utile, sans barre de défilement */
  .figure-scroll { overflow: visible; }
  .figure svg { min-width: 0; width: 100%; }
  .table-scroll { overflow: visible; }
  table { min-width: 0; }

  /* Les aplats de couleur doivent être imprimés, pas ignorés */
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

  /* Pas de lien bleu souligné inutile sur papier */
  a { color: var(--ink); text-decoration: none; }
</style>
"""


def trouver_chrome() -> str:
    for candidat in CHROMES:
        if Path(candidat).exists():
            return candidat
    for nom in ("google-chrome", "chromium", "chrome"):
        chemin = shutil.which(nom)
        if chemin:
            return chemin
    sys.exit(
        "Chrome introuvable. Installer Google Chrome, ou adapter la liste CHROMES "
        "en tête de ce script."
    )


def document_imprimable(fragment: str) -> str:
    titre = re.search(r"<title>(.*?)</title>", fragment, re.S).group(1)
    corps = fragment.replace(f"<title>{titre}</title>", "", 1).lstrip()

    debut_style = corps.index("<style>")
    fin_style = corps.index("</style>") + len("</style>")

    return (
        "<!DOCTYPE html>\n"
        '<html lang="fr" data-theme="light">\n'
        "<head>\n"
        '<meta charset="utf-8">\n'
        f"<title>{titre}</title>\n"
        f"{corps[:debut_style]}\n"
        f"{corps[debut_style:fin_style]}\n"
        f"{STYLES_IMPRESSION}\n"
        "</head>\n"
        "<body>\n"
        f"{corps[fin_style:]}\n"
        "</body>\n"
        "</html>\n"
    )


def main() -> None:
    if not SOURCE.exists():
        sys.exit(f"Source introuvable : {SOURCE}")

    document = document_imprimable(SOURCE.read_text(encoding="utf-8"))

    with tempfile.TemporaryDirectory() as temporaire:
        intermediaire = Path(temporaire) / "imprimable.html"
        intermediaire.write_text(document, encoding="utf-8")

        subprocess.run(
            [
                trouver_chrome(),
                "--headless=new",
                "--disable-gpu",
                "--no-sandbox",
                # Laisse le temps aux polices distantes d'arriver
                "--virtual-time-budget=12000",
                "--no-pdf-header-footer",
                f"--print-to-pdf={CIBLE}",
                intermediaire.as_uri(),
            ],
            check=True,
            capture_output=True,
        )

    if not CIBLE.exists():
        sys.exit("Chrome n'a produit aucun fichier.")

    print(f"écrit : {CIBLE.relative_to(RACINE.parent.parent)} ({CIBLE.stat().st_size} octets)")


if __name__ == "__main__":
    main()
