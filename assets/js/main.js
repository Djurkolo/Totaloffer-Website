(function () {
  "use strict";

  /* ---------- Menu mobile ---------- */
  var nav = document.getElementById("nav");
  var toggle = document.querySelector(".nav-toggle");
  if (nav && toggle) {
    var setMenu = function (open) {
      nav.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Chiudi il menu" : "Apri il menu");
    };
    toggle.addEventListener("click", function () {
      setMenu(!nav.classList.contains("is-open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
  }

  /* ---------- Schema di rete ---------- */
  var SERVICES = {
    helpdesk:  { title: "Helpdesk", text: "Assistenza agli utenti su hardware, software e rete. Anche on site." },
    sistemi:   { title: "Gestione sistemi", text: "Server stabili, aggiornati e sempre disponibili." },
    reti:      { title: "Gestione reti", text: "Reti locali e remote monitorate, sicure e affidabili." },
    sicurezza: { title: "Sicurezza infrastruttura", text: "Firewall, VPN, antispam e autenticazione forte." },
    web:       { title: "Applicazioni web", text: "Software su misura per le esigenze della tua azienda." },
    forniture: { title: "Hardware e software", text: "PC, server, backup, virtualizzazione e licenze Microsoft." }
  };
  var ORDER = ["helpdesk", "sistemi", "reti", "sicurezza", "web", "forniture"];

  var schema = document.getElementById("schema");
  if (schema) {
    var nodes = schema.querySelectorAll(".node");
    var traces = schema.querySelectorAll(".trace");
    var capTitle = document.getElementById("cap-title");
    var capText = document.getElementById("cap-text");
    var capLink = document.getElementById("cap-link");
    var current = null;

    var activate = function (key) {
      if (!SERVICES[key] || key === current) return;
      current = key;
      nodes.forEach(function (n) { n.classList.toggle("is-active", n.dataset.svc === key); });
      traces.forEach(function (t) { t.classList.toggle("is-active", t.dataset.for === key); });
      capTitle.textContent = SERVICES[key].title;
      capText.textContent = SERVICES[key].text;
      capLink.setAttribute("href", "#svc-" + key);
    };

    // Rotazione automatica finché l'utente non interagisce
    var timer = null;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var stop = function () { if (timer) { clearInterval(timer); timer = null; } };
    activate(ORDER[0]);
    if (!reduced) {
      var i = 0;
      timer = setInterval(function () {
        i = (i + 1) % ORDER.length;
        activate(ORDER[i]);
      }, 3200);
    }

    nodes.forEach(function (n) {
      var on = function () { stop(); activate(n.dataset.svc); };
      n.addEventListener("pointerenter", on);
      n.addEventListener("focus", on);
      n.addEventListener("click", on);
    });
  }

  /* ---------- Servizi: apri la voce indicata dal link ---------- */
  var openFromHash = function () {
    var id = location.hash.slice(1);
    if (id.indexOf("svc-") !== 0) return;
    var el = document.getElementById(id);
    if (el && el.tagName === "DETAILS") el.open = true;
  };
  window.addEventListener("hashchange", openFromHash);
  openFromHash();

  /* ---------- "Chiedi info": preseleziona il servizio nel modulo ---------- */
  var select = document.getElementById("servizio");
  document.querySelectorAll("[data-topic]").forEach(function (a) {
    a.addEventListener("click", function () {
      if (select) select.value = a.dataset.topic;
    });
  });

  /* ---------- Modulo contatti ----------
     Finché non c'è un endpoint lato server, il modulo compone un'email
     verso info@totaloffer.com nel programma di posta dell'utente. */
  var form = document.getElementById("form-contatti");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var subject = "[" + d.get("tipo") + "] " + (d.get("servizio") || "Richiesta dal sito") + " - " + d.get("nome");
      var lines = [
        "Nome: " + d.get("nome"),
        d.get("azienda") ? "Azienda: " + d.get("azienda") : null,
        "Email: " + d.get("email"),
        d.get("telefono") ? "Telefono: " + d.get("telefono") : null,
        "Richiesta: " + d.get("tipo"),
        d.get("servizio") ? "Servizio: " + d.get("servizio") : null,
        "",
        d.get("messaggio")
      ].filter(function (l) { return l !== null; });
      location.href = "mailto:info@totaloffer.com?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));
      var note = document.getElementById("form-note");
      if (note) note.textContent = "Non si è aperto nulla? Scrivi a info@totaloffer.com o chiama lo 06 5833 4882.";
    });
  }
})();
