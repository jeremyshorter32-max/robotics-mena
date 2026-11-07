
class Component extends DCLogic {
  qp = new URLSearchParams(window.location.search);
  pref(k) { try { return window.localStorage.getItem('rm-' + k); } catch (e) { return null; } }
  savePref(k, v) { try { window.localStorage.setItem('rm-' + k, v); } catch (e) {} }
  urlTidy = (() => { try { ['lang', 'theme'].forEach(k => { const v = this.qp.get(k); if (v) this.savePref(k, v); }); const u = new URL(window.location.href); ['lang', 'theme', 'accent'].forEach(k => u.searchParams.delete(k)); let p = u.pathname.replace(/index\.html$/, '').replace(/\.html$/, ''); if (u.hash === '#top') u.hash = ''; const next = p + u.search + u.hash; if (next !== window.location.pathname + window.location.search + window.location.hash) window.history.replaceState(window.history.state, '', next); } catch (e) {} return true; })();
  state = { active: 'brief', rails: { brief: { i: 0, n: 0, end: false }, strat: { i: 0, n: 0, end: false } }, lang: null, theme: null, q: '', fCountry: '', fSector: '', fType: '', sel: null, dCat: '', dSort: 'featured', eType: '', eCountry: '', tab: 'company', submitted: false, dbTab: this.qp.get('tab') || 'companies', dbSel: this.qp.get('id') || null, dbQ: this.qp.get('q') || '', dbCountry: '', dbFacet: '', dbSort: '', dbAll: false, dbCopied: false, dAll: false, mapAll: false, mapNear: false, pc: (this.qp.get('c') || 'AE').toUpperCase(), email: '', subscribed: !!this.pref('subscriber'), added: {}, w: window.innerWidth };
  searchRef = React.createRef();
  briefRail = React.createRef(); stratRail = React.createRef(); tabRail = React.createRef();
  NAV_IDS = window.RM_PAGE.nav;
  PAGE = window.RM_PAGE.page;
  PAGES = { policy: '/policy', strategies: '/policy', data: '/policy', compare: '/policy', directory: '/database?tab=companies', events: '/events', submit: '/submit', map: '/map', database: '/database' };
  pageHref(id, c) { const q = this.qsCur || ''; const p = this.PAGES[id]; if (p) return p + q + (c && c !== 'AE' && p === '/policy' ? '?c=' + c : '') + (id === 'compare' ? '#compare' : ''); return id === 'top' ? '/' : '/#' + id; }
  mapRef = React.createRef();
  navH() { const n = document.querySelector('nav[aria-label=Primary]'); return n ? n.offsetHeight : 64; }
  reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  Ticker = ({ value, fmt }) => {
    const ref = React.useRef(null);
    const canAnim = !this.reduced && 'IntersectionObserver' in window;
    const [v, setV] = React.useState(value);
    React.useEffect(() => {
      if (!canAnim || !ref.current) return;
      let raf, done = false;
      const io = new IntersectionObserver(([en]) => {
        if (!en.isIntersecting || done) return; done = true; io.disconnect();
        let s = null; setV(0);
        const step = ts => { if (s === null) s = ts; const p = Math.min(1, (ts - s) / 1400); setV(Math.round(value * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
        raf = requestAnimationFrame(step);
      }, { threshold: 0.6 });
      io.observe(ref.current);
      return () => { io.disconnect(); cancelAnimationFrame(raf); };
    }, [value]);
    return React.createElement('span', { ref }, fmt(v));
  };

  componentDidMount() {
    this.onPin = e => this.setState({ sel: e.detail.id });
    this.onKey = e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); this.searchRef.current && this.searchRef.current.focus(); } if (e.key === 'Escape' && this.state.dbSel) { this.setState({ dbSel: null }); return; } if (e.key === 'Escape' && this.state.q) this.setState({ q: '' }); };
    if (/^#(map|search)/.test(location.hash)) this.setState({ mapNear: true });
    this.onResize = () => this.setState({ w: window.innerWidth });
    window.addEventListener('rm:pin', this.onPin);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.onResize);
    this.onSpy = () => { if (this.spyRaf) return; this.spyRaf = requestAnimationFrame(() => { this.spyRaf = 0; let cur = this.NAV_IDS[0]; for (const id of this.NAV_IDS) { const el = document.getElementById(id); if (el && el.getBoundingClientRect().top <= this.navH() + 32) cur = id; } if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) cur = this.NAV_IDS[this.NAV_IDS.length - 1]; if (cur !== this.state.active) this.setState({ active: cur }); }); };
    window.addEventListener('scroll', this.onSpy, { passive: true });
    if ('IntersectionObserver' in window && this.mapRef.current) { this.mapIO = new IntersectionObserver(([en]) => { if (en.isIntersecting) { this.setState({ mapNear: true }); this.mapIO.disconnect(); } }, { rootMargin: '800px 0px' }); this.mapIO.observe(this.mapRef.current); } else this.setState({ mapNear: true });
    setTimeout(() => { this.railUpdate('brief'); this.railUpdate('strat'); this.onSpy(); }, 300);
  }
  componentDidUpdate() {
    if (this.PAGE === 'database') {
      const key = this.state.dbTab + '|' + (this.state.dbSel || '');
      if (this._dbKey !== key) {
        const wasOpen = this._dbKey && this._dbKey.split('|')[1]; this._dbKey = key;
        try { const u = new URL(window.location.href); u.searchParams.set('tab', this.state.dbTab); if (this.state.dbSel) u.searchParams.set('id', this.state.dbSel); else u.searchParams.delete('id'); u.searchParams.delete('q'); window.history.replaceState(window.history.state, '', u.pathname + u.search); } catch (e) {}
        document.body.style.overflow = this.state.dbSel ? 'hidden' : '';
        if (this.state.dbSel) { const b = document.getElementById('rm-db-close'); b && b.focus(); const c = document.getElementById('rm-db-card'); c && (c.scrollTop = 0); }
        else if (wasOpen && this._dbReturn && document.contains(this._dbReturn)) { this._dbReturn.focus(); }
      }
    }
    if (this.PAGE === 'policy' && this._lastPc !== this.state.pc) { const first = this._lastPc === undefined; this._lastPc = this.state.pc; if (!first && this.PAGE === 'policy') { try { const u = new URL(window.location.href); if (this.state.pc === 'AE') u.searchParams.delete('c'); else u.searchParams.set('c', this.state.pc); window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash); } catch (e) {} } }
    if (this._lastActive !== this.state.active) { this._lastActive = this.state.active; const rail = this.tabRail.current, a = rail && rail.querySelector('[data-tab="' + this.state.active + '"]'); if (a) { const rR = rail.getBoundingClientRect(), aR = a.getBoundingClientRect(); rail.scrollBy({ left: (aR.left + aR.width / 2) - (rR.left + rR.width / 2), behavior: this.reduced ? 'auto' : 'smooth' }); } }
  }
  railEl(k) { return (k === 'brief' ? this.briefRail : this.stratRail).current; }
  railStep(el) { const li = el.querySelector('li'); return li ? li.getBoundingClientRect().width + (parseFloat(getComputedStyle(el).columnGap) || 0) : el.clientWidth; }
  railUpdate(k) { const el = this.railEl(k); if (!el) return; const x = Math.abs(el.scrollLeft), n = el.querySelectorAll('li').length, i = Math.round(x / this.railStep(el)), end = x + el.clientWidth >= el.scrollWidth - 4; const o = this.state.rails[k]; if (o.i !== i || o.n !== n || o.end !== end) this.setState(s => ({ rails: { ...s.rails, [k]: { i, n, end } } })); }
  railMove(k, d) { const el = this.railEl(k); if (!el) return; const r = this.state.rails[k]; if ((d < 0 && r.i === 0) || (d > 0 && r.end)) return; const rtl = getComputedStyle(el).direction === 'rtl'; el.scrollBy({ left: d * this.railStep(el) * (rtl ? -1 : 1), behavior: this.reduced ? 'auto' : 'smooth' }); }
  componentWillUnmount() { this.mapIO && this.mapIO.disconnect(); window.removeEventListener('scroll', this.onSpy); window.removeEventListener('rm:pin', this.onPin); window.removeEventListener('keydown', this.onKey); window.removeEventListener('resize', this.onResize); }

  go(id, c) { const el = document.getElementById(id); if (!el) { window.location.href = this.pageHref(id, c); return; } window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - this.navH() - 8, behavior: this.reduced ? 'auto' : 'smooth' }); }

  ICON = {
    humanoid: 'M12 3a2.25 2.25 0 1 1 0 4.5a2.25 2.25 0 1 1 0-4.5M8.5 9.5h7v6.5h-7zM10 16v5M14 16v5M8.5 10.5L5.5 14.5M15.5 10.5l3 4M10.5 12h3',
    arm: 'M3.5 21h9M5.5 21v-2.5h5V21M8 18.5L10.5 11l6.5-3.5M17 7.5l3 1.5M17 7.5l1-3M10.5 11m-1.25 0a1.25 1.25 0 1 0 2.5 0a1.25 1.25 0 1 0-2.5 0',
    amr: 'M3 9.5h18v7H3zM7 9.5V6.5h10v3M7.5 13h9M5 18.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0M16 18.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0',
    drone: 'M9.5 11h5v3h-5zM3.5 7h5M15.5 7h5M6 7v4h3.5M18 7v4h-3.5M10 14l-1.5 3M14 14l1.5 3',
    av: 'M4.5 14.5L6 10h12l1.5 4.5M3.5 14.5h17v3.5h-17zM6.5 18v2M17.5 18v2M8.5 7c2-1.6 5-1.6 7 0M10.2 8.6c1-.7 2.6-.7 3.6 0',
    quadruped: 'M5 9h11l3 2.5V13H5zM19 11.5h2M7 13l-1.5 6.5M9.5 13l1 6.5M14.5 13l-1 6.5M17 13l1.5 6.5',
    service: 'M8 3.5h8v6H8zM10.5 6.5h.01M13.5 6.5h.01M12 9.5V12M7 12h10l-1 8.5H8zM9.5 15.5h5',
    integrator: 'M3.5 3.5h7v7h-7zM13.5 13.5h7v7h-7zM10.5 7h5.5v6.5M13.5 17H8v-6.5',
    software: 'M3.5 4.5h17v11h-17zM9 20h6M12 15.5V20M8.5 8.5L6.5 10l2 1.5M15.5 8.5l2 1.5-2 1.5M13 8l-2 4'
  };
  CC = Object.fromEntries(window.RM_DATA.countries.map(c => [c.code, [c.name, c.name_ar || c.name]]));
  SECTORS = { logistics: ['Logistics', 'اللوجستيات'], manufacturing: ['Manufacturing', 'التصنيع'], construction: ['Construction', 'البناء'], realestate: ['Real estate', 'العقارات'], hospitality: ['Hospitality', 'الضيافة'], healthcare: ['Healthcare', 'الرعاية الصحية'], security: ['Security', 'الأمن'], energy: ['Energy', 'الطاقة'], mobility: ['Mobility', 'التنقّل'] };
  TYPES = { humanoid: ['Humanoid', 'روبوت بشري'], arm: ['Industrial arm', 'ذراع صناعية'], amr: ['AMR', 'روبوت متنقل ذاتي'], drone: ['Drone', 'طائرة مسيّرة'], av: ['Autonomous vehicle', 'مركبة ذاتية القيادة'], quadruped: ['Quadruped', 'رباعي الأرجل'], service: ['Service robot', 'روبوت خدمة'] };
  CATS = { humanoid: ['Humanoid', 'روبوتات بشرية'], arm: ['Industrial arms', 'أذرع صناعية'], amr: ['AMRs', 'روبوتات متنقلة'], drone: ['Drones', 'مسيّرات'], av: ['Autonomous mobility', 'تنقّل ذاتي'], integrator: ['Integrators', 'مُدمِجو أنظمة'], software: ['Software / AI', 'برمجيات وذكاء اصطناعي'] };
  STAGES = { seed: ['Seed', 'تأسيسية', 1], a: ['Series A', 'الجولة أ', 2], b: ['Series B', 'الجولة ب', 3], growth: ['Growth', 'نمو', 4], corp: ['Established', 'شركة راسخة', 5] };
  DKINDS = { rollout: ['Rollout', 'توسّع في النشر'], deployment: ['New deployment', 'نشر جديد'], entrant: ['New entrant', 'دخول جديد للسوق'] };
  ETYPES = { expo: ['Expo', 'معرض'], conference: ['Conference', 'مؤتمر'], meetup: ['Meetup', 'لقاء'], competition: ['Competition', 'مسابقة'] };

  DEP = window.RM_DATA.deployments.map(d => ({ id: d.id, type: d.type, sector: d.sector, cc: d.country, lat: d.lat, lon: d.lon, date: d.date, n: !!d.is_new, robot: [d.title, d.title_ar || d.title], op: [d.operator, d.operator_ar || d.operator], site: [d.site, d.site_ar || d.site], src: d.source, logo: d.logo || '', kind: d.kind || 'deployment', sum: [d.summary || '', d.summary_ar || d.summary || ''], url: d.source_url || '' }));

  STORIES = window.RM_DATA.stories || [];
  SIGNUP_URL = (window.RM_DATA.site || {}).signup_url || '';
  BRIEF = window.RM_DATA.brief.map(b => [b.country, b.date, b.source, b.title, b.title_ar || b.title, b.takeaway, b.takeaway_ar || b.takeaway, b.image || '', b.image_credit || '', b.source_url || '']);

  CO = window.RM_DATA.companies.map(c => [c.name, c.name_ar || c.name, c.country, c.category, c.stage, c.added, c.summary, c.summary_ar || c.summary, c.id]);

  READY = window.RM_DATA.countries.filter(c => c.in_compare_table).map(c => [c.code, window.RM_DATA.deployments.filter(d => d.country === c.code).length, window.RM_DATA.companies.filter(x => x.country === c.code).length, c.target_year, c.headline_target]).sort((a, b) => b[1] - a[1]);

  STRATS = [
    ['AE','Dubai Robotics & Automation Program','برنامج دبي للروبوتات والأتمتة','Robotics to 9% of Dubai’s GDP; 200,000 robots over 10 years','رفع مساهمة الروبوتات إلى 9% من الناتج المحلي لدبي، و200 ألف روبوت خلال 10 سنوات','Government of Dubai','حكومة دبي','2022','Dubai Media Office'],
    ['AE','Dubai Autonomous Transportation Strategy','استراتيجية دبي للتنقل ذاتي القيادة','25% of all trips in Dubai autonomous by 2030','25% من إجمالي الرحلات في دبي ذاتية القيادة بحلول 2030','Roads & Transport Authority','هيئة الطرق والمواصلات','2016','RTA'],
    ['SA','National Strategy for Data & AI','الاستراتيجية الوطنية للبيانات والذكاء الاصطناعي','Among the top 15 AI nations by 2030','ضمن أفضل 15 دولة في الذكاء الاصطناعي بحلول 2030','SDAIA','سدايا','2020','SDAIA'],
    ['QA','National AI Strategy','الاستراتيجية الوطنية للذكاء الاصطناعي','AI as a pillar of the knowledge economy under QNV 2030','الذكاء الاصطناعي ركيزة لاقتصاد المعرفة ضمن رؤية قطر 2030','Ministry of Communications & IT','وزارة الاتصالات وتكنولوجيا المعلومات','2019','MCIT Qatar'],
    ['EG','National AI Strategy','الاستراتيجية الوطنية للذكاء الاصطناعي','ICT sector at 7.7% of GDP by 2030','قطاع الاتصالات وتكنولوجيا المعلومات بنسبة 7.7% من الناتج المحلي بحلول 2030','Ministry of Communications & IT','وزارة الاتصالات وتكنولوجيا المعلومات','2021','MCIT Egypt'],
    ['MA','Digital Morocco 2030','المغرب الرقمي 2030','A national digital economy and AI talent base by 2030','اقتصاد رقمي وطني وقاعدة مواهب في الذكاء الاصطناعي بحلول 2030','Ministry of Digital Transition','وزارة الانتقال الرقمي','2024','Ministry of Digital Transition']
  ];

  LABS = [
    ['Universities & labs','الجامعات والمختبرات',[
      ['TII–NVIDIA AI & Robotics Lab','مختبر TII وإنفيديا للذكاء الاصطناعي والروبوتات','Abu Dhabi','أبوظبي','Joint lab for embodied AI and simulation','مختبر مشترك للذكاء الاصطناعي المجسّد والمحاكاة'],
      ['MBZUAI Robotics','جامعة محمد بن زايد: الروبوتات','Abu Dhabi','أبوظبي','Graduate robotics department','قسم دراسات عليا في الروبوتات'],
      ['Khalifa University KUCARS','جامعة خليفة: مركز الأنظمة الروبوتية الذاتية','Abu Dhabi','أبوظبي','Centre for autonomous robotic systems','مركز للأنظمة الروبوتية ذاتية التشغيل'],
      ['KAUST Robotics','كاوست: الروبوتات','Thuwal','ثول','Field and marine robotics research','أبحاث الروبوتات الميدانية والبحرية']]],
    ['Accelerators','مسرّعات الأعمال',[
      ['Hub71','هب71','Abu Dhabi','أبوظبي','Tech ecosystem with deep-tech cohorts','منظومة تقنية بدفعات للتقنيات العميقة'],
      ['Dubai Future Accelerators','مسرّعات دبي المستقبل','Dubai','دبي','Government–startup pilot programme','برنامج تجارب بين الحكومة والشركات الناشئة'],
      ['Qatar Science & Technology Park','واحة قطر للعلوم والتكنولوجيا','Doha','الدوحة','Free zone and incubator for hardware','منطقة حرة وحاضنة لشركات العتاد']]],
    ['Competitions','المسابقات',[
      ['MBZIRC','تحدي محمد بن زايد العالمي للروبوتات','Abu Dhabi','أبوظبي','International robotics challenge','تحدٍّ دولي في الروبوتات'],
      ['A2RL','دوري أبوظبي للسباقات ذاتية القيادة','Abu Dhabi','أبوظبي','Autonomous racing league','دوري للسباقات ذاتية القيادة'],
      ['World Robot Olympiad national rounds','الأولمبياد العالمي للروبوت: التصفيات الوطنية','Regional','إقليمي','Student robotics pipeline','مسار طلابي في الروبوتات']]]
  ];

  EVENTS = window.RM_DATA.events.filter(e => !e.tentative).map(e => [e.id, e.start, e.end, e.name, e.name_ar || e.name, e.city, e.city_ar || e.city, e.venue, e.venue_ar || e.venue, e.country, e.type, e.dates_confirmed ? 0 : 1, e.logo || '', e.relevance || '', e.relevance_ar || e.relevance || '', e.url || '']);
  LATER = window.RM_DATA.events.filter(e => e.tentative).map(e => [e.name, e.name_ar || e.name, e.city, e.city_ar || e.city, e.start]);

  PCC = ['AE', 'SA', 'QA', 'EG', 'MA', 'OM'];
  SCOPES = { robotics: ['Robotics', 'روبوتات', 1], autonomy: ['Autonomy', 'قيادة ذاتية', 1], industry: ['Industrial automation', 'أتمتة صناعية', 1], ai: ['AI', 'ذكاء اصطناعي', 0], compute: ['Compute', 'حوسبة', 0], digital: ['Digital economy', 'اقتصاد رقمي', 0] };
  POLICY = {
    AE: {
      sum: ['The region’s most robotics-specific policy stack, with targets set at emirate level by Dubai and Abu Dhabi, under a federal AI strategy.', 'أكثر منظومات السياسات تخصصاً في الروبوتات بالمنطقة، بأهداف تضعها دبي وأبوظبي على مستوى الإمارة ضمن استراتيجية اتحادية للذكاء الاصطناعي.'],
      robo: ['Yes: Dubai RAP, Abu Dhabi SAVI', 'نعم: برنامج دبي وسافي أبوظبي', 2], head: [0, 0],
      progs: [
        ['Dubai Robotics & Automation Program', 'برنامج دبي للروبوتات والأتمتة', 'Government of Dubai', 'حكومة دبي', 2022, 'robotics', [['200,000', '200,000', 'robots deployed in Dubai', 'روبوت يعمل في دبي', 2032], ['9%', '9%', 'robotics’ share of Dubai GDP', 'حصة الروبوتات من الناتج المحلي لدبي', 2032]]],
        ['SAVI: Smart & Autonomous Vehicle Industries cluster', 'سافي: مجموعة الصناعات الذكية وذاتية القيادة', 'ADIO & ADDED, Abu Dhabi', 'مكتب أبوظبي للاستثمار ودائرة التنمية الاقتصادية', 2023, 'autonomy', [['AED 44bn', '44 مليار درهم', 'cluster contribution to Abu Dhabi GDP', 'مساهمة المجموعة في الناتج المحلي لأبوظبي', 2045], ['40,000', '40,000', 'jobs created', 'وظيفة جديدة', 2045]]],
        ['Dubai Autonomous Transportation Strategy', 'استراتيجية دبي للتنقل ذاتي القيادة', 'Roads & Transport Authority', 'هيئة الطرق والمواصلات', 2016, 'autonomy', [['25%', '25%', 'of all trips in Dubai made autonomously', 'من إجمالي الرحلات في دبي ذاتية القيادة', 2030]]],
        ['UAE National Strategy for AI 2031', 'الاستراتيجية الوطنية للذكاء الاصطناعي 2031', 'UAE Government', 'حكومة الإمارات', 2017, 'ai', [['Global leader', 'ريادة عالمية', 'in AI; a qualitative goal with no numeric KPI', 'في الذكاء الاصطناعي، هدف نوعي دون مؤشر رقمي', 2031]]]
      ],
      feat: {
        name: ['SAVI: Smart & Autonomous Vehicle Industries cluster', 'سافي: مجموعة الصناعات الذكية وذاتية القيادة'],
        dek: ['Abu Dhabi’s first industry cluster, built to make the emirate a test, certification and manufacturing base for autonomous systems across air, land, sea and robotics.', 'أول مجموعة صناعية في أبوظبي، أُنشئت لتكون الإمارة قاعدة لاختبار الأنظمة ذاتية التشغيل واعتمادها وتصنيعها في الجو والبر والبحر والروبوتات.'],
        facts: [['Launched', 'الإطلاق', 'October 2023', 'أكتوبر 2023'], ['Base', 'المقر', 'Masdar City, Abu Dhabi', 'مدينة مصدر، أبوظبي'], ['Led by', 'الجهة القائدة', 'ADIO with ADDED', 'مكتب أبوظبي للاستثمار مع دائرة التنمية الاقتصادية'], ['Domains', 'المجالات', 'Air, land, sea, robotics', 'الجو والبر والبحر والروبوتات'], ['Support', 'الدعم', 'Non-dilutive: business facilitation, regulatory guidance, test-zone access', 'دعم دون استحواذ: تسهيل الأعمال والإرشاد التنظيمي والوصول إلى مناطق الاختبار'], ['Governance', 'الحوكمة', 'Smart and Autonomous Systems Council', 'مجلس الأنظمة الذكية وذاتية التشغيل']],
        why: ['For robotics vendors, SAVI is the most direct route in the region to a regulated test zone, and to Abu Dhabi as a launch customer.', 'بالنسبة لمورّدي الروبوتات، سافي هي أقصر طريق في المنطقة إلى منطقة اختبار منظّمة، وإلى أبوظبي بوصفها عميلاً أول.'],
        note: ['Targets differ by source: the cluster site cites AED 22bn of GDP and 15,000 jobs; Abu Dhabi Media Office (Nov 2025) cites AED 44bn and 40,000 jobs by 2045. We show the later figure.', 'تختلف الأهداف بحسب المصدر: يذكر موقع المجموعة 22 مليار درهم و15 ألف وظيفة، بينما يذكر المكتب الإعلامي لأبوظبي (نوفمبر 2025) 44 مليار درهم و40 ألف وظيفة بحلول 2045. نعرض الرقم الأحدث.'],
        ms: [['Oct 2023', 'أكتوبر 2023', 'Cluster launched at Masdar City', 'إطلاق المجموعة في مدينة مصدر'], ['2024', '2024', 'Archer Aviation agreement to build and operate eVTOL aircraft in Abu Dhabi', 'اتفاقية مع آرتشر لتصنيع وتشغيل طائرات eVTOL في أبوظبي'], ['Nov 2025', 'نوفمبر 2025', 'Hub71 becomes the startup gateway into SAVI, announced at DRIFTx', 'هب71 بوابة الشركات الناشئة إلى سافي، أُعلن في DRIFTx'], ['Nov 2025', 'نوفمبر 2025', 'DiDi Autonomous Driving joins; Tensor signs AV-testing MoU with ADIO and DMT', 'انضمام ديدي للقيادة الذاتية، وتوقيع تينسور مذكرة لاختبار المركبات الذاتية']]
      },
      pubs: [
        ['What is SAVI', 'ما هي سافي', 'Abu Dhabi Investment Office', 'مكتب أبوظبي للاستثمار', 'Cluster site', 'موقع المجموعة', '2025', 'https://savi.investwithabudhabi.com/en/what-is-savi'],
        ['SAVI cluster launches at Masdar City', 'إطلاق مجموعة سافي في مدينة مصدر', 'Abu Dhabi Media Office', 'المكتب الإعلامي لأبوظبي', 'Press release', 'بيان صحفي', '2023', 'https://www.mediaoffice.abudhabi/en/technology/in-the-presence-of-hamdan-bin-mohamed-bin-zayed-smart-and-autonomous-vehicles-industries-savi-cluster-launches-at-masdar-city/'],
        ['ADIO and DiDi Autonomous Driving partner on smart mobility', 'شراكة بين مكتب أبوظبي للاستثمار وديدي للقيادة الذاتية', 'Abu Dhabi Media Office', 'المكتب الإعلامي لأبوظبي', 'Press release', 'بيان صحفي', '2025', 'https://www.mediaoffice.abudhabi/en/transport/abu-dhabi-investment-office-and-didi-autonomous-driving-partner-to-accelerate-smart-mobility-in-the-middle-east/'],
        ['Hub71 becomes gateway for mobility startups to join SAVI', 'هب71 بوابة لشركات التنقل الناشئة للانضمام إلى سافي', 'Hub71', 'هب71', 'Press release', 'بيان صحفي', '2025', 'https://www.hub71.com/latest-news/press-release/hub71-becomes-gateway-for-smart-and-autonomous-mobility-startups-to-join-abu-dhabi\'s-savi-cluster'],
        ['Abu Dhabi’s strategic investments in future mobility', 'استثمارات أبوظبي الاستراتيجية في التنقل المستقبلي', 'Bird & Bird', 'بيرد آند بيرد', 'Legal analysis', 'تحليل قانوني', '2025', 'https://www.twobirds.com/en/insights/2025/united-arab-emirates/abu-dhabis-strategic-investments-in-future-mobility-driving-technological-innovation-and-navigating'],
        ['Dubai Robotics & Automation Program', 'برنامج دبي للروبوتات والأتمتة', 'Dubai Media Office', 'المكتب الإعلامي لحكومة دبي', 'Announcement', 'إعلان', '2022', '']
      ]
    },
    SA: {
      sum: ['Automation is framed as industrial policy: a factory-transformation programme, a national AI strategy and a sovereign compute champion.', 'تُطرح الأتمتة بوصفها سياسة صناعية: برنامج لتحويل المصانع، واستراتيجية وطنية للذكاء الاصطناعي، وشركة وطنية للحوسبة.'],
      robo: ['Automation: Future Factories', 'أتمتة: مصانع المستقبل', 1], head: [0, 0],
      progs: [
        ['Future Factories Program', 'برنامج مصانع المستقبل', 'Ministry of Industry & Mineral Resources', 'وزارة الصناعة والثروة المعدنية', 2022, 'industry', [['4,000', '4,000', 'factories moved from low-wage labour to automation', 'مصنع يتحول من العمالة منخفضة الأجر إلى الأتمتة', null]]],
        ['National Strategy for Data & AI', 'الاستراتيجية الوطنية للبيانات والذكاء الاصطناعي', 'SDAIA', 'سدايا', 2020, 'ai', [['Top 15', 'أفضل 15', 'position in global AI rankings', 'مرتبة في التصنيفات العالمية للذكاء الاصطناعي', 2030]]],
        ['HUMAIN', 'هيوماين', 'Public Investment Fund', 'صندوق الاستثمارات العامة', 2025, 'compute', [['1.9 GW', '1.9 غيغاواط', 'AI data-centre capacity, first phase', 'سعة مراكز بيانات الذكاء الاصطناعي، المرحلة الأولى', 2030], ['6.6 GW', '6.6 غيغاواط', 'AI data-centre capacity, full plan', 'سعة مراكز بيانات الذكاء الاصطناعي، الخطة الكاملة', 2034]]]
      ],
      feat: {
        name: ['Future Factories Program', 'برنامج مصانع المستقبل'],
        dek: ['A Ministry of Industry programme that scores factories on the Smart Industry Readiness Index (SIRI) and helps fund their move from low-wage labour to automation.', 'برنامج لوزارة الصناعة يقيّم المصانع وفق مؤشر جاهزية الصناعة الذكية (SIRI) ويساعد في تمويل انتقالها من العمالة منخفضة الأجر إلى الأتمتة.'],
        facts: [['Launched', 'الإطلاق', '20 July 2022', '20 يوليو 2022'], ['Owner', 'الجهة المالكة', 'Ministry of Industry & Mineral Resources', 'وزارة الصناعة والثروة المعدنية'], ['Method', 'المنهجية', 'Smart Industry Readiness Index (SIRI)', 'مؤشر جاهزية الصناعة الذكية (SIRI)'], ['Tracks', 'المسارات', 'New factories built to 4IR standards; existing factories upgraded', 'مصانع جديدة بمعايير الثورة الصناعية الرابعة، وتطوير المصانع القائمة'], ['Umbrella', 'المظلة', 'Advanced Manufacturing and Production Center', 'مركز التصنيع والإنتاج المتقدم']],
        why: ['The largest single pool of robotics demand in the region: every enrolled factory is a candidate buyer for arms, AMRs and integration services.', 'أكبر مصدر منفرد للطلب على الروبوتات في المنطقة: كل مصنع مسجّل مشترٍ محتمل للأذرع والروبوتات المتنقلة وخدمات التكامل.'],
        note: ['The 4,000 figure is a transformation target, not a count of factories already automated. No completion date has been published.', 'رقم 4,000 هدف للتحول وليس عدداً لمصانع تمت أتمتتها بالفعل، ولم يُعلن موعد للإنجاز.'],
        ms: [['Jul 2022', 'يوليو 2022', 'Programme launched with the SIRI methodology', 'إطلاق البرنامج بمنهجية SIRI'], ['2025', '2025', 'AMPC set up as umbrella for Future Factories and the Lighthouse programme', 'إنشاء مركز التصنيع المتقدم مظلةً لمصانع المستقبل وبرنامج المنارات'], ['May 2025', 'مايو 2025', 'HUMAIN launched under PIF, chaired by the Crown Prince', 'إطلاق هيوماين تحت مظلة صندوق الاستثمارات العامة برئاسة ولي العهد']]
      },
      pubs: [
        ['Saudi Arabia announces plan to automate 4,000 factories', 'السعودية تعلن خطة لأتمتة 4,000 مصنع', 'Arab News', 'عرب نيوز', 'News', 'خبر', '2022', 'https://www.arabnews.com/business/saudi-arabia-announces-plan-to-automate-4000-factories-2126881'],
        ['Future Factories Program', 'برنامج مصانع المستقبل', 'Saudipedia', 'سعوديبيديا', 'Reference', 'مرجع', '2022', 'https://saudipedia.com/en/future-factories-program'],
        ['HUMAIN has already sold out its data-centre capacity', 'هيوماين باعت سعة مراكز بياناتها بالكامل', 'Semafor', 'سيمافور', 'News', 'خبر', '2025', 'https://www.semafor.com/article/08/27/2025/pifs-ai-unit-has-already-sold-out-its-data-center-capacity'],
        ['National Strategy for Data & AI', 'الاستراتيجية الوطنية للبيانات والذكاء الاصطناعي', 'SDAIA', 'سدايا', 'Strategy document', 'وثيقة استراتيجية', '2020', '']
      ]
    },
    QA: {
      sum: ['Policy targets the digital economy as a whole; robotics sits inside the Digital Agenda rather than in a dedicated programme.', 'تستهدف السياسات الاقتصاد الرقمي ككل، وتندرج الروبوتات ضمن الأجندة الرقمية لا في برنامج مستقل.'],
      robo: ['No: AI and digital only', 'لا: ذكاء اصطناعي ورقمنة فقط', 0], head: [0, 0],
      progs: [
        ['Digital Agenda 2030', 'الأجندة الرقمية 2030', 'Ministry of Communications & IT', 'وزارة الاتصالات وتكنولوجيا المعلومات', 2024, 'digital', [['QR 40bn', '40 مليار ريال', 'ICT contribution to non-hydrocarbon GDP', 'مساهمة القطاع في الناتج المحلي غير الهيدروكربوني', 2030], ['26,000', '26,000', 'new jobs in the ICT sector', 'وظيفة جديدة في قطاع الاتصالات والتقنية', 2030]]],
        ['National AI Strategy', 'الاستراتيجية الوطنية للذكاء الاصطناعي', 'Ministry of Communications & IT', 'وزارة الاتصالات وتكنولوجيا المعلومات', 2019, 'ai', [['Pillar', 'ركيزة', 'AI as a pillar of the QNV 2030 knowledge economy; no numeric KPI', 'الذكاء الاصطناعي ركيزة لاقتصاد المعرفة في رؤية 2030، دون مؤشر رقمي', 2030]]]
      ],
      feat: {
        name: ['Digital Agenda 2030', 'الأجندة الرقمية 2030'],
        dek: ['Qatar’s master plan for digital transformation, sitting under the Third National Development Strategy and Qatar National Vision 2030.', 'الخطة الرئيسية للتحول الرقمي في قطر، ضمن استراتيجية التنمية الوطنية الثالثة ورؤية قطر الوطنية 2030.'],
        facts: [['Launched', 'الإطلاق', 'February 2024', 'فبراير 2024'], ['Owner', 'الجهة المالكة', 'Ministry of Communications & IT', 'وزارة الاتصالات وتكنولوجيا المعلومات'], ['Structure', 'الهيكل', '6 pillars, 23 strategic programmes', '6 ركائز و23 برنامجاً استراتيجياً'], ['Includes', 'يشمل', 'National high-performance computing programme', 'برنامج وطني للحوسبة عالية الأداء']],
        why: ['There is no robotics target yet, so buyers and vendors should read the HPC, cloud and sector-transformation programmes as the entry points.', 'لا يوجد هدف خاص بالروبوتات بعد، لذا فإن برامج الحوسبة والسحابة والتحول القطاعي هي المداخل الأنسب.'],
        note: ['', ''],
        ms: [['2019', '2019', 'National AI Strategy published', 'نشر الاستراتيجية الوطنية للذكاء الاصطناعي'], ['Feb 2024', 'فبراير 2024', 'Digital Agenda 2030 launched', 'إطلاق الأجندة الرقمية 2030']]
      },
      pubs: [
        ['MCIT’s Digital Agenda 2030 aims at QR40bn ripple effect, 26,000 jobs', 'الأجندة الرقمية 2030: 40 مليار ريال و26 ألف وظيفة', 'Gulf Times', 'جلف تايمز', 'News', 'خبر', '2024', 'https://www.gulf-times.com/article/678030/qatar/mcits-digital-agenda-2030-aims-atqr40bn-ripple-effect-26000-jobs'],
        ['Qatar: Digital Economy', 'قطر: الاقتصاد الرقمي', 'US International Trade Administration', 'إدارة التجارة الدولية الأمريكية', 'Country guide', 'دليل قُطري', '2024', 'https://www.trade.gov/country-commercial-guides/qatar-digital-economy'],
        ['Qatar’s Digital Agenda 2030', 'الأجندة الرقمية لقطر 2030', 'Digital Watch', 'ديجيتال ووتش', 'Policy summary', 'ملخص سياسات', '2024', 'https://dig.watch/resource/qatars-digital-agenda-2030']
      ]
    },
    EG: {
      sum: ['A refreshed AI strategy with unusually concrete talent and startup KPIs; robotics appears through applied AI rather than a dedicated plan.', 'استراتيجية محدّثة للذكاء الاصطناعي بمؤشرات واضحة للمواهب والشركات الناشئة، وتظهر الروبوتات عبر تطبيقات الذكاء الاصطناعي لا عبر خطة مستقلة.'],
      robo: ['No: AI and digital only', 'لا: ذكاء اصطناعي ورقمنة فقط', 0], head: [0, 1],
      progs: [
        ['National AI Strategy, 2nd edition (2025–2030)', 'الاستراتيجية الوطنية للذكاء الاصطناعي، الإصدار الثاني (2025–2030)', 'MCIT & National Council for AI', 'وزارة الاتصالات والمجلس الوطني للذكاء الاصطناعي', 2025, 'ai', [['7.7%', '7.7%', 'ICT sector’s share of GDP', 'حصة قطاع الاتصالات وتكنولوجيا المعلومات من الناتج المحلي', 2030], ['30,000', '30,000', 'AI specialists in the workforce', 'متخصص في الذكاء الاصطناعي', 2030], ['250+', '250+', 'AI companies established', 'شركة ذكاء اصطناعي', 2030]]]
      ],
      feat: {
        name: ['National AI Strategy, 2nd edition', 'الاستراتيجية الوطنية للذكاء الاصطناعي، الإصدار الثاني'],
        dek: ['Replaces the 2021 strategy with six pillars (governance, technology, data, infrastructure, ecosystem and talent) and 21 initiatives.', 'تحل محل استراتيجية 2021 بست ركائز (الحوكمة والتقنية والبيانات والبنية التحتية والمنظومة والمواهب) و21 مبادرة.'],
        facts: [['Launched', 'الإطلاق', 'January 2025', 'يناير 2025'], ['Owner', 'الجهة المالكة', 'MCIT with the National Council for AI', 'وزارة الاتصالات مع المجلس الوطني للذكاء الاصطناعي'], ['Structure', 'الهيكل', '6 pillars, 21 initiatives', '6 ركائز و21 مبادرة'], ['Also targets', 'أهداف أخرى', '36% of the public using AI-powered tools; 6,000 AI publications a year', '36% من السكان يستخدمون أدوات الذكاء الاصطناعي؛ 6,000 بحث سنوياً']],
        why: ['The talent target is the one to watch for robotics: 30,000 AI specialists is the hiring pool regional integrators will draw on.', 'هدف المواهب هو الأهم للروبوتات: 30 ألف متخصص هم مصدر التوظيف لمُدمِجي الأنظمة في المنطقة.'],
        note: ['Often misreported as “AI will be 7.7% of GDP”. The 7.7% target applies to the whole ICT sector.', 'يُنقل أحياناً خطأً أن «الذكاء الاصطناعي سيشكّل 7.7% من الناتج». الهدف يخص قطاع الاتصالات وتكنولوجيا المعلومات بأكمله.'],
        ms: [['May 2021', 'مايو 2021', 'First national AI strategy launched', 'إطلاق الاستراتيجية الوطنية الأولى'], ['Jan 2025', 'يناير 2025', 'Second edition launched by President El-Sisi', 'إطلاق الإصدار الثاني برعاية الرئيس السيسي'], ['2025–27', '2025–27', 'National Arabic foundation model in development', 'تطوير نموذج لغوي عربي وطني']]
      },
      pubs: [
        ['Egypt National Artificial Intelligence Strategy', 'الاستراتيجية الوطنية للذكاء الاصطناعي في مصر', 'OECD.AI Policy Navigator', 'مرصد OECD.AI', 'Policy record', 'سجل سياسات', '2025', 'https://oecd.ai/en/dashboards/policy-initiatives/egypt-national-artificial-intelligence-strategy'],
        ['Factbox: 2nd edition of Egypt’s national AI strategy', 'كل ما تريد معرفته عن الإصدار الثاني', 'Ahram Online', 'الأهرام أونلاين', 'News', 'خبر', '2025', 'https://english.ahram.org.eg/NewsContent/3/1239/539743/Business/Tech/Factbox-All-you-need-to-know-about-nd-edition-of-E.aspx'],
        ['Egypt unveils updated AI strategy', 'مصر تكشف عن استراتيجية محدّثة للذكاء الاصطناعي', 'Arab News', 'عرب نيوز', 'News', 'خبر', '2025', 'https://www.arabnews.com/node/2587530/business-economy']
      ]
    },
    MA: {
      sum: ['A jobs-and-startups digital strategy. Robotics demand comes mainly from the automotive sector, which sits outside its scope.', 'استراتيجية رقمية تركّز على الوظائف والشركات الناشئة، بينما يأتي الطلب على الروبوتات أساساً من قطاع السيارات خارج نطاقها.'],
      robo: ['No: AI and digital only', 'لا: ذكاء اصطناعي ورقمنة فقط', 0], head: [0, 0],
      progs: [
        ['Digital Morocco 2030', 'المغرب الرقمي 2030', 'Ministry of Digital Transition', 'وزارة الانتقال الرقمي', 2024, 'digital', [['240,000', '240,000', 'direct jobs in the digital sector', 'وظيفة مباشرة في القطاع الرقمي', 2030], ['MAD 100bn', '100 مليار درهم', 'digital economy contribution to GDP', 'مساهمة الاقتصاد الرقمي في الناتج المحلي', 2030], ['3,000', '3,000', 'startups created', 'شركة ناشئة', 2030]]]
      ],
      feat: {
        name: ['Digital Morocco 2030', 'المغرب الرقمي 2030'],
        dek: ['Two pillars, digitising public services and growing the digital economy, plus three accelerators: talent, inclusive use, and cloud & connectivity.', 'ركيزتان، رقمنة الخدمات العامة وتنمية الاقتصاد الرقمي، وثلاثة مسرّعات: المواهب والاستخدام الشامل والسحابة والاتصال.'],
        facts: [['Launched', 'الإطلاق', '25 September 2024, Rabat', '25 سبتمبر 2024، الرباط'], ['Owner', 'الجهة المالكة', 'Ministry of Digital Transition & Administrative Reform', 'وزارة الانتقال الرقمي وإصلاح الإدارة'], ['Talent', 'المواهب', '45,000 digital graduates a year by 2030', '45 ألف خريج رقمي سنوياً بحلول 2030'], ['Services', 'الخدمات', 'UN Online Services Index rank raised to 50th', 'الصعود إلى المرتبة 50 في مؤشر الخدمات الإلكترونية الأممي']],
        why: ['The startup and talent targets matter more than the GDP figure: 3,000 new ventures is the pipeline for local robotics software.', 'أهداف الشركات الناشئة والمواهب أهم من رقم الناتج: 3,000 شركة جديدة هي مصدر برمجيات الروبوتات المحلية.'],
        note: ['', ''],
        ms: [['Sep 2024', 'سبتمبر 2024', 'Strategy launched alongside an offshoring programme contract', 'إطلاق الاستراتيجية مع عقد برنامج لقطاع الأوفشورينغ'], ['2025', '2025', 'Draft “Digital X.0” law on AI governance in preparation', 'إعداد مشروع قانون «الرقمي X.0» لحوكمة الذكاء الاصطناعي']]
      },
      pubs: [
        ['Official launch of the national strategy “Morocco Digital 2030”', 'الإطلاق الرسمي لاستراتيجية «المغرب الرقمي 2030»', 'CGEM', 'الاتحاد العام لمقاولات المغرب', 'News', 'خبر', '2024', 'https://cgem.ma/en/actualites/official-launch-of-the-national-strategy-morocco-digital-2030/'],
        ['Morocco launches “Digital Morocco 2030”', 'المغرب يطلق «المغرب الرقمي 2030»', 'TechAfrica News', 'تك أفريكا نيوز', 'News', 'خبر', '2025', 'https://techafricanews.com/2025/08/15/morocco-launches-digital-morocco-2030-strategy-to-become-a-regional-digital-hub/']
      ]
    },
    OM: {
      sum: ['A three-year AI programme under Vision 2040, with the digital economy’s share of GDP as the headline measure.', 'برنامج للذكاء الاصطناعي مدته ثلاث سنوات ضمن رؤية 2040، وحصة الاقتصاد الرقمي من الناتج هي المؤشر الرئيسي.'],
      robo: ['No: AI and digital only', 'لا: ذكاء اصطناعي ورقمنة فقط', 0], head: [0, 0],
      progs: [
        ['National Programme for AI & Advanced Digital Technologies', 'البرنامج الوطني للذكاء الاصطناعي والتقنيات الرقمية المتقدمة', 'Ministry of Transport, Communications & IT', 'وزارة النقل والاتصالات وتقنية المعلومات', 2024, 'ai', [['5%', '5%', 'digital economy’s share of GDP (2% in 2021)', 'حصة الاقتصاد الرقمي من الناتج (2% في 2021)', 2030], ['10%', '10%', 'digital economy’s share of GDP', 'حصة الاقتصاد الرقمي من الناتج', 2040], ['Top 50', 'أفضل 50', 'Government AI Readiness Index', 'مؤشر جاهزية الحكومات للذكاء الاصطناعي', ['During 2024–26', 'خلال 2024–26']]]]
      ],
      feat: {
        name: ['National Programme for AI & Advanced Digital Technologies', 'البرنامج الوطني للذكاء الاصطناعي والتقنيات الرقمية المتقدمة'],
        dek: ['Upgrades the 2022 executive AI programme, following a call from Sultan Haitham to localise AI and speed up enabling legislation.', 'يطوّر البرنامج التنفيذي للذكاء الاصطناعي لعام 2022، استجابةً لتوجيه السلطان هيثم بتوطين الذكاء الاصطناعي وتسريع التشريعات الممكّنة.'],
        facts: [['Launched', 'الإطلاق', '2024', '2024'], ['Runs', 'المدة', '2024–2026', '2024–2026'], ['Owner', 'الجهة المالكة', 'Ministry of Transport, Communications & IT', 'وزارة النقل والاتصالات وتقنية المعلومات'], ['Includes', 'يشمل', 'National AI R&D centre, AI Studio, Omani language model', 'مركز وطني لأبحاث الذكاء الاصطناعي، واستوديو الذكاء الاصطناعي، ونموذج لغوي عُماني']],
        why: ['Oman lists robotics and autonomous vehicles in the programme’s ecosystem but has set no deployment target, leaving an opening for early pilots.', 'تُدرج عُمان الروبوتات والمركبات الذاتية ضمن منظومة البرنامج دون هدف للنشر، ما يفتح المجال لتجارب مبكرة.'],
        note: ['', ''],
        ms: [['2022', '2022', 'Executive Programme for AI launched', 'إطلاق البرنامج التنفيذي للذكاء الاصطناعي'], ['Nov 2023', 'نوفمبر 2023', 'Sultan calls for a national AI programme', 'السلطان يوجّه بإعداد برنامج وطني'], ['2024', '2024', 'National Programme launched (2024–26)', 'إطلاق البرنامج الوطني (2024–26)']]
      },
      pubs: [
        ['National Program for AI and Advanced Digital Technologies', 'البرنامج الوطني للذكاء الاصطناعي والتقنيات الرقمية المتقدمة', 'MTCIT', 'وزارة النقل والاتصالات', 'Programme page', 'صفحة البرنامج', '2024', 'https://prod.mtcit.gov.om/ITAPortal/Pages/Page.aspx?NID=292589&PID=1342792'],
        ['Oman unveils AI and digital tech programme to boost economy', 'عُمان تطلق برنامجاً للذكاء الاصطناعي والتقنيات الرقمية', 'Oman Observer', 'عُمان أوبزرفر', 'News', 'خبر', '2024', 'https://www.omanobserver.om/article/1159476/business/oman-unveils-ai-and-digital-tech-programme-to-boost-economy'],
        ['Boost to Oman’s artificial intelligence drives diversification', 'الذكاء الاصطناعي يدعم التنويع الاقتصادي في عُمان', 'Oxford Business Group', 'مجموعة أكسفورد للأعمال', 'Report', 'تقرير', '2025', 'https://oxfordbusinessgroup.com/reports/oman/2025-report/ict/game-changer-initiative-to-boost-local-artificial-intelligence-ai-is-driving-economic-diversification-and-sustainable-growth-analysis/']
      ]
    }
  };

  T = {
    en: {
      brand: 'Robotics MENA', langSwitch: 'العربية', subscribe: 'Get the brief',
      nav: ['Brief', 'Map', 'Directory', 'Policy & data', 'Talent', 'Events', 'Spotlight', 'Newsletter', 'Submit'], filters: 'Map filters', target: 'Headline target', showAll: 'Show all ({n})', showFewer: 'Show fewer', sections: 'Sections', prev: 'Previous', next: 'Next',
      kicker: 'Robotics · Physical AI · Automation · Middle East & North Africa',
      h1a: 'The machines are arriving.', h1b: 'Track them across MENA.',
      dek: 'A curated, sourced record of who is building, who is deploying and what happens next across the region, with every entry linked to its primary source. No ads, no paid placement.',
      searchPh: 'Search companies, deployments, events, strategies', tryLbl: 'Try', evType: 'Type', stripTitle: 'Get these five signals every Monday', stripSub: 'Five signals, one primary source each.', noResults: 'Nothing matches yet. Try a city, a company or a robot type.',
      stCo: 'Companies tracked', stDep: 'Deployments mapped', stCt: 'Countries covered', stEv: 'Events, next 90 days', updated: 'Updated',
      grpCo: 'Companies', grpDep: 'Deployments', grpEv: 'Events', grpStr: 'Strategies',
      s1n: '01 · The Brief', s1: 'This week’s five signals', s1sub: 'What moved in MENA robotics, and why it matters to buyers.', s1week: 'Week 45 · 2 – 8 Nov 2026', takeaway: 'Takeaway', source: 'Source',
      s2n: '02 · Deployments', s2: 'Deployments map', s2sub: 'Every robot we can verify, working on a real site in the region.',
      fCountry: 'Country', fSector: 'Sector', fType: 'Robot type', all: 'All', clearAll: 'Clear filters',
      panelLatest: 'Latest deployments & entrants', panelRecord: 'Deployment record', showing: '{a} of {b}',
      operator: 'Operator', site: 'Site', country: 'Country', date: 'Live since', close: 'Close', newLbl: 'New this week',
      pickHint: 'Select a pin or a row to open its record.', mapHelp: 'Drag to pan · Pinch or Ctrl + scroll to zoom · 0 resets',
      legPin: 'Deployment', legCluster: 'Cluster: select to zoom', legNew: 'Added this week', mapSource: 'Robotics MENA tracker · 1 primary source per record · Boundaries: Natural Earth',
      s3n: '03 · Directory', s3: 'Ecosystem directory', s3sub: 'Who is building robots, systems and robotics software in the region.', getListed: 'Get listed', sort: 'Sort',
      sortOpts: [['featured', 'Editor’s order'], ['az', 'A–Z'], ['newest', 'Recently added'], ['stage', 'Stage']], listed: 'Listed',
      s4n: '04 · Policy & data', s4: 'National strategies & readiness', s4sub: 'Country by country: the programmes that matter for robotics, what each target actually measures, when it is due, and how that compares with what is deployed on the ground.',
      pages: ['Brief', 'Map', 'Database', 'Policy', 'Events', 'Submit'], pOpenDossiers: 'Open country dossiers', mapOpen: 'Open the full map', crumbs: 'Breadcrumb', crumbHome: 'Home', crumbPolicy: 'Policy & data', pCountries: 'Countries', pDossier: 'Country dossier', pProgrammes: 'Programmes & targets', pTargets: 'Targets', pKpiNote: 'Each tile shows a published target: the number, what it measures, and the year it is due.', pFeatured: 'Featured initiative', pWhy: 'Why it matters for robotics', pMilestones: 'Milestones', pPubs: 'Publications & sources', pCompareLink: 'Compare all countries', pCompare: 'Compare countries', pCompareSub: 'Each country’s headline target (what it measures and when it is due) next to what we have verified on the ground. Select a country to open its dossier.', pCols: ['Country', 'Robotics-specific policy', 'Headline target · what it measures', 'Due', 'Deployments tracked', 'Companies listed'], pCmpSrc: 'Targets: national strategy documents and official announcements, linked in each dossier. Deployments and companies: Robotics MENA tracker, 7 Nov 2026. Bahrain and Jordan are tracked but not yet profiled.', pStDep: 'Deployments tracked', pStCo: 'Companies listed', pStProg: 'Programmes profiled', byYr: 'Due {y}', noDate: 'No date published', away: 'In {n} years', notProfiled: 'Not yet profiled',
      p1: 'Deployments tracked', p2: 'Companies listed', p3: 'Headline target horizon', readySrc: 'Source: Robotics MENA tracker · 7 Nov 2026', readySrc3: 'Source: national strategy documents · see below',
      s5: 'National strategies', s5sub: 'The programmes setting targets for robotics, AI and autonomy.', agency: 'Lead agency', launched: 'Launched',
      s6n: '05 · Talent', s6: 'Labs & talent', s6sub: 'Where the region trains, researches and competes.',
      s7n: '06 · Events', s7: 'Events calendar', s7sub: 'Robotics and physical-AI events across MENA through 2027, from dedicated shows to big expos with a robotics angle. Dates are from organisers unless marked TBC.', addCal: 'Add to calendar', added: 'Saved .ics', tbc: 'Dates TBC', later: 'Further out', noEvents: 'No events match these filters.',
      s8n: '07 · Spotlight', spotKicker: 'Field deployment',
      spotTitle: 'Wall-climbing robots go to work across ADNOC’s energy sites',
      spotDek: 'Gecko Robotics is deploying its new Raptor inspection robots across ADNOC facilities to find structural weaknesses and assess damage, scanning assets with sensors and sound waves without taking them offline.',
      spotQuote: '“Robotics are essential to ensure that resilience and readiness is possible in a world where we don’t have a lot of these skilled workforces.”', spotWho: 'Jake Loosararian, chief executive, Gecko Robotics',
      spotStats: [['Tens', 'Robots deployed a day in the region'], ['3–5×', 'Faster than Gecko’s previous robot'], ['50×', 'Lower data-collection cost (company claim)']],
      spotSrc: 'Source: The National, 4 Nov 2026. Raptor was unveiled at ADIPEC, Abu Dhabi.', spotRead: 'Read our analysis', spotCap: 'Raptor at ADIPEC, Abu Dhabi · Nov 2026', spotCredit: 'Photo: Victor Besa / The National',
      storyCrumb: 'Spotlight', storyRead: '{n} min read', gateKicker: 'Free with the weekly brief', gateTitle: 'Keep reading: the full analysis, sources and images', gateDek: 'Enter your email to unlock this piece. You’ll also get the weekly MENA robotics brief: five signals every Monday. Unsubscribe any time.', gatePh: 'Email address', gateBtn: 'Unlock the analysis', gateNote: 'Email only. We never share your address.', storySources: 'Sources', storyRelated: 'In the Robotics MENA database', storyUnlocked: 'Unlocked. Thanks for subscribing.', storyBack: 'Back to home',
      spotAlt: 'Gecko Robotics Raptor wall-climbing inspection robot on a steel surface at ADIPEC, Abu Dhabi',
      s9n: '08 · Newsletter', nlTitle: 'The weekly MENA robotics brief', nlDek: 'Five signals every Monday, each with a takeaway and a primary source. Written for the people who sign the purchase orders.', nlPh: 'Work email', nlBtn: 'Subscribe', nlDone: 'You’re on the list. The next issue lands Monday.', nlMeta: 'Every Monday · 4-minute read · No ads, no sponsored slots · Unsubscribe in one click',
      sampleLbl: 'Sample issue', sampleIssue: 'No. 45 · 9 Nov 2026', sampleFoot: '+ 3 deployments added to the map · 2 events this fortnight',
      s10n: '09 · Contribute', s10: 'Submit to the record', s10sub: 'Add a company, a deployment or an event. An editor verifies every entry before it is published.',
      tabs: ['A company', 'A deployment', 'An event'],
      fields: {
        company: [['Company name (English)', 'e.g. Falak Robotics', 1], ['Company name (Arabic)', 'مثال: فلك للروبوتات', 0, 'rtl'], ['Country', 'e.g. UAE', 1], ['Category', 'e.g. Drones', 1], ['Website', 'https://', 1, 'ltr', 'url'], ['Primary source', 'Link to a registry, filing or announcement', 1, 'ltr', 'url']],
        deployment: [['Robot / system', 'e.g. Spot quadruped', 1], ['Operator', 'Who runs it on site', 1], ['Site & city', 'e.g. KEZAD, Abu Dhabi', 1], ['Live since', 'YYYY-MM', 1], ['Primary source', 'Operator release, tender or filing', 1, 'ltr', 'url'], ['Your email', 'For editor follow-up', 1, 'ltr', 'email']],
        event: [['Event name', 'e.g. RoboTech Expo', 1], ['Dates', 'e.g. 18–20 Nov 2026', 1], ['City & venue', 'e.g. Doha, DECC', 1], ['Type', 'Expo, conference, meetup, competition', 1], ['Official link', 'https://', 1, 'ltr', 'url'], ['Your email', 'For editor follow-up', 1, 'ltr', 'email']]
      },
      notes: 'Anything the editor should know', submitBtn: 'Send for review', reqNote: '* Required. We publish the source, never your email.',
      submittedTitle: 'Received. Thank you.', submittedMsg: 'An editor will check it against the primary source and reply within five working days.', another: 'Submit another',
      reviewTitle: 'How editorial review works', reviewSteps: ['An editor checks every claim against a primary source.', 'We contact the company or operator to confirm.', 'Published with source and date; corrections are logged publicly.'], reviewNote: 'Listing is free and cannot be bought. We do not accept sponsored entries.',
      foot: [
        { h: 'About', b: 'Robotics MENA is an independent, curated record of robotics, physical AI and automation across the Middle East and North Africa.', l: 'About the team', href: '/' },
        { h: 'Editorial & sourcing', b: 'Every number carries a source and a date. Claims without a primary source are not published. Corrections are logged.', l: 'Read the policy', href: '/submit' },
        { h: 'Open data & API', b: 'Companies, deployments, events and strategies are available as open data (CC BY 4.0) and a read-only JSON API.', l: 'Explore the data', href: '/database' },
        { h: 'Contact', b: 'Tips, corrections and partnership enquiries go to the editors.', l: 'editors@roboticsmena.org', href: 'mailto:editors@roboticsmena.org' }
      ],
      copyright: '© 2026 Robotics MENA · Ad-free and independent', demoNote: 'Prototype: entries beyond the seed items are illustrative placeholders.'
    },
    ar: {
      brand: 'روبوتكس مينا', langSwitch: 'English', subscribe: 'اشترك في الموجز',
      nav: ['الموجز', 'الخريطة', 'الدليل', 'السياسات والبيانات', 'المواهب', 'الفعاليات', 'تحت الضوء', 'النشرة', 'أضف'], filters: 'مرشّحات الخريطة', target: 'الهدف الرئيسي', showAll: 'عرض الكل ({n})', showFewer: 'عرض أقل', sections: 'الأقسام', prev: 'السابق', next: 'التالي',
      kicker: 'الروبوتات · الذكاء الاصطناعي المادي · الأتمتة · الشرق الأوسط وشمال أفريقيا',
      h1a: 'الآلات قادمة.', h1b: 'تابِعها في أرجاء المنطقة.',
      dek: 'سجلّ منسّق وموثّق لمن يصنع الروبوتات ومن ينشرها وما الذي سيحدث تالياً في المنطقة، وكل إدخال مرتبط بمصدره الأصلي. بلا إعلانات ولا إدراج مدفوع.',
      searchPh: 'ابحث في الشركات وعمليات النشر والفعاليات والاستراتيجيات', tryLbl: 'جرّب', evType: 'النوع', stripTitle: 'تصلك هذه الإشارات الخمس كل اثنين', stripSub: 'خمس إشارات، ولكل منها مصدر أصلي.', noResults: 'لا نتائج بعد. جرّب اسم مدينة أو شركة أو نوع روبوت.',
      stCo: 'شركة مرصودة', stDep: 'عملية نشر على الخريطة', stCt: 'دولة مشمولة', stEv: 'فعالية خلال 90 يوماً', updated: 'حُدّث في',
      grpCo: 'الشركات', grpDep: 'عمليات النشر', grpEv: 'الفعاليات', grpStr: 'الاستراتيجيات',
      s1n: '01 · الموجز', s1: 'خمس إشارات هذا الأسبوع', s1sub: 'ما الذي تغيّر في قطاع الروبوتات بالمنطقة، ولماذا يهمّ المشترين.', s1week: 'الأسبوع 45 · 2 – 8 نوفمبر 2026', takeaway: 'الخلاصة', source: 'المصدر',
      s2n: '02 · عمليات النشر', s2: 'خريطة عمليات النشر', s2sub: 'كل روبوت أمكننا التحقق منه، يعمل في موقع حقيقي في المنطقة.',
      fCountry: 'الدولة', fSector: 'القطاع', fType: 'نوع الروبوت', all: 'الكل', clearAll: 'مسح الفلاتر',
      panelLatest: 'أحدث عمليات النشر والوافدين الجدد', panelRecord: 'سجل عملية النشر', showing: '{a} من {b}',
      operator: 'المشغّل', site: 'الموقع', country: 'الدولة', date: 'يعمل منذ', close: 'إغلاق', newLbl: 'جديد هذا الأسبوع',
      pickHint: 'اختر نقطة أو صفاً لفتح السجل.', mapHelp: 'اسحب للتحريك · قرّب بإصبعين أو Ctrl مع التمرير · 0 لإعادة الضبط',
      legPin: 'عملية نشر', legCluster: 'مجموعة: اخترها للتكبير', legNew: 'أُضيف هذا الأسبوع', mapSource: 'متتبّع روبوتكس مينا · مصدر أصلي لكل سجل · الحدود: Natural Earth',
      s3n: '03 · الدليل', s3: 'دليل المنظومة', s3sub: 'من يصنع الروبوتات والأنظمة وبرمجيات الروبوتات في المنطقة.', getListed: 'أدرج شركتك', sort: 'ترتيب',
      sortOpts: [['featured', 'اختيار المحرّر'], ['az', 'أبجدياً'], ['newest', 'الأحدث إدراجاً'], ['stage', 'المرحلة']], listed: 'أُدرج',
      s4n: '04 · السياسات والبيانات', s4: 'الاستراتيجيات الوطنية والجاهزية', s4sub: 'دولة بدولة: البرامج المهمة للروبوتات، وما يقيسه كل هدف فعلاً، وموعد استحقاقه، ومقارنته بما هو منشور على أرض الواقع.',
      pages: ['الموجز', 'الخريطة', 'البيانات', 'السياسات', 'الفعاليات', 'أضف'], pOpenDossiers: 'افتح ملفات الدول', mapOpen: 'افتح الخريطة الكاملة', crumbs: 'مسار التنقل', crumbHome: 'الرئيسية', crumbPolicy: 'السياسات والبيانات', pCountries: 'الدول', pDossier: 'ملف الدولة', pProgrammes: 'البرامج والأهداف', pTargets: 'الأهداف', pKpiNote: 'تعرض كل خانة هدفاً منشوراً: الرقم، وما يقيسه، وسنة استحقاقه.', pFeatured: 'مبادرة بارزة', pWhy: 'لماذا تهمّ قطاع الروبوتات', pMilestones: 'محطات رئيسية', pPubs: 'المنشورات والمصادر', pCompareLink: 'قارن بين جميع الدول', pCompare: 'مقارنة بين الدول', pCompareSub: 'الهدف الرئيسي لكل دولة (ما يقيسه وموعد استحقاقه) إلى جانب ما تحققنا منه ميدانياً. اختر دولة لفتح ملفها.', pCols: ['الدولة', 'سياسة خاصة بالروبوتات', 'الهدف الرئيسي · ما يقيسه', 'الاستحقاق', 'عمليات النشر المرصودة', 'الشركات المدرجة'], pCmpSrc: 'الأهداف: وثائق الاستراتيجيات الوطنية والإعلانات الرسمية، مع روابطها في كل ملف. عمليات النشر والشركات: متتبّع روبوتكس مينا، 7 نوفمبر 2026. البحرين والأردن مرصودتان ولم تُعدّ ملفاتهما بعد.', pStDep: 'عمليات نشر مرصودة', pStCo: 'شركات مدرجة', pStProg: 'برامج في الملف', byYr: 'الاستحقاق {y}', noDate: 'لم يُعلن موعد', away: 'بعد {n} سنوات', notProfiled: 'لم يُعدّ الملف بعد',
      p1: 'عمليات النشر المرصودة', p2: 'الشركات المدرجة', p3: 'أفق الهدف الوطني الرئيسي', readySrc: 'المصدر: متتبّع روبوتكس مينا · 7 نوفمبر 2026', readySrc3: 'المصدر: وثائق الاستراتيجيات الوطنية · انظر أدناه',
      s5: 'الاستراتيجيات الوطنية', s5sub: 'البرامج التي تضع أهداف الروبوتات والذكاء الاصطناعي والقيادة الذاتية.', agency: 'الجهة المسؤولة', launched: 'سنة الإطلاق',
      s6n: '05 · المواهب', s6: 'المختبرات والمواهب', s6sub: 'أين تتدرّب المنطقة وتبحث وتتنافس.',
      s7n: '06 · الفعاليات', s7: 'تقويم الفعاليات', s7sub: 'فعاليات الروبوتات والذكاء الاصطناعي المادي في المنطقة حتى نهاية 2027، من المعارض المتخصصة إلى المعارض الكبرى ذات الصلة بالروبوتات. التواريخ من المنظّمين ما لم يُذكر أنها قيد التأكيد.', addCal: 'أضف إلى التقويم', added: 'حُفظ الملف', tbc: 'التواريخ قيد التأكيد', later: 'لاحقاً', noEvents: 'لا فعاليات تطابق هذه المرشّحات.',
      s8n: '07 · تحت الضوء', spotKicker: 'نشر ميداني',
      spotTitle: 'روبوتات تتسلّق الجدران تعمل في منشآت أدنوك للطاقة',
      spotDek: 'تنشر جيكو روبوتكس روبوتات الفحص الجديدة «رابتور» في منشآت أدنوك لرصد مواطن الضعف الإنشائي وتقييم الأضرار، إذ تمسح الأصول بأجهزة الاستشعار والموجات الصوتية من دون إيقاف تشغيلها.',
      spotQuote: '«الروبوتات ضرورية لضمان المرونة والجاهزية في عالم لا تتوفر فيه أعداد كافية من العمالة الماهرة.»', spotWho: 'جيك لوساراريان، الرئيس التنفيذي لجيكو روبوتكس',
      spotStats: [['عشرات', 'روبوتات تُنشر يومياً في المنطقة'], ['3–5×', 'أسرع من روبوت جيكو السابق'], ['50×', 'خفض في تكلفة جمع البيانات (بحسب الشركة)']],
      spotSrc: 'المصدر: ذا ناشونال، 4 نوفمبر 2026. كُشف عن «رابتور» في معرض أديبك، أبوظبي.', spotRead: 'اقرأ تحليلنا', spotCap: 'رابتور في أديبك، أبوظبي · نوفمبر 2026', spotCredit: 'تصوير: فيكتور بيسا / ذا ناشونال',
      storyCrumb: 'تحت الضوء', storyRead: 'قراءة في {n} دقائق', gateKicker: 'مجاناً مع الموجز الأسبوعي', gateTitle: 'تابع القراءة: التحليل الكامل مع المصادر والصور', gateDek: 'أدخل بريدك الإلكتروني لفتح هذا المقال. ستصلك أيضاً نشرة روبوتات المنطقة الأسبوعية: خمس إشارات كل اثنين. يمكنك إلغاء الاشتراك في أي وقت.', gatePh: 'البريد الإلكتروني', gateBtn: 'افتح التحليل', gateNote: 'البريد الإلكتروني فقط. لا نشارك عنوانك مع أحد.', storySources: 'المصادر', storyRelated: 'في قاعدة بيانات روبوتكس مينا', storyUnlocked: 'تم الفتح. شكراً لاشتراكك.', storyBack: 'العودة إلى الرئيسية',
      spotAlt: 'روبوت الفحص «رابتور» من جيكو روبوتكس يتسلّق سطحاً فولاذياً في أديبك، أبوظبي',
      s9n: '08 · النشرة', nlTitle: 'الموجز الأسبوعي لروبوتات المنطقة', nlDek: 'خمس إشارات كل اثنين، لكل منها خلاصة ومصدر أصلي. مكتوبة لمن يوقّعون أوامر الشراء.', nlPh: 'بريد العمل', nlBtn: 'اشترك', nlDone: 'تم تسجيلك. يصلك العدد القادم يوم الاثنين.', nlMeta: 'كل اثنين · 4 دقائق قراءة · بلا إعلانات أو رعايات · إلغاء الاشتراك بنقرة',
      sampleLbl: 'نموذج عدد', sampleIssue: 'العدد 45 · 9 نوفمبر 2026', sampleFoot: '+ 3 عمليات نشر أُضيفت إلى الخريطة · فعاليتان خلال أسبوعين',
      s10n: '09 · المساهمة', s10: 'أضف إلى السجل', s10sub: 'أضف شركة أو عملية نشر أو فعالية. يتحقق محرّر من كل إدخال قبل نشره.',
      tabs: ['شركة', 'عملية نشر', 'فعالية'],
      fields: {
        company: [['اسم الشركة (بالعربية)', 'مثال: فلك للروبوتات', 1], ['اسم الشركة (بالإنجليزية)', 'e.g. Falak Robotics', 0, 'ltr'], ['الدولة', 'مثال: الإمارات', 1], ['الفئة', 'مثال: مسيّرات', 1], ['الموقع الإلكتروني', 'https://', 1, 'ltr', 'url'], ['المصدر الأصلي', 'رابط سجل تجاري أو إعلان رسمي', 1, 'ltr', 'url']],
        deployment: [['الروبوت / النظام', 'مثال: روبوت Spot', 1], ['المشغّل', 'الجهة المشغّلة في الموقع', 1], ['الموقع والمدينة', 'مثال: كيزاد، أبوظبي', 1], ['يعمل منذ', 'YYYY-MM', 1], ['المصدر الأصلي', 'إعلان المشغّل أو مناقصة', 1, 'ltr', 'url'], ['بريدك الإلكتروني', 'للتواصل مع المحرّر', 1, 'ltr', 'email']],
        event: [['اسم الفعالية', 'مثال: روبوتك إكسبو', 1], ['التواريخ', 'مثال: 18–20 نوفمبر 2026', 1], ['المدينة والمكان', 'مثال: الدوحة', 1], ['النوع', 'معرض، مؤتمر، لقاء، مسابقة', 1], ['الرابط الرسمي', 'https://', 1, 'ltr', 'url'], ['بريدك الإلكتروني', 'للتواصل مع المحرّر', 1, 'ltr', 'email']]
      },
      notes: 'ما يجب أن يعرفه المحرّر', submitBtn: 'أرسل للمراجعة', reqNote: '* حقل مطلوب. ننشر المصدر، ولا ننشر بريدك أبداً.',
      submittedTitle: 'وصلنا طلبك، شكراً لك.', submittedMsg: 'سيتحقق محرّر من المصدر الأصلي ويرد خلال خمسة أيام عمل.', another: 'أضف إدخالاً آخر',
      reviewTitle: 'كيف تعمل المراجعة التحريرية', reviewSteps: ['يتحقق محرّر من كل معلومة مقابل مصدر أصلي.', 'نتواصل مع الشركة أو المشغّل للتأكيد.', 'يُنشر الإدخال مع مصدره وتاريخه، وتُسجَّل التصحيحات علناً.'], reviewNote: 'الإدراج مجاني ولا يمكن شراؤه. لا نقبل إدخالات مموّلة.',
      foot: [
        { h: 'عن المنصة', b: 'روبوتكس مينا سجلّ مستقل ومنسّق للروبوتات والذكاء الاصطناعي المادي والأتمتة في الشرق الأوسط وشمال أفريقيا.', l: 'تعرّف على الفريق', href: '/' },
        { h: 'السياسة التحريرية والمصادر', b: 'لكل رقم مصدر وتاريخ. لا ننشر أي معلومة دون مصدر أصلي، ونسجّل التصحيحات علناً.', l: 'اقرأ السياسة', href: '/submit' },
        { h: 'البيانات المفتوحة والواجهة البرمجية', b: 'بيانات الشركات وعمليات النشر والفعاليات والاستراتيجيات متاحة مفتوحةً (CC BY 4.0) وعبر واجهة JSON للقراءة.', l: 'استكشف البيانات', href: '/database' },
        { h: 'تواصل معنا', b: 'للمعلومات والتصحيحات والشراكات، راسل فريق التحرير.', l: 'editors@roboticsmena.org', href: 'mailto:editors@roboticsmena.org' }
      ],
      copyright: '© 2026 روبوتكس مينا · مستقلة وبلا إعلانات', demoNote: 'نموذج أولي: الإدخالات غير الأساسية أمثلة توضيحية.'
    }
  };
  tPatch = (() => { const o = window.RM_PAGE.t || {}; for (const l in o) Object.assign(this.T[l], o[l]); return true; })();

  chip(label, n, active, onClick) {
    return { label, n, onClick, pressed: active ? 'true' : 'false', bd: active ? 'var(--fg)' : 'var(--line-strong)', bg: active ? 'var(--fg)' : 'transparent', fg: active ? 'var(--bg)' : 'var(--fg)', nfg: active ? 'var(--bg)' : 'var(--fg-subtle)' };
  }

  ics(e) {
    const end = new Date(e[2] + 'T12:00:00Z'); end.setUTCDate(end.getUTCDate() + 1);
    const s = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Robotics MENA//EN', 'BEGIN:VEVENT', 'UID:' + e[0] + '@roboticsmena', 'DTSTART;VALUE=DATE:' + e[1].replace(/-/g, ''), 'DTEND;VALUE=DATE:' + end.toISOString().slice(0, 10).replace(/-/g, ''), 'SUMMARY:' + e[3], 'LOCATION:' + e[7] + ', ' + e[5], 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([s], { type: 'text/calendar' })); a.download = e[0] + '.ics'; document.body.appendChild(a); a.click(); a.remove();
    this.setState(st => ({ added: { ...st.added, [e[0]]: true } }));
  }

  // ---- Database page (/database): searchable tables + detail card ----
  DB_TABS = ['companies', 'deployments', 'countries', 'events'];
  DBT = {
    en: {
      title: 'Database', sub: 'Every company, deployment, country and event we track, in one searchable place. Click any row for the full record and its source.',
      tabs: { companies: 'Companies', deployments: 'Deployments', countries: 'Countries', events: 'Events' },
      search: 'Search this table', country: 'Country', all: 'All', anyCountry: 'All countries', sort: 'Sort',
      facet: { companies: 'Category', deployments: 'Robot type', events: 'Event type' },
      sorts: { recent: 'Most recent', az: 'A–Z', size: 'Most deployments' },
      showing: 'Showing {a} of {b}', none: 'No entries match. Try a different search or clear the filters.', clear: 'Clear filters', more: 'Show all {n}',
      cols: { companies: ['Company', 'Category', 'Country', 'Stage', 'Listed'], deployments: ['Deployment', 'Robot type', 'Sector', 'Country', 'Date'], countries: ['Country', 'Deployments', 'Companies', 'Headline target', 'Target year'], events: ['Event', 'Type', 'City', 'Country', 'Dates'] },
      kind: { companies: 'Company', deployments: 'Deployment', countries: 'Country', events: 'Event' },
      f: { country: 'Country', category: 'Category', stage: 'Stage', listed: 'Listed', website: 'Website', operator: 'Operator', site: 'Site', sector: 'Sector', type: 'Robot type', date: 'Date', deployments: 'Deployments tracked', companies: 'Companies listed', events: 'Upcoming events', target: 'Headline target', year: 'Target year', dates: 'Dates', city: 'City', venue: 'Venue', status: 'Status', etype: 'Type' },
      status: { ok: 'Dates confirmed', tbc: 'Dates to be confirmed', tent: 'Provisional' },
      source: 'Source', open: 'Open source', visit: 'Visit website', close: 'Close', related: { companies: 'Deployments', deployments: 'Operator in the database', countries: 'In this country' },
      dossier: 'Open country dossier', onMap: 'See on the map', noSource: 'Source not yet recorded', added: 'Added', recordLink: 'Copy link to this record', copied: 'Link copied'
    },
    ar: {
      title: 'قاعدة البيانات', sub: 'كل الشركات وعمليات النشر والدول والفعاليات التي نتابعها، في مكان واحد قابل للبحث. اضغط أي صف لعرض السجل الكامل ومصدره.',
      tabs: { companies: 'الشركات', deployments: 'عمليات النشر', countries: 'الدول', events: 'الفعاليات' },
      search: 'ابحث في هذا الجدول', country: 'الدولة', all: 'الكل', anyCountry: 'كل الدول', sort: 'الترتيب',
      facet: { companies: 'الفئة', deployments: 'نوع الروبوت', events: 'نوع الفعالية' },
      sorts: { recent: 'الأحدث', az: 'أبجدياً', size: 'الأكثر نشراً' },
      showing: 'عرض {a} من {b}', none: 'لا توجد نتائج مطابقة. جرّب بحثاً آخر أو امسح عوامل التصفية.', clear: 'مسح عوامل التصفية', more: 'عرض الكل ({n})',
      cols: { companies: ['الشركة', 'الفئة', 'الدولة', 'المرحلة', 'تاريخ الإدراج'], deployments: ['عملية النشر', 'نوع الروبوت', 'القطاع', 'الدولة', 'التاريخ'], countries: ['الدولة', 'عمليات النشر', 'الشركات', 'الهدف الرئيسي', 'سنة الهدف'], events: ['الفعالية', 'النوع', 'المدينة', 'الدولة', 'التواريخ'] },
      kind: { companies: 'شركة', deployments: 'عملية نشر', countries: 'دولة', events: 'فعالية' },
      f: { country: 'الدولة', category: 'الفئة', stage: 'المرحلة', listed: 'تاريخ الإدراج', website: 'الموقع الإلكتروني', operator: 'الجهة المشغّلة', site: 'الموقع', sector: 'القطاع', type: 'نوع الروبوت', date: 'التاريخ', deployments: 'عمليات النشر المرصودة', companies: 'الشركات المدرجة', events: 'الفعاليات القادمة', target: 'الهدف الرئيسي', year: 'سنة الهدف', dates: 'التواريخ', city: 'المدينة', venue: 'المكان', status: 'الحالة', etype: 'النوع' },
      status: { ok: 'تواريخ مؤكدة', tbc: 'التواريخ قيد التأكيد', tent: 'مبدئي' },
      source: 'المصدر', open: 'فتح المصدر', visit: 'زيارة الموقع', close: 'إغلاق', related: { companies: 'عمليات النشر', deployments: 'الجهة المشغّلة في قاعدة البيانات', countries: 'في هذه الدولة' },
      dossier: 'فتح ملف الدولة', onMap: 'عرض على الخريطة', noSource: 'لم يُسجَّل المصدر بعد', added: 'أضيف في', recordLink: 'نسخ رابط هذا السجل', copied: 'تم نسخ الرابط'
    }
  };
  badgeOf(name, img, fit) {
    const words = String(name || '').replace(/\(.*?\)/g, ' ').split(/[\s&\-–/]+/).filter(Boolean);
    const caps = words.filter(w => /^[A-Z0-9]/.test(w));
    const first = words[0] || '';
    const mono = (/^[A-Z0-9&]{2,4}$/.test(first) ? first : ((caps.length ? caps : words).slice(0, 2).map(w => w[0]).join('') || '?')).toUpperCase();
    // Logos in media/logos are pre-made square tiles, so every image fills the badge.
    return { img: img || '', hasImg: !!img, noImg: !img, mono, fit: 'cover', pad: '0', bg: img ? 'transparent' : 'var(--sand-soft)' };
  }
  opLogo(operator, own) {
    if (own) return own;
    const a = String(operator || '').toLowerCase();
    const c = a && window.RM_DATA.companies.find(x => x.logo && (a.includes(x.name.toLowerCase()) || x.name.toLowerCase().includes(a)));
    return c ? c.logo : '';
  }
  flagUrl(cc) { return cc ? '/media/flags/' + String(cc).toLowerCase() + '.svg' : ''; }
  dbOpen(tab, id) { this._dbReturn = document.activeElement; this.setState({ dbTab: tab, dbSel: id }); }
  dbVals(c) {
    const { S, lang, ar, L, num, fdate, ccName, narrow, t } = c;
    const d = this.DBT[lang], D = window.RM_DATA, tab = this.DB_TABS.includes(S.dbTab) ? S.dbTab : 'companies';
    const tr = (o, k) => (ar && o[k + '_ar']) || o[k] || '';
    const cn = cc => (this.CC[cc] ? ccName(cc) : (cc || '—'));
    const today = new Date().toISOString().slice(0, 10);
    const in90 = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
    const lc = s => String(s || '').toLowerCase();
    const opMatch = (op, name) => { const a = lc(op), b = lc(name); return !!a && !!b && (a.includes(b) || b.includes(a)); };
    const range = e => e.end && e.end !== e.start ? fdate(e.start) + ' – ' + fdate(e.end) : fdate(e.start);
    const recs = {
      companies: D.companies.map(o => ({ o, badge: this.badgeOf(o.name, o.logo), id: o.id, cc: o.country, facet: o.category, date: o.added, name: tr(o, 'name'), alt: ar ? o.name : (o.name_ar || ''), c2: (this.CATS[o.category] || [o.category, o.category])[L], c3: cn(o.country), c4: (this.STAGES[o.stage] || [o.stage, o.stage])[L], c5: o.added ? fdate(o.added) : '—', size: 0 })),
      deployments: D.deployments.map(o => ({ o, badge: this.badgeOf(o.operator, this.opLogo(o.operator, o.logo)), id: o.id, cc: o.country, facet: o.type, date: o.date, name: tr(o, 'title'), alt: tr(o, 'operator') + (o.site ? ' · ' + tr(o, 'site') : ''), c2: (this.TYPES[o.type] || [o.type, o.type])[L], c3: (this.SECTORS[o.sector] || [o.sector, o.sector])[L], c4: cn(o.country), c5: fdate(o.date), size: 0 })),
      countries: D.countries.map(o => { const dn = D.deployments.filter(x => x.country === o.code).length, cn2 = D.companies.filter(x => x.country === o.code).length; return { o, badge: this.badgeOf(o.code, '/media/flags/' + o.code.toLowerCase() + '.svg'), id: o.code, cc: o.code, facet: '', date: '', name: tr(o, 'name'), alt: ar ? o.name : o.name_ar, c2: num(dn), c3: num(cn2), c4: o.headline_target || '—', c5: o.target_year ? String(o.target_year) : '—', size: dn }; }),
      events: D.events.map(o => ({ o, badge: this.badgeOf(o.name, o.logo), id: o.id, cc: o.country, facet: o.type, date: o.start, name: tr(o, 'name'), alt: tr(o, 'venue') || '', c2: (this.ETYPES[o.type] || [o.type, o.type])[L], c3: tr(o, 'city'), c4: cn(o.country), c5: range(o), size: 0 }))
    };
    const all = recs[tab];
    const q = lc(S.dbQ).trim();
    const hay = r => lc([r.name, r.alt, r.c2, r.c3, r.c4, r.c5, ...Object.values(r.o).filter(v => typeof v === 'string')].join(' '));
    let rows = all.filter(r => (!q || q.split(/\s+/).every(w => hay(r).includes(w))) && (!S.dbCountry || r.cc === S.dbCountry) && (!S.dbFacet || r.facet === S.dbFacet));
    const sort = S.dbSort || (tab === 'countries' ? 'size' : 'recent');
    if (sort === 'az') rows.sort((a, b) => a.name.localeCompare(b.name, lang));
    else if (sort === 'size' || tab === 'countries' && sort === 'recent') rows.sort((a, b) => b.size - a.size || a.name.localeCompare(b.name, lang));
    else rows.sort((a, b) => tab === 'events' ? (a.date || '').localeCompare(b.date || '') : (b.date || '').localeCompare(a.date || ''));
    const LIMIT = 50, shown = S.dbAll ? rows : rows.slice(0, LIMIT);
    const facetDict = { companies: this.CATS, deployments: this.TYPES, events: this.ETYPES }[tab];
    const countriesIn = [...new Set(all.map(r => r.cc).filter(Boolean))].sort((a, b) => cn(a).localeCompare(cn(b), lang));
    const opt = (v, label, cur) => ({ v, label, sel: v === cur });
    // Detail card
    let card = null;
    const r = S.dbSel ? all.find(x => x.id === S.dbSel) : null;
    if (r) {
      const o = r.o, F = d.f, fields = [], rel = [];
      const link = (url, label) => url ? { url, label } : null;
      let desc = '', srcName = o.source || '', srcUrl = o.source_url || '', extra = [];
      if (tab === 'companies') {
        fields.push([F.category, r.c2], [F.country, r.c3], [F.stage, r.c4], [F.listed, r.c5]);
        desc = tr(o, 'summary');
        if (o.website) extra.push(link(o.website, d.visit));
        D.deployments.filter(x => opMatch(x.operator, o.name)).forEach(x => rel.push({ badge: this.badgeOf(x.operator, this.opLogo(x.operator, x.logo)), label: tr(x, 'title'), sub: tr(x, 'site') + ' · ' + fdate(x.date), open: () => this.setState({ dbTab: 'deployments', dbSel: x.id }) }));
      } else if (tab === 'deployments') {
        fields.push([ar ? 'النوع' : 'Kind', (this.DKINDS[o.kind] || this.DKINDS.deployment)[L]], [F.operator, tr(o, 'operator')], [F.site, tr(o, 'site')], [F.country, r.c4], [F.sector, r.c3], [F.type, r.c2], [F.date, r.c5]);
        desc = tr(o, 'summary');
        D.companies.filter(x => opMatch(o.operator, x.name)).forEach(x => rel.push({ badge: this.badgeOf(x.name, x.logo), label: tr(x, 'name'), sub: (this.CATS[x.category] || ['', ''])[L] + ' · ' + cn(x.country), open: () => this.setState({ dbTab: 'companies', dbSel: x.id }) }));
        extra.push({ url: this.pageHref('map'), label: d.onMap });
      } else if (tab === 'countries') {
        const ev = D.events.filter(x => x.country === o.code && x.start >= today).length;
        fields.push([F.deployments, r.c2], [F.companies, r.c3], [F.events, num(ev)], [F.target, r.c4], [F.year, r.c5]);
        desc = this.POLICY[o.code] ? this.POLICY[o.code].sum[L] : '';
        if (this.POLICY[o.code]) extra.push({ url: this.pageHref('policy', o.code), label: d.dossier });
        D.companies.filter(x => x.country === o.code).forEach(x => rel.push({ badge: this.badgeOf(x.name, x.logo), label: tr(x, 'name'), sub: d.kind.companies + ' · ' + (this.CATS[x.category] || ['', ''])[L], open: () => this.setState({ dbTab: 'companies', dbSel: x.id }) }));
        D.deployments.filter(x => x.country === o.code).forEach(x => rel.push({ badge: this.badgeOf(x.operator, this.opLogo(x.operator, x.logo)), label: tr(x, 'title'), sub: d.kind.deployments + ' · ' + fdate(x.date), open: () => this.setState({ dbTab: 'deployments', dbSel: x.id }) }));
      } else {
        fields.push([F.dates, r.c5], [F.etype, r.c2], [F.city, r.c3], [F.venue, tr(o, 'venue') || '—'], [F.country, r.c4], [F.status, o.tentative ? d.status.tent : o.dates_confirmed ? d.status.ok : d.status.tbc]);
        if (o.url) extra.push(link(o.url, d.visit));
        desc = tr(o, 'relevance');
      }
      const hasSrc = !!(srcName || srcUrl);
      card = {
        kind: d.kind[tab], badge: r.badge, title: r.name, alt: r.alt, cc: r.cc || '', hasCc: !!r.cc, desc, hasDesc: !!desc,
        fields: fields.filter(f => f[1]).map(f => ({ k: f[0], v: f[1] })),
        srcLine: hasSrc ? d.source + ': ' + (srcName || srcUrl.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]) : d.noSource,
        srcUrl, hasSrcUrl: !!srcUrl, openSrc: d.open,
        added: o.added && tab !== 'companies' ? d.added + ' ' + fdate(o.added) : '', hasAdded: !!(o.added && tab !== 'companies'),
        links: extra.filter(Boolean), hasLinks: extra.filter(Boolean).length > 0,
        relTitle: tab === 'events' ? '' : d.related[tab], rel: rel.slice(0, 8), hasRel: rel.length > 0
      };
    }
    const cols = d.cols[tab];
    return {
      db: {
        t: d, tab, chev: ar ? '‹' : '›', cols: { c1: cols[0], c2: cols[1], c3: cols[2], c4: cols[3], c5: cols[4] },
        tabs: this.DB_TABS.map(k => ({ ...this.chip(d.tabs[k], num(recs[k].length), k === tab, () => this.setState({ dbTab: k, dbFacet: '', dbCountry: '', dbSort: '', dbAll: false, dbSel: null })), id: 'rm-dbtab-' + k, ti: k === tab ? '0' : '-1' })),
        q: S.dbQ, onQ: e => this.setState({ dbQ: e.target.value, dbAll: false }),
        countryOpts: [opt('', d.anyCountry, S.dbCountry)].concat(countriesIn.map(cc => opt(cc, cn(cc), S.dbCountry))), country: S.dbCountry, onCountry: e => this.setState({ dbCountry: e.target.value }),
        hasFacet: !!facetDict, facetLabel: d.facet[tab] || '', facet: S.dbFacet,
        facetOpts: facetDict ? [opt('', d.all, S.dbFacet)].concat(Object.keys(facetDict).filter(k => all.some(r => r.facet === k)).map(k => opt(k, facetDict[k][L], S.dbFacet))) : [],
        onFacet: e => this.setState({ dbFacet: e.target.value }),
        sort, sortOpts: (tab === 'countries' ? ['size', 'az'] : ['recent', 'az']).map(k => opt(k, k === 'recent' && tab === 'events' ? (ar ? 'الأقرب' : 'Soonest') : d.sorts[k], sort)), onSort: e => this.setState({ dbSort: e.target.value }),
        showing: d.showing.replace('{a}', num(rows.length)).replace('{b}', num(all.length)),
        rows: shown.map(x => ({ id: x.id, badge: x.badge, name: x.name, alt: x.alt, c2: x.c2, c3: x.c3, c4: x.c4, c5: x.c5, cc: x.cc, open: () => this.dbOpen(tab, x.id) })),
        empty: !rows.length, filtered: !!(q || S.dbCountry || S.dbFacet), clear: () => this.setState({ dbQ: '', dbCountry: '', dbFacet: '' }),
        more: rows.length > shown.length, moreLbl: d.more.replace('{n}', num(rows.length)), showAll: () => this.setState({ dbAll: true }),
        rowCols: narrow ? 'minmax(0,1fr) auto' : 'minmax(0,2.4fr) minmax(0,1.1fr) minmax(0,1fr) minmax(0,1fr) minmax(0,.9fr)', colDisp: narrow ? 'none' : 'block', metaDisp: narrow ? 'block' : 'none', headDisp: narrow ? 'none' : 'grid',
        open: !!card, card: card || {}, close: () => this.setState({ dbSel: null }), stop: e => e.stopPropagation(),
        copy: () => { try { navigator.clipboard.writeText(window.location.href); this.setState({ dbCopied: true }); setTimeout(() => this.setState({ dbCopied: false }), 1600); } catch (e) {} },
        copyLbl: S.dbCopied ? d.copied : d.recordLink
      }
    };
  }
  renderVals() {
    const S = this.state, P = this.props;
    const lang = S.lang || this.qp.get('lang') || this.pref('lang') || P.lang || 'en', ar = lang === 'ar', L = ar ? 1 : 0;
    const theme = S.theme || this.qp.get('theme') || this.pref('theme') || P.theme || 'light';
    const accent = this.qp.get('accent') || P.accent || 'violet';
    const nums = P.arabicNumerals || 'latn';
    const loc = ar ? (nums === 'arab' ? 'ar-EG-u-nu-arab' : 'ar-AE-u-nu-latn') : 'en-GB';
    const nf = new Intl.NumberFormat(loc), nf2 = new Intl.NumberFormat(loc, { minimumIntegerDigits: 2 });
    const num = n => nf.format(n);
    const nfy = new Intl.NumberFormat(loc, { useGrouping: false }), yr = n => nfy.format(n);
    const digits = s => (ar && nums === 'arab') ? String(s).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]) : s;
    const df = new Intl.DateTimeFormat(loc, { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
    const fdate = iso => df.format(new Date(iso + 'T12:00:00Z'));
    const t = this.T[lang];
    const tt = {}; for (const k in t) tt[k] = typeof t[k] === 'string' ? digits(t[k]) : t[k];
    const arrow = ar ? '↖' : '↗';
    const ccName = cc => this.CC[cc][L];
    const narrow = S.w <= 900;
    const ids = this.NAV_IDS;
    this.qsCur = '';
    const st = this.STORIES.find(x => x.id === this.qp.get('s')) || this.STORIES[0];
    const tx = o => o ? (ar ? (o.ar || o.en || '') : (o.en || '')) : '';
    const blk = b => ({ isP: b.t === 'p', isH: b.t === 'h', isImg: b.t === 'img', isQ: b.t === 'quote', isStats: b.t === 'stats', isList: b.t === 'list', text: digits(tx(b)), src: b.src || '', maxw: b.maxw || '100%', alt: tx(b.alt), cap: tx(b.cap), credit: tx(b.credit), who: tx(b.who), items: (b.items || []).map(i => ({ v: digits(i.v || ''), label: digits(tx(i)) })) });
    const story = st ? { kicker: tx(st.kicker), title: tx(st.title), dek: tx(st.dek), date: fdate(st.date), by: tx(st.by), read: digits(t.storyRead.replace('{n}', st.read_min)), hero: st.hero.src, heroAlt: tx(st.hero.alt), heroCap: tx(st.hero.cap), heroCredit: tx(st.hero.credit) } : {};
    const storyBody = st ? st.body.map(blk) : [], storyTeaser = st ? storyBody.slice(0, st.gate_after) : [];
    const storySources = st ? st.sources.map((x, i) => ({ n: nf.format(i + 1), name: x.name, title: x.title, date: x.date ? fdate(x.date) : '', url: x.url })) : [];
    const storyRelated = st ? (st.related || []).map(r => ({ label: tx(r), href: r.href })) : [];
    const activeNav = this.PAGE === 'home' ? (S.active === 'brief' ? 'brief' : '') : this.PAGE;
    const nav = ['brief', 'map', 'database', 'policy', 'events', 'submit'].map((id, i) => { const on = activeNav === id; const local = this.PAGE === 'home' && id === 'brief'; return { id, label: t.pages[i], href: local ? '#brief' : this.pageHref(id, id === 'policy' ? S.pc : ''), cur: on ? 'page' : 'false', color: on ? 'var(--fg)' : 'var(--fg-muted)', bd: on ? 'var(--accent)' : 'transparent', go: e => { if (local) { e.preventDefault(); this.go(id); } } }; });
    const pad2 = x => String(x).padStart(2, '0');
    const rv = k => { const r = S.rails[k]; const cur = r.end ? r.n : Math.min(r.n, r.i + 1); return { [k + 'Pos']: r.n ? pad2(cur) + ' / ' + pad2(r.n) : '', [k + 'Prev']: () => this.railMove(k, -1), [k + 'Next']: () => this.railMove(k, 1), [k + 'PrevOp']: r.i === 0 ? 0.35 : 1, [k + 'NextOp']: r.end ? 0.35 : 1, [k + 'PrevDis']: r.i === 0 ? 'true' : 'false', [k + 'NextDis']: r.end ? 'true' : 'false', [k + 'PrevCur']: r.i === 0 ? 'default' : 'pointer', [k + 'NextCur']: r.end ? 'default' : 'pointer', [k + 'Scroll']: () => this.railUpdate(k) }; };

    // stats
    const RMD = window.RM_DATA, lastDate = [...RMD.deployments.map(x => x.added || x.date), ...RMD.companies.map(x => x.added)].filter(Boolean).sort().pop() || RMD.builtAt;
    const upd = t.updated + ' ' + fdate(lastDate);
    const todayIso = new Date().toISOString().slice(0, 10), in90Iso = new Date(Date.now() + 90 * 864e5).toISOString().slice(0, 10);
    const stats = [[RMD.companies.length, t.stCo, 'companies'], [RMD.deployments.length, t.stDep, 'deployments'], [RMD.countries.length, t.stCt, 'countries'], [RMD.events.filter(e => (e.end || e.start) >= todayIso && e.start <= in90Iso).length, t.stEv, 'events']].map(([v, label, tabK], i) => ({ label, href: '/database?tab=' + tabK, ps: i % (narrow ? 2 : 4) ? '24px' : '0', bd: i % (narrow ? 2 : 4) ? '1px solid var(--line)' : '0', el: React.createElement(this.Ticker, { value: v, fmt: num, key: lang + v }) }));

    // search
    const q = S.q.trim().toLowerCase();
    const hit = (...xs) => xs.some(x => x && x.toLowerCase().includes(q));
    let results = [];
    if (q) {
      const co = this.CO.filter(c => hit(c[0], c[1], c[6], c[7], this.CATS[c[3]][L], ccName(c[2]))).slice(0, 4).map(c => ({ title: c[L], sub: this.CATS[c[3]][L] + ' · ' + ccName(c[2]), go: () => { window.location.href = '/database?tab=companies&id=' + encodeURIComponent(c[8]); } }));
      const dp = this.DEP.filter(d => hit(d.robot[0], d.robot[1], d.op[0], d.op[1], d.site[0], d.site[1], this.TYPES[d.type][L], this.SECTORS[d.sector][L])).slice(0, 4).map(d => ({ title: d.robot[L], sub: d.site[L], go: () => { this.setState({ q: '', sel: d.id, fCountry: '', fSector: '', fType: '' }); this.go('map'); } }));
      const ev = this.EVENTS.filter(e => hit(e[3], e[4], e[5], e[6])).slice(0, 3).map(e => ({ title: e[3 + L], sub: e[5 + L] + ' · ' + fdate(e[1]), go: () => { this.setState({ q: '' }); this.go('events'); } }));
      const st0 = this.state; const st = this.STRATS.filter(s => hit(s[1], s[2], s[3], s[4], ccName(s[0]))).slice(0, 3).map(s => ({ title: s[1 + L], sub: ccName(s[0]), go: () => { this.setState({ q: '' }); this.setState({ pc: this.POLICY[s[0]] ? s[0] : st0.pc }); this.go('strategies', s[0]); } }));
      results = [[t.grpCo, co], [t.grpDep, dp], [t.grpEv, ev], [t.grpStr, st]].filter(g => g[1].length).map(g => ({ label: g[0], items: g[1] }));
    }

    // map
    const depF = this.DEP.filter(d => (!S.fCountry || d.cc === S.fCountry) && (!S.fSector || d.sector === S.fSector) && (!S.fType || d.type === S.fType));
    const setF = (k, v) => this.setState(st => ({ [k]: st[k] === v ? '' : v, sel: null }));
    const cnt = (k, v) => this.DEP.filter(d => d[k] === v).length;
    const cList = [...new Set(this.DEP.map(d => d.cc))];
    const cChips = [this.chip(t.all, num(this.DEP.length), !S.fCountry, () => this.setState({ fCountry: '', sel: null }))].concat(cList.map(c => this.chip(ccName(c), num(cnt('cc', c)), S.fCountry === c, () => setF('fCountry', c))));
    const sChips = [this.chip(t.all, '', !S.fSector, () => this.setState({ fSector: '', sel: null }))].concat(Object.keys(this.SECTORS).map(k => this.chip(this.SECTORS[k][L], num(cnt('sector', k)), S.fSector === k, () => setF('fSector', k))));
    const tChips = [{ ...this.chip(t.all, '', !S.fType, () => this.setState({ fType: '', sel: null })), icon: '' }].concat(Object.keys(this.TYPES).map(k => ({ ...this.chip(this.TYPES[k][L], num(cnt('type', k)), S.fType === k, () => setF('fType', k)), icon: this.ICON[k] })));
    const opt = (v, label, n) => ({ v, label: n ? label + '  ' + n : label });
    const cOpts = [opt('', t.all, num(this.DEP.length))].concat(cList.map(c => opt(c, ccName(c), num(cnt('cc', c)))));
    const sOpts = [opt('', t.all)].concat(Object.keys(this.SECTORS).map(k => opt(k, this.SECTORS[k][L], num(cnt('sector', k)))));
    const tOpts = [opt('', t.all)].concat(Object.keys(this.TYPES).map(k => opt(k, this.TYPES[k][L], num(cnt('type', k)))));
    const fx = { cOpts, sOpts, tOpts, fSector: S.fSector, fType: S.fType,
      cBd: S.fCountry ? 'var(--accent)' : 'var(--line-strong)', sBd: S.fSector ? 'var(--accent)' : 'var(--line-strong)', tBd: S.fType ? 'var(--accent)' : 'var(--line-strong)',
      onFCountry: e => this.setState({ fCountry: e.target.value, sel: null }), onFSector: e => this.setState({ fSector: e.target.value, sel: null }), onFType: e => this.setState({ fType: e.target.value, sel: null }),
      anyFilter: !!(S.fCountry || S.fSector || S.fType), clearFilters: () => this.setState({ fCountry: '', fSector: '', fType: '', sel: null }) };
    const pinOf = d => ({ id: d.id, lat: d.lat, lon: d.lon, cc: d.cc, n: d.n, label: d.robot[L] + ', ' + d.site[L] });
    const selD = S.sel && this.DEP.find(d => d.id === S.sel);
    const sel = selD ? { icon: this.ICON[selD.type], robot: selD.robot[L], typeLabel: this.TYPES[selD.type][L], sector: this.SECTORS[selD.sector][L], operator: selD.op[L], opBadge: this.badgeOf(selD.op[0], this.opLogo(selD.op[0], selD.logo)), site: selD.site[L], country: ccName(selD.cc), date: fdate(selD.date), srcLine: t.source + ': ' + selD.src, isNew: selD.n, kindLabel: (this.DKINDS[selD.kind] || this.DKINDS.deployment)[L], summary: selD.sum[L], hasSummary: !!selD.sum[L], srcUrl: selD.url, hasUrl: !!selD.url, noUrl: !selD.url } : {};
    const panelList = depF.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, this.PAGE === 'home' ? 4 : (narrow && !S.mapAll ? 5 : 8)).map(d => ({ icon: this.ICON[d.type], robot: d.robot[L], site: d.site[L], kindLabel: (this.DKINDS[d.kind] || this.DKINDS.deployment)[L], op: d.op[L], date: fdate(d.date), isNew: d.n, pick: () => this.setState({ sel: d.id }) }));

    // directory
    let co = this.CO.map((c, i) => ({ c, i })).filter(({ c }) => !S.dCat || c[3] === S.dCat);
    if (S.dSort === 'az') co.sort((a, b) => a.c[L].localeCompare(b.c[L], lang));
    if (S.dSort === 'newest') co.sort((a, b) => b.c[5].localeCompare(a.c[5]));
    if (S.dSort === 'stage') co.sort((a, b) => this.STAGES[b.c[4]][2] - this.STAGES[a.c[4]][2]);
    const companies = co.map(({ c }) => ({ name: c[L], alt: c[1 - L], altLang: ar ? 'en' : 'ar', altFont: 'var(--font-sans)', mono: c[0].split(/[\s&]+/).filter(w => /^[A-Z]/.test(w)).slice(0, 2).map(w => w[0]).join(''), cc: c[2], country: ccName(c[2]), cat: this.CATS[c[3]][L], icon: this.ICON[c[3]], stage: this.STAGES[c[4]][L], desc: c[6 + L], since: t.listed + ' ' + fdate(c[5]) }));
    const dChips = [this.chip(t.all, num(this.CO.length), !S.dCat, () => this.setState({ dCat: '' }))].concat(Object.keys(this.CATS).map(k => this.chip(this.CATS[k][L], num(this.CO.filter(c => c[3] === k).length), S.dCat === k, () => this.setState(st => ({ dCat: st.dCat === k ? '' : k })))));

    // readiness
    const mx1 = Math.max(...this.READY.map(r => r[1])), mx2 = Math.max(...this.READY.map(r => r[2]));
    const panels = [
      { title: t.p1, rows: this.READY.map(r => ({ name: ccName(r[0]), v: num(r[1]), w: (r[1] / mx1 * 100).toFixed(1) + '%' })) },
      { title: t.p2, rows: this.READY.slice().sort((a, b) => b[2] - a[2]).map(r => ({ name: ccName(r[0]), v: num(r[2]), w: (r[2] / mx2 * 100).toFixed(1) + '%' })) }
    ];
    const targets = this.READY.map(r => ({ name: ccName(r[0]), yr: yr(r[3]), x: ((r[3] - 2026) / 14 * 100).toFixed(1) + '%', tgt: r[4] + ' · ' + r[3] }));

    // policy
    const pcK = this.POLICY[S.pc] ? S.pc : 'AE', PD = this.POLICY[pcK], RD = Object.fromEntries(this.READY.map(r => [r[0], r]));
    const dueTxt = d => d == null ? t.noDate : (Array.isArray(d) ? digits(d[L]) : t.byYr.replace('{y}', yr(d)));
    const pTabs = this.PCC.map(c => ({ ...this.chip(ccName(c), '', c === pcK, () => this.setState({ pc: c })), cc: c, flag: this.flagUrl(c), id: 'rm-ptab-' + c, ti: c === pcK ? '0' : '-1' }));
    const pc = {
      cc: pcK, flag: this.flagUrl(pcK), name: ccName(pcK), summary: PD.sum[L],
      stats: [[num(RD[pcK][1]), t.pStDep], [num(RD[pcK][2]), t.pStCo], [num(PD.progs.length), t.pStProg]].map(x => ({ v: x[0], l: x[1] })),
      progs: PD.progs.map(p => { const sc = this.SCOPES[p[5]]; return { name: p[L], issuer: p[2 + L], yr: yr(p[4]), scope: sc[L], tagFg: sc[2] ? 'var(--accent-text)' : 'var(--fg-muted)', tagBd: sc[2] ? 'var(--accent)' : 'var(--line-strong)', kpis: p[6].map(k => ({ v: digits(k[L]), what: k[2 + L], by: dueTxt(k[4]) })) }; }),
      feat: { name: PD.feat.name[L], dek: PD.feat.dek[L], why: PD.feat.why[L], note: PD.feat.note ? PD.feat.note[L] : '', hasNote: !!(PD.feat.note && PD.feat.note[L]), facts: PD.feat.facts.map(f => ({ k: f[L], v: digits(f[2 + L]) })), ms: PD.feat.ms.map(m => ({ d: digits(m[L]), t: m[2 + L] })) },
      pubs: PD.pubs.map(u => ({ title: u[L], pub: u[2 + L], type: u[4 + L], yr: digits(u[6]), url: u[7], hasUrl: !!u[7], noUrl: !u[7] }))
    };
    const mxD = Math.max(...this.READY.map(r => r[1])), mxC = Math.max(...this.READY.map(r => r[2]));
    const cmp = this.READY.map(r => { const c = r[0], P2 = this.POLICY[c]; const base = { cc: c, flag: this.flagUrl(c), name: ccName(c), dep: num(r[1]), co: num(r[2]), dw: (r[1] / mxD * 100).toFixed(1) + '%', cw: (r[2] / mxC * 100).toFixed(1) + '%', bg: c === pcK ? 'var(--accent-soft)' : 'transparent' };
      if (!P2) return { ...base, robo: t.notProfiled, roboFg: 'var(--fg-subtle)', dotBg: 'transparent', dotBd: 'var(--line-strong)', v: 'None set', what: '', due: 'n/a', away: '', pick: () => {}, noPick: 'true', cur: 'default' };
      const k = P2.progs[P2.head[0]][6][P2.head[1]], d = k[4];
      return { ...base, robo: P2.robo[L], roboFg: P2.robo[2] ? 'var(--fg)' : 'var(--fg-muted)', dotBg: P2.robo[2] === 2 ? 'var(--accent)' : 'transparent', dotBd: P2.robo[2] ? 'var(--accent)' : 'var(--line-strong)', v: digits(k[L]), what: k[2 + L], due: typeof d === 'number' ? yr(d) : (d == null ? t.noDate : digits(d[L])), away: typeof d === 'number' ? t.away.replace('{n}', num(d - 2026)) : (d == null ? t.noDate : ''), pick: () => { this.setState({ pc: c }); this.go('strategies', c); }, noPick: 'false', cur: 'pointer' }; });

    // events
    const df2 = new Intl.DateTimeFormat(loc, { month: 'short', timeZone: 'UTC' }), dfm = new Intl.DateTimeFormat(loc, { month: 'long', year: 'numeric', timeZone: 'UTC' });
    const D = iso => new Date(iso + 'T12:00:00Z');
    const evF = this.EVENTS.filter(e => (!S.eType || e[10] === S.eType) && (!S.eCountry || e[9] === S.eCountry));
    const mm = {};
    evF.forEach(e => { const k = e[1].slice(0, 7); (mm[k] = mm[k] || []).push(e); });
    const months = Object.keys(mm).sort().map(k => ({ label: dfm.format(D(k + '-01')), rows: mm[k].map(e => ({ days: (e[11] && e[1] === e[2] && e[1].endsWith('-01')) ? (ar ? 'يُحدَّد' : 'TBC') : num(D(e[1]).getUTCDate()) + (e[1] !== e[2] ? '–' + num(D(e[2]).getUTCDate()) : ''), mon: df2.format(D(e[1])), name: e[3 + L], city: e[5 + L], venue: e[7 + L], place: [e[7 + L], e[5 + L]].filter(Boolean).join(' · '), flag: e[9] ? '/media/flags/' + e[9].toLowerCase() + '.svg' : '', hasFlag: !!e[9], cname: e[9] && this.CC[e[9]] ? this.CC[e[9]][L] : '', cc: e[9], type: this.ETYPES[e[10]][L], tbc: !!e[11], badge: this.badgeOf(e[3], e[12]), why: e[13 + L], hasWhy: !!e[13 + L], whyLbl: ar ? 'لماذا يهمّ قطاع الروبوتات:' : 'Why it matters for robotics:', url: e[15], hasUrl: !!e[15], noUrl: !e[15], addLabel: S.added[e[0]] ? '✓ ' + t.added : t.addCal, add: () => this.ics(e) })) }));
    const evChips = [this.chip(t.all, num(this.EVENTS.length), !S.eType, () => this.setState({ eType: '' }))].concat(Object.keys(this.ETYPES).map(k => this.chip(this.ETYPES[k][L], num(this.EVENTS.filter(e => e[10] === k).length), S.eType === k, () => this.setState(st => ({ eType: st.eType === k ? '' : k })))));
    const evCChips = [this.chip(t.all, '', !S.eCountry, () => this.setState({ eCountry: '' }))].concat([...new Set(this.EVENTS.map(e => e[9]))].map(c => this.chip(ccName(c), '', S.eCountry === c, () => this.setState(st => ({ eCountry: st.eCountry === c ? '' : c })))));
    const later = this.LATER.map(e => ({ name: e[L], city: e[2 + L], mon: new Intl.DateTimeFormat(loc, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(D(e[4])) + (ar ? ' (قيد التأكيد)' : ' (TBC)') }));

    // submit
    const tabKeys = ['company', 'deployment', 'event'];
    const tabs = t.tabs.map((label, i) => ({ label, id: 'rm-tab-' + tabKeys[i], ti: S.tab === tabKeys[i] ? '0' : '-1', pressed: S.tab === tabKeys[i] ? 'true' : 'false', bd: S.tab === tabKeys[i] ? 'var(--accent)' : 'transparent', fg: S.tab === tabKeys[i] ? 'var(--fg)' : 'var(--fg-muted)', onClick: () => this.setState({ tab: tabKeys[i], submitted: false }) }));
    const fields = t.fields[S.tab].map((f, i) => ({ name: this.T.en.fields[S.tab][i][0].toLowerCase().replace(/\(.*?\)/g, m => m.slice(1, -1)).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''), label: f[0], ph: f[1], req: !!f[2], dir: f[3] || 'auto', type: f[4] || 'text' }));

    return {
      t: tt, lang, dir: ar ? 'rtl' : 'ltr', theme, accent, arrow, nav, ...rv('brief'), ...rv('strat'), briefRail: this.briefRail, stratRail: this.stratRail, tabRail: this.tabRail, prevArrow: ar ? '→' : '←', nextArrow: ar ? '←' : '→',
      otherLang: ar ? 'en' : 'ar', otherFont: 'var(--font-sans)',
      themeLabel: theme === 'dark' ? (ar ? 'فاتح' : 'Light') : (ar ? 'داكن' : 'Dark'), themeAria: ar ? 'تبديل المظهر' : 'Switch colour theme',
      toggleTheme: () => { const v = theme === 'dark' ? 'light' : 'dark'; this.savePref('theme', v); this.setState({ theme: v }); },
      toggleLang: () => { const v = ar ? 'en' : 'ar'; this.savePref('lang', v); this.setState({ lang: v }); },
      goNewsletter: e => { e.preventDefault(); this.go('newsletter'); },
      goListed: e => { e.preventDefault(); this.setState({ tab: 'company', submitted: false }); this.go('submit'); },
      searchRef: this.searchRef, q: S.q, onQ: e => this.setState({ q: e.target.value }), hasQ: !!q, qOpen: q ? 'true' : 'false', results, noResults: !!q && !results.length,
      stats, statsUpd: upd,
      suggest: (ar ? ['روبوت بشري', 'الرياض', 'مسيّرات', 'جيتكس'] : ['Humanoid', 'Riyadh', 'Drones', 'GITEX']).map(label => ({ label, go: () => { this.setState({ q: label }); this.searchRef.current && this.searchRef.current.focus(); } })),
      onSearchKey: e => { if (e.key === 'ArrowDown') { const o = document.querySelector('#rm-results [role=option]'); if (o) { e.preventDefault(); o.focus(); } } },
      onOptKey: e => { const os = [...document.querySelectorAll('#rm-results [role=option]')], i = os.indexOf(e.currentTarget); if (e.key === 'ArrowDown' && os[i + 1]) { e.preventDefault(); os[i + 1].focus(); } else if (e.key === 'ArrowUp') { e.preventDefault(); (os[i - 1] || this.searchRef.current).focus(); } else if (e.key === 'Escape') { this.searchRef.current.focus(); } }, heroPins: JSON.stringify(this.DEP.map(pinOf)),
      brief: this.BRIEF.map((b, i) => ({ idx: nf2.format(i + 1), cc: b[0], country: ccName(b[0]), date: fdate(b[1]), srcLine: t.source + ': ' + b[2], title: b[3 + L], take: b[5 + L], img: b[7], hasImg: !!b[7], noImg: !b[7], panelSrc: b[2], credit: (ar ? 'الصورة: ' : 'Image: ') + b[8], srcUrl: b[9], hasUrl: !!b[9], noUrl: !b[9] })),
      cChips, sChips, tChips, ...fx, mapPins: JSON.stringify(depF.map(pinOf)), selId: S.sel || '', fCountry: S.fCountry, padEnd: S.w <= 1180 ? '0' : '432',
      hasSel: !!selD, noSel: !selD, sel, clearSel: () => this.setState({ sel: null }), panelList,
      panelTitle: selD ? t.panelRecord : t.panelLatest, showing: t.showing.replace('{a}', num(depF.length)).replace('{b}', num(this.DEP.length)),
      dChips, companies, companiesShown: S.dAll ? companies : companies.slice(0, 9), dirMore: companies.length > 9, dirMoreLbl: S.dAll ? t.showFewer : t.showAll.replace('{n}', num(companies.length)), toggleDirAll: () => this.setState(st => ({ dAll: !st.dAll })),
      mapRef: this.mapRef, mapNear: S.mapNear, mapMore: this.PAGE !== 'home' && narrow && depF.length > 5, mapMoreLbl: S.mapAll ? t.showFewer : t.showAll.replace('{n}', num(Math.min(8, depF.length))), toggleMapAll: () => this.setState(st => ({ mapAll: !st.mapAll })),
      dSort: S.dSort, onSort: e => this.setState({ dSort: e.target.value }), sortOpts: t.sortOpts.map(o => ({ v: o[0], label: o[1] })),
      panels, targets, axis0: yr(2026), axis1: yr(2033), axis2: yr(2040),
      strats: this.STRATS.map(s => ({ cc: s[0], country: ccName(s[0]), p: s[1 + L], tgt: digits(s[3 + L]), agency: s[5 + L], yr: yr(+s[7]), srcLine: t.source + ': ' + s[8] })),
      labs: this.LABS.map(g => ({ title: g[L], items: g[2].map(l => ({ name: l[L], city: l[2 + L], note: l[4 + L] })) })),
      evChips, evCChips, months, noEvents: !months.length, later, hasLater: later.length > 0,
      spotStats: t.spotStats.map(s => ({ v: digits(s[0]), label: s[1] })),
      sample: this.BRIEF.map((b, i) => ({ idx: nf2.format(i + 1), title: b[3 + L] })),
      email: S.email, onEmail: e => this.setState({ email: e.target.value }), subscribed: S.subscribed, notSubscribed: !S.subscribed,
      subscribe: e => {
        e.preventDefault(); const em = (S.email || '').trim(); if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return;
        this.savePref('subscriber', em);
        if (this.SIGNUP_URL) { try { fetch(this.SIGNUP_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ email: em, source: this.PAGE === 'spotlight' && st ? 'spotlight:' + st.id : this.PAGE, lang }) }).catch(() => {}); } catch (e2) {} }
        this.setState({ subscribed: true });
      },
      story, storyTeaser, storyBody, storySources, storyRelated, hasStory: !!st, storyHref: st ? '/spotlight?s=' + st.id : '/spotlight',
      homeHref: this.PAGE === 'home' ? '/' : this.pageHref('top'), policyHref: this.pageHref('policy', S.pc), mapFullHref: this.pageHref('map'), submitHref: this.pageHref('submit'),
      pTabs, pc, cmp, pTabId: 'rm-ptab-' + pcK,
      goCompare: e => { e.preventDefault(); this.go('compare'); },
      onPTabKey: e => { const i = this.PCC.indexOf(pcK); let d = 0; if (e.key === 'ArrowRight') d = ar ? -1 : 1; if (e.key === 'ArrowLeft') d = ar ? 1 : -1; if (!d) return; e.preventDefault(); const k = this.PCC[(i + d + this.PCC.length) % this.PCC.length]; this.setState({ pc: k }, () => { const b = document.getElementById('rm-ptab-' + k); b && b.focus(); }); },
      tabs, fields, tabId: 'rm-tab-' + S.tab,
      onTabKey: e => { const i = tabKeys.indexOf(S.tab), rtl = ar; let d = 0; if (e.key === 'ArrowRight') d = rtl ? -1 : 1; if (e.key === 'ArrowLeft') d = rtl ? 1 : -1; if (!d) return; e.preventDefault(); const k = tabKeys[(i + d + 3) % 3]; this.setState({ tab: k, submitted: false }, () => { const b = document.getElementById('rm-tab-' + k); b && b.focus(); }); },
      submitted: S.submitted, notSubmitted: !S.submitted,
      submitForm: e => { e.preventDefault(); this.setState({ submitted: true }); }, resetForm: () => this.setState({ submitted: false }),
      ...this.dbVals({ S, lang, ar, L, num, fdate, ccName, narrow, t })
    };
  }
}
