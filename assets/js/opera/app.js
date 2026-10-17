// Elegie Duino — la pagina. Regia dello scorrimento, scheda delle case, il conto, i moduli.
// La scena 3D si carica dopo la prima schermata (la foto vera fa da apertura) e solo se il
// browser ha WebGL; senza, la pagina resta completa con immagini e testi.
import { posizioneSole, istante, albaTramonto, hhmm, giornoDellAnno } from './sole.js';

const D = JSON.parse(document.getElementById('dati').textContent);
const T = D.testi;
const BASE = D.base;            // './assets/' oppure '../assets/'
const LINGUA = D.lingua;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const euro = (n) => '€ ' + Math.round(n).toLocaleString(LINGUA === 'en' ? 'en-GB' : LINGUA === 'sl' ? 'sl-SI' : 'it-IT');
const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

// ------------------------------------------------------------------ barra e menu
const barra = $('.barra');
$('.barra__menu')?.addEventListener('click', () => {
  const ap = barra.classList.toggle('aperta');
  $('.barra__menu').setAttribute('aria-expanded', ap ? 'true' : 'false');
});
$$('.barra__voci a').forEach((a) => a.addEventListener('click', () => barra.classList.remove('aperta')));
function aggiornaBarra() {
  const el = document.elementFromPoint(Math.min(innerWidth - 2, 40), 70);
  const foglio = el && el.closest('.foglio, .nome, .piede, .vivere');
  const scuro = (f) => f.classList.contains('foglio--notte') || f.classList.contains('piede') || f.classList.contains('vivere');
  barra.classList.toggle('su-carta', !!foglio && !scuro(foglio));
  barra.classList.toggle('su-notte', !foglio && scrollY > innerHeight * 0.6 || (!!foglio && scuro(foglio)));
}

// ------------------------------------------------------------------ rivelazione
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
$$('.rivela').forEach((el) => io.observe(el));

// ------------------------------------------------------------------ 3D: avvio
let scena = null;
const tela = $('#tela');
const carica = $('.carica3d');
function haWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
}
const risparmio = navigator.connection && (navigator.connection.saveData || /2g/.test(navigator.connection.effectiveType || ''));
if (!haWebGL() || risparmio) document.documentElement.classList.add('senza3d');

async function avvia3D() {
  if (document.documentElement.classList.contains('senza3d') || scena) return;
  carica.hidden = false; carica.textContent = T.carico + ' 0%';
  try {
    const { creaScena } = await import('./scena.js');
    scena = await creaScena({
      tela, base: BASE, lingua: LINGUA,
      dati: { unita: D.unita, luoghi: D.luoghi, testi: { qui: T.qui, quiSotto: T.quiSotto, venduta: T.venduta } },
      onProgress: (p) => { carica.textContent = T.carico + ' ' + Math.round(p * 100) + '%'; },
    });
    scena.onScelta = (n) => apriScheda(n);
    scena.onSopra = (n) => $$('.case__elenco button').forEach((b) => b.classList.toggle('su', b.dataset.unita === n));
    const misuraFoto = () => scena.altezzaFoto($('.apertura__tenda').clientHeight);
    misuraFoto(); addEventListener('resize', misuraFoto);
    tela.classList.add('pronta');
    carica.hidden = true;
    regia();
  } catch (e) {
    console.error(e);
    document.documentElement.classList.add('senza3d');
    carica.hidden = true;
  }
}
// dopo il primo disegno della foto: idle, oppure al primo scorrimento
const avviaQuando = () => { removeEventListener('scroll', avviaQuando); avvia3D(); };
addEventListener('scroll', avviaQuando, { passive: true });
if ('requestIdleCallback' in window) requestIdleCallback(() => avvia3D(), { timeout: 2500 }); else setTimeout(avvia3D, 1500);

// ------------------------------------------------------------------ le scene di «Vivere qui»
// Immagini a tutta pagina che scorrono un po' più lente della pagina; le due animate (AI, dichiarate)
// si scaricano e partono solo quando la scena è sullo schermo, e mai col risparmio dati o il movimento ridotto.
const SCENE = $$('.scena');
const ioScene = new IntersectionObserver((es) => es.forEach((e) => {
  const sc = e.target; const v = sc.querySelector('video');
  if (e.isIntersecting) {
    sc.classList.add('in-vista');
    if (v && !ridotto && !risparmio) {
      if (!v.getAttribute('src')) { v.src = v.dataset.src; v.addEventListener('playing', () => v.classList.add('vivo'), { once: true }); }
      v.play().catch(() => {});
    }
  } else if (v) v.pause();
}), { threshold: 0.2 });
SCENE.forEach((sc) => ioScene.observe(sc));
function scene() {
  if (ridotto) return;
  for (const sc of SCENE) {
    const b = sc.getBoundingClientRect();
    if (b.bottom < 0 || b.top > innerHeight) continue;
    const t = (b.top + b.height / 2 - innerHeight / 2) / innerHeight;
    sc.style.setProperty('--par', (t * -3).toFixed(2) + '%');
  }
}

