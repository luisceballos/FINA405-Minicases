(function(root){
  'use strict';
  function createService(db,student){
    if(!root.MC405_ROSTER?.students.some(s=>s.id===student.id&&s.name===student.name))throw Error('Select a valid Section 01 student.');
    const key='mc3_sec1_student_'+student.id;
    const sub=db.doc('mc405_submissions/'+key),draft=db.doc('mc405_drafts/'+key);
    const config=db.doc('minicase_hub405/config');
    function check(c){if(!c?.minicases?.[2]?.active||!c.minicases[2].sections?.[0]?.active)throw Error('MC3 is closed. Contact your instructor.');}
    async function write(payload,final){
      return db.runTransaction(async tx=>{
        const [c,s]=await Promise.all([tx.get(config),tx.get(sub)]);
        check(c.data());
        if(s.exists)throw Error('You have already submitted. Contact your instructor for corrections.');
        const data={...payload,minicase:3,section:1,studentId:student.id,studentName:student.name,submissionMode:'individual',schemaVersion:5};
        if(final){data.submittedAt=new Date().toISOString();tx.set(sub,data);tx.delete(draft);}
        else tx.set(draft,data);
        return data;
      });
    }
    return {sub,draft,saveDraft:p=>write(p,false),submit:p=>write(p,true)};
  }
  root.MC405Individual={createService};
})(typeof window!=='undefined'?window:globalThis);
