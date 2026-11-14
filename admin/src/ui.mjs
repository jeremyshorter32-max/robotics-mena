// The portal's single page. Brand tokens match the public site (indigo / paper / ink, IBM Plex).
// All text from GitHub is inserted as text nodes (never parsed as HTML), so nothing in a pull request can run as code.
export const page = nonce => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Robotics MENA · Admin</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
:root{--bg:#F3F1EC;--surface:#fff;--ink:#111216;--muted:#5E6070;--line:#DEDBD3;--brand:#26246E;--on-brand:#F3F1EC;--ok:#1F6B3A;--warn:#8A5A00;--bad:#A3361F;--tint:#E3E2F2}
@media (prefers-color-scheme:dark){:root{--bg:#111216;--surface:#1A1B22;--ink:#F3F1EC;--muted:#A3A5B3;--line:#2A2C35;--brand:#A9A7DE;--on-brand:#111216;--ok:#7FD39B;--warn:#E8B860;--bad:#F0A08C;--tint:#25263A}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:400 15px/1.5 'IBM Plex Sans',system-ui,sans-serif}
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
a{color:var(--brand)}.problems{color:var(--bad)}.add{color:var(--ok)}.rem{color:var(--bad)}
</style></head><body>
<header><b>Robotics MENA · Admin</b><nav aria-label="Sections"><button data-tab="inbox" aria-current="page">Approvals</button><button data-tab="runs">Agent runs</button><button data-tab="leads">Add a lead</button></nav><span class="who" id="who"></span></header>
<main id="main"><p class="muted">Loading…</p></main>
<script nonce="${nonce}">
const $=(t,a={},...k)=>{const e=document.createElement(t);for(const[n,v]of Object.entries(a)){if(n==='on')for(const[ev,f]of Object.entries(v))e.addEventListener(ev,f);else if(v!=null&&v!==false)e.setAttribute(n,v===true?'':v)}for(const c of k.flat())if(c!=null)e.append(c.nodeType?c:document.createTextNode(String(c)));return e};
const api=async(p,b)=>{const r=await fetch(p,b?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)}:{});const j=await r.json().catch(()=>({error:'HTTP '+r.status}));if(!r.ok)throw new Error(j.error||('HTTP '+r.status));return j};
const fmt=s=>s?new Date(s).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'}):'';
const main=document.getElementById('main');let me=null;const can=r=>({viewer:1,editor:2,owner:3})[me.role]>=({viewer:1,editor:2,owner:3})[r];
const show=(...n)=>{main.replaceChildren(...n.flat().filter(x=>x!=null&&x!==false))};const err=e=>$('p',{class:'msg problems',role:'alert'},e.message||String(e));
document.querySelectorAll('nav button').forEach(b=>b.addEventListener('click',()=>go(b.dataset.tab)));
function go(tab,arg){document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false'));location.hash=tab+(arg?'-'+arg:'');({inbox,runs,leads,item})[tab](arg)}

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

async function runs(){show($('h1',{},'Agent runs'),$('p',{class:'muted'},'Loading…'));try{const list=await api('/api/runs');const msg=$('p',{class:'msg',role:'status'});
 const days=$('input',{type:'number',min:1,max:60,value:7,id:'days',style:'width:90px'});
 const start=async(file,b)=>{if(!confirm('Start this run now?'))return;msg.textContent='Starting…';try{await api('/api/runs/'+file,b);msg.textContent='Started. It appears below within a minute.'}catch(e){msg.textContent=e.message}};
 show($('h1',{},'Agent runs'),can('owner')?$('div',{class:'card row'},$('label',{for:'days'},'Weekly scan, days back:'),days,$('button',{class:'act primary',on:{click:()=>start('scan.yml',{days:days.value})}},'Run scan'),$('button',{class:'act',on:{click:()=>start('categorization-monitor.yml',{force:true})}},'Check web-filter status')):$('p',{class:'muted'},'Only the owner can start runs.'),msg,
  $('ul',{class:'list'},list.map(r=>$('li',{class:'card row'},$('span',{class:'pill '+(r.conclusion==='success'?'ok':r.conclusion?'bad':'warn')},r.conclusion||r.status),$('a',{href:r.url,target:'_blank',rel:'noopener noreferrer'},r.name),$('span',{class:'muted mono'},r.event),$('span',{class:'muted mono',style:'margin-left:auto'},fmt(r.created_at))))))}catch(e){show($('h1',{},'Agent runs'),err(e))}}

function leads(){const msg=$('p',{class:'msg',role:'status'});const u=$('input',{type:'url',id:'lead-url',placeholder:'https://…'});const n=$('textarea',{id:'lead-note',placeholder:'What is it and why does it matter? (optional)'});
 show($('h1',{},'Add a lead'),$('p',{class:'muted'},'A link to a company, deployment or event. It is saved as a GitHub issue labelled “lead” for the next research run; nothing is published.'),
  $('div',{class:'card',style:'display:flex;flex-direction:column;gap:10px'},$('label',{for:'lead-url'},'Link'),u,$('label',{for:'lead-note'},'Note'),n,$('div',{},$('button',{class:'act primary',disabled:!can('editor'),on:{click:async()=>{msg.textContent='Saving…';try{const r=await api('/api/leads',{url:u.value,note:n.value});msg.textContent='Saved as issue #'+r.number+'.';u.value='';n.value=''}catch(e){msg.textContent=e.message}}}},'Save lead')),msg))}

api('/api/me').then(m=>{me=m;document.getElementById('who').textContent=m.email+' · '+m.role;const h=location.hash.slice(1);const k=/^item-(\\d+)$/.exec(h);k?go('item',k[1]):go(['inbox','runs','leads'].includes(h)?h:'inbox')}).catch(e=>show($('h1',{},'Robotics MENA · Admin'),err(e)));
</script></body></html>`;
