/*
 * washer.js: the washing machine, Mouse and the money, for laundering.app/u and /r.
 * One self-contained file: no library, no storage, no cookie, and no network request of its own (card.js may hand it a
 * person's public look: see `MLPicture.show` at the end, and site/README.md).
 *
 * Ported from the app's own drawing code, same shapes, same colours:
 *   - the machine and its styles (every `WasherSkin`): Ledger/Theme/Washer/WasherCartoonView.swift (Painter.draw*,
 *     Painter.Look.of), door at WasherStyle.door in WasherView.swift (porthole centre 0.46, 0.63 of the square);
 *   - the money and how it is drawn towards the door and swallowed: Ledger/Views/MoneySwirl.swift (MoneyFlow.step / .draw);
 *     the money looks (`MoneyTheme`): ProfilePictureView.piece in Ledger/Views/ProfilePicture.swift, MarkedBill, RoseGold;
 *     the ring round Mouse alone: ProfileMoney.spot in Ledger/Views/ProfilePictureGags.swift;
 *   - the lock-screen look (money IN FRONT of the machine, notes with a white border): Ledger/Views/LaunchStage.swift;
 *   - Mouse (every coat, the bow tie, every hat, the size): CatPainter in Ledger/Views/Cat/CatArt.swift (front .sit, head,
 *     bowTie), MouseCoat / BowColor / MouseHatStyle in Views/Cat/MouseCloset.swift, the town-life hats in
 *     Views/Cat/TownLifeThings.swift, the earmuffs in Views/Cat/SquareThings.swift, MouseSize in Data/Mouse.swift;
 *   - where everyone stands: ProfilePictureView (washer, Mouse, or both) in Ledger/Views/ProfilePicture.swift;
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
  function hsb(h, s, v) {                            // SwiftUI Color(hue:saturation:brightness:)
    h = ((h % 1) + 1) % 1 * 6; var i = Math.floor(h), f = h - i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f));
    return [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
  }
  // SwiftUI's Color.mix(with:by:) mixes in a perceptual space (Oklab): the same here, so the money looks match.
  function lin(c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function gam(c) { c = clamp(c, 0, 1); return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  function oklab(c) {
    var r = lin(c[0]), g = lin(c[1]), b = lin(c[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
            0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
  }
  function fromOklab(o) {
    var l = Math.pow(o[0] + 0.3963377774 * o[1] + 0.2158037573 * o[2], 3), m = Math.pow(o[0] - 0.1055613458 * o[1] - 0.0638541728 * o[2], 3),
        s = Math.pow(o[0] - 0.0894841775 * o[1] - 1.2914855480 * o[2], 3);
    return [gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
            gam(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)];
  }
  function mix(a, b, k) { var p = oklab(a), q = oklab(b); return fromOklab([p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k]); }

  var TINT = c3(.30, .87, .62);                      // the washer's tint: water, lights, display (the same for every style)
  var AMBER = c3(1, .78, .30);
  var SPARKLE = [TINT[0] * .25 + .75, TINT[1] * .25 + .75, TINT[2] * .25 + .75];
  var WHITE = c3(1, 1, 1), BLACK = c3(0, 0, 0);
  var BILL = c3(0x34 / 255, 0xD3 / 255, 0x99 / 255); // Palette.inflow (Deep Glass #34D399), the note colour on the lock screen
  var GOLD = c3(.99, .80, .28);                      // Painter.gold: coins, the crown
  var GOLD_DARK = c3(.80, .57, .12);

  // ---- the washer's styles (WasherCartoonView.Painter.Look.of) -----------------------------------------------------
  // Every field the app's Look has. `plate` says whose number goes on the plate: the founder number or the invite number.
  function look(o) {
    var base = { cream: c3(.99, .96, .90), creamShade: c3(.89, .85, .77), ink: c3(.15, .16, .21), panel: c3(.23, .25, .32),
                 panelLight: c3(.36, .39, .47), ring: c3(.93, .94, .96), ringShade: c3(.71, .74, .80), steel: c3(.48, .52, .60),
                 steelLight: c3(.78, .81, .87), sky: c3(.45, .76, 1), rim: .55, stripe: null, trim: null, flowing: false,
                 sheen: false, crown: false, plate: null, metal: false, plateMetal: [c3(.98, .86, .52), c3(.78, .56, .20)],
                 plateInk: c3(.24, .15, .04) };
    for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) base[k] = o[k];
    return base;
  }
  var SKINS = {
    classic: look({}),
    retro: look({ cream: c3(.72, .91, .84), creamShade: c3(.55, .78, .71), ink: c3(.20, .26, .30), panel: c3(.96, .52, .44),
                  panelLight: c3(1, .72, .62), ring: c3(1, .97, .90), ringShade: c3(.90, .82, .68), steel: c3(.62, .70, .70),
                  steelLight: c3(.86, .92, .90), sky: c3(.55, .88, .95) }),
    chrome: look({ cream: c3(.80, .83, .88), creamShade: c3(.58, .62, .70), ink: c3(.12, .14, .20), panel: c3(.16, .18, .24),
                   panelLight: c3(.42, .47, .58), ring: c3(.98, .99, 1), ringShade: c3(.62, .68, .80), steel: c3(.55, .62, .74),
                   steelLight: c3(.90, .94, 1), sky: c3(.30, .62, 1), metal: true }),
    neon: look({ cream: c3(.09, .08, .16), creamShade: c3(.05, .04, .10), ink: c3(.25, 1, .88), panel: c3(.16, .06, .26),
                 panelLight: c3(1, .30, .80), ring: c3(.18, .12, .34), ringShade: c3(1, .30, .80), steel: c3(.30, .22, .52),
                 steelLight: c3(.62, .50, 1), sky: c3(.40, .95, 1) }),
    gold: look({ cream: c3(.99, .82, .32), creamShade: c3(.82, .60, .14), ink: c3(.26, .17, .05), panel: c3(.30, .20, .08),
                 panelLight: c3(.62, .44, .16), ring: c3(1, .94, .70), ringShade: c3(.86, .66, .22), steel: c3(.70, .52, .18),
                 steelLight: c3(1, .90, .56), sky: c3(1, .96, .78), metal: true }),
    getaway: look({ cream: c3(.17, .17, .20), creamShade: c3(.09, .09, .11), ink: c3(.03, .03, .05), panel: c3(.07, .07, .09),
                    panelLight: c3(.30, .30, .34), ring: c3(.34, .35, .40), ringShade: c3(.20, .20, .24), steel: c3(.26, .27, .32),
                    steelLight: c3(.62, .64, .70), sky: c3(1, .80, .30), rim: 0, stripe: c3(.93, .22, .22) }),
    perpetual: look({ cream: c3(.36, .30, .80), creamShade: c3(.16, .62, .78), ink: c3(.08, .06, .20), panel: c3(.10, .08, .24),
                      panelLight: c3(.46, .40, .86), ring: c3(.95, .95, 1), ringShade: c3(.66, .62, .94), steel: c3(.40, .36, .70),
                      steelLight: c3(.84, .82, 1), sky: c3(.60, .92, 1), flowing: true }),
    untouchable: look({ cream: c3(.99, .97, .98), creamShade: c3(.84, .86, .95), ink: c3(.30, .22, .10), panel: c3(.16, .15, .30),
                        panelLight: c3(.92, .74, .34), ring: c3(1, .88, .52), ringShade: c3(.84, .62, .20), steel: c3(.74, .72, .84),
                        steelLight: c3(1, .97, .90), sky: c3(.90, .86, 1), trim: c3(.86, .64, .20), sheen: true, crown: true }),
    founder: look({ cream: c3(.10, .42, .33), creamShade: c3(.05, .27, .22), ink: c3(.04, .13, .11), panel: c3(.96, .92, .80),
                    panelLight: c3(.80, .62, .28), ring: c3(.93, .76, .40), ringShade: c3(.68, .48, .18), steel: c3(.52, .56, .54),
                    steelLight: c3(.90, .90, .84), sky: c3(.98, .90, .62), trim: c3(.80, .60, .24), plate: 'founder' }),
    plusOne: look({ cream: c3(.98, .82, .77), creamShade: c3(.86, .61, .57), ink: c3(.31, .15, .15), panel: c3(.99, .95, .88),
                    panelLight: c3(.79, .47, .43), ring: c3(.98, .86, .80), ringShade: c3(.80, .52, .47), steel: c3(.76, .58, .56),
                    steelLight: c3(1, .93, .89), sky: c3(1, .88, .84), trim: c3(.74, .43, .38),
                    plateMetal: [c3(1, .87, .80), c3(.80, .50, .45)], plateInk: c3(.36, .16, .14), plate: 'invite' })
  };
  var SKIN_NAMES = { classic: 'washing machine', retro: 'retro washing machine', chrome: 'chrome washing machine',
                     neon: 'neon washing machine', gold: 'gold vault washing machine', getaway: 'black getaway washing machine',
                     perpetual: 'colour-shifting washing machine', untouchable: 'pearl and gold washing machine with a crown',
                     founder: "founder's edition washing machine", plusOne: 'rose-gold washing machine' };

  // ---- the money looks (MoneyTheme; ProfilePictureView.piece) ------------------------------------------------------
  var WORLD = [c3(.30, .80, .56), c3(.36, .62, .98), c3(.98, .52, .66), c3(.98, .68, .30), c3(.66, .52, .96)];   // MoneyFlow.worldColours
  var ROSE_NOTE = c3(.90, .63, .58), ROSE_BLUSH = c3(.98, .82, .78), ROSE_CREAM = c3(1, .96, .88), MARK_RED = c3(.90, .16, .20);
  var MONEY = {
    classic: { fill: BILL, w: 22, h: 12 },
    mint: { fill: mix(BILL, WHITE, .45), w: 22, h: 12 },
    hundreds: { fill: mix(BILL, BLACK, .32), w: 26, h: 13 },
    world: { fill: null, w: 22, h: 12 },
    marked: { fill: mix(BILL, c3(.93, .90, .74), .55), w: 24, h: 13 },
    roseGold: { fill: ROSE_NOTE, w: 24, h: 13 }
  };
  var MONEY_NAMES = { classic: 'banknotes', mint: 'fresh banknotes', hundreds: 'big banknotes', world: 'banknotes of many colours',
                      marked: 'marked banknotes', roseGold: 'rose-gold banknotes' };

  // ---- Mouse's coats, bow ties and hats (MouseCoat.coat, BowColor.color, MouseHatStyle) ----------------------------
  var CAT_WHITE = c3(1, .99, .97), PAWS = c3(.87, .85, .83);
  function coat(fur, stripe, orange, cream, eye, nose) { return { fur: fur, stripe: stripe, orange: orange, cream: cream, eye: eye, nose: nose }; }
  var COATS = {
    torbie: coat(c3(.68, .59, .53), c3(.45, .38, .34), c3(.98, .71, .43), c3(1, .99, .97), c3(.74, .82, .36), c3(.98, .50, .60)),
    tuxedo: coat(c3(.24, .24, .29), c3(.24, .24, .29), c3(.24, .24, .29), CAT_WHITE, c3(.80, .86, .36), c3(.98, .56, .66)),
    orange: coat(c3(.97, .69, .40), c3(.82, .48, .22), c3(1, .80, .55), CAT_WHITE, c3(.93, .72, .28), c3(.98, .56, .60)),
    grey: coat(c3(.62, .66, .72), c3(.46, .50, .58), c3(.62, .66, .72), CAT_WHITE, c3(.94, .78, .32), c3(.86, .56, .62)),
    calico: coat(c3(.97, .94, .90), c3(.30, .26, .26), c3(.96, .62, .30), CAT_WHITE, c3(.74, .82, .36), c3(.98, .56, .66)),
    white: coat(c3(.98, .97, .95), c3(.98, .97, .95), c3(.98, .97, .95), c3(1, 1, 1), c3(.48, .76, .98), c3(.98, .62, .70)),
    black: coat(c3(.25, .25, .30), c3(.25, .25, .30), c3(.25, .25, .30), c3(.25, .25, .30), c3(.98, .82, .28), c3(.42, .36, .42)),
    mackerel: coat(c3(.80, .83, .86), c3(.27, .30, .36), c3(.62, .66, .72), CAT_WHITE, c3(.42, .80, .62), c3(.86, .50, .52)),
    lilac: coat(c3(.84, .77, .84), c3(.66, .56, .70), c3(.93, .84, .90), c3(1, .98, .99), c3(.80, .78, .36), c3(.90, .62, .74))
  };
  var COAT_NAMES = { torbie: 'torbie', tuxedo: 'tuxedo', orange: 'orange tabby', grey: 'grey', calico: 'calico', white: 'white',
                     black: 'black', mackerel: 'mackerel tabby', lilac: 'lilac' };
  var BOWS = { red: c3(.93, .30, .36), blue: c3(.26, .52, .96), gold: c3(.96, .76, .24), green: c3(.24, .70, .46),
               pink: c3(.98, .56, .76), black: c3(.16, .16, .20) };
  var HAT_NAMES = { top: 'top hat', santa: 'Santa hat', beanie: 'beanie', straw: 'straw sun hat', bucket: 'bucket hat',
                    captain: "captain's cap", crown: 'flower crown', flatCap: 'flat cap', eyeshade: 'green eyeshade',
                    souwester: "sou'wester", felt: 'feathered felt hat', earmuffs: 'earmuffs', party: 'party hat' };
  var GIRTH = [0, .3, .6, .95, 1.35];                // MouseSize.girth(size:): MouseTuning.girthAt

  // The picture: what card.js hands over (already checked against the tables above), or today's default.
  var DEFAULT = { picture: 'both', skin: 'classic', plate: '', money: 'classic', coat: 'torbie', bow: null, hat: null, size: 0 };
  var P = DEFAULT;
  var W_ = SKINS.classic;                            // the machine's look in use

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
    feet(m, s); body(m, s, t); panel(m, l, s, t, live); plate(m, s); porthole(m, s, t, drumAngle, live); comet(m, s, t);
    door(m, s, sway); crown(m, s, t, live);
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
    [.16, .66].forEach(function (x) { rr(m, s * x, s * .92, s * .10, s * .065, s * .02); fillC(m, W_.trim || W_.panel); });
  }

  function body(m, s, t) {
    var x = s * .08, y = s * .18, w = s * .76, h = s * .77;
    var gr = m.createLinearGradient(x, y, x + w, y + h);
    if (W_.flowing) {                                // The Perpetual: four colours a quarter-turn apart, drifting round the wheel
      for (var i = 0; i < 4; i++) gr.addColorStop(i / 3, css(hsb(.62 + t * .11 + i * .13, .62, .96)));
    } else { gr.addColorStop(0, css(W_.cream)); gr.addColorStop(1, css(W_.creamShade)); }
    rr(m, x, y, w, h, s * .09); m.fillStyle = gr; m.fill();
    if (W_.flowing || W_.sheen || W_.stripe) {
      m.save(); rr(m, x, y, w, h, s * .09); m.clip();
      if (W_.flowing) {
        [[0, .55], [2.4, -.38]].forEach(function (p) {
          var cx = x + w / 2 + w * .42 * Math.sin(t * p[1] + p[0]), cy = y + h / 2 + h * .38 * Math.cos(t * p[1] * .8 + p[0] * 1.7), r = s * .34;
          var rg = m.createRadialGradient(cx, cy, 0, cx, cy, r);
          rg.addColorStop(0, 'rgba(255,255,255,.34)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
          m.fillStyle = rg; circ(m, cx, cy, r); m.fill();
        });
      }
      if (W_.sheen) {
        var pg = m.createLinearGradient(x, y + h, x + w, y);
        pg.addColorStop(0, css(c3(1, .78, .88), .38)); pg.addColorStop(.5, css(c3(.72, .90, 1), .30)); pg.addColorStop(1, css(c3(.80, 1, .88), .30));
        m.fillStyle = pg; m.fillRect(x, y, w, h);
        var k = Math.min(1, ((t / 4.2) % 1) / .45), bx = x - s * .30 + (w + s * .60) * k;
        m.beginPath(); m.moveTo(bx, y); m.lineTo(bx + s * .12, y); m.lineTo(bx - s * .10, y + h); m.lineTo(bx - s * .22, y + h); m.closePath();
        fillC(m, WHITE, .55);
      }
      if (W_.stripe) {
        m.fillStyle = css(W_.stripe); m.fillRect(s * .118, y, s * .058, h); m.fillRect(s * .190, y, s * .018, h);
      }
      m.restore();
    }
    m.beginPath(); m.ellipse(s * .20 + s * .26, s * .80 + s * .05, s * .26, s * .05, 0, 0, 6.2832); fillC(m, W_.ink, .07);   // soft shadow under the porthole
    var i2 = s * .012;
    rr(m, x + i2, y + i2, w - 2 * i2, h - 2 * i2, s * .08); strokeC(m, WHITE, W_.rim, s * .008);                          // rim highlight
    if (W_.trim) { rr(m, x, y, w, h, s * .09); strokeC(m, W_.ink, .55, s * .030); strokeC(m, W_.trim, 1, s * .020); }  // metal trim
    else { rr(m, x, y, w, h, s * .09); strokeC(m, W_.ink, .40, s * .012); }                                            // chunky outline
  }

  // The founders' brass plate (and The Plus One's rose-gold one), under the panel on the left (drawPlate).
  function plate(m, s) {
    if (!W_.plate) return;
    var x = s * .112, y = s * .345, w = s * .205, h = s * .078;
    var g = m.createLinearGradient(x, y, x + w, y + h);
    g.addColorStop(0, css(W_.plateMetal[0])); g.addColorStop(1, css(W_.plateMetal[1]));
    rr(m, x, y, w, h, s * .014); m.fillStyle = g; m.fill(); strokeC(m, W_.ink, .7, s * .007);
    [x + s * .014, x + w - s * .014].forEach(function (px) { circ(m, px, y + h / 2, s * .005); fillC(m, W_.ink, .6); });
    var words = 'No. ' + (P.plate || '—');
    m.save(); m.font = '800 ' + (s * .050) + 'px ui-serif, "New York", Georgia, serif';
    var tw = m.measureText(words).width, fit = Math.min(1, (w - s * .05) / Math.max(tw, 1));
    m.translate(x + w / 2, y + h / 2); m.scale(fit, fit);
    m.fillStyle = css(W_.plateInk); m.textAlign = 'center'; m.textBaseline = 'middle'; m.fillText(words, 0, 0);
    m.restore();
  }

  // The Perpetual's light, forever going round the porthole with its tail behind it (drawComet).
  function comet(m, s, t) {
    if (!W_.flowing) return;
    var cx = s * .46, cy = s * .63, r = s * (.245 - .025), head = t * 2.3 + .9;
    for (var i = 0; i < 14; i++) {
      var k = i / 13, a = head - k * 1.5;
      circ(m, cx + r * Math.cos(a), cy + r * Math.sin(a), s * .019 * (1 - .7 * k)); fillC(m, hsb(.52 + k * .3, .55 * k, 1), 1 - k);
    }
  }

  // The Untouchable's crown, a little askew on top of the machine (drawCrown).
  function crown(m, s, t, live) {
    if (!W_.crown) return;
    m.save(); m.translate(s * .46, s * .145); m.rotate(-6 * DEG);
    var w = s * .26, h = s * .13;
    m.beginPath(); m.moveTo(-w / 2, h / 2); m.lineTo(-w / 2 - w * .04, -h * .35); m.lineTo(-w * .24, h * .05); m.lineTo(0, -h * .62);
    m.lineTo(w * .24, h * .05); m.lineTo(w / 2 + w * .04, -h * .35); m.lineTo(w / 2, h / 2); m.closePath();
    var g = m.createLinearGradient(0, -h / 2, 0, h / 2); g.addColorStop(0, css(c3(1, .92, .50))); g.addColorStop(1, css(GOLD));
    m.fillStyle = g; m.fill(); m.lineJoin = 'round'; strokeC(m, W_.ink, 1, s * .012); m.lineJoin = 'miter';
    rr(m, -w / 2, h * .20, w, h * .30, h * .06); fillC(m, GOLD_DARK); strokeC(m, W_.ink, 1, s * .010);
    [[-w / 2 - w * .04, -h * .35, c3(.98, .45, .52)], [0, -h * .62, c3(.55, .80, 1)], [w / 2 + w * .04, -h * .35, c3(.62, .90, .70)]].forEach(function (j, i) {
      circ(m, j[0], j[1], w * .06); fillC(m, j[2]); strokeC(m, W_.ink, 1, s * .008);
      if (live) { var gl = Math.pow(Math.max(0, Math.sin(t * 2.4 + i * 2.1)), 6); circ(m, j[0], j[1], w * .11 * gl); fillC(m, WHITE, .85 * gl); }
    });
    m.restore();
  }

  // The control panel (drawPanel): two knobs, a little display, three lights that chase.
  function panel(m, l, s, t, live) {
    var x = s * .13, y = s * .225, w = s * .66, h = s * .105, cy = y + h / 2;
    rr(m, x, y, w, h, s * .03); fillC(m, W_.panel); strokeC(m, W_.ink, .45, s * .008);
    rr(m, x + s * .02, y + s * .012, w - s * .04, s * .012, s * .006); fillC(m, WHITE, .12);

    // Two knobs; the programme knob drifts while the cycle runs. LIT: each dial's pointer.
    var ka = [-35, 40 + (live ? 18 * Math.sin(2 * Math.PI * t / 6) : 0)];
    [.215, .315].forEach(function (kx, i) {
      var cx = s * kx, kr = s * .034;
      circ(m, cx, cy + s * .005, kr); fillC(m, W_.ink, .5);
      circ(m, cx, cy, kr); fillC(m, W_.panelLight); strokeC(m, W_.ink, .5, s * .005);
      circ(m, cx, cy, kr * .72); fillC(m, W_.ring);
      lit(m, l, function (c) {
        c.save(); c.translate(cx, cy); c.rotate(ka[i] * DEG);
        rr(c, -kr * .10, -kr * .78, kr * .20, kr * .55, kr * .10); fillC(c, TINT); c.restore();
      });
    });

    // Display with two tint digits that tick with the lights. LIT: the bars.
    var dx = s * .40, dy = cy - s * .022, dw = s * .13, dh = s * .044;
    rr(m, dx, dy, dw, dh, s * .008); fillC(m, W_.ink);
    rr(m, dx, dy, dw, dh, s * .008); strokeC(m, TINT, .5, s * .004);
    var tick = live ? (Math.sin(2 * Math.PI * t / 1.5) > 0 ? 1 : .55) : 1;
    for (var j = 0; j < 2; j++) {
      (function (j) {
        lit(m, l, function (c) { rr(c, dx + s * .018 + j * s * .05, dy + dh / 2 - s * .011, s * .03, s * .022, s * .004); fillC(c, TINT, .85 * tick); });
      })(j);
    }

    // Three lights chasing in sequence. LIT: each light's core and its highlight dot, as bright as it is lit.
    var cols = [TINT, AMBER, W_.sky];
    for (var i = 0; i < 3; i++) {
      var lx = s * (.615 + .065 * i);
      var glow = live ? Math.pow(Math.max(0, Math.sin(2 * Math.PI * t / 1.5 - i * 2 * Math.PI / 3)), 3) : (i === 0 ? 1 : 0);
      circ(m, lx, cy, s * .038); fillC(m, cols[i], .45 * glow);
      circ(m, lx, cy, s * .018); fillC(m, cols[i], .30 + .70 * glow);
      circ(m, lx, cy, s * .018); strokeC(m, W_.ink, .5, s * .004);
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
    circ(m, cx, cy, R); fillC(m, W_.ring);
    m.beginPath(); m.arc(cx, cy, R - w / 2, -10 * DEG, 120 * DEG); m.lineCap = 'round'; strokeC(m, W_.ringShade, 1, w * .55);
    m.beginPath(); m.arc(cx, cy, R - w / 2, 190 * DEG, 260 * DEG); strokeC(m, WHITE, .75, w * .30); m.lineCap = 'butt';
    circ(m, cx, cy, R); strokeC(m, W_.ink, .35, s * .012);

    var rIn = R - w;
    circ(m, cx, cy, rIn); fillC(m, W_.ink);
    var wob = live ? s * .006 : 0;
    var dx = cx + wob * Math.cos(drumAngle), dy = cy + wob * Math.sin(drumAngle), r = rIn * .84;
    circ(m, dx, dy, r); fillC(m, W_.steel);

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
      rr(m, r * .42, -r * .075, r * .52, r * .15, r * .07); fillC(m, W_.steelLight); strokeC(m, W_.ink, .3, s * .004); m.restore();
    }
    circ(m, dx, dy, r * .13); fillC(m, W_.ink, .6);
    circ(m, dx, dy, r); strokeC(m, W_.ink, .5, s * .01);
  }

  // The door, swung open to the right: a foreshortened ellipse hinged on the ring (drawDoor).
  function door(m, s, sway) {
    var cx = s * .46, cy = s * .63, R = s * .245, w = s * .05, k = .30 + sway;
    var hx = cx + R, ox = hx, oy = cy - R, ow = 2 * R * k, oh = 2 * R;
    function ell(x, y, ww, hh) { m.beginPath(); m.ellipse(x + ww / 2, y + hh / 2, Math.max(.1, ww / 2), hh / 2, 0, 0, 6.2832); }
    ell(ox - s * .014, oy, ow, oh); fillC(m, W_.ringShade);
    ell(ox, oy, ow, oh); fillC(m, W_.ring); strokeC(m, W_.ink, .35, s * .01);
    var ix = ox + w * k, iy = oy + w, iw = ow - 2 * w * k, ih = oh - 2 * w;
    ell(ix, iy, iw, ih); fillC(m, W_.sky, .45);
    ell(ix, iy, iw, ih); fillC(m, TINT, .20);
    ell(ix, iy, iw, ih); strokeC(m, W_.ringShade, 1, s * .006);
    ell(ix + iw / 2 - iw * .22, iy + ih * .10, iw * .30, ih * .32); fillC(m, WHITE, .6);
    [-.42, .42].forEach(function (d) { rr(m, hx - s * .012, cy + R * d - s * .02, s * .024, s * .04, s * .006); fillC(m, W_.trim || W_.panel); });
  }


  // ---- Mouse, the laundry cat (CatPainter in Ledger/Views/Cat/CatArt.swift) ---------------------------------------
  // Sitting, front on (`front` with the .sit pose, the resting unimpressed face), in the coat, bow tie, hat and size the
  // person chose. Placed as the app's profile picture does it (Views/ProfilePicture.swift): with the washer, size 0.355
  // of the picture's height with the washer at 0.66 of it, feet at the washer's bottom LEFT corner (home = washer.minX +
  // 0.0165 h, washer.maxY + 0.033 h), so the door on the right stays clear; alone, 0.672 of the height, in the middle.
  // A round Mouse is drawn smaller by `CatPainter.fit` (1 - 0.21 girth) so the hat stays in the frame.
  // Drawn in ordinary colours only: nothing of Mouse is ever lifted, and ?hdr=debug never outlines any of it.
  // Everything below is in the cat's own unit (u = 1), exactly as CatPainter writes it with P(x, y) * u.
  var PINK = c3(1, .56, .72), BLUSH = c3(1, .52, .60), STICKER_GOLD = c3(1, .80, .28);
  var CAT_INK = c3(.15, .16, .21);                  // StickerPainter.ink
  var H_PIC = SIZE / .66;                            // the "Both" picture's height, from the washer's size
  var LW_CAT = .034;                                 // CatPainter.lw
  var CO = COATS.torbie;                             // the coat being drawn

  function oval(c, x, y, w, h) { c.beginPath(); c.ellipse(x, y, Math.max(1e-4, w / 2), Math.max(1e-4, h / 2), 0, 0, 6.2832); }
  function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
  function seg(c, ax, ay, bx, by, col, a, w) { c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.lineCap = 'round'; strokeC(c, col, a, w); c.lineCap = 'butt'; }
  // CatPainter.union: every outline first, then every fill, so the shapes share one edge.
  function union(c, parts, w) {
    c.lineJoin = 'round'; c.lineCap = 'round';
    parts.forEach(function (p) { p[0](c); strokeC(c, CAT_INK, 1, w || LW_CAT * 2); });
    parts.forEach(function (p) { p[0](c); fillC(c, p[1], p[2]); });
    c.lineJoin = 'miter'; c.lineCap = 'butt';
  }
  function ovalP(x, y, w, h) { return function (c) { oval(c, x, y, w, h); }; }
  function path(fn) { return function (c) { c.beginPath(); fn(c); }; }
  function rrP(x, y, w, h, r) { return function (c) { rr(c, x, y, w, h, r); }; }
  function bez(t, a, b, c, d) { var k = 1 - t; return k * k * k * a + 3 * k * k * t * b + 3 * k * t * t * c + t * t * t * d; }
  function dashed(c, d, fn) { c.save(); c.setLineDash(d); fn(); c.restore(); }

  // Mouse's head (CatPainter.head, the open-eyed or blinking face, frown, and the hat). `look` shifts the face a little to one side.
  function catHead(c, blink, look) {
    var hh = .235;
    var parts = [], inner = [];
    [-1, 1].forEach(function (sx) {
      var b1 = [sx * .07, -hh * .90], b2 = [sx * .275, -hh * .30], tip = [sx * .265, -hh * 1.62];
      parts.push([function (c) {
        c.beginPath(); c.moveTo(b1[0], b1[1]); c.quadraticCurveTo(sx * .13, -hh * 1.45, tip[0], tip[1]);
        c.quadraticCurveTo(sx * .31, -hh * .95, b2[0], b2[1]); c.closePath();
      }, CO.fur]);
      var mx = (b1[0] + b2[0] + tip[0]) / 3, my = (b1[1] + b2[1] + tip[1]) / 3 + .02;
      function pull(p) { return [mx + (p[0] - mx) * .52, my + (p[1] - my) * .52]; }
      inner.push([pull(b1), pull(tip), pull(b2)]);
    });
    [-1, 1].forEach(function (sx) {                  // long fur: a tuft at each cheek
      parts.push([function (c) { poly(c, [[sx * .24, 0], [sx * .350, .075], [sx * .275, .095], [sx * .330, .155], [sx * .19, .185]]); }, CO.fur]);
    });
    parts.push([ovalP(0, 0, .59, .47), CO.fur]);
    union(c, parts);
    inner.forEach(function (p) { poly(c, p); fillC(c, PINK); c.lineJoin = 'round'; strokeC(c, PINK, 1, .02); c.lineJoin = 'miter'; });
    oval(c, 0, 0, .59, .47); fillC(c, CO.fur);       // tidies the ears' inner edge where they meet the head
    // The markings: orange on the forehead and beside the eyes, tabby over the brow, the white blaze up between the eyes.
    c.save(); oval(c, 0, 0, .59, .47); c.clip();
    oval(c, look * .5, -.118, .30, .19); fillC(c, CO.orange);
    [-1, 1].forEach(function (sx) {
      oval(c, sx * .225 + look * .6, .045, .14, .12); fillC(c, CO.orange);
      seg(c, sx * .165 + look * .5, -hh + .015, sx * .150 + look * .5, -hh + .085, CO.stripe, 1, .030);
      seg(c, sx * .235 + look * .5, -.105, sx * .205 + look * .5, -.060, CO.stripe, 1, .028);
    });
    oval(c, look, .150, .42, .27); fillC(c, CO.cream);
    c.beginPath(); c.moveTo(look - .135, .085); c.quadraticCurveTo(look - .030, -.010, look, -.150);
    c.quadraticCurveTo(look + .030, -.010, look + .135, .085); c.closePath(); fillC(c, CO.cream);
    c.restore();
    [-1, 1].forEach(function (sx) { oval(c, sx * .165 + look * .6, .118, .070, .040); fillC(c, BLUSH, .45); });
    [-1, 1].forEach(function (sx) {                  // whiskers: long and white, with a dark edge
      [[-.030, .42], [.045, .41]].forEach(function (w) {
        seg(c, sx * .21 + look * .4, .105 + w[0] * .3, sx * w[1] + look * .4, .085 + w[0], CAT_INK, .38, .020);
        seg(c, sx * .21 + look * .4, .105 + w[0] * .3, sx * w[1] + look * .4, .085 + w[0], WHITE, 1, .010);
      });
    });
    // Eyes: the unimpressed stare (round eyes, big pupils, a level lid), or the blink.
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
      circ(c, cx, cy, r); fillC(c, CO.eye);
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
    fillC(c, CO.nose); c.lineJoin = 'round'; strokeC(c, CO.nose, 1, .012); c.lineJoin = 'miter';
    var my = ny + .026;
    c.beginPath(); c.moveTo(look - .045, my + .040); c.quadraticCurveTo(look, my + .004, look + .045, my + .040);
    c.lineCap = 'round'; strokeC(c, CAT_INK, 1, .022); c.lineCap = 'butt';
    if (P.hat) hat(c, P.hat, hh, P.bow ? BOWS[P.bow] : BOWS.red);
  }

  // The hats (CatPainter.head's `switch hat`, TownLifeThings.hat, SquareThings.hat), in the head's own space.
  // `band` is the bow tie's colour (the top hat's band, the straw hat's ribbon, the felt hat's band, the earmuffs).
  function hat(g, which, hh, band) {
    var I = CAT_INK, round = function (c) { c.lineCap = 'round'; c.lineJoin = 'round'; }, plain = function (c) { c.lineCap = 'butt'; c.lineJoin = 'miter'; };
    function line(ax, ay, bx, by, col, a, w) { g.beginPath(); g.moveTo(ax, ay); g.lineTo(bx, by); round(g); strokeC(g, col, a, w); plain(g); }
    function quad(ax, ay, cx, cy, bx, by, col, a, w) { g.beginPath(); g.moveTo(ax, ay); g.quadraticCurveTo(cx, cy, bx, by); round(g); strokeC(g, col, a, w); plain(g); }
    function clipFill(clipPath, fill) { g.save(); clipPath(g); g.clip(); fill(); g.restore(); }
    var brow = -hh * .92;
    switch (which) {
      case 'top': {                                  // between the ears; its band takes the bow tie's colour
        var black = c3(.14, .14, .18);
        union(g, [[rrP(-.115, -hh - .25, .23, .27, .02), black], [ovalP(0, -hh * .98, .40, .075), black]]);
        g.fillStyle = css(band); g.fillRect(-.115, -hh - .065, .23, .045);
        break;
      }
      case 'santa': {
        var red = c3(.88, .20, .24), wh = c3(1, .99, .97);
        var cone = path(function (c) {
          c.moveTo(-.17, -hh * .92); c.quadraticCurveTo(-.13, -hh - .22, .06, -hh - .27);
          c.quadraticCurveTo(.24, -hh - .27, .27, -hh - .07); c.quadraticCurveTo(.17, -hh - .13, .17, -hh * .92); c.closePath();
        });
        union(g, [[cone, red], [ovalP(.275, -hh - .055, .105, .105), wh], [rrP(-.21, -hh * .92 - .045, .42, .095, .045), wh]]);
        break;
      }
      case 'beanie': {
        var wool = c3(.24, .56, .80), fold = c3(.16, .42, .66);
        var dome = path(function (c) { c.moveTo(-.19, -hh * .92); c.bezierCurveTo(-.19, -hh - .24, .19, -hh - .24, .19, -hh * .92); c.closePath(); });
        union(g, [[ovalP(0, -hh - .185, .115, .115), c3(1, .97, .90)], [dome, wool], [rrP(-.215, -hh * .92 - .050, .43, .10, .04), fold]]);
        for (var x = -.15; x <= .1501; x += .06) line(x, -hh * .92 - .030, x, -hh * .92 + .030, WHITE, .45, .016);
        dashed(g, [.03, .03], function () { quad(-.12, -hh - .04, 0, -hh - .09, .12, -hh - .04, WHITE, .35, .018); });
        break;
      }
      case 'straw': {
        var straw = c3(.97, .84, .52), weave = c3(.80, .62, .30);
        var crownP = path(function (c) { c.moveTo(-.15, -hh * .97); c.bezierCurveTo(-.15, -hh - .20, .15, -hh - .20, .15, -hh * .97); c.closePath(); });
        union(g, [[ovalP(0, -hh * .96, .64, .105), straw], [crownP, straw]]);
        clipFill(crownP, function () {
          g.fillStyle = css(band); g.fillRect(-.16, -hh - .062, .32, .05);
          [-.105, -.14].forEach(function (y) { quad(-.13, -hh + y + .01, 0, -hh + y - .02, .13, -hh + y + .01, weave, .7, .012); });
        });
        dashed(g, [.03, .025], function () { oval(g, 0, -hh * .96, .52, .06); strokeC(g, weave, .55, .012); });
        break;
      }
      case 'bucket': {                               // a soft crown, a brim that droops all round, a float pinned to the band
        var cloth = c3(.58, .66, .42), shade = c3(.44, .52, .30);
        var crownB = path(function (c) { c.moveTo(-.165, -hh * .96); c.bezierCurveTo(-.15, -hh - .22, .15, -hh - .22, .165, -hh * .96); c.closePath(); });
        var brim = path(function (c) { c.moveTo(-.34, -hh * .70); c.quadraticCurveTo(0, -hh * 1.42, .34, -hh * .70); c.quadraticCurveTo(0, -hh * .98, -.34, -hh * .70); c.closePath(); });
        union(g, [[brim, shade], [crownB, cloth]]);
        clipFill(crownB, function () { g.fillStyle = css(c3(.90, .82, .60)); g.fillRect(-.18, -hh - .060, .36, .048); });
        dashed(g, [.025, .025], function () { quad(-.27, -hh * .80, 0, -hh * 1.22, .27, -hh * .80, WHITE, .5, .012); });
        oval(g, .085, -hh - .040, .062, .062); strokeC(g, I, 1, .016); fillC(g, WHITE);
        clipFill(function (c) { oval(c, .085, -hh - .040, .062, .062); }, function () { g.fillStyle = css(c3(.93, .30, .34)); g.fillRect(.04, -hh - .075, .09, .035); });
        break;
      }
      case 'captain': {                              // a white top wider than the band, a navy band, a short peak, a gold badge
        var cw = c3(1, .99, .97), navy = c3(.14, .20, .40), b = -hh * .98;
        var top = path(function (c) { c.moveTo(-.165, b); c.bezierCurveTo(-.30, -hh - .21, .30, -hh - .21, .165, b); c.closePath(); });
        var peak = path(function (c) { c.moveTo(-.165, b + .018); c.quadraticCurveTo(0, b + .105, .165, b + .018); c.closePath(); });
        union(g, [[top, cw], [peak, c3(.10, .12, .20)], [rrP(-.175, b - .050, .35, .072, .02), navy]]);
        line(-.10, -hh - .115, .10, -hh - .115, I, .18, .014);
        oval(g, 0, b - .016, .070, .070); strokeC(g, I, 1, .014); fillC(g, STICKER_GOLD);
        line(0, b - .036, 0, b + .004, I, 1, .012);
        quad(-.018, b - .008, 0, b + .016, .018, b - .008, I, 1, .011);
        break;
      }
      case 'crown': {                                // a flower crown: a vine across the brow, with daisies and more
        var leaf = c3(.36, .70, .42);
        quad(-.25, -hh * .72, 0, -hh * 1.42, .25, -hh * .72, I, 1, .055);
        quad(-.25, -hh * .72, 0, -hh * 1.42, .25, -hh * .72, leaf, 1, .030);
        var petals = [WHITE, c3(1, .66, .78), c3(.74, .66, .98), c3(1, .66, .78), WHITE];
        for (var i = 0; i < 5; i++) {
          var k = .08 + i * .21, fx = -.25 + .5 * k, fy = -hh * .72 - 2 * k * (1 - k) * hh * .70, r = i === 2 ? .050 : .042, bloom = [];
          for (var p = 0; p < 5; p++) { var a = p / 5 * 2 * Math.PI + i; bloom.push([fx + Math.cos(a) * r * .78, fy + Math.sin(a) * r * .78]); }
          bloom.forEach(function (q) { oval(g, q[0], q[1], r * 1.05, r * 1.05); strokeC(g, I, 1, .022); });
          bloom.forEach(function (q) { oval(g, q[0], q[1], r * 1.05, r * 1.05); fillC(g, petals[i]); });
          oval(g, fx, fy, r * .86, r * .86); fillC(g, STICKER_GOLD);
        }
        break;
      }
      case 'flatCap': {                              // Bobbin's: tweed, a low crown over a short peak, a button on top
        var tweed = c3(.56, .46, .34), dark = c3(.40, .32, .24);
        var crownF = path(function (c) { c.moveTo(-.21, brow + .012); c.bezierCurveTo(-.25, -hh - .15, .25, -hh - .15, .21, brow + .012); c.closePath(); });
        var peakF = path(function (c) { c.moveTo(-.18, brow + .004); c.quadraticCurveTo(0, brow + .105, .18, brow + .004); c.closePath(); });
        union(g, [[peakF, dark], [crownF, tweed]], .068);
        clipFill(crownF, function () {
          for (var x = -.26; x <= .2601; x += .065) {
            g.beginPath(); g.moveTo(x, brow + .02); g.lineTo(x + .06, -hh - .16); strokeC(g, WHITE, .22, .012);
            g.beginPath(); g.moveTo(x + .06, brow + .02); g.lineTo(x, -hh - .16); strokeC(g, dark, .45, .012);
          }
        });
        oval(g, 0, -hh - .105, .05, .036); strokeC(g, I, 1, .016); fillC(g, dark);
        break;
      }
      case 'eyeshade': {                             // Dolly's spare: a band across the brow and a green visor
        var green = c3(.16, .62, .44);
        var visor = path(function (c) { c.moveTo(-.255, brow + .004); c.quadraticCurveTo(0, brow + .215, .255, brow + .004); c.quadraticCurveTo(0, brow + .035, -.255, brow + .004); c.closePath(); });
        union(g, [[visor, green, .86], [rrP(-.225, brow - .050, .45, .062, .03), c3(.20, .22, .28)]], .068);
        quad(-.16, brow + .050, -.11, brow + .082, -.04, brow + .090, WHITE, .6, .018);
        break;
      }
      case 'souwester': {                            // Galosh's: a yellow rain hat, its brim wide all round
        var oil = c3(1, .82, .22), sh = c3(.90, .66, .12);
        var crownS = path(function (c) { c.moveTo(-.17, brow); c.bezierCurveTo(-.17, -hh - .25, .17, -hh - .25, .17, brow); c.closePath(); });
        var brimS = path(function (c) { c.moveTo(-.39, -hh * .62); c.quadraticCurveTo(0, -hh * 1.50, .39, -hh * .62); c.quadraticCurveTo(0, -hh * .96, -.39, -hh * .62); c.closePath(); });
        union(g, [[brimS, sh], [crownS, oil]], .068);
        [-1, 1].forEach(function (sx) { quad(sx * .075, brow - .01, sx * .085, -hh - .14, 0, -hh - .185, sh, 1, .014); });
        quad(-.115, -hh - .06, -.115, -hh - .12, -.06, -hh - .15, WHITE, .75, .020);
        break;
      }
      case 'felt': {                                 // the cart's: a wide felt brim, a pinched crown, one long feather
        var felt = c3(.30, .44, .36), fs = c3(.22, .34, .28);
        var crownT = path(function (c) {
          c.moveTo(-.155, brow - .01); c.lineTo(-.125, -hh - .17); c.quadraticCurveTo(-.06, -hh - .235, 0, -hh - .165);
          c.quadraticCurveTo(.06, -hh - .235, .125, -hh - .17); c.lineTo(.155, brow - .01); c.closePath();
        });
        var feather = path(function (c) { c.moveTo(.11, -hh - .045); c.quadraticCurveTo(.36, -hh - .10, .40, -hh - .33); c.quadraticCurveTo(.16, -hh - .28, .11, -hh - .045); c.closePath(); });
        union(g, [[feather, c3(.98, .78, .36)], [ovalP(0, brow - .004, .70, .105), fs], [crownT, felt]], .068);
        clipFill(crownT, function () { g.fillStyle = css(band); g.fillRect(-.17, brow - .075, .34, .045); });
        quad(.13, -hh - .065, .27, -hh - .15, .37, -hh - .30, I, .55, .012);
        break;
      }
      case 'earmuffs': {                             // Button Square's: a band over the top in the bow's colour, fluffy pads
        g.beginPath(); g.moveTo(-.29, -.03); g.quadraticCurveTo(0, -hh * 2 - .07, .29, -.03);
        g.lineCap = 'round'; strokeC(g, I, 1, .092); strokeC(g, band, 1, .052);
        dashed(g, [.03, .03], function () { strokeC(g, WHITE, .35, .012); }); g.lineCap = 'butt';
        var fluff = c3(1, .97, .90);
        [-1, 1].forEach(function (sx) {
          var pads = [[sx * .305, 0, .17, .215]];
          for (var i = 0; i < 7; i++) { var a = i / 7 * 2 * Math.PI; pads.push([sx * .305 + Math.cos(a) * .07, Math.sin(a) * .092, .075, .075]); }
          g.lineJoin = 'round';
          pads.forEach(function (q) { oval(g, q[0], q[1], q[2], q[3]); strokeC(g, I, 1, .062); });
          pads.forEach(function (q) { oval(g, q[0], q[1], q[2], q[3]); fillC(g, fluff); });
          g.lineJoin = 'miter';
          oval(g, sx * .305, 0, .09, .115); fillC(g, band, .85);
          oval(g, sx * .305 - .014, -.022, .03, .035); fillC(g, WHITE, .7);
        });
        break;
      }
      case 'party': {                                // a friend's invite: a small cone in rose gold and cream stripes
        var rose = c3(.90, .62, .56), cream = c3(1, .96, .88), base = -hh * .94;
        var coneP = path(function (c) { c.moveTo(-.15, base); c.lineTo(.015, -hh - .27); c.lineTo(.15, base); c.closePath(); });
        union(g, [[coneP, rose]]);
        clipFill(coneP, function () {
          for (var i = 0; i < 3; i++) {
            var x = -.20 + i * .14;
            poly(g, [[x, base + .02], [x + .08, base + .02], [x + .17, -hh - .12], [x + .09, -hh - .12]]); fillC(g, cream);
          }
        });
        oval(g, .015, -hh - .285, .085, .085); g.lineJoin = 'round'; strokeC(g, I, 1, LW_CAT * 2); g.lineJoin = 'miter'; fillC(g, cream);
        oval(g, 0, -hh - .30, .03, .03); fillC(g, WHITE, .8);
        break;
      }
    }
  }

  // The bow tie at the throat (CatPainter.bowTie): two wings in the chosen colour and a gold knot.
  function bowTie(c, cx, cy, k, col) {
    var wings = [-1, 1].map(function (sx) { return [[cx, cy], [cx + sx * .12 * k, cy - .055 * k], [cx + sx * .12 * k, cy + .055 * k]]; });
    c.lineJoin = 'round';
    wings.forEach(function (w) { poly(c, w); strokeC(c, CAT_INK, 1, LW_CAT * 1.5); });
    wings.forEach(function (w) { poly(c, w); fillC(c, col); });
    c.lineJoin = 'miter';
    oval(c, cx, cy, .056 * k, .064 * k); strokeC(c, CAT_INK, 1, LW_CAT); fillC(c, STICKER_GOLD);
  }

  // Sitting, as `front(.sit)` draws it: the plume tail, the body with its bib and flank stripes, the mittens, the head,
  // the bow tie; rounder with girth (the body stretched as a shape, so the outline stays one width).
  // A little life: a slow blink now and then, the tail tip flicking (the app's own wag), and every so often the head
  // turns a touch towards the money.
  function drawCat(m, t, live, feet, u) {
    var blink = live && (t % 4.7) > 4.42;            // the app blinks for 0.15 s every 3.1 s; a slower, longer one here
    var wag = live ? Math.sin(t * 3) * .025 : 0;
    var look = 0;
    if (live) {                                       // now and then: eight seconds in nine it sits square, then looks aside and back
      var ph = t % 9, dir = Math.sin(Math.floor(t / 9) * 7.3) > 0 ? 1 : -1;
      if (ph < 2.2) look = dir * .04 * Math.sin(Math.PI * ph / 2.2);
    }
    var G = clamp(GIRTH[P.size] || 0, 0, 1.5);
    m.save(); m.translate(feet.x, feet.y);
    m.fillStyle = 'rgba(0,0,0,.16)'; m.beginPath(); m.ellipse(0, 0, u * .4, u * .072, 0, 0, 6.2832); m.fill();   // CatProps.shadow
    m.scale(u, u);
    // Tail: tabby, an orange band, a dark tip; it keeps its shape and comes out of the (wider) haunch.
    var tx = .36 + wag;
    function tail(a, b, col, w) {
      m.beginPath();
      for (var i = 0; i <= 20; i++) {
        var k = a + (b - a) * i / 20;
        var x = bez(k, .14, .44, .47, tx) + .22 * G, y = bez(k, -.07, -.02, -.26, -.40);
        if (i) m.lineTo(x, y); else m.moveTo(x, y);
      }
      m.lineCap = 'round'; m.lineJoin = 'round'; strokeC(m, col, 1, w); m.lineCap = 'butt'; m.lineJoin = 'miter';
    }
    tail(0, 1, CAT_INK, .115 + LW_CAT * 2); tail(0, 1, CO.fur, .115); tail(.40, .58, CO.orange, .115); tail(.82, 1, CO.stripe, .115);
    // Body: rounder with girth, stretched about the point where it sits.
    var wide = 1 + 1.35 * G, tall = 1 + G;
    function sx(x) { return x * wide; } function sy(y) { return .005 + (y - .005) * tall; }
    function so(x, y, w, h) { return ovalP(sx(x), sy(y), w * wide, h * tall); }
    var headDrop = -(.39 * (tall - 1)) + .05 * G;    // the head sinks into the body: little neck left
    var ovals = [[0, -.19, .46, .39]];
    if (G > .02) [-1, 1].forEach(function (s) { ovals.push([s * .175, -.095, .21, .20]); });
    union(m, ovals.map(function (o) { return [so(o[0], o[1], o[2], o[3]), CO.fur]; }));
    m.save(); m.beginPath();                          // clip to the body and its haunches together
    ovals.forEach(function (o) {
      var x = sx(o[0]), y = sy(o[1]), rx = o[2] * wide / 2, ry = o[3] * tall / 2;
      m.moveTo(x + rx, y); m.ellipse(x, y, rx, ry, 0, 0, 6.2832);
    });
    m.clip();
    so(-.19, -.25, .17, .20)(m); fillC(m, CO.orange);
    so(.20, -.09, .13, .13)(m); fillC(m, CO.orange);
    so(0, -.22, .32, .30)(m); fillC(m, CO.cream);
    [-.10, 0, .10].forEach(function (x) { so(x, -.085 + Math.abs(x) * .25, .12, .12)(m); fillC(m, CO.cream); });
    [-1, 1].forEach(function (s) { [-.25, -.17].forEach(function (y) { seg(m, sx(s * .25), sy(y), sx(s * .17), sy(y + .02), CO.stripe, 1, .032); }); });
    m.restore();
    // Front paws (the white mittens), further apart on a wider belly.
    var pawX = .085 + .17 * G;
    union(m, [[ovalP(-pawX, -.045, .125, .095), CO.cream]]);
    union(m, [[ovalP(pawX, -.045, .125, .095), CO.cream]]);
    // Head (a little tilt with the look), then the bow tie on what neck is left.
    m.save(); m.translate(0, -.52 + headDrop); m.rotate(look * 1.2); catHead(m, blink, look); m.restore();
    if (P.bow) bowTie(m, 0, -.295 + headDrop - .012 * G, 1 - .12 * G, BOWS[P.bow]);
    m.restore();
  }

  // Where Mouse sits and how big, for the picture in use.
  function catPlace() {
    var fit = 1 - .21 * (GIRTH[P.size] || 0);
    if (P.picture === 'mouse') return { feet: { x: LW / 2, y: LH / 2 + LH * .392 }, u: LH * .672 * fit };
    return { feet: { x: OX + H_PIC * .0165, y: OY + SIZE + H_PIC * .033 }, u: H_PIC * .355 * fit };
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

  // One note or coin in the money look in use, at the origin of `m` (ProfilePictureView.piece; the flow's note is 22 x 12).
  // `l` = the machine's lift layer (a note passing over a light hides it), `k` = the money's lift layer, `a` its opacity.
  // LIT: each note's border(s) and dot, each coin's ring; never the fill, the marks or the big bills' stripe.
  function piece(m, l, k, coin, hue, a) {
    var mo = MONEY[P.money] || MONEY.classic, rose = P.money === 'roseGold';
    if (coin) {
      circ(m, 0, 0, 6); fillC(m, rose ? ROSE_NOTE : GOLD, a);
      circ(m, 0, 0, 3.5); strokeC(m, rose ? ROSE_CREAM : WHITE, (rose ? .95 : .55) * a, 1);
      if (l) {
        erase(l, a, function (c) { circ(c, 0, 0, 6); });
        erase(k, a, function (c) { circ(c, 0, 0, 6); });
        circ(k, 0, 0, 3.5); strokeC(k, rose ? ROSE_CREAM : WHITE, (rose ? .95 : .55) * a, 1);
      }
      return;
    }
    var fill = mo.fill || WORLD[hue % WORLD.length], w = mo.w, h = mo.h, x = -w / 2, y = -h / 2;
    rr(m, x, y, w, h, 2.5); fillC(m, fill, a);
    if (l) {
      erase(l, a, function (c) { rr(c, x, y, w, h, 2.5); });
      erase(k, a, function (c) { rr(c, x, y, w, h, 2.5); });
    }
    if (P.money === 'marked') { marks(m, x, y, w, h, a); return; }
    var edge = rose ? ROSE_CREAM : WHITE;
    var ks = l ? [m, k] : [m];
    ks.forEach(function (c) {
      if (rose) { rr(c, x + .6, y + .6, w - 1.2, h - 1.2, 2.2); strokeC(c, edge, .95 * a, 1.2); }
      rr(c, x + 2.5, y + 2.5, w - 5, h - 5, 1.5); strokeC(c, edge, (P.money === 'mint' ? .85 : rose ? .7 : .5) * a, .8);
      circ(c, 0, 0, 2.5); fillC(c, rose ? ROSE_BLUSH : edge, (rose ? .95 : .7) * a);
    });
    if (P.money === 'hundreds') { m.fillStyle = css(WHITE, .45 * a); m.fillRect(x + 4, y, 2.5, h); }
  }
  // MarkedBill.marks: an inner border, the serial struck through in red, a red stamp a little off the square.
  function marks(m, x, y, w, h, a) {
    var k = w / 24;
    rr(m, x + 2.2 * k, y + 2.2 * k, w - 4.4 * k, h - 4.4 * k, 1.4 * k); strokeC(m, BLACK, .28 * a, .7 * k);
    m.fillStyle = css(BLACK, .35 * a); m.fillRect(x + 4 * k, y + 3.6 * k, 7 * k, 1.3 * k);
    m.fillStyle = css(MARK_RED, .78 * a); m.fillRect(x + 3.2 * k, y + 3.3 * k, 8.6 * k, 1.9 * k);
    m.save(); m.translate(x + w - 7.4 * k, y + h / 2 + .6 * k); m.rotate(-14 * DEG);
    var r = 4.1 * k;
    circ(m, 0, 0, r); strokeC(m, MARK_RED, a, 1.5 * k);
    m.beginPath(); m.moveTo(-r * .48, -r * .48); m.lineTo(r * .48, r * .48); m.moveTo(r * .48, -r * .48); m.lineTo(-r * .48, r * .48);
    m.lineCap = 'round'; strokeC(m, MARK_RED, a, 1.3 * k); m.lineCap = 'butt';
    m.restore();
  }

  // Draws the money in front of the machine (the flow).
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
      piece(m, l, k, n.coin, i, a);
      cs.forEach(function (c) { c.restore(); });
    }
  }
  function erase(c, a, path) {
    c.globalCompositeOperation = 'destination-out'; path(c); fillC(c, WHITE, a); c.globalCompositeOperation = 'source-over';
  }

  // Mouse alone: the money goes round instead, each piece on its own ring at its own pace (ProfileMoney.spot), LOW in
  // front of Mouse and HIGH behind. Eleven notes and three coins, as in the app.
  var ORBIT_NOTES = 11, ORBIT_COUNT = 14;
  function unit(x) { var v = Math.sin(x) * 43758.5453; return v - Math.floor(v); }
  var RING = (function () {
    var reach = Math.ceil(Math.hypot(13, 6.5) * 1.06 * KNOTE) + 7, body = LH * .80, cy = LH * .52;
    var rx = Math.min(LW * .45, body * 1.08); rx = Math.max(0, Math.min(rx, (LW / 2 - reach) / 1.22));
    var ry = body * .44; ry = Math.max(0, Math.min(ry, (Math.min(cy, LH - cy) - (reach - 7) * .75 - 6) / 1.22));
    return { cx: LW / 2, cy: cy, rx: rx, ry: ry };
  })();
  function drawOrbit(m, l, k, t, front) {
    for (var i = 0; i < ORBIT_COUNT; i++) {
      var a = unit(i * 12.9898 + 1), b = unit(i * 78.233 + 2), c = unit(i * 37.719 + 3);
      var theta = i / ORBIT_COUNT * 2 * Math.PI + a * 1.7 + t * (2 * Math.PI / 20) * (.65 + .8 * b), s = Math.sin(theta);
      if ((s >= 0) !== front) continue;
      var share = .70 + .52 * a;
      var x = RING.cx + Math.cos(theta) * RING.rx * share + Math.sin(t * (.5 + b) + i * 1.9) * 6;
      var y = RING.cy + s * RING.ry * share + Math.sin(t * (.8 + c * .6) + i * 1.3) * 5;
      var depth = (s + 1) / 2, sc = (.68 + .38 * depth) * KNOTE, tumble = .5 + .5 * Math.abs(Math.cos(t * (.9 + b) + i * 2.3));
      var ang = (Math.sin(t * (.6 + .6 * a) + i) * 32 - Math.cos(theta) * 22) * DEG;
      var cs = [m]; if (l) cs.push(l, k);
      cs.forEach(function (q) { q.save(); q.translate(x, y); q.rotate(ang); q.scale(sc, sc * tumble); });
      piece(m, l, k, i >= ORBIT_NOTES, i, .5 + .5 * depth);
      cs.forEach(function (q) { q.restore(); });
    }
  }

  // ---- one frame ------------------------------------------------------------------------------------------------
  var hdr = null;                                    // set when the HDR layer is up (see below)
  var tmp = null;                                    // debug outlines
  function setBase(c) { c.setTransform(W / LW, 0, 0, H / LH, 0, 0); }

  function frame(t, live) {
    [main, lm, lk].forEach(function (c) { c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W, H); setBase(c); });
    var l = hdr ? lm : null, k = hdr ? lk : null;
    var place = P.picture === 'washer' ? null : catPlace();
    if (P.picture === 'mouse') {
      var ot = live ? t : 5;                         // Reduce Motion: the app's still moment (ProfilePictureView: t = 5)
      drawOrbit(main, l, k, ot, false);              // behind Mouse
      cat(place, t, live, l, k);
      drawOrbit(main, l, k, ot, true);               // in front
    } else {
      [main].concat(l ? [l] : []).forEach(function (c) { c.save(); c.translate(OX, OY); });
      drawMachine(main, l, t, live);
      [main].concat(l ? [l] : []).forEach(function (c) { c.restore(); });
      if (place) cat(place, t, live, l, k);          // Mouse: in front of the machine, under the money, never lifted
      drawMoney(main, l, k);
    }
    if (hdr) {
      try { hdr.draw(t); } catch (e) { var h = hdr; hdr = null; h.off(); info.approach = 'plain 2D canvas (HDR layer failed: ' + (e && e.message || e) + ')'; report(); return; }
      if (DEBUG) outline();
    }
  }
  // Mouse on the ordinary canvas; with HDR, the same shape is cut out of both lift layers so nothing behind Mouse
  // (a light, a note going round behind) shines through it.
  function cat(place, t, live, l, k) {
    drawCat(main, t, live, place.feet, place.u);
    if (l) [l, k].forEach(function (c) { c.save(); c.globalCompositeOperation = 'destination-out'; drawCat(c, t, live, place.feet, place.u); c.restore(); });
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
      'picture: ' + JSON.stringify(P),
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

  // ---- someone's own look ------------------------------------------------------------------------------------------
  // card.js hands over the public card (`GET /v1/referrals/profiles/<name>`: `card`, plus the service's own founder and
  // invite numbers). It is someone else's data, so every field is only ever a KEY into the fixed tables above: a word
  // that is not in a table is today's default for that part, anything that is not a string, a boolean or a small whole
  // number is ignored, and nothing from it is put into the page (the label below is built from the tables' own words).
  // The picture switches in place: same canvas, same size, nothing on the page moves.
  function has(table, v) { return typeof v === 'string' && v.length <= 24 && Object.prototype.hasOwnProperty.call(table, v); }
  function whole(v, lo, hi) { return typeof v === 'number' && Math.floor(v) === v && v >= lo && v <= hi ? v : null; }
  function fromCard(card, founder, invite) {
    var p = { picture: 'washer', skin: 'classic', plate: '', money: 'classic', coat: 'torbie', bow: null, hat: null, size: 0 };
    if (!card || typeof card !== 'object' || Array.isArray(card)) return DEFAULT;
    // ProfilePicture.visitorChoice: Mouse, or the two together, only if the card says so; anything else is the washer.
    if (card.picture === 'mouse' || card.picture === 'both' || card.picture === 'washer') p.picture = card.picture;
    if (has(SKINS, card.washer)) p.skin = card.washer;
    if (has(MONEY, card.money)) p.money = card.money;
    if (has(COATS, card.coat)) p.coat = card.coat;
    // The bow tie: on when the card names a colour (an unknown word: red, as the app reads it); a hat when `hat` is true
    // (an unknown style: the top hat, as MouseLook.hatWorn reads it).
    if (typeof card.bow === 'string' && card.bow.length <= 24) p.bow = has(BOWS, card.bow) ? card.bow : 'red';
    if (card.hat === true) p.hat = has(HAT_NAMES, card.hat_style) ? card.hat_style : 'top';
    p.size = whole(card.size, 0, 4) || 0;
    var n = SKINS[p.skin].plate === 'founder' ? whole(founder, 1, 99999) : SKINS[p.skin].plate === 'invite' ? whole(invite, 1, 99999) : null;
    p.plate = n ? String(n) : '';
    return p;
  }
  function label(p) {
    var mouse = 'a ' + COAT_NAMES[p.coat] + ' cat' + (p.bow ? ' in a bow tie' : '') + (p.hat ? ', wearing a ' + HAT_NAMES[p.hat] : '');
    var washer = 'A ' + SKIN_NAMES[p.skin] + ' with ' + MONEY_NAMES[p.money] + ' flying in';
    if (p.picture === 'mouse') return 'Mouse, ' + mouse + ', with ' + MONEY_NAMES[p.money] + ' going round';
    return p.picture === 'both' ? washer + ', and Mouse beside it, ' + mouse : washer;
  }
  window.MLPicture = {
    show: function (card, founder, invite) {
      var p;
      try { p = fromCard(card, founder, invite); } catch (e) { return; }
      var was = [P, W_, CO];
      P = p; W_ = SKINS[p.skin]; CO = COATS[p.coat];
      // Drawn once off screen first: should anything in it ever fail, the picture stays as it was.
      try { var t0 = layer().getContext('2d'); t0.setTransform(W / LW, 0, 0, H / LH, 0, 0); if (p.picture !== 'washer') drawCat(t0, 0, false, catPlace().feet, catPlace().u); }
      catch (e) { P = was[0]; W_ = was[1]; CO = was[2]; return; }
      canvas.setAttribute('aria-label', label(p));
      report();
      if (STILL || !running) frame(0, !STILL);       // a still or hidden page gets the new picture at once
    }
  };
})();
