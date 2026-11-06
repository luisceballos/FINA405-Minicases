(function(root){
const ann=(r,n)=>Array.from({length:n},(_,i)=>(1+r)**(-i-1)).reduce((a,b)=>a+b,0);
const bond=(N,c,y,n)=>N*c*ann(y,n)+N/(1+y)**n;
function packet(v=1){if(!Number.isInteger(v)||v<1||v>15)throw Error('Invalid version');const i=v-1,a=v%2===1,z=i*.001;
return {v,countries:[
{id:'cad',name:'Canada',ccy:'CAD',N:10+i*.5,c:.05+(i%5)*.001,K1:.04+z,K2:.06+z,spot:[1.35,1.40,1.30,1.38,1.32,1.36].map(x=>Number((x+i*.002).toFixed(3))),R:[.04,.07,.06,a?.09:.03,a?.08:.04,.06].map(x=>x+z),Y:[.06,.09,.08,.10,.07,.06].map(x=>x+z)},
{id:'mx',name:'Mexico',ccy:'MXN',N:100+i*5,c:.10+(i%5)*.002,K1:.10+z,K2:.08+z,spot:[20,18,21,19,20,18].map(x=>x+i*.1),R:[.10,.07,.08,a?.05:.11,a?.06:.10,.08].map(x=>x+z),Y:[.11,.08,.09,.07,.10,.09].map(x=>x+z)}]};}
function country(c,t){const r=c.R[t],n=5-t,rows=Array.from({length:5},(_,i)=>{const y=i+1,fix=y<=t?c.R[y-1]:r,active=t>=2&&y>=3,pay1=c.N*fix,rec1=c.N*c.K1,pay2=active?c.N*c.K2:0,rec2=active?c.N*fix:0,coupon=c.N*c.c,principal=y===5?c.N:0,i1=pay1-rec1,i2=pay2-rec2;return {y,fix,coupon,principal,debt:coupon+principal,pay1,rec1,pay2,rec2,i1,i2,cf:coupon+principal+i1+i2,eff:100*(coupon+i1+i2)/c.N};});
const price=(t===5?0:Number(bond(c.N,c.c,c.Y[t],n).toFixed(2))),swap1=c.N*(r-c.K1)*ann(r,n),swap2=t>=2?c.N*(c.K2-r)*ann(r,n):0,onlyNext=c.N*(c.c+r-c.K1),bothNext=c.N*(c.c+c.K2-c.K1),close=swap1+swap2;
const cumulative=rows.slice(0,t).reduce((s,x)=>s+x.cf,0),total=cumulative+price+close;
const keep=rows.slice(0,t).reduce((sum,x)=>sum+x.debt+x.i1,0)+price+swap1;
const prices=c.Y.map((y,i)=>(i===5?0:Number(bond(c.N,c.c,y,5-i).toFixed(2))));const returns=t?{local:100*((price+c.N*c.c+(t===5?c.N:0))/prices[t-1]-1),usd:100*(((price+c.N*c.c+(t===5?c.N:0))/c.spot[t])/(prices[t-1]/c.spot[t-1])-1)}:null;
return {...c,prices,returns,rows,price,swap1,swap2,close,onlyNext,bothNext,total,keep,unhedged:t*c.N*c.c+(t===5?c.N:price),exit:rows[2].cf+price+close};}
function calc(p,t){return {countries:p.countries.map(c=>country(c,t))};}
function targets(v,stage){const p=packet(v),m=calc(p,stage===3?5:stage),out={},pre='t'+stage+'_',edit=stage===0?[1]:stage===1?[2]:stage===2?[3]:[4,5];for(const c of m.countries){const k=pre+c.id+'_';for(const y of edit){const r=c.rows[y-1];Object.assign(out,{[k+'debt'+y]:r.debt,[k+'paid'+y]:r.pay1+r.pay2,[k+'received'+y]:r.rec1+r.rec2,[k+'cf'+y]:r.cf});}if(stage===1){out[k+'only']=c.onlyNext;out[k+'change']=c.onlyNext-c.N*c.c;}if(stage===2){out[k+'only']=c.onlyNext;out[k+'saving']=c.onlyNext-c.bothNext;out[k+'realized']=0;}if(stage===3)out[k+'total']=c.total;out[k+'annualRate']=100*(stage<2?c.c+c.R[stage]-c.K1:c.c+c.K2-c.K1);if(stage)for(const y of stage===3?[3,4,5]:[stage]){const r=calc(p,y).countries.find(x=>x.id===c.id).returns;out[k+'returnLocal'+y]=r.local;out[k+'returnUSD'+y]=r.usd;}}return out;}
// Rates/returns: percentage points. Amounts: local-currency millions.
function tolerance(id,expected){return /(?:annualRate|returnLocal\d+|returnUSD\d+)$/.test(id)?0.05:Math.max(0.01,Math.abs(expected)*0.005);}
function accepts(id,value,expected){if(value===null||value===undefined||!['string','number'].includes(typeof value)||String(value).trim()==='')return false;const n=Number(value);return Number.isFinite(n)&&Number.isFinite(expected)&&Math.abs(n-expected)<=tolerance(id,expected)+1e-10;}
function valid(v,stage,answers){return Object.entries(targets(v,stage)).every(([k,n])=>accepts(k,answers[k],n));}
root.CFO={packet,calc,ann,bond,targets,tolerance,accepts,valid};if(typeof module!=='undefined')module.exports=root.CFO;
})(globalThis);
