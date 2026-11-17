(function () {
  'use strict';

  // ---------- Generated sample data: 400 vehicles (deterministic) ----------
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  var rand = rng(42);
  var pick = function (a) { return a[Math.floor(rand() * a.length)]; };

  var DRIVERS = ['Ali Raza', 'Sara Khan', 'Usman Tariq', 'Ayesha Noor', 'Bilal Ahmed', 'Hina Malik', 'Zain Abbas', 'Mehwish Iqbal'];
  var STATUS = ['Moving', 'Idle', 'Loading', 'Delayed'];
  var AREAS = ['Gulberg', 'DHA Phase 5', 'Model Town', 'Johar Town', 'Ferozepur Road', 'Canal Road', 'Mall Road', 'Wapda Town'];
  var NOTES = [
    'Customer asked for a call 15 minutes before arrival.',
    'Heavy traffic reported near the underpass; the route was changed to avoid the delay.',
    'Fragile cargo on board. Drive slowly over speed breakers and confirm the signature on delivery.',
    'Fuel stop planned at the next station. Driver will resume the route afterwards.'
  ];

  var vehicles = [];
  for (var n = 0; n < 400; n++) {
    var parts = [], extra = Math.floor(rand() * 4); // 0..3 sentences => dynamic heights
    for (var s = 0; s < extra; s++) parts.push(pick(NOTES));
    vehicles.push({
      id: 'VH-' + String(n + 1).padStart(4, '0'),
      driver: pick(DRIVERS),
      status: pick(STATUS),
      speed: Math.floor(rand() * 90),
      location: pick(AREAS) + ', Lahore',
      note: parts.join(' ')
    });
  }

  // ---------- Row template (built once per pool slot, then recycled) ----------
  function createRow() {
    var el = document.createElement('div');
    el.className = 'row';
    el.innerHTML =
      '<div class="row-main">' +
        '<span class="v-id"></span><span class="v-driver"></span>' +
        '<span class="v-status"></span><span class="v-speed"></span>' +
      '</div>' +
      '<div class="v-loc"></div>' +
      '<p class="v-note"></p>';
    el._c = {
      id: el.querySelector('.v-id'),
      driver: el.querySelector('.v-driver'),
      status: el.querySelector('.v-status'),
      speed: el.querySelector('.v-speed'),
      loc: el.querySelector('.v-loc'),
      note: el.querySelector('.v-note')
    };
    return el;
  }

  function renderRow(el, i) {
    var v = vehicles[i], c = el._c;
    c.id.textContent = v.id;
    c.driver.textContent = v.driver;
    c.status.textContent = v.status;
    c.status.className = 'v-status s-' + v.status.toLowerCase();
    c.speed.textContent = v.speed + ' km/h';
    c.loc.textContent = v.location;
    c.note.textContent = v.note;
    c.note.hidden = !v.note; // rows without a note are shorter
  }

  // ---------- Wire up the list ----------
  var viewport = document.getElementById('viewport');
  var $ = function (id) { return document.getElementById(id); };

  function domNodes() { return viewport.querySelectorAll('*').length; }

  var list = new VirtualList(viewport, {
    count: vehicles.length,
    estimatedHeight: 84,
    minHeight: 48,
    overscan: 3,
    createRow: createRow,
    renderRow: renderRow,
    onUpdate: function (r) {
      $('stat-range').textContent = (r.start + 1) + ' - ' + (r.end + 1) + ' of ' + vehicles.length;
      $('stat-rows').textContent = r.poolSize;
      $('stat-nodes').textContent = domNodes();
    }
  });

  // ---------- HUD: FPS + worst frame time ----------
  var frames = 0, worst = 0, lastT = performance.now(), lastFrame = lastT;
  (function loop(now) {
    frames++;
    worst = Math.max(worst, now - lastFrame);
    lastFrame = now;
    if (now - lastT >= 500) {
      $('stat-fps').textContent = Math.round(frames * 1000 / (now - lastT));
      $('stat-worst').textContent = worst.toFixed(1) + ' ms';
      frames = 0; worst = 0; lastT = now;
    }
    requestAnimationFrame(loop);
  })(lastT);

  // ---------- Controls ----------
  $('jump-form').addEventListener('submit', function (e) {
    e.preventDefault();
    list.scrollToIndex(parseInt($('jump-input').value, 10) - 1);
  });

  var raf = null, dir = 1;
  $('stress-btn').addEventListener('click', function () {
    if (raf) {
      cancelAnimationFrame(raf); raf = null;
      this.textContent = 'Start auto-scroll stress test';
      this.setAttribute('aria-pressed', 'false');
      return;
    }
    this.textContent = 'Stop auto-scroll';
    this.setAttribute('aria-pressed', 'true');
    (function step() {
      viewport.scrollTop += dir * 40;
      if (viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 1) dir = -1;
      else if (viewport.scrollTop <= 0) dir = 1;
      raf = requestAnimationFrame(step);
    })();
  });
})();