// ------------------------------------------------------------------ regia dello scorrimento
const apertura = $('.apertura');
const foto = $('.apertura__foto');
const testoAp = $('.apertura__testo');
const velo = $('.apertura__velo');
const etichettaFoto = $('.etichetta-foto');
const passiAp = $$('.passo-apertura');
const passi = $$('[data-stato]');
const fasiEl = $('.fasi');
let statoCorrente = null;
const zoomFoto = { ritorno: 0, t0: performance.now() };
(function avvicina() {
  const img = $('.apertura__foto img'); if (!img || ridotto) return;
  const passo = () => {
    const t = Math.min(1, (performance.now() - zoomFoto.t0) / 26000);
    const s = 1 + 0.07 * (1 - Math.pow(1 - t, 2)) * (1 - zoomFoto.ritorno);
    img.style.transform = `scale(${s.toFixed(4)})`;
    if (apertura.getBoundingClientRect().bottom > 0) requestAnimationFrame(passo); else setTimeout(() => requestAnimationFrame(passo), 500);
  };
  requestAnimationFrame(passo);
})();

function regia() {
  aggiornaBarra();
  scene();
  // apertura: foto → modello → l'edificio che sorge
  const r = apertura.getBoundingClientRect();
  const corsa = apertura.offsetHeight - innerHeight;
  const p = clamp(-r.top / corsa);
  const fotoOp = 1 - clamp((p - 0.36) / 0.16);
  foto.style.opacity = scena ? fotoOp : 1;
  etichettaFoto.style.opacity = scena ? fotoOp : 1;
  // lo zoom lento della foto torna a 1 prima della dissolvenza: foto e modello devono combaciare
  zoomFoto.ritorno = clamp((p - 0.12) / 0.16);
  document.querySelector('.etichette3d').style.opacity = scena && fotoOp < 0.35 ? 1 : (r.bottom > innerHeight * 0.5 ? 0 : 1);
  testoAp.style.opacity = 1 - clamp((p - 0.06) / 0.14);
  velo.style.opacity = 1 - 0.8 * clamp((p - 0.06) / 0.22);
  testoAp.style.transform = `translateY(${-clamp((p - 0.06) / 0.14) * 30}px)`;
  passiAp[0]?.classList.toggle('attivo', p > 0.18 && p < 0.46);
  passiAp[1]?.classList.toggle('attivo', p >= 0.5 && r.bottom > innerHeight * 0.3);
  if (scena && r.bottom > 0) {
    if (p < 0.6) { if (statoCorrente !== 'drone') { scena.imposta('drone'); statoCorrente = 'drone'; } scena.sorgi(0); }
    else { if (statoCorrente !== 'sorge') { scena.imposta('sorge'); statoCorrente = 'sorge'; } scena.sorgi(clamp((p - 0.6) / 0.3)); }
  }
  // capitoli 3D: il passo più vicino al centro dello schermo
  if (!scena) return;
  let migliore = null, dist = Infinity;
  for (const el of passi) {
    const b = el.getBoundingClientRect();
    if (b.bottom < 0 || b.top > innerHeight) continue;
    const d = Math.abs((b.top + b.bottom) / 2 - innerHeight / 2);
    if (d < dist) { dist = d; migliore = el; }
  }
  const sopraApertura = r.bottom > innerHeight * 0.5;
  if (migliore && !sopraApertura) {
    const [nome, arg] = migliore.dataset.stato.split(':');
    if (nome === 'costruzione') {
      const i = +arg;
      if (statoCorrente !== 'costruzione') { scena.imposta('costruzione'); statoCorrente = 'costruzione'; }
      scena.fase(i);
      fasiEl?.classList.add('vista');
      $$('li', fasiEl).forEach((li, k) => { li.classList.toggle('fatta', k < i - 1); li.classList.toggle('ora', k === i - 1); });
    } else {
      fasiEl?.classList.remove('vista');
      if (statoCorrente !== nome) { scena.imposta(nome); statoCorrente = nome; if (nome === 'luce') aggiornaSole(); }
    }
  } else if (!sopraApertura) {
    fasiEl?.classList.remove('vista');
  }
  // la tela si ferma quando un foglio la copre tutta
  const coperta = document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest('.foglio, .nome, .piede, .vivere');
  scena.attiva(!coperta);
}
let rafRegia = 0;
addEventListener('scroll', () => { if (!rafRegia) rafRegia = requestAnimationFrame(() => { rafRegia = 0; regia(); }); }, { passive: true });
addEventListener('resize', regia);
regia();

