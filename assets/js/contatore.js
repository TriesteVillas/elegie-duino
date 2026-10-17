/* IL CONTATORE DEL TRAFFICO, versione a PIXEL (11/10/2026).
   Il sito è statico su GitHub Pages: non ha un server che possa contare le
   pagine e firmare il battito, come fanno i siti Next del gruppo nel loro
   proxy. Qui è la pagina a chiamare la porta del CRM con un'immagine 1×1:

     GET https://tsv-pg.vercel.app/api/traffico/pixel?s=ED&p=<percorso>&i=<1|0>…
     GET https://tsv-pg.vercel.app/api/traffico/pixel?s=ED&e=<evento>

   Senza cookie e senza consenso (livelli 1 e 2): il CRM conta la pagina per
   giorno e calcola da sé l'impronta del giorno dei visitatori unici, e non la
   calcola se il browser manda il segnale GPC o se qui si è scelto «Non contare
   le mie visite» (`nc=1`). Il sito si riconosce dal dominio della pagina
   (intestazione Referer, che il browser manda con l'origine).
   ⛔ Mai la query intera, mai l'indirizzo completo della pagina di provenienza:
   del referrer solo il dominio, delle UTM solo sorgente e mezzo, di un clic da
   annuncio solo DA CHI (google/meta), mai il valore.
   Perché e come: KB progetti/analytics-siti/CONTEGGIO-SENZA-CONSENSO-2026-10-09.md;
   la porta è tsv-pg web/app/api/traffico/pixel/route.ts. */
