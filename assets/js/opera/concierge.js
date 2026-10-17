// Elegie Duino — il concierge AI (17/10/2026).
// Il sito è statico: la chat parla direttamente col CRM di TriesteVillas (tsv-pg, /api/web/ed-chat), che conserva la
// conversazione, conta le risposte, decide quando proporre una persona e manda le richieste alla porta unica dei lead.
// Qui solo l'interfaccia: il pulsante appare se il CRM risponde «acceso»; la conversazione resta in questa scheda del
// browser (sessionStorage) finché la si chiude, come dice l'informativa.
const D = JSON.parse(document.getElementById('dati').textContent);
const Q = D.concierge;
const T = D.testi;
const LINGUA = D.lingua;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

const apri = $('.concierge-apri');
const pannello = $('#concierge');
const flusso = $('.concierge__flusso', pannello);
const persona = $('.concierge__persona', pannello);
const scrivi = $('.concierge__scrivi', pannello);
const testo = $('#chat-testo');
const invia = $('button[type=submit]', scrivi);
const CHIAVE_SID = 'ed_chat_sid', CHIAVE_STORIA = 'ed_chat_storia', CHIAVE_STATO = 'ed_chat_stato';
let inCorso = false;

const memoria = {
  leggi(k, d) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  scrivi(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* memoria bloccata: la chat vale per questa pagina */ } },
  togli(k) { try { sessionStorage.removeItem(k); } catch (e) {} },
};
function nuovoSid() {
  const a = new Uint8Array(18); crypto.getRandomValues(a);
  return 'ed_' + Array.from(a, (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');
}
let sid = memoria.leggi(CHIAVE_SID, null) || nuovoSid();
memoria.scrivi(CHIAVE_SID, sid);
let storia = memoria.leggi(CHIAVE_STORIA, []);
let stato = memoria.leggi(CHIAVE_STATO, { proponi: false, chiuso: false, consegnato: false });

// ------------------------------------------------------------------ il testo delle risposte
// Il modello scrive testo semplice: paragrafi, elenchi con «-», qualche indirizzo. Qui lo si rende sicuro (mai HTML
// del modello) e i collegamenti a elegieduino.it diventano ancore della pagina in cui si è.
const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function collega(riga) {
  return riga.replace(/https?:\/\/[^\s<]+[^\s<.,;:!?)»"']/g, (url) => {
    const m = url.match(/^https?:\/\/(?:www\.)?elegieduino\.it\/(?:(en|de|sl)\/)?(#[a-z0-9-]+)?$/i);
    if (m && (m[1] || 'it') === LINGUA && m[2]) return `<a href="${m[2]}">${url}</a>`;
    return `<a href="${url}" target="_blank" rel="noopener">${url}</a>`;
  }).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}
function rendi(t) {
  const righe = esc(t).split('\n');
  let h = '', lista = false;
  for (const r of righe) {
    const x = r.trim();
    if (/^[-•·]\s+/.test(x)) { if (!lista) { h += '<ul>'; lista = true; } h += `<li>${collega(x.replace(/^[-•·]\s+/, ''))}</li>`; continue; }
    if (lista) { h += '</ul>'; lista = false; }
    if (x) h += `<p>${collega(x)}</p>`;
  }
  if (lista) h += '</ul>';
  return h || '<p></p>';
}

// ------------------------------------------------------------------ disegno
function fumetto(ruolo, t) {
  const d = document.createElement('div');
  d.className = 'msg ' + (ruolo === 'tu' ? 'msg--tu' : 'msg--ai');
  if (ruolo === 'tu') d.innerHTML = `<p>${esc(t).replace(/\n/g, '<br>')}</p>`; else d.innerHTML = rendi(t);
  flusso.appendChild(d);
  return d;
}
function errore(t) {
  const d = document.createElement('div'); d.className = 'msg msg--errore'; d.setAttribute('role', 'alert'); d.textContent = t; flusso.appendChild(d); scorri();
}
function scorri() { flusso.scrollTop = flusso.scrollHeight; }
function proposta() {
  if ($('.proponi', flusso)) { flusso.appendChild($('.proponi', flusso)); return; }
  const d = document.createElement('div');
  d.className = 'proponi';
  d.innerHTML = `<p>${esc(Q.umano_testo)}</p><button type="button" class="btn btn--scuro btn--piccolo" data-persona>${esc(Q.umano)}</button>`;
  flusso.appendChild(d);
}
function ridisegna() {
  $$('.msg:not(:first-child), .proponi, .concierge__fatto', flusso).forEach((n) => n.remove());
  $('.concierge__esempi', flusso).hidden = storia.length > 0;
  for (const m of storia) fumetto(m.ruolo, m.testo);
  if (stato.proponi || stato.chiuso) proposta();
  if (stato.consegnato) fatto(stato.consegnato);
  scrivi.hidden = !!stato.chiuso;
  scorri();
}
function fatto(t) {
  if ($('.concierge__fatto', flusso)) return;
  const d = document.createElement('div'); d.className = 'concierge__fatto'; d.setAttribute('role', 'status'); d.textContent = t; flusso.appendChild(d);
}

// ------------------------------------------------------------------ apri e chiudi
function mostra() {
  pannello.hidden = false; apri.setAttribute('aria-expanded', 'true'); apri.hidden = true;
  document.documentElement.classList.add('concierge-aperto');
  ridisegna();
  setTimeout(() => (stato.chiuso ? $('[data-persona]', pannello) : testo)?.focus(), 30);
  try { window.edContaEvento && window.edContaEvento('concierge:aperto'); } catch (e) {}
}
function nascondi() {
  pannello.hidden = true; apri.hidden = false; apri.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('concierge-aperto');
  apri.focus();
}
apri?.addEventListener('click', mostra);
$('.concierge__chiudi', pannello)?.addEventListener('click', nascondi);
pannello?.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); if (!persona.hidden) chiudiPersona(); else nascondi(); } });
$('[data-ricomincia]', pannello)?.addEventListener('click', () => {
  sid = nuovoSid(); storia = []; stato = { proponi: false, chiuso: false, consegnato: false };
  memoria.scrivi(CHIAVE_SID, sid); memoria.togli(CHIAVE_STORIA); memoria.togli(CHIAVE_STATO);
  chiudiPersona(); ridisegna(); testo.focus();
});

