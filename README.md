# Elegie Duino

Sito web vetrina per **Elegie Duino** — otto residenze in struttura X-LAM a Duino Aurisina (Trieste).

Iniziativa di **Ennio Riccesi Holding**. Progetto **Studio Architettura Soldano**. Vendite **TriesteVillas Luxury Real Estate**.

## Live

- IT: https://triestevillas.github.io/elegie-duino/
- EN: https://triestevillas.github.io/elegie-duino/en/

Dominio target dichiarato in brochure: `www.elegieduino.it` (da attivare).

## Stack

HTML + CSS statici, zero build step. Ospitato su **GitHub Pages**. Font Google: Lora (IT) + Inter Tight (EN). Reveal-on-scroll e nav state via vanilla JS (~30 righe inline).

## Struttura

```
.
├── index.html              # versione italiana
├── en/index.html           # versione inglese
├── assets/
│   ├── css/style.css       # palette + tipografia + layout condivisi
│   ├── images/             # render esterni, interni, dettagli
│   ├── logos/              # Elegie · Riccesi · Soldano · TriesteVillas
│   └── pdf/                # brochure scaricabile
├── .nojekyll               # disabilita Jekyll su GitHub Pages
└── README.md
```

## Modifiche editoriali

Tutti i testi sono dichiarati `lang="it"` o `lang="en"`. Per modificare un paragrafo, aprire l'`index.html` corrispondente e cercare l'ancora di sezione (`#luogo`, `#progetto`, `#architettura`, `#interni`, `#listino`, `#capitolato`, `#contatti`).

## Owner

TriesteVillas — `duino@triestevillas.com`
