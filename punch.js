/* punch.js: "Do it for the cat." on the link pages (u.html, r.html), wiped in with a lit leading edge.
 *
 * Everywhere: the line is ordinary text, and its wipe and shine are CSS (the pages' stylesheet: cat-in, cat-shine).
 * Where the screen and the browser have the range ((dynamic-range: high) and WebGPU's extended tone mapping), this file
 * takes the wipe over: the text stays ordinary text, and a float canvas laid over it draws ONLY the lit stretch behind the
 * moving edge, above white: brightest at the edge and back to the ink a third of the line behind it, as the app's rings
 * do (Ledger/Views/WasherRingsHero.swift, RingHead). The text itself is never hidden for the canvas's sake, so if the
 * canvas draws nothing the line is still there. Any failure goes back to the CSS version.
 *
 * No library, no network request, no storage. Switches as in washer.js: ?hdr=off, ?hdr=force, ?hdr=debug; and ?hdr=hold.
 */
(function () {
  'use strict';
  var el = document.getElementById('punch');
  if (!el || !window.matchMedia) return;

  var flags = (/[?&]hdr=([^&#]*)/.exec(location.search) || [0, ''])[1].split(',');
  var OFF = flags.indexOf('off') >= 0, FORCE = flags.indexOf('force') >= 0, DEBUG = flags.indexOf('debug') >= 0;
  var HOLD = flags.indexOf('hold') >= 0;             // ?hdr=hold keeps the edge part-way along the line, for a look at it
  var said = null;
  function note(s) {                                  // ?hdr=debug: one line under the punch line saying which version is up
    if (!DEBUG) return;
    if (!said) { said = document.createElement('pre'); said.id = 'punch-debug'; said.style.cssText = 'font:11px/1.35 ui-monospace,Menlo,monospace;text-align:left;white-space:pre-wrap;margin:.4rem 0;color:#c026d3;overflow-wrap:anywhere'; el.parentNode.parentNode.insertBefore(said, el.parentNode.nextSibling); }
    said.textContent = 'punch line: ' + s;
  }

  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { note('reduced motion: plain text'); return; }
  var range = matchMedia('(dynamic-range: high)');
  if (OFF) { note('?hdr=off: the CSS wipe'); return; }
  if (!navigator.gpu) { note('no navigator.gpu: the CSS wipe'); return; }
  if (!range.matches && !FORCE) { note('(dynamic-range: high) is false: the CSS wipe'); return; }

  // The numbers.
  var GAIN = 2.4;                // the edge at its brightest: this many times the ink, in encoded values (the browser clips at what the screen has)
  var HOT = 0.85;                // and this far towards white
  var REACH = 0.33;              // the lit stretch: back to the ink this share of the line behind the edge
  var LEAN = 0.08;               // the edge leans forward by this share of the line's length
  var IN_AT = 0.5, IN_FOR = 1.6; // the wipe in: when it starts (seconds after this file runs, as the stylesheet's does) and how long until the light has left
  var SHINE_EVERY = 6, SHINE_FOR = 1.5, SHINE = 0.6;   // afterwards a softer pass: how often, how long, and how much of the edge's lift
  var PAD = 6;                   // the canvas is this much larger than the text all round (the stylesheet offsets it by the same)

  var T0 = performance.now() / 1000;                 // the clock starts when this file runs, not when the page was asked for: a slow load still gets its wipe
  var dpr = Math.min(3, window.devicePixelRatio || 1);
  var src = document.createElement('canvas');        // the line drawn as a shape (white where the letters are)
  var gpu = document.createElement('canvas');        // the float canvas laid over the text
  var cw = 0, ch = 0, boxH = 0;

  // Draws the line into `src` exactly where the page's own text is: same font, and the baseline the page itself laid out.
  function drawText() {
    var cs = getComputedStyle(el), box = el.getBoundingClientRect();
    var probe = document.createElement('span');     // a zero-size box sits on the baseline, so its bottom edge is the baseline
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline';
    el.insertBefore(probe, el.firstChild);
    var base = probe.getBoundingClientRect().bottom - box.top;
    el.removeChild(probe);
    boxH = box.height;
    cw = Math.ceil(box.width) + PAD * 2; ch = Math.ceil(box.height) + PAD * 2;
    src.width = gpu.width = Math.round(cw * dpr); src.height = gpu.height = Math.round(ch * dpr);
    gpu.style.width = cw + 'px'; gpu.style.height = ch + 'px';
    var c = src.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, cw, ch);
    c.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    c.fillStyle = (cs.getPropertyValue('--ink') || '').trim() || cs.color;
    c.fillText(el.textContent, PAD, PAD + base);
  }

  var WGSL = [
    'struct U { p: f32, gain: f32, hot: f32, lean: f32, reach: f32, a: f32, b: f32, c: f32 };',
    '@group(0) @binding(0) var smp: sampler;',
    '@group(0) @binding(1) var tex: texture_2d<f32>;',
    '@group(0) @binding(2) var<uniform> u: U;',
    'struct V { @builtin(position) pos: vec4<f32>, @location(0) uv: vec2<f32> };',
    '@vertex fn vs(@builtin(vertex_index) i: u32) -> V {',
    '  var q = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));',
    '  var o: V; o.pos = vec4<f32>(q[i], 0.0, 1.0); o.uv = vec2<f32>(q[i].x * 0.5 + 0.5, 0.5 - q[i].y * 0.5); return o;',
    '}',
    '@fragment fn fs(v: V) -> @location(0) vec4<f32> {',
    '  let t = textureSample(tex, smp, v.uv);                       // the letters, in the ink, premultiplied',
    '  let d = u.p - (v.uv.x - (0.5 - v.uv.y) * u.lean);            // how far behind the edge this point is (ahead of it: negative)',
    '  let fall = clamp(1.0 - d / u.reach, 0.0, 1.0);',
    '  let lit = fall * fall * smoothstep(0.0, 0.012, d);           // brightest at the edge, nothing ahead of it',
    '  let rgb = mix(t.rgb, vec3<f32>(t.a), u.hot * lit) * (1.0 + (u.gain - 1.0) * lit);',
    '  return vec4<f32>(rgb, t.a) * smoothstep(0.0, 0.1, lit);      // only the lit stretch is drawn: the rest is the page\'s own text',
    '}'
  ].join('\n');

  var ctx = gpu.getContext('webgpu');
  if (!ctx) { note('no webgpu context: the CSS wipe'); return; }
  var device = null, pipe = null, smp = null, ub = null, tex = null, bind = null, texW = 0, texH = 0;
  var alive = false, raf = 0, timer = 0;

  function fail(why) {                                // back to the CSS version, for good
    alive = false;
    if (raf) cancelAnimationFrame(raf); clearTimeout(timer); raf = 0;
    el.classList.remove('hdr'); el.style.clipPath = ''; gpu.style.display = 'none';
    note('the CSS wipe (' + why + ')');
  }

  function upload() {
    drawText();
    if (src.width !== texW || src.height !== texH) {
      texW = src.width; texH = src.height;
      tex = device.createTexture({ size: [texW, texH], format: 'rgba8unorm', usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT });
      bind = device.createBindGroup({ layout: pipe.getBindGroupLayout(0), entries: [
        { binding: 0, resource: smp }, { binding: 1, resource: tex.createView() }, { binding: 2, resource: { buffer: ub } }] });
    }
    device.queue.copyExternalImageToTexture({ source: src }, { texture: tex, premultipliedAlpha: true }, [texW, texH]);
  }

  // One picture: the edge at `p` along the line (0 its start, 1 its end; past 1 + REACH the light has left), lifted by `gain`.
  function paint(p, gain) {
    device.queue.writeBuffer(ub, 0, new Float32Array([p, gain, HOT, LEAN, REACH, 0, 0, 0]));
    var enc = device.createCommandEncoder();
    var pass = enc.beginRenderPass({ colorAttachments: [{ view: ctx.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
    pass.setPipeline(pipe); pass.setBindGroup(0, bind); pass.draw(3); pass.end();
    device.queue.submit([enc.finish()]);
  }

  // While the line wipes in, the page's own text is cut at the same leaning edge the light is drawn at.
  function edgeX(p, y) { return (p + (0.5 - y / ch) * LEAN) * cw - PAD; }
  function cut(p) {
    el.style.clipPath = 'polygon(' + (-PAD) + 'px ' + (-PAD) + 'px, ' + edgeX(p, 0).toFixed(1) + 'px ' + (-PAD) + 'px, ' +
      edgeX(p, ch).toFixed(1) + 'px ' + (boxH + PAD) + 'px, ' + (-PAD) + 'px ' + (boxH + PAD) + 'px)';
  }

  var END = 1 + REACH + LEAN;                         // the edge's place once all of the light has left the line
  function tick() {
    raf = 0;
    if (!alive) return;
    var t = performance.now() / 1000 - T0, wait = -1;      // wait < 0: draw again next frame; otherwise seconds until there is something to draw
    try {
      if (HOLD) { el.style.clipPath = ''; paint(0.62, GAIN); wait = 1; }
      else if (t < IN_AT) { cut(-0.1); paint(-0.1, GAIN); }
      else if (t < IN_AT + IN_FOR) {
        var x = (t - IN_AT) / IN_FOR, p = END * (1 - Math.pow(1 - x, 2.2));
        if (p < 1 + LEAN) cut(p); else el.style.clipPath = '';
        paint(p, GAIN);
      } else {
        el.style.clipPath = '';
        var into = ((t - IN_AT - IN_FOR) % SHINE_EVERY) - (SHINE_EVERY - SHINE_FOR);   // each cycle rests, then shines
        if (into >= 0) paint(END * into / SHINE_FOR, 1 + (GAIN - 1) * SHINE);
        else { paint(END + 1, 1); wait = -into; }
      }
    } catch (e) { fail(e && e.message || e); return; }
    if (document.hidden) return;
    if (wait < 0) raf = requestAnimationFrame(tick);
    else timer = setTimeout(function () { if (alive && !raf) raf = requestAnimationFrame(tick); }, wait * 1000);
  }
  function again() {                                  // start drawing again from wherever the clock is
    clearTimeout(timer);
    if (alive && !raf && !document.hidden) raf = requestAnimationFrame(tick);
  }
  function redraw() { if (!alive) return; try { upload(); } catch (e) { fail(e && e.message || e); return; } again(); }

  navigator.gpu.requestAdapter().then(function (adapter) {
    if (!adapter) throw new Error('no GPU adapter');
    return adapter.requestDevice();
  }).then(function (d) {
    device = d;
    ctx.configure({ device: d, format: 'rgba16float', colorSpace: 'srgb', toneMapping: { mode: 'extended' }, alphaMode: 'premultiplied' });
    var conf = ctx.getConfiguration ? ctx.getConfiguration() : null;
    if (conf && conf.toneMapping && conf.toneMapping.mode !== 'extended') throw new Error('extended tone mapping not kept');
    var mod = d.createShaderModule({ code: WGSL });
    pipe = d.createRenderPipeline({ layout: 'auto', vertex: { module: mod, entryPoint: 'vs' },
      fragment: { module: mod, entryPoint: 'fs', targets: [{ format: 'rgba16float' }] }, primitive: { topology: 'triangle-list' } });
    smp = d.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    ub = d.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    d.lost.then(function (why) { fail('GPU lost: ' + why.reason); });
    if (d.addEventListener) d.addEventListener('uncapturederror', function (e) { fail('GPU error: ' + (e.error && e.error.message)); });
    upload();
    gpu.setAttribute('aria-hidden', 'true');
    gpu.style.dynamicRangeLimit = 'no-limit';
    el.appendChild(gpu);
    el.classList.add('hdr');                          // the stylesheet stops its own wipe and shine: this file draws them now
    alive = true;
    note('WebGPU float canvas over the text, extended tone mapping, the edge at ' + GAIN + 'x' + (conf ? '  ' + JSON.stringify({ format: conf.format, colorSpace: conf.colorSpace, toneMapping: conf.toneMapping }) : ''));
    tick();
  }).catch(function (e) { fail(e && e.message || e); });

  document.addEventListener('visibilitychange', function () {       // a hidden tab stops drawing
    if (document.hidden) { clearTimeout(timer); if (raf) cancelAnimationFrame(raf); raf = 0; } else again();
  });
  if (range.addEventListener) range.addEventListener('change', function () { if (alive && !FORCE && !range.matches) fail('the screen left HDR'); });
  var scheme = matchMedia('(prefers-color-scheme: dark)');
  if (scheme.addEventListener) scheme.addEventListener('change', redraw);      // the ink changes with light and dark
  var sized = 0;
  window.addEventListener('resize', function () { clearTimeout(sized); sized = setTimeout(redraw, 150); });   // a turn of the phone changes the line's size
})();
