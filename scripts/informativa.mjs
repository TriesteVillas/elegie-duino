#!/usr/bin/env node
// L'INFORMATIVA DI ELEGIEDUINO.IT E IL CONTRATTO INF-1 — «ogni modulo dichiara la sua informativa» (25/11/2026 notte,
// Martino: «Fallo»; tsv-pg web/lib/provenienze/contratto-informativa.ts, KB tsv-kb progetti/compliance/RIPRESA.md §0.35).
// Il sito è statico (GitHub Pages): niente server che firmi. I moduli mandano alla porta pubblica del CRM
// (assets/js/opera/app.js → tsv-pg /api/modulo-pubblico) i campi informativa_versione, informativa_impronta, presa_visione,
// presa_visione_testo e consensi; il CRM ricompone la dichiarazione (lib/ingresso/modulo-pubblico.ts, dichiarazioneDaiCampi)
// e legge da sé /privacy-versione.json. Questo script è la fonte di versione e impronte. Puro Node, senza dipendenze.
//
//   node scripts/informativa.mjs --scrivi     ricalcola le impronte, scrive /privacy-versione.json e il piede di ogni
//                                             privacy.html (versione, impronta, storico); POI python3 scripts/opera/genera.py,
//                                             che porta versione e impronta nei due moduli di ogni lingua
//   node scripts/informativa.mjs --controlla  il cancello (Action .github/workflows/informativa.yml, a ogni push):
//     ROSSO se il testo di una privacy.html è cambiato e la versione è la stessa («alza VERSIONE_INFORMATIVA»), se il
//     piede, /privacy-versione.json o i moduli delle pagine portano una versione o un'impronta diverse da quelle calcolate,
//     se un modulo ha ancora una casella privacy, una casella spuntata in partenza, un «accetto / acconsento», o non ha la
//     riga col link all'informativa accanto al tasto. AVVISO (esce 0) se la versione è nuova e i file non sono rigenerati.
//
// IL METODO DELL'IMPRONTA: sha256 (utf8, esadecimale) del testo di <main class="legal">…</main> della privacy.html di
// quella lingua: i tag tolti (al loro posto uno spazio), le entità HTML decodificate, Unicode NFC, ogni sequenza di spazi
// bianchi ridotta a uno spazio, senza spazi in testa e in coda. Il piede con versione, impronta e storico sta FUORI da
// <main>, fra i segni <!-- INF-1:inizio --> e <!-- INF-1:fine -->: non entra nell'impronta.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RADICE = join(dirname(fileURLToPath(import.meta.url)), "..");

// Chi cambia una parola di una privacy.html, in qualunque lingua, alza qui la data o il numero in coda, lancia --scrivi e
// genera.py, e aggiunge la voce in testa a STORICO (chiudendo la precedente con `al`).
export const VERSIONE_INFORMATIVA = "INF-ED-2026-11-25-1";
export const CONTRATTO = "INF-1";
export const DOMINIO = "https://elegieduino.it";
export const LINGUE = ["it", "en", "de", "sl"];
const FILE = { it: "privacy.html", en: "en/privacy.html", de: "de/privacy.html", sl: "sl/privacy.html" };
const PAGINA = { it: "index.html", en: "en/index.html", de: "de/index.html", sl: "sl/index.html" };
export const urlInformativa = (l) => `${DOMINIO}/${FILE[l]}`;
export const METODO_IMPRONTA =
  "sha256 (utf8, esadecimale) del testo di <main class=\"legal\">…</main> della privacy.html di quella lingua: tag tolti " +
  "(al loro posto uno spazio), entità HTML decodificate, Unicode NFC, ogni sequenza di spazi bianchi ridotta a uno spazio, " +
  "senza spazi in testa e in coda. Il piede con versione, impronta e storico sta fuori da <main>. È la stringa `testo`.";

