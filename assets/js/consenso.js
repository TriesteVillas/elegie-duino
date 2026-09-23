/* Google Analytics 4 con Consent Mode v2 per il sito statico di Elegie Duino.
   Gemello dei siti Next del gruppo (Analytics.tsx + CookieBanner): si parte con
   tutto negato, gtag parte dopo il `load`, il banner ha due scelte di pari peso
   e il link «Preferenze cookie» nel footer riapre la scelta. L'ID di misurazione
   sta nell'attributo data-ga del tag <script> che carica questo file. */
(function () {
  var s = document.currentScript;
  var GA_ID = s && s.getAttribute("data-ga");
  if (!GA_ID || /^G-X+$/.test(GA_ID)) GA_ID = null; // segnaposto: niente da spedire
  var CHIAVE = "ed_consenso_v1";
  var lingua = (document.documentElement.lang || "it").slice(0, 2);
  var TESTI = {
    it: { testo: "Usiamo cookie tecnici e, solo se acconsenti, cookie di statistica (Google Analytics) per capire come viene usato il sito. Nessuna pubblicità, nessuna profilazione.",
          accetta: "Accetta", rifiuta: "Solo necessari", privacy: "Privacy e cookie", aria: "Consenso ai cookie" },
    en: { testo: "We use technical cookies and, only with your consent, statistics cookies (Google Analytics) to understand how the site is used. No advertising, no profiling.",
          accetta: "Accept", rifiuta: "Essential only", privacy: "Privacy and cookies", aria: "Cookie consent" }
  };
  var T = TESTI[lingua] || TESTI.it;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;
  gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied", wait_for_update: 500 });

  function leggi() { try { var v = localStorage.getItem(CHIAVE); return v === "si" || v === "no" ? v : null; } catch (e) { return null; } }
  if (leggi() === "si") gtag("consent", "update", { analytics_storage: "granted" });

  if (GA_ID) {
    var carica = function () {
      var t = document.createElement("script"); t.async = true;
      t.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
      document.head.appendChild(t);
      gtag("js", new Date()); gtag("config", GA_ID);
    };
    if (document.readyState === "complete") carica(); else window.addEventListener("load", carica);
  }

  var bar = null;
  function chiudi() { if (bar) { bar.parentNode.removeChild(bar); bar = null; } }
  function decidi(ok) {
    try { localStorage.setItem(CHIAVE, ok ? "si" : "no"); } catch (e) {}
    gtag("consent", "update", { analytics_storage: ok ? "granted" : "denied" });
    chiudi();
  }
  function apri() {
    if (bar) return;
    bar = document.createElement("div");
    bar.className = "cc-bar"; bar.setAttribute("role", "dialog"); bar.setAttribute("aria-label", T.aria);
    bar.innerHTML =
      '<div class="cc-inner"><p class="cc-text">' + T.testo + ' <a class="cc-link" href="./privacy.html">' + T.privacy + "</a></p>" +
      '<div class="cc-actions"><button type="button" class="cc-btn" data-cc="no">' + T.rifiuta + "</button>" +
      '<button type="button" class="cc-btn" data-cc="si">' + T.accetta + "</button></div></div>";
    bar.addEventListener("click", function (e) {
      var b = e.target && e.target.closest ? e.target.closest("[data-cc]") : null;
      if (b) decidi(b.getAttribute("data-cc") === "si");
    });
    document.body.appendChild(bar);
  }
  // Gli eventi che contano (23/09/2026): un modulo inviato → generate_lead
  // (param modulo), un clic su telefono/WhatsApp/email → contatto (param canale).
  // Delegati al documento, in fase di cattura: contano la richiesta, non l'esito.
  function invia(nome, parametri) { try { gtag("event", nome, parametri); } catch (e) {} }
  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var h = a.getAttribute("href") || "";
    if (/^tel:/i.test(h)) invia("contatto", { canale: "telefono" });
    else if (/wa\.me|api\.whatsapp\.com|^whatsapp:/i.test(h)) invia("contatto", { canale: "whatsapp" });
    else if (/^mailto:/i.test(h)) invia("contatto", { canale: "email" });
  }, true);
  document.addEventListener("submit", function (e) {
    var f = e.target;
    if (!f || f.tagName !== "FORM") return;
    invia("generate_lead", { modulo: f.id || f.getAttribute("name") || f.getAttribute("aria-label") || "form" });
  }, true);
  function pronto(fn) { if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn); else fn(); }
  pronto(function () {
    if (!leggi()) apri();
    var link = document.querySelectorAll("[data-cc-prefs]");
    for (var i = 0; i < link.length; i++) link[i].addEventListener("click", function (e) { e.preventDefault(); apri(); });
  });
})();