// ------------------------------------------------------------------ il luogo: a piedi / in auto
$$('.commuta button').forEach((b) => b.addEventListener('click', () => {
  $$('.commuta button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  const modo = b.dataset.modo;
  $$('.tempi li').forEach((li) => { li.hidden = li.dataset.modo !== modo; });
}));

// ------------------------------------------------------------------ la luce
const SOLE = D.sole || null; // ore di sole precalcolate per unità (assets/3d/sole_unita.json)
let soleTabella = null;
const anno = new Date().getFullYear();
const sel = { giorno: 172, minuti: 17 * 60 };
const rGiorno = $('#luce-giorno'), rOra = $('#luce-ora');
const oGiorno = $('#luce-giorno-out'), oOra = $('#luce-ora-out');
const mesi = T.mesi;
function etichettaGiorno(g) { const d = new Date(Date.UTC(anno, 0, g)); return d.getUTCDate() + ' ' + mesi[d.getUTCMonth()]; }
async function caricaTabellaSole() {
  if (soleTabella !== null) return soleTabella;
  try { soleTabella = await (await fetch(BASE + '3d/sole_unita.json')).json(); } catch (e) { soleTabella = false; }
  return soleTabella;
}
function minutiSole(tab, unita, giorno, alberi) {
  const u = tab?.unita?.[unita]; if (!u) return null;
  const riga = (alberi ? u.alberi : u.senza)[giorno - 1];
  return riga == null ? null : riga;
}
function oreTesto(m) { if (m == null) return '—'; const h = Math.floor(m / 60), mm = Math.round(m % 60); return h + ' h' + (mm ? ' ' + String(mm).padStart(2, '0') + '′' : ''); }
async function aggiornaSole() {
  if (!rGiorno) return;
  sel.giorno = +rGiorno.value; sel.minuti = +rOra.value;
  oGiorno.textContent = etichettaGiorno(sel.giorno);
  oOra.textContent = hhmm(sel.minuti);
  $$('.sole__giorni button').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.giorno === sel.giorno ? 'true' : 'false'));
  const lat = D.lat, lon = D.lon;
  const p = posizioneSole(istante(anno, sel.giorno, sel.minuti), lat, lon);
  const at = albaTramonto(anno, sel.giorno, lat, lon);
  $('#luce-alba').textContent = hhmm(at.alba);
  $('#luce-tramonto').textContent = hhmm(at.tramonto);
  $('#luce-alt').textContent = p.alt > 0 ? Math.round(p.alt) + '°' : T.sottoOrizzonte;
  if (scena) scena.impostaSole(anno, sel.giorno, sel.minuti);
  const tab = await caricaTabellaSole();
  for (const el of $$('.sole__ore [data-unita]')) {
    const m = minutiSole(tab, el.dataset.unita, sel.giorno, false);
    const ma = minutiSole(tab, el.dataset.unita, sel.giorno, true);
    el.querySelector('b').textContent = oreTesto(m);
    let i = el.querySelector('i'); if (!i) { i = document.createElement('i'); el.appendChild(i); }
    i.textContent = ma == null ? '' : T.conAlberi.replace('{h}', oreTesto(ma));
  }
}
rGiorno?.addEventListener('input', aggiornaSole);
rOra?.addEventListener('input', aggiornaSole);
$$('.sole__giorni button').forEach((b) => b.addEventListener('click', () => {
  rGiorno.value = b.dataset.giorno === 'oggi' ? giornoDellAnno(new Date()) : b.dataset.giorno; aggiornaSole();
}));
let giornata = null;
$('.sole__play')?.addEventListener('click', (ev) => {
  const btn = ev.currentTarget;
  if (giornata) { cancelAnimationFrame(giornata); giornata = null; btn.setAttribute('aria-pressed', 'false'); return; }
  btn.setAttribute('aria-pressed', 'true');
  let m = Math.max(+rOra.min, 5 * 60);
  const passo = () => { m += ridotto ? 30 : 3; if (m > +rOra.max) { giornata = null; btn.setAttribute('aria-pressed', 'false'); return; } rOra.value = m; aggiornaSole(); giornata = requestAnimationFrame(passo); };
  giornata = requestAnimationFrame(passo);
});
if (rGiorno) { const oggi = giornoDellAnno(new Date()); rGiorno.value = oggi; aggiornaSole(); }