// LO STORICO, da stanotte in avanti (prima del 25/11/2026 la pagina non portava un'etichetta di versione).
// `dal`: l'ora in cui GitHub Pages ha pubblicato la versione; `al` null = in vigore.
export const STORICO = [
  {
    versione: "INF-ED-2026-11-25-1",
    dal: "2026-11-25T14:01:13+01:00", // GitHub Pages: build di ebd4b99 finita alle 13:01:13Z
    al: null,
    nota: {
      it: "Prima versione con un'etichetta: a ogni invio registriamo quale versione dell'informativa la pagina mostrava, la lingua, l'ora e il testo delle caselle di consenso; per rispondere a una richiesta la base sono le misure precontrattuali, gli aggiornamenti del cantiere solo col consenso; versione e impronta del testo in fondo alla pagina.",
      en: "First version with a label: with every form we record which version of this notice the page was showing, the language, the time and the wording of the consent boxes; replying to a request is based on pre-contractual measures, building-site updates only with consent; version and fingerprint of the text at the bottom of the page.",
      de: "Erste Version mit Kennzeichnung: Bei jedem Formular speichern wir, welche Version dieser Erklärung die Seite zeigte, die Sprache, die Uhrzeit und den Wortlaut der Einwilligungsfelder; die Antwort auf eine Anfrage beruht auf vorvertraglichen Maßnahmen, Neuigkeiten von der Baustelle nur mit Einwilligung; Version und Fingerabdruck des Textes unten auf der Seite.",
      sl: "Prva različica z oznako: ob vsakem obrazcu shranimo, katero različico tega obvestila je stran prikazovala, jezik, uro in besedilo polj za privolitev; odgovor na povpraševanje temelji na ukrepih pred sklenitvijo pogodbe, novice z gradbišča samo s privolitvijo; različica in prstni odtis besedila na dnu strani.",
    },
  },
];

const ETICHETTE = {
  it: { versione: "Versione dell'informativa", impronta: "Impronta SHA-256 di questo testo", titolo: "Storico delle versioni", inVigore: "in vigore", nonPiu: "non più in vigore", dal: "dal", al: "al", improntaBreve: "Impronta SHA-256", integrale: "Il testo integrale di una versione precedente si può chiedere a privacy@triestevillas.com." },
  en: { versione: "Version of this notice", impronta: "SHA-256 fingerprint of this text", titolo: "Version history", inVigore: "in force", nonPiu: "no longer in force", dal: "from", al: "to", improntaBreve: "SHA-256 fingerprint", integrale: "The full text of any earlier version is available on request from privacy@triestevillas.com." },
  de: { versione: "Version dieser Erklärung", impronta: "SHA-256-Fingerabdruck dieses Textes", titolo: "Versionsverlauf", inVigore: "gültig", nonPiu: "nicht mehr gültig", dal: "vom", al: "bis", improntaBreve: "SHA-256-Fingerabdruck", integrale: "Den vollständigen Text einer früheren Version erhalten Sie auf Anfrage unter privacy@triestevillas.com." },
  sl: { versione: "Različica obvestila", impronta: "Prstni odtis SHA-256 tega besedila", titolo: "Zgodovina različic", inVigore: "v veljavi", nonPiu: "ni več v veljavi", dal: "od", al: "do", improntaBreve: "Prstni odtis SHA-256", integrale: "Celotno besedilo prejšnje različice lahko zahtevate na naslovu privacy@triestevillas.com." },
};
const LOCALE = { it: "it-IT", en: "en-GB", de: "de-DE", sl: "sl-SI" };
const quando = (iso, l) => new Intl.DateTimeFormat(LOCALE[l], { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

const ENTITA = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", mdash: "—", ndash: "–", hellip: "…", middot: "·", eacute: "é", egrave: "è", agrave: "à", ograve: "ò", ugrave: "ù", igrave: "ì", euro: "€" };
const decodifica = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, c) => {
  if (c[0] === "#") return String.fromCodePoint(c[1] === "x" || c[1] === "X" ? parseInt(c.slice(2), 16) : parseInt(c.slice(1), 10));
  return ENTITA[c.toLowerCase()] ?? m;
});
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Il testo canonico della privacy in quella lingua (vedi IL METODO in testa). */
export function testoInformativa(l) {
  const html = readFileSync(join(RADICE, FILE[l]), "utf8");
  const i = html.indexOf('<main class="legal">');
  const j = html.indexOf("</main>", i);
  if (i < 0 || j < 0) throw new Error(`${FILE[l]}: manca <main class="legal">…</main>`);
  const dentro = html.slice(i + '<main class="legal">'.length, j).replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ");
  return decodifica(dentro.replace(/<[^>]+>/g, " ")).normalize("NFC").replace(/\s+/g, " ").trim();
}
export const improntaInformativa = (l) => createHash("sha256").update(testoInformativa(l), "utf8").digest("hex");

