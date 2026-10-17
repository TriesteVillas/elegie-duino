// Il sole su Duino: posizione (algoritmo NOAA semplificato, errore ~0,01°) e ora legale italiana.
// Niente dipendenze: si usa sia nella pagina sia nei collaudi.

const R = Math.PI / 180;

/** Posizione apparente del sole. `ms` = istante UTC in millisecondi.
 *  Restituisce altezza (gradi sopra l'orizzonte astronomico, con rifrazione) e azimut (da nord, orario). */
export function posizioneSole(ms, lat, lon) {
  const n = ms / 86400000 + 2440587.5 - 2451545.0;
  const L = (280.46 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * R;
  const lam = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * R;
  const eps = (23.439 - 0.0000004 * n) * R;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lam), Math.cos(lam));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lam));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  const ha = (gmst * 15 + lon) * R - ra;
  const la = lat * R;
  let alt = Math.asin(Math.sin(la) * Math.sin(dec) + Math.cos(la) * Math.cos(dec) * Math.cos(ha)) / R;
  const az = (Math.atan2(-Math.sin(ha), Math.tan(dec) * Math.cos(la) - Math.sin(la) * Math.cos(ha)) / R + 360) % 360;
  if (alt > -1.5) alt += 1.02 / Math.tan((alt + 10.3 / (alt + 5.11)) * R) / 60; // rifrazione (Saemundsson)
  return { alt, az };
}

/** Ultima domenica del mese (0-11) dell'anno, alle 01:00 UTC. */
function ultimaDomenica(anno, mese) {
  const d = new Date(Date.UTC(anno, mese + 1, 0, 1, 0, 0));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.getTime();
}

/** Scarto di Roma da UTC in ore per l'istante UTC dato (regola UE dell'ora legale). */
export function scartoRoma(ms) {
  const a = new Date(ms).getUTCFullYear();
  return ms >= ultimaDomenica(a, 2) && ms < ultimaDomenica(a, 9) ? 2 : 1;
}

/** Istante UTC per una data (anno, giorno dell'anno 1-366) e un'ora locale di Roma in minuti dalla mezzanotte. */
export function istante(anno, giorno, minutiLocali) {
  const base = Date.UTC(anno, 0, 1) + (giorno - 1) * 86400000 + minutiLocali * 60000;
  let ms = base - 1 * 3600000;
  ms = base - scartoRoma(ms) * 3600000;
  return ms;
}

export function giornoDellAnno(d) {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 1)) / 86400000) + 1;
}

/** Vettore unitario verso il sole nel mondo della scena (x = est, y = su, z = −nord). */
export function versoSole(alt, az) {
  const a = alt * R, z = az * R;
  return [Math.sin(z) * Math.cos(a), Math.sin(a), -Math.cos(z) * Math.cos(a)];
}

/** Alba e tramonto astronomici (orizzonte piatto) in minuti locali, a passo di un minuto. */
export function albaTramonto(anno, giorno, lat, lon) {
  let alba = null, tramonto = null, prima = null;
  for (let m = 180; m <= 1320; m += 1) {
    const p = posizioneSole(istante(anno, giorno, m), lat, lon);
    const su = p.alt > -0.27; // bordo superiore all'orizzonte (rifrazione già applicata)
    if (prima !== null && su && !prima) alba = m;
    if (prima !== null && !su && prima) tramonto = m;
    prima = su;
  }
  return { alba, tramonto };
}

export function hhmm(min) {
  if (min == null) return '—';
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
