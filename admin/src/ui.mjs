// The portal's single page. Brand tokens match the public site (indigo / paper / ink, IBM Plex).
// All text from GitHub is inserted as text nodes (never parsed as HTML), so nothing in a pull request can run as code.
export const page = nonce => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Robotics MENA · Admin</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
:root{--bg:#F3F1EC;--surface:#fff;--ink:#111216;--muted:#5E6070;--line:#DEDBD3;--brand:#26246E;--on-brand:#F3F1EC;--ok:#1F6B3A;--warn:#8A5A00;--bad:#A3361F;--tint:#E3E2F2}
@media (prefers-color-scheme:dark){:root{--bg:#111216;--surface:#1A1B22;--ink:#F3F1EC;--muted:#A3A5B3;--line:#2A2C35;--brand:#A9A7DE;--on-brand:#111216;--ok:#7FD39B;--warn:#E8B860;--bad:#F0A08C;--tint:#25263A}}
*{box-sizing:border-box}[hidden]{display:none!important}input[type=checkbox]{width:auto}body{margin:0;background:var(--bg);color:var(--ink);font:400 15px/1.5 'IBM Plex Sans',system-ui,sans-serif}
header{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:14px max(16px,4vw);border-bottom:1px solid var(--line);background:var(--surface)}
header b{font-weight:600}.who{margin-left:auto;font:500 12px 'IBM Plex Mono',monospace;color:var(--muted)}
nav{display:flex;gap:4px}nav button{border:0;background:none;padding:8px 12px;font:500 14px inherit;font-family:inherit;color:var(--muted);border-radius:4px;cursor:pointer}
nav button[aria-current=page]{background:var(--tint);color:var(--ink)}
main{max-width:1100px;margin:0 auto;padding:24px max(16px,4vw) 64px;display:flex;flex-direction:column;gap:16px}
h1{font-size:24px;margin:0;font-weight:600;letter-spacing:-.01em}h2{font-size:17px;margin:8px 0 0;font-weight:600}
.muted{color:var(--muted)}.mono{font:500 12px 'IBM Plex Mono',monospace;letter-spacing:.04em}
.list{display:flex;flex-direction:column;gap:8px;list-style:none;margin:0;padding:0}
.card{background:var(--surface);border:1px solid var(--line);border-radius:6px;padding:14px 16px}
.row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}.row>*{min-width:0}
button.act,a.act{display:inline-flex;align-items:center;height:38px;padding:0 14px;border-radius:6px;border:1px solid var(--line);background:var(--surface);color:var(--ink);font:500 14px inherit;font-family:inherit;cursor:pointer;text-decoration:none}
button.primary{background:var(--brand);color:var(--on-brand);border-color:var(--brand)}button.danger{color:var(--bad)}
button:disabled{opacity:.5;cursor:default}button:focus-visible,a:focus-visible,textarea:focus-visible,input:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
.pill{font:500 11px 'IBM Plex Mono',monospace;padding:3px 7px;border-radius:3px;background:var(--tint)}
.pill.ok{color:var(--ok)}.pill.bad{color:var(--bad)}.pill.warn{color:var(--warn)}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--line);vertical-align:top}
.scroll{overflow-x:auto}textarea,input{width:100%;font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)}
textarea{min-height:80px}.msg{padding:10px 12px;border-radius:6px;background:var(--tint)}.msg:empty{display:none}
a{color:var(--brand)}nav{flex-wrap:wrap}
.grid{display:grid;align-items:start;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));gap:12px}
.big{font:600 30px/1.1 'IBM Plex Sans',sans-serif;letter-spacing:-.02em}.kpis{display:flex;gap:24px;flex-wrap:wrap}.kpis>div{display:flex;flex-direction:column}
.bars{display:flex;align-items:flex-end;gap:4px;height:90px;margin-top:8px}.bars span{flex:1;background:var(--brand);border-radius:2px 2px 0 0;min-height:2px;position:relative}
.bars span[data-v]:hover::after{content:attr(data-v);position:absolute;bottom:100%;left:50%;transform:translateX(-50%);font:500 11px 'IBM Plex Mono',monospace;color:var(--ink)}
.axis{display:flex;justify-content:space-between;font:500 11px 'IBM Plex Mono',monospace;color:var(--muted)}
.item{display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line)}.item:last-child{border-bottom:0}
.item input{width:18px;height:18px;margin-top:3px;flex:none}.item .t{font-weight:600}.item.done .t{text-decoration:line-through;color:var(--muted)}
details>summary{cursor:pointer}select{font:inherit;padding:8px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink);max-width:100%}.problems{color:var(--bad)}.add{color:var(--ok)}.rem{color:var(--bad)}
</style></head><body>
<header><b>Robotics MENA · Admin</b><nav aria-label="Sections"><button data-tab="inbox" aria-current="page">Approvals</button><button data-tab="requests">Requests</button><button data-tab="backlog">Backlog</button><button data-tab="metrics">Metrics</button><button data-tab="runs">Runs</button></nav><span class="who" id="who"></span></header>
<main id="main"><p class="muted">Loading…</p></main>
<script nonce="${nonce}">
const $=(t,a={},...k)=>{const e=document.createElement(t);for(const[n,v]of Object.entries(a)){if(n==='on')for(const[ev,f]of Object.entries(v))e.addEventListener(ev,f);else if(v!=null&&v!==false)e.setAttribute(n,v===true?'':v)}for(const c of k.flat(Infinity))if(c!=null&&c!==false)e.append(c.nodeType?c:document.createTextNode(String(c)));return e};
const api=async(p,b)=>{const r=await fetch(p,b?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}:{});const j=await r.json().catch(()=>({error:'HTTP '+r.status}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j};
const fmt=s=>s?new Date(s).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'';
const main=document.getElementById('main');let me=null;const can=r=>({viewer:1,editor:2,owner:3})[me.role]>=({viewer:1,editor:2,owner:3})[r];
const show=(...n)=>{main.replaceChildren(...n.flat(Infinity).filter(x=>x!=null&&x!==false))};const err=e=>$('p',{class:'msg problems',role:'alert'},e.message||String(e));
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.tab)));
function go(tab,arg){document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false'));location.hash=tab+(arg?'-'+arg:'');({inbox,runs,requests,backlog,metrics,item})[tab](arg)}

async function inbox(){show($('h1',{},'Approvals'),$('p',{class:'muted'},'Agent pull requests waiting for a decision. Only data, media and newsletter changes can be published from here.'),$('p',{class:'muted'},'Loading…'));
 try{const items=await api('/api/inbox');show($('h1',{},'Approvals'),$('p',{class:'muted'},items.length?items.length+' waiting':'Nothing waiting. New items appear when the weekly scan or the brief runs.'),
  $('ul',{class:'list'},items.map(i=>$('li',{class:'card'},$('div',{class:'row'},$('span',{class:'pill'+(i.agent?'':' warn')},i.kind),$('a',{href:'#item-'+i.number,on:{click:e=>{e.preventDefault();go('item',i.number)}}},'#'+i.number+' '+i.title),i.draft?$('span',{class:'pill warn'},'draft'):null,$('span',{class:'muted mono',style:'margin-left:auto'},fmt(i.created_at)))))))}catch(e){show($('h1',{},'Approvals'),err(e))}}

function diffBlock(d){const sec=[$('h2',{},d.file)];
 if(d.added.length)sec.push($('p',{class:'add'},d.added.length+' added'),$('div',{class:'scroll'},$('table',{},$('tr',{},$('th',{},'Record'),$('th',{},'Country'),$('th',{},'Date'),$('th',{},'Source')),d.added.map(r=>$('tr',{},$('td',{},r.label),$('td',{},r.country||''),$('td',{},r.date||''),$('td',{},r.source?$('a',{href:r.source,target:'_blank',rel:'noopener noreferrer'},new URL(r.source).hostname):'—'))))));
 if(d.changed.length)sec.push($('p',{},d.changed.length+' changed'),$('div',{class:'scroll'},$('table',{},$('tr',{},$('th',{},'Record'),$('th',{},'Fields')),d.changed.map(r=>$('tr',{},$('td',{},r.label),$('td',{},(r.fields||[]).join(', ')||'—'))))));
 if(d.removed.length)sec.push($('p',{class:'rem'},d.removed.length+' removed: '+d.removed.map(r=>r.label).join(', ')));
 if(!d.added.length&&!d.changed.length&&!d.removed.length)sec.push($('p',{class:'muted'},'No record changes (formatting only).'));return $('section',{class:'card'},sec)}

async function item(n){show($('p',{class:'muted'},'Loading #'+n+'…'));let it;try{it=await api('/api/inbox/'+n)}catch(e){return show(err(e))}
 const msg=$('p',{class:'msg',role:'status','aria-live':'polite'});const note=$('textarea',{id:'note',placeholder:'Note for “send back” or “reject” (what should change and why)'});
 const act=async(kind,b)=>{if(kind!=='approve'&&kind!=='reject'&&!note.value.trim()){msg.textContent='Write what should change first.';return}
  if(!confirm(kind==='approve'?'Publish this to the live site?':kind==='reject'?'Close this without publishing?':'Send this back with your note?'))return;
  btns.forEach(x=>x.disabled=true);msg.textContent='Working…';try{await api('/api/inbox/'+n+'/'+kind,b);msg.textContent=kind==='approve'?'Published. The site updates in about two minutes.':kind==='reject'?'Rejected and closed.':'Sent back with your note.'}catch(e){msg.textContent=e.message;btns.forEach(x=>x.disabled=false)}};
 const btns=[$('button',{class:'act primary',disabled:!it.approvable||!can('editor'),on:{click:()=>act('approve',{head_sha:it.head_sha})}},'Approve and publish'),$('button',{class:'act',disabled:!can('editor'),on:{click:()=>act('send-back',{note:note.value})}},'Send back'),$('button',{class:'act danger',disabled:!can('editor'),on:{click:()=>act('reject',{note:note.value})}},'Reject')];
 show($('a',{href:'#inbox',on:{click:e=>{e.preventDefault();go('inbox')}}},'← All approvals'),$('h1',{},'#'+it.number+' '+it.title),$('p',{class:'row'},$('span',{class:'pill'},it.kind),$('span',{class:'mono muted'},it.branch),$('a',{href:it.url,target:'_blank',rel:'noopener noreferrer'},'Open on GitHub')),
  it.problems.length?$('div',{class:'card problems'},$('b',{},'Cannot be published from here: '),it.problems.join('; ')):null,
  it.body?$('details',{class:'card'},$('summary',{},'Summary from the agent'),$('pre',{style:'white-space:pre-wrap;font:inherit'},it.body)):null,
  it.data.map(diffBlock),$('details',{class:'card'},$('summary',{},it.files.length+' files'),$('ul',{},it.files.map(f=>$('li',{class:'mono'},f.status+' '+f.name+' (+'+f.additions+' −'+f.deletions+')')))),
  $('div',{class:'card',style:'display:flex;flex-direction:column;gap:10px'},$('label',{for:'note'},'Your decision'),note,$('div',{class:'row'},btns),msg))}

async function runs(){show($('h1',{},'Runs'),$('p',{class:'muted'},'Loading…'));try{const list=await api('/api/runs');const msg=$('p',{class:'msg',role:'status'});
 const start=async(file,b)=>{if(!confirm('Start this run now?'))return;msg.textContent='Starting…';try{await api('/api/runs/'+file,b);msg.textContent='Started. It appears below within a minute.'}catch(e){msg.textContent=e.message}};
 show($('h1',{},'Runs'),$('p',{class:'muted'},'GitHub Actions: site deploys and the web-filter monitor. Research is done by Claude (see Requests) on your subscription, not here.'),can('owner')?$('div',{class:'card row'},$('button',{class:'act',on:{click:()=>start('categorization-monitor.yml',{force:true})}},'Check web-filter status now')):null,msg,
  $('ul',{class:'list'},list.map(r=>$('li',{class:'card row'},$('span',{class:'pill '+(r.conclusion==='success'?'ok':r.conclusion?'bad':'warn')},r.conclusion||r.status),$('a',{href:r.url,target:'_blank',rel:'noopener noreferrer'},r.name),$('span',{class:'muted mono'},r.event),$('span',{class:'muted mono',style:'margin-left:auto'},fmt(r.created_at))))))}catch(e){show($('h1',{},'Runs'),err(e))}}

async function requests(){show($('h1',{},'Requests'),$('p',{class:'muted'},'Loading…'));
 const kinds=me.requestKinds.filter(k=>can(k.role));const msg=$('p',{class:'msg',role:'status','aria-live':'polite'});
 const sel=$('select',{id:'rq-kind'},kinds.map(k=>$('option',{value:k.id},k.label)));const hint=$('p',{class:'muted',style:'margin:0'});const link=$('input',{type:'url',id:'rq-link',placeholder:'https://… (optional)'});const text=$('textarea',{id:'rq-text'});
 const upd=()=>{const k=kinds.find(x=>x.id===sel.value);hint.textContent=k?k.hint:'';text.placeholder=k?k.hint:''};sel.addEventListener('change',upd);upd();
 const form=kinds.length?$('div',{class:'card',style:'display:flex;flex-direction:column;gap:10px'},$('label',{for:'rq-kind'},'What do you need?'),sel,hint,$('label',{for:'rq-link'},'Link'),link,$('label',{for:'rq-text'},'Details'),text,
  $('div',{},$('button',{class:'act primary',on:{click:async e=>{e.target.disabled=true;msg.textContent='Sending…';try{const r=await api('/api/requests',{kind:sel.value,link:link.value,text:text.value});msg.textContent='Queued as #'+r.number+'. Claude picks it up in its next daily run and the result appears under Approvals.';link.value='';text.value='';load()}catch(x){msg.textContent=x.message}e.target.disabled=false}}},'Send to Claude')),msg):$('p',{class:'muted'},'Your role can view requests only.');
 const listBox=$('div',{});
 async function load(){try{const rs=await api('/api/requests');listBox.replaceChildren($('h2',{},'Recent requests'),rs.length?$('ul',{class:'list'},rs.map(r=>$('li',{class:'card row'},$('span',{class:'pill '+(r.status==='done'?'ok':r.status==='needs info'?'bad':r.status==='in progress'||r.status==='awaiting approval'?'warn':'')},r.status),$('a',{href:r.url,target:'_blank',rel:'noopener noreferrer'},'#'+r.number+' '+r.title),r.comments?$('span',{class:'muted mono'},r.comments+' comments'):null,$('span',{class:'muted mono',style:'margin-left:auto'},fmt(r.created_at))))):$('p',{class:'muted'},'No requests yet.'))}catch(e){listBox.replaceChildren(err(e))}}
 show($('h1',{},'Requests'),$('p',{class:'muted'},'Ask Claude for work. Each request is saved as a GitHub issue; Claude’s daily task (on your Claude subscription, no extra cost) does it and sends the result to Approvals.'),form,listBox);load()}

async function backlog(){show($('h1',{},'Backlog'),$('p',{class:'muted'},'Loading…'));let b;try{b=await api('/api/backlog')}catch(e){return show($('h1',{},'Backlog'),err(e))}
 const msg=$('p',{class:'msg',role:'status','aria-live':'polite'});const showDone=$('input',{type:'checkbox',id:'bl-done'});
 const secs=b.sections.map(s=>{const box=$('section',{class:'card'},$('h2',{},s.title+' ('+s.items.filter(i=>!i.done).length+' open)'),s.items.map(it=>{const cb=$('input',{type:'checkbox',id:'bl-'+it.id,checked:it.done,disabled:!can('editor'),'aria-label':'Done: '+it.title});
  cb.addEventListener('change',async()=>{cb.disabled=true;msg.textContent='Saving…';try{await api('/api/backlog/done',{id:it.id,done:cb.checked});msg.textContent=cb.checked?'Ticked off and saved to BACKLOG.md.':'Reopened.';row.classList.toggle('done',cb.checked)}catch(e){msg.textContent=e.message;cb.checked=!cb.checked}cb.disabled=!can('editor')});
  const row=$('div',{class:'item'+(it.done?' done':''),'data-done':it.done?'1':''},cb,$('div',{style:'min-width:0'},$('div',{class:'t'},it.title),$('details',{},$('summary',{class:'muted'},'Details'),$('p',{style:'margin:6px 0 0'},it.text))));return row}));return box});
 const applyFilter=()=>document.querySelectorAll('.item[data-done="1"]').forEach(x=>x.hidden=!showDone.checked);showDone.addEventListener('change',applyFilter);
 const sec=$('select',{id:'bl-sec'},b.sections.map(s=>$('option',{},s.title)));const t=$('input',{id:'bl-text',placeholder:'New item, e.g. “Add Kuwait drone rules to the policy page”'});
 show($('h1',{},'Backlog'),$('p',{class:'muted'},b.open+' open items · changes are saved to BACKLOG.md in the repository'),
  can('editor')?$('div',{class:'card',style:'display:flex;flex-direction:column;gap:10px'},$('label',{for:'bl-text'},'Add an item'),$('div',{class:'row'},sec,t),$('div',{},$('button',{class:'act primary',on:{click:async()=>{msg.textContent='Saving…';try{await api('/api/backlog/add',{section:sec.value,text:t.value});backlog()}catch(e){msg.textContent=e.message}}}},'Add to backlog'))):null,
  $('label',{class:'row'},showDone,'Show completed items'),msg,secs);applyFilter()}

function bars(data,key){const max=Math.max(1,...data.map(d=>d[key]||0));return [$('div',{class:'bars',role:'img','aria-label':data.map(d=>d.label+': '+(d[key]||0)).join(', ')},data.map(d=>$('span',{style:'height:'+Math.round(100*(d[key]||0)/max)+'%','data-v':String(d[key]||0)}))),$('div',{class:'axis'},$('span',{},data[0]?.label||''),$('span',{},data[data.length-1]?.label||''))]}
const tbl=(rows,cols)=>$('div',{class:'scroll'},$('table',{},$('tr',{},cols.map(c=>$('th',{},c[0]))),rows.map(r=>$('tr',{},cols.map(c=>$('td',{},c[1](r)))))));
const kpi=(n,l)=>$('div',{},$('span',{class:'big'},n==null?'–':Number(n).toLocaleString()),$('span',{class:'muted'},l));
async function metrics(){show($('h1',{},'Metrics'),$('p',{class:'muted'},'Loading…'));let m;try{m=await api('/api/metrics')}catch(e){return show($('h1',{},'Metrics'),err(e))}
 const T=m.traffic||{},W=m.waitlist||{},D=m.database||{},B=m.brief||{},dep=(m.deploys||{}).lastDeploy;
 const traffic=$('section',{class:'card'},$('h2',{},'Site traffic (GoatCounter)'),T.error?err({message:T.error}):!T.configured?$('p',{class:'muted'},'Not connected yet: add a read-only GoatCounter API key as the GOATCOUNTER_TOKEN secret (admin/README.md).'):[
  $('div',{class:'kpis'},kpi(T.visits7,'visits, last 7 days'),kpi(T.visits30,'visits, last 30 days')),T.daily?.length?bars(T.daily.map(d=>({label:d.day,v:d.count})),'v'):null,
  T.pages?.length?[$('h2',{},'Top pages (30 days)'),tbl(T.pages,[['Page',r=>r.path||r.name],['Visits',r=>r.count]])]:null,
  T.referrers?.length?[$('h2',{},'Where visitors come from'),tbl(T.referrers,[['Source',r=>r.name],['Visits',r=>r.count]])]:null,
  T.countries?.length?[$('h2',{},'Countries'),tbl(T.countries,[['Country',r=>r.name],['Visits',r=>r.count]])]:null,
  T.errors?.length?$('p',{class:'muted'},'Some figures unavailable: '+T.errors.join('; ')):null]);
 const wk=W.weekly?Object.entries(W.weekly).sort().map(([k,v])=>({label:k,v})):[];
 const wait=$('section',{class:'card'},$('h2',{},'Waitlist sign-ups'),W.error?err({message:W.error}):!W.configured?$('p',{class:'muted'},'Not connected yet: update the Google Sheet script and add SHEET_STATS_URL and SHEET_STATS_KEY (integrations/google-sheets/README.md).'):[
  $('div',{class:'kpis'},kpi(W.signups?.unique,'people on the waitlist'),kpi(W.signups?.total,'sign-ups incl. repeats'),kpi(W.tabs?.submission,'submissions'),kpi(W.tabs?.work,'work enquiries')),wk.length?[$('p',{class:'muted',style:'margin:8px 0 0'},'Sign-ups per week (last 12 weeks)'),bars(wk,'v')]:null]);
 const db=$('section',{class:'card'},$('h2',{},'Database'),D.error?err({message:D.error}):[$('div',{class:'kpis'},kpi(D.totals?.companies,'companies'),kpi(D.totals?.deployments,'deployments'),kpi(D.totals?.upcomingEvents,'upcoming events')),
  $('p',{class:'muted',style:'margin:8px 0 0'},'Companies + deployments added per week (8 weeks)'),bars((D.weekly?.companies||[]).map((c,i)=>({label:c.week,v:c.count+((D.weekly.deployments[i]||{}).count||0)})),'v'),
  D.recent?.length?[$('h2',{},'Latest additions'),tbl(D.recent,[['Added',r=>r.added],['Type',r=>r.kind],['Record',r=>r.label],['Country',r=>r.country||'']])]:null]);
 const ops=$('section',{class:'card'},$('h2',{},'Site health'),$('p',{},'Brief on the site: ',B.week?B.week+' ('+B.items+' signals, newest '+B.newest+')':'–'),
  $('p',{},'Last deploy: ',dep?[$('span',{class:'pill '+(dep.conclusion==='success'?'ok':'bad')},dep.conclusion||dep.status),' ',$('a',{href:dep.url,target:'_blank',rel:'noopener noreferrer'},fmt(dep.at))]:'–'),
  Array.isArray(m.monitor)&&m.monitor.length?[$('h2',{},'Web filters'),tbl(m.monitor,[['Vendor',r=>r.vendor],['Status',r=>$('span',{class:'pill '+(r.reached?'ok':r.status==='BLOCKED'?'warn':'')},r.reached?'reached':r.status)],['Target',r=>r.target],['Checked',r=>fmt(r.checked)]])]:null);
 show($('h1',{},'Metrics'),$('p',{class:'muted'},'Updated '+fmt(m.generated)),$('div',{class:'grid'},traffic,wait,db,ops))}

api('/api/me').then(m=>{me=m;document.getElementById('who').textContent=m.email+' · '+m.role;const h=location.hash.slice(1);const k=/^item-(\\d+)$/.exec(h);k?go('item',k[1]):go(['inbox','runs','requests','backlog','metrics'].includes(h)?h:'inbox')}).catch(e=>show($('h1',{},'Robotics MENA · Admin'),err(e)));
</script></body></html>`;
