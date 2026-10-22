/* Synthetic pre-decision teaching paths, not historical market observations. */
function drawRiskCharts(){
 const fx=[.91,.90,.94,.97,.95,.98,1.01,.99,.96,.93,.94,.92,.89,.90,.87,.91,.95,.96,.93,.90,.92,.94,.91,.93,1/MC405.SPOT].map(value=>1/value);
 const rates=[2.8,2.9,3.1,3.4,3.2,3.5,3.8,4.1,4.3,4.0,3.7,3.5,3.6,3.9,4.2,4.5,4.3,4.1,3.8,3.6,3.7,3.9,4.1,4.2,MC405.r2*100];
 function draw(id,values,label,color,decimals){
  const w=760,h=250,left=65,right=20,top=24,bottom=42;
  const min=Math.min(...values),max=Math.max(...values),pad=(max-min)*.15;
  const lo=min-pad,hi=max+pad;
  const x=i=>left+i*(w-left-right)/(values.length-1),y=v=>top+(hi-v)/(hi-lo)*(h-top-bottom);
  const ticks=Array.from({length:5},(_,i)=>lo+(hi-lo)*i/4);
  const path=values.map((v,i)=>(i?'L':'M')+x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ');
  document.getElementById(id).innerHTML=`<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}. Synthetic monthly teaching series from March 2024 through March 2026." style="width:100%;display:block;background:#f8fafc;border-radius:8px"><title>${label} · synthetic teaching data</title>${ticks.map(v=>`<line x1="${left}" y1="${y(v)}" x2="${w-right}" y2="${y(v)}" stroke="#dbe2eb"/><text x="${left-8}" y="${y(v)+4}" text-anchor="end" font-size="12" fill="#475569">${v.toFixed(decimals)}</text>`).join('')}<path d="${path}" fill="none" stroke="${color}" stroke-width="3"/><circle cx="${x(24)}" cy="${y(values[24])}" r="5" fill="${color}"/>${[[0,'Mar 2024'],[12,'Mar 2025'],[24,'Mar 2026']].map(([i,t])=>`<text x="${x(i)}" y="${h-15}" text-anchor="${i===0?'start':i===24?'end':'middle'}" font-size="12" fill="#475569">${t}</text>`).join('')}</svg>`;
 }
 draw('fx-risk-chart',fx,'EURUSD · USD per EUR','#002147',3);
 draw('rate-risk-chart',rates,'EUR two-year zero rate · annual percent','#a57920',1);
}
