# laundering.app

The static site for Money Laundering (GitHub Pages, plain HTML/CSS/JS, no build step, no libraries).

## The washer and the money (`washer.js`)

One file draws the app's washing machine, Mouse and the money stream on a `<canvas id="washer">`. The source of
each shape is listed at the top of `washer.js`. It makes no network request and stores nothing.

- `u.html`, `r.html`: the profile and invite pages. A 320 x 232 picture; `card.js` can hand it a person's look
  (`MLPicture.show`).
- `index.html` header: the same painter in **play** mode, switched on by an attribute on the canvas:

  ```html
  <canvas id="washer" data-play="touch hover" role="img" aria-label="..."></canvas>
  ```

  - `data-play` (present at all): a 440 x 400 field with the washer and Mouse inside it and 30 pieces of money,
    and the loop pauses while the canvas is off screen.
  - `touch`: a press or drag shoves the notes aside and drags them along, a tap scatters them, a flick throws them.
    Same rules and numbers as the app's lock screen (`LockTouch` in `Ledger/Views/MoneySwirl.swift`: reach 240,
    shove 6000, carry 16, tap 280 / 1100, flick 230 / 450 / 0.9 / 2600), in points of a 440-point-wide phone,
    scaled to the field's width.
  - `hover`: a mouse with no button down also pushes the notes, at 0.35 of a press.

  Pointer Events only. The canvas has `touch-action: pan-y`, so a vertical swipe on it still scrolls the page (the
  browser takes the touch and the money lets go); sideways drags and taps go to the money.
  With `prefers-reduced-motion: reduce` it is one still frame and nothing listens for touches.
  Without JavaScript the header shows the Today screenshot instead (`<noscript>`).

- Query switches, for checking only: `?hdr=off`, `?hdr=debug`, `?hdr=force` (see the top of `washer.js`).

## Safe areas

`index.html` uses `viewport-fit=cover`. The background is on `html`, so it paints under the safe areas (the iPhone
Duo's camera column, a phone on its side); text stays inside `max(1.25rem, env(safe-area-inset-*))` gutters. The
screenshot row runs to the screen's edges with its ends faded out, its first picture lined up with the text.
