// <mena-map> — MENA deployment map (d3-geo prototype of the MapLibre island).
// Attributes: pins (JSON [{id,lat,lon,cc,label,n,t,d,ti,op,site,when,tl,img,logo,href}]), selected, mode ("hero"|"full"),
//   focus (cc), dir, pad-end (px), label, locale, labels (JSON of UI strings),
//   timeline (boolean: show the time-lapse bar), layers (boolean: show the country layer switch),
//   countries (JSON {CC:{s,m,r,of}}: readiness score, max, rank, ranked countries)
// Emits: "pinselect" (bubbles, composed) + window "rm:pin" {detail:{id}} + window "rm:country" {detail:{cc}}
(function () {
  if (customElements.get('mena-map')) return;
  const TOPO = { lo: '/vendor/countries-110m.json', hi: '/vendor/countries-50m.json' };
  const MENA = new Set(['784','682','634','048','414','512','818','504','400','788','012','434','368','422','887','376','275','760','729','478','732']);
  const CC = { AE:'784', SA:'682', QA:'634', BH:'048', KW:'414', OM:'512', EG:'818', MA:'504', JO:'400', TN:'788', DZ:'012', LY:'434', IQ:'368', LB:'422', YE:'887', SY:'760', SD:'729', MR:'478', PS:'275' };
  const ID2CC = Object.fromEntries(Object.entries(CC).map(([k, v]) => [v, k]));
  const NAMES = {'784':['UAE','الإمارات'],'682':['Saudi Arabia','السعودية'],'634':['Qatar','قطر'],'818':['Egypt','مصر'],'504':['Morocco','المغرب'],'512':['Oman','عُمان'],'400':['Jordan','الأردن'],'414':['Kuwait','الكويت'],'788':['Tunisia','تونس'],'012':['Algeria','الجزائر'],'434':['Libya','ليبيا'],'368':['Iraq','العراق'],'887':['Yemen','اليمن'],'729':['Sudan','السودان'],'048':['Bahrain','البحرين']};
  // Robot types: colour token (set per theme by the page, with fallbacks here) and a 24px line icon.
  const TYPE = {
    av: ['#D65336', 'M4.5 14.5L6 10h12l1.5 4.5M3.5 14.5h17v3.5h-17zM6.5 18v2M17.5 18v2M8.5 7c2-1.6 5-1.6 7 0M10.2 8.6c1-.7 2.6-.7 3.6 0'],
    drone: ['#2F74B5', 'M9.5 11h5v3h-5zM3.5 7h5M15.5 7h5M6 7v4h3.5M18 7v4h-3.5M10 14l-1.5 3M14 14l1.5 3'],
    arm: ['#B97C0C', 'M3.5 21h9M5.5 21v-2.5h5V21M8 18.5L10.5 11l6.5-3.5M17 7.5l3 1.5M17 7.5l1-3M10.5 11m-1.25 0a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 1 0-2.5 0'],
    amr: ['#166773', 'M3 9.5h18v7H3zM7 9.5V6.5h10v3M7.5 13h9M5 18.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M16 18.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0'],
    humanoid: ['#7A56C2', 'M12 3a2.25 2.25 0 1 1 0 4.5a2.25 2.25 0 1 1 0-4.5M8.5 9.5h7v6.5h-7zM10 16v5M14 16v5M8.5 10.5L5.5 14.5M15.5 10.5l3 4M10.5 12h3'],
    quadruped: ['#B4417A', 'M5 9h11l3 2.5V13H5zM19 11.5h2M7 13l-1.5 6.5M9.5 13l1 6.5M14.5 13l-1 6.5M17 13l1.5 6.5'],
    service: ['#5C7F1E', 'M8 3.5h8v6H8zM10.5 6.5h.01M13.5 6.5h.01M12 9.5V12M7 12h10l-1 8.5H8zM9.5 15.5h5']
  };
  const tcol = t => TYPE[t] ? `var(--t-${t},${TYPE[t][0]})` : 'var(--pin, var(--accent))';
  // The GCC is the map's centre of gravity: the view is centred on the Gulf, wide enough that Egypt,
  // the Levant and the Maghreb stay visible. Mercator keeps every country's shape true at these latitudes.
  const GCC = [49, 25.5];
  const REGION = [[GCC[0] - 62, GCC[1] - 16], [GCC[0] + 62, GCC[1] + 22]];
  // Phones start closer in on the GCC (Levant to Oman); the Maghreb is a pan or zoom-out away.
  const REGION_NARROW = [[GCC[0] - 22, GCC[1] - 14], [GCC[0] + 22, GCC[1] + 14]];
  const LIMIT = [[-40, -20], [140, 62]];
  const flat = b => d3.geoMercator().rotate([-(b[0][0] + b[1][0]) / 2, 0]);
  const MIN_SPAN = 0.8, NS_R = 28;
  const cache = {};
  const libs = () => new Promise(r => { const t = () => (window.d3 && window.topojson) ? r() : setTimeout(t, 40); t(); });
  const load = k => cache[k] || (cache[k] = libs().then(() => fetch(TOPO[k])).then(r => r.json()).then(t => {
    const o = t.objects.countries;
    const features = topojson.feature(t, o).features;
    features.forEach(f => { f.bb = d3.geoBounds(f); });
    return { features, borders: topojson.mesh(t, o, (a, b) => a !== b), coast: topojson.mesh(t, o, (a, b) => a === b) };
  }));
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const I = {
    plus: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M8 3v10M3 8h10"/></svg>',
    minus: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 8h10"/></svg>',
    reset: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"/><path d="M2.5 2.5v3h3"/></svg>',
    full: '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10"/></svg>',
    play: '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3.5 2v10l8.5-5z"/></svg>',
    pause: '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M3 2h3v10H3zM8 2h3v10H8z"/></svg>',
    replay: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 8a5.5 5.5 0 1 0 1.6-3.9"/><path d="M2.5 2.5v3h3"/></svg>'
  };
  const L = {
    en: { in: 'Zoom in', out: 'Zoom out', reset: 'Reset view', full: 'Full screen', km: 'km', play: 'Play the time-lapse', pause: 'Pause', replay: 'Replay', time: 'Timeline', dep: 'Deployments', cty: 'Countries', layer: 'Map layer', off: 'Pins', score: 'Readiness', count: 'Activity', scoreLeg: 'Readiness score', countLeg: 'Deployments per country', noDossier: 'Not profiled', open: 'Open record', close: 'Close', zoom: 'Select to zoom in', more: '+{n} more', depN: '{n} deployments', of: 'of', rank: 'Ranked {r} of {n}', pickCty: 'Select for the country profile' },
    ar: { in: 'تكبير', out: 'تصغير', reset: 'إعادة الضبط', full: 'ملء الشاشة', km: 'كم', play: 'تشغيل العرض الزمني', pause: 'إيقاف مؤقت', replay: 'إعادة التشغيل', time: 'الخط الزمني', dep: 'عمليات النشر', cty: 'الدول', layer: 'طبقة الخريطة', off: 'النقاط', score: 'الجاهزية', count: 'النشاط', scoreLeg: 'مؤشر الجاهزية', countLeg: 'عمليات النشر لكل دولة', noDossier: 'غير مُدرجة', open: 'فتح السجل', close: 'إغلاق', zoom: 'اختر للتكبير', more: '+{n} أخرى', depN: 'عمليات النشر: {n}', of: 'من', rank: 'المرتبة {r} من {n}', pickCty: 'اختر لفتح ملف الدولة' }
  };

  class MenaMap extends HTMLElement {
    static get observedAttributes() { return ['pins', 'selected', 'mode', 'focus', 'dir', 'pad-end', 'label', 'timeline', 'layers', 'countries', 'labels', 'locale', 'padend']; }
    constructor() {
      super();
      this.bbox = REGION.map(p => p.slice());
      this.layer = 'off'; this.tlIdx = -1; this.fresh = new Map(); this.hover = null;
      const r = this.attachShadow({ mode: 'open' });
      r.innerHTML = `<style>
        :host{display:block;position:relative;width:100%;height:100%;overflow:hidden;background:var(--map-sea,transparent);font-family:'Inter','Noto Sans Arabic',sans-serif}
        :host>svg{display:block;width:100%;height:100%;outline:none;touch-action:pan-y}
        .grp button svg{width:16px;height:16px;flex:none;display:block}
        :host([mode=full])>svg{cursor:grab}
        :host([data-drag])>svg{cursor:grabbing}
        .pin{cursor:pointer;outline:none}
        .pin:focus-visible .hit{stroke:var(--accent-text);stroke-width:2.5}
        .pin .glyph{transition:transform .15s;transform-box:fill-box;transform-origin:center}
        .pin:hover .glyph,.pin.hov .glyph{transform:scale(1.18)}
        :host([data-layer]) .pin{opacity:.8}
        .ring{fill:none;stroke:var(--accent);stroke-width:1.25;transform-box:fill-box;transform-origin:center;animation:p 2.6s cubic-bezier(.2,.6,.3,1) infinite}
        .rip{fill:none;stroke-width:2;transform-box:fill-box;transform-origin:center;animation:p 1s cubic-bezier(.2,.6,.3,1) 1 both}
        .drop{animation:drop .55s cubic-bezier(.2,.9,.3,1.25) 1 both}
        @keyframes p{0%{transform:scale(.5);opacity:.95}100%{transform:scale(3.2);opacity:0}}
        @keyframes drop{0%{transform:translateY(-26px);opacity:0}60%{opacity:1}100%{transform:translateY(0);opacity:1}}
        .cty{cursor:pointer;transition:filter .15s}
        .cty:hover,.cty.hov{filter:brightness(.94)}
        .lbl{font:500 10px 'DM Mono','IBM Plex Mono',monospace;letter-spacing:.1em;fill:var(--fg-muted);text-transform:uppercase;pointer-events:none;paint-order:stroke;stroke:var(--map-land-mena);stroke-width:3px;stroke-linejoin:round}
        .lbl.ar{font:500 12px 'Inter','Noto Sans Arabic',sans-serif;letter-spacing:0}
        .lbl tspan.v{font:600 12px 'DM Mono','IBM Plex Mono',monospace;fill:var(--fg);letter-spacing:0}
        .cnt{font:600 11px 'DM Mono','IBM Plex Mono',monospace;fill:var(--fg);pointer-events:none;font-variant-numeric:tabular-nums}
        .bar{position:absolute;bottom:16px;inset-inline-start:16px;display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
        .bar[hidden],.tl[hidden],.lay[hidden],.card[hidden],.leg[hidden]{display:none}
        .grp{display:flex;background:var(--bg-raised);border:1px solid var(--line-strong);box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 24px rgba(18,18,26,.08)}
        .grp button{height:40px;min-width:40px;padding:0 12px;border:0;border-inline-end:1px solid var(--line);background:transparent;color:var(--fg);font:500 13px 'Inter','Noto Sans Arabic',sans-serif;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap}
        .grp button:last-child{border-inline-end:0}
        .grp button:hover:not(:disabled){background:var(--bg-hover)}
        .grp button:disabled{color:var(--fg-subtle);opacity:.45;cursor:default}
        .grp button:focus-visible,.tl button:focus-visible,.tl input:focus-visible,.card a:focus-visible,.card button:focus-visible{outline:2px solid var(--accent-text);outline-offset:-2px}
        .grp button.rs[data-on]{color:var(--accent-text)}
        .lay button[aria-pressed=true]{background:var(--fg);color:var(--bg)}
        .lay button i{width:8px;height:8px;border-radius:50%;display:block}
        .scale{display:flex;flex-direction:column;gap:4px;padding:6px 10px;background:var(--bg-glass,var(--bg-raised));border:1px solid var(--line);font:500 11px 'DM Mono','IBM Plex Mono',monospace;color:var(--fg-muted)}
        .scale i{display:block;height:6px;border:1.5px solid var(--fg-muted);border-top:0}
        .top{position:absolute;top:16px;inset-inline-start:16px;display:flex;flex-direction:column;align-items:flex-start;gap:8px;max-width:calc(100% - 32px)}
        .leg{display:flex;align-items:center;gap:10px;padding:8px 10px;background:var(--bg-glass,var(--bg-raised));border:1px solid var(--line);font:500 11px 'DM Mono','IBM Plex Mono',monospace;color:var(--fg-muted);flex-wrap:wrap}
        .leg .ramp{width:120px;height:8px;border:1px solid var(--line)}
        .leg .nd{display:inline-flex;align-items:center;gap:6px}
        .leg .nd i{width:12px;height:8px;background:var(--map-land-mena);border:1px solid var(--line-strong)}
        .tl{position:absolute;bottom:16px;display:flex;align-items:center;gap:12px;padding:8px 12px 8px 8px;background:var(--bg-raised);border:1px solid var(--line-strong);box-shadow:0 1px 2px rgba(0,0,0,.06),0 8px 24px rgba(18,18,26,.08)}
        :host([dir=rtl]) .tl{padding:8px 8px 8px 12px}
        .tl .pp{width:40px;height:40px;flex:none;border:0;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;cursor:pointer}
        .tl .pp:hover{background:var(--accent-hover,#C24A2F)}
        .tl .mid{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
        .tl .mo{font:600 13px 'DM Mono','IBM Plex Mono',monospace;color:var(--fg);white-space:nowrap}
        .tl input{width:100%;margin:0;accent-color:var(--accent);height:18px;cursor:pointer}
        .tl .ax{display:flex;justify-content:space-between;font:500 10px 'DM Mono','IBM Plex Mono',monospace;color:var(--fg-subtle);letter-spacing:.06em}
        .tl .st{display:flex;gap:14px;flex:none;padding-inline-start:12px;border-inline-start:1px solid var(--line)}
        .tl .st span{display:flex;flex-direction:column;gap:2px}
        .tl .st b{font:600 20px/1 'DM Mono','IBM Plex Mono',monospace;color:var(--fg);font-variant-numeric:tabular-nums}
        .tl .st small{font:500 10px 'DM Mono','IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-subtle)}
        :host([dir=rtl]) .tl .st small{letter-spacing:0;font-family:'Inter','Noto Sans Arabic',sans-serif;font-size:11px}
        :host([data-narrow]) .tl{bottom:auto;top:68px;inset-inline:16px!important;width:auto!important;padding:6px 10px 6px 6px;gap:10px}
        :host([data-narrow]) .tl .pp{width:34px;height:34px}
        :host([data-narrow]) .tl .st b{font-size:16px}
        :host([data-narrow]) .tl .ax{display:none}
        .card{position:absolute;z-index:3;width:264px;background:var(--bg-raised);border:1px solid var(--line-strong);box-shadow:0 2px 4px rgba(0,0,0,.08),0 16px 40px rgba(18,18,26,.18);overflow:hidden;font-size:13px;color:var(--fg);animation:cin .14s ease-out}
        @keyframes cin{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
        .card .ph{position:relative;height:124px;background:var(--bg-hover);overflow:hidden}
        .card .ph img{width:100%;height:100%;object-fit:cover;display:block}
        .card .lg{position:absolute;bottom:-14px;inset-inline-start:12px;width:36px;height:36px;border:2px solid var(--bg-raised);background:#fff;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.15)}
        .card .lg img{width:100%;height:100%;object-fit:cover;display:block}
        .card .bd{padding:12px 14px 14px;display:flex;flex-direction:column;gap:6px}
        .card .lg2{width:40px;height:40px;border:1px solid var(--line-strong);background:#fff;overflow:hidden;margin-bottom:4px}
        .card .lg2 img{width:100%;height:100%;object-fit:cover;display:block}
        .card .ph+.bd{padding-top:22px}
        .card .ty{display:flex;align-items:center;gap:6px;font:500 11px 'DM Mono','IBM Plex Mono',monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--fg-muted)}
        :host([dir=rtl]) .card .ty{letter-spacing:0;font-family:'Inter','Noto Sans Arabic',sans-serif}
        .card .ty i{width:8px;height:8px;border-radius:50%;flex:none}
        .card h4{margin:0;font-size:15px;line-height:1.3;font-weight:600}
        .card .sub{color:var(--fg-muted);font-size:12px;line-height:1.4}
        .card .ft{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:4px;padding-top:8px;border-top:1px solid var(--line)}
        .card .ft span{font:500 12px 'DM Mono','IBM Plex Mono',monospace;color:var(--fg-subtle)}
        .card a{color:var(--accent-text);font-weight:500;text-decoration:none;font-size:12px}
        .card a:hover{text-decoration:underline}
        .card .x{position:absolute;top:8px;inset-inline-end:8px;width:28px;height:28px;border:0;border-radius:50%;background:var(--bg-glass,var(--bg-raised));color:var(--fg);cursor:pointer;font-size:13px;z-index:1}
        .card ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
        .card li{display:flex;gap:8px;align-items:baseline;font-size:12px;line-height:1.35}
        .card li i{width:7px;height:7px;border-radius:50%;flex:none;transform:translateY(-1px)}
        .card .big{font:600 26px/1 'DM Mono','IBM Plex Mono',monospace}
        .card .big small{font-size:13px;color:var(--fg-subtle);font-weight:500}
        .card .meter{height:6px;background:var(--line);position:relative}
        .card .meter i{position:absolute;inset-block:0;inset-inline-start:0;background:var(--sand)}
        @media (prefers-reduced-motion:reduce){.ring{animation:none;opacity:.6;transform:scale(1.6)}.rip,.drop,.card{animation:none}}
      </style><svg role="group"></svg>
      <div class="top"><div class="grp lay" role="group" hidden><button data-l="off"></button><button data-l="score"><i style="background:var(--sand)"></i></button><button data-l="count"><i style="background:var(--accent)"></i></button></div><div class="leg" hidden></div></div>
      <div class="tl" role="group" hidden><button class="pp" type="button"></button><div class="mid"><span class="mo" aria-hidden="true"></span><input type="range" min="0" max="0" step="1" value="0"><div class="ax"><span></span><span></span></div></div><div class="st" aria-live="polite"><span><b class="nd">0</b><small class="ndl"></small></span><span><b class="nc">0</b><small class="ncl"></small></span></div></div>
      <div class="card" hidden></div>
      <div class="bar" hidden>
        <div class="grp"><button data-z="in"></button><button data-z="out"></button></div>
        <div class="grp"><button data-z="reset" class="rs"></button><button data-z="full"></button></div>
        <div class="scale" aria-hidden="true"><span></span><i></i></div>
      </div>`;
      this.svg = r.querySelector('svg');
      this.bar = r.querySelector('.bar');
      this.tlEl = r.querySelector('.tl'); this.range = this.tlEl.querySelector('input'); this.ppBtn = this.tlEl.querySelector('.pp');
      this.layEl = r.querySelector('.lay'); this.legEl = r.querySelector('.leg'); this.cardEl = r.querySelector('.card');
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
      this.layEl.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; this.layer = b.dataset.l; this.hideCard(); this.render(); });
      // time-lapse
      this.ppBtn.addEventListener('click', () => this.playing ? this.stop() : this.play());
      this.range.addEventListener('input', () => { this.stop(); this.setIdx(+this.range.value, true); });
      this.svg.addEventListener('click', e => {
        if (this.dragged) { this.dragged = false; return; }
        const p = e.target.closest('.pin');
        if (p) { this.activate(p); return; }
        const c = e.target.closest('.cty');
        if (c) { window.dispatchEvent(new CustomEvent('rm:country', { detail: { cc: c.dataset.cc } })); return; }
        if (this.hover && this.hover.touch) this.hideCard();
      });
      this.svg.addEventListener('keydown', e => {
        const p = e.target.closest && e.target.closest('.pin');
        if (p && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); this.activate(p); return; }
        const c = e.target.closest && e.target.closest('.cty');
        if (c && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); window.dispatchEvent(new CustomEvent('rm:country', { detail: { cc: c.dataset.cc } })); return; }
        if (e.key === 'Escape') { this.hideCard(); return; }
        if (this.mode() !== 'full') return;
        const s = [this.bbox[1][0] - this.bbox[0][0], this.bbox[1][1] - this.bbox[0][1]];
        const mv = { ArrowLeft: [-.15, 0], ArrowRight: [.15, 0], ArrowUp: [0, .15], ArrowDown: [0, -.15] }[e.key];
        if (mv) { e.preventDefault(); this.animateTo(this.clamp([[this.bbox[0][0] + mv[0] * s[0], this.bbox[0][1] + mv[1] * s[1]], [this.bbox[1][0] + mv[0] * s[0], this.bbox[1][1] + mv[1] * s[1]]])); }
        if (e.key === '+' || e.key === '=') this.zoomBy(0.6);
        if (e.key === '-') this.zoomBy(1.6);
        if (e.key === '0') this.animateTo(this.focusBox());
      });
      // hover / focus cards (mouse and keyboard; touch uses the selected pin instead)
      const over = (el, touch) => {
        if (!el || this.mode() !== 'full' || this.drag && this.drag.moved) return;
        const key = el.classList.contains('pin') ? 'p:' + el.dataset.ids : 'c:' + el.dataset.cc;
        clearTimeout(this.hideT);
        if (this.hover && this.hover.key === key) return;
        this.hover = { key, el, touch };
        this.showCard();
      };
      this.svg.addEventListener('pointerover', e => { if (e.pointerType !== 'mouse') return; over(e.target.closest('.pin') || e.target.closest('.cty')); });
      this.svg.addEventListener('pointerout', e => { if (e.pointerType !== 'mouse') return; const to = e.relatedTarget; const el = e.target.closest('.pin,.cty'); if (el && to && el.contains(to)) return; this.hideSoon(); });
      this.svg.addEventListener('focusin', e => over(e.target.closest('.pin') || e.target.closest('.cty')));
      this.svg.addEventListener('focusout', () => this.hideSoon());
      this.cardEl.addEventListener('pointerenter', () => clearTimeout(this.hideT));
      this.cardEl.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') this.hideSoon(); });
      this.cardEl.addEventListener('click', e => {
        if (e.target.closest('.x')) { this.hideCard(); if (this.getAttribute('selected')) window.dispatchEvent(new CustomEvent('rm:pin', { detail: { id: null } })); }
        const z = e.target.closest('[data-zoom]'); if (z) { const p = [...this.svg.querySelectorAll('.pin')].find(g => g.dataset.ids === z.dataset.zoom); this.hideCard(); p && this.activate(p); }
        const cc = e.target.closest('[data-cty]'); if (cc) { this.hideCard(); window.dispatchEvent(new CustomEvent('rm:country', { detail: { cc: cc.dataset.cty } })); }
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
        if (!d.moved) { d.moved = true; this.svg.setPointerCapture(e.pointerId); this.setAttribute('data-drag', ''); cancelAnimationFrame(this.raf); this.hideCard(); }
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
    // The page's template engine lower-cases attribute names to "padend"; accept both spellings.
    padEnd() { return +(this.getAttribute('pad-end') || this.getAttribute('padend')) || 0; }
    lang() { return this.getAttribute('dir') === 'rtl' ? 'ar' : 'en'; }
    t(k) { let o = {}; try { o = JSON.parse(this.getAttribute('labels') || '{}'); } catch (e) {} return o[k] != null ? o[k] : L[this.lang()][k]; }
    loc() { return this.getAttribute('locale') || (this.lang() === 'ar' ? 'ar-AE-u-nu-latn' : 'en-GB'); }
    num(n) { return new Intl.NumberFormat(this.loc()).format(n); }
    allPins() { if (this._pa !== this.getAttribute('pins')) { this._pa = this.getAttribute('pins'); try { this._pins = JSON.parse(this._pa || '[]'); } catch (e) { this._pins = []; } } return this._pins; }
    countries() { if (this._ca !== this.getAttribute('countries')) { this._ca = this.getAttribute('countries'); try { this._cty = JSON.parse(this._ca || '{}'); } catch (e) { this._cty = {}; } } return this._cty; }
    // Timeline: one step per calendar month, from the first deployment to the current month.
    months() {
      const ds = this.allPins().map(p => p.d).filter(Boolean).sort();
      if (!ds.length) return [];
      const now = new Date().toISOString().slice(0, 7), last = ds[ds.length - 1].slice(0, 7) > now ? ds[ds.length - 1].slice(0, 7) : now;
      const out = []; let [y, m] = ds[0].slice(0, 7).split('-').map(Number);
      while (true) { const k = y + '-' + String(m).padStart(2, '0'); out.push(k); if (k >= last || out.length > 240) break; m++; if (m > 12) { m = 1; y++; } }
      return out;
    }
    tlOn() { return this.hasAttribute('timeline') && this.mode() === 'full'; }
    cutoff() { const ms = this.months(); if (!this.tlOn() || this.tlIdx < 0 || this.tlIdx >= ms.length - 1) return null; return ms[this.tlIdx] + '-31'; }
    pins() { const c = this.cutoff(); const ps = this.allPins(); return c ? ps.filter(p => !p.d || p.d <= c) : ps; }
    setIdx(i, user) {
      const ms = this.months(); i = Math.max(0, Math.min(ms.length - 1, i));
      const before = new Set(this.pins().map(p => p.id));
      this.tlIdx = i;
      const now = performance.now();
      if (!user || this.playing) this.pins().forEach(p => { if (!before.has(p.id)) this.fresh.set(p.id, now); });
      this.render();
    }
    play() {
      const ms = this.months(); if (ms.length < 2) return;
      if (this.tlIdx < 0 || this.tlIdx >= ms.length - 1) { this.tlIdx = 0; this.fresh.clear(); this.pins().forEach(p => this.fresh.set(p.id, performance.now())); }
      this.playing = true; this.hideCard(); this.render();
      const step = reduced() ? 700 : 360;
      clearInterval(this.tick);
      this.tick = setInterval(() => { if (this.tlIdx >= this.months().length - 1) { this.stop(); return; } this.setIdx(this.tlIdx + 1); }, step);
    }
    stop() { if (!this.playing) return; this.playing = false; clearInterval(this.tick); this.render(); }
    connectedCallback() {
      if (!this.hasAttribute('mode')) this.setAttribute('mode', 'full');
      load('lo').then(g => { if (!this.geo) { this.geo = g; this.render(); } });
      if (this.mode() === 'full') load('hi').then(g => { this.geo = g; this.render(); });
      this.ro = new ResizeObserver(() => this.render()); this.ro.observe(this);
      this.labels();
    }
    disconnectedCallback() { this.ro && this.ro.disconnect(); cancelAnimationFrame(this.raf); clearInterval(this.tick); }
    attributeChangedCallback(n, o, v) {
      if (o === v) return;
      if (n === 'focus') { this.animateTo(this.focusBox()); return; }
      if (n === 'mode' && v === 'full') load('hi').then(g => { this.geo = g; this.render(); });
      if (n === 'dir' || n === 'labels') this.labels();
      if (n === 'pins') { this.fresh.clear(); if (!this.playing) this.tlIdx = -1; }
      if (n === 'selected') { this.hideCard(); if (v) this.hover = { key: 'p:' + v, sel: true }; }
      this.render();
    }
    labels() {
      const t = k => this.t(k);
      this.btn.in.setAttribute('aria-label', t('in')); this.btn.in.title = t('in');
      this.btn.out.setAttribute('aria-label', t('out')); this.btn.out.title = t('out');
      this.btn.full.setAttribute('aria-label', t('full')); this.btn.full.title = t('full');
      this.btn.reset.innerHTML = I.reset + '<span>' + esc(t('reset')) + '</span>';
      this.layEl.setAttribute('aria-label', t('layer'));
      this.layEl.querySelectorAll('button').forEach(b => { const i = b.querySelector('i'); b.textContent = t(b.dataset.l); i && b.prepend(i); });
      this.tlEl.setAttribute('aria-label', t('time'));
      this.range.setAttribute('aria-label', t('time'));
      this.tlEl.querySelector('.ndl').textContent = t('dep'); this.tlEl.querySelector('.ncl').textContent = t('cty');
    }
    focusBox() {
      const cc = this.getAttribute('focus');
      const ps = this.allPins().filter(p => !cc || p.cc === cc);
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
      this.hideCard();
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
    hideSoon() { clearTimeout(this.hideT); this.hideT = setTimeout(() => this.hideCard(), 180); }
    hideCard() { clearTimeout(this.hideT); this.hover = null; this.cardEl.hidden = true; this.svg.querySelectorAll('.hov').forEach(e => e.classList.remove('hov')); }
    // The mini card: one deployment (photo, logo, title), a cluster (list) or a country (score / count).
    showCard() {
      const h = this.hover; if (!h || this.mode() !== 'full' || !this.proj) { this.cardEl.hidden = true; return; }
      const t = k => this.t(k), [kind, id] = [h.key.slice(0, 1), h.key.slice(2)];
      let html = '', at = null;
      if (kind === 'p') {
        const g = [...this.svg.querySelectorAll('.pin')].find(x => x.dataset.ids === id || (h.sel && x.dataset.ids.split(',').includes(id)));
        if (!g) { this.cardEl.hidden = true; return; }
        if (h.sel && g.dataset.ids !== id) { this.cardEl.hidden = true; return; }
        g.classList.add('hov');
        at = [+g.dataset.x, +g.dataset.y, +g.dataset.r];
        const ids = g.dataset.ids.split(','), ps = this.pins().filter(p => ids.includes(p.id));
        if (ps.length === 1) {
          const p = ps[0];
          html = (p.img ? `<div class="ph"><img src="${esc(p.img)}" alt="" loading="lazy">${p.logo ? `<span class="lg"><img src="${esc(p.logo)}" alt=""></span>` : ''}</div>` : '')
            + `<div class="bd">${!p.img && p.logo ? `<span class="lg2"><img src="${esc(p.logo)}" alt=""></span>` : ''}<span class="ty"><i style="background:${tcol(p.t)}"></i>${esc(p.tl || '')}</span><h4>${esc(p.ti || p.label)}</h4><span class="sub">${esc([p.op, p.site].filter(Boolean).join(' · '))}</span>`
            + `<div class="ft"><span>${esc(p.when || '')}</span>${p.href ? `<a href="${esc(p.href)}">${esc(t('open'))} →</a>` : ''}</div></div>`;
          if (h.sel) html = `<button class="x" type="button" aria-label="${esc(t('close'))}">✕</button>` + html;
        } else {
          const top = ps.slice().sort((a, b) => (b.d || '').localeCompare(a.d || ''));
          html = `<div class="bd"><span class="ty">${esc(t('depN').replace('{n}', this.num(ps.length)))}</span><ul>${top.slice(0, 4).map(p => `<li><i style="background:${tcol(p.t)}"></i><span>${esc(p.ti || p.label)}</span></li>`).join('')}</ul>`
            + `<div class="ft"><span>${top.length > 4 ? esc(t('more').replace('{n}', this.num(top.length - 4))) : ''}</span><a href="#" data-zoom="${esc(g.dataset.ids)}" onclick="return false">${esc(t('zoom'))} →</a></div></div>`;
        }
      } else {
        const g = this.svg.querySelector(`.cty[data-cc="${id}"]`); if (!g) { this.cardEl.hidden = true; return; }
        g.classList.add('hov');
        const c = this.countries()[id], nm = (NAMES[CC[id]] || [id, id])[this.lang() === 'ar' ? 1 : 0], n = this.pins().filter(p => p.cc === id).length;
        const r = this.svg.getBoundingClientRect(), b = g.getBBox();
        at = [b.x + b.width / 2, b.y + b.height / 2, 0];
        const ft = `<div class="ft"><span>${esc(t('depN').replace('{n}', this.num(n)))}</span>${c ? `<a href="#" data-cty="${id}" onclick="return false">${esc(t('pickCty'))} →</a>` : ''}</div>`;
        if (this.layer === 'score' && c) html = `<div class="bd"><span class="ty">${esc(t('scoreLeg'))}</span><h4>${esc(nm)}</h4><span class="big" dir="ltr">${this.num(c.s)} <small>/ ${this.num(c.m)}</small></span><span class="meter"><i style="width:${Math.round(c.s / c.m * 100)}%"></i></span><span class="sub">${esc(t('rank').replace('{r}', this.num(c.r)).replace('{n}', this.num(c.of)))}</span>${ft}</div>`;
        else html = `<div class="bd"><span class="ty">${esc(this.layer === 'score' ? t('noDossier') : t('countLeg'))}</span><h4>${esc(nm)}</h4><span class="big">${this.num(n)}</span>${ft}</div>`;
        void r;
      }
      this.cardEl.innerHTML = html; this.cardEl.hidden = false;
      // Place beside the pin, inside the visible map (not under the side panel).
      const W = this.clientWidth, H = this.clientHeight, pad = this.padEnd(), rtl = this.getAttribute('dir') === 'rtl';
      const cw = Math.min(264, W - 32); this.cardEl.style.width = cw + 'px';
      const ch = this.cardEl.offsetHeight, lo = 16 + (rtl ? pad : 0), hi = W - 16 - (rtl ? 0 : pad);
      let x = at[0] - cw / 2; x = Math.max(lo, Math.min(hi - cw, x));
      let y = at[1] - at[2] - 12 - ch; if (y < 12) y = at[1] + at[2] + 12; if (y + ch > H - 12) y = Math.max(12, H - 12 - ch);
      this.cardEl.style.left = x + 'px'; this.cardEl.style.top = y + 'px';
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
      this.scaleEl.querySelector('span').textContent = nice.toLocaleString() + ' ' + this.t('km');
    }
    chrome(w, pad, rtl) {
      // layer switch + legend
      const lay = this.hasAttribute('layers') && this.mode() === 'full';
      this.layEl.hidden = !lay;
      if (!lay) this.layer = 'off';
      this.layEl.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.l === this.layer)));
      this.toggleAttribute('data-layer', this.layer !== 'off');
      this.legEl.hidden = this.layer === 'off';
      if (this.layer === 'score') { const cs = Object.values(this.countries()), m = cs.length ? cs[0].m : 16; this.legEl.innerHTML = `<span>${esc(this.t('scoreLeg'))}</span><span dir="ltr" style="display:inline-flex;align-items:center;gap:6px">0<span class="ramp" style="background:linear-gradient(90deg,${this.ramp('score', 0)},${this.ramp('score', 1)})"></span>${this.num(m)}</span><span class="nd"><i></i>${esc(this.t('noDossier'))}</span>`; }
      if (this.layer === 'count') { const mx = this.maxCount; this.legEl.innerHTML = `<span>${esc(this.t('countLeg'))}</span><span dir="ltr" style="display:inline-flex;align-items:center;gap:6px">0<span class="ramp" style="background:linear-gradient(90deg,${this.ramp('count', 0)},${this.ramp('count', 1)})"></span>${this.num(mx || 0)}</span>`; }
      // time-lapse bar
      const on = this.tlOn(), ms = this.months();
      this.tlEl.hidden = !on || ms.length < 2;
      this.toggleAttribute('data-narrow', w < 720);
      if (on && ms.length > 1) {
        const i = this.tlIdx < 0 ? ms.length - 1 : this.tlIdx, at = i >= ms.length - 1;
        const fm = k => new Intl.DateTimeFormat(this.loc(), { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(k + '-15T12:00:00Z'));
        this.range.max = ms.length - 1; this.range.value = i; this.range.setAttribute('aria-valuetext', fm(ms[i]));
        this.tlEl.querySelector('.mo').textContent = fm(ms[i]);
        const ax = this.tlEl.querySelectorAll('.ax span'); ax[0].textContent = fm(ms[0]); ax[1].textContent = fm(ms[ms.length - 1]);
        const ps = this.pins();
        this.tlEl.querySelector('.nd').textContent = this.num(ps.length);
        this.tlEl.querySelector('.nc').textContent = this.num(new Set(ps.map(p => p.cc)).size);
        this.ppBtn.innerHTML = this.playing ? I.pause : (at ? I.replay : I.play);
        this.ppBtn.setAttribute('aria-label', this.playing ? this.t('pause') : (at ? this.t('replay') : this.t('play')));
        this.ppBtn.title = this.ppBtn.getAttribute('aria-label');
        if (w >= 720) {
          const room = w - 32 - pad, tw = Math.min(560, room - 360);
          if (tw >= 300) { this.tlEl.style.width = tw + 'px'; this.tlEl.style.insetInlineStart = 'auto'; this.tlEl.style.insetInlineEnd = (16 + pad) + 'px'; this.tlEl.style.bottom = '16px'; }
          else { this.tlEl.style.width = Math.min(560, room) + 'px'; this.tlEl.style.insetInlineStart = '16px'; this.tlEl.style.insetInlineEnd = 'auto'; this.tlEl.style.bottom = '72px'; }
        } else { this.tlEl.style.width = ''; this.tlEl.style.bottom = ''; }
      }
    }
    ramp(kind, f) {
      const base = 'var(--map-land-mena)', ink = kind === 'score' ? 'var(--sand)' : 'var(--accent)';
      return `color-mix(in srgb, ${ink} ${Math.round(10 + f * 75)}%, ${base})`;
    }
    render() {
      if (!this.geo) return;
      const w = this.clientWidth, h = this.clientHeight;
      if (!w || !h) return;
      if (!this.homed) { this.homed = true; this.bbox = this.focusBox(); }
      const hero = this.mode() === 'hero', rtl = this.getAttribute('dir') === 'rtl', pad = this.padEnd();
      this.bar.hidden = hero;
      this.svg.setAttribute('aria-label', this.getAttribute('label') || 'Map');
      if (hero) this.svg.setAttribute('aria-hidden', 'true');
      const pinsNow = this.pins();
      const cnt = {}; pinsNow.forEach(p => { cnt[p.cc] = (cnt[p.cc] || 0) + 1; });
      this.maxCount = Math.max(0, ...Object.values(cnt));
      if (!hero) this.chrome(w, pad, rtl);
      const topPad = hero ? 24 : (w < 720 ? (this.tlOn() ? 128 : 72) : (this.hasAttribute('layers') ? 72 : 24));
      const botPad = !hero && w >= 720 && this.tlOn() && this.tlEl.style.bottom === '72px' ? 132 : 72;
      let ext;
      if (hero) ext = null;
      else ext = rtl ? [[24 + pad, topPad], [w - 24, h - botPad]] : [[24, topPad], [w - 24 - pad, h - botPad]];
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
      const fcc = CC[this.getAttribute('focus')];
      const k = proj.scale() / 400;
      const layer = hero ? 'off' : this.layer, cdata = this.countries();
      let out = '';
      if (!hero) out += `<path d="${path(d3.geoGraticule().step([5, 5])())}" fill="none" stroke="var(--line)" stroke-width="0.6" stroke-dasharray="1 3"/>`;
      let lands = '', mena = '';
      for (const f of this.geo.features) {
        const m = MENA.has(f.id), d = path(f);
        if (!m) { lands += `<path d="${d}" fill="var(--map-land)"/>`; continue; }
        const cc = ID2CC[f.id];
        let fill = f.id === fcc ? 'var(--accent-soft)' : 'var(--map-land-mena)', cls = '';
        if (layer === 'score' && cdata[cc]) { fill = this.ramp('score', cdata[cc].s / cdata[cc].m); cls = 'cty'; }
        else if (layer === 'count' && cc) { const n = cnt[cc] || 0; if (n) fill = this.ramp('count', Math.sqrt(n / (this.maxCount || 1))); cls = 'cty'; }
        if (cls) mena += `<path class="cty" data-cc="${cc}" tabindex="0" role="button" aria-label="${esc((NAMES[f.id] || [cc, cc])[rtl ? 1 : 0])}" d="${d}" fill="${fill}"/>`;
        else mena += `<path d="${d}" fill="${fill}"/>`;
      }
      out += lands + mena;
      out += `<path d="${path(this.geo.borders)}" fill="none" stroke="var(--map-border)" stroke-width="${hero ? .5 : .75}" stroke-linejoin="round" pointer-events="none"/>`;
      out += `<path d="${path(this.geo.coast)}" fill="none" stroke="var(--map-coast,var(--map-border))" stroke-width="${hero ? .6 : 1}" stroke-linejoin="round" pointer-events="none"/>`;
      if (fcc) { const f = this.geo.features.find(x => x.id === fcc); if (f) out += `<path d="${path(f)}" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linejoin="round" pointer-events="none"/>`; }
      if (!hero) {
        for (const id in NAMES) {
          const f = this.geo.features.find(x => x.id === id); if (!f) continue;
          if (id === '048' && k < 4) continue;
          const c = path.centroid(f); if (!isFinite(c[0]) || c[0] < 0 || c[0] > w || c[1] < 0 || c[1] > h - 60) continue;
          const cc = ID2CC[id];
          const v = layer === 'score' && cdata[cc] ? cdata[cc].s : layer === 'count' && cnt[cc] ? cnt[cc] : null;
          out += `<text class="lbl${rtl ? ' ar' : ''}" x="${c[0]}" y="${c[1] + 24}" text-anchor="middle">${NAMES[id][rtl ? 1 : 0]}${v != null ? `<tspan class="v" x="${c[0]}" dy="15">${this.num(v)}</tspan>` : ''}</text>`;
        }
      }
      const sel = this.getAttribute('selected');
      const pts = pinsNow.map(p => { const xy = proj([p.lon, p.lat]); return { ...p, x: xy[0], y: xy[1] }; });
      const now = performance.now(), anim = !reduced();
      const age = id => { const t0 = this.fresh.get(id); if (t0 == null) return null; const a = now - t0; if (a > 1000) { this.fresh.delete(id); return null; } return a; };
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
          const ages = anim ? c.m.map(p => age(p.id)).filter(a => a != null) : [], a0 = ages.length ? Math.min(...ages) : null;
          const rip = a0 != null ? `<circle class="rip" cx="${c.x}" cy="${c.y}" r="${n === 1 ? 10 : 14}" stroke="${n === 1 ? tcol(c.m[0].t) : 'var(--accent)'}" style="animation-delay:-${Math.round(a0)}ms"/>` : '';
          if (n === 1) {
            const p = c.m[0], col = tcol(p.t), ic = TYPE[p.t] ? TYPE[p.t][1] : '', a = age(p.id);
            out += `<g class="pin" tabindex="0" role="button" aria-pressed="${isSel ? 'true' : 'false'}" aria-label="${esc(p.label)}" data-ids="${p.id}" data-x="${c.x}" data-y="${c.y}" data-r="11">`
              + rip
              + (isNew ? `<circle class="ring" cx="${c.x}" cy="${c.y}" r="7"/>` : '')
              + (isSel ? `<circle cx="${c.x}" cy="${c.y}" r="15.5" fill="none" stroke="var(--fg)" stroke-width="2"/>` : '')
              + `<circle class="hit" cx="${c.x}" cy="${c.y}" r="16" fill="transparent"/>`
              + `<g${anim && a != null ? ` class="drop" style="animation-delay:-${Math.round(a)}ms"` : ''}><g class="glyph"><circle cx="${c.x}" cy="${c.y}" r="10.5" fill="${col}" stroke="${isNew ? 'var(--accent)' : 'var(--bg-raised)'}" stroke-width="2"/>`
              + (ic ? `<path d="${ic}" transform="translate(${c.x - 7.5} ${c.y - 7.5}) scale(.625)" fill="none" stroke="var(--pin-ink,#fff)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>` : '')
              + `</g></g></g>`;
          } else {
            const r = 12 + Math.sqrt(n) * 3.2;
            // Ring segments show the mix of robot types in the cluster.
            const by = {}; c.m.forEach(p => { by[p.t] = (by[p.t] || 0) + 1; });
            const arc = d3.arc().innerRadius(r - 1).outerRadius(r + 3.5).padAngle(n > 1 ? .04 : 0);
            let a1 = 0, segs = '';
            Object.keys(TYPE).concat(Object.keys(by).filter(x => !TYPE[x])).forEach(t => { if (!by[t]) return; const a2 = a1 + by[t] / n * Math.PI * 2; segs += `<path d="${arc({ startAngle: a1, endAngle: a2 })}" transform="translate(${c.x} ${c.y})" fill="${tcol(t)}"/>`; a1 = a2; });
            out += `<g class="pin" tabindex="0" role="button" aria-label="${n} deployments — activate to zoom in" data-ids="${ids.join(',')}" data-x="${c.x}" data-y="${c.y}" data-r="${r + 4}">`
              + rip
              + (isNew ? `<circle class="ring" cx="${c.x}" cy="${c.y}" r="${r * .6}"/>` : '')
              + `<g class="glyph"><circle cx="${c.x}" cy="${c.y}" r="${r + 7}" fill="${isNew ? 'var(--accent-soft)' : 'var(--pin-soft, var(--accent-soft))'}"/>`
              + `<circle class="hit" cx="${c.x}" cy="${c.y}" r="${r}" fill="var(--bg-raised)" stroke="${isSel ? 'var(--fg)' : 'none'}" stroke-width="2"/>`
              + segs
              + `<text class="cnt" x="${c.x}" y="${c.y + 4}" text-anchor="middle">${n}</text></g></g>`;
          }
        }
      }
      const fa = this.shadowRoot.activeElement, fid = fa && fa.dataset && (fa.dataset.ids || fa.dataset.cc);
      this.svg.innerHTML = out;
      if (fid) { const el = [...this.svg.querySelectorAll('.pin,.cty')].find(g => g.dataset.cc === fid || (g.dataset.ids && (g.dataset.ids === fid || g.dataset.ids.split(',').includes(fid.split(',')[0])))); el && el.focus({ preventScroll: true }); }
      if (!hero) this.controls(proj, w);
      // Keep a card open across re-renders: hover/focus, or the selected pin when the side panel is off-map.
      if (!hero) {
        if (!this.hover && sel && !pad && !this.playing) this.hover = { key: 'p:' + sel, sel: true };
        if (this.hover && this.hover.sel && (pad || this.playing)) this.hover = null;
        if (this.hover && !this.drag) this.showCard(); else this.cardEl.hidden = true;
      }
    }
  }
  customElements.define('mena-map', MenaMap);
})();
