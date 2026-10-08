# Elegie Duino

Sito web vetrina per **Elegie Duino** — otto residenze in struttura X-LAM a Duino Aurisina (Trieste).

Iniziativa di **Ennio Riccesi Holding**. Progetto **Studio Architettura Soldano**. Vendite **TriesteVillas Luxury Real Estate**.

## Live

- IT: https://elegieduino.it/
- EN: https://elegieduino.it/en/

GitHub Pages dal ramo `main` (dominio nel file `CNAME`; `www` e il vecchio
indirizzo `triestevillas.github.io/elegie-duino/` rimandano qui con un 301).
Pubblicare = `git push` su `main`.

## Stack

HTML + CSS statici, zero build step. Ospitato su **GitHub Pages**. Caratteri Lora (IT) + Inter Tight (EN) **ospitati qui** in `assets/fonts/` (file variabili Fontsource, OFL 1.1): niente più fonts.googleapis.com. Reveal-on-scroll e nav state via vanilla JS inline.

### Immagini: originali e varianti

Le pagine servono foto e loghi da `assets/images/resp/` e `assets/logos/resp/`
(AVIF/WebP a più larghezze, con `<picture>` e `srcset`), con l'originale come
ripiego. **Se si sostituisce un originale, si rilancia**
`python3 scripts/varianti.py` (serve Pillow con AVIF), altrimenti il sito
continua a mostrare la versione vecchia; la Action `varianti immagini`
(`--verifica`, confronto delle impronte in `assets/varianti.json`) lo segnala a
ogni push. Le piante (`assets/planimetrie/`) restano JPEG: si caricano solo
quando si scorre fin lì.

## Struttura

```
.
├── index.html              # versione italiana
├── en/index.html           # versione inglese
├── assets/
│   ├── css/style.css       # palette + tipografia + layout condivisi
│   ├── fonts/              # Lora + Inter Tight (woff2, OFL)
│   ├── images/             # render esterni, interni, dettagli (+ resp/ varianti)
│   ├── logos/              # Elegie · Riccesi · Soldano · TriesteVillas (+ resp/)
│   ├── planimetrie/        # keyplan e piante delle unità
│   ├── js/consenso.js      # GA4 con Consent Mode v2 e banner
│   └── pdf/                # brochure scaricabile
├── scripts/varianti.py     # rigenera/verifica le varianti delle immagini
├── .nojekyll               # disabilita Jekyll su GitHub Pages
└── README.md
```

## Modifiche editoriali

Tutti i testi sono dichiarati `lang="it"` o `lang="en"`. Per modificare un paragrafo, aprire l'`index.html` corrispondente e cercare l'ancora di sezione (`#luogo`, `#progetto`, `#architettura`, `#interni`, `#listino`, `#capitolato`, `#contatti`).

## Owner

TriesteVillas — `richieste@triestevillas.com` · 331 8940822 (telefono e WhatsApp)