// ------------------------------------------------------------------ le case
const UNITA = Object.fromEntries(D.unita.map((u) => [u.n, u]));
$$('.case__piani button').forEach((b) => b.addEventListener('click', () => {
  const p = b.dataset.piano || null;
  $$('.case__piani button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  scena && scena.piano(p);
}));
$$('.case__elenco button').forEach((b) => {
  b.addEventListener('click', () => apriScheda(b.dataset.unita));
  b.addEventListener('mouseenter', () => scena && scena.sopra(b.dataset.unita));
  b.addEventListener('mouseleave', () => scena && scena.sopra(null));
});

const scheda = $('.scheda'), veloScheda = $('.velo-scheda');
let ultimoFuoco = null;
async function apriScheda(n) {
  const u = UNITA[n]; if (!u) return;
  ultimoFuoco = document.activeElement;
  $('#scheda-numero').textContent = n;
  $('#scheda-titolo').textContent = u.titolo;
  $('#scheda-tipo').textContent = u.tipologia;
  $('#scheda-prezzo').innerHTML = u.venduta ? `<span class="scheda__venduta">${T.venduta}</span>` : `<strong>${euro(u.prezzo)}</strong>`;
  $('#scheda-prezzo-nota').textContent = u.venduta ? '' : T.ivaEsclusa;
  const dl = $('#scheda-dati'); dl.innerHTML = '';
  for (const [k, v] of u.dati) { const d = document.createElement('div'); d.innerHTML = '<dt></dt><dd></dd>'; d.querySelector('dt').textContent = k; d.querySelector('dd').textContent = v; dl.appendChild(d); }
  const box = $('#scheda-pianta');
  box.innerHTML = '';
  if (!u.venduta && u.pianta) {
    try { box.innerHTML = await (await fetch(BASE + 'piante/u' + n + '.svg')).text(); localizzaPianta(box); } catch (e) { box.textContent = ''; }
    box.insertAdjacentHTML('beforeend', `<button type="button" class="zoom">${T.ingrandisci}</button>`);
    box.querySelector('.zoom').addEventListener('click', () => apriLente(box.querySelector('svg')));
    box.parentElement.hidden = false;
  } else box.parentElement.hidden = true;
  // il sole sulla veranda, tre giorni dell'anno
  const tab = await caricaTabellaSole();
  const solEl = $('#scheda-sole');
  solEl.innerHTML = '';
  if (tab && tab.unita && tab.unita[n]) {
    for (const [g, et] of [[355, T.giorni.inverno], [80, T.giorni.equinozio], [172, T.giorni.estate]]) {
      const d = document.createElement('div');
      d.innerHTML = `<small>${et}</small><b>${oreTesto(minutiSole(tab, n, g, false))}</b><i>${T.conAlberi.replace('{h}', oreTesto(minutiSole(tab, n, g, true)))}</i>`;
      solEl.appendChild(d);
    }
    solEl.parentElement.hidden = false;
  } else solEl.parentElement.hidden = true;
  const vista = $('#scheda-vista');
  if (u.vista) { vista.querySelector('p').textContent = u.vista; vista.hidden = false; } else vista.hidden = true;
  $('#scheda-azioni').hidden = !!u.venduta;
  const cuoreScheda = $('#scheda-cuore'); cuoreScheda.dataset.unita = n; cuoreScheda.hidden = !!u.venduta; aggiornaCuori();
  $$('[data-scheda-richiedi]').forEach((b) => (b.dataset.unita = n));
  $$('[data-scheda-conto]').forEach((b) => (b.dataset.unita = n));
  scheda.classList.add('aperta'); veloScheda.classList.add('aperta');
  scheda.setAttribute('aria-hidden', 'false');
  $('.scheda__chiudi').focus();
  scena && (scena.scegli(n), scena.guardaUnita(n));
  history.replaceState(null, '', '#unita-' + n);
}
function chiudiScheda() {
  scheda.classList.remove('aperta'); veloScheda.classList.remove('aperta'); scheda.setAttribute('aria-hidden', 'true');
  scena && scena.scegli(null);
  if (statoCorrente === 'case' && scena) scena.vola('case', 1000);
  ultimoFuoco && ultimoFuoco.focus();
  history.replaceState(null, '', location.pathname + location.search);
}
$('.scheda__chiudi')?.addEventListener('click', chiudiScheda);
veloScheda?.addEventListener('click', chiudiScheda);
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if ($('.lente.aperta')) chiudiLente(); else if (scheda.classList.contains('aperta')) chiudiScheda(); } });
function localizzaPianta(box) {
  for (const t of $$('.p-etichette text', box)) t.textContent = T.stanze[t.dataset.r] || t.textContent;
  const s = box.querySelector('svg'); if (s) s.setAttribute('aria-label', T.piantaAria);
}
if (/^#unita-\d$/.test(location.hash)) setTimeout(() => apriScheda(location.hash.slice(7)), 600);

// lente: pianta a tutto schermo, trascina e ingrandisci
const lente = $('.lente'); let stLente = null;
function apriLente(svg) {
  if (!svg) return;
  const t = $('.lente__tela'); t.innerHTML = ''; const c = svg.cloneNode(true); t.appendChild(c);
  lente.classList.add('aperta');
  stLente = { s: 1, x: 0, y: 0, el: c, punti: new Map() };
  const vb = c.viewBox.baseVal; const W = t.clientWidth, H = t.clientHeight;
  const s0 = Math.min(W / vb.width, H / vb.height) * 0.92;
  c.style.width = vb.width * s0 + 'px'; c.style.height = vb.height * s0 + 'px';
  stLente.x = (W - vb.width * s0) / 2; stLente.y = (H - vb.height * s0) / 2; applicaLente();
  $('.lente__chiudi').focus();
}
function applicaLente() { stLente.el.style.transform = `translate(${stLente.x}px,${stLente.y}px) scale(${stLente.s})`; }
function chiudiLente() { lente.classList.remove('aperta'); stLente = null; $('#scheda-pianta .zoom')?.focus(); }
$('.lente__chiudi')?.addEventListener('click', chiudiLente);
const lt = $('.lente__tela');
lt?.addEventListener('wheel', (e) => { if (!stLente) return; e.preventDefault(); const k = Math.exp(-e.deltaY * 0.0015); zoomA(e.clientX, e.clientY, k); }, { passive: false });
function zoomA(cx, cy, k) { const s2 = clamp(stLente.s * k, 0.6, 8); k = s2 / stLente.s; stLente.x = cx - (cx - stLente.x) * k; stLente.y = cy - (cy - stLente.y) * k; stLente.s = s2; applicaLente(); }
lt?.addEventListener('pointerdown', (e) => { if (!stLente) return; lt.setPointerCapture(e.pointerId); stLente.punti.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
lt?.addEventListener('pointermove', (e) => {
  if (!stLente || !stLente.punti.has(e.pointerId)) return;
  const prima = stLente.punti.get(e.pointerId);
  if (stLente.punti.size === 1) { stLente.x += e.clientX - prima.x; stLente.y += e.clientY - prima.y; applicaLente(); }
  else if (stLente.punti.size === 2) {
    const [a, b] = [...stLente.punti.values()];
    const d0 = Math.hypot(a.x - b.x, a.y - b.y);
    const altro = [...stLente.punti.entries()].find(([id]) => id !== e.pointerId)[1];
    const d1 = Math.hypot(e.clientX - altro.x, e.clientY - altro.y);
    if (d0 > 0) zoomA((e.clientX + altro.x) / 2, (e.clientY + altro.y) / 2, d1 / d0);
  }
  stLente.punti.set(e.pointerId, { x: e.clientX, y: e.clientY });
});
['pointerup', 'pointercancel'].forEach((t) => lt?.addEventListener(t, (e) => stLente && stLente.punti.delete(e.pointerId)));

// ------------------------------------------------------------------ il conto
const C = { unita: null, prima: true, posti: 0 };
const cSel = $('#conto-unita');
function conto() {
  if (!cSel) return;
  const u = UNITA[cSel.value]; if (!u) return;
  const iva = u.prezzo * (C.prima ? 0.04 : 0.10);
  const imposte = 600;
  $('#c-prezzo').textContent = euro(u.prezzo);
  $('#c-iva-et').textContent = C.prima ? T.conto.ivaPrima : T.conto.ivaSeconda;
  $('#c-iva').textContent = euro(iva);
  $('#c-imposte').textContent = euro(imposte);
  $('#c-totale').textContent = euro(u.prezzo + iva + imposte);
  const rp = $('#c-posti-riga'); rp.hidden = C.posti === 0;
  $('#c-posti').textContent = C.posti ? euro(C.posti * D.postoAuto) + ' + ' + T.conto.iva : '';
  $('#c-posti-et').textContent = T.conto.posti.replace('{n}', C.posti);
  $('#c-posti-n').textContent = C.posti;
  // come si paga: 10 / 20 / 70 sul prezzo della casa scelta (le quote sono nel testo, gli importi qui)
  const quote = [0.10, 0.20, 0.70];
  $$('[data-passo]').forEach((el) => { el.textContent = euro(u.prezzo * quote[+el.dataset.passo]); });
}
cSel?.addEventListener('change', conto);
$$('[data-prima]').forEach((b) => b.addEventListener('click', () => {
  C.prima = b.dataset.prima === 'si';
  $$('[data-prima]').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); conto();
}));
$$('[data-posti]').forEach((b) => b.addEventListener('click', () => { C.posti = clamp(C.posti + (+b.dataset.posti), 0, D.postiExtra); conto(); }));
conto();
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-scheda-conto]'); if (!b) return;
  if (cSel && UNITA[b.dataset.unita] && !UNITA[b.dataset.unita].venduta) { cSel.value = b.dataset.unita; conto(); }
  if (scheda.classList.contains('aperta')) chiudiScheda();
  setTimeout(() => $('#conto').scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth' }), 50);
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-apri-unita]'); if (!b) return;
  if (b.closest('.modale')) chiudiModale(b.closest('.modale'));
  apriScheda(b.dataset.apriUnita);
});
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-scheda-richiedi]'); if (!b) return;
  const u = UNITA[b.dataset.unita];
  const msg = $('#if-msg'); if (msg && u) msg.value = T.richiestaUnita.replace('{n}', u.n).replace('{titolo}', u.titolo);
  chiudiScheda(); setTimeout(() => { $('#contatti').scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth' }); $('#if-nome')?.focus({ preventScroll: true }); }, 50);
});

