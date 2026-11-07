// <mena-map> — MENA deployment map (d3-geo prototype of the MapLibre island).
// Attributes: pins (JSON [{id,lat,lon,cc,label,n}]), selected, mode ("hero"|"full"), focus (cc), dir, pad-end (px), label
// Emits: "pinselect" (bubbles, composed) + window "rm:pin" {detail:{id}}
(function () {
  if (customElements.get('mena-map')) return;
  const TOPO = { lo: '/vendor/countries-110m.json', hi: '/vendor/countries-50m.json' };
  const MENA = new Set(['784','682','634','048','414','512','818','504','400','788','012','434','368','422','887','376','275','760','729','478','732']);
  const CC = { AE:'784', SA:'682', QA:'634', BH:'048', KW:'414', OM:'512', EG:'818', MA:'504', JO:'400', TN:'788', DZ:'012', LY:'434', IQ:'368', LB:'422', YE:'887', SY:'760', SD:'729', MR:'478', PS:'275' };
  const NAMES = {'784':['UAE','الإمارات'],'682':['Saudi Arabia','السعودية'],'634':['Qatar','قطر'],'818':['Egypt','مصر'],'504':['Morocco','المغرب'],'512':['Oman','عُمان'],'400':['Jordan','الأردن'],'414':['Kuwait','الكويت'],'788':['Tunisia','تونس'],'012':['Algeria','الجزائر'],'434':['Libya','ليبيا'],'368':['Iraq','العراق'],'887':['Yemen','اليمن'],'729':['Sudan','السودان'],'048':['Bahrain','البحرين']};
  // The GCC is the map's centre of gravity: the view is centred on the Gulf, wide enough that Egypt,
  // the Levant and the Maghreb stay visible. Mercator keeps every country's shape true at these latitudes.
  const GCC = [49, 25.5];
  const REGION = [[GCC[0] - 62, GCC[1] - 16], [GCC[0] + 62, GCC[1] + 22]];
  // Phones start closer in on the GCC (Levant to Oman); the Maghreb is a pan or zoom-out away.
  const REGION_NARROW = [[GCC[0] - 22, GCC[1] - 14], [GCC[0] + 22, GCC[1] + 14]];
  const LIMIT = [[-40, -20], [140, 62]];
  const flat = b => d3.geoMercator().rotate([-(b[0][0] + b[1][0]) / 2, 0]);
  const MIN_SPAN = 0.8, NS_R = 26;
  const cache = {};
  const libs = () => new Promise(r => { const t = () => (window.d3 && window.topojson) ? r() : setTimeout(t, 40); t(); });
  const load = k => cache[k] || (cache[k] = libs().then(() => fetch(TOPO[k])).then(r => r.json()).then(t => {
    const o = t.objects.countries;
    const features = topojson.feature(t, o).features;
    features.forEach(f => { f.bb = d3.geoBounds(f); });
    return { features, borders: topojson.mesh(t, o, (a, b) => a !== b), coast: topojson.mesh(t, o, (a, b) => a === b) };
  }));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const I = {
    plus: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3v10M3 8h10"/></svg>',
    minus: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8h10"/></svg>',
    reset: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"/><path d="M2.5 2.5v3h3"/></svg>',
    full: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>'
  };
  const L = { en: { in: 'Zoom in', out: 'Zoom out', reset: 'Reset view', full: 'Full screen', km: 'km' }, ar: { in: 'تكبير', out: 'تصغير', reset: 'إعادة الضبط', full: 'ملء الشاشة', km: 'كم' } };

  class MenaMap extends HTMLElement {
    static get observedAttributes() { return ['pins', 'selected', 'mode', 'focus', 'dir', 'pad-end', 'label']; }
    constructor() {
      super();
      this.bbox = REGION.map(p => p.slice());
      const r = this.attachShadow({ mode: 'open' });
      r.innerHTML = `<style>
        :host{display:block;position:relative;width:100%;height:100%;overflow:hidden;background:var(--map-sea,transparent)}
        :host>svg{display:block;width:100%;height:100%;outline:none;touch-action:pan-y}
        .grp button svg{width:16px;height:16px;flex:none;display:block}
        :host([mode=full])>svg{cursor:grab}
        :host([data-drag])>svg{cursor:grabbing}
        .pin{cursor:pointer;outline:none}
        .pin:focus-visible .hit{stroke:var(--accent-text);stroke-width:2.5}
        .pin .core{transition:r .15s}
        .pin:hover .core{r:7}
        .ring{fill:none;stroke:var(--accent);stroke-width:1.25;transform-box:fill-box;transform-origin:center;animation:p 2.6s cubic-bezier(.2,.6,.3,1) infinite}
        @keyframes p{0%{transform:scale(.5);opacity:.95}100%{transform:scale(3.2);opacity:0}}
        .lbl{font:500 10px 'DM Mono','IBM Plex Mono',monospace;letter-spacing:.1em;fill:var(--fg-muted);text-transform:uppercase;pointer-events:none;paint-order:stroke;stroke:var(--map-land-mena);stroke-width:3px;stroke-linejoin:round}
        .lbl.ar{font:500 12px 'Inter','Noto Sans Arabic',sans-serif;letter-spacing:0}
        .cnt{font:600 11px 'DM Mono','IBM Plex Mono',monospace;fill:var(--fg);pointer-events:none;font-variant-numeric:tabular-nums}
        .bar{position:absolute;bottom:16px;inset-inline-start:16px;display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
        .bar[hidden]{display:none}
        .grp{display:flex;background:var(--bg-raised);border:1px solid var(--line-strong);box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 24px rgba(18,18,26,.08)}
        .grp button{height:40px;min-width:40px;padding:0 12px;border:0;border-inline-end:1px solid var(--line);background:transparent;color:var(--fg);font:500 13px 'Inter','Noto Sans Arabic',sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap}
        .grp button:last-child{border-inline-end:0}
        .grp button:hover:not(:disabled){background:var(--bg-hover)}
        .grp button:disabled{color:var(--fg-subtle);opacity:.45;cursor:default}
        .grp button:focus-visible{outline:2px solid var(--accent-text);outline-offset:-2px}
        .grp button.rs[data-on]{color:var(--accent-text)}
        .scale{display:flex;flex-direction:column;gap:4px;padding:6px 10px;background:var(--bg-glass,var(--bg-raised));border:1px solid var(--line);font:500 11px 'DM Mono','IBM Plex Mono',monospace;color:var(--fg-muted)}
        .scale i{display:block;height:6px;border:1.5px solid var(--fg-muted);border-top:0}
        @media (prefers-reduced-motion:reduce){.ring{animation:none;opacity:.6;transform:scale(1.6)}}
      </style><svg role="group"></svg>
      <div class="bar" hidden>
        <div class="grp"><button data-z="in"></button><button data-z="out"></button></div>
        <div class="grp"><button data-z="reset" class="rs"></button><button data-z="full"></button></div>
        <div class="scale" aria-hidden="true"><span></span><i></i></div>
      </div>`;
      this.svg = r.querySelector('svg');
      this.bar = r.querySelector('.bar');
      this.btn = {}; r.querySelectorAll('[data-z]').forEach(b => this.btn[b.dataset.z] = b);
      this.btn.in.innerHTML = I.plus; this.btn.out.innerHTML = I.minus; this.btn.full.innerHTML = I.full;
      this.scaleEl = r.querySelector('.scale');
      this.bar.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        const z = b.dataset.z;
        if (z === 'in') this.zoomBy(0.6); else if (z === 'out') this.zoomBy(1.6);
        else if (z === 'reset') this.animateTo(this.focusBox());
        else if (z === 'full') { const host = this.closest('[data-map-shell]') || this; document.fullscreenElement ? document.exitFullscreen() : host.requestFullscreen && host.requestFullscreen(); }
      });
      this.svg.addEventListener('click', e => { if (this.dragged) { this.dragged = false; return; } this.activate(e.target.closest('.pin')); });
      this.svg.addEventListener('keydown', e => {
        const p = e.target.closest && e.target.closest('.pin');
        if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.activate(p); return; }
        if (this.mode() !== 'full') return;
        const s = [this.bbox[1][0] - this.bbox[0][0], this.bbox[1][1] - this.bbox[0][1]];
        const mv = { ArrowLeft: [-.15, 0], ArrowRight: [.15, 0], ArrowUp: [0, .15], ArrowDown: [0, -.15] }[e.key];
        if (mv) { e.preventDefault(); this.animateTo(this.clamp([[this.bbox[0][0] + mv[0] * s[0], this.bbox[0][1] + mv[1] * s[1]], [this.bbox[1][0] + mv[0] * s[0], this.bbox[1][1] + mv[1] * s[1]]])); }
        if (e.key === '+' || e.key === '=') this.zoomBy(0.6);
        if (e.key === '-') this.zoomBy(1.6);
        if (e.key === '0') this.animateTo(this.focusBox());
      });
      // drag to pan
      this.svg.addEventListener('pointerdown', e => {
        if (this.mode() !== 'full' || e.button !== 0 || !this.proj) return;
        this.drag = { x: e.clientX, y: e.clientY, b: this.bbox.map(p => p.slice()), id: e.pointerId, moved: false };
      });
      this.svg.addEventListener('pointermove', e => {
        const d = this.drag; if (!d || d.id !== e.pointerId) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y;
        if (!d.moved && Math.hypot(dx, dy) < 4) return;
        if (!d.moved) { d.moved = true; this.svg.setPointerCapture(e.pointerId); this.setAttribute('data-drag', ''); cancelAnimationFrame(this.raf); }
        const r = this.svg.getBoundingClientRect(), c = [r.width / 2, r.height / 2];
        const a = this.proj.invert(c), b = this.proj.invert([c[0] - dx, c[1] - dy]);
        const ox = b[0] - a[0], oy = b[1] - a[1];
        d.x = e.clientX; d.y = e.clientY;
        this.bbox = this.clamp([[this.bbox[0][0] + ox, this.bbox[0][1] + oy], [this.bbox[1][0] + ox, this.bbox[1][1] + oy]]);
        this.render();
      });
      const end = e => { const d = this.drag; if (!d || d.id !== e.pointerId) return; if (d.moved) { this.dragged = true; setTimeout(() => this.dragged = false, 0); } this.drag = null; this.removeAttribute('data-drag'); };
      this.svg.addEventListener('pointerup', end); this.svg.addEventListener('pointercancel', end);
      // pinch / ctrl+wheel zoom (plain wheel keeps page scrolling)
      this.svg.addEventListener('wheel', e => {
        if (this.mode() !== 'full' || !(e.ctrlKey || e.metaKey) || !this.proj) return;
        e.preventDefault();
        const r = this.svg.getBoundingClientRect(), at = this.proj.invert([e.clientX - r.left, e.clientY - r.top]);
        this.zoomBy(Math.exp(e.deltaY * 0.01), at, true);
      }, { passive: false });
    }
    mode() { return this.getAttribute('mode') || 'full'; }
    lang() { return this.getAttribute('dir') === 'rtl' ? 'ar' : 'en'; }
    pins() { try { return JSON.parse(this.getAttribute('pins') || '[]'); } catch (e) { return []; } }
    connectedCallback() {
      if (!this.hasAttribute('mode')) this.setAttribute('mode', 'full');
      load('lo').then(g => { if (!this.geo) { this.geo = g; this.render(); } });
      if (this.mode() === 'full') load('hi').then(g => { this.geo = g; this.render(); });
      this.ro = new ResizeObserver(() => this.render()); this.ro.observe(this);
      this.labels();
    }
    disconnectedCallback() { this.ro && this.ro.disconnect(); cancelAnimationFrame(this.raf); }
    attributeChangedCallback(n, o, v) {
      if (o === v) return;
      if (n === 'focus') { this.animateTo(this.focusBox()); return; }
      if (n === 'mode' && v === 'full') load('hi').then(g => { this.geo = g; this.render(); });
      if (n === 'dir') this.labels();
      this.render();
    }
    labels() {
      const t = L[this.lang()];
      this.btn.in.setAttribute('aria-label', t.in); this.btn.in.title = t.in;
      this.btn.out.setAttribute('aria-label', t.out); this.btn.out.title = t.out;
      this.btn.full.setAttribute('aria-label', t.full); this.btn.full.title = t.full;
      this.btn.reset.innerHTML = I.reset + '<span>' + t.reset + '</span>';
    }
    focusBox() {
      const cc = this.getAttribute('focus');
      const ps = this.pins().filter(p => !cc || p.cc === cc);
      if (!cc || !ps.length) return this.home();
      return this.padBox(ps, 4);
    }
    home() { return ((this.clientWidth || window.innerWidth) < 700 ? REGION_NARROW : REGION).map(p => p.slice()); }
    padBox(ps, min) {
      let x0 = Math.min(...ps.map(p => p.lon)), x1 = Math.max(...ps.map(p => p.lon)), y0 = Math.min(...ps.map(p => p.lat)), y1 = Math.max(...ps.map(p => p.lat));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, sx = Math.max(min, (x1 - x0) * 1.4), sy = Math.max(min * .6, (y1 - y0) * 1.4);
      return [[cx - sx / 2, cy - sy / 2], [cx + sx / 2, cy + sy / 2]];
    }
    clamp(b) {
      let [[x0, y0], [x1, y1]] = b;
      const sx = x1 - x0, sy = y1 - y0;
      if (x0 < LIMIT[0][0]) { x0 = LIMIT[0][0]; x1 = x0 + sx; } if (x1 > LIMIT[1][0]) { x1 = LIMIT[1][0]; x0 = x1 - sx; }
      if (y0 < LIMIT[0][1]) { y0 = LIMIT[0][1]; y1 = y0 + sy; } if (y1 > LIMIT[1][1]) { y1 = LIMIT[1][1]; y0 = y1 - sy; }
      return [[x0, y0], [x1, y1]];
    }
    span() { return this.bbox[1][0] - this.bbox[0][0]; }
    zoomBy(f, at, instant) {
      const b = this.bbox, cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
      let sx = (b[1][0] - b[0][0]) * f, sy = (b[1][1] - b[0][1]) * f;
      const mx = REGION[1][0] - REGION[0][0];
      if (sx > mx) { sy *= mx / sx; sx = mx; f = mx / (b[1][0] - b[0][0]); }
      if (sx < MIN_SPAN) { sy *= MIN_SPAN / sx; sx = MIN_SPAN; f = MIN_SPAN / (b[1][0] - b[0][0]); }
      let nb;
      if (at) nb = [[at[0] - (at[0] - b[0][0]) * f, at[1] - (at[1] - b[0][1]) * f], [at[0] + (b[1][0] - at[0]) * f, at[1] + (b[1][1] - at[1]) * f]];
      else nb = [[cx - sx / 2, cy - sy / 2], [cx + sx / 2, cy + sy / 2]];
      nb = this.clamp(nb);
      if (instant) { cancelAnimationFrame(this.raf); this.bbox = nb; this.render(); } else this.animateTo(nb);
    }
    animateTo(t) {
      cancelAnimationFrame(this.raf);
      if (reduced()) { this.bbox = t; this.render(); return; }
      const f = this.bbox.map(p => p.slice()), t0 = performance.now(), D = 520;
      const step = now => {
        const k = Math.min(1, (now - t0) / D), e = 1 - Math.pow(1 - k, 3);
        this.bbox = f.map((p, i) => p.map((v, j) => v + (t[i][j] - v) * e));
        this.render();
        if (k < 1) this.raf = requestAnimationFrame(step);
      };
      this.raf = requestAnimationFrame(step);
    }
    activate(el) {
      if (!el) return;
      const ids = el.dataset.ids.split(',');
      if (ids.length === 1) {
        this.dispatchEvent(new CustomEvent('pinselect', { detail: { id: ids[0] }, bubbles: true, composed: true }));
        window.dispatchEvent(new CustomEvent('rm:pin', { detail: { id: ids[0] } }));
      } else {
        const ps = this.pins().filter(p => ids.includes(p.id));
        const b = this.padBox(ps, 0.6);
        if (b[1][0] - b[0][0] >= this.span() * 0.9) { window.dispatchEvent(new CustomEvent('rm:pin', { detail: { id: ids[0] } })); return; }
        this.animateTo(b);
      }
    }
    controls(proj, w) {
      const fb = this.focusBox(), s = this.span();
      const atHome = Math.abs(this.bbox[0][0] - fb[0][0]) < .05 && Math.abs(this.bbox[1][0] - fb[1][0]) < .05 && Math.abs(this.bbox[0][1] - fb[0][1]) < .05;
      this.btn.in.disabled = s <= MIN_SPAN + 0.01;
      this.btn.out.disabled = s >= (REGION[1][0] - REGION[0][0]) - 0.01;
      this.btn.reset.disabled = atHome;
      this.btn.reset.toggleAttribute('data-on', !atHome);
      this.btn.full.hidden = !document.fullscreenEnabled;
      // scale bar
      const c = proj.invert([w / 2, 100]), d = proj.invert([w / 2 + 100, 100]);
      if (!c || !d) return;
      const km = d3.geoDistance(c, d) * 6371, nice = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(n => n >= km * 0.6) || 1000;
      this.scaleEl.querySelector('i').style.width = Math.round(nice / km * 100) + 'px';
      this.scaleEl.querySelector('span').textContent = nice.toLocaleString() + ' ' + L[this.lang()].km;
    }
    render() {
      if (!this.geo) return;
      const w = this.clientWidth, h = this.clientHeight;
      if (!w || !h) return;
      if (!this.homed) { this.homed = true; this.bbox = this.focusBox(); }
      const hero = this.mode() === 'hero', rtl = this.getAttribute('dir') === 'rtl', pad = +this.getAttribute('pad-end') || 0;
      this.bar.hidden = hero;
      this.svg.setAttribute('aria-label', this.getAttribute('label') || 'Map');
      if (hero) this.svg.setAttribute('aria-hidden', 'true');
      let ext;
      if (hero) ext = null;
      else ext = rtl ? [[24 + pad, 24], [w - 24, h - 72]] : [[24, 24], [w - 24 - pad, h - 72]];
      const obj = { type: 'MultiPoint', coordinates: this.bbox };
      let proj;
      const center = p => { const b = this.bbox; return p([(b[0][0] + b[1][0]) / 2, (b[0][1] + b[1][1]) / 2]); };
      if (hero) {
        // Gulf sits in the open space beside the headline; the rest of MENA extends behind the text.
        const wide = w > 900, R = wide ? Math.min(w * 1.7, h * 2.6) : w * 2.6;
        const tx = wide ? (rtl ? w * 0.29 : w * 0.71) : w * 0.5, ty = wide ? h * 0.56 : h * 0.78;
        const hb = [[GCC[0] - 62, GCC[1] - 16], [GCC[0] + 62, GCC[1] + 22]];
        proj = flat(hb).fitWidth(R, { type: 'MultiPoint', coordinates: hb });
        const c = proj(GCC), tr = proj.translate(); proj.translate([tr[0] + tx - c[0], tr[1] + ty - c[1]]);
      } else {
        proj = flat(this.bbox).fitExtent(ext, obj);
        
        const c = center(proj), tr = proj.translate(), cx = (ext[0][0] + ext[1][0]) / 2, cy = (ext[0][1] + ext[1][1]) / 2;
        proj.translate([tr[0] + cx - c[0], tr[1] + cy - c[1]]);
      }
      this.proj = proj;
      const path = d3.geoPath(proj);
      const tl = proj.invert([-40, -40]), br = proj.invert([w + 40, h + 40]);
      const vis = () => true; // draw every country (cheap at this detail level)
      const fcc = CC[this.getAttribute('focus')];
      const k = proj.scale() / 400;
      let out = '';
      if (!hero) out += `<path d="${path(d3.geoGraticule().step([5, 5])())}" fill="none" stroke="var(--line)" stroke-width="0.6" stroke-dasharray="1 3"/>`;
      let lands = '', mena = '';
      for (const f of this.geo.features) {
        if (!vis(f)) continue;
        const m = MENA.has(f.id), d = path(f);
        if (m) mena += `<path d="${d}" fill="${f.id === fcc ? 'var(--accent-soft)' : 'var(--map-land-mena)'}"/>`;
        else lands += `<path d="${d}" fill="var(--map-land)"/>`;
      }
      out += lands + mena;
      out += `<path d="${path(this.geo.borders)}" fill="none" stroke="var(--map-border)" stroke-width="${hero ? .5 : .75}" stroke-linejoin="round"/>`;
      out += `<path d="${path(this.geo.coast)}" fill="none" stroke="var(--map-coast,var(--map-border))" stroke-width="${hero ? .6 : 1}" stroke-linejoin="round"/>`;
      if (fcc) { const f = this.geo.features.find(x => x.id === fcc); if (f) out += `<path d="${path(f)}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round"/>`; }
      if (!hero) {
        for (const id in NAMES) {
          const f = this.geo.features.find(x => x.id === id); if (!f) continue;
          if (id === '048' && k < 4) continue;
          const c = path.centroid(f); if (!isFinite(c[0]) || c[0] < 0 || c[0] > w || c[1] < 0 || c[1] > h - 60) continue;
          out += `<text class="lbl${rtl ? ' ar' : ''}" x="${c[0]}" y="${c[1] + 24}" text-anchor="middle">${NAMES[id][rtl ? 1 : 0]}</text>`;
        }
      }
      const sel = this.getAttribute('selected');
      const pts = this.pins().map(p => { const xy = proj([p.lon, p.lat]); return { ...p, x: xy[0], y: xy[1] }; });
      if (hero) {
        pts.forEach((p, i) => {
          out += `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="${p.n ? 'var(--accent)' : 'var(--pin, var(--accent))'}" opacity=".9"/>`;
          if (p.n || i % 4 === 0) out += `<circle class="ring" cx="${p.x}" cy="${p.y}" r="5" style="animation-delay:${(i * 0.43) % 2.6}s"/>`;
        });
      } else {
        const cl = [];
        for (const p of pts) {
          const c = cl.find(c => Math.hypot(c.x - p.x, c.y - p.y) < NS_R);
          if (c) { c.m.push(p); c.x = c.m.reduce((a, q) => a + q.x, 0) / c.m.length; c.y = c.m.reduce((a, q) => a + q.y, 0) / c.m.length; }
          else cl.push({ x: p.x, y: p.y, m: [p] });
        }
        for (const c of cl) {
          const ids = c.m.map(p => p.id), n = ids.length, isSel = sel && ids.includes(sel), isNew = c.m.some(p => p.n);
          if (n === 1) {
            const p = c.m[0];
            out += `<g class="pin" tabindex="0" role="button" aria-pressed="${isSel ? 'true' : 'false'}" aria-label="${esc(p.label)}" data-ids="${p.id}">`
              + (isNew ? `<circle class="ring" cx="${c.x}" cy="${c.y}" r="6"/>` : '')
              + (isSel ? `<circle cx="${c.x}" cy="${c.y}" r="13" fill="none" stroke="var(--fg)" stroke-width="1.5"/>` : '')
              + `<circle class="hit" cx="${c.x}" cy="${c.y}" r="14" fill="transparent"/>`
              + `<circle class="core" cx="${c.x}" cy="${c.y}" r="5.5" fill="${isNew || isSel ? 'var(--accent)' : 'var(--pin, var(--accent))'}" stroke="var(--bg-raised)" stroke-width="2"/></g>`;
          } else {
            const r = 12 + Math.sqrt(n) * 3.2;
            out += `<g class="pin" tabindex="0" role="button" aria-label="${n} deployments — activate to zoom in" data-ids="${ids.join(',')}">`
              + (isNew ? `<circle class="ring" cx="${c.x}" cy="${c.y}" r="${r * .6}"/>` : '')
              + `<circle cx="${c.x}" cy="${c.y}" r="${r + 4}" fill="${isNew ? 'var(--accent-soft)' : 'var(--pin-soft, var(--accent-soft))'}"/>`
              + `<circle class="hit" cx="${c.x}" cy="${c.y}" r="${r}" fill="var(--bg-raised)" stroke="${isSel ? 'var(--fg)' : (isNew ? 'var(--accent)' : 'var(--pin, var(--accent))')}" stroke-width="${isSel ? 2 : 1.5}"/>`
              + `<text class="cnt" x="${c.x}" y="${c.y + 4}" text-anchor="middle">${n}</text></g>`;
          }
        }
      }
      const fa = this.shadowRoot.activeElement, fid = fa && fa.dataset && fa.dataset.ids;
      this.svg.innerHTML = out;
      if (fid) { const el = [...this.svg.querySelectorAll('.pin')].find(g => g.dataset.ids === fid || g.dataset.ids.split(',').includes(fid.split(',')[0])); el && el.focus({ preventScroll: true }); }
      if (!hero) this.controls(proj, w);
    }
  }
  customElements.define('mena-map', MenaMap);
})();
