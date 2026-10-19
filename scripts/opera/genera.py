#!/usr/bin/env python3
"""Genera le quattro pagine di elegieduino.it (IT, EN, DE, SL) da un solo modello.

    python3 scripts/opera/genera.py

Fonti: scripts/opera/unita.json (case e prezzi), scripts/opera/fatti.json (luoghi e tempi misurati, scene,
costruzione), scripts/opera/pianta_piani.json (le piante per piano, ridisegnate dall'esecutivo, e i contorni delle
case), scripts/opera/testi.py
(le parole nelle quattro lingue). Le pagine prodotte (index.html, en/, de/, sl/) si committano: GitHub Pages non ha
un build. Scrive anche il sapere del concierge (assets/concierge/conoscenza.json, scripts/opera/conoscenza.py).
⚠️ Si cambiano i testi qui, non nell'HTML: la prossima generazione sovrascrive le pagine.

La pagina corta (18/10/2026, Martino: «è infinito, troppa roba in home»): la foto vera che diventa modello e il
cantiere che sorge; il paese, misurato; la sera in giardino; le case piano per piano, coi prezzi accanto e il conto
nella scheda di ogni casa; in alto, la veranda; il sole ora per ora; la costruzione a strati con il capitolato in
una riga; le tre firme; i contatti. Niente galleria, niente pagine di capitolato, Rilke in un accenno.
"""
import html, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts'))
from testi import TESTI  # noqa: E402
from varianti import FOTO  # noqa: E402
import conoscenza  # noqa: E402

U = json.load(open(os.path.join(ROOT, 'scripts/opera/unita.json')))
F = json.load(open(os.path.join(ROOT, 'scripts/opera/fatti.json')))
PP = json.load(open(os.path.join(ROOT, 'scripts/opera/pianta_piani.json')))
e = html.escape
LINGUE = ['it', 'en', 'de', 'sl']
CONCIERGE = 'https://tsv-pg.vercel.app/api/web/ed-chat'   # CRM, lib/ed-chat.ts (porta pubblica, CORS)
TOUR_TERRENO = 'https://my.matterport.com/show/?m=AQp72tPqpWV'
TELEFONO = '+393318940822'
IMPOSTE = 600
# la costruzione a strati in cinque passi: quante fasi del modello 3D (scena.js, FASI) sono montate a ogni passo
FASI_PASSI = [1, 3, 5, 7, 8]

def num_it(n): return f'{n:,.0f}'.replace(',', '.')
def num(L, n):
    if L['lingua'] == 'en': return f'{n:,.0f}'
    return num_it(n)
def euro(L, n): return '€\u00a0' + num(L, n)   # spazio indivisibile: «€» non va mai a capo da solo
def mq(L, s):
    if s is None: return '—'
    return (s.replace(',', '.') if L['lingua'] == 'en' else s) + '\u00a0m²'
def mq_tondi(L, s):
    return f"{round(float(s.replace(',', '.'))):d}\u00a0m²"

def minuti(L, sec):
    m = max(1, round(sec / 60))
    return L['min'].format(m=m)
def km(L, metri):
    if metri < 1000: return f'{round(metri / 10) * 10:.0f} m'
    v = f'{metri / 1000:.1f}'
    return (v if L['lingua'] == 'en' else v.replace('.', ',')) + ' km'

def totali(p): return round(p * 1.04 + IMPOSTE), round(p * 1.10 + IMPOSTE)
def disponibili(): return [u for u in U['unita'] if not u['venduta']]
def colore(n):
    for piano in ('terra', 'primo'):
        if n in PP[piano]['unita']: return PP[piano]['unita'][n]['colore']
    return '#888888'

def vista_breve(n):
    v = F.get('vista', {}).get(n, {}).get('it', '')
    u = next(x for x in U['unita'] if x['n'] == n)
    if 'fessura' in v: return 'fessura'
    return u['piano']

def fuori_breve(L, u):
    if u['esterna']: return L['case']['giardino'].format(mq=mq(L, u['esterna']))
    return L['case']['veranda']

