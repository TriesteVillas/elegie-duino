# Elegie Duino

Sito web vetrina per **Elegie Duino** — otto residenze in struttura X-LAM a Duino Aurisina (Trieste).

Iniziativa di **Ennio Riccesi Holding**. Progetto **Studio Architettura Soldano**. Vendite **TriesteVillas Luxury Real Estate**.

## Live

- IT: https://elegieduino.it/
- EN: https://elegieduino.it/en/
- SL: https://elegieduino.it/sl/ (dal 14/10/2026)

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

### Immagini e AI: ogni immagine dichiara cos'è

Nessuna immagine del sito è una fotografia. I due rendering di progetto fatti
senza AI portano l'etichetta «Rendering»; tutte le altre sono passate da un
modello generativo (Higgsfield, Google) e portano «AI · rendering», o «AI» quando
non si sa se l'immagine è stata generata per intero (le due di struttura e
cappotto, che fino all'8/10 erano presentate come «Cantiere»). Sotto la galleria
una nota spiega le due voci. È la regola del gruppo (AI pledge del 01/10/2026,
nella KB `progetti/ai-pledge/`): **un'immagine nuova entra con la sua etichetta**
(`<span class="ai-tag" …>` subito dopo il `<picture>`), le piante no.

### Brochure PDF

`assets/pdf/elegie-duino-brochure.pdf` nasce dal render HTML su Drive
(`TRIESTEVILLAS_CLAUDE/progetti/elegie_duino_brochure/render/ELEGIE_DUINO_A_apple.html`,
generato da `concept_apple.py` + `content.py`/`content_en.py`) stampato con Chrome
headless. L'edizione di ottobre 2026 è quella del 6 luglio con il testo corretto
sul render: niente più «validi fino al 31.07.2026», recapiti 331 8940822 e
richieste@, nota sulle immagini AI nelle condizioni. ⚠️ I sorgenti Python su
Drive hanno ancora i testi di luglio: chi rigenera da lì li corregge prima.

## Struttura

```
.
├── index.html              # versione italiana
├── en/index.html           # versione inglese
├── sl/index.html           # versione slovena (dal 14/10/2026)
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

Tutti i testi sono dichiarati `lang="it"`, `lang="en"` o `lang="sl"`. **Un testo che cambia, cambia nelle tre lingue** (e il listino nelle tre tabelle, nelle slide e nella mappa delle unità dello script di ogni pagina). Per modificare un paragrafo, aprire l'`index.html` corrispondente e cercare l'ancora di sezione: IT `#progetto` `#listino` `#planimetrie` `#capitolato` `#contatti` · EN `#project` `#pricing` `#plans` `#spec` `#contact` · SL `#projekt` `#cenik` `#tlorisi` `#tehnicni-opis` `#kontakt`.

**Superfici e listino** (17/10/2026): le superfici sono quelle della tabella del progettista («Località Duino n. 69/a – SUPERFICI COMMERCIALI», Studio Architettura Soldano, in Drive con i documenti di Elegie), con due decimali: commerciale e, per il piano terra, area esterna a parte — la commerciale **non** comprende giardino né posto auto. Le stesse cifre stanno in quattro posti per lingua: tabella del listino, slide delle piante, mappa delle unità nello script, testo alternativo delle piante. Al telefono la tabella diventa una scheda per riga: ogni cella porta la classe (`c-piano`, `c-comm`, `c-est`…) e l'etichetta in `data-label`, e un'area esterna vuota ha `is-empty`. Un'unità venduta: riga `sold-row`, «Disponibili N residenze su 8» in testata e `numberOfAvailableAccommodationUnits` nel JSON-LD, nelle tre lingue.

**Sloveno** (14/10/2026): toponimi come su triestevillas.com/sl (Devin, Devin - Nabrežina, Trst, Kras, Sesljan, Ronke, Miramar), si dà del «vi», i prezzi col simbolo dopo la cifra (`441.000 €`), le etichette delle immagini «UI · vizualizacija», «Vizualizacija», «UI». La brochure PDF è una sola, in italiano e inglese: la pagina slovena lo dice.

## Owner

TriesteVillas — `richieste@triestevillas.com` · 331 8940822 (telefono e WhatsApp)
