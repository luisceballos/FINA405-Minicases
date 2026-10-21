/* Classroom assumptions. Annual compounding, one-year FRA period. */
(function(root){
  'use strict';
  const K=1.048**3/1.04**2-1, N=100; // EUR millions
  const y=(40+Math.sqrt(40**2+4*950*1040))/(2*950)-1;
  const targets={
    coupon:40,cf1:40,cf2:1040,ytm:y*100,fra:K*100,usdBondPrice:1026,spotBenchmark:108,
    highSettlement:N*(.075-K),highInterest:N*.075,unhedgedRate:7.5,effectiveRate:K*100,
    highEffective:N*K,weakUSD:105,strongUSD:120,forwardUSD:112,
    opportunity:8
  };
  const tolerances={coupon:.01,cf1:.01,cf2:.01,ytm:.01,fra:.01,usdBondPrice:.01,spotBenchmark:.01,
    highSettlement:.002,highInterest:.002,highEffective:.002,unhedgedRate:.01,effectiveRate:.01,
    weakUSD:.01,strongUSD:.01,forwardUSD:.01,opportunity:.01};
  function correct(id,value){return String(value).trim()!==''&&Number.isFinite(Number(value))&&Math.abs(Number(value)-targets[id])<=tolerances[id];}
  const SPOT=1.08,FORWARD=1.12,FUTURE_SPOT=1.20,WEAK_SPOT=1.05;
  function scenario(rate,spot,fra,fx){return {interestEUR:N*(fra?K:rate),proceedsUSD:N*(fx?FORWARD:spot)};}
  const api={K,N,SPOT,FORWARD,FUTURE_SPOT,WEAK_SPOT,targets,tolerances,correct,scenario};
  root.MC405=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