def unita_js(L):
    out = []
    for u in U['unita']:
        tipo = L['tipi'][u['tipo']]
        piano = L['piani'][u['piano']]
        fuori = L['scheda']['giardino_mq'].format(mq=mq(L, u['esterna'])) if u['esterna'] else L['scheda']['veranda_si']
        posto = L['scheda']['posto_giardino'] if u.get('parcheggio_giardino') else L['scheda']['posto_incluso']
        dati = [
            [L['scheda']['piano'], piano],
            [L['scheda']['tipologia'], tipo],
            [L['scheda']['camere'], str(u['camere'])],
            [L['scheda']['bagni'], str(u['bagni'])],
            [L['scheda']['commerciale'], mq(L, u['commerciale'])],
            [L['scheda']['esterna'], fuori],
            [L['scheda']['posto'], posto],
            [L['scheda']['classe'], L['scheda']['classe_v']],
        ]
        vista = F.get('vista', {}).get(u['n'], {}).get(L['lingua'])
        t1, t2 = totali(u['prezzo']) if u['prezzo'] else (None, None)
        out.append({
            'n': u['n'], 'venduta': u['venduta'], 'prezzo': u['prezzo'], 'piano': u['piano'], 'tipo': u['tipo'],
            'colore': colore(u['n']),
            'titolo': L['scheda']['titolo'].format(n=u['n'], piano=piano),
            'tipologia': f"{tipo} · {mq(L, u['commerciale'])}",
            'breve': f"{tipo} · {mq(L, u['commerciale'])} · {fuori_breve(L, u)}",
            'dati': dati, 'pianta': not u['venduta'], 'vista': vista,
            'confronto': {
                'prezzo': u['prezzo'], 'totale1': t1, 'totale2': t2, 'piano': piano, 'tipo': tipo,
                'camere': str(u['camere']), 'bagni': str(u['bagni']), 'mq': mq(L, u['commerciale']),
                'fuori': fuori, 'posto': posto, 'vista': L['confronto']['vista'][vista_breve(u['n'])],
            },
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

def immagine(base, stem, larg, alt, w, h, sizes, attr='loading="lazy" decoding="async"', verticale=None, vert_larg=None):
    av = ', '.join(f'{base}images/resp/{stem}-{x}.avif {x}w' for x in larg)
    wb = ', '.join(f'{base}images/resp/{stem}-{x}.webp {x}w' for x in larg)
    vs = ''
    if verticale:
        vs = (f'<source media="(max-aspect-ratio: 4/5)" type="image/avif" srcset="{", ".join(f"{base}images/resp/{verticale}-{x}.avif {x}w" for x in vert_larg)}" sizes="100vw">'
              f'<source media="(max-aspect-ratio: 4/5)" type="image/webp" srcset="{", ".join(f"{base}images/resp/{verticale}-{x}.webp {x}w" for x in vert_larg)}" sizes="100vw">')
    return f'<picture>{vs}<source type="image/avif" srcset="{av}" sizes="{sizes}"><source type="image/webp" srcset="{wb}" sizes="{sizes}"><img src="{base}images/{stem}.jpg" alt="{e(alt)}" width="{w}" height="{h}" {attr}></picture>'

def tag_html(L, tag):
    cls = ' tag-ai--vero' if tag in ('rendering', 'foto') else ''
    return f'<span class="tag-ai{cls}" title="{e(L["tag_titolo"][tag])}">{e(L["tag"][tag])}</span>'

def scena_html(L, base, i):
    """Una scena a tutta pagina: 0 = la sera in giardino, 1 = in alto, la veranda."""
    V = L['vivere']; lg = L['lingua']
    s = F['vivere'][i]; t = V['scene'][i]
    tutte_terra = [u for u in U['unita'] if u['piano'] == 'terra' and u['esterna']]
    gmin = min(tutte_terra, key=lambda u: float(u['esterna'].replace(',', '.')))
    gmax = max(tutte_terra, key=lambda u: float(u['esterna'].replace(',', '.')))
    libere = [u for u in disponibili() if u['piano'] == 'terra']
    valori = {'gmin': mq_tondi(L, gmin['esterna']), 'gmax': mq_tondi(L, gmax['esterna']), 'glibere': V['glibere'].get(len(libere), '')}
    img = immagine(base, s['file'], FOTO[s['file']], s['alt'][lg], s['w'], s['h'], '100vw',
                   verticale=s.get('verticale'), vert_larg=s.get('verticale_larghezze'))
    video = ''
    if s.get('video'):
        video = f'<video class="scena__video" muted loop playsinline preload="none" data-src="{base}video/{s["video"]}" aria-hidden="true"></video>'
    tag = s['tag_video'] if s.get('video') and s.get('tag_video') else s['tag']
    lato = ' scena--destra' if i % 2 else ''
    return f'''<figure class="scena{lato}" style="--pos:{s.get('pos', '50% 50%')}">
    <div class="scena__media">{img}{video}</div>
    {tag_html(L, tag)}
    <figcaption class="scena__testo rivela"><p class="kicker">{e(t['k'])}</p><h2 class="scena__titolo">{e(t['t'])}</h2><p>{e(t['p'].format(**valori))}</p></figcaption>
  </figure>'''

# ---------------------------------------------------------------- le case, piano per piano
FRECCIA = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>'

def etichetta_casa(L, u):
    """La frase che dice una casa: per l'etichetta che compare sulla pianta e per i lettori di schermo."""
    prezzo = L['venduta'] if u['venduta'] else f"{euro(L, u['prezzo'])} {L['case']['iva']}"
    return f"{L['casa_n'].format(n=u['n'])} · {L['tipi'][u['tipo']]} · {mq(L, u['commerciale'])} · {fuori_breve(L, u)} · {prezzo}"

def pianta_piano_html(L, base, piano):
    """La pianta del piano (SVG ridisegnato dall'esecutivo, coi colori di giugno e «Venduta» già scritto) e sopra i
    contorni cliccabili delle case, con le maschere che velano le altre quando si passa su una."""
    CA = L['case']; P = PP[piano]; W, H = P['w'], P['h']
    alt = CA['pianta_alt'].format(piano=CA[piano].lower() if L['lingua'] in ('it', 'sl') else CA[piano])
    pic = f'<img src="{base}images/{P["img"]}.svg" alt="{e(alt)}" width="{W}" height="{H}" loading="lazy" decoding="async">'
    maschere, poligoni = [], []
    for n, d in P['unita'].items():
        u = next(x for x in U['unita'] if x['n'] == n)
        punti = ' '.join(f'{x},{y}' for x, y in d['punti'])
        maschere.append(f'<mask id="mk-{n}" maskUnits="userSpaceOnUse" x="0" y="0" width="{W}" height="{H}"><rect width="{W}" height="{H}" fill="#fff"/><polygon points="{punti}" fill="#000"/></mask>')
        cls = 'kp-u kp-u--venduta' if u['venduta'] else 'kp-u'
        xs = [x for x, _ in d['punti']]; ys = [y for _, y in d['punti']]
        cx_pc, cy_pc = (min(xs) + max(xs)) / 2 / W * 100, min(ys) / H * 100   # l'etichetta sta sopra la casa
        poligoni.append(f'<polygon class="{cls}" data-unita="{n}" data-cx="{cx_pc:.2f}" data-cy="{cy_pc:.2f}" points="{punti}" tabindex="0" role="button" aria-label="{e(etichetta_casa(L, u))}"/>')
    return f'''<figure class="kp" data-piano="{piano}">
        {pic}
        <svg class="kp__sopra" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid meet">
          <defs>{''.join(maschere)}</defs>
          <rect class="kp__velo" width="{W}" height="{H}"/>
          {''.join(poligoni)}
        </svg>
        <div class="kp__info" aria-hidden="true" hidden></div>
      </figure>'''

def listino_html(L, piano):
    CA = L['case']
    out = []
    for u in [x for x in U['unita'] if x['piano'] == piano]:
        tipo = L['tipi'][u['tipo']]
        sotto = fuori_breve(L, u) + (' · ' + CA['posto_giardino'] if u.get('parcheggio_giardino') else '')
        if u['venduta']:
            prezzo = f'<span class="riga__p riga__p--venduta">{e(L["venduta"])}</span>'
        else:
            prezzo = f'<span class="riga__p num">{euro(L, u["prezzo"])}<small>{e(CA["iva"])}</small></span>'
        cls = 'riga riga--venduta' if u['venduta'] else 'riga'
        out.append(f'''<li><button type="button" class="{cls}" data-apri-unita="{u['n']}" data-unita="{u['n']}" style="--c:{colore(u['n'])}" aria-label="{e(etichetta_casa(L, u))}">
          <i class="riga__n num" aria-hidden="true">{u['n']}</i>
          <span class="riga__t"><b>{e(tipo)} · {mq(L, u['commerciale'])}</b><small>{e(sotto)}</small></span>
          {prezzo}{FRECCIA}
        </button></li>''')
    return '\n'.join(out)

def case_html(L, base, k_case):
    CA = L['case']
    libere = disponibili()
    min_t = min(u['prezzo'] for u in libere if u['piano'] == 'terra')
    min_p = min(u['prezzo'] for u in libere if u['piano'] == 'primo')
    passi = ''.join(f'<li><b class="num">{e(p)}</b><span>{e(t)}</span></li>' for p, t in CA['paga'])
    pannelli = []
    for i, piano in enumerate(('terra', 'primo')):
        nascosto = '' if i == 0 else ' hidden'
        pannelli.append(f'''<div class="piano" id="piano-{piano}" role="tabpanel" aria-labelledby="tab-{piano}"{nascosto}>
      {pianta_piano_html(L, base, piano)}
      <ul class="listino">
{listino_html(L, piano)}
      </ul>
    </div>''')
    return f'''<section class="foglio foglio--bianco sez-case" id="case" aria-labelledby="case-t">
  <div class="foglio__dentro">
    <div class="testata"><div class="rivela"><p class="kicker">{k_case}</p><h2 class="h2" id="case-t">{CA['titolo']}</h2></div><p class="lede rivela">{e(CA['testo'])}</p></div>
    <div class="piani" role="tablist" aria-label="{e(CA['piani_aria'])}">
      <button type="button" role="tab" id="tab-terra" aria-controls="piano-terra" aria-selected="true" data-piano="terra"><b>{e(CA['terra'])}</b><span class="num">{e(CA['terra_sotto'].format(min=euro(L, min_t)))}</span></button>
      <button type="button" role="tab" id="tab-primo" aria-controls="piano-primo" aria-selected="false" tabindex="-1" data-piano="primo"><b>{e(CA['primo'])}</b><span class="num">{e(CA['primo_sotto'].format(min=euro(L, min_p)))}</span></button>
    </div>
    {''.join(pannelli)}
    <p class="nota piani__fonte">{e(CA['pianta_fonte'])}</p>
    <div class="paga rivela">
      <h3 class="paga__t">{e(CA['paga_t'])}</h3>
      <ol class="paga__passi">{passi}</ol>
      <p class="paga__nota">{e(CA['tutela'])} {e(CA['nota'])}</p>
    </div>
  </div>
</section>'''

# ---------------------------------------------------------------- la costruzione, a strati
def costruzione_html(L, k_costr):
    CO = L['costruzione']
    out = []
    for i, (fase, (nome, titolo, testo)) in enumerate(zip(FASI_PASSI, CO['passi']), start=1):
        lato = ' destra' if i % 2 == 0 else ''
        testa = ''
        if i == 1:
            testa = f'<p class="kicker">{k_costr}</p><h2 class="h2" id="costruzione-t">{CO["titolo"]}</h2><p class="carta3d__intro">{e(CO["testo"])}</p><hr>'
        coda = ''
        if i == len(CO['passi']):
            coda = (f'<div class="dentro"><p class="dentro__t">{e(CO["dentro_t"])}</p><ul>{"".join(f"<li>{e(x)}</li>" for x in CO["dentro"])}</ul>'
                    f'<p class="dentro__azioni"><button type="button" class="btn btn--chiaro btn--piccolo" data-apri-brochure>{e(CO["brochure"])}</button>'
                    f'<button type="button" class="vai vai--chiaro" data-apri-tour>{ICON["cubo"]} {e(CO["tour"])}</button></p></div>')
        out.append(f'''<div class="palco__passo palco__passo--strato{lato}" data-stato="costruzione:{fase}">
    <div class="carta3d{' carta3d--larga' if i in (1, len(CO['passi'])) else ''} rivela">{testa}<div class="kicker"><i>{i}</i>{e(nome)}</div><h3 class="h3">{e(titolo)}</h3><p>{e(testo)}</p>{coda}</div>
  </div>''')
    return '\n'.join(out)

def fasi_indice(L):
    return '\n'.join(f'<li><span>{e(p[0])}</span></li>' for p in L['costruzione']['passi'])

def ore_unita(L):
    out = []
    for u in U['unita']:
        no = ' class="no"' if u['venduta'] else ''
        out.append(f'<div data-unita="{u["n"]}"{no}><small>{e(L["casa_n"].format(n=u["n"]))}{" · " + e(L["venduta"]) if u["venduta"] else ""}</small><b>—</b></div>')
    return '\n'.join(out)

# ---------------------------------------------------------------- le tre firme
FIRME = [
    ('Ennio Riccesi Holding', 'riccesi-holding', 247, 'riccesi.eu', 'https://riccesi.eu/'),
    ('Studio Architettura Soldano', 'soldano', 192, 'studioarchitetturasoldano.it', 'https://www.studioarchitetturasoldano.it/'),
    ('TriesteVillas', 'triestevillas', 192, 'triestevillas.com', 'https://triestevillas.com'),
]
def chi_html(L, base, k_chi):
    CH = L['chi']
    firme = []
    for (nome, logo, w, dominio, url), (ruolo, testo) in zip(FIRME, CH['ruoli']):
        firme.append(f'''<li class="rivela"><p class="kicker">{e(ruolo)}</p><img src="{base}logos/resp/{logo}-{w}.png" alt="{e(nome)}" width="{w}" height="192" loading="lazy"><p><b>{e(nome)}</b> {e(testo)}</p><a class="vai" href="{url}" target="_blank" rel="noopener">{e(dominio)} ↗</a></li>''')
    return f'''<section class="foglio firme" id="chi" aria-labelledby="chi-t">
  <div class="foglio__dentro firme__dentro">
    <div class="rivela"><p class="kicker">{k_chi}</p><h2 class="h2" id="chi-t">{CH['titolo']}</h2></div>
    <ul class="firme__elenco">
      {''.join(firme)}
    </ul>
  </div>
</section>'''

# ---------------------------------------------------------------- i contatti
def contatti_html(L, base, k_contatti, privacy, wa):
    K = L['contatti']
    # nel messaggio al CRM la scelta va in minuscolo dopo i due punti, tranne dove la lingua dice altrimenti
    # (il tedesco tiene la maiuscola dei sostantivi: la terza voce della tupla è la forma per il messaggio)
    def nel_messaggio(t): return t[2] if len(t) > 2 else t[1][:1].lower() + t[1][1:]
    interessi = ''.join(f'<label><input type="checkbox" name="interesse" value="{t[0]}" data-testo="{e(nel_messaggio(t))}"><span>{e(t[1])}</span></label>' for t in K['interessi'])
    case = ''.join(f'<label><input type="checkbox" name="casa" value="{u["n"]}"><span class="num">{u["n"]}</span></label>' for u in disponibili())
    return f'''<section class="contatto" id="contatti" aria-labelledby="contatti-t">
  <div class="contatto__dentro">
    <div class="contatto__testa">
      <p class="kicker">{k_contatti}</p>
      <h2 class="h2" id="contatti-t">{K['titolo']}</h2>
      <p class="lede">{e(K['testo'])}</p>
      <div class="azioni">
        <a class="azione" href="{wa}" target="_blank" rel="noopener"><span class="azione__ic">{ICON['wa']}</span><span class="azione__t"><b>{e(K['wa'])}</b><small>{e(K['wa_sotto'])}</small></span></a>
        <a class="azione" href="tel:{TELEFONO}"><span class="azione__ic">{ICON['tel']}</span><span class="azione__t"><b>{e(K['tel'])}</b><small class="num">{e(L['telefono'])}</small></span></a>
        <a class="azione" href="mailto:richieste@triestevillas.com"><span class="azione__ic">{ICON['mail']}</span><span class="azione__t"><b>{e(K['mail'])}</b><small>richieste@triestevillas.com</small></span></a>
      </div>
      <dl class="indirizzi">
        <div><dt>{e(K['cantiere'])}</dt><dd><a href="https://maps.google.com/?q=Localit%C3%A0+Duino+69%2FA+Duino+Aurisina" target="_blank" rel="noopener">Località Duino 69/A, Duino Aurisina (TS)</a></dd></div>
        <div><dt>{e(K['ufficio'])}</dt><dd><a href="https://maps.google.com/?q=Via+Torino+34+Trieste" target="_blank" rel="noopener">Via Torino 34, Trieste</a></dd></div>
      </dl>
    </div>
    <div class="modulo">
      <form class="modulo__form" id="info-form" novalidate>
        <div class="modulo__testa"><p class="modulo__t">{e(K['form_t'])}</p><p class="modulo__sotto">{e(K['form_sotto'])}</p></div>
        <div aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden"><label for="if-hp">{e(K['hp'])}</label><input type="text" id="if-hp" name="hp_ed" tabindex="-1" autocomplete="off"></div>
        <fieldset class="chips"><legend>{e(K['interessi_t'])}</legend><div>{interessi}</div></fieldset>
        <fieldset class="chips chips--case"><legend>{e(K['case_t'])}</legend><div>{case}</div></fieldset>
        <div class="fl"><input class="fl__in" type="text" id="if-nome" name="nome" placeholder=" " required maxlength="120" autocomplete="name"><label for="if-nome">{e(K['nome'])}</label></div>
        <div class="fl"><input class="fl__in" type="text" id="if-recapito" name="recapito" placeholder=" " required maxlength="160" autocomplete="email" spellcheck="false" autocapitalize="off"><label for="if-recapito">{e(K['recapito'])}</label></div>
        <div class="fl"><textarea class="fl__in" id="if-msg" name="messaggio" placeholder=" " rows="2" maxlength="1800"></textarea><label for="if-msg">{e(K['messaggio'])}</label></div>
        <label class="spunta"><input type="checkbox" id="if-privacy" name="privacy" value="si" required><span class="spunta__box" aria-hidden="true"></span><span class="spunta__t">{K['consenso'].format(privacy=privacy)}</span></label>
        <p class="form__errore" id="if-error" role="alert"></p>
        <button type="submit" class="invia"><span class="btn__label">{e(K['invia'])}</span>{ICON['invia']}</button>
      </form>
      <div class="form__ok modulo__ok" id="info-ok" role="status" tabindex="-1"><span class="modulo__spunta" aria-hidden="true"><svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24"/><path d="M15 27l7 7 15-16"/></svg></span><p class="h3">{e(K['ok_titolo'])}</p><p>{K['ok_testo']}</p></div>
    </div>
  </div>
</section>'''

CUORE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2.1 0 3.6 1.2 5.1 3 1.5-1.8 3-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" fill="var(--cuore-pieno, none)" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>'

ICON = {
    'menu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
    'x': '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    'play': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5l12 7-12 7z"/></svg>',
    'chat': '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5.5h16v10H9.5L5 19.5v-4H4z"/><path d="M8 9.5h8M8 12.5h5"/></svg>',
    'invia': '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6"/></svg>',
    'cubo': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/></svg>',
    'wa': '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4.5 19.5l1.2-3.6A8 8 0 1 1 8.4 18.6z"/><path d="M9 8.8c0 3.2 2.9 6.2 6.2 6.2l1-1.6-1.9-1-1 1c-1.2-.5-2.2-1.5-2.7-2.7l1-1-1-1.9z" fill="currentColor" stroke="none"/></svg>',
    'tel': '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.6 3.5h2.6l1.4 4-2 1.4a12 12 0 0 0 6.5 6.5l1.4-2 4 1.4v2.6c0 1.1-.9 2-2 2A16.5 16.5 0 0 1 4.6 5.5c0-1.1.9-2 2-2z"/></svg>',
    'mail': '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/></svg>',
}

def pagina(L):
    lg = L['lingua']
    base = './assets/' if lg == 'it' else '../assets/'
    radice = './' if lg == 'it' else '../'
    url = 'https://elegieduino.it/' + ('' if lg == 'it' else lg + '/')
    link_lingua = {k: (radice if k == 'it' else radice + k + '/') for k in LINGUE}
    privacy = './privacy.html'
    disp = disponibili()
    prezzo_min = min(u['prezzo'] for u in disp)
    dati = {
        'lingua': lg, 'base': base, 'lat': F['lat'], 'lon': F['lon'],
        'unita': unita_js(L), 'luoghi': luoghi_js(L), 'postoAuto': U['posto_auto_extra_prezzo'], 'postiExtra': U['posti_auto_extra'],
        'testi': L['js'], 'piante': L['piante'], 'confronto': L['confronto'],
        'scheda': {k: L['scheda'][k] for k in ('r_iva', 'wa_testo', 'salva', 'salvata')},
        'contatto': {k: L['contatti'][k] for k in ('msg_interessi', 'msg_case')},
        'concierge': {**L['concierge'], 'url': CONCIERGE, 'privacy': privacy},
        'tour': TOUR_TERRENO, 'telefono': TELEFONO,
    }
    jsonld = {
        '@context': 'https://schema.org', '@graph': [
            {'@type': 'WebSite', '@id': 'https://elegieduino.it/#website', 'url': 'https://elegieduino.it/', 'name': 'Elegie Duino', 'inLanguage': LINGUE, 'publisher': {'@id': 'https://triestevillas.com/#agency'}},
            {'@type': 'WebPage', '@id': url + '#webpage', 'url': url, 'name': L['titolo'], 'inLanguage': lg, 'isPartOf': {'@id': 'https://elegieduino.it/#website'}, 'about': {'@id': 'https://elegieduino.it/#residenze'}, 'primaryImageOfPage': 'https://elegieduino.it/assets/images/drone-duino.jpg'},
            {'@type': 'ApartmentComplex', '@id': 'https://elegieduino.it/#residenze', 'name': 'Elegie Duino', 'description': L['jsonld_descr'], 'url': 'https://elegieduino.it/', 'image': 'https://elegieduino.it/assets/images/drone-duino.jpg', 'numberOfAccommodationUnits': 8, 'numberOfAvailableAccommodationUnits': len(disp), 'address': {'@type': 'PostalAddress', 'streetAddress': 'Località Duino 69/A', 'addressLocality': 'Duino Aurisina', 'postalCode': '34011', 'addressRegion': 'TS', 'addressCountry': 'IT'}, 'geo': {'@type': 'GeoCoordinates', 'latitude': F['lat'], 'longitude': F['lon']}},
            {'@type': 'RealEstateAgent', '@id': 'https://triestevillas.com/#agency', 'name': 'TriesteVillas', 'legalName': 'TriesteVillas srl', 'vatID': 'IT01235580329', 'url': 'https://triestevillas.com', 'telephone': TELEFONO, 'email': 'richieste@triestevillas.com'},
        ]}
    numero = iter(range(1, 20))
    def k(testo): return f'{next(numero):02d} · {e(testo)}'
    fatti_apertura = ''.join(f'<li>{x}</li>' for x in L['apertura']['fatti'](len(disp), euro(L, prezzo_min)))
    A = L['apertura']; LU = L['luogo']; CO = L['costruzione']; LC = L['luce']; CA = L['case']
    PI = L['piante']; CF = L['confronto']; S = L['scheda']; CH = L['chi']; K = L['contatti']; Q = L['concierge']; TO = L['tour']
    # Il terreno dopo le demolizioni, dal drone (DRONEMIX 19/10/2026): quattro riprese vere, in discesa.
    def _foto_drone(nome, cap, alt):
        av = ', '.join(f'{base}images/resp/{nome}-{w}.avif {w}w' for w in FOTO[nome])
        wb = ', '.join(f'{base}images/resp/{nome}-{w}.webp {w}w' for w in FOTO[nome])
        return (f'<a class="tour__foto" href="{base}images/{nome}.jpg" target="_blank" rel="noopener">'
                f'<picture><source type="image/avif" srcset="{av}" sizes="(max-width: 700px) 46vw, 220px">'
                f'<source type="image/webp" srcset="{wb}" sizes="(max-width: 700px) 46vw, 220px">'
                f'<img src="{base}images/resp/{nome}-640.webp" alt="{e(alt)}" width="640" height="360" loading="lazy" decoding="async"></picture>'
                f'<span>{e(cap)}</span></a>')
    fila_drone = ('<div class="tour__drone">'
                  f'<p class="kicker" style="color:var(--legno)">{e(TO["drone_kicker"])}</p>'
                  '<div class="tour__drone-fila">'
                  + ''.join(_foto_drone(n, c, a) for n, (c, a) in zip(['drone-paese', 'drone-lotto-picco', 'drone-lotto-basso', 'drone-lotto-prato'], TO['drone_foto']))
                  + f'</div><p class="nota">{e(TO["drone_nota"])}</p></div>')
    k_luogo, k_case, k_luce, k_costr, k_chi, k_contatti = [k(x) for x in (LU['kicker'], CA['kicker'], LC['kicker'], CO['kicker'], CH['kicker'], K['kicker'])]
    wa = 'https://wa.me/393318940822?text=' + e(Q['wa_testo']).replace(' ', '%20')
    lingue_barra = ''.join(f'<a href="{link_lingua[x]}" hreflang="{x}" lang="{x}"' + (' aria-current="true"' if lg == x else '') + f'>{x.upper()}</a>' for x in LINGUE)
    lingue_piede = ''.join(f'<a href="{link_lingua[x]}" hreflang="{x}" lang="{x}">{v}</a>' for x, v in [('it', 'Italiano'), ('en', 'English'), ('de', 'Deutsch'), ('sl', 'Slovenščina')] if x != lg)
    passi_scheda = ''.join(f'<li><b class="num">{q}</b><span>{e(t)}</span><em class="num"><span data-passo="{i}">—</span><small>{e(S["piu_iva"])}</small></em></li>' for i, (q, t) in enumerate(zip(('10%', '20%', '70%'), S['passi'])))
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
<link rel="alternate" hreflang="de" href="https://elegieduino.it/de/">
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
    {''.join(f'<a href="#{kk}">{e(v)}</a>' for kk, v in L['menu'])}
  </nav>
  <div class="barra__lingue">
    {lingue_barra}
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
      <div class="passo-apertura"><p class="kicker">{e(A['p1_kicker'])}</p><h2 class="h3">{e(A['p1_titolo'])}</h2><p>{e(A['p1_testo'])}</p><p><button type="button" class="vai vai--chiaro" data-apri-tour>{ICON['cubo']} {e(A['p1_link'])}</button></p></div>
      <div class="passo-apertura"><p class="kicker">{e(A['p2_kicker'])}</p><h2 class="h3">{e(A['p2_titolo'])}</h2><p>{e(A['p2_testo'])}</p></div>
    </div>
    <div class="scorri" aria-hidden="true">{e(A['scorri'])}</div>
  </div>
</section>

<section class="palco" id="luogo" aria-labelledby="luogo-t">
  <div class="palco__passo palco__passo--alto palco__passo--lungo" data-stato="luogo">
    <div class="carta3d carta3d--larga rivela">
      <p class="kicker">{k_luogo}</p>
      <h2 class="h2" id="luogo-t">{LU['titolo']}</h2>
      <p>{LU['testo']}</p>
      <div class="commuta" role="group" aria-label="{e(LU['commuta_aria'])}"><button type="button" data-modo="piedi" aria-pressed="true">{e(LU['a_piedi'])}</button><button type="button" data-modo="auto" aria-pressed="false">{e(LU['in_auto'])}</button></div>
      <ul class="tempi num">
{tempi_html(L)}
      </ul>
      <span class="fonte">{e(LU['fonte'])}</span>
    </div>
  </div>
  <div class="ripiego foglio--notte" style="padding:0 var(--gutter) 40px"><picture><source type="image/avif" srcset="{base}images/resp/aerial-originale-1280.avif"><img src="{base}images/aerial-originale.jpg" alt="{e(A['alt_foto'])}" loading="lazy" width="2400" height="1350"></picture></div>
</section>

<section class="vivere" id="giardino" aria-label="{e(L['vivere']['scene'][0]['t'])}">
  {scena_html(L, base, 0)}
</section>

{case_html(L, base, k_case)}

<section class="vivere" id="veranda" aria-label="{e(L['vivere']['scene'][1]['t'])}">
  {scena_html(L, base, 1)}
</section>

<section class="palco" id="luce" aria-labelledby="luce-t">
  <div class="palco__passo palco__passo--due" data-stato="luce">
    <div class="carta3d carta3d--larga rivela"><p class="kicker">{k_luce}</p><h2 class="h2" id="luce-t">{LC['titolo']}</h2><p>{e(LC['testo'])}</p></div>
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

<section class="palco" id="costruzione" aria-labelledby="costruzione-t">
{costruzione_html(L, k_costr)}
</section>

{chi_html(L, base, k_chi)}

{contatti_html(L, base, k_contatti, privacy, wa)}

</main>

<aside class="scheda" aria-hidden="true" aria-labelledby="scheda-titolo" role="dialog">
  <div class="scheda__testa"><p class="kicker" style="margin:0">Elegie Duino</p><button type="button" class="scheda__chiudi" aria-label="{e(L['chiudi'])}">{ICON['x']}</button></div>
  <div class="scheda__corpo">
    <div class="scheda__titolo"><b id="scheda-numero" class="num"></b><div><h2 class="h3" id="scheda-titolo"></h2><p class="nota" id="scheda-tipo" style="margin:4px 0 0"></p></div><button type="button" class="cuore cuore--grande" id="scheda-cuore" aria-pressed="false" aria-label="{e(PI['salva'])}" title="{e(PI['salva'])}">{CUORE}</button></div>
    <div class="scheda__prezzo"><div id="scheda-prezzo"></div><span id="scheda-prezzo-nota"></span></div>
    <div class="scheda__sezione"><h4>{e(S['pianta'])}</h4><div class="scheda__pianta" id="scheda-pianta"></div><p class="nota">{e(S['pianta_nota'])}</p></div>
    <dl class="scheda__dati" id="scheda-dati"></dl>
    <div class="scheda__sezione scheda__conto" id="scheda-conto">
      <div class="conto2__testa"><h4>{e(S['conto'])}</h4><div class="scelta scelta--mini" role="group" aria-label="{e(S['conto_aria'])}"><button type="button" data-prima="si" aria-pressed="true">{e(S['prima'])}</button><button type="button" data-prima="no" aria-pressed="false">{e(S['seconda'])}</button></div></div>
      <table class="conto2 num">
        <tr><td>{e(S['r_prezzo'])}</td><td id="sc-prezzo"></td></tr>
        <tr><td id="sc-iva-et"></td><td id="sc-iva"></td></tr>
        <tr><td>{e(S['r_imposte'])}<small>{e(S['r_imposte_n'])}</small></td><td id="sc-imposte"></td></tr>
        <tr class="tot"><td>{e(S['r_totale'])}</td><td id="sc-totale"></td></tr>
      </table>
      <h4 class="conto2__paga">{e(S['paga'])}</h4>
      <ol class="conto2__passi">{passi_scheda}</ol>
      <p class="nota">{e(S['conto_nota'])}</p>
    </div>
    <div class="scheda__sezione"><h4>{e(S['sole'])}</h4><div class="scheda__sole num" id="scheda-sole"></div><p class="nota" style="margin-top:8px">{e(S['sole_nota'])}</p></div>
    <div class="scheda__sezione" id="scheda-vista" hidden><h4>{e(S['vista'])}</h4><p></p></div>
    <div class="scheda__azioni" id="scheda-azioni">
      <button type="button" class="btn btn--scuro" data-scheda-richiedi>{e(S['richiedi'])}</button>
      <a class="btn btn--linea-scura" id="scheda-wa" href="https://wa.me/393318940822" target="_blank" rel="noopener">{ICON['wa']} {e(S['whatsapp'])}</a>
    </div>
  </div>
</aside>
<div class="velo-scheda"></div>

<div class="preferite" hidden>
  {CUORE}<span><b id="pref-n" class="num">0</b> {e(CF['barra'])}</span>
  <button type="button" class="btn btn--chiaro btn--piccolo" data-confronta>{e(CF['vedi'])}</button>
  <button type="button" class="preferite__svuota" data-svuota>{e(CF['svuota'])}</button>
</div>

<div class="modale modale--largo" id="confronto" role="dialog" aria-modal="true" aria-labelledby="confronto-t">
  <div class="modale__pannello">
    <button type="button" class="modale__chiudi" data-chiudi-modale aria-label="{e(CF['chiudi'])}">{ICON['x']}</button>
    <h2 class="h2" id="confronto-t" style="margin-bottom:18px">{CF['titolo']}</h2>
    <div class="confronto" id="confronto-tavola"></div>
    <p class="nota" style="margin-top:14px">{e(CF['nota'])}</p>
  </div>
</div>

<div class="modale modale--tour" id="tour" role="dialog" aria-modal="true" aria-labelledby="tour-t">
  <div class="modale__pannello">
    <button type="button" class="modale__chiudi" data-chiudi-modale aria-label="{e(L['chiudi'])}">{ICON['x']}</button>
    <p class="kicker" style="color:var(--legno)">Matterport · 15.09.2026</p>
    <h2 class="h3" id="tour-t">{e(TO['titolo'])}</h2>
    <p class="nota">{e(TO['sotto'])}</p>
    {fila_drone}
    <div class="tour__tela" id="tour-tela"><div class="tour__invito"><p>{e(TO['nota'])}</p><button type="button" class="btn btn--scuro" data-carica-tour>{ICON['cubo']} {e(TO['apri'])}</button><a class="vai" href="{TOUR_TERRENO}" target="_blank" rel="noopener">{e(TO['nuova'])} ↗</a></div></div>
  </div>
</div>

<div class="lente" role="dialog" aria-modal="true" aria-label="{e(S['pianta'])}"><div class="lente__tela"></div><button type="button" class="btn btn--scuro lente__chiudi">{e(L['chiudi'])}</button></div>

<div class="modale" id="brochure-modale" role="dialog" aria-modal="true" aria-labelledby="brochure-t">
  <div class="modale__pannello">
    <button type="button" class="modale__chiudi" data-chiudi-modale aria-label="{e(L['chiudi'])}">{ICON['x']}</button>
    <p class="kicker" style="color:var(--legno)">{e(L['brochure']['kicker'])}</p>
    <h2 class="h3" id="brochure-t" style="margin-bottom:10px">{e(L['brochure']['titolo'])}</h2>
    <p class="nota" style="margin-bottom:18px">{e(L['brochure']['testo'])}</p>
    <form class="modulo__form modulo__form--piatto" id="brochure-form" novalidate>
      <div aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden"><label for="bf-hp">{e(K['hp'])}</label><input type="text" id="bf-hp" name="hp_ed" tabindex="-1" autocomplete="off"></div>
      <div class="fl"><input class="fl__in" type="text" id="bf-nome" name="nome" placeholder=" " required maxlength="120" autocomplete="name"><label for="bf-nome">{e(K['nome'])}</label></div>
      <div class="fl"><input class="fl__in" type="email" id="bf-email" name="email" placeholder=" " required maxlength="160" autocomplete="email"><label for="bf-email">Email</label></div>
      <div class="fl"><input class="fl__in" type="tel" id="bf-tel" name="telefono" placeholder=" " maxlength="40" autocomplete="tel"><label for="bf-tel">{e(K['telefono'])}</label></div>
      <label class="spunta"><input type="checkbox" id="bf-privacy" name="privacy" value="si" required><span class="spunta__box" aria-hidden="true"></span><span class="spunta__t">{L['brochure']['consenso'].format(privacy=privacy)}</span></label>
      <p class="form__errore" id="bf-error" role="alert"></p>
      <button type="submit" class="invia"><span class="btn__label">{e(L['brochure']['invia'])}</span>{ICON['invia']}</button>
    </form>
    <div class="form__ok" id="brochure-ok" role="status" tabindex="-1"><p class="h3">{e(L['brochure']['ok_titolo'])}</p><p>{e(L['brochure']['ok_testo'])} <a href="{base}pdf/elegie-duino-brochure.pdf" target="_blank" rel="noopener">{e(L['brochure']['apri'])}</a></p></div>
  </div>
</div>

<button type="button" class="concierge-apri" hidden aria-controls="concierge" aria-expanded="false">{ICON['chat']}<span>{e(Q['apri'])}</span></button>
<section class="concierge" id="concierge" role="dialog" aria-label="{e(Q['aria'])}" hidden>
  <header class="concierge__testa">
    <div><p class="concierge__titolo">{e(Q['titolo'])}</p><p class="concierge__sotto">{e(Q['sotto'])}</p></div>
    <button type="button" class="concierge__nuova" data-ricomincia>{e(Q['nuova'])}</button>
    <button type="button" class="concierge__chiudi" aria-label="{e(Q['chiudi'])}">{ICON['x']}</button>
  </header>
  <div class="concierge__flusso" aria-live="polite">
    <div class="msg msg--ai"><p>{e(Q['benvenuto'])}</p></div>
    <div class="concierge__esempi">{''.join(f'<button type="button">{e(x)}</button>' for x in Q['esempi'])}</div>
  </div>
  <div class="concierge__persona" hidden>
    <button type="button" class="concierge__indietro" data-indietro>← {e(Q['indietro'])}</button>
    <p class="concierge__persona-t">{e(Q['umano'])}</p>
    <p class="nota">{e(Q['umano_testo'])}</p>
    <form class="form form--chat" id="chat-lettera" novalidate>
      <div aria-hidden="true" style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden"><label for="cl-hp">{e(K['hp'])}</label><input type="text" id="cl-hp" name="hp_ed" tabindex="-1" autocomplete="off"></div>
      <div class="form__riga"><label class="form__label" for="cl-nome">{e(Q['nome'])} <span class="req">*</span></label><input class="form__input" id="cl-nome" name="nome" maxlength="120" autocomplete="name" required></div>
      <div class="form__riga form__riga--due">
        <div class="form__riga"><label class="form__label" for="cl-tel">{e(Q['telefono'])}</label><input class="form__input" id="cl-tel" name="telefono" type="tel" maxlength="40" autocomplete="tel"></div>
        <div class="form__riga"><label class="form__label" for="cl-email">{e(Q['email'])}</label><input class="form__input" id="cl-email" name="email" type="email" maxlength="160" autocomplete="email"></div>
      </div>
      <fieldset class="form__riga"><legend class="form__label">{e(Q['pref'])}</legend><div class="scelta scelta--tre">{''.join(f'<label><input type="radio" name="preferenza" value="{kk}"' + (' checked' if kk == 'richiamo' else '') + f'><span>{e(v)}</span></label>' for kk, v in Q['pref_opz'])}</div></fieldset>
      <div class="form__riga"><label class="form__label" for="cl-nota">{e(Q['nota'])}</label><textarea class="form__input" id="cl-nota" name="nota" rows="2" maxlength="600"></textarea></div>
      <label class="form__consenso"><input type="checkbox" name="consenso" value="si" required><span>{Q['consenso'].format(privacy=privacy)} <span class="req">*</span></span></label>
      <p class="form__errore" role="alert"></p>
      <button type="submit" class="btn btn--scuro btn--piccolo"><span class="btn__label">{e(Q['manda'])}</span></button>
    </form>
    <p class="concierge__subito">{e(Q['subito'])} <a href="{wa}" target="_blank" rel="noopener">WhatsApp</a> · <a href="tel:{TELEFONO}">{e(Q['chiama'])} {e(L['telefono'])}</a></p>
  </div>
  <form class="concierge__scrivi" novalidate>
    <label class="sr" for="chat-testo">{e(Q['ph'])}</label>
    <textarea id="chat-testo" rows="1" maxlength="1000" placeholder="{e(Q['ph'])}"></textarea>
    <button type="submit" aria-label="{e(Q['invia'])}">{ICON['invia']}</button>
  </form>
  <div class="concierge__piede"><button type="button" class="concierge__umano" data-persona>{e(Q['umano'])}</button><p>{Q['avviso'].format(privacy=privacy)}</p></div>
</section>

<footer class="piede">
  <div class="piede__dentro">
    <div class="piede__righe"><span><b style="color:var(--sale)">Elegie Duino</b> · {e(L['piede']['nuova'])}</span><a href="{privacy}">Privacy</a><a href="#" data-cc-prefs>{e(L['piede']['cookie'])}</a><a href="mailto:richieste@triestevillas.com">richieste@triestevillas.com</a>{lingue_piede}</div>
    <div class="piede__trasparenza">{''.join(f'<p style="margin:0">{x}</p>' for x in L['piede']['trasparenza'] + [Q['trasparenza']])}</div>
    <p style="margin:0">{e(L['piede']['legale'])}</p>
  </div>
</footer>

<script type="application/json" id="dati">{json.dumps(dati, ensure_ascii=False, separators=(',', ':'))}</script>
<script type="module" src="{base}js/opera/app.js"></script>
<script type="module" src="{base}js/opera/concierge.js"></script>
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
    conoscenza.main()

if __name__ == '__main__':
    main()
