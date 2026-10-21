(function(root){
 'use strict';
 function createService(db,group){
  if(!Number.isInteger(group)||group<1||group>40)throw Error('Choose a valid group.');
  const teams=db.doc('mc405_group_teams/mc3_v4_sec1'),config=db.doc('minicase_hub405/config');
  const key='mc3_v4_sec1_grp'+group,sub=db.doc('mc405_submissions/'+key),draft=db.doc('mc405_drafts/'+key);
  const roster=()=>root.MC405_ROSTER.students;
  function check(cfg){const c=cfg?.minicases?.[2];if(!c?.active||!c.sections?.[0]?.active)throw Error('MC3 is closed. Contact your instructor.');if(group>Math.max(8,Number(c.sections[0].groups)||8))throw Error('This group is unavailable.');}
  function validate(ids){if(!Array.isArray(ids)||ids.length<1||ids.length>5||new Set(ids).size!==ids.length||ids.some(id=>!roster().some(s=>s.id===id)))throw Error('Choose 1–5 different students from the roster.');}
  async function register(ids){
   validate(ids);
   return db.runTransaction(async tx=>{
    const [c,t,s]=await Promise.all([tx.get(config),tx.get(teams),tx.get(sub)]);check(c.data());
    const groups=t.data()?.groups||{},existing=groups[group];
    if(existing){
     if(JSON.stringify(existing.ids)!==JSON.stringify(ids))throw Error('This group already has registered members. Resume with those names or contact your instructor.');
     return existing;
    }
    if(s.exists)throw Error('This group already submitted.');
    if(Object.values(groups).some(g=>g.ids.some(id=>ids.includes(id))))throw Error('A selected student already belongs to another group.');
    const team={ids,names:ids.map(id=>roster().find(s=>s.id===id).name),registeredAt:new Date().toISOString()};
    groups[group]=team;tx.set(teams,{groups,section:1,minicase:3});return team;
   });
  }
  async function write(payload,final){
   return db.runTransaction(async tx=>{
    const [c,t,s]=await Promise.all([tx.get(config),tx.get(teams),tx.get(sub)]);check(c.data());
    if(s.exists)throw Error('Your group has already submitted. Contact your instructor for corrections.');
    const team=t.data()?.groups?.[group];validate(team?.ids);
    if(JSON.stringify(payload.teamIds)!==JSON.stringify(team.ids))throw Error('Group membership changed. Reload before saving.');
    const data={...payload,minicase:3,section:1,group,teamIds:team.ids,team:team.names,submissionMode:'group',schemaVersion:6};
    if(final){data.submittedAt=new Date().toISOString();tx.set(sub,data);tx.delete(draft);}
    else tx.set(draft,data);return data;
   });
  }
  return {teams,sub,draft,register,saveDraft:p=>write(p,false),submit:p=>write(p,true)};
 }
 root.MC405Groups={createService};
})(typeof window!=='undefined'?window:globalThis);
