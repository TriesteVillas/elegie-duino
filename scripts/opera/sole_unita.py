#!/usr/bin/env python3
"""Ore di sole diretto sulla veranda di ogni casa, per ogni giorno dell'anno (17/10/2026).

Per ogni casa si prende un punto al centro della veranda, a 1,5 m dal pavimento; ogni 5 minuti fra le
04:00 e le 21:30 (ora di Roma) il sole conta se:
  1. sta sopra l'orizzonte vero visto da quel punto (terreno LiDAR della Regione + case di OpenStreetMap,
     e — nel conto «con alberi» — le chiome come pieni: profili calcolati in scripts/opera/orizzonti.json);
  2. nessuna parte dell'edificio stesso (muri, solai, tetto, oscuri, e nel conto con alberi anche gli
     alberi del progetto) sta fra il punto e il sole.
Il vetro non ferma il sole. Le nuvole non ci sono.

    python3 scripts/opera/sole_unita.py <edificio_raw.glb> <orizzonti.json> <uscita sole_unita.json>

Serve: numpy, trimesh (con embreex per la velocità). Il sistema dell'edificio è quello di
scripts/opera (X = x di pianta, Y = quota − 1,20, Z = −y di pianta); la rotazione verso il nord vero
è in orizzonti.json («nord_pianta_gradi»: di quanto il nord vero è ruotato in senso orario rispetto
all'alto della pianta).
"""
import json, math, sys
import numpy as np, trimesh

R = math.pi / 180

def posizione_sole(ms, lat, lon):
    n = ms / 86400000 + 2440587.5 - 2451545.0
    L = (280.46 + 0.9856474 * n) % 360
    g = ((357.528 + 0.9856003 * n) % 360) * R
    lam = (L + 1.915 * math.sin(g) + 0.02 * math.sin(2 * g)) * R
    eps = (23.439 - 0.0000004 * n) * R
    ra = math.atan2(math.cos(eps) * math.sin(lam), math.cos(lam))
    dec = math.asin(math.sin(eps) * math.sin(lam))
    gmst = (18.697374558 + 24.06570982441908 * n) % 24
    ha = (gmst * 15 + lon) * R - ra
    la = lat * R
    alt = math.asin(math.sin(la) * math.sin(dec) + math.cos(la) * math.cos(dec) * math.cos(ha)) / R
    az = (math.atan2(-math.sin(ha), math.tan(dec) * math.cos(la) - math.sin(la) * math.cos(ha)) / R + 360) % 360
    if alt > -1.5:
        alt += 1.02 / math.tan((alt + 10.3 / (alt + 5.11)) * R) / 60
    return alt, az

def ultima_domenica(anno, mese):
    import datetime as dt
    d = dt.datetime(anno, mese + 1, 1) if mese < 11 else dt.datetime(anno + 1, 1, 1)
    d = d - dt.timedelta(days=1)
    d = d - dt.timedelta(days=(d.weekday() + 1) % 7)
    return dt.datetime(d.year, d.month, d.day, 1, 0, tzinfo=dt.timezone.utc).timestamp() * 1000

def istante(anno, giorno, minuti):
    import datetime as dt
    base = dt.datetime(anno, 1, 1, tzinfo=dt.timezone.utc).timestamp() * 1000 + (giorno - 1) * 86400000 + minuti * 60000
    ms = base - 3600000
    estate = ultima_domenica(anno, 2) <= ms < ultima_domenica(anno, 9)
    return base - (2 if estate else 1) * 3600000

def main(glb, orizz, uscita):
    O = json.load(open(orizz))
    lat, lon, rot = O['lat'], O['lon'], O['nord_pianta_gradi']
    sc = trimesh.load(glb, force='scene')
    opachi, alberi = [], []
    for nome, geo in sc.geometry.items():
        if any(k in nome for k in ('vetri', 'vol_', 'pianta_', 'ringhiere', 'telai', 'fotovoltaico', 'f7_lotto', 'f7_prato', 'f7_pavimenti', 'f7_siepi', 'fondazione', 'vespaio')):
            continue
        (alberi if 'f7_alberi' in nome or 'f7_tronchi' in nome else opachi).append(geo)
    m_op = trimesh.util.concatenate(opachi)
    m_all = trimesh.util.concatenate(opachi + alberi)
    rt_op = trimesh.ray.ray_pyembree.RayMeshIntersector(m_op) if trimesh.ray.has_embree else m_op.ray
    rt_all = trimesh.ray.ray_pyembree.RayMeshIntersector(m_all) if trimesh.ray.has_embree else m_all.ray
    anno = O.get('anno', 2026)
    passi = list(range(240, 1291, 5))
    # direzioni del sole per ogni giorno e passo (comuni a tutte le case)
    tab = {}
    for g in range(1, 366):
        for m in passi:
            alt, az = posizione_sole(istante(anno, g, m), lat, lon)
            tab[(g, m)] = (alt, az)
    out = {'_metodo': __doc__.strip().split('\n\n')[1], 'lat': lat, 'lon': lon, 'passo_min': 5, 'unita': {}}
    for n, P in O['punti'].items():
        px, py, quota = P['pianta'][0], P['pianta'][1], P['y']
        origine = np.array([px, quota, -py])
        hz_alb = np.array(P['orizzonte_alberi']); hz_sen = np.array(P['orizzonte_senza'])
        passo_az = 360 / len(hz_alb)
        con, senza = [], []
        for g in range(1, 366):
            dirs, idx = [], []
            hv_a, hv_s = [], []
            for m in passi:
                alt, az = tab[(g, m)]
                if alt <= 0: continue
                k = int(round(az / passo_az)) % len(hz_alb)
                hv_a.append(alt > hz_alb[k]); hv_s.append(alt > hz_sen[k])
                # direzione nel sistema dell'edificio: azimut rispetto al nord di pianta
                a = (az + rot) * R; e = alt * R   # angolo orario dall alto della pianta (il nord vero sta a +rot)
                dirs.append([math.sin(a) * math.cos(e), math.sin(e), -math.cos(a) * math.cos(e)])
                idx.append(m)
            if not dirs:
                con.append(0); senza.append(0); continue
            D = np.array(dirs); Oo = np.repeat(origine[None, :], len(D), axis=0) + D * 0.05
            hit_op = rt_op.intersects_any(Oo, D)
            hit_all = rt_all.intersects_any(Oo, D)
            ok_s = np.array(hv_s) & ~hit_op
            ok_a = np.array(hv_a) & ~hit_all
            senza.append(int(ok_s.sum() * 5)); con.append(int(ok_a.sum() * 5))
        out['unita'][n] = {'alberi': con, 'senza': senza}
        print(n, 'dic', con[354], senza[354], 'mar', con[79], senza[79], 'giu', con[171], senza[171])
    json.dump(out, open(uscita, 'w'), separators=(',', ':'))

if __name__ == '__main__':
    main(*sys.argv[1:4])