// ------------------------------------------------------------------ galleria
$$('.galleria__comandi button').forEach((b) => b.addEventListener('click', () => {
  const g = $('.galleria'); const f = g.querySelector('figure');
  g.scrollBy({ left: (f.offsetWidth + 16) * (b.dataset.dir === 'avanti' ? 1 : -1), behavior: ridotto ? 'auto' : 'smooth' });
}));

// ------------------------------------------------------------------ moduli verso il CRM
// Porta pubblica del CRM (tsv-pg /api/modulo-pubblico, dal 09/10/2026). I nomi dei campi sono
// quelli che la porta legge (web/lib/ingresso/modulo-pubblico.ts): cambiarli qui senza cambiarli
// là fa rifiutare ogni richiesta. generate_lead e il contatore partono solo a richiesta arrivata.
const PORTA = 'https://tsv-pg.vercel.app/api/modulo-pubblico';
const cifre = (v) => (v.match(/\d/g) || []).length;
function collega(form, { tipo, emailObbligatoria, errore: errEl, ok, dopo }) {
  if (!form) return;
  let apertoIl = 0; // dal primo campo toccato: la porta usa il tempo di compilazione contro i robot
  const campo = (n) => form.elements[n];
  const btn = form.querySelector('button[type=submit]');
  const etichetta = btn.querySelector('.btn__label');
  const testoBtn = etichetta.textContent;
  const MSG = T.moduli;
  const pulisci = () => { errEl.classList.remove('visibile'); errEl.textContent = ''; ['nome', 'email', 'telefono', 'messaggio', 'privacy'].forEach((n) => campo(n) && campo(n).removeAttribute('aria-invalid')); };
  const errore = (k, conPdf) => {
    errEl.textContent = MSG[k] || MSG.rete;
    if (conPdf) { const a = document.createElement('a'); a.href = BASE + 'pdf/elegie-duino-brochure.pdf'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = MSG.pdfComunque; errEl.append(' ', a); }
    errEl.classList.add('visibile');
    const n = k === 'recapito' ? 'email' : k; if (campo(n)) { campo(n).setAttribute('aria-invalid', 'true'); campo(n).focus(); }
  };
  const verifica = () => {
    const nome = campo('nome').value.trim().replace(/\s+/g, ' ');
    const email = campo('email').value.trim();
    const tel = campo('telefono')?.value.trim() || '';
    if (nome.length < 2) return 'nome';
    if (emailObbligatoria ? !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) : (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) return 'email';
    if (tel && (!/^[0-9+().\s\/-]{6,40}$/.test(tel) || cifre(tel) < 6 || cifre(tel) > 16)) return 'telefono';
    if (!emailObbligatoria && !email && !tel) return 'recapito';
    if (campo('messaggio') && campo('messaggio').value.trim().length > 2000) return 'messaggio';
    if (!campo('privacy').checked) return 'privacy';
    return null;
  };
  form.addEventListener('focusin', () => { if (!apertoIl) apertoIl = Date.now(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); pulisci();
    const sb = verifica(); if (sb) { errore(sb, false); return; }
    const dati = new URLSearchParams();
    dati.set('modulo', tipo);
    dati.set('nome', campo('nome').value.trim());
    dati.set('email', campo('email').value.trim());
    dati.set('telefono', campo('telefono')?.value.trim() || '');
    if (campo('messaggio')) dati.set('messaggio', campo('messaggio').value.trim());
    dati.set('privacy', 'si');
    dati.set('lingua', LINGUA);
    dati.set('pagina', location.pathname);
    if (window.edProvenienza) { const pv = window.edProvenienza(); if (pv) dati.set('provenienza', pv); }
    dati.set('t', String(apertoIl ? Date.now() - apertoIl : ''));
    dati.set('hp_ed', campo('hp_ed').value);
    btn.disabled = true; etichetta.textContent = MSG.invio;
    try {
      const res = await fetch(PORTA, { method: 'POST', body: dati });
      let json = null; try { json = await res.json(); } catch (_) { /* 403: corpo vuoto */ }
      if (res.ok && json && json.ok) {
        try { if (window.gtag) window.gtag('event', 'generate_lead', { modulo: tipo }); } catch (_) {}
        try { if (window.edContaEvento) window.edContaEvento('lead:' + tipo); } catch (_) {}
        form.hidden = true; ok.classList.add('visibile'); ok.focus?.();
        dopo && dopo();
        return;
      }
      if (res.status === 429) errore('troppe', tipo === 'brochure');
      else if (res.status === 400 && json && json.campo && json.campo !== 'modulo') errore(json.campo, false);
      else errore('rete', tipo === 'brochure');
    } catch (err) { errore('rete', tipo === 'brochure'); }
    finally { btn.disabled = false; etichetta.textContent = testoBtn; }
  });
}
collega($('#info-form'), { tipo: 'info', emailObbligatoria: false, errore: $('#if-error'), ok: $('#info-ok') });
collega($('#brochure-form'), { tipo: 'brochure', emailObbligatoria: true, errore: $('#bf-error'), ok: $('#brochure-ok'), dopo: () => window.open(BASE + 'pdf/elegie-duino-brochure.pdf', '_blank') });
// modali: brochure, confronto delle preferite, tour 3D del terreno
let fuocoModale = null;
function apriModale(id, da, fuoco) {
  const m = $('#' + id); if (!m) return;
  fuocoModale = da || document.activeElement;
  m.classList.add('aperta');
  setTimeout(() => (fuoco ? $(fuoco, m) : m.querySelector('.modale__chiudi'))?.focus(), 40);
}
function chiudiModale(m) {
  m = m || $('.modale.aperta'); if (!m) return;
  m.classList.remove('aperta');
  if (m.id === 'tour') svuotaTour();
  fuocoModale && document.contains(fuocoModale) && fuocoModale.focus();
}
$$('[data-apri-brochure]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); apriModale('brochure-modale', b, '#bf-nome'); }));
$$('[data-chiudi-modale]').forEach((b) => b.addEventListener('click', () => chiudiModale(b.closest('.modale'))));
$$('.modale').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) chiudiModale(m); }));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && $('.modale.aperta')) chiudiModale(); });
$$('[data-vai-contatti]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); $('#contatti').scrollIntoView({ behavior: ridotto ? 'auto' : 'smooth' }); setTimeout(() => $('#if-nome')?.focus({ preventScroll: true }), 600); }));

// ------------------------------------------------------------------ la bora (capitolo «Il nome»)
// Tratti di vento da est-nord-est, come la mattina del gennaio 1912: solo disegno, nessuna immagine.
(function bora() {
  const c = $('.nome__vento'); if (!c) return;
  const ctx = c.getContext('2d'); const sez = $('#nome');
  let W = 0, H = 0, tratti = [], vivo = false, raf = 0;
  const dpr = Math.min(devicePixelRatio, 2);
  const nuovo = (inizio) => ({ x: inizio ? Math.random() * W : W + Math.random() * 200, y: Math.random() * H * 1.2 - H * 0.1, l: 60 + Math.random() * 220, v: 2.2 + Math.random() * 4.5, a: 0.05 + Math.random() * 0.09, w: 0.6 + Math.random() * 0.9 });
  function misura() { W = sez.clientWidth; H = sez.clientHeight; c.width = W * dpr; c.height = H * dpr; c.style.width = W + 'px'; c.style.height = H + 'px'; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); tratti = Array.from({ length: Math.round(W * H / 9000) }, () => nuovo(true)); }
  const pend = Math.tan(14 * Math.PI / 180);
  function disegna() {
    ctx.clearRect(0, 0, W, H);
    for (const t of tratti) {
      ctx.strokeStyle = `rgba(27,33,37,${t.a})`; ctx.lineWidth = t.w;
      ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(t.x + t.l, t.y - t.l * pend); ctx.stroke();
      if (!ridotto) { t.x -= t.v; t.y += t.v * pend; if (t.x + t.l < 0 || t.y > H + 40) Object.assign(t, nuovo(false)); }
    }
    if (vivo && !ridotto) raf = requestAnimationFrame(disegna);
  }
  new IntersectionObserver(([e]) => { vivo = e.isIntersecting; cancelAnimationFrame(raf); if (vivo) { if (!W) misura(); disegna(); } }).observe(sez);
  addEventListener('resize', () => { if (W) { misura(); if (!vivo) disegna(); } });
})();

