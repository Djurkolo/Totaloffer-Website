(function () {
  "use strict";

  /* ---------- "Rivedi l'intro" ---------- */
  var replay = document.getElementById("rivedi-intro");
  if (replay) {
    replay.addEventListener("click", function (e) {
      e.preventDefault();
      try { sessionStorage.removeItem("to-intro"); } catch (err) { /* non disponibile */ }
      window.scrollTo(0, 0);
      history.replaceState(null, "", location.pathname + location.search + "#intro");
      location.reload();
    });
  }
  // l'ancora #intro serve solo a far ripartire l'animazione: poi si toglie dall'indirizzo
  if (location.hash === "#intro") history.replaceState(null, "", location.pathname + location.search);

  /* ---------- Tema chiaro / scuro ----------
     Di base segue il sistema; il pulsante nell'header fissa una scelta, ricordata sul dispositivo. */
  var themeBtn = document.getElementById("tema");
  if (themeBtn) {
    var rootEl = document.documentElement;
    var sysDark = window.matchMedia("(prefers-color-scheme: dark)");
    var isDark = function () {
      var t = rootEl.getAttribute("data-theme");
      return t ? t === "dark" : sysDark.matches;
    };
    var labelTheme = function () {
      themeBtn.setAttribute("aria-label", isDark() ? "Passa al tema chiaro" : "Passa al tema scuro");
    };
    themeBtn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      rootEl.setAttribute("data-theme", next);
      try { localStorage.setItem("to-tema", next); } catch (err) { /* non disponibile */ }
      labelTheme();
      window.dispatchEvent(new CustomEvent("to:theme"));   // la scena 3D rilegge i colori
    });
    sysDark.addEventListener("change", labelTheme);
    labelTheme();
  }

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
     Invia i dati a invia.php (stesso sito) e mostra l'esito nella pagina.
     Se il server non risponde, propone l'invio dal programma di posta. */
  var form = document.getElementById("form-contatti");
  if (form) {
    var status = document.getElementById("form-status");
    var done = document.getElementById("form-done");
    var doneText = document.getElementById("form-done-text");
    var button = document.getElementById("form-invia");
    var buttonHtml = button.innerHTML;

    var mailtoLink = function (d) {
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
      return "mailto:info@totaloffer.com?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));
    };

    var clearErrors = function () {
      status.hidden = true; status.textContent = "";
      form.querySelectorAll("[aria-invalid]").forEach(function (el) { el.removeAttribute("aria-invalid"); });
      form.querySelectorAll(".field-error").forEach(function (el) { el.remove(); });
    };
    var showError = function (text, link) {
      status.textContent = text;
      if (link) {
        var a = document.createElement("a");
        a.href = link; a.textContent = "Invia dal tuo programma di posta";
        status.appendChild(document.createTextNode(" "));
        status.appendChild(a);
      }
      status.hidden = false;
    };
    var showFieldErrors = function (fields) {
      var first = null;
      Object.keys(fields).forEach(function (name) {
        var el = form.elements[name];
        if (!el || !el.id) return;
        el.setAttribute("aria-invalid", "true");
        var p = document.createElement("p");
        p.className = "field-error"; p.id = el.id + "-errore"; p.textContent = fields[name];
        el.setAttribute("aria-describedby", p.id);
        (el.closest(".field") || el.parentNode).appendChild(p);
        if (!first) first = el;
      });
      if (first) first.focus();
    };
    var showDone = function (name, email) {
      doneText.textContent = "Grazie" + (name ? ", " + name.split(" ")[0] : "") +
        ". Abbiamo ricevuto il tuo messaggio e ti rispondiamo" + (email ? " a " + email : "") + " al più presto.";
      form.hidden = true; done.hidden = false; done.focus();
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      clearErrors();
      var d = new FormData(form);
      button.disabled = true; button.textContent = "Invio in corso…";
      fetch(form.action, { method: "POST", headers: { Accept: "application/json" }, body: d })
        .then(function (r) {
          return r.json().then(function (j) { return { status: r.status, body: j }; });
        })
        .then(function (res) {
          if (res.body && res.body.ok) { showDone(d.get("nome"), d.get("email")); form.reset(); return; }
          var fields = (res.body && res.body.campi) || {};
          showError((res.body && res.body.errore) || "Invio non riuscito.", res.status >= 500 ? mailtoLink(d) : null);
          if (Object.keys(fields).length) showFieldErrors(fields);
        })
        .catch(function () {
          // server irraggiungibile o senza PHP (es. anteprima statica)
          showError("Non siamo riusciti a inviare il messaggio da qui.", mailtoLink(d));
        })
        .then(function () { button.disabled = false; button.innerHTML = buttonHtml; });
    });

    document.getElementById("form-nuova").addEventListener("click", function () {
      done.hidden = true; form.hidden = false;
      var first = document.getElementById("nome"); if (first) first.focus();
    });

    // esito dopo un invio senza JavaScript (redirect da invia.php)
    var esito = /[?&]modulo=(inviato|errore)/.exec(location.search);
    if (esito && esito[1] === "inviato") showDone("", "");
    if (esito && esito[1] === "errore") showError("Invio non riuscito. Controlla i campi e riprova, oppure scrivi a info@totaloffer.com.");
  }
})();
