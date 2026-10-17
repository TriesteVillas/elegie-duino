# Elegie Duino

Il sito di **Elegie Duino** — otto case in struttura X-LAM a Duino Aurisina (Trieste), Località Duino 69/A.
Iniziativa di **Ennio Riccesi Holding**, progetto **Studio Architettura Soldano**, vendite **TriesteVillas**.

## Live

- IT: https://elegieduino.it/
- EN: https://elegieduino.it/en/
- DE: https://elegieduino.it/de/
- SL: https://elegieduino.it/sl/

## Il sito «opera» (dal 17/10/2026, rivisto la sera stessa)

Una pagina per lingua (IT, EN, DE, SL) che si legge scorrendo: prima l'emozione, poi le case e i conti, poi la tecnica.
Dietro ai capitoli 3D c'è una scena fissa.

1. **Apertura** — la foto da drone vera del 12/08/2026 (il lotto vuoto) che si dissolve nel modello 3D dallo stesso
   punto di vista, e l'edificio che sorge al suo posto. Da qui si apre anche il **tour 3D del terreno dopo la
   demolizione** (Matterport del 15/09/2026, caricato solo a richiesta).
2. **Vivere qui** — quattro scene a tutta pagina (due rendering animati con l'AI e dichiarati, un rendering dello Studio
   Soldano, una foto vera del Castello dal drone) e la galleria delle altre immagini.
3. **Il nome** — Rilke a Duino, gennaio 1912. Ai tedeschi il verso arriva in originale, senza traduzione.
4. **Le case** — scelta sul modello 3D (taglio «casa di bambola» per piano).
5. **Le piante** — tutte le case libere una accanto all'altra con la pianta vettoriale dal DWG, filtri, **preferite col
   cuore** (restano nel browser) e **confronto fianco a fianco**.
6. **Quanto costa** — la risposta a «quanto costa una casa con giardino», il conto casa per casa, **come si paga**
   (10% prenotazione · 20% preliminare dal notaio · 70% rogito) con le tutele del D.Lgs. 122/2005.
7. **Il luogo**, **la luce** (il sole per qualunque giorno e ora, ore di sole sulla veranda di ogni casa),
   **come è fatta** (l'edificio che si monta strato per strato), **il capitolato** (finiture e RAL dentro un «dettagli»),
   **chi lo fa**, **contatti**.
8. **Il concierge AI** — in basso a destra, parla col CRM (`tsv-pg`, `/api/web/ed-chat`): sa quello che sa il sito
   (`assets/concierge/conoscenza.json`, generato), dopo qualche risposta propone una persona, le richieste vanno alla
   porta unica dei lead. Il pulsante appare solo se il CRM risponde «acceso».

Niente in questa scena è generato con l'intelligenza artificiale: l'edificio è ricostruito dalle tavole e dal
DWG del progettista, il paese da dati pubblici. Le immagini AI sono nella sezione «Vivere qui», ognuna etichettata («AI», «AI · rendering», «AI · animazione»).

## Stack

HTML + CSS statici su **GitHub Pages**, nessun build sul server. three.js r170 in casa
(`assets/vendor/three/`, licenza MIT), caratteri in casa (Cormorant Garamond, Inter Tight; OFL). La scena 3D
si carica dopo la prima schermata e solo con WebGL; senza, la pagina resta completa.

## Come si cambia

Le pagine `index.html`, `en/index.html`, `sl/index.html` sono **generate**: non si correggono a mano.

```
scripts/opera/testi.py       le parole, nelle quattro lingue
scripts/opera/unita.json     case, superfici, prezzi, vendute (unica fonte)
scripts/opera/fatti.json     luoghi e tempi, fasi del capitolato, scene, galleria, materiali
scripts/opera/genera.py      scrive le quattro pagine e il sapere del concierge
scripts/opera/conoscenza.py  assets/concierge/conoscenza.json (lo legge il CRM)
python3 scripts/opera/genera.py
```

Una casa venduta o un prezzo cambiato: si modifica `unita.json` e si rigenera. Il concierge lo sa da solo dopo il
push (il CRM rilegge `conoscenza.json` ogni 15 minuti).

Le varianti responsive delle foto: `scripts/varianti.py` (`--solo nome1,nome2` per rifarne solo alcune;
`--verifica` la esegue la Action a ogni push).

I file 3D (`assets/3d/`) e le piante (`assets/piante/`) nascono da script nella KB
(`progetti/elegie-duino/SITO-OPERA-2026-10-17.md`): non si modificano a mano. Le ore di sole:
`scripts/opera/sole_unita.py`.

## Struttura

```
index.html · en/ · de/ · sl/    pagine generate
privacy.html · en/ · de/ · sl/  informative (foglio di stile storico assets/css/style.css); punto 10 = il concierge
assets/css/opera.css            stile del sito
assets/js/opera/                app.js (pagina), scena.js (3D), sole.js (sole e ora di Roma), concierge.js (la chat)
assets/js/                      consenso.js, provenienza.js, contatore.js (comuni ai siti del gruppo)
assets/3d/                      edificio.glb, contesto.glb, contesto.json, alberi.json, sole_unita.json, pavimenti
assets/piante/                  piante SVG per unità (dal DWG)
assets/video/                   le due scene animate (AI, dichiarate; MP4 senza audio)
assets/concierge/               conoscenza.json, il sapere pubblico del concierge (generato)
assets/vendor/three/            three.js (MIT)
```

## Owner

TriesteVillas — `richieste@triestevillas.com`
