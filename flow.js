// "The deck": ten of the app's sort cards in a Cover Flow. The cards are drawn from CARDS below (real text, no images).
// Roast lines are copied exactly from the app's Ledger/Data/Shame.swift (Chill / Default only, never Unhinged), with the
// placeholders filled as the app fills them ({amount} drops ".00" on a whole amount). Shop names are made up.
(function () {
  "use strict";

  // cat: the app's category (colour + symbol); line: the roast; quip: the washer answering back after a "clean" call.
  var CARDS = [
    { shop: "Noodle Courier", amount: "$38.47", cat: "food", when: "Today 11:48 PM", acct: "Blue Cash ··1004", verdict: "dirty",
      line: "$38.47. A fee to order, a fee to deliver, a tip, and the fries still arrived sad." },
    { shop: "Couch Potato Gym", amount: "$30.00", cat: "care", when: "Tuesday", acct: "Blue Cash ··1004", verdict: "clean",
      line: "Personal care: $30. You do look nice. The balance doesn't." },
    { shop: "Clickety Mart", amount: "$43.99", cat: "shop", when: "Yesterday", acct: "Travel Rewards ··7730", verdict: "dirty",
      line: "$43.99 at Clickety Mart. It was in the cart for nine seconds." },
    { shop: "Midnight Waffle Co", amount: "$16.85", cat: "food", when: "Saturday 1:12 AM", acct: "Blue Cash ··1004", verdict: "dirty",
      line: "Midnight Waffle Co at 1:12 AM. Was anyone else awake to stop you?" },
    { shop: "Porch Drop", amount: "$31.20", cat: "food", when: "Sunday", acct: "Blue Cash ··1004", verdict: "clean",
      line: "4th delivery this month, $112.60 total. That's a grocery run, delivered in pieces.",
      quip: "Sure. And the couch was a business expense." },
    { shop: "Streamheap", amount: "$15.49", cat: "fun", when: "Nov 19", acct: "Travel Rewards ··7730", verdict: "dirty",
      line: "Streamheap again. Cancel one. Just one." },
    { shop: "Spin Cycle Coffee", amount: "$6.75", cat: "food", when: "Today 8:05 AM", acct: "Blue Cash ··1004", verdict: "dirty",
      line: "Spin Cycle Coffee for the 9th time. At this point it's a relationship." },
    { shop: "Turnip Town Grocery", amount: "$86.52", cat: "food", when: "Monday", acct: "Everyday Checking ··4471", verdict: "clean",
      line: "Turnip Town Grocery, $86.52. Groceries. The washer approves, as long as you cook them." },
    { shop: "Gadget Grotto", amount: "$249.00", cat: "shop", when: "Friday", acct: "Blue Cash ··1004", verdict: "dirty",
      line: "A $249 charge. Retirement just felt a draft." },
    { shop: "Gas-n-Snack", amount: "$9.64", cat: "shop", when: "Thursday 10:31 PM", acct: "Blue Cash ··1004", verdict: "dirty",
      line: "5th Gas-n-Snack stop this month, $48.20. Snacks, at airport prices, without the airport." }
  ];

  // SpendingPalette (dark) and CategoryStyle's names; the symbols are drawn after the SF Symbols the app uses.
  var CATS = {
    food: { name: "Food and drink", hex: 0xE2622B, sym: "fork" },
    shop: { name: "General merchandise", hex: 0x3F8FEB, sym: "bag" },
    care: { name: "Personal care", hex: 0xE0A21A, sym: "sparkles" },
    fun: { name: "Entertainment", hex: 0xE05A8E, sym: "film" }
  };
  var SYM = {
    fork: '<path d="M7 2v7.5a2.5 2.5 0 0 0 1.6 2.33V22h1.8V11.83A2.5 2.5 0 0 0 12 9.5V2h-1.4v6.2H9.9V2H9.1v6.2h-.7V2zM17.5 2c-1.9 1.2-3 3.6-3 6.6V13h2v9h1.8V2z"/>',
    bag: '<path d="M8 7V6a4 4 0 0 1 8 0v1h3.2l1 15H3.8l1-15zm1.8 0h4.4V6a2.2 2.2 0 0 0-4.4 0z"/>',
    sparkles: '<path d="M10 3c.7 4.6 2.9 6.8 7.5 7.5-4.6.7-6.8 2.9-7.5 7.5-.7-4.6-2.9-6.8-7.5-7.5C7.1 9.8 9.3 7.6 10 3zM18.5 14c.3 2 1.3 3 3.3 3.3-2 .3-3 1.3-3.3 3.3-.3-2-1.3-3-3.3-3.3 2-.3 3-1.3 3.3-3.3zM18 1.5c.25 1.5 1 2.25 2.5 2.5-1.5.25-2.25 1-2.5 2.5-.25-1.5-1-2.25-2.5-2.5 1.5-.25 2.25-1 2.5-2.5z"/>',
    film: '<path fill-rule="evenodd" d="M3 4h18v16H3zm1.8 1.8v2h2v-2zm0 4v2h2v-2zm0 4v2h2v-2zm12.4-8v2h2v-2zm0 4v2h2v-2zm0 4v2h2v-2zM8.6 5.8v12.4h6.8V5.8z"/>',
    washer: '<path fill-rule="evenodd" d="M6 2h12a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V5a3 3 0 0 1 3-3zm0 2a1 1 0 0 0-1 1v1.5h14V5a1 1 0 0 0-1-1zm1.2.6a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zm2.8 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8zM12 9a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 1.8a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4z"/>'
  };
  function svg(name, cls) { return '<svg' + (cls ? ' class="' + cls + '"' : "") + ' viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">' + SYM[name] + "</svg>"; }
  function mix(hex, to, by) {
    var r = hex >> 16 & 255, g = hex >> 8 & 255, b = hex & 255;
    return "rgb(" + Math.round(r + (to - r) * by) + "," + Math.round(g + (to - g) * by) + "," + Math.round(b + (to - b) * by) + ")";
  }
  function esc(s) { return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  var root = document.getElementById("deck-flow");
  if (!root) return;
  var stage = root.querySelector(".flow-stage");
  var track = root.querySelector(".flow-track");
  var n = CARDS.length;

  var art = window.FlowArt || null; // flow-art.js: made-up logos and maps (optional; without it the monogram tiles stay)
  var els = CARDS.map(function (c, i) {
    var k = CATS[c.cat];
    var logo = art && art.logo(c.shop);
    var el = document.createElement("div");
    el.className = "flow-card";
    el.setAttribute("role", "group");
    el.setAttribute("aria-roledescription", "card");
    el.setAttribute("aria-label", (i + 1) + " of " + n + ": " + c.shop + ", " + c.amount + ", " + c.verdict);
    el.style.setProperty("--c1", mix(k.hex, 255, 0.10));
    el.style.setProperty("--c2", mix(k.hex, 0, 0.40));
    el.style.setProperty("--t1", mix(k.hex, 255, 0.12));
    el.style.setProperty("--t2", mix(k.hex, 0, 0.22));
    el.innerHTML =
      (c.quip ? '<div class="quip" aria-hidden="true">' + esc(c.quip) + "<small>Tap to change it to dirty</small></div>" : "") +
      '<div class="face"><div class="in">' +
        '<div class="bg"></div>' + svg(k.sym, "bigsym") + (art ? '<div class="map"></div>' : "") +
        (logo ? '<div class="tile logo" aria-hidden="true">' + logo + "</div>"
              : '<div class="tile" aria-hidden="true"><b>' + esc(c.shop.charAt(0).toUpperCase()) + "</b>" + svg(k.sym) + "</div>") +
        '<div class="scrim"></div>' +
        '<div class="cap">' +
          '<div class="top"><span class="name">' + esc(c.shop) + '</span><span class="amt">' + c.amount + "</span></div>" +
          '<div class="det">' + svg(k.sym) + "<span>" + k.name + " · " + c.when + "</span></div>" +
          '<div class="acct">' + esc(c.acct) + "</div>" +
          '<div class="roast">' + svg("washer") + "<i>" + esc(c.line) + "</i></div>" +
          (c.quip ? '<span class="sr-only">The washer answers back: ' + esc(c.quip) + "</span>" : "") +
        "</div>" +
        '<div class="stamp ' + c.verdict + '" aria-hidden="true">' + c.verdict.toUpperCase() + "</div>" +
        '<span class="sr-only">Verdict: ' + c.verdict + ".</span>" +
      "</div></div>";
    // The map is drawn once per card, from the shop's name (the same map every visit), and never per frame.
    if (art) el.querySelector(".map").style.backgroundImage = art.map(c.shop, null, mix(k.hex, 255, 0.10), mix(k.hex, 0, 0.40));
    track.appendChild(el);
    return el;
  });

  // The name is one line in the app: a long one shrinks (to 60%), then cuts.
  function fitNames() {
    var names = els.map(function (el) { return el.querySelector(".name"); });
    names.forEach(function (nm) { nm.style.fontSize = ""; });
    var over = names.map(function (nm) { return nm.scrollWidth / Math.max(1, nm.clientWidth); });
    names.forEach(function (nm, i) { if (over[i] > 1.01) nm.style.fontSize = (2.8 * Math.max(0.6, 1 / over[i] * 0.98)).toFixed(3) + "em"; });
  }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  function calm() { return !!(reduce && reduce.matches); }

  // Layout: pos is a real number; card i sits at d = i - pos, wrapped into [-n/2, n/2).
  var pos = 0, cw = 300, sw = 390, front = -1;
  function measure() { cw = els[0].offsetWidth || 300; sw = stage.clientWidth || 390; }
  function wrap(d) { d = ((d % n) + n) % n; return d >= n / 2 ? d - n : d; }
  function render() {
    // Classic Cover Flow (founder, Nov 25: "the tiles clip together and it's not like Cover Flow"): the card in front stands
    // forward and flat; every other card turns 70 degrees with its INNER edge going away from you (so it can never cut into
    // the card in front), sits a clear gap to the side, and the rest stack tightly behind it, inner ones on top.
    var side0 = cw * 0.8, step = cw * (sw > 900 ? 0.2 : 0.15), fz = cw * 0.1, sz = -cw * 0.28, turn = 70;
    var fade = sw > 900 ? 4.2 : 3.2;
    for (var i = 0; i < n; i++) {
      var d = wrap(i - pos), a = Math.abs(d), s = d < 0 ? -1 : 1;
      var x, z, r;
      if (a <= 1) { x = d * side0; z = fz + (sz - fz) * a; r = -d * turn; }
      else { x = s * (side0 + (a - 1) * step); z = sz - (a - 1) * 2; r = -s * turn; }
      var op = a <= fade ? 1 : Math.max(0, 1 - (a - fade) / 0.8);
      var el = els[i];
      el.style.transform = "translate3d(" + x.toFixed(1) + "px,0," + z.toFixed(1) + "px) rotateY(" + r.toFixed(2) + "deg)";
      el.style.opacity = op.toFixed(3);
      el.style.zIndex = String(100 - Math.round(a * 10));
      el.style.pointerEvents = op > 0.05 ? "" : "none";
    }
    var f = ((Math.round(pos) % n) + n) % n;
    if (f !== front) {
      if (front >= 0) els[front].classList.remove("front");
      els[f].classList.add("front");
      front = f;
    }
  }

  // Tween pos to a target (an integer); under Reduce Motion it jumps.
  var anim = null;
  function go(target) {
    cancelAnimationFrame(anim && anim.raf);
    if (calm()) { pos = target; render(); anim = null; return; }
    var from = pos, t0 = performance.now(), dur = Math.min(900, 480 + Math.abs(target - from) * 140);
    anim = { raf: 0 };
    (function tick(now) {
      var t = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - t, 3);
      pos = from + (target - from) * e;
      render();
      if (t < 1) anim.raf = requestAnimationFrame(tick); else anim = null;
    })(t0);
  }
  function stepBy(k) { go(Math.round(pos) + k); }
  // Scrubbing like Cover Flow (founder, Nov 25: "more of a tap per page right now, want a smooth drag back and forth that
  // settles on a tile"): a card per ~third of a card's width of finger travel, and a throw that glides on with friction and
  // eases onto the card it ends nearest.
  function dragPx() { return Math.max(70, cw * 0.36); }
  function coast(v) {
    cancelAnimationFrame(anim && anim.raf);
    if (calm() || Math.abs(v) < 0.6) { go(Math.round(pos + v * 0.12)); return; }
    v = Math.max(-14, Math.min(14, v));
    var last = performance.now();
    anim = { raf: 0 };
    (function glide(now) {
      var dt = Math.min(0.05, (now - last) / 1000); last = now;
      pos += v * dt;
      v *= Math.exp(-dt * 3.2);           // friction
      render();
      if (Math.abs(v) > 1.6) { anim.raf = requestAnimationFrame(glide); return; }
      anim = null;
      go(Math.round(pos + v * 0.18));     // settle on the nearest card ahead
    })(last);
  }

  // Autoplay: every 2.8 s while on screen, the tab is showing and nobody is touching it.
  var visible = false, held = false, stopped = calm(), timer = 0, resumeAt = 0;
  function tick() {
    timer = 0;
    if (!visible || held || stopped || document.hidden || anim || dragging) return schedule();
    if (performance.now() < resumeAt) return schedule();
    stepBy(1);
    schedule();
  }
  function schedule() { clearTimeout(timer); if (!stopped) timer = setTimeout(tick, 2800); }
  function holdFor(ms) { resumeAt = performance.now() + ms; }

  // Swipe: Pointer Events, horizontal only (touch-action: pan-y leaves vertical scrolling to the page).
  var down = null, dragging = false, samples = [];
  stage.addEventListener("pointerdown", function (e) {
    if (e.button > 0) return;
    down = { x: e.clientX, y: e.clientY, pos: pos, id: e.pointerId, target: e.target };
    samples = [{ t: e.timeStamp, x: e.clientX }];
    held = true;
  });
  // Moves and the lift are followed on the window, not by capturing the pointer: iOS Safari dropped the capture a few
  // frames into a drag, which ended it after one card ("more of a tap per page").
  window.addEventListener("pointermove", function (e) {
    if (!down || e.pointerId !== down.id) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!dragging) {
      if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy)) return;
      dragging = true;
      stage.classList.add("dragging");
      if (anim) { cancelAnimationFrame(anim.raf); anim = null; down.pos = pos; down.x = e.clientX; dx = 0; }
    }
    pos = down.pos - dx / dragPx();
    samples.push({ t: e.timeStamp, x: e.clientX });
    if (samples.length > 12) samples.shift();
    render();
  });
  function release(e) {
    if (!down || (e && e.pointerId !== down.id)) return;
    var was = dragging;
    stage.classList.remove("dragging");
    if (was) {
      // Only the last ~90 ms of the drag decide the throw (an old sample would slow it).
      var b = samples[samples.length - 1], a = b;
      for (var k = samples.length - 1; k >= 0; k--) { if (b.t - samples[k].t > 90) break; a = samples[k]; }
      var dt = Math.max(16, b.t - a.t);
      coast(-(b.x - a.x) / dt * 1000 / dragPx());   // cards per second
    } else if (e && e.type === "pointerup") {
      // A tap on a side card brings it to the front.
      var card = down.target.closest && down.target.closest(".flow-card");
      var i = els.indexOf(card);
      if (i >= 0 && i !== front) go(Math.round(pos) + wrap(i - Math.round(pos)));
    }
    dragging = false; down = null; held = hovering;
    holdFor(e && e.pointerType === "mouse" ? 2000 : 4000);
    schedule();
  }
  window.addEventListener("pointerup", release);
  window.addEventListener("pointercancel", release);

  var hovering = false;
  stage.addEventListener("pointerenter", function (e) { if (e.pointerType === "mouse") { hovering = true; held = true; } });
  stage.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse") { hovering = false; if (!down) held = false; holdFor(3000); } });

  // Keyboard and the small buttons.
  stage.addEventListener("keydown", function (e) {
    if (e.key === "ArrowRight") { stepBy(1); holdFor(5000); e.preventDefault(); }
    else if (e.key === "ArrowLeft") { stepBy(-1); holdFor(5000); e.preventDefault(); }
  });
  root.addEventListener("focusin", function () { held = true; });
  root.addEventListener("focusout", function (e) { if (!root.contains(e.relatedTarget)) { held = hovering; holdFor(3000); } });
  // No buttons under the deck (founder, Nov 25: "Remove arrows"): touch, hover or focus pauses it; ←/→ step it.

  // Only runs while on screen and while the tab is showing.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) schedule(); }, { threshold: 0.35 }).observe(stage);
  } else visible = true;
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { holdFor(1200); schedule(); } });
  if (reduce && reduce.addEventListener) reduce.addEventListener("change", function () { if (calm()) { stopped = true; clearTimeout(timer); } });

  var rz = 0;
  window.addEventListener("resize", function () { cancelAnimationFrame(rz); rz = requestAnimationFrame(function () { measure(); fitNames(); render(); }); });

  // Start on a dirty card, as the founder asked for the funniest up front; ?card=N (1-10) for screenshots.
  var m = /[?&]card=(\d+)/.exec(location.search);
  pos = m ? Math.max(0, Math.min(n - 1, +m[1] - 1)) : 0;
  if (/[?&]still\b/.test(location.search)) { stopped = true; setPlay(); }
  measure(); fitNames(); render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fitNames(); });
  schedule();
})();