(function () {
  var PORTA = "https://tsv-pg.vercel.app/api/traffico/pixel";
  var SITO = "ED";
  var CHIAVE_NO = "contatore_no"; // la scelta «non contare le mie visite», nel browser

  function nonContarmi() {
    try { return localStorage.getItem(CHIAVE_NO) === "1"; } catch (e) { return false; }
  }

  function spedisci(parametri) {
    try {
      var q = "s=" + SITO;
      for (var k in parametri) {
        if (Object.prototype.hasOwnProperty.call(parametri, k) && parametri[k] !== null && parametri[k] !== undefined && parametri[k] !== "") {
          q += "&" + k + "=" + encodeURIComponent(String(parametri[k]));
        }
      }
      var img = new Image();
      // Il CRM riconosce il sito dall'origine della pagina: che il browser la mandi.
      try { img.referrerPolicy = "strict-origin-when-cross-origin"; } catch (e) {}
      img.src = PORTA + "?" + q;
    } catch (e) {
      /* niente conteggio: va bene così */
    }
  }

  var senzaWww = function (h) { return String(h || "").toLowerCase().replace(/^www\./, ""); };

  function contaPagina() {
    try {
      var p = { p: location.pathname.slice(0, 600) };
      var ref = "";
      try { ref = document.referrer ? senzaWww(new URL(document.referrer).hostname) : ""; } catch (e) { ref = ""; }
      var ingresso = !ref || ref !== senzaWww(location.hostname);
      p.i = ingresso ? "1" : "0";
      if (ingresso) {
        if (ref) p.r = ref;
        try {
          var q = new URLSearchParams(location.search);
          if (q.get("utm_source")) p.us = q.get("utm_source").slice(0, 60);
          if (q.get("utm_medium")) p.um = q.get("utm_medium").slice(0, 30);
          if (q.has("gclid") || q.has("gbraid") || q.has("wbraid")) p.c = "google";
          else if (q.has("fbclid")) p.c = "meta";
        } catch (e) { /* senza provenienza */ }
      }
      if (nonContarmi()) p.nc = "1";
      spedisci(p);
    } catch (e) {
      /* niente conteggio */
    }
  }

  /** Un evento: nome in minuscolo, lettere, cifre e «_ : . -», al massimo 60 caratteri. */
  function contaEvento(nome) {
    try {
      var e = String(nome || "").toLowerCase().replace(/[^a-z0-9_:.-]/g, "-").slice(0, 60);
      if (e) spedisci({ e: e });
    } catch (err) { /* niente */ }
  }
  // Per i moduli della pagina: dopo una richiesta accettata dal CRM (dove parte generate_lead).
  window.edContaEvento = contaEvento;

  // La pagina: una pagina che il browser ha preparato in anticipo (prerender)
  // si conta solo quando la si apre davvero, e potrebbe non succedere mai.
  try {
    if (document.prerendering) document.addEventListener("prerenderingchange", contaPagina, { once: true });
    else contaPagina();
  } catch (e) { /* niente */ }

  // I contatti: come l'evento «contatto» di Google Analytics in consenso.js, per
  // chi i cookie li ha rifiutati. Il pulsante «Richiedi informazioni» ha un
  // mailto: solo come ripiego senza JavaScript e apre il modulo: non è un contatto.
  document.addEventListener("click", function (e) {
    try {
      var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
      if (!a || a.hasAttribute("data-open-info")) return;
      var h = a.getAttribute("href") || "";
      if (/^tel:/i.test(h)) contaEvento("contatto:telefono");
      else if (/wa\.me|api\.whatsapp\.com|^whatsapp:/i.test(h)) contaEvento("contatto:whatsapp");
      else if (/^mailto:/i.test(h)) contaEvento("contatto:email");
    } catch (err) { /* niente */ }
  }, true);

  // «Non contare le mie visite» / «Contatele di nuovo» (informativa privacy):
  // la scelta si salva in questo browser, perché un cookie di questo sito non
  // arriverebbe al CRM. Da allora la pagina manda `nc=1` e il CRM non calcola
  // l'impronta: le pagine restano nei totali, che non sono dati personali.
  var ESITO = {
    it: { no: "Fatto: da ora le visite da questo browser non entrano nel conteggio dei visitatori unici di questo sito.",
          si: "Fatto: le visite da questo browser tornano a essere contate, in forma anonima e aggregata.",
          errore: "Non è stato possibile salvare la scelta in questo browser (la memoria del sito è bloccata)." },
    en: { no: "Done: from now on visits from this browser are not included in this site's count of unique visitors.",
          si: "Done: visits from this browser are counted again, anonymously and in aggregate.",
          errore: "Your choice could not be saved in this browser (site storage is blocked)." },
    de: { no: "Erledigt: Ab jetzt zählen Besuche aus diesem Browser nicht mehr zu den eindeutigen Besuchern dieser Website.",
          si: "Erledigt: Besuche aus diesem Browser werden wieder gezählt, anonym und zusammengefasst.",
          errore: "Ihre Wahl konnte in diesem Browser nicht gespeichert werden (der Website-Speicher ist blockiert)." },
    sl: { no: "Opravljeno: od zdaj obiski iz tega brskalnika ne štejejo v število edinstvenih obiskovalcev te spletne strani.",
          si: "Opravljeno: obiski iz tega brskalnika se znova štejejo, anonimno in zbirno.",
          errore: "Vaše izbire ni bilo mogoče shraniti v tem brskalniku (shramba spletne strani je blokirana)." }
  };
  function scelta(no) {
    var lingua = (document.documentElement.lang || "it").slice(0, 2);
    var T = ESITO[lingua] || ESITO.it;
    var testo;
    try {
      if (no) localStorage.setItem(CHIAVE_NO, "1"); else localStorage.removeItem(CHIAVE_NO);
      testo = no ? T.no : T.si;
    } catch (e) {
      testo = T.errore;
    }
    var box = document.querySelector("[data-contatore-esito]");
    if (box) { box.textContent = testo; box.hidden = false; }
  }
  document.addEventListener("click", function (e) {
    var b = e.target && e.target.closest ? e.target.closest("[data-contatore]") : null;
    if (!b) return;
    e.preventDefault();
    scelta(b.getAttribute("data-contatore") === "no");
  });
})();
