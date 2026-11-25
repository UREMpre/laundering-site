// Art for the Cover Flow cards (flow.js): a made-up logo per shop, and a made-up dark map behind each card, drawn
// procedurally from the shop's name (nothing fetched). Every shop, street and mark here is invented: no real brand.
// window.FlowArt.logo(shop) -> inline SVG string or null; window.FlowArt.map(shop, pinHex, c1, c2) -> CSS url(...).
(function () {
  "use strict";

  var O = "#1b1726"; // outline ink
  function wrap(id, bg, body) {
    return '<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><defs>' +
      '<linearGradient id="' + id + 'Bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/>' +
      '<stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient></defs>' +
      '<rect width="100" height="100" fill="' + bg + '"/><rect width="100" height="100" fill="url(#' + id + 'Bg)"/>' + body + "</svg>";
  }
  var S = ' stroke="' + O + '" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';

  var LOGOS = {
    // A noodle bowl on the move: chopsticks up, speed lines behind.
    "Noodle Courier": wrap("nc", "#E2483C",
      '<g stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"><path d="M5 57h13M9 66h11M5 75h13"/></g>' +
      '<g stroke-linecap="round"><path d="M46 52 80 13M54 52 88 21" stroke="' + O + '" stroke-width="7"/>' +
      '<path d="M46 52 80 13M54 52 88 21" stroke="#D9965A" stroke-width="3.4"/></g>' +
      '<path d="M32 53c2-9 8-9 10 0s8 9 10 0 8-9 10 0 8 9 10 0" fill="none" stroke="' + O + '" stroke-width="8" stroke-linecap="round"/>' +
      '<path d="M32 53c2-9 8-9 10 0s8 9 10 0 8-9 10 0 8 9 10 0" fill="none" stroke="#FFD86E" stroke-width="4.5" stroke-linecap="round"/>' +
      '<rect x="44" y="79" width="24" height="7" rx="2.5" fill="#fff"' + S + '/>' +
      '<path d="M24 53h64c0 17-14 29-32 29S24 70 24 53z" fill="#fff"' + S + '/>' +
      '<path d="M29 64h54" stroke="#E2483C" stroke-width="4.5"/><path d="M24 53h64" fill="none"' + S + '/>'),

    // A potato in a sweatband, lifting a tiny dumbbell.
    "Couch Potato Gym": wrap("cp", "#27A596",
      '<path d="M22 20h56" stroke="' + O + '" stroke-width="4.5" stroke-linecap="round"/>' +
      '<rect x="14" y="10" width="10" height="20" rx="3" fill="#3B4250"' + S + '/><rect x="76" y="10" width="10" height="20" rx="3" fill="#3B4250"' + S + '/>' +
      '<path d="M37 50Q30 35 34 21M63 50Q70 35 66 21" fill="none" stroke="' + O + '" stroke-width="4.5" stroke-linecap="round"/>' +
      '<circle cx="34" cy="21" r="4.5" fill="#C98B4E"' + S + '/><circle cx="66" cy="21" r="4.5" fill="#C98B4E"' + S + '/>' +
      '<ellipse cx="41" cy="89" rx="7" ry="3.5" fill="' + O + '"/><ellipse cx="59" cy="89" rx="7" ry="3.5" fill="' + O + '"/>' +
      '<clipPath id="cpC"><path d="M50 35c16 0 24 13 24 29s-9 24-24 24-24-8-24-24 8-29 24-29z"/></clipPath>' +
      '<path d="M50 35c16 0 24 13 24 29s-9 24-24 24-24-8-24-24 8-29 24-29z" fill="#C98B4E"/>' +
      '<g clip-path="url(#cpC)"><path d="M20 50c18-7 42-7 60 0" fill="none" stroke="#F2F2F2" stroke-width="7"/>' +
      '<path d="M20 50c18-7 42-7 60 0" fill="none" stroke="#E2483C" stroke-width="3"/>' +
      '<ellipse cx="38" cy="76" rx="2.6" ry="1.8" fill="#A16A36"/><ellipse cx="64" cy="68" rx="2.2" ry="1.6" fill="#A16A36"/>' +
      '<ellipse cx="58" cy="81" rx="2" ry="1.4" fill="#A16A36"/><path d="M60 37c8 2 13 8 14 18" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="4" stroke-linecap="round"/></g>' +
      '<path d="M50 35c16 0 24 13 24 29s-9 24-24 24-24-8-24-24 8-29 24-29z" fill="none"' + S + '/>' +
      '<circle cx="43.5" cy="60" r="2.6" fill="' + O + '"/><circle cx="56.5" cy="60" r="2.6" fill="' + O + '"/>' +
      '<path d="M44 68q6 5 12 0" fill="none" stroke="' + O + '" stroke-width="2.6" stroke-linecap="round"/>' +
      '<path d="M80 38c-3 4-3 7 0 7s3-3 0-7z" fill="#8FD8FF" stroke="' + O + '" stroke-width="1.8"/>'),

    // A shopping cart whose basket is a mouse pointer, mid-click.
    "Clickety Mart": wrap("cm", "#2DB565",
      '<g stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".85"><path d="M47 8l-3 6M56 14l-6 3M24 6l3 6"/></g>' +
      '<path d="M16 20h18" stroke="' + O + '" stroke-width="5" stroke-linecap="round"/>' +
      '<path d="M34 66l4 13h32" fill="none" stroke="' + O + '" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '<clipPath id="cmC"><path d="M34 18v49l12-11 8 19 9-4-8-19h17z"/></clipPath>' +
      '<path d="M34 18v49l12-11 8 19 9-4-8-19h17z" fill="#fff"/>' +
      '<g clip-path="url(#cmC)" stroke="#2DB565" stroke-width="2" opacity=".55"><path d="M30 32h40M30 44h40M42 14v60M52 14v60"/></g>' +
      '<path d="M34 18v49l12-11 8 19 9-4-8-19h17z" fill="none"' + S + ' stroke-width="3.5"/>' +
      '<circle cx="43" cy="86" r="6" fill="' + O + '"/><circle cx="43" cy="86" r="2" fill="#fff"/>' +
      '<circle cx="66" cy="86" r="6" fill="' + O + '"/><circle cx="66" cy="86" r="2" fill="#fff"/>'),

    // A waffle with a bite out of it that leaves a crescent moon, on a night sky.
    "Midnight Waffle Co": wrap("mw", "#1F2A5E",
      '<g fill="#fff"><circle cx="14" cy="16" r="1.6"/><circle cx="86" cy="12" r="1.2"/><circle cx="90" cy="60" r="1.6"/>' +
      '<circle cx="10" cy="78" r="1.2"/><path d="M80 82l1.5 3.5 3.5 1.5-3.5 1.5-1.5 3.5-1.5-3.5-3.5-1.5 3.5-1.5z"/>' +
      '<path d="M24 34l1.2 2.8 2.8 1.2-2.8 1.2-1.2 2.8-1.2-2.8-2.8-1.2 2.8-1.2z"/></g>' +
      '<mask id="mwM"><rect width="100" height="100" fill="#fff"/><circle cx="71" cy="36" r="25" fill="#000"/></mask>' +
      '<clipPath id="mwC"><circle cx="50" cy="55" r="33"/></clipPath>' +
      '<g mask="url(#mwM)"><circle cx="50" cy="55" r="33" fill="#E9A63A"/>' +
      '<g clip-path="url(#mwC)" stroke="#B9701F" stroke-width="4.5"><path d="M16 33h70M16 44h70M16 55h70M16 66h70M16 77h70M28 20v72M39 20v72M50 20v72M61 20v72M72 20v72"/></g>' +
      '<circle cx="50" cy="55" r="33" fill="none"' + S + '/>' +
      '<g clip-path="url(#mwC)"><circle cx="71" cy="36" r="25" fill="none"' + S + '/></g>' +
      '<rect x="31" y="55" width="13" height="10" rx="2.5" fill="#FFE68E" transform="rotate(-12 37 60)"' + S + ' stroke-width="2.2"/>' +
      '<path d="M18 62c0 8 0 14 3 14s3-6 3-12" fill="#8A3F12" stroke="' + O + '" stroke-width="2.2"/></g>'),

    // A parcel dropped on a doormat.
    "Porch Drop": wrap("pd", "#D45A44",
      '<g stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".8"><path d="M36 9v9M50 5v11M64 9v9"/></g>' +
      '<g stroke="' + O + '" stroke-width="2.5" stroke-linecap="round"><path d="M22 89v5M30 89v5M38 89v5M46 89v5M54 89v5M62 89v5M70 89v5M78 89v5"/></g>' +
      '<rect x="15" y="76" width="70" height="14" rx="3" fill="#6E4A2C"' + S + '/>' +
      '<path d="M22 83h56" stroke="#9A6C43" stroke-width="2" stroke-dasharray="4 3"/>' +
      '<path d="M8 78l5-3M92 78l-5-3" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>' +
      '<path d="M25 42h50v34H25z" fill="#D9A066"' + S + '/>' +
      '<path d="M25 42l7-11h36l7 11z" fill="#EAB97F"' + S + '/>' +
      '<path d="M50 31v45" stroke="#F4E6C8" stroke-width="7"/><path d="M50 31v45" fill="none" stroke="' + O + '" stroke-width="1" opacity=".3"/>' +
      '<rect x="57" y="58" width="13" height="9" rx="1.5" fill="#fff" stroke="' + O + '" stroke-width="2"/>' +
      '<path d="M59.5 61h8M59.5 64h5" stroke="' + O + '" stroke-width="1.3"/>' +
      '<path d="M25 42h50v34H25z" fill="none"' + S + '/>'),

    // A heap of play buttons.
    "Streamheap": wrap("sh", "#4B2C80", (function () {
      var t = [[12, 66, "#FF5C8A", -4], [37, 67, "#FFC94A", 2], [62, 66, "#4FD1C5", 5], [24, 45, "#7CB8FF", -3], [50, 45, "#FF8A4C", 4], [37, 24, "#B88CFF", -6]];
      return '<ellipse cx="50" cy="90" rx="40" ry="4" fill="#000" opacity=".2"/>' + t.map(function (a) {
        var x = a[0], y = a[1];
        return '<g transform="rotate(' + a[3] + " " + (x + 13) + " " + (y + 10) + ')"><rect x="' + x + '" y="' + y + '" width="26" height="20" rx="5" fill="' + a[2] + '"' + S + '/>' +
          '<path d="M' + (x + 10) + " " + (y + 5) + "l8.5 5-8.5 5z" + '" fill="#fff" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></g>';
      }).join("");
    })()),

    // A mug with a washing-machine door, steaming in a spin cycle.
    "Spin Cycle Coffee": wrap("sc", "#1E6C66",
      '<path d="M46 38c-9-3-8-15 1-15s11 9 5 13-11-1-7-6" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".9"/>' +
      '<path d="M66 52c13 0 13 23 0 23" fill="none" stroke="' + O + '" stroke-width="11" stroke-linecap="round"/>' +
      '<path d="M66 52c13 0 13 23 0 23" fill="none" stroke="#F6EFE4" stroke-width="4.5" stroke-linecap="round"/>' +
      '<rect x="22" y="42" width="48" height="44" rx="9" fill="#F6EFE4"' + S + '/>' +
      '<path d="M22 51h48" stroke="' + O + '" stroke-width="2"/><circle cx="29" cy="46.5" r="1.8" fill="' + O + '"/><circle cx="35" cy="46.5" r="1.8" fill="' + O + '"/>' +
      '<rect x="56" y="45" width="9" height="3" rx="1.5" fill="#7FD1C7"/>' +
      '<circle cx="46" cy="68" r="14" fill="#AEB5C1" stroke="' + O + '" stroke-width="2.5"/><circle cx="46" cy="68" r="10" fill="#5A3420"/>' +
      '<path d="M46 68c0-3 4-3 4 0s-4 6-7 3-1-9 5-8" fill="none" stroke="#D29A62" stroke-width="2" stroke-linecap="round"/>' +
      '<path d="M39 63a8 8 0 0 1 5-3" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
      '<ellipse cx="46" cy="90" rx="28" ry="3" fill="#000" opacity=".2"/>'),

    // A turnip that is also a little house, its leaves growing out of the chimney.
    "Turnip Town Grocery": wrap("tt", "#46A15B",
      '<path d="M64 24c-6-8-4-16 2-18 2 7 0 13-2 18zM64 24c2-9 9-14 15-12-3 7-9 11-15 12zM64 24c-6-4-14-3-17 1 6 4 12 3 17-1z" fill="#7ED37F"' + S + ' stroke-width="2.4"/>' +
      '<clipPath id="ttC"><path d="M50 38c18 0 27 14 25 28-2 13-14 19-25 26-11-7-23-13-25-26-2-14 7-28 25-28z"/></clipPath>' +
      '<path d="M50 38c18 0 27 14 25 28-2 13-14 19-25 26-11-7-23-13-25-26-2-14 7-28 25-28z" fill="#F6F1F8"/>' +
      '<g clip-path="url(#ttC)"><path d="M20 30h60v28c-14 6-46 6-60 0z" fill="#9C4FBA"/><path d="M64 46c6 4 9 11 8 18" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="4" stroke-linecap="round"/></g>' +
      '<path d="M50 38c18 0 27 14 25 28-2 13-14 19-25 26-11-7-23-13-25-26-2-14 7-28 25-28z" fill="none"' + S + '/>' +
      '<path d="M50 92q3 5-1 8" fill="none" stroke="' + O + '" stroke-width="2.5" stroke-linecap="round"/>' +
      '<rect x="60" y="22" width="9" height="16" fill="#D9493B"' + S + ' stroke-width="2.6"/>' +
      '<path d="M18 48 50 22l32 26z" fill="#D9493B"' + S + '/><path d="M26 44h48" stroke="#A9342A" stroke-width="2"/>' +
      '<path d="M45 86V75a5 5 0 0 1 10 0v11" fill="#6B3E2A" stroke="' + O + '" stroke-width="2.4"/>' +
      '<rect x="57" y="60" width="9" height="9" rx="1.5" fill="#FFD66B" stroke="' + O + '" stroke-width="2.2"/>' +
      '<rect x="33" y="60" width="9" height="9" rx="1.5" fill="#FFD66B" stroke="' + O + '" stroke-width="2.2"/>'),

    // A cave mouth with a glowing chip inside.
    "Gadget Grotto": wrap("gg", "#22303F",
      '<radialGradient id="ggG"><stop offset="0" stop-color="#5FFFF0" stop-opacity=".85"/><stop offset="1" stop-color="#5FFFF0" stop-opacity="0"/></radialGradient>' +
      '<path d="M6 94C8 50 27 20 50 20s42 30 44 74z" fill="#6F7786"' + S + '/>' +
      '<path d="M22 34c4-4 8-6 12-7M70 30c4 3 7 7 9 11M14 70c1-6 2-10 4-14M84 62c1 4 2 8 2 12" fill="none" stroke="#9AA2B0" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="M23 94c2-30 14-48 27-48s25 18 27 48z" fill="#0D131B"' + S + '/>' +
      '<path d="M36 55l3 8 3-11zM55 49l3 9 3-6z" fill="#6F7786" stroke="' + O + '" stroke-width="2"/>' +
      '<circle cx="50" cy="76" r="24" fill="url(#ggG)"/>' +
      '<g stroke="#2BE3D0" stroke-width="2.4" stroke-linecap="round"><path d="M44 63v-4M50 63v-4M56 63v-4M44 89v-4M50 89v-4M56 89v-4M37 70h-4M37 76h-4M37 82h-4M63 70h4M63 76h4M63 82h4"/></g>' +
      '<rect x="37" y="63" width="26" height="22" rx="3.5" fill="#20C9B8" stroke="#0D131B" stroke-width="2"/>' +
      '<rect x="44" y="69" width="12" height="10" rx="1.5" fill="#0D6F66"/><path d="M46 74h8" stroke="#7FFFF2" stroke-width="1.6"/>'),

    // A fuel nozzle dripping into a bag of chips.
    "Gas-n-Snack": wrap("gs", "#F2B52F",
      '<path d="M100 8C86 2 80 16 74 18" fill="none" stroke="' + O + '" stroke-width="7" stroke-linecap="round"/>' +
      '<g transform="rotate(-35 66 22)"><rect x="46" y="18.5" width="15" height="6.5" rx="2" fill="#A9B1BF"' + S + ' stroke-width="2.6"/>' +
      '<rect x="58" y="15" width="23" height="13" rx="3.5" fill="#4D5462"' + S + '/>' +
      '<path d="M64 28c0 6 4 8 9 8" fill="none" stroke="' + O + '" stroke-width="3" stroke-linecap="round"/></g>' +
      '<path d="M48 36c-3 4-4 7-1 7.5s3-3.5 1-7.5z" fill="#FF7A1A" stroke="' + O + '" stroke-width="2"/>' +
      '<path d="M28 50l4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 4-4 4 4 2 41H26z" fill="#E2483C"' + S + '/>' +
      '<path d="M30 56h40" stroke="#B5332A" stroke-width="2.5"/>' +
      '<ellipse cx="50" cy="73" rx="15" ry="11" fill="#FFD86E" stroke="' + O + '" stroke-width="2.4"/>' +
      '<path d="M42 76c2-8 12-10 16-5-3 1-4 5-8 6s-6 0-8-1z" fill="#F29A2E" stroke="' + O + '" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<path d="M66 60l2 26" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".35"/>')
  };

  // ---- maps ----
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function rng(seed) {
    return function () {
      seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var STREETS = ["Lint Ave", "Rinse Rd", "Tumble Dr", "Hamper Ln", "Starch St", "Bleach Blvd", "Spin Way", "Fold St", "Collar Ave",
                 "Pocket Rd", "Button St", "Sock Ln", "Cuff Ct", "Pleat Pkwy", "Hem St", "Wringer Rd", "Gingham Ave", "Bobbin Way"];
  var C = { street: "#41454d", block: "#23252a", bldg: "#2c2f36", main: "#6a6e78", casing: "#1a1b1f",
            park: "#1f3a2b", parkPath: "#2a4a37", water: "#182c44", label: "#a7abb3" };
  var W = 360, H = 461, CX = 180, CY = 230, PX = 180, PY = 205, R = 340;

  function f(n) { return Math.round(n * 10) / 10; }
  function hex(n) { return "#" + ("00000" + n.toString(16)).slice(-6); }

  function map(seedStr, pinHex, c1, c2) {
    var r = rng(hash(seedStr));
    var ang = (r() * 2 - 1) * 20, rad = ang * Math.PI / 180, cs = Math.cos(rad), sn = Math.sin(rad);
    // grid frame -> screen: rotate about (CX, CY)
    function toScreen(x, y) { return [CX + x * cs - y * sn, CY + x * sn + y * cs]; }
    var pr = [(PX - CX) * cs + (PY - CY) * sn, -(PX - CX) * sn + (PY - CY) * cs];
    function lines(lo, hi) { var a = [], v = -R - r() * 20; while (v < R) { a.push(v); v += lo + r() * (hi - lo); } a.push(v); return a; }
    var xs = lines(30, 62), ys = lines(26, 46);
    function near(a, v) { var b = 0; for (var i = 1; i < a.length; i++) if (Math.abs(a[i] - v) < Math.abs(a[b] - v)) b = i; return b; }
    // main roads: one each way passing near the place, and one more further off
    var mx = [near(xs, pr[0] + (r() < 0.5 ? -1 : 1) * (20 + r() * 40))];
    var my = [near(ys, pr[1] + (r() < 0.5 ? -1 : 1) * (15 + r() * 35)), near(ys, pr[1] + 150 + r() * 60)];
    if (r() < 0.6) mx.push(near(xs, pr[0] + (r() < 0.5 ? -1 : 1) * (130 + r() * 50)));
    function isMain(arr, i) { return arr.indexOf(i) >= 0; }

    var out = ['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + " " + H + '" preserveAspectRatio="xMidYMid slice">',
      '<rect width="' + W + '" height="' + H + '" fill="' + C.street + '"/>',
      '<g transform="translate(' + CX + " " + CY + ") rotate(" + f(ang) + ')">'];

    // a park: a block or two, never under the place
    var pi = 1 + Math.floor(r() * (xs.length - 3)), pj = 1 + Math.floor(r() * (ys.length - 3)), tries = 0;
    function parkHits(i, j) { return pr[0] > xs[i] - 10 && pr[0] < xs[i + 2] + 10 && pr[1] > ys[j] - 10 && pr[1] < ys[j + 1] + 10; }
    function parkSeen(i, j) { var s = toScreen((xs[i] + xs[i + 2]) / 2, (ys[j] + ys[j + 1]) / 2); return s[0] > 0 && s[0] < W && s[1] > 20 && s[1] < 300; }
    while ((parkHits(pi, pj) || !parkSeen(pi, pj)) && tries++ < 40) { pi = 1 + Math.floor(r() * (xs.length - 3)); pj = 1 + Math.floor(r() * (ys.length - 3)); }

    for (var i = 0; i < xs.length - 1; i++) {
      for (var j = 0; j < ys.length - 1; j++) {
        var s = toScreen((xs[i] + xs[i + 1]) / 2, (ys[j] + ys[j + 1]) / 2);
        if (s[0] < -70 || s[0] > W + 70 || s[1] < -70 || s[1] > H + 70) continue;
        var gl = isMain(mx, i) ? 4.5 : 2.2, gr = isMain(mx, i + 1) ? 4.5 : 2.2, gt = isMain(my, j) ? 4.5 : 2.2, gb = isMain(my, j + 1) ? 4.5 : 2.2;
        var x0 = xs[i] + gl, y0 = ys[j] + gt, w = xs[i + 1] - gr - x0, h = ys[j + 1] - gb - y0;
        var inPark = (i === pi || i === pi + 1) && j === pj;
        if (inPark) continue;
        out.push('<rect x="' + f(x0) + '" y="' + f(y0) + '" width="' + f(w) + '" height="' + f(h) + '" rx="1.5" fill="' + C.block + '"/>');
        // a few building footprints
        var k = Math.floor(r() * 3);
        for (var b = 0; b < k; b++) {
          var bw = 6 + r() * (w * 0.4), bh = 5 + r() * (h * 0.4);
          var bx = x0 + 2 + r() * Math.max(0, w - bw - 4), by = y0 + 2 + r() * Math.max(0, h - bh - 4);
          out.push('<rect x="' + f(bx) + '" y="' + f(by) + '" width="' + f(bw) + '" height="' + f(bh) + '" fill="' + C.bldg + '"/>');
        }
      }
    }
    var px0 = xs[pi] + 2.2, py0 = ys[pj] + 2.2, pw = xs[pi + 2] - 2.2 - px0, ph = ys[pj + 1] - 2.2 - py0;
    out.push('<rect x="' + f(px0) + '" y="' + f(py0) + '" width="' + f(pw) + '" height="' + f(ph) + '" rx="3" fill="' + C.park + '"/>');
    out.push('<path d="M' + f(px0 + 4) + " " + f(py0 + ph * 0.7) + "C" + f(px0 + pw * 0.3) + " " + f(py0 + ph * 0.2) + " " + f(px0 + pw * 0.6) + " " +
             f(py0 + ph * 0.9) + " " + f(px0 + pw - 4) + " " + f(py0 + ph * 0.35) + '" fill="none" stroke="' + C.parkPath + '" stroke-width="1.6"/>');
    out.push('<circle cx="' + f(px0 + pw * 0.3) + '" cy="' + f(py0 + ph * 0.35) + '" r="' + f(Math.min(pw, ph) * 0.16) + '" fill="' + C.parkPath + '"/>');
    out.push("</g>");

    // water, in screen space, kept clear of the place
    var kind = r(), wpath = "";
    if (kind < 0.42) {
      var top = r() < 0.5, ya = top ? 20 + r() * 60 : 330 + r() * 100, yb = top ? 30 + r() * 70 : 320 + r() * 110;
      wpath = '<path d="M-20 ' + f(ya) + "C" + f(90 + r() * 40) + " " + f(ya + (r() * 2 - 1) * 60) + " " + f(230 + r() * 40) + " " + f(yb + (r() * 2 - 1) * 60) + " 380 " + f(yb) +
              '" fill="none" stroke="' + C.water + '" stroke-width="' + f(24 + r() * 16) + '"/>';
    } else if (kind < 0.8) {
      var left = r() < 0.5, a = 25 + r() * 60, bb = 25 + r() * 70, m = 40 + r() * 50;
      var X = function (v) { return left ? v : W - v; };
      wpath = '<path d="M' + X(-10) + " -10L" + f(X(a)) + " -10C" + f(X(a + 30)) + " 120 " + f(X(m - 30)) + " 200 " + f(X(m)) + " 270S" + f(X(bb + 30)) + " 400 " + f(X(bb)) +
              " " + (H + 10) + "L" + X(-10) + " " + (H + 10) + 'Z" fill="' + C.water + '"/>';
    } else {
      var lx = r() < 0.5 ? 40 + r() * 30 : W - 40 - r() * 30, ly = r() < 0.5 ? 50 + r() * 50 : 360 + r() * 60;
      wpath = '<ellipse cx="' + f(lx) + '" cy="' + f(ly) + '" rx="' + f(36 + r() * 24) + '" ry="' + f(24 + r() * 16) + '" transform="rotate(' + f(r() * 40 - 20) + " " + f(lx) + " " + f(ly) + ')" fill="' + C.water + '"/>';
    }
    out.push(wpath);

    // main roads over the water (bridges), with labels
    out.push('<g transform="translate(' + CX + " " + CY + ") rotate(" + f(ang) + ')">');
    var roads = [];
    mx.forEach(function (i) { roads.push("M" + f(xs[i]) + " " + -R + "V" + R); });
    my.forEach(function (j) { roads.push("M" + -R + " " + f(ys[j]) + "H" + R); });
    if (r() < 0.5) { var d0 = (r() * 2 - 1) * 120; roads.push("M" + -R + " " + f(d0 - R * 0.6) + "L" + R + " " + f(d0 + R * 0.6)); }
    out.push('<path d="' + roads.join("") + '" fill="none" stroke="' + C.casing + '" stroke-width="10"/>');
    out.push('<path d="' + roads.join("") + '" fill="none" stroke="' + C.main + '" stroke-width="7"/>');

    var names = STREETS.slice(), used = 0;
    function pick() { var k = Math.floor(r() * (names.length - used)); var n = names[k]; names[k] = names[names.length - 1 - used]; used++; return n.toUpperCase(); }
    function label(x, y, rot, size, op) {
      out.push('<text x="' + f(x) + '" y="' + f(y) + '" transform="rotate(' + rot + " " + f(x) + " " + f(y) + ')" font-family="Helvetica, Arial, sans-serif" font-size="' + size +
               '" font-weight="600" letter-spacing="1.2" fill="' + C.label + '" fill-opacity="' + op + '" text-anchor="middle" dominant-baseline="central">' + pick() + "</text>");
    }
    var side = r() < 0.5 ? -1 : 1;
    label(pr[0] + side * (95 + r() * 30), ys[my[0]], 0, 8.5, 0.75);
    label(xs[mx[0]], pr[1] + 48 + r() * 16, -90, 8.5, 0.75);
    // two minor streets, fainter
    for (var q = 0; q < 2; q++) {
      var jj = near(ys, pr[1] - 60 - q * 80 - r() * 20);
      if (!isMain(my, jj)) label(pr[0] + (q ? -1 : 1) * (60 + r() * 60), ys[jj], 0, 6.5, 0.5);
    }
    out.push("</g>");

    // the app's 18% shade, then a wash of the category colour so the carousel keeps its colours
    out.push('<rect width="' + W + '" height="' + H + '" fill="#000" fill-opacity=".18"/>');
    out.push('<linearGradient id="t" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient>');
    out.push('<rect width="' + W + '" height="' + H + '" fill="url(#t)" fill-opacity=".28"/>');
    // the place: the app's soft dot (PlaceSnapshots: system red, white ring)
    var pc = pinHex == null ? "#ff453a" : hex(pinHex);
    out.push('<circle cx="' + PX + '" cy="' + PY + '" r="22" fill="' + pc + '" fill-opacity=".3"/>' +
             '<circle cx="' + PX + '" cy="' + PY + '" r="7" fill="' + pc + '" stroke="#fff" stroke-width="2.5"/>');
    out.push("</svg>");
    return 'url("data:image/svg+xml;charset=utf-8,' + encodeURIComponent(out.join("")) + '")';
  }

  window.FlowArt = {
    logo: function (shop) { return LOGOS[shop] || null; },
    map: map,
    shops: Object.keys(LOGOS)
  };
})();