// ------------------------------------------------------------------ parlare
function unitaAperta() { const m = location.hash.match(/^#unita-(\d)$/); return m ? m[1] : undefined; }
async function chiedi(domanda) {
  domanda = domanda.trim(); if (!domanda || inCorso || stato.chiuso) return;
  inCorso = true; invia.disabled = true;
  $('.concierge__esempi', flusso).hidden = true;
  storia.push({ ruolo: 'tu', testo: domanda }); memoria.scrivi(CHIAVE_STORIA, storia);
  fumetto('tu', domanda);
  const attesa = document.createElement('div'); attesa.className = 'msg--pensa'; attesa.setAttribute('aria-label', Q.pensa); attesa.innerHTML = '<i></i><i></i><i></i>';
  flusso.appendChild(attesa); scorri();
  const ctrl = new AbortController(); const tempo = setTimeout(() => ctrl.abort(), 60000);
  try {
    const corpo = { sid, lingua: LINGUA, messaggio: domanda, pagina: location.pathname, unita: unitaAperta() };
    if (window.edProvenienza) { try { corpo.provenienza = window.edProvenienza(); } catch (e) {} }
    const r = await fetch(Q.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo), signal: ctrl.signal });
    const j = await r.json().catch(() => null);
    attesa.remove();
    if (!r.ok || !j || !j.testo) throw new Error('risposta ' + r.status);
    storia.push({ ruolo: 'ai', testo: j.testo }); memoria.scrivi(CHIAVE_STORIA, storia);
    fumetto('ai', j.testo);
    if (j.proponi || j.chiuso) { stato.proponi = true; proposta(); }
    if (j.chiuso || j.bloccato) { stato.chiuso = true; scrivi.hidden = true; }
    memoria.scrivi(CHIAVE_STATO, stato);
    scorri();
  } catch (err) {
    attesa.remove();
    storia.pop(); memoria.scrivi(CHIAVE_STORIA, storia);
    errore(Q.errore);
    stato.proponi = true; proposta(); scorri();
  } finally {
    clearTimeout(tempo); inCorso = false; invia.disabled = false;
  }
}
scrivi?.addEventListener('submit', (e) => { e.preventDefault(); const t = testo.value; testo.value = ''; cresci(); chiedi(t); });
testo?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); scrivi.requestSubmit(); } });
function cresci() { testo.style.height = 'auto'; testo.style.height = Math.min(testo.scrollHeight, 140) + 'px'; }
testo?.addEventListener('input', cresci);
$$('.concierge__esempi button', pannello).forEach((b) => b.addEventListener('click', () => chiedi(b.textContent)));

