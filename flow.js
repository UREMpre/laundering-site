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

  var els = CARDS.map(function (c, i) {
    var k = CATS[c.cat];
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
        '<div class="bg"></div>' + svg(k.sym, "bigsym") +
        '<div class="tile" aria-hidden="true"><b>' + esc(c.shop.charAt(0).toUpperCase()) + "</b>" + svg(k.sym) + "</div>" +
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
    // On a wide screen the side stacks spread out to use the room; on a phone they stay tight.
    var near = cw * 0.62, depth = cw * 0.55;
    var step = Math.min(cw * 0.42, Math.max(cw * 0.2, (sw * 0.5 - near - cw * 0.25) / 3));
    var fade = sw > 900 ? 3.4 : 2.6;
    for (var i = 0; i < n; i++) {
      var d = wrap(i - pos), a = Math.abs(d), s = d < 0 ? -1 : 1;
      var x, z, r;
      if (a <= 1) { x = d * near; z = -a * depth; r = d * 58; }
      else { x = s * (near + (a - 1) * step); z = -depth - (a - 1) * cw * 0.12; r = s * 58; }
      var op = a <= fade ? 1 : Math.max(0, 1 - (a - fade) / 1.2);
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
  stage.addEventListener("pointermove", function (e) {
    if (!down || e.pointerId !== down.id) return;
    var dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!dragging) {
      if (Math.abs(dx) < 7 || Math.abs(dx) < Math.abs(dy)) return;
      dragging = true;
      stage.classList.add("dragging");
      try { stage.setPointerCapture(e.pointerId); } catch (_) {}
      if (anim) { cancelAnimationFrame(anim.raf); anim = null; down.pos = pos; down.x = e.clientX; dx = 0; }
    }
    pos = down.pos - dx / (cw * 0.62);
    samples.push({ t: e.timeStamp, x: e.clientX });
    if (samples.length > 6) samples.shift();
    render();
  });
  function release(e) {
    if (!down || (e && e.pointerId !== down.id)) return;
    var was = dragging;
    stage.classList.remove("dragging");
    if (was) {
      var a = samples[0], b = samples[samples.length - 1], dt = Math.max(16, b.t - a.t);
      var v = -(b.x - a.x) / dt * 1000 / (cw * 0.62); // cards per second
      var target = Math.round(pos + Math.max(-3, Math.min(3, v * 0.22)));
      go(target);
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
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);
  stage.addEventListener("lostpointercapture", function (e) { if (dragging) release(e); });

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
  var prev = root.querySelector("[data-flow=prev]"), next = root.querySelector("[data-flow=next]"), play = root.querySelector("[data-flow=play]");
  prev.addEventListener("click", function () { stepBy(-1); holdFor(5000); });
  next.addEventListener("click", function () { stepBy(1); holdFor(5000); });
  function setPlay() {
    play.setAttribute("aria-label", stopped ? "Play the cards" : "Pause the cards");
    play.innerHTML = stopped
      ? '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z"/></svg>'
      : '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5h3v11H4zm5 0h3v11H9z"/></svg>';
  }
  play.addEventListener("click", function () { stopped = !stopped; setPlay(); if (!stopped) { holdFor(0); schedule(); } else clearTimeout(timer); });
  setPlay();

  // Only runs while on screen and while the tab is showing.
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (es) { visible = es[0].isIntersecting; if (visible) schedule(); }, { threshold: 0.35 }).observe(stage);
  } else visible = true;
  document.addEventListener("visibilitychange", function () { if (!document.hidden) { holdFor(1200); schedule(); } });
  if (reduce && reduce.addEventListener) reduce.addEventListener("change", function () { if (calm()) { stopped = true; clearTimeout(timer); setPlay(); } });

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