function rotta(impronte) {
  return {
    contratto: CONTRATTO,
    sito: "ED",
    marchio: "Elegie Duino",
    versione: VERSIONE_INFORMATIVA,
    data: /^INF-[A-Z0-9]+-(\d{4}-\d{2}-\d{2})-\d+$/.exec(VERSIONE_INFORMATIVA)?.[1] ?? "",
    commit: null,
    ambiente: "production",
    metodo_impronta: METODO_IMPRONTA,
    allineata: true,
    lingue: Object.fromEntries(LINGUE.map((l) => [l, { url: urlInformativa(l), impronta: impronte[l], sha256: impronte[l], testo: testoInformativa(l) }])),
    storico: STORICO.map((v) => ({ versione: v.versione, dal: v.dal, al: v.al, nota: v.nota.it, ...(v.versione === VERSIONE_INFORMATIVA ? { impronte } : v.impronte ? { impronte: v.impronte } : {}) })),
  };
}

/** Il piede della privacy.html: versione, impronta e storico chiuso, senza link (l'indirizzo privacy@ in chiaro). */
function piede(l, impronte) {
  const e = ETICHETTE[l];
  const voci = STORICO.map((v) => {
    const imp = v.versione === VERSIONE_INFORMATIVA ? impronte[l] : v.impronte?.[l];
    return `<li><strong>${esc(v.versione)}</strong> · ${v.al ? e.nonPiu : e.inVigore} · ${e.dal} ${esc(quando(v.dal, l))}${v.al ? ` ${e.al} ${esc(quando(v.al, l))}` : ""}<br>${esc(v.nota[l])}${imp ? `<br>${e.improntaBreve}: <code style="overflow-wrap:anywhere;word-break:break-all">${imp}</code>` : ""}</li>`;
  }).join("");
  return `<!-- INF-1:inizio — scritto da scripts/informativa.mjs --scrivi, non si corregge a mano -->
<section class="legal legal--versione" aria-label="${esc(e.versione)}" data-informativa-versione="${VERSIONE_INFORMATIVA}" data-informativa-impronta="${impronte[l]}">
  <div class="legal__container">
    <p style="font-size:13px;line-height:1.6">${e.versione}: ${VERSIONE_INFORMATIVA}<br>${e.impronta}: <code style="overflow-wrap:anywhere;word-break:break-all">${impronte[l]}</code></p>
    <details style="font-size:13px;line-height:1.6"><summary style="cursor:pointer;min-height:44px;display:flex;align-items:center">${e.titolo}</summary><ol>${voci}</ol><p>${esc(e.integrale)}</p></details>
  </div>
</section>
<!-- INF-1:fine -->`;
}
const RE_PIEDE = /<!-- INF-1:inizio[\s\S]*?<!-- INF-1:fine -->\n?/;

function scrivi() {
  const impronte = Object.fromEntries(LINGUE.map((l) => [l, improntaInformativa(l)]));
  for (const l of LINGUE) {
    const p = join(RADICE, FILE[l]);
    let html = readFileSync(p, "utf8");
    html = RE_PIEDE.test(html) ? html.replace(RE_PIEDE, piede(l, impronte) + "\n") : html.replace("</main>\n", `</main>\n\n${piede(l, impronte)}\n`);
    if (!html.includes("<!-- INF-1:inizio")) throw new Error(`${FILE[l]}: non trovo dove mettere il piede (dopo </main>)`);
    writeFileSync(p, html);
  }
  writeFileSync(join(RADICE, "privacy-versione.json"), JSON.stringify(rotta(impronte), null, 2) + "\n");
  console.log(`✓ informativa ${VERSIONE_INFORMATIVA}: ${LINGUE.map((l) => `${l} ${impronte[l].slice(0, 12)}`).join(" · ")} · privacy-versione.json e piedi scritti. Ora: python3 scripts/opera/genera.py`);
}

/** I due moduli di una pagina (info, brochure): il pezzo di HTML del <form …>…</form>. */
function moduli(html) {
  return [...html.matchAll(/<form\b[^>]*id="(info-form|brochure-form)"[^>]*>[\s\S]*?<\/form>/g)].map((m) => ({ id: m[1], html: m[0] }));
}
const FRASI_VIETATE = [/ho letto e accetto/i, /acconsento al trattamento/i, /accetto la privacy/i, /I accept the privacy/i, /agree to (my|the) (data being )?process/i, /bin mit der Verarbeitung/i, /willige in die Verarbeitung/i, /soglašam z obdelavo/i];

