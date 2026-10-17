#!/usr/bin/env python3
"""Genera le tre pagine di elegieduino.it (IT, EN, SL) da un solo modello (17/10/2026).

    python3 scripts/opera/genera.py

Fonti: scripts/opera/unita.json (case e prezzi), scripts/opera/fatti.json (luoghi e tempi misurati,
racconto, capitolato), scripts/opera/testi.py (le parole nelle tre lingue). Le pagine prodotte
(index.html, en/index.html, sl/index.html) si committano: GitHub Pages non ha un build.
⚠️ Si cambiano i testi qui, non nell'HTML: la prossima generazione sovrascrive le pagine.
"""
import html, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from testi import TESTI  # noqa: E402

U = json.load(open(os.path.join(ROOT, 'scripts/opera/unita.json')))
F = json.load(open(os.path.join(ROOT, 'scripts/opera/fatti.json')))
e = html.escape

def num_it(n): return f'{n:,.0f}'.replace(',', '.')
def num(L, n):
    if L['lingua'] == 'en': return f'{n:,.0f}'
    if L['lingua'] == 'sl': return f'{n:,.0f}'.replace(',', '.')
    return num_it(n)
def euro(L, n): return '€ ' + num(L, n)
def mq(L, s):
    if s is None: return '—'
    return (s.replace(',', '.') if L['lingua'] == 'en' else s) + ' m²'

def minuti(L, sec):
    m = max(1, round(sec / 60))
    return L['min'].format(m=m)
def km(L, metri):
    if metri < 1000: return f'{round(metri / 10) * 10:.0f} m'
    v = f'{metri / 1000:.1f}'
    return (v if L['lingua'] == 'en' else v.replace('.', ',')) + ' km'

def unita_js(L):
    out = []
    for u in U['unita']:
        tipo = L['tipi'][u['tipo']]
        piano = L['piani'][u['piano']]
        dati = [
            [L['scheda']['piano'], piano],
            [L['scheda']['tipologia'], tipo],
            [L['scheda']['camere'], str(u['camere'])],
            [L['scheda']['bagni'], str(u['bagni'])],
            [L['scheda']['commerciale'], mq(L, u['commerciale'])],
            [L['scheda']['esterna'], L['scheda']['giardino_mq'].format(mq=mq(L, u['esterna'])) if u['esterna'] else L['scheda']['veranda_si']],
            [L['scheda']['posto'], L['scheda']['posto_giardino'] if u.get('parcheggio_giardino') else L['scheda']['posto_incluso']],
            [L['scheda']['classe'], L['scheda']['classe_v']],
        ]
        vista = F.get('vista', {}).get(u['n'], {}).get(L['lingua'])
        out.append({
            'n': u['n'], 'venduta': u['venduta'], 'prezzo': u['prezzo'], 'piano': u['piano'],
            'titolo': L['scheda']['titolo'].format(n=u['n'], piano=piano),
            'tipologia': f"{tipo} · {mq(L, u['commerciale'])}",
            'prezzoBreve': ('€ ' + (f"{u['prezzo'] / 1000:.0f}" + ('k' if L['lingua'] == 'en' else '.000'))) if u['prezzo'] else '',
            'dati': dati, 'pianta': not u['venduta'], 'vista': vista,
        })
    return out

def luoghi_js(L):
    out = []
    for p in F.get('luoghi', []):
        if not p.get('mondo') or not p.get('etichetta'): continue
        nome = p['nome'][L['lingua']]
        sotto = ''
        if p.get('piedi_s') and p['piedi_s'] < 40 * 60: sotto = L['a_piedi_breve'].format(t=minuti(L, p['piedi_s']))
        elif p.get('auto_s'): sotto = L['in_auto_breve'].format(t=minuti(L, p['auto_s']))
        alto = 26 if p['k'] == 'castello_mastio' else (14 if p['mondo'][1] < 5 else 8)
        out.append({'nome': nome, 'sotto': sotto, 'mondo': [p['mondo'][0], p['mondo'][1] + alto, p['mondo'][2]]})
    return out

def tempi_html(L):
    righe = []
    for modo in ('piedi', 'auto'):
        for p in F.get('luoghi', []):
            s = p.get(modo + '_s'); d = p.get(modo + '_m')
            if not s or p.get('solo') not in (None, modo): continue
            if modo == 'piedi' and s > 40 * 60: continue
            if modo == 'auto' and p.get('piedi_s') and p['piedi_s'] <= 25 * 60 and not p.get('anche_auto'): continue
            nascosto = '' if modo == 'piedi' else ' hidden'
            righe.append(f'<li data-modo="{modo}"{nascosto}><span>{e(p["nome"][L["lingua"]])}</span><span class="d">{km(L, d)}</span><span class="t">{minuti(L, s)}</span></li>')
    return '\n'.join(righe)

