/*
 * washer.js: the washing machine and the money, for laundering.app/u and /r.
 * One self-contained file: no library, no network request, no storage, no cookie.
 *
 * Ported from the app's own drawing code, same shapes, same colours:
 *   - the machine (classic skin): Ledger/Theme/Washer/WasherCartoonView.swift (Painter.draw*), door at
 *     WasherStyle.door in WasherView.swift (porthole centre 0.46, 0.63 of the square);
 *   - the money and how it is drawn towards the door and swallowed: Ledger/Views/MoneySwirl.swift (MoneyFlow.step / .draw);
 *   - the lock-screen look (money IN FRONT of the machine, mint notes with a white border): Ledger/Views/LaunchStage.swift;
 *   - what is lifted above white: Ledger/Views/HDRGlow.swift and Theme/Washer/WasherHDR.swift.
 *
 * Layers, from the bottom:
 *   1. a 2D canvas with the whole picture in ordinary colours. This is the picture everywhere.
 *   2. only where the browser says the screen can show brighter than white (`dynamic-range: high`) and WebGPU can
 *      present an extended-range canvas: a second canvas over the first, drawn by a tiny shader from two "lift"
 *      layers (the lit parts only), multiplied above 1.0. See the README note for what each browser does.
 *
 * Query switches (for checking, not for visitors): ?hdr=off  the plain picture only
 *                                                  ?hdr=debug outline every lifted part and print what was found
 *                                                  ?hdr=force try the HDR layer even when the browser says "standard"
 *                                                  (combine: ?hdr=debug,force)
 */
