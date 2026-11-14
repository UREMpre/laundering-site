/*
 * card.js: asks the app's service for the person's PUBLIC card (the look they chose for their profile) and hands it to
 * washer.js, which draws their washer, money and Mouse instead of the default picture. Used by u.html (whose profile)
 * and r.html (who invited you).
 *
 * - One request, `GET /v1/referrals/profiles/<name>`, the route the app's own visitor view reads; no sign-in, no cookie
 *   (credentials omitted), no referrer, no custom header (so the browser sends no preflight), redirects refused.
 * - Anything else (a private or unknown profile's 404, offline, a slow or broken answer, a service that does not yet
 *   allow this page's origin) leaves today's picture exactly as it is, silently.
 * - Only the look is used: washer.js reads each field as a key into its own fixed tables. No count from the record, no
 *   text and no URL from the card ever reach the page.
 *
 * Testing (site/README.md): on localhost or 127.0.0.1 ONLY, `?card=local` reads the same route from the page's own
 * server and `?card=<port>` from http://127.0.0.1:<port>. On localhost without the switch nothing is asked at all.
 */
(function () {
  'use strict';
  var SERVICE = 'https://laundering-api-251608304019.us-central1.run.app';
  var LIMIT = 256 * 1024;                            // a card is a few KB; anything far bigger is not one
  var WAIT = 8000;                                   // give up after this; the default stays

  if (!window.MLPicture || !window.fetch || !window.JSON) return;
  var name = '';
  try { name = decodeURIComponent(location.hash.slice(1)); } catch (e) { return; }
  if (!/^[A-Za-z0-9_]{3,20}$/.test(name)) return;

  var host = location.hostname, base = null;
  var local = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  var sw = (/[?&]card=([^&#]*)/.exec(location.search) || [0, ''])[1];
  if (local) {
    if (sw === 'local') base = '';
    else if (/^[0-9]{2,5}$/.test(sw)) base = 'http://127.0.0.1:' + sw;
  } else if (location.protocol === 'https:') {
    base = SERVICE;
  }
  if (base === null) return;

  var ctl = window.AbortController ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctl) ctl.abort(); }, WAIT);
  fetch(base + '/v1/referrals/profiles/' + encodeURIComponent(name), {
    method: 'GET', mode: 'cors', credentials: 'omit', cache: 'no-store', redirect: 'error', referrerPolicy: 'no-referrer',
    signal: ctl ? ctl.signal : undefined
  }).then(function (res) {
    if (!res.ok) throw new Error('no card');
    var size = +(res.headers.get('content-length') || 0);
    if (size > LIMIT) throw new Error('too big');
    return res.text();
  }).then(function (text) {
    clearTimeout(timer);
    if (typeof text !== 'string' || text.length > LIMIT) return;
    var data = JSON.parse(text);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return;
    var card = data.card;
    if (!card || typeof card !== 'object' || Array.isArray(card)) return;
    window.MLPicture.show(card, data.founder_number, data.invite_number);
  }).catch(function () { clearTimeout(timer); });
})();