def fasi_html(L):
    out = []
    for i, f in enumerate(F['fasi'], start=1):
        t = f[L['lingua']]
        cit = ''
        if t.get('citazione'):
            cit = f'<span class="fonte"><q lang="it">{e(t["citazione"])}</q> — {e(L["capitolato_fonte"])}</span>'
        lato = ' destra' if i % 2 == 0 else ''
        out.append(f'''<div class="palco__passo{lato}" data-stato="costruzione:{i}">
      <div class="carta3d rivela"><div class="kicker"><i>{i}</i>{e(t["fase"])}</div><h3 class="h3">{e(t["titolo"])}</h3><p>{e(t["testo"])}</p>{cit}</div>
    </div>''')
    return '\n'.join(out)

def fasi_indice(L):
    return '\n'.join(f'<li><span>{e(f[L["lingua"]]["fase"])}</span></li>' for f in F['fasi'])

def galleria_html(L, base):
    out = []
    for g in F['galleria']:
        tag = L['tag'][g['tag']]
        cls = ' tag-ai--vero' if g['tag'] == 'rendering' else ''
        src = g['file']
        stem = os.path.splitext(os.path.basename(src))[0]
        larg = g.get('larghezze', [640, 1024, 1600])
        sizes = '(max-width: 900px) 78vw, 820px'
        av = ', '.join(f'{base}images/resp/{stem}-{w}.avif {w}w' for w in larg)
        wb = ', '.join(f'{base}images/resp/{stem}-{w}.webp {w}w' for w in larg)
        out.append(f'''<figure><picture><source type="image/avif" srcset="{av}" sizes="{sizes}"><source type="image/webp" srcset="{wb}" sizes="{sizes}"><img src="{base}{src}" alt="{e(g['alt'][L['lingua']])}" width="{g['w']}" height="{g['h']}" loading="lazy" decoding="async"></picture><span class="tag-ai{cls}" title="{e(L['tag_titolo'][g['tag']])}">{e(tag)}</span><figcaption>{e(g['didascalia'][L['lingua']])}</figcaption></figure>''')
    return '\n'.join(out)

def materiali_html(L, base):
    out = []
    for m in F['materiali']:
        t = m[L['lingua']]
        chips = ''.join(f'<span class="tinta"><i style="background:{c}"></i>{e(n[L["lingua"]])}</span>' for c, n in m['colori'])
        out.append(f'<figure class="rivela"><div class="tinte">{chips}</div><figcaption><b>{e(t["titolo"])}</b><span>{e(t["testo"])}</span></figcaption></figure>')
    return '\n'.join(out)

def voci_html(L):
    return '\n'.join(f'<div class="rivela"><i>{i:02d}</i><div><h3>{e(v[L["lingua"]]["titolo"])}</h3><p>{e(v[L["lingua"]]["testo"])}</p></div></div>' for i, v in enumerate(F['voci'], start=1))

def elenco_case(L):
    out = []
    for u in U['unita']:
        tipo = L['tipi'][u['tipo']]
        if u['venduta']:
            dx = e(L['venduta'])
        else:
            dx = euro(L, u['prezzo'])
        cls = ' class="venduta"' if u['venduta'] else ''
        out.append(f'<li><button type="button" data-unita="{u["n"]}"{cls}><b>{u["n"]}</b><span>{e(L["piani_breve"][u["piano"]])} · {e(tipo)} · {mq(L, u["commerciale"])}</span><em>{dx}</em></button></li>')
    return '\n'.join(out)

def opzioni_conto(L):
    return '\n'.join(f'<option value="{u["n"]}"{" selected" if u["n"] == "6" else ""}>{e(L["scheda"]["titolo"].format(n=u["n"], piano=L["piani"][u["piano"]]))} — {euro(L, u["prezzo"])}</option>' for u in U['unita'] if not u['venduta'])

def ore_unita(L):
    out = []
    for u in U['unita']:
        no = ' class="no"' if u['venduta'] else ''
        out.append(f'<div data-unita="{u["n"]}"{no}><small>{e(L["casa_n"].format(n=u["n"]))}{" · " + e(L["venduta"]) if u["venduta"] else ""}</small><b>—</b></div>')
    return '\n'.join(out)

ICON = {
    'menu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    'x': '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    'giu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    'play': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>',
    'sx': '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"/></svg>',
    'dx': '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
}

