import {isRateUnit,validateVariant} from './variant-model.js?v=316';
import {attributeSignature,normalizeSize,saleUnits} from './variant-attributes.js?v=316';
// Correct a mislabeled price basis; deliberately retain numeric price and cost.
export function replaceVariantUnits(rows,from,to){
  if(!Object.hasOwn(saleUnits,to))throw new Error('Выберите единицу продажи');
  let changed=0,merged=0;
  const next=rows.map(r=>{
    if((from&&from!=='all'&&r.unit!==from)||r.unit===to)return {...r};
    const rate=isRateUnit(r)?r.price_per_m:r.price;
    const v={...r,unit:to,price_per_m:['rod','meter'].includes(to)?rate:null,price:['rod','meter'].includes(to)?null:rate,length_options:to==='rod'?r.length_options:null,length_unknown:['rod','coil'].includes(to)?r.length_unknown:false};
    validateVariant({...v,name:v.name||v.diameter||'Размер'});changed++;return v;
  });
  const key=r=>[r.unit,normalizeSize(r.diameter)||r.name,attributeSignature(r),r.length_unknown?'unknown':JSON.stringify(r.length_options?.map(Number)|| (r.length_m?Number(r.length_m):null)),r.availability||'order',Number(isRateUnit(r)?r.price_per_m:r.price),r.cost===''||r.cost==null?'':Number(r.cost)].join('::');
  const originalTargets=new Map(rows.filter(r=>r.unit===to).map(r=>[key(r),r.id]));
  const result=next.filter(r=>{
    const old=rows.find(x=>x.id===r.id);if(old?.unit===to||r.unit!==to)return true;
    const match=originalTargets.get(key(r));if(match&&match!==r.id){merged++;return false;}return true;
  });
  return {rows:result,changed,merged};
}
