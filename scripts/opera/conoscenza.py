#!/usr/bin/env python3
"""Quello che il concierge AI di elegieduino.it sa (17/10/2026).

Scrive assets/concierge/conoscenza.json dagli stessi dati delle pagine (unita.json, fatti.json, le ore di sole):
quando cambia un prezzo o si vende una casa, si rigenera il sito e il concierge lo sa da solo. Il CRM (tsv-pg,
lib/ed-chat*) legge questo file da https://elegieduino.it/assets/concierge/conoscenza.json e, se non lo raggiunge,
usa la copia che tiene con sé.

Qui ci sono solo fatti PUBBLICI, già scritti sul sito. Le regole di comportamento del concierge (riservatezza,
manipolazioni, passaggio a una persona) stanno nel CRM e non si pubblicano.
⛔ Mai nomi di persone che non siano i professionisti già sul sito, mai codici interni, mai provvigioni.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
U = json.load(open(os.path.join(ROOT, 'scripts/opera/unita.json')))
F = json.load(open(os.path.join(ROOT, 'scripts/opera/fatti.json')))
SOLE = json.load(open(os.path.join(ROOT, 'assets/3d/sole_unita.json')))
C = json.load(open(os.path.join(ROOT, 'scripts/opera/cantiere.json')))   # il cronoprogramma (06/11/2026)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from testi import IT  # noqa: E402  — le parole del cronoprogramma sono quelle della pagina italiana

IMPOSTE_FISSE = 600  # registro, ipotecaria e catastale: 200 € ciascuna (vendita da impresa soggetta a IVA)


def ore(minuti):
    h, m = divmod(int(round(minuti)), 60)
    return f'{h} h {m:02d} min' if m else f'{h} h'


def casa(u):
    s = SOLE['unita'].get(u['n'])
    sole = None
    if s:
        sole = {et: {'senza_alberi': ore(s['senza'][g - 1]), 'con_alberi_come_chiome_piene': ore(s['alberi'][g - 1])}
                for et, g in (('21 dicembre', 355), ('21 marzo', 80), ('21 giugno', 172))}
    giardino = u['piano'] == 'terra'
    d = {
        'casa': u['n'],
        'piano': 'piano terra' if u['piano'] == 'terra' else 'primo piano',
        'tipologia': u['tipo'],
        'camere': u['camere'], 'bagni': u['bagni'],
        'superficie_commerciale_mq': u['commerciale'] + ' (veranda compresa, dalle tavole del progettista)',
        'all_aperto': (f"giardino privato di {u['esterna']} m²" if giardino and u['esterna'] else
                       'veranda vetrata con parapetto' if not giardino else '—'),
        'posto_auto': 'nel giardino privato, compreso' if u.get('parcheggio_giardino') else 'uno esterno, compreso',
        'stato': 'venduta' if u['venduta'] else 'disponibile',
    }
    if not u['venduta']:
        p = u['prezzo']
        d['prezzo_iva_esclusa_eur'] = p
        d['totale_prima_casa_eur'] = round(p * 1.04 + IMPOSTE_FISSE)
        d['totale_seconda_casa_eur'] = round(p * 1.10 + IMPOSTE_FISSE)
        d['pagamenti_eur'] = {'prenotazione_10': round(p * 0.10), 'preliminare_20': round(p * 0.20), 'rogito_70': round(p * 0.70)}
        d['pianta'] = f'https://elegieduino.it/#unita-{u["n"]}'
        d['pianta_cosa_si_vede'] = "il disegno a mano dell'architetto Soldano e, con un tasto, la planimetria ufficiale che verrà allegata all'atto (anche in PDF)"
        if sole: d['ore_di_sole_diretto_sulla_vetrata_della_veranda'] = sole
        v = F.get('vista', {}).get(u['n'], {}).get('it')
        if v: d['vista'] = v
    else:
        d['nota'] = 'Venduta. Chi l\'ha comprata è riservato.'
    return d


def senza_tag(t): return re.sub(r'<[^>]+>', '', t)


def data_it(iso):
    y, m, d = (int(x) for x in iso.split('-'))
    return f"{d} {IT['tempi']['mesi_lunghi'][m - 1]} {y}"


def cronoprogramma():
    T = IT['tempi']
    vendute = sum(1 for u in U['unita'] if u['venduta'])
    stato = {'fatto': 'fatto', 'atteso': 'atteso', 'previsto': 'previsto (non è un impegno)'}
    return {
        'aggiornato_al': data_it(C['aggiornato']),
        'che_cosa_e': "Il programma dei lavori dell'impresa, alla prima revisione, con le tappe già fatte prima. Sul sito: sezione «I tempi» e il capitolo 3D «Il cantiere, mese per mese».",
        'tappe': [f"{T['tappe'][t['k']][0]}: {T['tappe'][t['k']][1]} — {T['tappe'][t['k']][2].format(v=vendute)} [{stato[t['stato']]}]" for t in C['tappe']],
        'avvertenza': senza_tag(T['avvertenza']),
        'prima_della_revisione': T['revisione'],
        'come_si_dice': "La consegna è «prevista entro giugno 2028»: mai «garantita», mai una data esatta per una casa. Il termine che vale per chi compra è quello scritto nel suo preliminare.",
        'scelte_di_chi_compra': {
            'perche': T['scelte_testo'].rstrip(':') + '.',
            'scadenze': [f"entro il {data_it(s['entro'])}: {T['scelte'][s['k']][0].lower()} — {T['scelte'][s['k']][1]}" for s in C['scelte']],
            'dopo': T['scelte_dopo'],
        },
        'visite_in_cantiere': T['compra'][3][2],
        'aggiornamenti': T['agg_testo'] + " Per riceverli: il modulo dei contatti del sito, voce «Gli aggiornamenti del cantiere».",
    }


def luoghi():
    out = []
    for l in F['luoghi']:
        r = {'luogo': l['nome']['it']}
        if l.get('piedi_s'): r['a_piedi'] = f"{max(1, round(l['piedi_s'] / 60))} min ({l['piedi_m'] / 1000:.1f} km)".replace('.', ',')
        if l.get('auto_s'): r['in_auto'] = f"{max(1, round(l['auto_s'] / 60))} min ({l['auto_m'] / 1000:.1f} km)".replace('.', ',')
        if l['k'] == 'scoglio_dante': r['nota'] = 'Lo «Scoglio di Dante» è una leggenda: nessuna prova che Dante sia stato a Duino.'
        out.append(r)
    return out


def main():
    disp = [u for u in U['unita'] if not u['venduta']]
    giardino = [u for u in disp if u['piano'] == 'terra']
    K = {
        '_che_cosa_e': 'I fatti pubblici di Elegie Duino, gli stessi del sito elegieduino.it, per il concierge AI. Generato da scripts/opera/conoscenza.py.',
        'aggiornato': C['aggiornato'],
        'sito': 'https://elegieduino.it/ (italiano), /en/, /de/, /sl/',
        'progetto': {
            'nome': 'Elegie Duino',
            'indirizzo': 'Località Duino 69/A, 34011 Duino Aurisina (TS), Italia',
            'che_cosa': 'Otto case nuove su due piani in un unico edificio: quattro al piano terra con giardino privato, quattro al primo piano con veranda vetrata con parapetto. Bilocali e trilocali.',
            'stato_vendite': f'{len(disp)} disponibili su 8 (vendute: case 4 e 5).',
            'struttura': 'Legno X-LAM (pannelli di abete a strati incrociati, montaggio a secco) su fondazioni in cemento armato a travi rovesce; cappotto in lana di roccia; tetto piano con fotovoltaico.',
            'classe_energetica': 'A NZEB di progetto: l\'attestato (APE) si fa a fine lavori.',
            'tempi': 'Consegna delle case e rogiti previsti entro giugno 2028; il permesso di costruire è atteso a metà novembre 2026 e l\'inizio della costruzione è previsto nello stesso mese. Sono previsioni, non impegni: il dettaglio è in «cronoprogramma».',
            'orientamento': 'Verande e giardini guardano a sud-sud-est (164°); sul fronte nord, verso la strada, l\'ingresso comune e i posti auto.',
            'vista_mare': 'Non c\'è vista mare: misurata sul rilievo LiDAR della Regione e sulle case vicine. Dal primo piano, per le case 6 e 8, al massimo una fessura di qualche grado sul mare lontano verso ovest, che basta un tetto o una chioma a chiudere.',
            'facciata': 'Intonachino grigio caldo scuro (tipo Sandtex n. 36), il colore approvato dall\'autorizzazione paesaggistica. Alcuni rendering la mostrano più chiara.',
            'duplex': 'Non si propongono accorpamenti fra le case.',
        },
        'cronoprogramma': cronoprogramma(),
        'case': [casa(u) for u in U['unita']],
        'case_con_giardino_disponibili': {
            'quante': len(giardino),
            'da_eur_iva_esclusa': min(u['prezzo'] for u in giardino),
            'a_eur_iva_esclusa': max(u['prezzo'] for u in giardino),
            'risposta_breve': 'Le case con giardino libere sono al piano terra: ' + ', '.join(
                f"la {u['n']} ({u['tipo']}, giardino di {u['esterna']} m²{' con il posto auto dentro' if u.get('parcheggio_giardino') else ''}, € {u['prezzo']:,})".replace(',000', '.000')
                for u in sorted(giardino, key=lambda u: u['prezzo'])) + ', IVA esclusa.',
        },
        'posti_auto': f"Uno esterno compreso in ogni casa (per la casa 1 è nel giardino). Altri {U['posti_auto_extra']} disponibili a € {U['posto_auto_extra_prezzo']:,} ciascuno più IVA.".replace(',', '.'),
        'costi': {
            'prezzi': 'Prezzi di listino IVA esclusa. Il listino può cambiare: il prezzo definitivo si fissa nella proposta d\'acquisto.',
            'iva': 'Si compra dall\'impresa che costruisce: IVA al 4% se è la prima casa (requisiti verificati dal notaio, legati alla residenza in Italia), al 10% altrimenti.',
            'imposte_fisse': 'Imposte di registro, ipotecaria e catastale: 200 € ciascuna, 600 € in tutto.',
            'esclusi': 'Fuori dal conto: onorario del notaio, eventuale mutuo.',
        },
        'pagamenti': {
            'schema': '10% alla prenotazione; 20% al preliminare, dal notaio; 70% al rogito, previsto entro giugno 2028 insieme alla consegna.',
            'iva_sui_pagamenti': 'Le percentuali sono sul prezzo. L\'IVA si versa secondo le fatture dell\'impresa; i dettagli li fissano la proposta e il preliminare.',
            'tutele_di_legge': 'Per le case da costruire la legge tutela chi compra come persona fisica (D.Lgs. 122/2005, modificato dal D.Lgs. 14/2019): il preliminare si firma davanti al notaio; le somme versate prima del rogito (caparre e acconti) sono garantite da una fideiussione di una banca o di un\'assicurazione che il costruttore deve consegnare; al rogito il costruttore consegna una polizza assicurativa decennale sull\'edificio.',
        },
        'impianti_e_finiture': {
            'riscaldamento_raffrescamento': 'Pompa di calore aria-acqua, una per casa: scalda, raffresca e fa l\'acqua calda senza gas, con accumulo da 200 litri; ventilconvettori stanza per stanza, comandabili dal telefono.',
            'fotovoltaico': 'Ogni casa ha il suo impianto fotovoltaico sul tetto. Il contatore di ogni casa ha una potenza fino a 6 kW: è la potenza del contatore, non dei pannelli (la potenza dei pannelli non è ancora indicata).',
            'auto_elettrica': 'Ogni posto auto è predisposto per la ricarica elettrica.',
            'serramenti': 'A taglio termico (alluminio o PVC), grigio antracite RAL 7016, vetrocamera stratificata basso emissiva.',
            'oscuri': 'Sul fronte strada, doghe verticali in composito.',
            'pavimenti': 'Gres porcellanato 60×60 o 120×60 nella zona giorno e nei bagni; parquet di rovere prefinito nelle camere.',
            'bagni': 'Sanitari sospesi S.D.R. Ceramiche serie BUL, rubinetteria Paffoni serie LIGHT, o equivalenti; piatto doccia in resina bianca.',
            'porta_ingresso': 'Portoncino blindato, classe antieffrazione 3 o superiore.',
            'predisposizioni': 'Allarme, fibra ottica (dove arriva), rete dati, domotica delle luci; videocitofono che registra chi ha suonato.',
            'soffitti': 'Solai in legno; in alcune stanze del primo piano travi in legno lamellare a vista.',
            'giardini': 'Siepi sempreverdi, specie autoctone del Carso che chiedono poca acqua; posti auto in calcestruzzo drenante; cancelli carrabili motorizzati.',
            'tolleranze': 'Le misure delle stanze possono variare del 5% rispetto ai disegni; il venditore può cambiare materiali e soluzioni senza ridurne valore e prestazioni (dal capitolato).',
            'capitolato_e_brochure': 'Il capitolato si riceve con la brochure PDF: dal sito, col pulsante alla fine del capitolo «Il cantiere, mese per mese», o su richiesta.',
        },
        'luoghi_e_tempi': {'fonte': 'Tempi calcolati con OSRM sulle strade di OpenStreetMap, dal cancello di Elegie, a passo normale e traffico libero.', 'elenco': luoghi()},
        'dintorni': 'Sotto il paese la Riserva naturale delle Falesie di Duino (107 ettari, dal 1996), l\'unica falesia alta della costa adriatica settentrionale italiana; il Sentiero Rilke la percorre per circa 1,7 km fino alla baia di Sistiana. Più a est l\'Area marina protetta di Miramare.',
        'il_nome': 'Rainer Maria Rilke, ospite della principessa Marie von Thurn und Taxis nel Castello di Duino, nel gennaio 1912 vi cominciò le «Elegie duinesi» (finite nel 1922 in Svizzera, pubblicate nel 1923). Il racconto della mattina di bora in cui gli venne il primo verso è nei ricordi della Principessa.',
        'il_terreno_oggi': {
            'tour_3d': 'https://my.matterport.com/show/?m=AQp72tPqpWV',
            'che_cosa': 'Scansione Matterport del terreno dopo la demolizione, del 15 settembre 2026. Sul sito c\'è anche la foto da drone del 12 agosto 2026.',
        },
        'chi': {
            'sviluppo_e_costruzione': 'Ennio Riccesi Holding (come scritto sul sito, sezione «Chi lo fa»).',
            'progetto': 'Studio Architettura Soldano, Trieste: Arch. Pier Paolo Soldano e Arch. Alessandra Belleli.',
            'vendite': 'TriesteVillas srl, Via Milano 5, Trieste; ufficio vendite Via Torino 34, Trieste.',
        },
        'contatti': {
            'telefono_e_whatsapp': '331 8940822 (dall\'estero +39 331 8940822)',
            'email': 'richieste@triestevillas.com',
            'visite': 'Su appuntamento. Quando il cantiere sarà aperto, le visite seguiranno le sue regole di sicurezza: accessi e calendario li stanno definendo impresa e TriesteVillas.',
            'moduli': 'Sul sito: «Richiedi informazioni» e, nel concierge, «Parla con una persona».',
        },
        'immagini': 'Sul sito i rendering di progetto sono segnati «Rendering»; quelli generati o rielaborati con l\'intelligenza artificiale «AI». Il modello 3D è ricostruito dalle tavole e dal CAD dello Studio Soldano, senza AI; il paese intorno viene dai dati pubblici della Regione e di OpenStreetMap.',
        'non_lo_sappiamo': [
            'spese condominiali (non ancora definite)',
            'onorario del notaio',
            'condizioni d\'agenzia per chi compra',
            'data esatta del preliminare e del rogito',
            'personalizzazioni oltre il capitolato: si chiedono per iscritto entro le scadenze delle scelte e si valutano con l\'impresa (l\'iter preciso è in via di definizione)',
            'potenza dei pannelli fotovoltaici di ogni casa',
            'data esatta del rilascio del permesso di costruire (atteso a metà novembre 2026)',
            'mutui e finanziamenti',
        ],
        'sezioni_del_sito': {
            'le case, le piante e i prezzi (piano per piano)': '#case', 'una casa sola, con pianta e conto': '#unita-N (N = numero della casa)',
            'il luogo e i tempi a piedi o in auto': '#luogo', 'la luce e il sole': '#luce', 'i tempi del cantiere, i pagamenti e le scelte': '#tempi',
            'il cantiere mese per mese, in 3D': '#costruzione', 'chi lo fa': '#chi', 'contatti e brochure': '#contatti',
        },
    }
    out = os.path.join(ROOT, 'assets/concierge/conoscenza.json')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    json.dump(K, open(out, 'w'), ensure_ascii=False, indent=1)
    print('scritto', os.path.relpath(out, ROOT), os.path.getsize(out), 'byte')


if __name__ == '__main__':
    main()
