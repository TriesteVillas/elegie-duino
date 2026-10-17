# Elegie Duino

Il sito di **Elegie Duino** — otto case in struttura X-LAM a Duino Aurisina (Trieste), Località Duino 69/A.
Iniziativa di **Ennio Riccesi Holding**, progetto **Studio Architettura Soldano**, vendite **TriesteVillas**.

## Live

- IT: https://elegieduino.it/
- EN: https://elegieduino.it/en/
- SL: https://elegieduino.it/sl/

## Il sito «opera» (dal 17/10/2026)

Una pagina per lingua che si legge scorrendo, con una scena 3D fissa dietro ai capitoli:

1. **Apertura** — la foto da drone vera del 12/08/2026 (il lotto vuoto) che si dissolve nel modello 3D dallo
   stesso punto di vista, e l'edificio che sorge al suo posto.
2. **Il luogo** — il paese in 3D: terreno LiDAR della Regione FVG, edifici OpenStreetMap, chiome degli alberi,
   ortofoto; i luoghi con i tempi a piedi e in auto calcolati con OSRM.
3. **Il nome** — Rilke a Duino, gennaio 1912, dalle fonti (KB `progetti/elegie-duino/`).
4. **Come è fatta** — l'edificio che si monta strato per strato scorrendo, con le parole del capitolato.
5. **La luce** — il sole su Duino per qualunque giorno e ora, con le ombre vere; ore di sole sulla veranda di
   ogni casa, precalcolate.
6. **Le case** — scelta sul modello (taglio «casa di bambola» per piano), scheda con la pianta vettoriale dal
   DWG del progettista, il sole sulla veranda, il conto.
7. **Il conto**, **il capitolato**, **chi lo fa**, **contatti** (moduli verso la porta pubblica del CRM).

Niente in questa scena è generato con l'intelligenza artificiale: l'edificio è ricostruito dalle tavole e dal
DWG del progettista, il paese da dati pubblici. Le sole immagini AI sono nella galleria, ognuna etichettata.

## Stack

HTML + CSS statici su **GitHub Pages**, nessun build sul server. three.js r170 in casa
(`assets/vendor/three/`, licenza MIT), caratteri in casa (Cormorant Garamond, Inter Tight; OFL). La scena 3D
si carica dopo la prima schermata e solo con WebGL; senza, la pagina resta completa.

## Come si cambia

Le pagine `index.html`, `en/index.html`, `sl/index.html` sono **generate**: non si correggono a mano.

```
scripts/opera/testi.py       le parole, nelle tre lingue
scripts/opera/unita.json     case, superfici, prezzi, vendute (unica fonte)
scripts/opera/fatti.json     luoghi e tempi, fasi del capitolato, galleria, materiali
scripts/opera/genera.py      scrive le tre pagine
python3 scripts/opera/genera.py
```

Una casa venduta o un prezzo cambiato: si modifica `unita.json` e si rigenera.

Le varianti responsive delle foto: `scripts/varianti.py` (`--solo nome1,nome2` per rifarne solo alcune;
`--verifica` la esegue la Action a ogni push).

I file 3D (`assets/3d/`) e le piante (`assets/piante/`) nascono da script nella KB
(`progetti/elegie-duino/SITO-OPERA-2026-10-17.md`): non si modificano a mano. Le ore di sole:
`scripts/opera/sole_unita.py`.

## Struttura

```
index.html · en/ · sl/          pagine generate
privacy.html · en/ · sl/        informative (foglio di stile storico assets/css/style.css)
assets/css/opera.css            stile del sito
assets/js/opera/                app.js (pagina), scena.js (3D), sole.js (sole e ora di Roma)
assets/js/                      consenso.js, provenienza.js, contatore.js (comuni ai siti del gruppo)
assets/3d/                      edificio.glb, contesto.glb, contesto.json, alberi.json, sole_unita.json, pavimenti
assets/piante/                  piante SVG per unità (dal DWG)
assets/vendor/three/            three.js (MIT)
```

## Owner

TriesteVillas — `richieste@triestevillas.com`
