# Fleet Dashboard

Ezitech internship project: a live dispatch table for **400 concurrent vehicles**.

| Task | What | Where |
|---|---|---|
| 1 | Architecture Decision Record (why custom virtualisation, not a heavy UI library) | [`ADR.md`](./ADR.md), [`docs/adr/`](./docs/adr/) |
| 2 | Virtualised list component built from scratch | [`src/virtual-list.js`](./src/virtual-list.js), demo in [`index.html`](./index.html) |

## Task 2: Virtualised list

Renders 400 vehicle rows with **dynamic row heights** (rows have 0 to 3 note sentences, so heights differ) using only a small, fixed pool of DOM elements.

### Run it
Open `index.html` in a browser. There is no build step and no dependencies.

### How it works
1. **Viewport maths:** a spacer div gives the scrollbar the full height. A binary search over prefix-sum offsets finds the first and last visible rows.
2. **requestAnimationFrame throttling:** scroll events schedule at most one update per frame.
3. **DOM recycling:** a fixed pool of row elements is created once. Row `i` always uses `pool[i % poolSize]`, so rows that stay on screen are not re-rendered.
4. **Dynamic heights:** visible rows are measured after rendering. Offsets are recomputed and `scrollTop` is corrected so content does not jump when a row above the viewport changes height.
5. **Reads and writes are batched** (write all rows, then read all heights) to avoid layout thrashing.

### Verify the three "done" points yourself
- **Constant DOM count:** the on-page readout shows "Total nodes in list". It stays the same at any scroll position. Or run this in the DevTools console while scrolling: `document.querySelector('#viewport').querySelectorAll('*').length`
- **60fps:** DevTools, Performance tab, Record, click "Start auto-scroll stress test", record for 5 seconds, then Stop. Frames should stay green with no long red tasks. The page also shows live FPS and worst frame time.
- **Dynamic heights:** rows visibly differ in height. Use "Jump to row" and scroll back and forth, and the content does not jump.

### Automated check (headless Chromium)
Scrolled to 9 positions including the top, the bottom and 3 random-access jumps. Node count stayed at 153 (19 row elements) every time, the viewport was always fully covered by rows, and there were no console errors.

### Limitations
- Row heights are measured when a row first becomes visible. Heights of rows never seen are estimated (84 px) until then, so the scrollbar thumb size can shift slightly during the first scroll.
- If the window width changes, measurements are reset and re-measured as needed.
- Browser Ctrl+F only finds rows currently in the DOM (see ADR, Consequences).

## Author
Hashim Anwar, BSc Computer Science, Lahore Leads University.
