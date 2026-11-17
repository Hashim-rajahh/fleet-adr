/*!
 * VirtualList: a from-scratch virtualised list (no dependencies).
 *
 * How it works
 * 1. A tall "spacer" div gives the scrollbar the full height of all rows.
 * 2. A FIXED pool of row elements is created once (size depends on viewport
 *    height / minimum row height). Row i always lives in pool[i % poolSize],
 *    so rows that stay visible are never re-rendered while scrolling.
 * 3. Scroll events are throttled with requestAnimationFrame (max 1 update/frame).
 * 4. Dynamic heights: each visible row is measured after render; heights are
 *    stored, prefix-sum offsets are recomputed, and scrollTop is corrected so
 *    the content does not jump when a row above the viewport changes height.
 */
(function (global) {
  'use strict';

  function VirtualList(viewport, opts) {
    this.viewport = viewport;
    this.count = opts.count;
    this.estimate = opts.estimatedHeight || 80; // used until a row is measured
    this.minHeight = opts.minHeight || 48;      // MUST match CSS min-height of a row
    this.overscan = opts.overscan == null ? 3 : opts.overscan;
    this.createRow = opts.createRow;            // () => HTMLElement (called once per pool slot)
    this.renderRow = opts.renderRow;            // (el, index) => void
    this.onUpdate = opts.onUpdate || function () {};

    this.heights = new Float64Array(this.count).fill(this.estimate);
    this.offsets = new Float64Array(this.count + 1);
    this.pool = [];
    this.ticking = false;
    this.lastWidth = -1;

    this.spacer = document.createElement('div');
    this.spacer.className = 'vl-spacer';
    this.spacer.setAttribute('role', 'list');
    viewport.appendChild(this.spacer);

    this._onScroll = this._onScroll.bind(this);
    viewport.addEventListener('scroll', this._onScroll, { passive: true });

    this._computeOffsets(0);
    this._resize();

    var self = this;
    if (typeof ResizeObserver !== 'undefined') {
      this.ro = new ResizeObserver(function () { self._resize(); });
      this.ro.observe(viewport);
    } else {
      window.addEventListener('resize', function () { self._resize(); });
    }
  }

  var P = VirtualList.prototype;

  // Prefix sums: offsets[i] = top of row i, offsets[count] = total height.
  P._computeOffsets = function (from) {
    var o = this.offsets, h = this.heights;
    for (var i = from; i < this.count; i++) o[i + 1] = o[i] + h[i];
    this.spacer.style.height = o[this.count] + 'px';
  };

  // Binary search: last row whose top is <= y.
  P._findIndex = function (y) {
    var lo = 0, hi = this.count - 1, o = this.offsets;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      if (o[mid] <= y) lo = mid; else hi = mid - 1;
    }
    return lo;
  };

  P._buildPool = function () {
    var need = Math.min(
      this.count,
      Math.ceil(this.viewport.clientHeight / this.minHeight) + this.overscan * 2 + 2
    );
    if (need === this.pool.length) return;
    for (var k = 0; k < this.pool.length; k++) this.spacer.removeChild(this.pool[k]);
    this.pool = [];
    for (var i = 0; i < need; i++) {
      var el = this.createRow();
      el.classList.add('vl-row');
      el.setAttribute('role', 'listitem');
      el.setAttribute('aria-setsize', String(this.count));
      el.style.display = 'none';
      el._index = -1;
      this.spacer.appendChild(el);
      this.pool.push(el);
    }
  };

  P._resize = function () {
    var w = this.viewport.clientWidth;
    if (this.lastWidth !== -1 && w !== this.lastWidth) {
      // Width changed => text wraps differently => old measurements are stale.
      this.heights.fill(this.estimate);
      this._computeOffsets(0);
    }
    this.lastWidth = w;
    this._buildPool();
    this.update();
  };

  P._onScroll = function () {
    if (this.ticking) return;
    this.ticking = true;
    var self = this;
    requestAnimationFrame(function () {
      self.ticking = false;
      self.update();
    });
  };

  P._place = function (start, end) {
    var size = this.pool.length;
    for (var i = start; i <= end; i++) {
      this.pool[i % size].style.transform = 'translate3d(0,' + this.offsets[i] + 'px,0)';
    }
  };

  P.update = function () {
    if (!this.count || !this.pool.length) return;
    var vp = this.viewport, size = this.pool.length;
    var top = vp.scrollTop, h = vp.clientHeight;

    var first = this._findIndex(top);
    var last = this._findIndex(top + h);
    var start = Math.max(0, first - this.overscan);
    var end = Math.min(this.count - 1, last + this.overscan);
    if (end - start + 1 > size) end = start + size - 1; // never exceed the pool

    // 1) WRITE: bind data + position (recycle DOM, never create/destroy)
    var i, el;
    for (i = start; i <= end; i++) {
      el = this.pool[i % size];
      if (el._index !== i) {
        this.renderRow(el, i);
        el._index = i;
        el.setAttribute('aria-posinset', String(i + 1));
        el.style.display = '';
      }
    }
    for (var k = 0; k < size; k++) {
      el = this.pool[k];
      if (el._index !== -1 && (el._index < start || el._index > end)) {
        el.style.display = 'none';
        el._index = -1;
      }
    }
    this._place(start, end);

    // 2) READ: measure (dynamic heights)
    var changedFrom = Infinity, anchorDelta = 0;
    for (i = start; i <= end; i++) {
      var measured = this.pool[i % size].getBoundingClientRect().height;
      var diff = measured - this.heights[i];
      if (diff > 0.5 || diff < -0.5) {
        if (i < first) anchorDelta += diff; // row above the viewport changed
        this.heights[i] = measured;
        if (i < changedFrom) changedFrom = i;
      }
    }

    // 3) Correct offsets + keep the visible content from jumping
    if (changedFrom !== Infinity) {
      this._computeOffsets(changedFrom);
      this._place(start, end);
      if (anchorDelta) vp.scrollTop = top + anchorDelta;
    }

    this.onUpdate({ start: start, end: end, poolSize: size });
  };

  P.scrollToIndex = function (i) {
    i = Math.max(0, Math.min(this.count - 1, i));
    this.viewport.scrollTop = this.offsets[i];
  };

  global.VirtualList = VirtualList;
})(window);