function controlla() {
  const errori = [];
  const avvisi = [];
  const impronte = Object.fromEntries(LINGUE.map((l) => [l, improntaInformativa(l)]));
  const pj = join(RADICE, "privacy-versione.json");
  const reg = existsSync(pj) ? JSON.parse(readFileSync(pj, "utf8")) : null;
  if (!reg) errori.push("manca /privacy-versione.json: node scripts/informativa.mjs --scrivi");
  else if (reg.versione === VERSIONE_INFORMATIVA) {
    const diverse = LINGUE.filter((l) => reg.lingue?.[l]?.impronta !== impronte[l]);
    if (diverse.length) errori.push(`il testo dell'informativa è cambiato senza versione nuova (${diverse.join(", ")}): alza VERSIONE_INFORMATIVA (formato INF-<SIGLA>-<AAAA-MM-GG>-<n>, scripts/informativa.mjs) e rigenera con --scrivi`);
  } else avvisi.push(`la versione è ${VERSIONE_INFORMATIVA} ma /privacy-versione.json è di ${reg.versione}: rigenera con --scrivi (e poi genera.py)`);
  if (STORICO[0]?.versione !== VERSIONE_INFORMATIVA) avvisi.push(`${VERSIONE_INFORMATIVA} non è in testa allo STORICO di scripts/informativa.mjs`);
  for (const l of LINGUE) {
    const html = readFileSync(join(RADICE, FILE[l]), "utf8");
    const m = /data-informativa-versione="([^"]*)" data-informativa-impronta="([^"]*)"/.exec(html);
    if (!m) errori.push(`${FILE[l]}: manca il piede con versione e impronta (--scrivi)`);
    else if (m[1] !== VERSIONE_INFORMATIVA || m[2] !== impronte[l]) (reg?.versione === VERSIONE_INFORMATIVA ? errori : avvisi).push(`${FILE[l]}: il piede porta ${m[1]} ${m[2].slice(0, 12)}, il testo è ${VERSIONE_INFORMATIVA} ${impronte[l].slice(0, 12)} (--scrivi)`);
    const pag = readFileSync(join(RADICE, PAGINA[l]), "utf8");
    const mm = moduli(pag);
    if (mm.length !== 2) errori.push(`${PAGINA[l]}: attesi i moduli info-form e brochure-form, trovati ${mm.map((x) => x.id).join(", ") || "nessuno"}`);
    for (const f of mm) {
      const dove = `${PAGINA[l]} #${f.id}`;
      const v = /data-inf-versione="([^"]*)"/.exec(f.html)?.[1], imp = /data-inf-impronta="([^"]*)"/.exec(f.html)?.[1];
      if (v !== VERSIONE_INFORMATIVA || imp !== impronte[l]) (reg?.versione === VERSIONE_INFORMATIVA ? errori : avvisi).push(`${dove}: dichiara ${v ?? "—"} ${(imp ?? "—").slice(0, 12)}, la privacy è ${VERSIONE_INFORMATIVA} ${impronte[l].slice(0, 12)}: python3 scripts/opera/genera.py`);
      if (/name="privacy"/.test(f.html)) errori.push(`${dove}: c'è ancora la casella privacy (D13: al suo posto la riga col link accanto al tasto)`);
      const riga = /<p\b[^>]*data-presa-visione[^>]*>([\s\S]*?)<\/p>/.exec(f.html);
      if (!riga || !/href="[^"]*privacy\.html"/.test(riga[1])) errori.push(`${dove}: manca la riga col link all'informativa accanto al tasto (data-presa-visione)`);
      for (const t of f.html.match(/<input\b[^>]*type="checkbox"[^>]*>/g) ?? []) if (/\s(checked|defaultChecked)(\s|=|>|\/)/i.test(t)) errori.push(`${dove}: una casella parte spuntata: ${t.slice(0, 100)}`);
      for (const re of FRASI_VIETATE) if (re.test(decodifica(f.html))) errori.push(`${dove}: «${decodifica(f.html).match(re)[0]}»: la presa visione non è un consenso`);
    }
  }
  for (const a of avvisi) console.warn(`⚠️ informativa: ${a}`);
  if (errori.length) { console.error(`✗ informativa e moduli:\n  ${errori.join("\n  ")}`); process.exit(1); }
  console.log(`✓ informativa ${VERSIONE_INFORMATIVA}: impronte uguali al registro in ${LINGUE.length} lingue; piedi e moduli allineati, riga col link accanto al tasto, nessuna casella privacy o spuntata`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes("--scrivi")) scrivi();
  else if (process.argv.includes("--controlla")) controlla();
  else { console.log("uso: node scripts/informativa.mjs --scrivi | --controlla"); process.exit(2); }
}