// ------------------------------------------------------------------ una persona
function apriPersona() {
  persona.hidden = false; flusso.hidden = true; scrivi.hidden = true;
  setTimeout(() => $('#cl-nome')?.focus(), 30);
  try { window.edContaEvento && window.edContaEvento('concierge:persona'); } catch (e) {}
}
function chiudiPersona() { persona.hidden = true; flusso.hidden = false; scrivi.hidden = !!stato.chiuso; scorri(); }
pannello?.addEventListener('click', (e) => { if (e.target.closest('[data-persona]')) apriPersona(); });
$('[data-indietro]', pannello)?.addEventListener('click', chiudiPersona);

const lettera = $('#chat-lettera');
const cifre = (v) => (v.match(/\d/g) || []).length;
lettera?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = lettera.elements; const errEl = $('.form__errore', lettera); const btn = $('button[type=submit]', lettera); const et = $('.btn__label', btn);
  const MSG = T.moduli;
  const sbaglio = (k, campo) => { errEl.textContent = MSG[k] || MSG.rete; errEl.classList.add('visibile'); if (campo) { campo.setAttribute('aria-invalid', 'true'); campo.focus(); } };
  errEl.classList.remove('visibile'); ['nome', 'email', 'telefono'].forEach((n) => f[n].removeAttribute('aria-invalid'));
  const nome = f.nome.value.trim().replace(/\s+/g, ' '), email = f.email.value.trim(), tel = f.telefono.value.trim();
  if (nome.length < 2) return sbaglio('nome', f.nome);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return sbaglio('email', f.email);
  if (tel && (!/^[0-9+().\s\/-]{6,40}$/.test(tel) || cifre(tel) < 6 || cifre(tel) > 16)) return sbaglio('telefono', f.telefono);
  if (!email && !tel) return sbaglio('recapito', f.telefono);
  // il CRM vuole il recapito che va con la scelta: la mail per «una mail», il telefono per chiamata e WhatsApp
  const pref = (lettera.querySelector('input[name=preferenza]:checked') || {}).value || 'richiamo';
  const manca = (testo, campo) => { errEl.textContent = testo; errEl.classList.add('visibile'); campo.setAttribute('aria-invalid', 'true'); campo.focus(); };
  if (pref === 'email' && !email) return manca(Q.serve_email, f.email);
  if (pref !== 'email' && !tel) return manca(Q.serve_tel, f.telefono);
  if (!f.consenso.checked) return sbaglio('privacy', f.consenso);
  const corpo = {
    sid, lingua: LINGUA, pagina: location.pathname, unita: unitaAperta(), hp_ed: f.hp_ed.value,
    lettera: { nome, email, telefono: tel, preferenza: pref, nota: f.nota.value.trim().slice(0, 600), consenso: true },
  };
  if (window.edProvenienza) { try { corpo.provenienza = window.edProvenienza(); } catch (err) {} }
  const prima = et.textContent; btn.disabled = true; et.textContent = MSG.invio;
  try {
    const r = await fetch(Q.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    const j = await r.json().catch(() => null);
    if (!r.ok || !j || !j.ok) {
      const campi = { nome: ['nome', f.nome], email: ['email', f.email], telefono: ['telefono', f.telefono], recapito: ['recapito', f.telefono], consenso: ['privacy', f.consenso] };
      if (j && campi[j.campo]) return sbaglio(campi[j.campo][0], campi[j.campo][1]);
      sbaglio(r.status === 429 ? 'troppe' : 'rete'); return;
    }
    stato.consegnato = j.testo || Q.manda_ok; memoria.scrivi(CHIAVE_STATO, stato);
    try { if (window.gtag) window.gtag('event', 'generate_lead', { modulo: 'chat' }); } catch (err) {}
    try { if (window.edContaEvento) window.edContaEvento('lead:chat'); } catch (err) {}
    lettera.reset(); chiudiPersona(); fatto(stato.consegnato); scorri();
  } catch (err) { sbaglio('rete'); }
  finally { btn.disabled = false; et.textContent = prima; }
});

// ------------------------------------------------------------------ acceso o spento: lo dice il CRM
(async function () {
  if (!apri || !Q.url) return;
  try {
    const ctrl = new AbortController(); setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(Q.url + '?stato=1', { signal: ctrl.signal });
    const j = await r.json();
    if (j && j.acceso) { apri.hidden = false; if (storia.length && memoria.leggi('ed_chat_aperto', false)) mostra(); }
  } catch (e) { /* CRM irraggiungibile o chat spenta: il pulsante resta nascosto, il resto della pagina funziona */ }
})();
addEventListener('pagehide', () => memoria.scrivi('ed_chat_aperto', !pannello.hidden));