def pagina(L):
    lg = L['lingua']
    base = './assets/' if lg == 'it' else '../assets/'
    radice = './' if lg == 'it' else '../'
    url = 'https://elegieduino.it/' + ('' if lg == 'it' else lg + '/')
    link_lingua = {'it': radice, 'en': radice + 'en/' if lg == 'it' else ('./' if lg == 'en' else '../en/'), 'sl': radice + 'sl/' if lg == 'it' else ('./' if lg == 'sl' else '../sl/')}
    if lg != 'it': link_lingua['it'] = '../'
    privacy = './privacy.html'
    disponibili = [u for u in U['unita'] if not u['venduta']]
    prezzo_min = min(u['prezzo'] for u in disponibili)
    dati = {
        'lingua': lg, 'base': base, 'lat': F['lat'], 'lon': F['lon'],
        'unita': unita_js(L), 'luoghi': luoghi_js(L), 'postoAuto': U['posto_auto_extra_prezzo'], 'postiExtra': U['posti_auto_extra'],
        'testi': L['js'],
    }
    jsonld = {
        '@context': 'https://schema.org', '@graph': [
            {'@type': 'WebSite', '@id': 'https://elegieduino.it/#website', 'url': 'https://elegieduino.it/', 'name': 'Elegie Duino', 'inLanguage': ['it', 'en', 'sl'], 'publisher': {'@id': 'https://triestevillas.com/#agency'}},
            {'@type': 'WebPage', '@id': url + '#webpage', 'url': url, 'name': L['titolo'], 'inLanguage': lg, 'isPartOf': {'@id': 'https://elegieduino.it/#website'}, 'about': {'@id': 'https://elegieduino.it/#residenze'}, 'primaryImageOfPage': 'https://elegieduino.it/assets/images/drone-duino.jpg'},
            {'@type': 'ApartmentComplex', '@id': 'https://elegieduino.it/#residenze', 'name': 'Elegie Duino', 'description': L['jsonld_descr'], 'url': 'https://elegieduino.it/', 'image': 'https://elegieduino.it/assets/images/drone-duino.jpg', 'numberOfAccommodationUnits': 8, 'numberOfAvailableAccommodationUnits': len(disponibili), 'address': {'@type': 'PostalAddress', 'streetAddress': 'Località Duino 69/A', 'addressLocality': 'Duino Aurisina', 'postalCode': '34011', 'addressRegion': 'TS', 'addressCountry': 'IT'}, 'geo': {'@type': 'GeoCoordinates', 'latitude': F['lat'], 'longitude': F['lon']}},
            {'@type': 'RealEstateAgent', '@id': 'https://triestevillas.com/#agency', 'name': 'TriesteVillas', 'legalName': 'TriesteVillas srl', 'vatID': 'IT01235580329', 'url': 'https://triestevillas.com', 'telephone': '+393318940822', 'email': 'richieste@triestevillas.com'},
        ]}
    fatti_apertura = ''.join(f'<li>{x}</li>' for x in L['apertura']['fatti'](len(disponibili), euro(L, prezzo_min)))
    A = L['apertura']; LU = L['luogo']; N = L['nome']; CO = L['costruzione']; LC = L['luce']; CA = L['case']; G = L['dentro']; CT = L['conto']; CP = L['capitolato']; CH = L['chi']; K = L['contatti']
    return f'''<!doctype html>
<html lang="{lg}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="google-site-verification" content="wDNn457_HwX7O_N0yoqqtISGwWY10QP7rJBd195c40k">
<title>{e(L['titolo'])}</title>
<meta name="description" content="{e(L['descrizione'])}">
<link rel="alternate" hreflang="it" href="https://elegieduino.it/">
<link rel="alternate" hreflang="en" href="https://elegieduino.it/en/">
<link rel="alternate" hreflang="sl" href="https://elegieduino.it/sl/">
<link rel="alternate" hreflang="x-default" href="https://elegieduino.it/">
<link rel="canonical" href="{url}">
<link rel="icon" type="image/x-icon" href="{base}favicons/favicon.ico">
<link rel="icon" type="image/png" sizes="32x32" href="{base}favicons/icon-32.png">
<link rel="icon" type="image/png" sizes="192x192" href="{base}favicons/icon-192.png">
<link rel="apple-touch-icon" sizes="180x180" href="{base}favicons/apple-touch-icon.png">
<meta name="theme-color" content="#0d171c">
<meta property="og:title" content="{e(L['og_titolo'])}">
<meta property="og:description" content="{e(L['descrizione'])}">
<meta property="og:image" content="https://elegieduino.it/assets/images/drone-duino.jpg">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="{L['og_locale']}">
<meta property="og:type" content="website">
<link rel="preload" href="{base}fonts/cormorant-garamond-latin-300-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="{base}fonts/inter-tight-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" as="image" type="image/avif" imagesrcset="{base}images/resp/drone-duino-800.avif 800w, {base}images/resp/drone-duino-1280.avif 1280w, {base}images/resp/drone-duino-1920.avif 1920w, {base}images/resp/drone-duino-2400.avif 2400w" imagesizes="(max-aspect-ratio: 16/9) 178vh, 100vw" media="(min-aspect-ratio: 4/5)">
<link rel="stylesheet" href="{base}css/opera.css">
<script type="importmap">{{"imports":{{"three":"{base}vendor/three/three.module.min.js","three/addons/":"{base}vendor/three/addons/"}}}}</script>
<script type="application/ld+json">{json.dumps(jsonld, ensure_ascii=False, separators=(',', ':'))}</script>
</head>
<body>
<a class="salta" href="#case">{e(L['salta'])}</a>

<header class="barra" id="barra">
  <a class="barra__marchio" href="#apertura" aria-label="Elegie Duino">
    <img src="{base}logos/resp/elegie-duino-alpha-100.png" alt="" width="100" height="89"><span>Elegie Duino</span>
  </a>
  <nav class="barra__voci" aria-label="{e(L['menu_aria'])}">
    {''.join(f'<a href="#{k}">{e(v)}</a>' for k, v in L['menu'])}
  </nav>
  <div class="barra__lingue">
    <a href="{link_lingua['it']}" hreflang="it" lang="it"{' aria-current="true"' if lg == 'it' else ''}>IT</a>
    <a href="{link_lingua['en']}" hreflang="en" lang="en"{' aria-current="true"' if lg == 'en' else ''}>EN</a>
    <a href="{link_lingua['sl']}" hreflang="sl" lang="sl"{' aria-current="true"' if lg == 'sl' else ''}>SL</a>
  </div>
  <a class="barra__cta" href="#contatti" data-vai-contatti>{e(L['cta_barra'])}</a>
  <button class="barra__menu" type="button" aria-label="{e(L['menu_aria'])}" aria-expanded="false">{ICON['menu']}</button>
</header>

<div id="tela" aria-hidden="true"></div>
<div class="etichette3d" aria-hidden="true"></div>
<div class="carica3d" hidden aria-live="polite"></div>
<ol class="fasi" aria-hidden="true">
{fasi_indice(L)}
</ol>

<main id="contenuto">

<section class="apertura" id="apertura" aria-label="{e(A['aria'])}">
  <div class="apertura__tenda">
    <div class="apertura__foto">
      <picture>
        <source media="(max-aspect-ratio: 4/5)" type="image/avif" srcset="{base}images/resp/drone-duino-verticale-750.avif 750w, {base}images/resp/drone-duino-verticale-1080.avif 1080w" sizes="100vw">
        <source media="(max-aspect-ratio: 4/5)" type="image/webp" srcset="{base}images/resp/drone-duino-verticale-750.webp 750w, {base}images/resp/drone-duino-verticale-1080.webp 1080w" sizes="100vw">
        <source type="image/avif" srcset="{base}images/resp/drone-duino-800.avif 800w, {base}images/resp/drone-duino-1280.avif 1280w, {base}images/resp/drone-duino-1920.avif 1920w, {base}images/resp/drone-duino-2400.avif 2400w" sizes="(max-aspect-ratio: 16/9) 178vh, 100vw">
        <source type="image/webp" srcset="{base}images/resp/drone-duino-800.webp 800w, {base}images/resp/drone-duino-1280.webp 1280w, {base}images/resp/drone-duino-1920.webp 1920w, {base}images/resp/drone-duino-2400.webp 2400w" sizes="(max-aspect-ratio: 16/9) 178vh, 100vw">
        <img src="{base}images/drone-duino.jpg" alt="{e(A['alt_foto'])}" width="2400" height="1350" fetchpriority="high" decoding="async">
      </picture>
    </div>
    <div class="apertura__velo"></div>
    <span class="etichetta-foto" title="{e(A['etichetta_foto_titolo'])}">{e(A['etichetta_foto'])}</span>
    <div class="apertura__testo">
      <p class="kicker">{e(A['kicker'])}</p>
      <div class="apertura__titolo">
        <h1 class="h-display">Elegie<span class="sr"> Duino — {e(A['sr_titolo'])}</span></h1>
        <div class="apertura__sotto"><p class="lede">{A['sotto']}</p></div>
      </div>
      <ul class="apertura__fatti num">{fatti_apertura}</ul>
      <div class="apertura__azioni">
        <a class="btn btn--chiaro" href="#case">{e(A['cta1'])}</a>
        <a class="btn btn--linea" href="#contatti" data-vai-contatti>{e(A['cta2'])}</a>
      </div>
    </div>
    <div class="apertura__passi" aria-live="polite">
      <div class="passo-apertura"><p class="kicker">{e(A['p1_kicker'])}</p><h2 class="h3">{e(A['p1_titolo'])}</h2><p>{e(A['p1_testo'])}</p></div>
      <div class="passo-apertura"><p class="kicker">{e(A['p2_kicker'])}</p><h2 class="h3">{e(A['p2_titolo'])}</h2><p>{e(A['p2_testo'])}</p></div>
    </div>
    <div class="scorri" aria-hidden="true">{e(A['scorri'])}</div>
  </div>
</section>

<section class="palco" id="luogo" aria-labelledby="luogo-t">
  <div class="palco__passo palco__passo--alto" data-stato="luogo">
    <div class="carta3d carta3d--larga rivela">
      <p class="kicker">{e(LU['kicker'])}</p>
      <h2 class="h2" id="luogo-t">{LU['titolo']}</h2>
      <p>{e(LU['testo'])}</p>
      <div class="commuta" role="group" aria-label="{e(LU['commuta_aria'])}"><button type="button" data-modo="piedi" aria-pressed="true">{e(LU['a_piedi'])}</button><button type="button" data-modo="auto" aria-pressed="false">{e(LU['in_auto'])}</button></div>
      <ul class="tempi num">
{tempi_html(L)}
      </ul>
      <span class="fonte">{e(LU['fonte'])}</span>
    </div>
  </div>
  <div class="palco__passo destra" data-stato="luogo">
    <div class="carta3d rivela"><p class="kicker">{e(LU['k2'])}</p><h3 class="h3">{e(LU['t2'])}</h3><p>{e(LU['p2'])}</p></div>
  </div>
  <div class="ripiego foglio--notte" style="padding:0 var(--gutter) 40px"><picture><source type="image/avif" srcset="{base}images/resp/aerial-originale-1280.avif"><img src="{base}images/aerial-originale.jpg" alt="{e(A['alt_foto'])}" loading="lazy" width="2400" height="1350"></picture></div>
</section>

<section class="nome" id="nome" aria-labelledby="nome-t">
  <canvas class="nome__vento" aria-hidden="true"></canvas>
  <div class="nome__dentro">
    <div class="rivela">
      <p class="kicker" style="color:var(--legno)">{e(N['kicker'])}</p>
      <h2 class="nome__anno" id="nome-t">{e(N['anno'])}<em>{e(N['luogo'])}</em></h2>
    </div>
    <div class="nome__racconto rivela">
      {''.join(f'<p>{e(p)}</p>' for p in N['racconto'])}
      <figure class="verso">
        <blockquote lang="de">{''.join(f'<p>{e(r)}</p>' for r in F['rilke']['versi'])}</blockquote>
        <p class="trad">{e(N['traduzione'])}</p>
        <figcaption>{e(N['didascalia'])}</figcaption>
      </figure>
    </div>
  </div>
</section>

<section class="palco" id="costruzione" aria-labelledby="costruzione-t">
  <div class="palco__passo palco__passo--alto" data-stato="costruzione:0">
    <div class="carta3d carta3d--larga rivela"><p class="kicker">{e(CO['kicker'])}</p><h2 class="h2" id="costruzione-t">{CO['titolo']}</h2><p>{e(CO['testo'])}</p></div>
  </div>
{fasi_html(L)}
</section>

<section class="palco" id="luce" aria-labelledby="luce-t">
  <div class="palco__passo palco__passo--alto" data-stato="luce">
    <div class="carta3d carta3d--larga rivela"><p class="kicker">{e(LC['kicker'])}</p><h2 class="h2" id="luce-t">{LC['titolo']}</h2><p>{e(LC['testo'])}</p></div>
  </div>
  <div class="palco__passo" data-stato="luce">
    <div class="sole">
      <h3 class="h3">{e(LC['comandi'])}</h3>
      <div class="sole__righe">
        <div class="sole__giorni" role="group" aria-label="{e(LC['giorni_aria'])}">
          <button type="button" data-giorno="oggi" aria-pressed="false">{e(LC['oggi'])}</button>
          <button type="button" data-giorno="355" aria-pressed="false">{e(LC['g_inverno'])}</button>
          <button type="button" data-giorno="80" aria-pressed="false">{e(LC['g_primavera'])}</button>
          <button type="button" data-giorno="172" aria-pressed="false">{e(LC['g_estate'])}</button>
        </div>
        <label>{e(LC['giorno'])}<input type="range" id="luce-giorno" min="1" max="365" value="172"><output id="luce-giorno-out"></output></label>
        <label>{e(LC['ora'])}<input type="range" id="luce-ora" min="300" max="1290" step="5" value="1020"><output id="luce-ora-out"></output></label>
      </div>
      <div class="sole__dati num"><span>{e(LC['alba'])} <b id="luce-alba">—</b></span><span>{e(LC['tramonto'])} <b id="luce-tramonto">—</b></span><span>{e(LC['altezza'])} <b id="luce-alt">—</b></span><button type="button" class="sole__play" aria-pressed="false" aria-label="{e(LC['play'])}">{ICON['play']}</button></div>
      <p class="nota" style="margin:16px 0 6px">{e(LC['ore_titolo'])}</p>
      <div class="sole__ore num">
{ore_unita(L)}
      </div>
      <details class="sole__come"><summary>{e(LC['come'])}</summary><p class="nota">{e(LC['nota'])}</p></details>
    </div>
  </div>
</section>

<section class="palco" id="case" aria-labelledby="case-t">
  <div class="palco__passo palco__passo--case" data-stato="case">
    <div class="case">
      <p class="kicker" style="color:var(--sale-2)">{e(CA['kicker'])}</p>
      <h2 class="h3" id="case-t">{e(CA['titolo'])}</h2>
      <div class="case__piani solo3d" role="group" aria-label="{e(CA['piani_aria'])}">
        <button type="button" data-piano="" aria-pressed="true">{e(CA['tutto'])}</button>
        <button type="button" data-piano="terra" aria-pressed="false">{e(CA['terra'])}</button>
        <button type="button" data-piano="primo" aria-pressed="false">{e(CA['primo'])}</button>
      </div>
      <ul class="case__elenco num">
{elenco_case(L)}
      </ul>
      <p class="case__suggerimento solo3d">{e(CA['suggerimento'])}</p>
      <p class="case__suggerimento">{e(CA['nota'])}</p>
    </div>
  </div>
</section>

<section class="foglio foglio--bianco" id="dentro" aria-labelledby="dentro-t">
  <div class="foglio__dentro">
    <div class="testata"><div class="rivela"><p class="kicker">{e(G['kicker'])}</p><h2 class="h2" id="dentro-t">{G['titolo']}</h2></div><p class="lede rivela">{e(G['testo'])}</p></div>
    <div class="galleria" tabindex="0" aria-label="{e(G['aria'])}">
{galleria_html(L, base)}
    </div>
    <div class="galleria__comandi"><button type="button" data-dir="indietro" aria-label="{e(G['prec'])}">{ICON['sx']}</button><button type="button" data-dir="avanti" aria-label="{e(G['succ'])}">{ICON['dx']}</button></div>
  </div>
</section>

<section class="foglio" id="conto" aria-labelledby="conto-t">
  <div class="foglio__dentro">
    <div class="testata"><div class="rivela"><p class="kicker">{e(CT['kicker'])}</p><h2 class="h2" id="conto-t">{CT['titolo']}</h2></div><p class="lede rivela">{e(CT['testo'])}</p></div>
    <div class="conto">
      <div class="conto__scelte">
        <div class="campo"><label for="conto-unita">{e(CT['casa'])}</label><select id="conto-unita">{opzioni_conto(L)}</select></div>
        <div class="campo"><fieldset><legend>{e(CT['prima'])}</legend><div class="scelta"><button type="button" data-prima="si" aria-pressed="true">{e(CT['si'])}</button><button type="button" data-prima="no" aria-pressed="false">{e(CT['no'])}</button></div></fieldset></div>
        <div class="campo"><fieldset><legend>{e(CT['posti'])}</legend><div class="contatore"><button type="button" data-posti="-1" aria-label="{e(CT['meno'])}">−</button><output id="c-posti-n">0</output><button type="button" data-posti="1" aria-label="{e(CT['piu'])}">+</button></div><p class="nota" style="margin-top:8px">{e(CT['posti_nota'])}</p></fieldset></div>
      </div>
      <div class="ricevuta" aria-live="polite">
        <table class="num">
          <tr><td>{e(CT['r_prezzo'])}<small>{e(CT['r_prezzo_n'])}</small></td><td id="c-prezzo"></td></tr>
          <tr><td><span id="c-iva-et"></span><small>{e(CT['r_iva_n'])}</small></td><td id="c-iva"></td></tr>
          <tr><td>{e(CT['r_imposte'])}<small>{e(CT['r_imposte_n'])}</small></td><td id="c-imposte"></td></tr>
          <tr class="tot"><td>{e(CT['r_totale'])}</td><td id="c-totale"></td></tr>
          <tr id="c-posti-riga" hidden><td><span id="c-posti-et"></span></td><td id="c-posti"></td></tr>
        </table>
        <p class="nota">{e(CT['nota'])}</p>
      </div>
    </div>
  </div>
</section>

<section class="foglio foglio--bianco" id="capitolato" aria-labelledby="capitolato-t">
  <div class="foglio__dentro">
    <div class="testata"><div class="rivela"><p class="kicker">{e(CP['kicker'])}</p><h2 class="h2" id="capitolato-t">{CP['titolo']}</h2></div><div class="rivela"><p class="lede">{e(CP['testo'])}</p><p style="margin-top:22px"><button type="button" class="btn btn--scuro" data-apri-brochure>{e(CP['brochure'])}</button></p></div></div>
    <div class="materiali">
{materiali_html(L, base)}
    </div>
    <div class="voci">
{voci_html(L)}
    </div>
  </div>
</section>

<section class="foglio" id="chi" aria-labelledby="chi-t">
  <div class="foglio__dentro">
    <div class="testata"><div class="rivela"><p class="kicker">{e(CH['kicker'])}</p><h2 class="h2" id="chi-t">{CH['titolo']}</h2></div><p class="lede rivela">{e(CH['testo'])}</p></div>
    <div class="chi">
      <div class="rivela"><p class="kicker" style="margin:0">{e(CH['sviluppo'])}</p><img src="{base}logos/resp/riccesi-holding-247.png" alt="Ennio Riccesi Holding" width="247" height="192" loading="lazy"><p>{e(CH['riccesi'])}</p><a class="vai" href="https://riccesi.eu/" target="_blank" rel="noopener">riccesi.eu</a></div>
      <div class="rivela"><p class="kicker" style="margin:0">{e(CH['progetto'])}</p><img src="{base}logos/resp/soldano-192.png" alt="Studio Architettura Soldano" width="192" height="192" loading="lazy"><p>{e(CH['soldano'])}</p><a class="vai" href="https://www.studioarchitetturasoldano.it/" target="_blank" rel="noopener">studioarchitetturasoldano.it</a></div>
      <div class="rivela"><p class="kicker" style="margin:0">{e(CH['vendite'])}</p><img src="{base}logos/resp/triestevillas-192.png" alt="TriesteVillas" width="192" height="192" loading="lazy"><p>{e(CH['tsv'])}</p><a class="vai" href="https://triestevillas.com" target="_blank" rel="noopener">triestevillas.com</a></div>
    </div>
    <div class="calendario num">{''.join(f'<div class="rivela"><b>{e(a)}</b><span>{e(b)}</span></div>' for a, b in CH['calendario'])}</div>
  </div>
</section>

<section class="foglio foglio--notte" id="contatti" aria-labelledby="contatti-t">
  <div class="foglio__dentro contatti">
    <div>
      <p class="kicker">{e(K['kicker'])}</p>
      <h2 class="h2" id="contatti-t">{K['titolo']}</h2>
      <p class="lede" style="margin-top:22px">{e(K['testo'])}</p>
      <div class="contatti__righe">
        <a href="tel:+393318940822"><span>{e(K['telefono'])}</span>{e(L['telefono'])}</a>
        <a href="https://wa.me/393318940822" target="_blank" rel="noopener"><span>WhatsApp</span>{e(L['telefono'])}</a>
        <a href="mailto:richieste@triestevillas.com"><span>Email</span>richieste@triestevillas.com</a>
        <a href="https://maps.google.com/?q=Localit%C3%A0+Duino+69%2FA+Duino+Aurisina" target="_blank" rel="noopener"><span>{e(K['cantiere'])}</span>Località Duino 69/A · Duino Aurisina (TS)</a>
        <a href="https://maps.google.com/?q=Via+Torino+34+Trieste" target="_blank" rel="noopener"><span>{e(K['ufficio'])}</span>Via Torino 34 · Trieste</a>
      </div>
    </div>
    <div>
      <form class="form" id="info-form" novalidate>
        <div aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden"><label for="if-hp">{e(K['hp'])}</label><input type="text" id="if-hp" name="hp_ed" tabindex="-1" autocomplete="off"></div>
        <div class="form__riga"><label class="form__label" for="if-nome">{e(K['nome'])} <span class="req">*</span></label><input class="form__input" type="text" id="if-nome" name="nome" required maxlength="120" autocomplete="name"></div>
        <div class="form__riga form__riga--due">
          <div class="form__riga"><label class="form__label" for="if-email">Email</label><input class="form__input" type="email" id="if-email" name="email" maxlength="160" autocomplete="email"></div>
          <div class="form__riga"><label class="form__label" for="if-tel">{e(K['telefono'])}</label><input class="form__input" type="tel" id="if-tel" name="telefono" maxlength="40" autocomplete="tel"></div>
        </div>
        <p class="form__hint">{e(K['uno_dei_due'])}</p>
        <div class="form__riga"><label class="form__label" for="if-msg">{e(K['messaggio'])}</label><textarea class="form__input" id="if-msg" name="messaggio" rows="4" maxlength="2000" placeholder="{e(K['messaggio_ph'])}"></textarea></div>
        <label class="form__consenso"><input type="checkbox" id="if-privacy" name="privacy" value="si" required><span>{K['consenso'].format(privacy=privacy)} <span class="req">*</span></span></label>
        <p class="form__errore" id="if-error" role="alert"></p>
        <div><button type="submit" class="btn btn--chiaro"><span class="btn__label">{e(K['invia'])}</span></button></div>
      </form>
      <div class="form__ok" id="info-ok" role="status" tabindex="-1"><p class="h3">{e(K['ok_titolo'])}</p><p>{K['ok_testo']}</p></div>
    </div>
  </div>
</section>

</main>

<aside class="scheda" aria-hidden="true" aria-labelledby="scheda-titolo" role="dialog">
  <div class="scheda__testa"><p class="kicker" style="margin:0">Elegie Duino</p><button type="button" class="scheda__chiudi" aria-label="{e(L['chiudi'])}">{ICON['x']}</button></div>
  <div class="scheda__corpo">
    <div class="scheda__titolo"><b id="scheda-numero" class="num"></b><div><h2 class="h3" id="scheda-titolo"></h2><p class="nota" id="scheda-tipo" style="margin:4px 0 0"></p></div></div>
    <div class="scheda__prezzo"><div id="scheda-prezzo"></div><span id="scheda-prezzo-nota"></span></div>
    <dl class="scheda__dati" id="scheda-dati"></dl>
    <div class="scheda__sezione"><h4>{e(L['scheda']['pianta'])}</h4><div class="scheda__pianta" id="scheda-pianta"></div><p class="nota">{e(L['scheda']['pianta_nota'])}</p></div>
    <div class="scheda__sezione"><h4>{e(L['scheda']['sole'])}</h4><div class="scheda__sole num" id="scheda-sole"></div><p class="nota" style="margin-top:8px">{e(L['scheda']['sole_nota'])}</p></div>
    <div class="scheda__sezione" id="scheda-vista" hidden><h4>{e(L['scheda']['vista'])}</h4><p></p></div>
    <div class="scheda__azioni" id="scheda-azioni">
      <button type="button" class="btn btn--scuro" data-scheda-richiedi>{e(L['scheda']['richiedi'])}</button>
      <button type="button" class="btn btn--linea" data-scheda-conto>{e(L['scheda']['conto'])}</button>
    </div>
  </div>
</aside>
<div class="velo-scheda"></div>

<div class="lente" role="dialog" aria-modal="true" aria-label="{e(L['scheda']['pianta'])}"><div class="lente__tela"></div><button type="button" class="btn btn--scuro lente__chiudi">{e(L['chiudi'])}</button></div>

<div class="modale" id="brochure-modale" role="dialog" aria-modal="true" aria-labelledby="brochure-t">
  <div class="modale__pannello">
    <button type="button" class="modale__chiudi" data-chiudi-modale aria-label="{e(L['chiudi'])}">{ICON['x']}</button>
    <p class="kicker" style="color:var(--legno)">{e(L['brochure']['kicker'])}</p>
    <h2 class="h3" id="brochure-t" style="margin-bottom:10px">{e(L['brochure']['titolo'])}</h2>
    <p class="nota" style="margin-bottom:18px">{e(L['brochure']['testo'])}</p>
    <form class="form" id="brochure-form" novalidate>
      <div aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden"><label for="bf-hp">{e(K['hp'])}</label><input type="text" id="bf-hp" name="hp_ed" tabindex="-1" autocomplete="off"></div>
      <div class="form__riga"><label class="form__label" for="bf-nome">{e(K['nome'])} <span class="req">*</span></label><input class="form__input" type="text" id="bf-nome" name="nome" required maxlength="120" autocomplete="name"></div>
      <div class="form__riga"><label class="form__label" for="bf-email">Email <span class="req">*</span></label><input class="form__input" type="email" id="bf-email" name="email" required maxlength="160" autocomplete="email"></div>
      <div class="form__riga"><label class="form__label" for="bf-tel">{e(K['telefono'])}</label><input class="form__input" type="tel" id="bf-tel" name="telefono" maxlength="40" autocomplete="tel"></div>
      <label class="form__consenso"><input type="checkbox" id="bf-privacy" name="privacy" value="si" required><span>{L['brochure']['consenso'].format(privacy=privacy)} <span class="req">*</span></span></label>
      <p class="form__errore" id="bf-error" role="alert"></p>
      <div><button type="submit" class="btn btn--scuro"><span class="btn__label">{e(L['brochure']['invia'])}</span></button></div>
    </form>
    <div class="form__ok" id="brochure-ok" role="status" tabindex="-1"><p class="h3">{e(L['brochure']['ok_titolo'])}</p><p>{e(L['brochure']['ok_testo'])} <a href="{base}pdf/elegie-duino-brochure.pdf" target="_blank" rel="noopener">{e(L['brochure']['apri'])}</a></p></div>
  </div>
</div>

<footer class="piede">
  <div class="piede__dentro">
    <div class="piede__righe"><span><b style="color:var(--sale)">Elegie Duino</b> · {e(L['piede']['nuova'])}</span><a href="{privacy}">Privacy</a><a href="#" data-cc-prefs>{e(L['piede']['cookie'])}</a><a href="mailto:richieste@triestevillas.com">richieste@triestevillas.com</a>{''.join(f'<a href="{link_lingua[k]}" hreflang="{k}" lang="{k}">{v}</a>' for k, v in L['piede']['lingue'])}</div>
    <div class="piede__trasparenza">{''.join(f'<p style="margin:0">{x}</p>' for x in L['piede']['trasparenza'])}</div>
    <p style="margin:0">{e(L['piede']['legale'])}</p>
  </div>
</footer>

<script type="application/json" id="dati">{json.dumps(dati, ensure_ascii=False, separators=(',', ':'))}</script>
<script type="module" src="{base}js/opera/app.js"></script>
<script src="{base}js/consenso.js" data-ga="G-YL07ZJ3PVX"></script>
<script src="{base}js/provenienza.js"></script>
<script src="{base}js/contatore.js" defer></script>
</body>
</html>
'''

def main():
    for lg, L in TESTI.items():
        out = os.path.join(ROOT, 'index.html' if lg == 'it' else f'{lg}/index.html')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        open(out, 'w', encoding='utf-8').write(pagina(L))
        print('scritto', os.path.relpath(out, ROOT))

if __name__ == '__main__':
    main()
