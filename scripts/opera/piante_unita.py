#!/usr/bin/env python3
"""Le due piante della scheda di ogni casa, dagli originali su Drive (solo case in vendita).

  assets/piante/disegno/uN.jpg   il disegno a mano dell'arch. Soldano: è quello che si vede per primo
  assets/piante/atto/uN.jpg      la planimetria ufficiale, quella che verrà allegata all'atto
  assets/piante/atto/uN.pdf      lo stesso documento in vettoriale (A3, scala 1:100), da scaricare

Fonti in Vendite/2026 TRIESTEVILLAS/ELEGIE DUINO/:
  PLAN SOLDANO/         i disegni a mano 1, 2, 6, 8
  MODIFICHE 15.16.26/   i disegni a mano 3 e 7, nella versione del 15/06 che sostituisce quella di PLAN SOLDANO
  PLAN COMMERCIALI/     le planimetrie ufficiali (dal DWG «Acommerciali DEF 30_06_26»)

I disegni vanno col nord in alto, come sul sito di giugno: 1, 2, 3, 6, 7 ruotati di 90° in senso orario, 8 no.
Serve macOS (Quartz, v. pdf_quartz.swift) e Pillow. Si lancia di rado: i file generati stanno nel repo.

    python3 scripts/opera/piante_unita.py
"""
import os
import subprocess
import tempfile

from PIL import Image, ImageChops

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DRIVE = os.path.expanduser(
    '~/Library/CloudStorage/GoogleDrive-claude@triestevillas.com/Drive condivisi/Vendite/2026 TRIESTEVILLAS/ELEGIE DUINO')
QUARTZ = os.path.join(ROOT, 'scripts/opera/pdf_quartz.swift')

# unità: (disegno a mano, gradi in senso orario, planimetria ufficiale)
CASE = {
    '1': ('PLAN SOLDANO/Unità 1 · Piano terra.png', 90, 'app 1 pt.pdf'),
    '2': ('PLAN SOLDANO/Unità 2 · Piano terra.png', 90, 'app 2  pt.pdf'),
    '3': ('MODIFICHE 15.16.26/3.png', 90, 'app 3  pt.pdf'),
    '6': ('PLAN SOLDANO/Unità 6 · Piano primo.png', 90, 'app 6 1pt.pdf'),
    '7': ('MODIFICHE 15.16.26/7.png', 90, 'app 7 1p.pdf'),
    '8': ('PLAN SOLDANO/Unità 8 · Piano primo.png', 0, 'app 8 1p.pdf'),
}
LATO_DISEGNO = 2400   # px sul lato lungo: nella lente si vede il tratto della matita
LARGHEZZA_ATTO = 3200  # px: i testi del foglio A3 restano leggibili ingrandendo


def togli_margini(im, soglia=18, aria=24):
    """Toglie il bianco attorno al disegno, così nella scheda il disegno riempie il riquadro."""
    fondo = Image.new('RGB', im.size, (255, 255, 255))
    d = ImageChops.difference(im, fondo).convert('L').point(lambda v: 255 if v > soglia else 0)
    l, t, r, b = d.getbbox()
    return im.crop((max(l - aria, 0), max(t - aria, 0), min(r + aria, im.width), min(b + aria, im.height)))


def disegno(n, fonte, gradi):
    im = Image.open(os.path.join(DRIVE, fonte)).convert('RGB')
    if gradi: im = im.rotate(-gradi, expand=True)
    im = togli_margini(im)
    im.thumbnail((LATO_DISEGNO, LATO_DISEGNO), Image.LANCZOS)
    out = os.path.join(ROOT, f'assets/piante/disegno/u{n}.jpg')
    im.save(out, quality=82, optimize=True, progressive=True)
    return out, im.size


def atto(n, fonte):
    pdf = os.path.join(DRIVE, 'PLAN COMMERCIALI', fonte)
    out_pdf = os.path.join(ROOT, f'assets/piante/atto/u{n}.pdf')
    subprocess.run(['swift', QUARTZ, pdf, out_pdf, f'Elegie Duino, unità {n}: planimetria ufficiale'], check=True)
    with tempfile.TemporaryDirectory() as tmp:
        png = os.path.join(tmp, 'p.png')
        subprocess.run(['swift', QUARTZ, pdf, png, str(LARGHEZZA_ATTO)], check=True)
        im = Image.open(png).convert('RGB')
        out = os.path.join(ROOT, f'assets/piante/atto/u{n}.jpg')
        im.save(out, quality=86, optimize=True, progressive=True, subsampling=0)
    return out, im.size


if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'assets/piante/disegno'), exist_ok=True)
    os.makedirs(os.path.join(ROOT, 'assets/piante/atto'), exist_ok=True)
    for n, (mano, gradi, ufficiale) in CASE.items():
        for out, misure in (disegno(n, mano, gradi), atto(n, ufficiale)):
            print(os.path.relpath(out, ROOT), misure, f'{os.path.getsize(out) // 1024} KB')
