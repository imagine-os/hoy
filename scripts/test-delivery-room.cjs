const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert');const path=require('node:path');const root=process.env.DELIVERY_ROOM_DIR||'public/delivery-room';const data=JSON.parse(fs.readFileSync(path.join(root,'data.json')));let elements={};const el=s=>elements[s]??=( {innerHTML:'',textContent:'',value:'',dataset:{},classList:{toggle(){}},addEventListener(){},showModal(){this.open=true},close(){this.open=false},focus(){},setSelectionRange(){}});const ctx=vm.createContext({document:{querySelector:el,querySelectorAll:()=>[],addEventListener(){}},window:{scrollTo(){}},fetch:()=>Promise.resolve({json:()=>Promise.resolve(data)}),Date,console});vm.runInContext(fs.readFileSync(path.join(root,'app.js'),'utf8'),ctx);setImmediate(()=>{vm.runInContext('D='+JSON.stringify(data),ctx);assert.equal(data.features.length,124);assert.equal(data.features.filter(f=>f.sourcePhase==='MVP Oct 30').length,70);assert.equal(new Set(data.features.map(f=>f.id)).size,124);for(let v of ['overview','features','board','lanes','dependencies','people','roadmap']){vm.runInContext(`view='${v}';render()`,ctx);assert(el('#content').innerHTML.length>500,v)}for(let f of data.features){vm.runInContext(`showDetail('${f.id}')`,ctx);assert(el('#detailContent').innerHTML.includes(f.id))}vm.runInContext("showDetail('AC-01')",ctx);assert(el('#detailContent').innerHTML.includes('? Locally tested'));vm.runInContext("showDetail('RS-01')",ctx);assert(el('#detailContent').innerHTML.includes('✓ Criterion verified'));vm.runInContext("query='ZZZNOFEATURE';view='features';render()",ctx);assert(el('#content').innerHTML.includes('No matching features'));console.log('PASS:124 unique records,70 MVP,7 views,124 detail drilldowns,negative-evidence gates,search empty state');});

// Public bundle contract: do not accidentally ship source credentials, archives,
// private correspondence, task IDs or additional executable/data endpoints.
const forbidden=/Sentinel_[a-z0-9]+|appgprj_|(?:codex_thread|chatgpt_conversation)_id|\bGmail\b|self-email|git\.chatgpt-team\.site|(?:sk|pk)_(?:live|test)_[a-z0-9]+|Bearer\s+[a-z0-9._-]+|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const files=fs.readdirSync(root,{recursive:true}).filter(p=>fs.statSync(path.join(root,p)).isFile());
for(const file of files){
 assert(/(?:\.(?:html|css|js|json|svg|jpg)|LICENSE)$/.test(file),file);
 assert(!/(?:^|\/)(?:\.git|\.openai|\.env|node_modules)(?:\/|$)/.test(file),file);
 if(!file.endsWith('.jpg')) assert(!forbidden.test(fs.readFileSync(path.join(root,file),'utf8')),file+' private provenance');
}
const script=fs.readFileSync(path.join(root,'app.js'),'utf8');
assert.deepEqual([...script.matchAll(/fetch\(([^)]+)\)/g)].map(m=>m[1]),["'data.json'"]);
assert(!/XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage/.test(script));
for(const phase of [['MVP Oct 30',70],['Nov 30 delivery',40],['After Nov 30',12],['To be confirmed',2]]) assert.equal(data.features.filter(f=>f.sourcePhase===phase[0]).length,phase[1]);
assert.equal(data.counts.frontendReadyMvp,3);assert.equal(data.counts.testedDeployedMvp,48);assert.equal(data.humanActions.length,46);
assert.equal(new Set(data.humanActions.map(a=>a.id)).size,46);
for(const id of ['PC-10','PC-11']){const a=data.humanActions.find(a=>a.id===id);assert(/later owner confirmation/i.test(a.status));assert(a.sourceStatus);}
for(const f of data.features){assert(f.specification['Source acceptance criterion']);for(const link of [f.sourceUrl,f.specification.sourceUrl]){const u=new URL(link);assert.equal(u.origin,'https://docs.google.com');assert(u.pathname.includes(data.sourceSpreadsheet.id));assert(u.hash.includes('range='));}}
assert.equal(data.publicSnapshot.writeback,false);assert.equal(data.publicSnapshot.sheetCapturedAt,data.capturedAt);assert(data.githubEvidenceCheckedAt);
for(const html of ['index.html']){for(const m of fs.readFileSync(path.join(root,html),'utf8').matchAll(/(?:src|href)="([^"#][^"]*)"/g)){if(!/^(?:https?:)?\/\//.test(m[1]))assert(fs.existsSync(path.join(root,m[1].split('?')[0])),m[1]);}}
console.log('PASS: public bundle audit, phase/readiness counts, 46 human IDs, later confirmations, source links and read-only fetch contract');
