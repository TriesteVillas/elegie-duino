// DA DOVE ARRIVA UNA RICHIESTA (10/10/2026) — la versione statica del modulo
// gemello dei siti del gruppo (src/lib/provenienza.ts sugli altri siti; il
// formato è un contratto col CRM, tsv-pg web/lib/ingresso/provenienza.ts).
//
// Al momento dell'invio di un modulo: la pagina da cui la visita è cominciata
// (con le sole UTM), il sito che l'ha portata (dominio e percorso), le UTM del
// primo ingresso e se c'era un clic da annuncio (google/meta, mai il valore).
// Non si salva niente sul dispositivo: si legge la voce di navigazione del
// documento e document.referrer. Il CRM la ripulisce di nuovo e la mostra sulla
// scheda lead («Provenienza»).
(function () {
  var UTM = ['source', 'medium', 'campaign', 'content', 'term'];
  window.edProvenienza = function () {
    try {
      var out = { pagina: location.pathname.slice(0, 160) };
      var nav = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
      var ing = new URL((nav && nav.name) || location.href);
      var utm = {}, q = new URLSearchParams(), n = 0;
      UTM.forEach(function (k) {
        var v = ing.searchParams.get('utm_' + k);
        if (v) { utm[k] = v.slice(0, 80); q.set('utm_' + k, v); n++; }
      });
      if (n) out.utm = utm;
      if (ing.searchParams.has('gclid') || ing.searchParams.has('gbraid') || ing.searchParams.has('wbraid')) out.annuncio = 'google';
      else if (ing.searchParams.has('fbclid')) out.annuncio = 'meta';
      var qs = q.toString();
      out.ingresso = (ing.pathname + (qs ? '?' + qs : '')).slice(0, 300);
      if (document.referrer) {
        var r = new URL(document.referrer);
        if (r.host !== location.host) out.referrer = (r.host.replace(/^www\./, '') + r.pathname).slice(0, 160);
      }
      return JSON.stringify(out);
    } catch (e) {
      return '';
    }
  };
})();