// ------------------------------------------------------------------ le piante, una accanto all'altra
const P = D.piante;
const svgCache = {};
const svgPianta = (n) => (svgCache[n] ||= fetch(BASE + 'piante/u' + n + '.svg').then((r) => { if (!r.ok) throw new Error(r.status); return r.text(); }));
async function mettiPianta(box, n) {
  try {
    box.innerHTML = await svgPianta(n);
    localizzaPianta(box);
    const s = box.querySelector('svg'); if (s) { s.removeAttribute('role'); s.setAttribute('aria-hidden', 'true'); }
  } catch (err) { /* resta il segnaposto */ }
}
const ioPiante = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return; ioPiante.unobserve(e.target); mettiPianta(e.target, e.target.dataset.pianta);
}), { rootMargin: '700px 0px' });
$$('.pianta-mini').forEach((m) => ioPiante.observe(m));
$$('.filtri button').forEach((b) => b.addEventListener('click', () => {
  $$('.filtri button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  const f = b.dataset.filtro;
  $$('.pianta-carta').forEach((c) => { c.hidden = !c.dataset.filtri.split(' ').includes(f); });
}));

// ------------------------------------------------------------------ preferite e confronto
// Le preferite restano in questo browser (localStorage): nessun dato parte da qui.
const CHIAVE_PREF = 'ed_preferite_v1';
const CF = D.confronto;
let preferite = [];
try { preferite = JSON.parse(localStorage.getItem(CHIAVE_PREF) || '[]').filter((n) => UNITA[n] && !UNITA[n].venduta); } catch (e) { preferite = []; }
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function salvaPref() { try { localStorage.setItem(CHIAVE_PREF, JSON.stringify(preferite)); } catch (e) { /* memoria bloccata: valgono per questa visita */ } }
function aggiornaCuori() {
  const etichetta = (on) => (on ? P.salvata : P.salva);
  $$('[data-cuore]').forEach((b) => { const on = preferite.includes(b.dataset.cuore); b.setAttribute('aria-pressed', String(on)); b.setAttribute('aria-label', etichetta(on)); b.title = etichetta(on); });
  const sc = $('#scheda-cuore');
  if (sc && sc.dataset.unita) { const on = preferite.includes(sc.dataset.unita); sc.setAttribute('aria-pressed', String(on)); sc.setAttribute('aria-label', etichetta(on)); sc.title = etichetta(on); }
  const bar = $('.preferite'); if (bar) { bar.hidden = preferite.length === 0; $('#pref-n').textContent = preferite.length; }
  if ($('#confronto')?.classList.contains('aperta')) disegnaConfronto();
}
function alterna(n, btn) {
  const i = preferite.indexOf(n);
  if (i >= 0) preferite.splice(i, 1); else preferite.push(n);
  salvaPref(); aggiornaCuori();
  if (btn) { btn.classList.remove('pop'); void btn.offsetWidth; btn.classList.add('pop'); }
  try { if (i < 0 && window.edContaEvento) window.edContaEvento('preferita:' + n); } catch (e) {}
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cuore]'); if (b) { alterna(b.dataset.cuore, b); return; }
  const t = e.target.closest('[data-togli]'); if (t) alterna(t.dataset.togli);
});
$('#scheda-cuore')?.addEventListener('click', (e) => { const n = e.currentTarget.dataset.unita; if (n) alterna(n, e.currentTarget); });
$('[data-svuota]')?.addEventListener('click', () => { preferite = []; salvaPref(); aggiornaCuori(); });
$('[data-confronta]')?.addEventListener('click', (e) => { disegnaConfronto(); apriModale('confronto', e.currentTarget); });
async function disegnaConfronto() {
  const box = $('#confronto-tavola'); if (!box) return;
  if (!preferite.length) { box.innerHTML = `<p class="confronto__vuoto">${esc(CF.vuoto)}</p>`; return; }
  const us = preferite.map((n) => UNITA[n]).filter(Boolean);
  const tab = await caricaTabellaSole();
  const sole = (n, g) => minutiSole(tab, n, g, false);
  const valore = (u, k) => {
    const c = u.confronto;
    if (k === 'prezzo' || k === 'totale1' || k === 'totale2') return euro(c[k]);
    if (k.startsWith('sole')) return oreTesto(sole(u.n, +k.slice(4)));
    return c[k] ?? '—';
  };
  // in grassetto il migliore di ogni riga numerica: il prezzo più basso, il sole più lungo
  const migliore = {};
  for (const k of ['prezzo', 'totale1', 'totale2']) migliore[k] = Math.min(...us.map((u) => u.confronto[k]));
  for (const g of [355, 80, 172]) migliore['sole' + g] = Math.max(...us.map((u) => sole(u.n, g) ?? -1));
  const eMigliore = (u, k) => us.length > 1 && (k in migliore) && (k.startsWith('sole') ? sole(u.n, +k.slice(4)) === migliore[k] : u.confronto[k] === migliore[k]);
  let h = '<table><thead><tr><th scope="col"><span class="sr">—</span></th>';
  for (const u of us) h += `<th scope="col"><b class="num">${esc(u.n)}</b><span>${esc(u.tipologia)}</span><br><button type="button" data-togli="${esc(u.n)}">${esc(CF.togli)}</button></th>`;
  h += '</tr></thead><tbody>';
  for (const [k, et] of CF.righe) {
    h += `<tr><th scope="row">${esc(et)}</th>`;
    for (const u of us) {
      if (k === 'pianta') h += `<td><button type="button" class="mini" data-apri-unita="${esc(u.n)}" data-mini="${esc(u.n)}" aria-label="${esc(P.apri)} · ${esc(u.titolo)}"></button></td>`;
      else h += `<td class="num${eMigliore(u, k) ? ' migliore' : ''}">${esc(valore(u, k))}</td>`;
    }
    h += '</tr>';
  }
  h += '</tbody></table>';
  if (us.length < 2) h = `<p class="confronto__vuoto" style="font-size:18px;margin-bottom:14px">${esc(CF.vuoto)}</p>` + h;
  box.innerHTML = h;
  $$('[data-mini]', box).forEach((b) => mettiPianta(b, b.dataset.mini));
}
aggiornaCuori();

// ------------------------------------------------------------------ il terreno oggi: tour 3D (Matterport, 15/09/2026)
// Il visore è un servizio esterno: si carica solo quando la persona lo chiede, mai da solo.
function svuotaTour() {
  const t = $('#tour-tela'); const f = t && t.querySelector('iframe');
  if (f) { f.remove(); t.querySelector('.tour__invito').hidden = false; }
}
$$('[data-apri-tour]').forEach((b) => b.addEventListener('click', () => apriModale('tour', b, '[data-carica-tour]')));
$('[data-carica-tour]')?.addEventListener('click', () => {
  const t = $('#tour-tela'); if (!t || t.querySelector('iframe')) return;
  const f = document.createElement('iframe');
  f.src = D.tour + '&play=1&qs=1';
  f.title = $('#tour-t').textContent;
  f.allow = 'fullscreen; xr-spatial-tracking';
  f.setAttribute('allowfullscreen', '');
  t.querySelector('.tour__invito').hidden = true;
  t.appendChild(f);
  try { window.edContaEvento && window.edContaEvento('tour3d:terreno'); } catch (e) {}
});
