import {fractionalUnit,saleUnits,variantDetails} from './variant-attributes.js?v=314';
export const roundMoney=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
export const variantKey=v=>v.id||[v.unit||'piece',v.diameter||'',v.length_m||'',v.name||''].join(':');
export const cartKey=row=>row.variant_id?row.product_id+'::'+row.variant_id:row.product_id;
export function variantsOf(p){return Array.isArray(p?.variants)?p.variants.filter(v=>v&&v.name).map(v=>({...v,name:v.name_manual?v.name:String(v.name).replace(/^Ø(?=\s*\d)/,''),id:variantKey(v)})):[];}
export const isRateUnit=v=>['rod','meter'].includes(v?.unit);
export const unknownRodLength=v=>['rod','coil'].includes(v?.unit)&&v.length_unknown===true;
export const unitLabel=(unit,kk=false)=>({rod:kk?'шыбық':'прут.',piece:kk?'дана':'шт.',meter:'м',coil:kk?'орам':'бухта',sheet:kk?'табақ':'лист',card:kk?'карта':'карта',roll:kk?'орам':'рулон',kg:'кг',ton:'т',sqm:'м²'}[unit]||(kk?'дана':'шт.'));
export const quantityUnitLabel=(unit,n,kk=false)=>unit==='coil'&&!kk?(n%100>=11&&n%100<=14?'бухт':n%10===1?'бухта':n%10>=2&&n%10<=4?'бухты':'бухт'):unitLabel(unit,kk);
export const validVariantQty=(v,n)=>Number.isFinite(n)&&n>0&&n<=100000&&(fractionalUnit(v?.unit)?Math.abs(n*1000-Math.round(n*1000))<1e-7:Number.isInteger(n));
export function parseVariantLength(value){
  const text=String(value??'').trim(),key=text.toLocaleLowerCase('ru').replace(/[\s.\/_-]/g,'');
  if(['нм','нд','немер','немерная','немернаядлина','длинауточняется','уточняется'].includes(key))return {length_m:null,length_unknown:true,length_options:null};
  if(!text)return {length_m:null,length_unknown:false,length_options:null};
  if(text.includes('/')){const parts=text.split('/').map(x=>x.trim());if(parts.length>12||parts.some(x=>!/^\d+(?:[.,]\d+)?$/.test(x)||Number(x.replace(',','.'))<=0))throw new Error('Длина: укажите, например, 6/12 или 6,0/10,0');const lengths=[...new Set(parts.map(x=>Number(x.replace(',','.'))))];return {length_m:lengths[0],length_unknown:false,length_options:lengths.length>1?lengths:null};}
  const n=Number(text.replace(',','.'));
  if(!/^\d+(?:[.,]\d+)?$/.test(text)||!Number.isFinite(n)||n<=0)throw new Error('Длина: укажите число в метрах или «н/м» / «Длина уточняется»');
  return {length_m:n,length_unknown:false,length_options:null};
}
export function piecePrice(v){return unknownRodLength(v)?null:v.unit==='rod'?roundMoney(Number(v.price_per_m)*Number(v.length_m)):v.unit==='meter'?Number(v.price_per_m):v.price==null||v.price===''?null:Number(v.price);}
export function validateVariant(v){
  if(v.specs!=null&&String(v.specs).length>6000)throw new Error('Характеристики модели: максимум 6000 символов');
  if(!String(v.name||'').trim())throw new Error('Укажите название варианта');
  if(!Object.hasOwn(saleUnits,v.unit||'piece'))throw new Error('Неизвестная единица продажи');
  if(v.length_options!=null){if(v.unit!=='rod'||!Array.isArray(v.length_options)||v.length_options.length<2||v.length_options.length>12||v.length_options.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<=0)||new Set(v.length_options).size!==v.length_options.length||!v.length_options.includes(Number(v.length_m))||v.length_unknown)throw new Error('Проверьте список длин прутка: например 6/12');}
  const n=isRateUnit(v)?v.price_per_m:v.price;
  const unknownPrice=!isRateUnit(v)&&(n===null||n===undefined||n==='');
  if(!unknownPrice&&(n===null||n===undefined||n===''||!Number.isFinite(Number(n))||Number(n)<0))throw new Error('Укажите неотрицательную цену варианта');
  if(!unknownPrice&&Math.abs(Math.round(Number(n)*1000000)/1000000-Number(n))>1e-8)throw new Error('Цена: не больше шести знаков после запятой');
  for(const key of ['thickness_mm','wire_mm','weight','weight_per_m'])if(v[key]!=null&&v[key]!==''&&(!Number.isFinite(Number(String(v[key]).replace(',','.')))||Number(String(v[key]).replace(',','.'))<=0))throw new Error('Проверьте положительное число: '+key);
  if(v.unit!=='rod'&&v.length_m!==''&&v.length_m!=null&&(!Number.isFinite(Number(v.length_m))||Number(v.length_m)<=0))throw new Error('Длина должна быть больше нуля или оставьте поле пустым');
  if(['rod','coil'].includes(v.unit)&&!unknownRodLength(v)&&(!Number.isFinite(Number(v.length_m))||Number(v.length_m)<=0))throw new Error('Укажите длину прутка больше нуля или «н/м»');
  if(v.unit==='rod'&&!String(v.diameter||'').trim())throw new Error('Укажите диаметр прутка');
  if(!unknownPrice&&!unknownRodLength(v)&&!Number.isFinite(piecePrice(v)))throw new Error('Некорректная цена прутка');
  if(!['order','in_stock','out_of_stock'].includes(v.availability||'order'))throw new Error('Некорректное наличие варианта');
  if(v.stock_qty!=null&&v.stock_qty!==''&&(!Number.isFinite(Number(v.stock_qty))||Number(v.stock_qty)<0||!validVariantQty(v,Number(v.stock_qty))&&Number(v.stock_qty)!==0))throw new Error('Проверьте остаток размера: укажите неотрицательное количество в единице продажи');
  return {...v,...(unknownRodLength(v)?{length_m:null}:{}),id:variantKey(v),price:unknownPrice?null:v.unit==='coil'&&unknownRodLength(v)?Number(v.price):piecePrice(v)};
}
export function variantSummary(p,kk=false){
  const v=variantsOf(p);if(!v.length)return null;
  const labels=new Set(v.map(x=>isRateUnit(x)?'м':unitLabel(x.unit,kk))),mixed=labels.size>1;
  const prices=v.map(x=>isRateUnit(x)?x.price_per_m:x.price).filter(x=>x!==null&&x!==undefined&&x!=='').map(Number).filter(Number.isFinite);
  return {price:prices.length?Math.min(...prices):null,unit:[...labels][0],from:true,mixed};
}
export function variantCartRow(p,v,qty=1){
  v=validateVariant(v);if(v.availability==='out_of_stock')throw new Error('Этот вариант отсутствует');
  if(unknownRodLength(v))throw new Error('Сначала уточните длину прутка');
  if(v.price===null)throw new Error('Сначала уточните цену варианта');
  if(!validVariantQty(v,qty))throw new Error(fractionalUnit(v.unit)?'Укажите количество до 100000, не больше трёх знаков после запятой':'Укажите целое количество от 1 до 100000');
  return {product_id:p.id,variant_id:v.id,name_ru:p.name+' — '+v.name+(variantDetails(v)?' · '+variantDetails(v):''),name_kk:p.name_kk?p.name_kk+' — '+v.name+(variantDetails(v)?' · '+variantDetails(v):''):null,name:p.name+' — '+v.name+(variantDetails(v)?' · '+variantDetails(v):''),price:piecePrice(v),qty,unit:v.unit||'piece',length_m:['rod','coil'].includes(v.unit)?Number(v.length_m):null};
}
export function parseVariants(text){
  text=String(text||'').trim();if(!text)return [];
  if(text.startsWith('[')){const a=JSON.parse(text);if(!Array.isArray(a))throw new Error('Некорректные варианты');const ids=new Set();return a.map(v=>{v=validateVariant(v);if(ids.has(v.id))throw new Error('Повтор варианта: '+v.name);ids.add(v.id);return v;});}
  return text.split(/\r?\n/).filter(x=>x.trim()).map((line,i)=>{const [name,price]=line.split('|').map(x=>x.trim());return {id:'legacy-'+i,name,price:price?Number(price.replace(',','.')):null,unit:'piece',availability:'order'};});
}