(function () {
  'use strict';

  var canvas = document.getElementById('washer');
  if (!canvas || !canvas.getContext) return;
  var art = canvas.parentNode;

  // ---- switches -------------------------------------------------------------------------------------------------
  var flags = (/[?&]hdr=([^&#]*)/.exec(location.search) || [0, ''])[1].split(',');
  var OFF = flags.indexOf('off') >= 0, DEBUG = flags.indexOf('debug') >= 0, FORCE = flags.indexOf('force') >= 0;
  var STILL = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- sizes ----------------------------------------------------------------------------------------------------
  // The picture is drawn in a 320 x 232 box (CSS px at full size); the washer is a 180 square inside it, centred on
  // its porthole so the door side balances the body. The canvas scales with the page; the backing store is at most 2x.
  var LW = 320, LH = 232;
  var S = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  var W = Math.round(LW * S), H = Math.round(LH * S);
  var SIZE = 180, OX = 77, OY = 22;                 // washer square: side, and where its top-left sits in the box
  var DOOR = { x: OX + 0.46 * SIZE, y: OY + 0.63 * SIZE };   // where the money goes in (the porthole's centre)

  function layer() { var c = document.createElement('canvas'); c.width = W; c.height = H; return c; }
  canvas.width = W; canvas.height = H;
  var main = canvas.getContext('2d');
  var liftM = layer(), liftK = layer();             // HDR "lift" layers: M = the machine's lit parts, K = the money's
  var lm = liftM.getContext('2d'), lk = liftK.getContext('2d');

  // ---- colours (the app's, as 0...1 triples) ---------------------------------------------------------------------
  function c3(r, g, b) { return [r, g, b]; }
  function css(c, a) { return 'rgba(' + Math.round(c[0] * 255) + ',' + Math.round(c[1] * 255) + ',' + Math.round(c[2] * 255) + ',' + (a == null ? 1 : a) + ')'; }
  var CREAM = c3(.99, .96, .90), CREAM_SHADE = c3(.89, .85, .77), INK = c3(.15, .16, .21);   // WasherCartoonView Look.classic
  var PANEL = c3(.23, .25, .32), PANEL_LIGHT = c3(.36, .39, .47);
  var RING = c3(.93, .94, .96), RING_SHADE = c3(.71, .74, .80);
  var STEEL = c3(.48, .52, .60), STEEL_LIGHT = c3(.78, .81, .87), SKY = c3(.45, .76, 1);
  var TINT = c3(.30, .87, .62);                      // the washer's tint: water, lights, display
  var AMBER = c3(1, .78, .30);
  var SPARKLE = [TINT[0] * .25 + .75, TINT[1] * .25 + .75, TINT[2] * .25 + .75];
  var WHITE = c3(1, 1, 1);
  var BILL = c3(0x34 / 255, 0xD3 / 255, 0x99 / 255); // Palette.inflow (Deep Glass #34D399), the note colour on the lock screen
  var GOLD = c3(.99, .80, .28);                      // Painter.gold: coins

  // ---- path helpers ---------------------------------------------------------------------------------------------
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath();
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.arcTo(x + w, y, x + w, y + r, r);
    c.lineTo(x + w, y + h - r); c.arcTo(x + w, y + h, x + w - r, y + h, r);
    c.lineTo(x + r, y + h); c.arcTo(x, y + h, x, y + h - r, r);
    c.lineTo(x, y + r); c.arcTo(x, y, x + r, y, r); c.closePath();
  }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 6.283185307); }
  function fillC(c, col, a) { c.fillStyle = css(col, a); c.fill(); }
  function strokeC(c, col, a, w) { c.strokeStyle = css(col, a); c.lineWidth = w; c.stroke(); }
  function star(c, d) {                              // Painter.star
    var k = d * .22;
    c.beginPath(); c.moveTo(0, -d); c.lineTo(k, -k); c.lineTo(d, 0); c.lineTo(k, k); c.lineTo(0, d);
    c.lineTo(-k, k); c.lineTo(-d, 0); c.lineTo(-k, -k); c.closePath();
  }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

  // ---- the machine ----------------------------------------------------------------------------------------------
  // `m` is the ordinary canvas, `l` the machine's lift layer (null when there is no HDR). A "lit" part is drawn into
  // both with the same shape; `l` gets it in its plain colour, and the shader lifts it.
  var DEG = Math.PI / 180;

  function drawMachine(m, l, t, live) {
    var s = SIZE;
    // Ground shadow (drawGroundShadow)
    m.save(); m.translate(s * .46, s * .965); m.scale(1, .12);
    var g = m.createRadialGradient(0, 0, 0, 0, 0, s * .46);
    g.addColorStop(0, 'rgba(0,0,0,.22)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = g; circ(m, 0, 0, s * .46); m.fill(); m.restore();

    // Rock + squash about the feet (draw)
    var ph = 2 * Math.PI * 1.6 * t;
    var rock = live ? 2.4 * Math.sin(ph) + .5 * Math.sin(2 * Math.PI * 3.9 * t) : 0;
    var squash = live ? .02 * Math.abs(Math.sin(ph)) : 0;
    var drumAngle = live ? 2 * Math.PI * 1.1 * t : .35;
    // The washer takes money in rather than throwing it out, so its open door sways a little on its hinge.
    var sway = live ? .045 * Math.sin(t * 1.7) + .02 * Math.sin(t * 4.3) : 0;
    var cs = l ? [m, l] : [m];
    cs.forEach(function (c) {
      c.save(); c.translate(s * .46, s * .95); c.rotate(rock * DEG); c.scale(1 + squash, 1 - squash); c.translate(-s * .46, -s * .95);
    });
    feet(m, s); body(m, s); panel(m, l, s, t, live); porthole(m, s, t, drumAngle, live); door(m, s, sway);
    cs.forEach(function (c) { c.restore(); });

    // Twinkles round the top of the machine (draw: twinkles)
    if (live) {
      [[.20, .30, 0], [.80, .14, 2.4], [.60, .05, 4.4]].forEach(function (tw) {
        var glow = Math.pow(Math.max(0, Math.sin(t * 3.2 + tw[2])), 3);
        if (glow > .02) {
          m.save(); m.translate(s * tw[0], s * tw[1]); m.rotate(t * .8 + tw[2]); m.scale(glow, glow);
          star(m, s * .026); fillC(m, SPARKLE, .9); m.restore();
        }
      });
    }
  }

  function feet(m, s) {
    [.16, .66].forEach(function (x) { rr(m, s * x, s * .92, s * .10, s * .065, s * .02); fillC(m, PANEL); });
  }

  function body(m, s) {
    var x = s * .08, y = s * .18, w = s * .76, h = s * .77;
    var gr = m.createLinearGradient(x, y, x + w, y + h);
    gr.addColorStop(0, css(CREAM)); gr.addColorStop(1, css(CREAM_SHADE));
    rr(m, x, y, w, h, s * .09); m.fillStyle = gr; m.fill();
    m.beginPath(); m.ellipse(s * .20 + s * .26, s * .80 + s * .05, s * .26, s * .05, 0, 0, 6.2832); fillC(m, INK, .07);   // soft shadow under the porthole
    var i = s * .012;
    rr(m, x + i, y + i, w - 2 * i, h - 2 * i, s * .08); strokeC(m, WHITE, .55, s * .008);                                 // rim highlight
    rr(m, x, y, w, h, s * .09); strokeC(m, INK, .40, s * .012);                                                           // chunky outline
  }

  // The control panel (drawPanel): two knobs, a little display, three lights that chase.
  function panel(m, l, s, t, live) {
    var x = s * .13, y = s * .225, w = s * .66, h = s * .105, cy = y + h / 2;
    rr(m, x, y, w, h, s * .03); fillC(m, PANEL); strokeC(m, INK, .45, s * .008);
    rr(m, x + s * .02, y + s * .012, w - s * .04, s * .012, s * .006); fillC(m, WHITE, .12);

    // Two knobs; the programme knob drifts while the cycle runs. LIT: each dial's pointer.
    var ka = [-35, 40 + (live ? 18 * Math.sin(2 * Math.PI * t / 6) : 0)];
    [.215, .315].forEach(function (kx, i) {
      var cx = s * kx, kr = s * .034;
      circ(m, cx, cy + s * .005, kr); fillC(m, INK, .5);
      circ(m, cx, cy, kr); fillC(m, PANEL_LIGHT); strokeC(m, INK, .5, s * .005);
      circ(m, cx, cy, kr * .72); fillC(m, RING);
      lit(m, l, function (c) {
        c.save(); c.translate(cx, cy); c.rotate(ka[i] * DEG);
        rr(c, -kr * .10, -kr * .78, kr * .20, kr * .55, kr * .10); fillC(c, TINT); c.restore();
      });
    });

    // Display with two tint digits that tick with the lights. LIT: the bars.
    var dx = s * .40, dy = cy - s * .022, dw = s * .13, dh = s * .044;
    rr(m, dx, dy, dw, dh, s * .008); fillC(m, INK);
    rr(m, dx, dy, dw, dh, s * .008); strokeC(m, TINT, .5, s * .004);
    var tick = live ? (Math.sin(2 * Math.PI * t / 1.5) > 0 ? 1 : .55) : 1;
    for (var j = 0; j < 2; j++) {
      (function (j) {
        lit(m, l, function (c) { rr(c, dx + s * .018 + j * s * .05, dy + dh / 2 - s * .011, s * .03, s * .022, s * .004); fillC(c, TINT, .85 * tick); });
      })(j);
    }

    // Three lights chasing in sequence. LIT: each light's core and its highlight dot, as bright as it is lit.
    var cols = [TINT, AMBER, SKY];
    for (var i = 0; i < 3; i++) {
      var lx = s * (.615 + .065 * i);
      var glow = live ? Math.pow(Math.max(0, Math.sin(2 * Math.PI * t / 1.5 - i * 2 * Math.PI / 3)), 3) : (i === 0 ? 1 : 0);
      circ(m, lx, cy, s * .038); fillC(m, cols[i], .45 * glow);
      circ(m, lx, cy, s * .018); fillC(m, cols[i], .30 + .70 * glow);
      circ(m, lx, cy, s * .018); strokeC(m, INK, .5, s * .004);
      circ(m, lx - s * .006, cy - s * .006, s * .005); fillC(m, WHITE, .4 + .6 * glow);
      if (l && glow > .02) {
        circ(l, lx, cy, s * .018); fillC(l, cols[i], glow);
        circ(l, lx - s * .006, cy - s * .006, s * .005); fillC(l, WHITE, glow);
      }
    }
  }

  // Draws `fn` onto the ordinary canvas and, with HDR, the same shape again onto the lift layer.
  function lit(m, l, fn) { fn(m); if (l) fn(l); }

  // The porthole with the drum and the sloshing water (drawPorthole).
  function porthole(m, s, t, drumAngle, live) {
    var cx = s * .46, cy = s * .63, R = s * .245, w = s * .05;
    circ(m, cx, cy, R); fillC(m, RING);
    m.beginPath(); m.arc(cx, cy, R - w / 2, -10 * DEG, 120 * DEG); m.lineCap = 'round'; strokeC(m, RING_SHADE, 1, w * .55);
    m.beginPath(); m.arc(cx, cy, R - w / 2, 190 * DEG, 260 * DEG); strokeC(m, WHITE, .75, w * .30); m.lineCap = 'butt';
    circ(m, cx, cy, R); strokeC(m, INK, .35, s * .012);

    var rIn = R - w;
    circ(m, cx, cy, rIn); fillC(m, INK);
    var wob = live ? s * .006 : 0;
    var dx = cx + wob * Math.cos(drumAngle), dy = cy + wob * Math.sin(drumAngle), r = rIn * .84;
    circ(m, dx, dy, r); fillC(m, STEEL);

    // Water, clipped to the drum
    m.save(); circ(m, dx, dy, r); m.clip();
    var tilt = live ? 7 * Math.sin(2 * Math.PI * .9 * t + .6) : 0;
    m.translate(dx, dy); m.rotate(tilt * DEG); m.translate(-dx, -dy);
    var level = dy + r * .10, amp = r * .07, phase = live ? t * 5 : 0, n = 12, i;
    m.beginPath(); m.moveTo(dx - r, level + amp * Math.sin(phase));
    for (i = 1; i <= n; i++) m.lineTo(dx - r + 2 * r * i / n, level + amp * Math.sin(phase + i * .9));
    m.lineTo(dx + r, dy + r * 1.2); m.lineTo(dx - r, dy + r * 1.2); m.closePath(); fillC(m, TINT, .72);
    [-.55, .05, .60].forEach(function (fx, k) {      // foam riding the surface
      var frac = (fx + 1) / 2 * n, by = level + amp * Math.sin(phase + frac * .9) - r * .03;
      circ(m, dx + fx * r, by, r * [.045, .03, .04][k]); fillC(m, WHITE, .75);
    });
    m.restore();

    // Three fins and the hub, turning with the drum
    for (var k = 0; k < 3; k++) {
      m.save(); m.translate(dx, dy); m.rotate(drumAngle + k * 2 * Math.PI / 3);
      rr(m, r * .42, -r * .075, r * .52, r * .15, r * .07); fillC(m, STEEL_LIGHT); strokeC(m, INK, .3, s * .004); m.restore();
    }
    circ(m, dx, dy, r * .13); fillC(m, INK, .6);
    circ(m, dx, dy, r); strokeC(m, INK, .5, s * .01);
  }

  // The door, swung open to the right: a foreshortened ellipse hinged on the ring (drawDoor).
  function door(m, s, sway) {
    var cx = s * .46, cy = s * .63, R = s * .245, w = s * .05, k = .30 + sway;
    var hx = cx + R, ox = hx, oy = cy - R, ow = 2 * R * k, oh = 2 * R;
    function ell(x, y, ww, hh) { m.beginPath(); m.ellipse(x + ww / 2, y + hh / 2, Math.max(.1, ww / 2), hh / 2, 0, 0, 6.2832); }
    ell(ox - s * .014, oy, ow, oh); fillC(m, RING_SHADE);
    ell(ox, oy, ow, oh); fillC(m, RING); strokeC(m, INK, .35, s * .01);
    var ix = ox + w * k, iy = oy + w, iw = ow - 2 * w * k, ih = oh - 2 * w;
    ell(ix, iy, iw, ih); fillC(m, SKY, .45);
    ell(ix, iy, iw, ih); fillC(m, TINT, .20);
    ell(ix, iy, iw, ih); strokeC(m, RING_SHADE, 1, s * .006);
    ell(ix + iw / 2 - iw * .22, iy + ih * .10, iw * .30, ih * .32); fillC(m, WHITE, .6);
    [-.42, .42].forEach(function (d) { rr(m, hx - s * .012, cy + R * d - s * .02, s * .024, s * .04, s * .006); fillC(m, PANEL); });
  }


  // ---- Mouse, the laundry cat (CatPainter in Ledger/Views/Cat/CatArt.swift) ---------------------------------------
  // The default look only: the fluffy torbie-and-white, sitting (`front` with the .sit pose, resting unimpressed face,
  // no bow tie, no hat, girth 0). Placed as the app's "Both" profile picture does it (Views/ProfilePicture.swift):
  // size 0.355 of the picture's height with the washer at 0.66 of it, feet at the washer's bottom LEFT corner
  // (home = washer.minX + 0.0165 h, washer.maxY + 0.033 h), so the door on the right stays clear.
  // Drawn in ordinary colours only: nothing of Mouse is ever lifted, and ?hdr=debug never outlines any of it.
  // Everything below is in the cat's own unit (u = 1), exactly as CatPainter writes it with P(x, y) * u.
  var FUR = c3(.68, .59, .53), STRIPE = c3(.45, .38, .34), ORANGE = c3(.98, .71, .43), CAT_CREAM = c3(1, .99, .97);
  var CAT_EYE = c3(.74, .82, .36), NOSE = c3(.98, .50, .60), PINK = c3(1, .56, .72), BLUSH = c3(1, .52, .60);
  var CAT_INK = c3(.15, .16, .21);                  // StickerPainter.ink
  var H_PIC = SIZE / .66;                            // the "Both" picture's height, from the washer's size
  var CAT_U = H_PIC * .355;
  var CAT_FEET = { x: OX + H_PIC * .0165, y: OY + SIZE + H_PIC * .033 };
  var LW_CAT = .034;                                 // CatPainter.lw

  function oval(c, x, y, w, h) { c.beginPath(); c.ellipse(x, y, w / 2, h / 2, 0, 0, 6.2832); }
  function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
  function seg(c, ax, ay, bx, by, col, a, w) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineCap = 'round'; strokeC(c, col, a, w); c.lineCap = 'butt'; }
  // CatPainter.union: every outline first, then every fill, so the shapes share one edge.
  function union(c, parts) {
    c.lineJoin = 'round'; c.lineCap = 'round';
    parts.forEach(function (p) { p[0](c); strokeC(c, CAT_INK, 1, LW_CAT * 2); });
    parts.forEach(function (p) { p[0](c); fillC(c, p[1]); });
    c.lineJoin = 'miter'; c.lineCap = 'butt';
  }
  function ovalP(x, y, w, h) { return function (c) { oval(c, x, y, w, h); }; }
  function bez(t, a, b, c, d) { var k = 1 - t; return k * k * k * a + 3 * k * k * t * b + 3 * k * t * t * c + t * t * t * d; }

  // Mouse's head (CatPainter.head, the open-eyed or blinking face, frown). `look` shifts the face a little to one side.
  function catHead(c, blink, look) {
    var hh = .235;
    c.save(); c.translate(0, -.52);
    var parts = [], inner = [];
    [-1, 1].forEach(function (sx) {
      var b1 = [sx * .07, -hh * .90], b2 = [sx * .275, -hh * .30], tip = [sx * .265, -hh * 1.62];
      parts.push([function (c) {
        c.beginPath(); c.moveTo(b1[0], b1[1]); c.quadraticCurveTo(sx * .13, -hh * 1.45, tip[0], tip[1]);
        c.quadraticCurveTo(sx * .31, -hh * .95, b2[0], b2[1]); c.closePath();
      }, FUR]);
      var mx = (b1[0] + b2[0] + tip[0]) / 3, my = (b1[1] + b2[1] + tip[1]) / 3 + .02;
      function pull(p) { return [mx + (p[0] - mx) * .52, my + (p[1] - my) * .52]; }
      inner.push([pull(b1), pull(tip), pull(b2)]);
    });
    [-1, 1].forEach(function (sx) {                  // long fur: a tuft at each cheek
      parts.push([function (c) { poly(c, [[sx * .24, 0], [sx * .350, .075], [sx * .275, .095], [sx * .330, .155], [sx * .19, .185]]); }, FUR]);
    });
    parts.push([ovalP(0, 0, .59, .47), FUR]);
    union(c, parts);
    inner.forEach(function (p) { poly(c, p); fillC(c, PINK); c.lineJoin = 'round'; strokeC(c, PINK, 1, .02); c.lineJoin = 'miter'; });
    oval(c, 0, 0, .59, .47); fillC(c, FUR);          // tidies the ears' inner edge where they meet the head
    // Her markings: orange on the forehead and beside the eyes, tabby over the brow, the white blaze up between the eyes.
    c.save(); oval(c, 0, 0, .59, .47); c.clip();
    oval(c, look * .5, -.118, .30, .19); fillC(c, ORANGE);
    [-1, 1].forEach(function (sx) {
      oval(c, sx * .225 + look * .6, .045, .14, .12); fillC(c, ORANGE);
      seg(c, sx * .165 + look * .5, -hh + .015, sx * .150 + look * .5, -hh + .085, STRIPE, 1, .030);
      seg(c, sx * .235 + look * .5, -.105, sx * .205 + look * .5, -.060, STRIPE, 1, .028);
    });
    oval(c, look, .150, .42, .27); fillC(c, CAT_CREAM);
    c.beginPath(); c.moveTo(look - .135, .085); c.quadraticCurveTo(look - .030, -.010, look, -.150);
    c.quadraticCurveTo(look + .030, -.010, look + .135, .085); c.closePath(); fillC(c, CAT_CREAM);
    c.restore();
    [-1, 1].forEach(function (sx) { oval(c, sx * .165 + look * .6, .118, .070, .040); fillC(c, BLUSH, .45); });
    [-1, 1].forEach(function (sx) {                  // whiskers: long and white, with a dark edge
      [[-.030, .42], [.045, .41]].forEach(function (w) {
        seg(c, sx * .21 + look * .4, .105 + w[0] * .3, sx * w[1] + look * .4, .085 + w[0], CAT_INK, .38, .020);
        seg(c, sx * .21 + look * .4, .105 + w[0] * .3, sx * w[1] + look * .4, .085 + w[0], WHITE, 1, .010);
      });
    });
    // Eyes: the unimpressed stare (round yellow-green eyes, big pupils, a level lid), or the blink.
    var er = .050;
    [-1, 1].forEach(function (sx) {
      var cx = sx * .125 + look, cy = 0;
      if (blink) {
        c.beginPath(); c.moveTo(cx - er * 1.1, cy - er * .2); c.quadraticCurveTo(cx, cy + er * 1.3, cx + er * 1.1, cy - er * .2);
        c.lineCap = 'round'; c.lineJoin = 'round'; strokeC(c, CAT_INK, 1, .028); c.lineCap = 'butt'; c.lineJoin = 'miter';
        return;
      }
      var r = er * 1.42, lid = .60;
      c.save(); c.beginPath(); c.rect(cx - r * 1.3, cy - r * lid, r * 2.6, r * 2); c.clip();
      circ(c, cx, cy, r); fillC(c, CAT_EYE);
      oval(c, cx, cy + r * .08, r * .92, r * 1.04); fillC(c, CAT_INK);
      oval(c, cx - r * .40 + r * .17, cy - r * .36 + r * .17, r * .34, r * .34); fillC(c, WHITE);
      circ(c, cx, cy, r); strokeC(c, CAT_INK, 1, .030);
      c.restore();
      seg(c, cx - r * 1.05, cy - r * lid, cx + r * 1.05, cy - r * lid, CAT_INK, 1, .024);
    });
    // Nose and the little frown.
    var ny = .062;
    c.beginPath(); c.moveTo(look - .026, ny - .012); c.lineTo(look + .026, ny - .012);
    c.quadraticCurveTo(look + .020, ny + .018, look, ny + .022); c.quadraticCurveTo(look - .020, ny + .018, look - .026, ny - .012);
    fillC(c, NOSE); c.lineJoin = 'round'; strokeC(c, NOSE, 1, .012); c.lineJoin = 'miter';
    var my = ny + .026;
    c.beginPath(); c.moveTo(look - .045, my + .040); c.quadraticCurveTo(look, my + .004, look + .045, my + .040);
    c.lineCap = 'round'; strokeC(c, CAT_INK, 1, .022); c.lineCap = 'butt';
    c.restore();
  }

  // Sitting, as `front(.sit)` draws it: the plume tail, the body with its bib and flank stripes, the mittens, the head.
  // A little life: a slow blink now and then, the tail tip flicking (the app's own wag), and every so often the head
  // turns a touch towards the money.
  function drawCat(m, t, live) {
    var blink = live && (t % 4.7) > 4.42;            // the app blinks for 0.15 s every 3.1 s; a slower, longer one here
    var wag = live ? Math.sin(t * 3) * .025 : 0;
    var look = 0;
    if (live) {                                       // now and then: eight seconds in nine it sits square, then looks aside and back
      var ph = t % 9, dir = Math.sin(Math.floor(t / 9) * 7.3) > 0 ? 1 : -1;
      if (ph < 2.2) look = dir * .04 * Math.sin(Math.PI * ph / 2.2);
    }
    m.save(); m.translate(CAT_FEET.x, CAT_FEET.y);
    m.fillStyle = 'rgba(0,0,0,.16)'; m.beginPath(); m.ellipse(0, 0, CAT_U * .4, CAT_U * .072, 0, 0, 6.2832); m.fill();   // CatProps.shadow
    m.scale(CAT_U, CAT_U);
    // Tail: tabby, an orange band, a dark tip.
    var tx = .36 + wag;
    function tail(a, b, col, w) {
      m.beginPath();
      for (var i = 0; i <= 20; i++) {
        var k = a + (b - a) * i / 20;
        var x = bez(k, .14, .44, .47, tx), y = bez(k, -.07, -.02, -.26, -.40);
        if (i) m.lineTo(x, y); else m.moveTo(x, y);
      }
      m.lineCap = 'round'; m.lineJoin = 'round'; strokeC(m, col, 1, w); m.lineCap = 'butt'; m.lineJoin = 'miter';
    }
    tail(0, 1, CAT_INK, .115 + LW_CAT * 2); tail(0, 1, FUR, .115); tail(.40, .58, ORANGE, .115); tail(.82, 1, STRIPE, .115);
    // Body, with the orange in the tabby, the big white bib with its ruffled hem, and a stripe on each flank.
    union(m, [[ovalP(0, -.19, .46, .39), FUR]]);
    m.save(); oval(m, 0, -.19, .46, .39); m.clip();
    oval(m, -.19, -.25, .17, .20); fillC(m, ORANGE);
    oval(m, .20, -.09, .13, .13); fillC(m, ORANGE);
    oval(m, 0, -.22, .32, .30); fillC(m, CAT_CREAM);
    [-.10, 0, .10].forEach(function (x) { oval(m, x, -.085 + Math.abs(x) * .25, .12, .12); fillC(m, CAT_CREAM); });
    [-1, 1].forEach(function (sx) { [-.25, -.17].forEach(function (y) { seg(m, sx * .25, y, sx * .17, y + .02, STRIPE, 1, .032); }); });
    m.restore();
    // Front paws (the white mittens).
    union(m, [[ovalP(-.085, -.045, .125, .095), CAT_CREAM]]);
    union(m, [[ovalP(.085, -.045, .125, .095), CAT_CREAM]]);
    // Head (a little tilt with the look).
    m.save(); m.translate(0, 0); m.rotate(look * 1.2); catHead(m, blink, look); m.restore();
    m.restore();
  }

  // ---- the money (MoneyFlow) ----------------------------------------------------------------------------------
  // Notes ride a stream round the door, clockwise like the drum, and dive in over the last stretch; one swallowed is
  // born again at an edge. Every note and coin has a seed; the random numbers are seeded, so the still frame is always the same.
  var seed = 20261113;
  function rnd() {                                   // mulberry32
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
  function between(a, b) { return a + (b - a) * rnd(); }

  var COUNT = 17, COINS = [3, 8, 13];                // fourteen notes and three coins (the app: 61, one in five a coin, on a whole screen)
  function born(x, y) {                              // MoneyFlow.born
    return { x: x, y: y, vx: 0, vy: 0, angle: between(0, 6.2832), spin: between(-1.5, 1.5), flip: between(0, 6.2832),
             coin: false, scale: between(.75, 1.25), alpha: between(.75, 1) };
  }
  function onEdge() {                                // MoneyFlow.onEdge: just off the box, any side
    var m = 16;
    switch (Math.floor(rnd() * 4)) {
      case 0: return [between(0, LW), -m];
      case 1: return [between(0, LW), LH + m];
      case 2: return [-m, between(0, LH)];
      default: return [LW + m, between(0, LH)];
    }
  }
  var notes = [];
  for (var ni = 0; ni < COUNT; ni++) {
    var nb = born(between(0, LW), between(0, LH));
    if (COINS.indexOf(ni) >= 0) { nb.coin = true; nb.scale *= .9; }
    notes.push(nb);
  }
  var REACH = Math.max(Math.hypot(DOOR.x, DOOR.y), Math.hypot(LW - DOOR.x, DOOR.y), Math.hypot(DOOR.x, LH - DOOR.y), Math.hypot(LW - DOOR.x, LH - DOOR.y));

  function step(dt) {                                // MoneyFlow.step, the part that moves the notes
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var dx = DOOR.x - n.x, dy = DOOR.y - n.y, r = Math.max(1, Math.hypot(dx, dy));
      var nx = dx / r, ny = dy / r, tx = ny, ty = -nx;          // towards the door, and round it clockwise on screen
      var closeness = 1 - Math.min(1, r / REACH);
      var around = (22 + 190 * closeness * closeness) * Math.min(1, r / 46);   // the swirl dies away so the note dives in
      var pull = 42 + 70 * closeness;
      n.x += (tx * around + nx * pull) * dt;
      n.y += (ty * around + ny * pull) * dt;
      n.angle += n.spin * dt;
      n.flip += dt * (1 + closeness * closeness * 5);
      n.spin += (n.coin ? .4 : .9) * dt * (i % 2 ? -1 : 1);
      if (Math.abs(n.spin) > 2.4) n.spin *= Math.pow(.5, dt);
      if (Math.hypot(DOOR.x - n.x, DOOR.y - n.y) < 5) {         // swallowed
        var e = onEdge(), coin = n.coin;
        n = born(e[0], e[1]); n.coin = coin; if (coin) n.scale *= .9; notes[i] = n;
      }
    }
  }

  // Draws the money in front of the machine. `m` = ordinary canvas, `l` = the machine's lift layer (a note passing over
  // a light hides it), `k` = the money's lift layer. LIT: each note's inner border and dot, each coin's ring.
  var KNOTE = 1.2;                                   // the app's notes are 22 x 12 pt on a screen; this picture is smaller than a screen
  function drawMoney(m, l, k) {
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var r = Math.hypot(n.x - DOOR.x, n.y - DOOR.y);
      var nearDoor = clamp((r - 3) / 11, 0, 1);                 // into the door: fainter over the last stretch
      var edge = clamp(Math.min(n.x, LW - n.x, n.y, LH - n.y) / 24, 0, 1);
      var a = n.alpha * nearDoor * edge;
      if (a < .01) continue;
      var sc = n.scale * (.28 + .72 * Math.min(1, r / 60)) * KNOTE;   // and smaller: shrinking into the machine
      var sy = sc * (.55 + .45 * Math.abs(Math.cos(n.flip)));         // a lazy tumble
      var cs = [m]; if (l) cs.push(l, k);
      cs.forEach(function (c) { c.save(); c.translate(n.x, n.y); c.rotate(n.angle); c.scale(sc, sy); });
      if (n.coin) {
        circ(m, 0, 0, 6); fillC(m, GOLD, a);
        circ(m, 0, 0, 3.5); strokeC(m, WHITE, .55 * a, 1);
        if (l) {
          erase(l, a, function (c) { circ(c, 0, 0, 6); });
          erase(k, a, function (c) { circ(c, 0, 0, 6); });
          circ(k, 0, 0, 3.5); strokeC(k, WHITE, .55 * a, 1);
        }
      } else {
        rr(m, -11, -6, 22, 12, 2.5); fillC(m, BILL, a);
        rr(m, -8.5, -3.5, 17, 7, 1.5); strokeC(m, WHITE, .5 * a, .8);
        circ(m, 0, 0, 2.5); fillC(m, WHITE, .7 * a);
        if (l) {
          erase(l, a, function (c) { rr(c, -11, -6, 22, 12, 2.5); });
          erase(k, a, function (c) { rr(c, -11, -6, 22, 12, 2.5); });
          rr(k, -8.5, -3.5, 17, 7, 1.5); strokeC(k, WHITE, .5 * a, .8);
          circ(k, 0, 0, 2.5); fillC(k, WHITE, .7 * a);
        }
      }
      cs.forEach(function (c) { c.restore(); });
    }
  }
  function erase(c, a, path) {
    c.globalCompositeOperation = 'destination-out'; path(c); fillC(c, WHITE, a); c.globalCompositeOperation = 'source-over';
  }

  // ---- one frame ------------------------------------------------------------------------------------------------
  var hdr = null;                                    // set when the HDR layer is up (see below)
  var tmp = null;                                    // debug outlines
  function setBase(c) { c.setTransform(S * W / (LW * S), 0, 0, S * H / (LH * S), 0, 0); c.setTransform(W / LW, 0, 0, H / LH, 0, 0); }

  function frame(t, live) {
    [main, lm, lk].forEach(function (c) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); setBase(c); });
    var l = hdr ? lm : null, k = hdr ? lk : null;
    [main].concat(l ? [l] : []).forEach(function (c) { c.save(); c.translate(OX, OY); });
    drawMachine(main, l, t, live);
    [main].concat(l ? [l] : []).forEach(function (c) { c.restore(); });
    drawCat(main, t, live);                          // Mouse: in front of the machine, under the money, never lifted
    drawMoney(main, l, k);
    if (hdr) {
      try { hdr.draw(t); } catch (e) { var h = hdr; hdr = null; h.off(); info.approach = 'plain 2D canvas (HDR layer failed: ' + (e && e.message || e) + ')'; report(); return; }
      if (DEBUG) outline();
    }
  }

  // ?hdr=debug: a magenta outline round every lifted part, so a screenshot shows what is lifted.
  function outline() {
    if (!tmp) { tmp = layer(); }
    var c = tmp.getContext('2d');
    [liftM, liftK].forEach(function (src) {
      c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.clearRect(0, 0, W, H);
      for (var a = 0; a < 6.28; a += .79) c.drawImage(src, Math.cos(a) * 1.6 * S, Math.sin(a) * 1.6 * S);
      c.globalCompositeOperation = 'source-in'; c.fillStyle = '#ff00d0'; c.fillRect(0, 0, W, H);
      c.globalCompositeOperation = 'destination-out'; c.drawImage(src, 0, 0); c.globalCompositeOperation = 'source-over';
      main.setTransform(1, 0, 0, 1, 0, 0); main.drawImage(tmp, 0, 0); setBase(main);
    });
  }

  // ---- the HDR layer --------------------------------------------------------------------------------------------
  // Where it can be had on a phone today: WebGPU's extended tone mapping (Safari 26+ "HDR support in WebGPU Canvas",
  // Chrome 129+). The two lift layers go up as textures; the shader multiplies the machine's lit parts by GAIN_MACHINE
  // and the money's by a number that drifts between GAIN_MONEY_LO and _HI across the picture and over time (the
  // slow shimmer HDRGlow gives the app's money). Values are encoded display-p3 in a float16 canvas, where 1.0 is the
  // page's white and more is brighter, up to what the screen has (the browser clips there).
  var GAIN_MACHINE = 2.0, GAIN_MONEY_LO = 1.6, GAIN_MONEY_HI = 2.6;
  var info = { approach: 'plain 2D canvas (no HDR layer)', notes: [] };
  function say(s) { info.notes.push(s); }

  var WGSL = [
    'struct U { t: f32, gm: f32, lo: f32, hi: f32 };',
    '@group(0) @binding(0) var smp: sampler;',
    '@group(0) @binding(1) var texM: texture_2d<f32>;',
    '@group(0) @binding(2) var texK: texture_2d<f32>;',
    '@group(0) @binding(3) var<uniform> u: U;',
    'struct V { @builtin(position) p: vec4<f32>, @location(0) uv: vec2<f32> };',
    '@vertex fn vs(@builtin(vertex_index) i: u32) -> V {',
    '  var q = array<vec2<f32>, 3>(vec2(-1.0, -1.0), vec2(3.0, -1.0), vec2(-1.0, 3.0));',
    '  var o: V; o.p = vec4(q[i], 0.0, 1.0); o.uv = vec2(q[i].x * 0.5 + 0.5, 0.5 - q[i].y * 0.5); return o;',
    '}',
    '@fragment fn fs(v: V) -> @location(0) vec4<f32> {',
    '  let a = textureSample(texM, smp, v.uv);',
    '  let b = textureSample(texK, smp, v.uv);',
    '  let sh = 0.5 + 0.5 * sin(u.t * 1.7 + v.uv.x * 7.0 + v.uv.y * 4.0);',
    '  let money = vec4(b.rgb * (u.lo + (u.hi - u.lo) * sh), b.a);',
    '  let mach = vec4(a.rgb * u.gm, a.a);',
    '  return money + mach * (1.0 - money.a);',
    '}'
  ].join('\n');

  function initHDR() {
    var mq = window.matchMedia ? matchMedia('(dynamic-range: high)') : { matches: false };
    info.dynamicRangeHigh = mq.matches;
    info.videoDynamicRangeHigh = window.matchMedia ? matchMedia('(video-dynamic-range: high)').matches : false;
    info.gamutP3 = window.matchMedia ? matchMedia('(color-gamut: p3)').matches : false;
    info.limitProperty = !!(window.CSS && CSS.supports && CSS.supports('dynamic-range-limit', 'no-limit'));
    info.webgpu = !!navigator.gpu;
    if (OFF) { say('?hdr=off: plain picture forced'); return Promise.resolve(); }
    if (!navigator.gpu) { say('no navigator.gpu: no extended-range canvas here'); return Promise.resolve(); }
    if (!mq.matches && !FORCE) { say('(dynamic-range: high) is false: this screen or browser says standard range'); return Promise.resolve(); }
    if (!mq.matches) say('(dynamic-range: high) is false but ?hdr=force: trying anyway');
    var gpuCanvas = document.createElement('canvas');
    gpuCanvas.width = W; gpuCanvas.height = H; gpuCanvas.setAttribute('aria-hidden', 'true');
    gpuCanvas.style.dynamicRangeLimit = 'no-limit';
    var ctx = gpuCanvas.getContext('webgpu');
    if (!ctx) { say('getContext("webgpu") gave nothing'); return Promise.resolve(); }
    return navigator.gpu.requestAdapter().then(function (adapter) {
      if (!adapter) throw new Error('no GPU adapter');
      var ai = adapter.info || {};
      info.adapter = [ai.vendor, ai.architecture, ai.description].filter(Boolean).join(' ') || '(adapter gave no info)';
      return adapter.requestDevice();
    }).then(function (device) {
      ctx.configure({ device: device, format: 'rgba16float', colorSpace: 'display-p3', toneMapping: { mode: 'extended' }, alphaMode: 'premultiplied' });
      var conf = ctx.getConfiguration ? ctx.getConfiguration() : null;
      info.configured = conf ? JSON.stringify({ format: conf.format, colorSpace: conf.colorSpace, toneMapping: conf.toneMapping, alphaMode: conf.alphaMode }) : '(getConfiguration missing)';
      if (conf && conf.toneMapping && conf.toneMapping.mode !== 'extended') throw new Error('extended tone mapping not kept: ' + info.configured);
      var mod = device.createShaderModule({ code: WGSL });
      var pipe = device.createRenderPipeline({
        layout: 'auto', vertex: { module: mod, entryPoint: 'vs' },
        fragment: { module: mod, entryPoint: 'fs', targets: [{ format: 'rgba16float' }] }, primitive: { topology: 'triangle-list' }
      });
      function tex() { return device.createTexture({ size: [W, H], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT }); }
      var tM = tex(), tK = tex();
      var ub = device.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
      var bind = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [
        { binding: 0, resource: device.createSampler({ magFilter: 'linear', minFilter: 'linear' }) },
        { binding: 1, resource: tM.createView() }, { binding: 2, resource: tK.createView() }, { binding: 3, resource: { buffer: ub } }] });
      var dead = false;
      device.lost.then(function (why) { dead = true; hdr = null; gpuCanvas.style.display = 'none'; info.approach = 'plain 2D canvas (GPU lost: ' + why.reason + ')'; report(); });
      device.addEventListener && device.addEventListener('uncapturederror', function (e) { say('GPU error: ' + (e.error && e.error.message)); report(); });
      var shown = true;
      hdr = {
        off: function () { dead = true; gpuCanvas.style.display = 'none'; },
        draw: function (t) {
          if (dead || !shown) return;
          device.queue.copyExternalImageToTexture({ source: liftM }, { texture: tM, premultipliedAlpha: true }, [W, H]);
          device.queue.copyExternalImageToTexture({ source: liftK }, { texture: tK, premultipliedAlpha: true }, [W, H]);
          device.queue.writeBuffer(ub, 0, new Float32Array([t, GAIN_MACHINE, GAIN_MONEY_LO, GAIN_MONEY_HI]));
          var enc = device.createCommandEncoder();
          var pass = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
          pass.setPipeline(pipe); pass.setBindGroup(0, bind); pass.draw(3); pass.end();
          device.queue.submit([enc.finish()]);
        }
      };
      gpuCanvas.className = 'hdr';
      art.appendChild(gpuCanvas);
      info.approach = 'WebGPU rgba16float canvas, toneMapping extended, over the 2D canvas';
      info.canvas = gpuCanvas;
      if (!FORCE && window.matchMedia) {             // go back to the plain picture if the screen stops being HDR (display change, Low Power)
        var on = function () { shown = matchMedia('(dynamic-range: high)').matches; gpuCanvas.style.display = shown && !dead ? '' : 'none'; };
        if (mq.addEventListener) mq.addEventListener('change', on);
      }
    }).catch(function (e) { hdr = null; say('HDR layer not available: ' + (e && e.message || e)); });
  }

  // ---- debug text ------------------------------------------------------------------------------------------------
  var pre = null;
  function report() {
    if (!DEBUG) return;
    if (!pre) { pre = document.createElement('pre'); pre.id = 'hdr-debug'; pre.style.cssText = 'font:11px/1.35 ui-monospace,Menlo,monospace;text-align:left;white-space:pre-wrap;margin:.6rem 0 0;color:#c026d3;overflow-wrap:anywhere'; art.parentNode.insertBefore(pre, art.nextSibling); }
    pre.textContent = [
      'approach: ' + info.approach,
      '(dynamic-range: high): ' + info.dynamicRangeHigh + '   (video-dynamic-range: high): ' + info.videoDynamicRangeHigh + '   (color-gamut: p3): ' + info.gamutP3,
      'navigator.gpu: ' + info.webgpu + '   adapter: ' + (info.adapter || '-'),
      'canvas configuration: ' + (info.configured || '-'),
      'CSS dynamic-range-limit known: ' + info.limitProperty + '   lifted by ' + GAIN_MACHINE + 'x (machine), ' + GAIN_MONEY_LO + 'x to ' + GAIN_MONEY_HI + 'x (money) in encoded display-p3',
      'devicePixelRatio: ' + (window.devicePixelRatio || 1) + '   backing: ' + W + 'x' + H + '   reduced motion: ' + STILL,
      'no way found to read the headroom itself: the browser clips the lift at what the screen has',
      info.notes.join('\n'),
      navigator.userAgent
    ].filter(Boolean).join('\n');
  }

  // ---- run ------------------------------------------------------------------------------------------------------
  var running = false, last = 0, clock = 0, rafId = 0;
  function tick(now) {
    rafId = 0;
    if (!running) return;
    var dt = Math.min(1 / 20, Math.max(0, (now - last) / 1000)); last = now;
    clock += dt; step(dt);
    frame(clock, true);
    rafId = requestAnimationFrame(tick);
  }
  function start() { if (running || STILL) return; running = true; last = performance.now(); rafId = requestAnimationFrame(tick); }
  function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); rafId = 0; }

  document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });   // a hidden tab stops drawing

  if (STILL) {                                       // Reduce Motion: one still frame, money caught mid-stream
    for (var w = 0; w < 75; w++) step(1 / 30);
    frame(0, false);
  } else {
    frame(0, true);                                  // first picture at once, in ordinary colours
  }
  initHDR().then(function () {
    report();
    if (STILL) frame(0, false); else start();
  });
  if (!STILL && !document.hidden) start();
})();
