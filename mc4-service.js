/* MC4 only. Serialized snapshots, transactional reservations, immutable completed screens. */
(function(root){'use strict';
const EDITION='mc4-fiveyear-15-v1',clone=x=>JSON.parse(JSON.stringify(x));
const canonical=x=>x&&typeof x==='object'?(Array.isArray(x)?x.map(canonical):Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]))):x;
const equal=(a,b)=>JSON.stringify(canonical(a??null))===JSON.stringify(canonical(b??null));
const words=s=>typeof s==='string'?s.trim().split(/\s+/).filter(Boolean).length:0;
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
async function digest(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,'0')).join('');}
function versionFor(student){const n=MC405_ROSTER.students.findIndex(s=>s.id===student.id&&s.name===student.name);if(n<0)throw Error('Choose a roster name.');return n%15+1;}
function blank(v){return {v,t:0,a:{},boards:{},done:{}};}
function validate(old,next){
 if(next.v!==old.v||!Number.isInteger(next.t)||next.t<0||next.t>3)throw Error('Invalid version or screen.');
 const allowed=new Set([0,1,2,3].flatMap(t=>Object.keys(CFO.targets(old.v,t))));
 for(const [k,x]of Object.entries(next.a||{}))if(!allowed.has(k)||typeof x!=='string'||x.length>150)throw Error('Invalid answer field.');
 for(let t=0;t<4;t++){
  if(old.done?.[t]&&!equal(old.done[t],next.done?.[t]))throw Error('Completed screen is locked.');
  if(old.done?.[t]||old.boards?.[t]?.locked){for(const k of Object.keys(CFO.targets(old.v,t)))if((old.a[k]??'')!==(next.a[k]??''))throw Error('This screen’s calculations are locked.');}
  if(old.done?.[t]&&!equal(old.boards?.[t],next.boards?.[t]))throw Error('Completed board conversation is locked.');
  const b=next.boards?.[t],prior=old.boards?.[t];
  if(prior?.locked&&b?.locked!==prior.locked)throw Error('Submitted explanation is locked.');
  if(prior?.follow&&b?.follow!==prior.follow)throw Error('Board follow-up is locked.');
  if(b){if(t===0)throw Error('No board meeting on screen zero.');for(const key of ['draft','locked','final','follow'])if(b[key]!=null&&(typeof b[key]!=='string'||b[key].length>6000))throw Error('Board text too long.');if(b.locked&&(words(b.locked)<50||words(b.locked)>120||!CFO.valid(old.v,t,next.a)))throw Error('Verify calculations and use 50–120 words first.');if(b.follow&&!b.locked)throw Error('Missing initial explanation.');}
  if(next.done?.[t]){if(t&&!next.done[t-1])throw Error('Complete earlier screens first.');if(!CFO.valid(old.v,t,next.a))throw Error('Verify all calculations before continuing.');if(t&&(!b?.locked||!b?.follow||words(b.final)<50||words(b.final)>120))throw Error('Complete the board conversation.');}
  if(t>0&&(Object.keys(next.a||{}).some(k=>k.startsWith('t'+t+'_'))||b)&&!next.done?.[t-1])throw Error('That screen is not unlocked.');
 }
 if(next.t>0&&!next.done?.[next.t-1])throw Error('That screen is not unlocked.');
}
function service(db,options={}){
 const suffix=options.qa?'_qa_'+options.qa:'',collection='mc405_mc4_individual'+suffix,archives='mc405_mc4_archives'+suffix,config=db.doc(options.qa?'mc405_mc4_tests/'+options.qa:'minicase_hub405/config');
 function openConfig(c){if(!c||!(options.qa?c.active:c.minicases?.[3]?.active&&c.minicases[3].sections?.[0]?.active))throw Error('MC4 is closed. Your work remains saved. Contact your instructor.');}
 async function claim(student,code,session){const hash=await digest(student.id+':'+code),v=versionFor(student),ref=db.doc(collection+'/'+student.id);return db.runTransaction(async tx=>{const [cfg,snap]=await Promise.all([tx.get(config),tx.get(ref)]);openConfig(cfg.data());const old=snap.data();if(old&&old.codeHash!==hash)throw Error('This name is already reserved. Use your recovery code or ask the instructor to release it.');const r=old||{edition:EDITION,studentId:student.id,studentName:student.name,version:v,attempt:random(),revision:0,status:'draft',codeHash:hash,state:blank(v),createdAt:new Date().toISOString()};if(r.edition!==EDITION||r.version!==v)throw Error('Record version mismatch. Contact your instructor.');r.session=session;r.updatedAt=new Date().toISOString();tx.set(ref,r);return r;});}
 async function save(id,session,attempt,revision,next){const ref=db.doc(collection+'/'+id);return db.runTransaction(async tx=>{const [cfg,snap]=await Promise.all([tx.get(config),tx.get(ref)]);openConfig(cfg.data());const r=snap.data();if(!r||r.attempt!==attempt||r.session!==session)throw Error('This session was released or resumed on another computer. Your unsaved draft is preserved here.');if(r.status==='submitted')throw Error('Final submission is locked.');if(r.revision!==revision)throw Error('A newer saved revision exists. Reload to resume.');validate(r.state,next);r.state=clone(next);r.revision++;r.updatedAt=new Date().toISOString();if(next.done?.[3]){r.status='submitted';r.submittedAt=r.updatedAt;}tx.set(ref,r);return r;});}
 async function release(id,password){const ref=db.doc(collection+'/'+id);return db.runTransaction(async tx=>{const [cfg,snap]=await Promise.all([tx.get(db.doc('minicase_hub405/config')),tx.get(ref)]);if(!password||cfg.data()?.password!==password)throw Error('Instructor sign-in required.');if(snap.exists){tx.set(db.doc(archives+'/'+id+'_'+random()),{...snap.data(),archivedAt:new Date().toISOString(),reason:'Instructor released name'});tx.delete(ref);}return true;});}
 return {collection,archives,config,claim,save,release,ref:id=>db.doc(collection+'/'+id)};
}
root.MC4Service={service,versionFor,blank,validate,equal,random,EDITION};
})(globalThis);
