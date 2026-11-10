/* Scena 3D dell'hero: la rete di un ufficio in assonometria.
   Renderer proprio su canvas 2D (proiezione prospettica + algoritmo del pittore),
   nessuna libreria esterna. Le etichette sono link HTML posizionati sui dispositivi. */
(function () {
  "use strict";

  var stage = document.getElementById("stage");
  if (!stage) return;
  var canvas = stage.querySelector("canvas");
  var ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (!ctx) return;

  var SERVICES = {
    helpdesk:  { title: "Helpdesk", text: "Assistenza agli utenti su hardware, software e rete. Anche on site.", anchor: [0, 1.9, 4], focus: [0, 0.8, 3.4] },
    sistemi:   { title: "Gestione sistemi", text: "Server stabili, aggiornati e sempre disponibili.", anchor: [-4, 3.1, 1.5], focus: [-3.4, 1.2, 1.2] },
    reti:      { title: "Gestione reti", text: "Reti locali e remote monitorate, sicure e affidabili.", anchor: [0, 0.9, 0], focus: [0, 0.6, 0.2] },
    sicurezza: { title: "Sicurezza infrastruttura", text: "Firewall, VPN, antispam e autenticazione forte.", anchor: [0, 2.1, -3], focus: [0, 1.4, -2.4] },
    web:       { title: "Applicazioni web", text: "Software su misura per le esigenze della tua azienda.", anchor: [3.7, 5.9, -3], focus: [2.6, 3.6, -2.4] },
    forniture: { title: "Hardware e software", text: "PC, server, backup, virtualizzazione e licenze Microsoft.", anchor: [4.2, 2.1, 1.6], focus: [3.4, 1, 1.4] }
  };
  var ORDER = ["helpdesk", "sistemi", "reti", "sicurezza", "web", "forniture"];

  /* ---------- Geometria ---------- */
  // box: centro x, base y, centro z, larghezza, altezza, profondità, servizio, righe decorative
  function box(cx, y0, cz, w, h, d, svc, lines) {
    return { cx: cx, y0: y0, cz: cz, w: w, h: h, d: d, svc: svc, lines: lines || 0 };
  }
  var BOXES = [
    // firewall: un muro
    box(0, 0, -3, 2.6, 1.6, 0.5, "sicurezza", 3),
    // switch
    box(0, 0, 0, 2.6, 0.4, 1.2, "reti", 0),
    // rack server + NAS
    box(-4.65, 0, 1.5, 1.1, 2.6, 1.1, "sistemi", 6),
    box(-3.4, 0, 1.5, 1.1, 2.6, 1.1, "sistemi", 6),
    box(-2.35, 0, 1.75, 0.7, 0.9, 0.6, "sistemi", 2),
    // postazioni: scrivania + monitor
    box(-1.9, 0, 4, 1.4, 0.7, 0.8, "helpdesk", 0), box(-1.9, 0.7, 3.85, 0.9, 0.62, 0.08, "helpdesk", 0),
    box(0, 0, 4.3, 1.4, 0.7, 0.8, "helpdesk", 0), box(0, 0.7, 4.15, 0.9, 0.62, 0.08, "helpdesk", 0),
    box(1.9, 0, 4, 1.4, 0.7, 0.8, "helpdesk", 0), box(1.9, 0.7, 3.85, 0.9, 0.62, 0.08, "helpdesk", 0),
    // forniture: scatoloni
    box(4, 0, 1.5, 1.2, 0.9, 1, "forniture", 0),
    box(4.1, 0.9, 1.5, 0.9, 0.7, 0.85, "forniture", 0),
    box(5.25, 0, 2.05, 0.8, 0.6, 0.8, "forniture", 0),
    // applicazioni web: livelli sospesi
    box(3.7, 4.5, -3, 1.9, 0.1, 1.3, "web", 0),
    box(3.7, 4.95, -3, 1.9, 0.1, 1.3, "web", 0),
    box(3.7, 5.4, -3, 1.9, 0.1, 1.3, "web", 0)
  ];
  // cavi: polilinee con pacchetti in transito. floor = poggiato a terra
  var CABLES = [
    { svc: "sicurezza", floor: false, pts: [[0, 4.3, -3], [0, 1.6, -3]], speed: 0.5 },
    { svc: "web", floor: false, pts: [[0.7, 5, -3], [2.75, 5, -3]], speed: 0.4 },
    { svc: "reti", floor: true, pts: [[0, 0, -2.75], [0, 0, -0.6]], speed: 0.55 },
    { svc: "sistemi", floor: true, pts: [[-1.3, 0, 0], [-4, 0, 0], [-4, 0, 0.95]], speed: 0.3 },
    { svc: "helpdesk", floor: true, pts: [[0, 0, 0.6], [0, 0, 3.9]], speed: 0.45 },
    { svc: "helpdesk", floor: true, pts: [[-1.9, 0, 3.6], [-1.9, 0, 3.2], [1.9, 0, 3.2], [1.9, 0, 3.6]], speed: 0 },
    { svc: "forniture", floor: true, pts: [[1.3, 0, 0], [4, 0, 0], [4, 0, 0.95]], speed: 0.28 }
  ];
  // anelli a terra sotto ogni area: il terminale ad anello del logo
  var RINGS = [
    { svc: "sicurezza", c: [0, 0, -3], r: 1.9 },
    { svc: "reti", c: [0, 0, 0], r: 1.9 },
    { svc: "sistemi", c: [-3.7, 0, 1.5], r: 2 },
    { svc: "helpdesk", c: [0, 0, 4.1], r: 2.7 },
    { svc: "forniture", c: [4.4, 0, 1.7], r: 1.8 },
    { svc: "web", c: [3.7, 0, -3], r: 1.4, dashed: true }
  ];
  var GLOBE = { c: [0, 5, -3], r: 0.55 };

  BOXES.forEach(function (b, i) { b.i = i; });
  CABLES.forEach(function (c) {
    c.len = 0; c.segs = [];
    for (var i = 1; i < c.pts.length; i++) {
      var a = c.pts[i - 1], b = c.pts[i];
      var l = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
      c.segs.push(l); c.len += l;
    }
    c.t = Math.random();
  });
  function along(c, t) {
    var d = t * c.len;
    for (var i = 0; i < c.segs.length; i++) {
      if (d <= c.segs[i] || i === c.segs.length - 1) {
        var k = Math.min(1, d / c.segs[i]), a = c.pts[i], b = c.pts[i + 1];
        return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
      }
      d -= c.segs[i];
    }
  }

  /* ---------- Colori dai token CSS ---------- */
  var C = {};
  function hex(v) {
    v = v.trim().replace("#", "");
    if (v.length === 3) v = v[0] + v[0] + v[1] + v[1] + v[2] + v[2];
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  }
  function mix(a, b, k) {
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  }
  function rgb(c, a) {
    return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (a === undefined ? 1 : a) + ")";
  }
  function readColors() {
    var s = getComputedStyle(document.documentElement);
    var get = function (n) { return hex(s.getPropertyValue(n)); };
    C.paper = get("--paper"); C.surface = get("--surface"); C.ink = get("--ink");
    C.soft = get("--ink-soft"); C.line = get("--line"); C.brand = get("--brand");
    C.top = C.surface;
    C.sideA = mix(C.surface, C.ink, 0.07);
    C.sideB = mix(C.surface, C.ink, 0.16);
    C.topOn = mix(C.surface, C.brand, 0.45);
    C.sideAOn = mix(C.surface, C.brand, 0.75);
    C.sideBOn = C.brand;
    C.mono = s.getPropertyValue("--font-mono") || "monospace";
  }

  /* ---------- Camera ---------- */
  var PI = Math.PI;
  // inquadrature: una per tappa dello scroll (hero, introduzione, sei servizi, uscita)
  var SHOTS = {
    hero:      { yaw: PI + 0.55, pitch: 0.5,  dist: 21, t: [0, 1.7, 0.2] },
    intro:     { yaw: PI + 0.12, pitch: 0.78, dist: 24, t: [0, 0.8, 0.5] },
    helpdesk:  { yaw: PI + 0.45, pitch: 0.42, dist: 14, t: [0, 0.8, 3.6] },
    sistemi:   { yaw: PI - 0.5,  pitch: 0.4,  dist: 15, t: [-3.6, 1.3, 1.4] },
    reti:      { yaw: PI + 0.2,  pitch: 0.62, dist: 13, t: [0, 0.5, 0.2] },
    sicurezza: { yaw: PI - 0.35, pitch: 0.36, dist: 14, t: [0, 1.2, -2.6] },
    web:       { yaw: PI + 0.6,  pitch: 0.24, dist: 15, t: [2.6, 4.2, -2.6] },
    forniture: { yaw: PI + 0.8,  pitch: 0.45, dist: 14, t: [3.8, 0.9, 1.5] },
    end:       { yaw: PI + 0.55, pitch: 1.0,  dist: 27, t: [0, 0.4, 0.5] }
  };
  var cam = { yaw: SHOTS.hero.yaw, pitch: SHOTS.hero.pitch, dist: SHOTS.hero.dist, t: SHOTS.hero.t.slice() };
  var goal = { yaw: cam.yaw, pitch: cam.pitch, dist: cam.dist, t: cam.t.slice() };
  // ingresso dall'intro: si sbuca dall'anello in mezzo ai dispositivi, al centro dello schermo;
  // poi la camera arretra e ruota fino all'inquadratura dell'hero, mentre i dispositivi
  // si alzano dal pavimento uno dopo l'altro
  var root = document.documentElement;
  var intro = { hold: root.classList.contains("intro-pending"), t: 0, on: false };
  var INTRO_TIME = 3.0;
  function introU() {                      // 0 = appena entrati, 1 = arrivati all'hero
    if (intro.hold) return 0;
    if (!intro.on) return 1;
    var k = Math.max(0, Math.min(1, intro.t / INTRO_TIME));
    return k * k * (3 - 2 * k);
  }
  function grow(i) {
    if (intro.hold) return 0;
    if (!intro.on) return 1;
    var k = Math.max(0, Math.min(1, (intro.t - 0.1 - i * 0.05) / 0.7));
    var c = 1.70158, u = k - 1;
    return 1 + (c + 1) * u * u * u + c * u * u;   // sale e si assesta con un piccolo rimbalzo
  }
  var drag = { yaw: 0, pitch: 0 };            // scostamento dato dal trascinamento
  var hover = { x: 0, y: 0, ex: 0, ey: 0 };  // parallasse col puntatore
  var W = 0, H = 0, cx = 0, cy = 0, focal = 0, dpr = 1, cxBase = 0, focalBase = 0;
  var sy, cyw, sp, cp, camPos = [0, 0, 0];

  function setup() {
    sy = Math.sin(cam.yaw); cyw = Math.cos(cam.yaw);
    sp = Math.sin(cam.pitch); cp = Math.cos(cam.pitch);
    camPos[0] = cam.t[0] - cam.dist * cp * sy;
    camPos[1] = cam.t[1] + cam.dist * sp;
    camPos[2] = cam.t[2] - cam.dist * cp * cyw;
  }
  function P(x, y, z) {
    x -= cam.t[0]; y -= cam.t[1]; z -= cam.t[2];
    var x1 = x * cyw - z * sy, z1 = x * sy + z * cyw;
    var y2 = y * cp + z1 * sp, z2 = -y * sp + z1 * cp;
    var s = focal / (z2 + cam.dist);
    return { x: cx + x1 * s, y: cy - y2 * s, s: s };
  }
  function dist2(x, y, z) {
    var a = x - camPos[0], b = y - camPos[1], c = z - camPos[2];
    return a * a + b * b + c * c;
  }

  /* ---------- Disegno ---------- */
  var active = null;
  var wide = window.matchMedia("(min-width: 901px)");

  function resize() {
    var r = stage.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (wide.matches) {
      var copy = document.querySelector(".hero-copy");
      var edge = copy ? copy.getBoundingClientRect().right - r.left : W * 0.45;
      cx = (edge + W) / 2 + W * 0.02; cy = H * 0.52;
      focal = Math.min((W - edge) * 1.05, H) * 1.6;
    } else {
      cx = W * 0.5; cy = H * 0.56;
      focal = Math.min(W, H * 1.25) * 1.7;
    }
  }

  var resizeCore = resize;
  resize = function () { resizeCore(); cxBase = cx; focalBase = focal; };

  function line(a, b) { ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); }

  function drawFloor() {
    var R = 13, step = 1, i, j;
    ctx.lineWidth = 1;
    // la griglia sfuma con la distanza dal centro: il pavimento non ha bordi
    for (var pass = 0; pass < 2; pass++) {
      for (i = -R; i <= R; i += step) {
        for (j = -R; j < R; j += 2) {
          var m = Math.hypot(i, j + 1);
          var a = Math.max(0, 1 - m / R);
          if (a <= 0.02) continue;
          var p = pass ? P(i, 0, j) : P(j, 0, i);
          var q = pass ? P(i, 0, j + 2) : P(j + 2, 0, i);
          ctx.strokeStyle = rgb(C.ink, a * a * 0.2);
          ctx.beginPath(); line(p, q); ctx.stroke();
        }
      }
    }
  }

  function drawRing(r) {
    var on = r.svc === active, n = 48;
    ctx.beginPath();
    for (var i = 0; i <= n; i++) {
      var t = (i / n) * Math.PI * 2;
      var p = P(r.c[0] + Math.cos(t) * r.r, 0, r.c[2] + Math.sin(t) * r.r);
      if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
    }
    ctx.closePath();
    if (on) { ctx.fillStyle = rgb(C.brand, 0.14); ctx.fill(); }
    ctx.setLineDash(r.dashed ? [4, 5] : []);
    ctx.lineWidth = on ? 2.5 : 1.5;
    ctx.strokeStyle = on ? rgb(C.brand) : rgb(C.ink, 0.35);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawCable(c) {
    var on = c.svc === active;
    ctx.beginPath();
    for (var i = 0; i < c.pts.length; i++) {
      var p = P(c.pts[i][0], c.pts[i][1], c.pts[i][2]);
      if (i) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
    }
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    ctx.lineWidth = on ? 3.5 : 2;
    ctx.strokeStyle = on ? rgb(C.brand) : rgb(C.ink, 0.7);
    ctx.stroke();
    if (c.speed) {
      for (var k = 0; k < 2; k++) {
        var w = along(c, (c.t + k * 0.5) % 1);
        var q = P(w[0], w[1] + 0.03, w[2]);
        ctx.beginPath();
        ctx.arc(q.x, q.y, Math.max(2.5, q.s * (on ? 0.13 : 0.1)), 0, Math.PI * 2);
        ctx.fillStyle = rgb(C.brand); ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = rgb(C.surface); ctx.stroke();
      }
    }
  }

  function quad(a, b, c, d, fill, lines) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y);
    ctx.closePath();
    ctx.fillStyle = rgb(fill); ctx.fill();
    ctx.lineWidth = 1.5; ctx.strokeStyle = rgb(C.ink); ctx.lineJoin = "round"; ctx.stroke();
    if (lines) {
      // a,b = base; d,c = sommità
      ctx.beginPath();
      for (var i = 1; i < lines; i++) {
        var k = i / lines;
        ctx.moveTo(a.x + (d.x - a.x) * k, a.y + (d.y - a.y) * k);
        ctx.lineTo(b.x + (c.x - b.x) * k, b.y + (c.y - b.y) * k);
      }
      ctx.lineWidth = 1; ctx.strokeStyle = rgb(C.ink, 0.45); ctx.stroke();
    }
  }

  function drawBox(b) {
    var on = b.svc === active;
    var x0 = b.cx - b.w / 2, x1 = b.cx + b.w / 2, y0 = b.y0, y1 = b.y0 + b.h * grow(b.i), z0 = b.cz - b.d / 2, z1 = b.cz + b.d / 2;
    var A = on ? C.sideAOn : C.sideA, B = on ? C.sideBOn : C.sideB, T = on ? C.topOn : C.top;
    // facce verticali rivolte verso la camera
    if (camPos[0] > x1) quad(P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), A, b.lines);
    else if (camPos[0] < x0) quad(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), A, b.lines);
    if (camPos[2] > z1) quad(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), B, b.lines);
    else if (camPos[2] < z0) quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), B, b.lines);
    if (camPos[1] > y1) quad(P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1), T, 0);
    else if (camPos[1] < y0) quad(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), B, 0);
  }

  function drawGlobe() {
    var p = P(GLOBE.c[0], GLOBE.c[1], GLOBE.c[2]);
    var r = GLOBE.r * p.s;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = rgb(C.surface); ctx.fill();
    ctx.lineWidth = Math.max(3, r * 0.22); ctx.setLineDash([r * 0.2, r * 0.16]);
    ctx.strokeStyle = rgb(C.brand); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = "500 " + Math.max(10, Math.min(13, p.s * 0.42)) + "px " + C.mono;
    ctx.fillStyle = rgb(C.soft); ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.fillText("INTERNET", p.x - r - 12, p.y);
  }

  function draw() {
    setup();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    drawFloor();
    RINGS.forEach(drawRing);
    // linee di caduta dai livelli sospesi al loro anello a terra
    var a = P(3.7, 0, -3), b = P(3.7, 4.5, -3);
    ctx.beginPath(); line(a, b);
    ctx.setLineDash([3, 5]); ctx.lineWidth = 1; ctx.strokeStyle = rgb(C.ink, 0.4); ctx.stroke(); ctx.setLineDash([]);

    CABLES.forEach(function (c) { if (c.floor) drawCable(c); });

    // tutto ciò che ha volume: dal più lontano al più vicino
    var items = [];
    BOXES.forEach(function (bx) {
      items.push({ d: dist2(bx.cx, bx.y0 + bx.h / 2, bx.cz), f: drawBox, o: bx });
    });
    CABLES.forEach(function (c) {
      if (!c.floor) {
        var m = along(c, 0.5);
        items.push({ d: dist2(m[0], m[1], m[2]), f: drawCable, o: c });
      }
    });
    items.push({ d: dist2(GLOBE.c[0], GLOBE.c[1], GLOBE.c[2]), f: drawGlobe, o: null });
    items.sort(function (p, q) { return q.d - p.d; });
    items.forEach(function (it) { it.f(it.o); });

    placeLabels();
  }

  /* ---------- Etichette HTML ---------- */
  var labels = [].slice.call(stage.querySelectorAll(".tag3d"));
  function placeLabels() {
    labels.forEach(function (el) {
      var s = SERVICES[el.dataset.svc];
      var p = P(s.anchor[0], s.anchor[1], s.anchor[2]);
      el.style.transform = "translate(" + p.x.toFixed(1) + "px," + p.y.toFixed(1) + "px) translate(-50%,-100%)";
    });
  }

  /* ---------- Stato: servizio attivo ---------- */
  var capTitle = document.getElementById("cap-title");
  var capText = document.getElementById("cap-text");
  var capLink = document.getElementById("cap-link");
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function activate(key) {
    if (key === active) return;
    active = SERVICES[key] ? key : null;
    labels.forEach(function (el) {
      var on = el.dataset.svc === active;
      el.classList.toggle("is-active", on);
      if (on) el.setAttribute("aria-current", "true"); else el.removeAttribute("aria-current");
    });
    if (active) {
      capTitle.textContent = SERVICES[active].title;
      capText.textContent = SERVICES[active].text;
      capLink.setAttribute("href", "#svc-" + active);
    }
  }

  /* ---------- Scroll → camera ----------
     Ogni tappa (hero, introduzione, capitoli) ha la sua inquadratura. La posizione
     dello scroll fra due tappe interpola fra le due inquadrature, con una sosta
     su ciascuna: la camera si ferma mentre si legge e riparte verso la successiva. */
  var journey = document.getElementById("journey");
  var stops = journey ? [].slice.call(journey.querySelectorAll("[data-key]")) : [];
  var chapters = stops.filter(function (el) { return el.classList.contains("chapter"); });
  var atHero = true, tourKey = null;

  function smooth(t) { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function setGoal(a, b, k) {
    goal.yaw = lerp(a.yaw, b.yaw, k); goal.pitch = lerp(a.pitch, b.pitch, k); goal.dist = lerp(a.dist, b.dist, k);
    for (var i = 0; i < 3; i++) goal.t[i] = lerp(a.t[i], b.t[i], k);
  }

  function onScroll() {
    if (!stops.length) return;
    var vh = window.innerHeight;
    // linea di lettura: centro dello schermo, o dello spazio sotto la scena su mobile
    var ref = vh * 0.5;
    if (!wide.matches) {
      var sb = stage.getBoundingClientRect().bottom;
      ref = sb > 0 && sb < vh ? sb + (vh - sb) * 0.45 : vh * 0.5;
    }
    var y = window.scrollY;
    var centers = stops.map(function (el, i) {
      var r = el.getBoundingClientRect();
      // l'hero "vale" finché la pagina è in cima: la sua tappa è la linea di lettura a scroll zero
      return i === 0 ? ref - y : r.top + r.height / 2;
    });
    var keys = stops.map(function (el) { return el.dataset.key; });
    // tappa finale: l'uscita dal viaggio
    var jr = journey.getBoundingClientRect();
    centers.push(Math.max(jr.bottom, centers[centers.length - 1] + 1)); keys.push("end");

    var i = 0;
    while (i < centers.length - 2 && centers[i + 1] <= ref) i++;
    var span = centers[i + 1] - centers[i];
    var t = span > 0 ? (ref - centers[i]) / span : 0;
    var k = smooth((t - 0.3) / 0.4);            // sosta all'inizio e alla fine di ogni tratto
    if (reduced.matches) k = k < 0.5 ? 0 : 1;   // senza animazioni: si passa da un'inquadratura all'altra
    setGoal(SHOTS[keys[i]], SHOTS[keys[i + 1]], k);

    var near = k < 0.5 ? keys[i] : keys[i + 1];
    var wasHero = atHero;
    atHero = i === 0 && k < 0.02;
    stage.classList.toggle("in-chapters", !atHero);
    chapters.forEach(function (el) { el.classList.toggle("is-current", el.dataset.key === near); });
    if (!atHero) { stopTour(); activate(SERVICES[near] ? near : null); }
    else if (!wasHero) activate(ORDER[0]);
    drag.yaw *= 0.94; drag.pitch *= 0.94;       // il trascinamento si riassorbe mentre si scorre
    requestDraw();
  }

  /* ---------- Ciclo di animazione ---------- */
  var running = false, visible = true, last = 0, raf = 0, dragging = false, tour = null, clock = 0;

  function frame(now) {
    raf = 0;
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    var still = reduced.matches;
    if (!still) {
      clock += dt;
      CABLES.forEach(function (c) { if (c.speed) c.t = (c.t + dt * c.speed) % 1; });
    }
    var k = still ? 1 : 1 - Math.pow(0.004, dt);   // inseguimento morbido
    if (intro.on) { intro.t += dt; if (intro.t > INTRO_TIME + 0.2) intro.on = false; }
    var iu = introU();
    cx = cxBase + (W / 2 - cxBase) * (1 - iu);         // dal centro dello schermo al suo posto
    focal = focalBase * (1 + 2.3 * (1 - iu));          // da vicinissimo alla distanza dell'hero
    hover.ex += (hover.x - hover.ex) * k; hover.ey += (hover.y - hover.ey) * k;
    var sway = still || dragging ? 0 : Math.sin(clock * 0.22) * (atHero ? 0.16 : 0.07);
    var g = goal;
    // nell'hero, il tour automatico avvicina la camera al servizio in evidenza
    var tx = g.t[0], ty = g.t[1], tz = g.t[2], gd = g.dist, gy = g.yaw, gp = g.pitch;
    if (iu < 1) { gy -= 1.1 * (1 - iu); gp -= 0.16 * (1 - iu); }   // arrivo in rotazione, da più in basso
    if (atHero && tour && tourKey) {
      var f = SERVICES[tourKey].focus; tx = f[0]; ty = f[1]; tz = f[2]; gd = 16;
    }
    cam.yaw += (gy + drag.yaw + sway + hover.ex * 0.1 - cam.yaw) * k;
    cam.pitch += (Math.max(0.18, Math.min(1.2, gp + drag.pitch + hover.ey * 0.04)) - cam.pitch) * k;
    cam.dist += (gd - cam.dist) * k;
    cam.t[0] += (tx - cam.t[0]) * k; cam.t[1] += (ty - cam.t[1]) * k; cam.t[2] += (tz - cam.t[2]) * k;
    draw();
    if (running && visible && !still) raf = requestAnimationFrame(frame);
  }
  function requestDraw() { if (!raf) raf = requestAnimationFrame(frame); }
  function start() { running = true; last = performance.now(); requestDraw(); }

  function stopTour() { if (tour) { clearInterval(tour); tour = null; tourKey = null; } }
  function startTour() {
    if (reduced.matches) return;
    var i = 0;
    tour = setInterval(function () {
      if (!visible || document.hidden || !atHero || intro.hold || intro.on) return;
      i = (i + 1) % ORDER.length;
      tourKey = ORDER[i];
      activate(tourKey);
    }, 4200);
  }

  /* ---------- Interazione ---------- */
  var px = 0, py = 0;
  canvas.addEventListener("pointerdown", function (e) {
    dragging = true; px = e.clientX; py = e.clientY;
    canvas.setPointerCapture(e.pointerId);
    stage.classList.add("is-dragging");
    stopTour();
  });
  canvas.addEventListener("pointermove", function (e) {
    if (dragging) {
      var dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
      drag.yaw += dx * 0.007;
      drag.pitch = Math.max(-0.5, Math.min(0.7, drag.pitch + dy * 0.005));
    } else if (e.pointerType === "mouse") {
      var r = stage.getBoundingClientRect();
      hover.x = ((e.clientX - r.left) / r.width - 0.5) * 2;
      hover.y = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }
    requestDraw();
  });
  var end = function () { dragging = false; stage.classList.remove("is-dragging"); };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("pointerleave", function () { hover.x = 0; hover.y = 0; });

  // un'etichetta porta al capitolo del suo servizio: è lo scroll a muovere la camera
  labels.forEach(function (el) {
    el.addEventListener("click", function (e) {
      var target = document.getElementById("svc-" + el.dataset.svc);
      if (!target) return;
      e.preventDefault(); stopTour();
      target.scrollIntoView({ behavior: reduced.matches ? "auto" : "smooth", block: wide.matches ? "center" : "start" });
    });
    el.addEventListener("pointerenter", function (e) {
      if (e.pointerType === "mouse" && atHero) { stopTour(); activate(el.dataset.svc); }
    });
  });

  /* ---------- Avvio ---------- */
  readColors();
  resize();
  stage.classList.add("is-live");
  activate(ORDER[0]);
  onScroll();

  window.addEventListener("scroll", onScroll, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(function () { resize(); onScroll(); }).observe(stage);
  window.addEventListener("resize", function () { resize(); onScroll(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (en) {
      visible = en[0].isIntersecting;
      if (visible) { last = performance.now(); requestDraw(); }
    }).observe(stage);
  }
  document.addEventListener("visibilitychange", function () {
    if (!document.hidden) { last = performance.now(); requestDraw(); }
  });
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", function () {
    readColors(); requestDraw();
  });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { resize(); onScroll(); });

  // su schermi stretti la scena sta sotto il testo: durante l'intro occupa tutto lo schermo,
  // così dall'anello si entra comunque nel mondo 3D; poi sfuma e torna al suo posto
  var fullIntro = intro.hold && !wide.matches;
  if (fullIntro) { stage.classList.add("is-intro-full"); resize(); }
  function endFullIntro() {
    if (!fullIntro) return;
    fullIntro = false;
    stage.classList.remove("is-intro-full", "is-fading");
    resize(); onScroll();
  }

  window.addEventListener("to:enter", function (e) {
    intro.hold = false;
    if (e.detail && e.detail.instant) { intro.on = false; endFullIntro(); return; }
    intro.on = true; intro.t = 0;
    last = performance.now(); requestDraw();
    if (fullIntro) {
      setTimeout(function () { stage.classList.add("is-fading"); }, 2300);
      setTimeout(endFullIntro, 2900);
    }
  });

  start();
  startTour();
})();
