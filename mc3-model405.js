/* Ten fixed classroom packets; EURUSD is USD per EUR. */
(function(root){
 'use strict';
 function packet(version){
  if(!Number.isInteger(version)||version<1||version>10)throw Error('Unknown case version.');
  const i=version-1,FV=1000,P=950+i*3,c=.04+(i%3)*.005,N=100+i*10,r2=.04+i*.0005,r3=.048+i*.0005,R=.075;
  const SPOT=1.08+i*.01,FORWARD=1.12+i*.01,FUTURE_SPOT=1.20+i*.01,C=FV*c,K=(1+r3)**3/(1+r2)**2-1;
  const y=(C+Math.sqrt(C*C+4*P*(C+FV)))/(2*P)-1;
  const targets={coupon:C,cf1:C,cf2:C+FV,ytm:y*100,fra:K*100,usdBondPrice:P*SPOT,spotBenchmark:N*SPOT,forwardUSD:N*FORWARD,highSettlement:N*(R-K),highInterest:N*R,unhedgedRate:R*100,effectiveRate:K*100,highEffective:N*K,strongUSD:N*FUTURE_SPOT,opportunity:N*(FUTURE_SPOT-FORWARD)};
  const tolerances=Object.fromEntries(Object.keys(targets).map(k=>[k,['highSettlement','highInterest','highEffective'].includes(k)?.002:.01]));
  return {version,FV,P,c,N,r2,r3,R,SPOT,FORWARD,FUTURE_SPOT,K,targets,tolerances,correct:(id,value)=>String(value).trim()!==''&&Number.isFinite(Number(value))&&Math.abs(Number(value)-targets[id])<=tolerances[id],scenario:(rate,spot,fra,fx)=>({interestEUR:N*(fra?K:rate),proceedsUSD:N*(fx?FORWARD:spot)})};
 }
 function versionFor(student,roster){
  const sorted=[...roster].sort((a,b)=>a.name.normalize('NFKD').localeCompare(b.name.normalize('NFKD'),'en')||a.id.localeCompare(b.id));
  const index=sorted.findIndex(p=>p.id===student.id&&p.name===student.name);if(index<0)throw Error('Student is not in this roster.');return index%10+1;
 }
 root.MC405Variants={packet,versionFor};root.MC405=packet(1);
 if(typeof module!=='undefined')module.exports=root.MC405Variants;
})(typeof window!=='undefined'?window:globalThis);
