// Rutenettet på fosen-tools.no/referanser og kategorisidene.
// Lastes av publiseringen (en liten laster), og lastes opp til Supabase av
// scripts/referanser-oppdater.mjs når fila endres. Endringer her krever ingen innliming.
(function () {
  var rot = document.querySelector('.ft-refauto');
  if (!rot || rot.getAttribute('data-bygget')) return;
  rot.setAttribute('data-bygget', '1');
  var KILDE = 'https://evfbfiqruxzaraksetok.supabase.co/storage/v1/object/public/social_assets/brand-assets/referanser/referanser.json';
  // Multicase-editoren legger inn et tomt avsnitt (&nbsp;) under H1 i introen. Fjern det.
  // Introen kan lastes etter dette scriptet, så det gjøres et par ganger til.
  // Den røde streken under H1 (.ftseo-heading::after) står 16 px under overskriften og trenger luft,
  // som før kom fra det tomme avsnittet. Gi overskriften avstanden selv.
  function fjernTomme() {
    [].forEach.call(document.querySelectorAll('.ftseo-inner > p'), function (p) {
      if (p.textContent.trim() || p.querySelector('img')) return;
      p.parentNode.removeChild(p);
    });
    [].forEach.call(document.querySelectorAll('.ftseo-inner > .ftseo-heading'), function (h) {
      if (parseFloat(getComputedStyle(h).marginBottom) < 30) h.style.marginBottom = '34px';
    });
  }
  fjernTomme(); setTimeout(fjernTomme, 1500); setTimeout(fjernTomme, 4000);
  var deler = decodeURIComponent(location.pathname).split('/').filter(Boolean);
  var katSlug = deler[0] === 'referanser' && deler.length === 2 ? deler[1] : '';
  var FORSTE = katSlug ? 24 : 12, STEG = 24;

  function lag(tag, kl, tekst) { var e = document.createElement(tag); if (kl) e.className = kl; if (tekst != null && tekst !== '') e.textContent = tekst; return e; }
  function lenke(sti) { return sti.split('/').map(encodeURIComponent).join('/'); }
  function bilde(boks, kilder, alt) {
    var img = document.createElement('img'), n = 0;
    img.className = 'ft-refauto__fyll'; img.alt = alt || ''; img.loading = 'lazy';
    kilder = kilder.filter(Boolean);
    if (!kilder.length) return;
    img.onerror = function () { n++; if (n < kilder.length) img.src = kilder[n]; else img.style.display = 'none'; };
    img.src = kilder[0];
    boks.appendChild(img);
  }
  function norm(s) { return (s || '').toLowerCase(); }

  function bygg(d) {
    var base = d.base || '';
    var kats = d.kategorier || [], katNavn = {};
    kats.forEach(function (k) { katNavn[k.slug] = k.navn; });
    var kat = katSlug ? kats.filter(function (k) { return k.slug === katSlug; })[0] : null;
    if (katSlug && !kat) return;   // ukjent kategori: la reservelenkene stå
    var caser = (d.caser || []).filter(function (c) { return !katSlug || c.kat === katSlug; });

    // Landingssiden: kategorikort
    if (!katSlug) {
      rot.appendChild(lag('h2', 'ft-refauto__h', 'Referanseområder'));
      var kl = lag('ul', 'ft-refauto__kat');
      kats.forEach(function (k) {
        var li = lag('li'), a = lag('a', 'ft-refauto__katkort');
        a.href = lenke(k.sti);
        bilde(a, [k.tommel ? base + k.tommel : ''], '');
        var navn = lag('span', 'ft-refauto__katnavn', k.navn);
        a.appendChild(navn); li.appendChild(a); kl.appendChild(li);
      });
      rot.appendChild(kl);
      rot.appendChild(lag('h2', 'ft-refauto__h', 'Siste prosjekter'));
    }

    // Søk og filter
    var verktoy = lag('div', 'ft-refauto__verktoy');
    var sok = lag('input', 'ft-refauto__sok');
    sok.type = 'search';
    sok.placeholder = 'Søk etter kunde, bransje eller utstyr';
    sok.setAttribute('aria-label', 'Søk i prosjektene');
    if (caser.length > 12) verktoy.appendChild(sok);

    var AAR = [{ n: '2024 og nyere', f: 2024, t: 9999 }, { n: '2020–2023', f: 2020, t: 2023 }, { n: '2013–2019', f: 2013, t: 2019 }, { n: 'Før 2013', f: 0, t: 2012 }];
    var valgt = null, chips = lag('div', 'ft-refauto__chips');
    if (katSlug) {
      var grupper = AAR.map(function (g) { return { g: g, n: caser.filter(function (c) { return c.aar && c.aar >= g.f && c.aar <= g.t; }).length }; }).filter(function (x) { return x.n; });
      if (grupper.length > 1) {
        var alleChip = lag('button', 'ft-refauto__chip er-valgt', 'Alle');
        alleChip.type = 'button';
        alleChip.onclick = function () { velg(null, alleChip); };
        chips.appendChild(alleChip);
        grupper.forEach(function (x) {
          var b = lag('button', 'ft-refauto__chip', x.g.n);
          b.type = 'button';
          b.onclick = function () { velg(x.g, b); };
          chips.appendChild(b);
        });
        verktoy.appendChild(chips);
      }
    }
    if (verktoy.children.length) rot.appendChild(verktoy);

    var ul = lag('ul', 'ft-refauto__liste');
    var tom = lag('div', 'ft-refauto__tom', 'Ingen prosjekter passer søket.');
    var mer = lag('button', 'ft-refauto__mer'); mer.type = 'button';
    rot.appendChild(ul); rot.appendChild(tom); rot.appendChild(mer);

    // Alle kortene bygges med en gang (lenkene er synlige for søkemotorer); bildene lastes lat.
    var kort = caser.map(function (c) {
      var li = lag('li'), a = lag('a', 'ft-refauto__kort');
      a.href = lenke(c.sti);
      var b = lag('span', 'ft-refauto__bilde');
      bilde(b, [c.tommel ? base + c.tommel : '', c.bilde], c.tittel);
      var t = lag('span', 'ft-refauto__tekst');
      t.appendChild(lag('span', 'ft-refauto__navn', c.tittel));
      var under = [katSlug ? c.bransje : katNavn[c.kat], c.aar].filter(Boolean).join(' · ');
      t.appendChild(lag('span', 'ft-refauto__under', under));
      a.appendChild(b); a.appendChild(t); li.appendChild(a); ul.appendChild(li);
      return { li: li, c: c, s: norm([c.tittel, c.kunde, c.bransje, c.losning, katNavn[c.kat], c.aar, c.sti.split('/').pop().replace(/-/g, ' ')].join(' ')) };
    });

    var vises = FORSTE;
    function oppdater() {
      var q = norm(sok.value).trim().split(/\s+/).filter(Boolean);
      var treff = kort.filter(function (k) {
        if (valgt && !(k.c.aar && k.c.aar >= valgt.f && k.c.aar <= valgt.t)) return false;
        for (var i = 0; i < q.length; i++) if (k.s.indexOf(q[i]) < 0) return false;
        return true;
      });
      kort.forEach(function (k) { k.li.style.display = 'none'; });
      treff.forEach(function (k, i) { if (i < vises) k.li.style.display = ''; });
      tom.style.display = treff.length ? 'none' : '';
      var rest = treff.length - Math.min(vises, treff.length);
      mer.style.display = rest > 0 ? '' : 'none';
      mer.textContent = 'Vis flere';
    }
    function velg(g, knapp) {
      valgt = g; vises = FORSTE;
      [].forEach.call(chips.children, function (b) { b.classList.toggle('er-valgt', b === knapp); });
      oppdater();
    }
    mer.onclick = function () { vises += STEG; oppdater(); };
    sok.oninput = function () { vises = q0(); oppdater(); };
    function q0() { return sok.value.trim() ? 9999 : FORSTE; }
    oppdater();

    // Kategorisidene: lenker til de andre områdene nederst
    if (katSlug) {
      var andre = lag('nav', 'ft-refauto__andre');
      andre.setAttribute('aria-label', 'Flere referanseområder');
      andre.appendChild(lag('span', 'ft-refauto__andretittel', 'Flere referanseområder'));
      var alle = lag('a', '', 'Alle referanser'); alle.href = '/referanser'; andre.appendChild(alle);
      kats.forEach(function (k) {
        if (k.slug === katSlug) return;
        var a = lag('a', '', k.navn); a.href = lenke(k.sti); andre.appendChild(a);
      });
      rot.appendChild(andre);
    }

    // Strukturerte data: liste over prosjektene på siden
    var ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.text = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'ItemList',
      name: kat ? 'Referanser: ' + kat.navn : 'Referanser fra Fosen Tools',
      numberOfItems: caser.length,
      itemListElement: caser.map(function (c, i) { return { '@type': 'ListItem', position: i + 1, url: 'https://fosen-tools.no' + lenke(c.sti), name: c.tittel }; })
    });
    document.head.appendChild(ld);

    rot.classList.add('er-klar');
  }

  fetch(KILDE, { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(bygg).catch(function () {});
})();
