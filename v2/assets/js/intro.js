/* Intro: il logo si compone, poi si "spacchetta" in profondità e la camera
   attraversa la O ad anello di TOTALOFFER, che si apre come un portale sul sito.

   Il logo è disegnato su canvas a partire dalle sue forme vettoriali
   (logo-data.js). Ogni forma ha una profondità: quando il logo si scompone le
   tessere del globo e le lettere vengono incontro a chi guarda, e la camera
   le supera prima di passare dentro l'anello. */
(function () {
  "use strict";

  var root = document.documentElement;
  var overlay = document.getElementById("intro");
  var LOGO = window.TO_LOGO;

  function enterNow() {
    root.classList.remove("intro-pending");
    root.classList.add("intro-done");
    window.dispatchEvent(new CustomEvent("to:enter", { detail: { instant: true } }));
    if (overlay) overlay.remove();
  }
  if (!root.classList.contains("intro-pending")) return;
  var canvas = overlay && overlay.querySelector("canvas");
  var ctx = canvas && canvas.getContext && canvas.getContext("2d");
  if (!ctx || !LOGO || !window.Path2D) { enterNow(); return; }

  /* ---------- Tempi (secondi) ---------- */
  var T_BUILD = 1.15;   // il logo si compone
  var T_HOLD = 0.55;    // resta fermo un istante
  var T_FLY = 2.1;      // si scompone e la camera lo attraversa
  var ENTER_AT = 0.3;   // frazione del volo in cui il sito comincia ad animarsi

  /* ---------- Colori ---------- */
  var chosen = root.getAttribute("data-theme");   // scelta esplicita dal pulsante del tema
  var dark = chosen ? chosen === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  var css = getComputedStyle(root);
  var PAPER = css.getPropertyValue("--paper").trim() || "#f2f6f8";
  function hex(v) { v = v.replace("#", ""); return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)]; }
  function toHex(c) { return "#" + c.map(function (n) { return ("0" + Math.round(n).toString(16)).slice(-2); }).join(""); }
  var CY = hex("#25bde6"), LI = hex("#e6f1f4");
  // sul tema scuro i neri del logo diventano chiari e la sfumatura va dal ciano al chiaro
  function tone(color) {
    if (!dark) return color;
    var c = hex(color), k = Math.max(0, Math.min(1, 1 - c[2] / 216));
    return toHex([CY[0] + (LI[0] - CY[0]) * k, CY[1] + (LI[1] - CY[1]) * k, CY[2] + (LI[2] - CY[2]) * k]);
  }

  /* ---------- Forme ---------- */
  var RING = LOGO.ring;
  var BOX = LOGO.box;
  var CENTER = { x: (BOX[0] + BOX[2]) / 2, y: (BOX[1] + BOX[3]) / 2 };
  var GLOBE = { x: 45, y: 54 };
  var seed = 7;
  function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }

  // punto di riferimento di una forma: il primo punto del tracciato (basta per pezzi così piccoli)
  function centroid(d) {
    var n = d.match(/-?\d*\.?\d+/g);
    return { x: Number(n[0]), y: Number(n[1]) };
  }

  var shapes = LOGO.shapes.map(function (s, i) {
    var c = centroid(s.d);
    var o = { path: new Path2D(s.d), fill: s.f, g: s.g, cx: c.x, cy: c.y, depth: 0, spin: 0, push: 0, delay: 0 };
    if (s.g === "tile") {
      o.depth = 0.2 + rnd() * 0.62;                 // quanto viene incontro alla camera
      o.spin = (rnd() - 0.5) * 1.6;
      o.push = 0.5 + rnd() * 1.3;                   // quanto si allontana dal centro del globo
      o.delay = rnd() * 0.45;
    } else if (s.g === "word") {
      o.depth = 0.06 + ((c.x - 117) / 162) * 0.3;   // le lettere partono in sequenza, da sinistra
      o.delay = 0.15 + ((c.x - 117) / 162) * 0.3;
    } else if (s.g === "tag") {
      o.depth = 0.04 + rnd() * 0.12;
      o.delay = 0.35 + ((c.x - 122) / 126) * 0.25;
    }
    return o;
  });
  // dal più lontano al più vicino alla camera
  var order = shapes.slice().sort(function (a, b) { return a.depth - b.depth; });

  /* ---------- Canvas ---------- */
  var W = 0, H = 0, dpr = 1, S = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    S = Math.min(W * 0.8, 640) / (BOX[2] - BOX[0]);  // scala di base del logo
    fills = null;
  }
  var fills = null;
  function buildFills() {
    fills = shapes.map(function (s) {
      if (typeof s.fill === "string") return tone(s.fill);
      var g = ctx.createLinearGradient(s.fill.x1, s.fill.y1, s.fill.x2, s.fill.y2);
      s.fill.s.forEach(function (st) { g.addColorStop(st[0], tone(st[1])); });
      return g;
    });
    shapes.forEach(function (s, i) { s.paint = fills[i]; });
  }

  function clamp(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function outCubic(t) { t = clamp(t); return 1 - Math.pow(1 - t, 3); }
  function inOut(t) { t = clamp(t); return t * t * (3 - 2 * t); }

  /* ---------- Fotogramma ----------
     build: 0→1 composizione; fly: 0→1 attraversamento */
  function draw(build, fly) {
    if (!fills) buildFills();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, W, H);

    // camera: lo zoom cresce in modo esponenziale, come un avvicinamento a velocità costante
    var zoom = Math.exp(7.2 * Math.pow(fly, 1.7));
    var inv = 1 / zoom;                        // distanza residua dal piano del logo
    var burst = outCubic(fly / 0.5);           // quanto il logo è scomposto
    // il punto di fuga scivola dal centro del logo al centro dell'anello
    var aim = inOut(fly / 0.42);
    var lx = CENTER.x + (RING.x - CENTER.x) * aim, ly = CENTER.y + (RING.y - CENTER.y) * aim;
    var ox = W / 2, oy = H / 2;

    for (var i = 0; i < order.length; i++) {
      var s = order[i];
      // composizione: ogni pezzo arriva dalla profondità e si posa al suo posto
      var b = outCubic((build - s.delay) / (1 - s.delay || 1));
      var e = fly > 0 ? burst : 1 - b;
      var alpha = fly > 0 ? 1 : clamp((build - s.delay) * 3.2);
      var gap = inv - s.depth * e;             // distanza del pezzo dalla camera
      if (gap <= 0.03 || alpha <= 0) continue; // è alle spalle della camera
      var k = 1 / gap;                         // ingrandimento prospettico
      if (k > (s.depth ? 90 : 320)) continue;
      // i pezzi svaniscono mentre la camera li supera; l'anello resta pieno fino al passaggio
      if (s.depth && gap < 0.22) alpha *= clamp((gap - 0.03) / 0.19);
      var dx = 0, dy = 0, rot = 0;
      if (s.g === "tile") {
        dx = (s.cx - GLOBE.x) * s.push * e; dy = (s.cy - GLOBE.y) * s.push * e;
        rot = s.spin * e;
      }
      var sc = S * k * dpr;
      var px = (ox + (s.cx + dx - lx) * S * k) * dpr, py = (oy + (s.cy + dy - ly) * S * k) * dpr;
      var cos = Math.cos(rot) * sc, sin = Math.sin(rot) * sc;
      // la forma ruota attorno al proprio punto di riferimento
      ctx.setTransform(cos, sin, -sin, cos, px - (cos * s.cx - sin * s.cy), py - (sin * s.cx + cos * s.cy));
      ctx.globalAlpha = alpha;
      ctx.fillStyle = s.paint;
      ctx.fill(s.path);
    }

    // il portale: l'interno dell'anello diventa trasparente e lascia vedere il sito
    if (fly > 0) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = clamp(fly / 0.12);
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(ox + (RING.x - lx) * S * zoom, oy + (RING.y - ly) * S * zoom, RING.inner * S * zoom * 1.01, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
    }
    return RING.inner * S * zoom;   // raggio del portale in pixel
  }

  /* ---------- Sequenza ---------- */
  var startAt = 0, entered = false, finished = false, raf = 0;

  function fireEnter(instant) {
    if (entered) return;
    entered = true;
    root.classList.remove("intro-pending");
    root.classList.add("intro-enter");
    window.dispatchEvent(new CustomEvent("to:enter", { detail: { instant: !!instant } }));
  }
  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    fireEnter(false);
    root.classList.add("intro-done");
    try { sessionStorage.setItem("to-intro", "1"); } catch (err) { /* archiviazione non disponibile */ }
    overlay.remove();
    window.removeEventListener("resize", resize);
    removeSkip();
  }
  function skip() {
    if (finished) return;
    fireEnter(false);
    overlay.classList.add("is-leaving");     // dissolvenza rapida
    setTimeout(finish, 320);
  }

  function frame(now) {
    if (finished) return;
    if (!startAt) startAt = now;
    var t = (now - startAt) / 1000;
    var build = clamp(t / T_BUILD);
    var fly = clamp((t - T_BUILD - T_HOLD) / T_FLY);
    var hole = draw(build, fly);
    if (fly >= ENTER_AT) fireEnter(false);
    if (fly >= 1 || hole > Math.hypot(W, H)) { finish(); return; }
    raf = requestAnimationFrame(frame);
  }

  var skipBtn = overlay.querySelector(".intro-skip");
  function onKey(e) { if (e.key === "Escape" || e.key === "Enter" || e.key === " ") skip(); }
  function removeSkip() {
    window.removeEventListener("keydown", onKey);
    window.removeEventListener("wheel", skip);
    window.removeEventListener("touchmove", skip);
  }
  overlay.addEventListener("click", skip);
  window.addEventListener("keydown", onKey);
  window.addEventListener("wheel", skip, { passive: true });
  window.addEventListener("touchmove", skip, { passive: true });
  if (skipBtn) skipBtn.hidden = false;

  window.addEventListener("resize", resize);
  resize();
  draw(0, 0);
  overlay.classList.add("is-live");   // da qui lo sfondo lo dipinge il canvas, così il portale può bucarlo
  // si parte quando il carattere e la pagina sono pronti, così l'ingresso non scatta
  var go = function () { if (!raf && !finished) raf = requestAnimationFrame(frame); };
  if (document.readyState === "complete") go(); else window.addEventListener("load", go);
  setTimeout(go, 1200);
})();
