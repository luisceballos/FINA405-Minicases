/* Individual records, optimistic field patches, live snapshots and archived resets. */
(function(root){
 'use strict';const clone=x=>JSON.parse(JSON.stringify(x));
 const canonical=x=>x&&typeof x==='object'?(Array.isArray(x)?x.map(canonical):Object.fromEntries(Object.keys(x).sort().map(k=>[k,canonical(x[k])]))):x;
 const equal=(a,b)=>JSON.stringify(canonical(a??null))===JSON.stringify(canonical(b??null));
 const EDITION='individual-2026-v1';
 const get=(o,k)=>k.split('.').reduce((v,p)=>v?.[p],o);
 function set(o,k,v){const a=k.split('.');let t=o;for(const p of a.slice(0,-1))t=t[p]||(t[p]={});if(v===null)delete t[a.at(-1)];else t[a.at(-1)]=clone(v);}
 function fresh(student,version,attempt=1){return {edition:EDITION,studentId:student.id,studentName:student.name,version,attempt,revision:0,status:'draft',answers:{},agents:{},verified:{},committedStrategy:null,outcomesVerified:false,updatedAt:new Date().toISOString()};}
 function service(db,student,options={}){
  if(!root.MC405_ROSTER.students.some(s=>s.id===student.id&&s.name===student.name))throw Error('Choose a valid student.');
  const collection=options.collection||'mc405_mc3_individual',config=db.doc(options.config||'minicase_hub405/config'),ref=db.doc(collection+'/'+student.id);
  const version=root.MC405Variants.versionFor(student,root.MC405_ROSTER.students);
  function check(c){if(!c?.minicases?.[2]?.active||!c.minicases[2].sections?.[0]?.active)throw Error('MC3 is closed. Your work is preserved.');}
  async function open(){return db.runTransaction(async tx=>{const [c,d]=await Promise.all([tx.get(config),tx.get(ref)]);check(c.data());if(d.exists){const v=d.data();if(v.edition!==EDITION||v.studentId!==student.id||v.version!==version)throw Error('Record identity/version mismatch. Contact your instructor.');return v;}const v=fresh(student,version);tx.set(ref,v);return v;});}
  async function patch(attempt,changes,expected){
   return db.runTransaction(async tx=>{
    const [c,d]=await Promise.all([tx.get(config),tx.get(ref)]);check(c.data());const v=d.data();
    if(!v||v.attempt!==attempt)throw Error('This attempt was reset by your instructor. Reload to start the new attempt.');
    if(v.status==='submitted')throw Error('This individual report has already been submitted.');
    for(const [key,value]of Object.entries(changes)){
     if(!/^(answers\.[a-zA-Z0-9]+|agents\.[12]|verified\.[0-6]|committedStrategy|outcomesVerified)$/.test(key))throw Error('Invalid field.');
     const current=get(v,key)??(key.startsWith('answers.')?'':key.startsWith('verified.')?false:null);
     if(!equal(current,expected[key])&&!equal(current,value))throw Error('Another device changed '+key+'. Your unsaved text is kept here. Reload the saved version before editing that field again.');
     if(key==='committedStrategy'&&v.committedStrategy&&!equal(v.committedStrategy,value))throw Error('The original strategy is locked.');
     if(key.startsWith('answers.')&&(typeof value!=='string'||value.length>2000))throw Error('Invalid answer.');
     if(key.startsWith('answers.')&&v.committedStrategy&&['coupon','cf1','cf2','ytm','usdBondPrice','bondReason','fra','spotBenchmark','forwardUSD','strategy','strategyReason','defense1','finalOpinion1'].includes(key.split('.')[1])&&!equal(get(v,key),value))throw Error('The initial strategy and verified answers are locked.');
     for(const n of [1,2]){
      const a=v.agents?.[n];if(a?.defenseSubmitted&&key==='answers.defense'+n&&value!==a.defenseSubmitted)throw Error('The submitted explanation is locked.');
      if(key==='agents.'+n&&a){
       if(a.challenge!==value?.challenge||a.defenseSubmitted&&a.defenseSubmitted!==value?.defenseSubmitted||a.refutation&&!equal(a.refutation,value?.refutation))throw Error('A recorded board exchange cannot be overwritten.');
      }
     }
     set(v,key,value);
    }
    v.revision++;v.updatedAt=new Date().toISOString();tx.set(ref,v);return v;
   });
  }
  async function claimBoard(attempt,n,followup){return db.runTransaction(async tx=>{const [c,d]=await Promise.all([tx.get(config),tx.get(ref)]);check(c.data());const v=d.data();if(!v||v.attempt!==attempt||v.status==='submitted')throw Error('This attempt is no longer editable. Reload.');if(followup?v.agents?.[n]?.refutation:v.agents?.[n])throw Error('This board response is already saved. Wait for live sync.');const key=n+'_'+(followup?'followup':'opening');if(v.leases?.[key]&&Date.now()-v.leases[key]<35000)throw Error('Another device is requesting this board response. Wait for live sync, or retry after 35 seconds.');v.leases||={};v.leases[key]=Date.now();tx.set(ref,v);return true;});}
  async function submit(attempt,revision){return db.runTransaction(async tx=>{const [c,d]=await Promise.all([tx.get(config),tx.get(ref)]);check(c.data());const v=d.data();if(!v||v.attempt!==attempt)throw Error('Attempt reset. Reload.');if(v.status==='submitted')return v;if(v.revision!==revision)throw Error('Another device updated this report. Review the latest answers before submitting.');if(!Object.values(v.verified||{}).filter(Boolean).length||Array.from({length:7},(_,i)=>v.verified[i]).some(x=>!x))throw Error('Verify all seven parts first.');for(const n of [1,2])if(!v.agents?.[n]?.refutation||!v.agents[n].defenseSubmitted||v.answers['finalOpinion'+n]?.trim().length<=50)throw Error('Complete both board conversations.');const m=root.MC405Variants.packet(v.version);
  for(const [key,target]of Object.entries(m.targets))if(!m.correct(key,v.answers[key]))throw Error('Recheck '+key+' for your assigned version.');
  const strategy=v.committedStrategy?.strategy;if(!['none','fra','fx','both'].includes(strategy)||v.answers.strategy!==strategy)throw Error('The committed strategy must match your original choice.');
  const r=m.scenario(m.R,m.FUTURE_SPOT,['fra','both'].includes(strategy),['fx','both'].includes(strategy));
  const expected={realizedInterest:r.interestEUR,realizedUSD:r.proceedsUSD,interestSaving:m.N*m.R-r.interestEUR,fxDifference:r.proceedsUSD-m.targets.strongUSD};
  for(const [k,value]of Object.entries(expected))if(v.answers[k]===''||!Number.isFinite(Number(v.answers[k]))||Math.abs(Number(v.answers[k])-value)>.002)throw Error('Recheck '+k+'.');
  for(const k of ['bondReason','strategyReason','defense1','finalOpinion1','outcomeReason','defense2','finalOpinion2','finalReason','risk'])if(typeof v.answers[k]!=='string'||v.answers[k].trim().length<=50)throw Error('Complete '+k+' with more than 50 characters.');
  v.computed={...m.targets,...expected};v.submissionMode='individual';v.status='submitted';v.submittedAt=new Date().toISOString();v.updatedAt=v.submittedAt;v.revision++;tx.set(ref,v);return v;});}
  return {ref,version,open,patch,submit,claimBoard};
 }
 async function reset(db,id,password,options={}){
  const config=db.doc(options.config||'minicase_hub405/config'),collection=options.collection||'mc405_mc3_individual',ref=db.doc(collection+'/'+id);
  return db.runTransaction(async tx=>{const [c,d]=await Promise.all([tx.get(config),tx.get(ref)]);if(!password||c.data()?.password!==password)throw Error('Instructor sign-in required.');const s=root.MC405_ROSTER.students.find(x=>x.id===id);if(!s)throw Error('Unknown student.');const prior=d.data();if(prior)tx.set(db.doc((options.archives||'mc405_mc3_archives')+'/'+id+'_attempt'+prior.attempt+'_'+Date.now()),{...prior,archivedAt:new Date().toISOString(),reason:'Instructor reset'});const v=fresh(s,root.MC405Variants.versionFor(s,root.MC405_ROSTER.students),(prior?.attempt||0)+1);tx.set(ref,v);return v;});
 }
 root.MC405Individual={service,reset,fresh,EDITION,get,equal};
})(typeof window!=='undefined'?window:globalThis);
