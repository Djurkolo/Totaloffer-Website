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
