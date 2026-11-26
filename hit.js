/* Counts a visit: one small beacon to our own server, no cookies, no ids, nothing stored in the browser.
   Kept there: a count per day, per page, per referring site and per kind of device. */
(function () {
  try {
    if (location.hostname !== 'laundering.app' || navigator.webdriver) return;
    var page = location.pathname.split('/').pop().replace(/\.html$/, '') || 'index';
    var entry = 1, source = 'direct';
    if (document.referrer) {
      var host = new URL(document.referrer).hostname;
      if (host === location.hostname) entry = 0; else source = host;
    }
    var q = new URLSearchParams(location.search);
    source = q.get('ref') || q.get('utm_source') || source;
    var url = 'https://laundering-api-35rekrtt3q-uc.a.run.app/v1/site/hit';
    var body = JSON.stringify({ p: page, e: entry, s: source });
    if (navigator.sendBeacon) navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }));
    else fetch(url, { method: 'POST', body: body, mode: 'no-cors', keepalive: true });
  } catch (e) {}
})();
