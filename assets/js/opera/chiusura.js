// Elegie Duino — il cartello delle CHIUSURE DELL'UFFICIO (29/10/2026).
//
// Martino, 29/10/2026: chiusi lunedì 2 e martedì 3 novembre, ci si rivede mercoledì 4; «ricordatelo per eventuali
// future chiusure». È la versione statica del gemello dei siti del gruppo (components/chiusura/AvvisoChiusura.tsx
// in triestevillas-web, sappadavillas, ortavillas): stesso comportamento, stessi testi, senza React.
//
// Le date e i testi NON stanno qui: stanno nel registro unico del CRM (tsv-pg web/lib/chiusure-ufficio.ts) e
// arrivano da /api/web/chiusura, già scritti in it/en/de/sl. Una chiusura nuova è una riga là, e il cartello la
// mostra senza rigenerare le pagine; il giorno della riapertura il CRM risponde `null` e il cartello non c'è più.
// Si chiede dal browser perché le pagine sono statiche: un cartello scritto da genera.py resterebbe acceso.
// Se il CRM non risponde, il cartello semplicemente non compare.
//
// Si posa fisso in cima (stile in css/opera.css, «chiusure dell'ufficio») e scrive la sua altezza in
// `--avviso-chiusura-h` su <html>: la barra e ciò che si misura da lei scendono di tanto. Chiuso con la ×, non
// torna per il resto della visita (sessionStorage). `?chiusura=AAAA-MM-GG` nell'indirizzo lo prova per quel giorno.
(function () {
  var PORTA = 'https://tsv-pg.vercel.app/api/web/chiusura';
  var VAR = '--avviso-chiusura-h';
  var CHIUDI = { it: "Chiudi l'avviso", en: 'Close notice', de: 'Hinweis schließen', sl: 'Zapri obvestilo' };
  var l = (document.documentElement.lang || '').slice(0, 2).toLowerCase();
  var lingua = CHIUDI[l] ? l : 'en';
  var prova = null;
  try { prova = new URLSearchParams(location.search).get('chiusura'); } catch (e) { /* indirizzo strano: si va senza prova */ }
  var url = prova && /^\d{4}-\d{2}-\d{2}$/.test(prova) ? PORTA + '?giorno=' + prova : PORTA;
  if (!window.fetch) return;

  fetch(url)
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (j) {
      var ch = j && j.chiusura;
      var t = ch && ch.testi && ch.testi[lingua];
      if (!t) return;
      try { if (!prova && sessionStorage.getItem('chiusura:' + ch.id)) return; } catch (e) { /* storage bloccato: si mostra */ }
      mostra(ch, t);
    })
    .catch(function () {});

  function mostra(ch, t) {
    var radice = document.documentElement;
    var cartello = document.createElement('div');
    cartello.className = 'avviso-chiusura';
    cartello.setAttribute('role', 'status');
    cartello.setAttribute('lang', lingua);
    cartello.setAttribute('data-avviso-chiusura', ch.id);

    var titolo = document.createElement('strong');
    titolo.textContent = t.titolo;
    var scrivete = document.createElement('span');
    scrivete.className = 'avviso-chiusura__scrivete';
    scrivete.textContent = ' ' + t.scrivete;
    var x = document.createElement('button');
    x.type = 'button';
    x.className = 'avviso-chiusura__chiudi';
    x.setAttribute('aria-label', CHIUDI[lingua]);
    x.title = CHIUDI[lingua];
    x.textContent = '×';
    cartello.appendChild(titolo);
    cartello.appendChild(document.createTextNode(' ' + t.riapertura));
    cartello.appendChild(scrivete);
    cartello.appendChild(x);

    // Dopo il «salta al contenuto» (resta il primo elemento focalizzabile) e prima della barra, come si vede.
    var barra = document.getElementById('barra');
    if (barra && barra.parentNode) barra.parentNode.insertBefore(cartello, barra);
    else document.body.appendChild(cartello);

    // L'altezza vera della fascia (una riga o due, secondo lo schermo) diventa lo spostamento della barra.
    var scrivi = function () { radice.style.setProperty(VAR, cartello.offsetHeight + 'px'); };
    scrivi();
    var ro = window.ResizeObserver ? new ResizeObserver(scrivi) : null;
    if (ro) ro.observe(cartello); else window.addEventListener('resize', scrivi);

    x.addEventListener('click', function () {
      try { sessionStorage.setItem('chiusura:' + ch.id, '1'); } catch (e) { /* vale per questa pagina */ }
      if (ro) ro.disconnect(); else window.removeEventListener('resize', scrivi);
      cartello.remove();
      radice.style.removeProperty(VAR);
    });
  }
})();
