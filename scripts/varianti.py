#!/usr/bin/env python3
"""Varianti responsive delle immagini di elegieduino.it (08/10/2026).

Il sito è statico (GitHub Pages, nessun build): le pagine servono le foto e i
loghi da `assets/images/resp/` e `assets/logos/resp/` in AVIF/WebP a più
larghezze, con l'originale JPEG/PNG come ripiego. Quelle varianti si ricavano
dagli originali con questo script.

⚠️ Se si sostituisce un originale (per esempio `assets/images/prospetti.jpg`),
le pagine continuano a mostrare la variante VECCHIA finché non si rilancia:

    python3 scripts/varianti.py            # rigenera tutto (serve Pillow ≥ 11 con AVIF)
    python3 scripts/varianti.py --verifica # solo controlla (basta Python: niente Pillow)

`--verifica` confronta l'impronta SHA-256 di ogni originale con quella scritta
in `assets/varianti.json` al momento della generazione, e fallisce se un
originale è cambiato o se manca un file: lo esegue la Action
`.github/workflows/varianti.yml` a ogni push.
"""
import hashlib, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'assets', 'varianti.json')

# Foto: originale → larghezze (AVIF qualità 55, WebP 78).
FOTO = {
    'exterior-sunset-garden': [1280, 1920, 2400],
    'prospetti': [800, 1200, 1600, 2400],
    'exterior-entrance-sunset': [640, 1024, 1600, 2000],
    'exterior-garden-glazing': [640, 1024, 1600],
    'exterior-garden-corner': [640, 1024, 1600],
    'construction-xlam': [640, 1024, 1600],
    'detail-bathrooms': [640, 1024, 1600],
    'construction-insulation': [640, 1024, 1600],
    'detail-terrace': [640, 1024, 1600],
    'terrace-view': [640, 1024, 1600],
    'exterior-parking': [640, 1024, 1600],
}
# Taglio verticale 3:4 della hero per i telefoni (tutta l'altezza, centrato).
HERO_VERTICALE = ('exterior-sunset-garden', [750, None])  # None = larghezza nativa del taglio
# Loghi con trasparenza: WebP + PNG ridotto (ripiego).
LOGHI_ALPHA = {'elegie-duino-alpha': [100, 150], 'logo-castello-white': [640, 960, 1240]}
# Loghi dei crediti: altezza 192 px (3× i 64 px mostrati).
LOGHI_CREDITI = ['riccesi-holding', 'soldano', 'triestevillas']


def sha(path):
    h = hashlib.sha256()
    with open(path, 'rb') as f:
        for blocco in iter(lambda: f.read(1 << 20), b''):
            h.update(blocco)
    return h.hexdigest()


def genera():
    from PIL import Image  # solo qui: la verifica non lo richiede
    manifest = {}

    def registra(sorgente, uscite):
        rel = os.path.relpath(sorgente, ROOT)
        manifest.setdefault(rel, {'sha256': sha(sorgente), 'varianti': []})
        manifest[rel]['varianti'] += [os.path.relpath(u, ROOT) for u in uscite]

    def scala(im, w):
        return im if im.width <= w else im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)

    def salva(im, base, formati):
        uscite = []
        for fmt in formati:
            p = f'{base}-{im.width}.{fmt}'
            if fmt == 'avif':
                im.save(p, 'AVIF', quality=55, speed=6)
            elif fmt == 'webp':
                im.save(p, 'WEBP', quality=78 if im.mode == 'RGB' else 82, method=6)
            else:
                im.save(p, 'PNG', optimize=True)
            uscite.append(p)
        return uscite

    dir_foto = os.path.join(ROOT, 'assets', 'images')
    dir_loghi = os.path.join(ROOT, 'assets', 'logos')
    os.makedirs(os.path.join(dir_foto, 'resp'), exist_ok=True)
    os.makedirs(os.path.join(dir_loghi, 'resp'), exist_ok=True)

    for nome, larghezze in FOTO.items():
        src = os.path.join(dir_foto, f'{nome}.jpg')
        im = Image.open(src).convert('RGB')
        uscite = []
        for w in larghezze:
            uscite += salva(scala(im, w), os.path.join(dir_foto, 'resp', nome), ('avif', 'webp'))
        registra(src, uscite)

    nome, larghezze = HERO_VERTICALE
    src = os.path.join(dir_foto, f'{nome}.jpg')
    im = Image.open(src).convert('RGB')
    cw = round(im.height * 3 / 4)
    x0 = (im.width - cw) // 2
    taglio = im.crop((x0, 0, x0 + cw, im.height))
    uscite = []
    for w in larghezze:
        uscite += salva(scala(taglio, w or cw), os.path.join(dir_foto, 'resp', f'{nome}-portrait'), ('avif', 'webp'))
    registra(src, uscite)

    for nome, larghezze in LOGHI_ALPHA.items():
        src = os.path.join(dir_loghi, f'{nome}.png')
        im = Image.open(src).convert('RGBA')
        uscite = []
        for w in larghezze:
            uscite += salva(scala(im, w), os.path.join(dir_loghi, 'resp', nome), ('webp', 'png'))
        registra(src, uscite)

    for nome in LOGHI_CREDITI:
        src = os.path.join(dir_loghi, f'{nome}.png')
        im = Image.open(src).convert('RGB')
        w = round(im.width * 192 / im.height)
        im = im.resize((w, 192), Image.LANCZOS)
        registra(src, salva(im, os.path.join(dir_loghi, 'resp', nome), ('webp', 'png')))

    with open(MANIFEST, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print(f'{sum(len(v["varianti"]) for v in manifest.values())} varianti da {len(manifest)} originali → {os.path.relpath(MANIFEST, ROOT)}')


def verifica():
    with open(MANIFEST, encoding='utf-8') as f:
        manifest = json.load(f)
    errori = []
    for rel, voce in manifest.items():
        src = os.path.join(ROOT, rel)
        if not os.path.exists(src):
            errori.append(f'manca l\'originale {rel}')
        elif sha(src) != voce['sha256']:
            errori.append(f'{rel} è cambiato dopo l\'ultima generazione: rilanciare scripts/varianti.py')
        for v in voce['varianti']:
            if not os.path.exists(os.path.join(ROOT, v)):
                errori.append(f'manca la variante {v}')
    for e in errori:
        print('✗', e)
    if errori:
        sys.exit(1)
    print(f'ok: {len(manifest)} originali, varianti allineate')


if __name__ == '__main__':
    verifica() if '--verifica' in sys.argv else genera()
