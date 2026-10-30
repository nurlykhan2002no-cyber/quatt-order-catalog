export const roundMoney=n=>Math.round((Number(n)+Number.EPSILON)*100)/100;
export const variantKey=v=>v.id||[v.unit||'piece',v.diameter||'',v.length_m||'',v.name||''].join(':');
export const cartKey=row=>row.variant_id?row.product_id+'::'+row.variant_id:row.product_id;
export function variantsOf(p){return Array.isArray(p?.variants)?p.variants.filter(v=>v&&v.name).map(v=>({...v,id:variantKey(v)})):[];}
export function piecePrice(v){return v.unit==='rod'?roundMoney(Number(v.price_per_m)*Number(v.length_m)):roundMoney(v.price);}
export function validateVariant(v){
  if(!String(v.name||'').trim())throw new Error('Укажите название варианта');
  if(!['rod','piece'].includes(v.unit||'piece'))throw new Error('Неизвестная единица продажи');
  const n=v.unit==='rod'?v.price_per_m:v.price;
  const unknownPrice=v.unit!=='rod'&&(n===null||n===undefined||n==='');
  if(!unknownPrice&&(n===null||n===undefined||n===''||!Number.isFinite(Number(n))||Number(n)<0))throw new Error('Укажите неотрицательную цену варианта');
  if(!unknownPrice&&Math.abs(roundMoney(n)-Number(n))>0.00000001)throw new Error('Укажите цену с точностью до двух знаков после запятой');
  if(v.unit!=='rod'&&v.length_m!==''&&v.length_m!=null&&(!Number.isFinite(Number(v.length_m))||Number(v.length_m)<=0))throw new Error('Длина должна быть больше нуля или оставьте поле пустым');
  if(v.unit==='rod'&&(!Number.isFinite(Number(v.length_m))||Number(v.length_m)<=0))throw new Error('Укажите длину прутка больше нуля');
  if(v.unit==='rod'&&!String(v.diameter||'').trim())throw new Error('Укажите диаметр прутка');
  if(!Number.isFinite(piecePrice(v)))throw new Error('Некорректная цена прутка');
  if(!['order','in_stock','out_of_stock'].includes(v.availability||'order'))throw new Error('Некорректное наличие варианта');
  return {...v,id:variantKey(v),price:unknownPrice?null:piecePrice(v)};
}
export function variantSummary(p,kk=false){
  const v=variantsOf(p);if(!v.length)return null;
  const rods=v.every(x=>x.unit==='rod');const prices=v.filter(x=>(rods?x.price_per_m:x.price)!==null&&(rods?x.price_per_m:x.price)!==undefined).map(x=>rods?Number(x.price_per_m):piecePrice(x)).filter(Number.isFinite);
  return {price:prices.length?Math.min(...prices):null,unit:rods?'м':kk?'дана':'шт.',from:true};
}
export function variantCartRow(p,v,qty=1){
  v=validateVariant(v);if(v.availability==='out_of_stock')throw new Error('Этот вариант отсутствует');
  if(v.price===null)throw new Error('Сначала уточните цену варианта');
  if(!Number.isInteger(qty)||qty<1||qty>100000)throw new Error('Укажите целое количество от 1 до 100000');
  return {product_id:p.id,variant_id:v.id,name:p.name+' — '+v.name,price:piecePrice(v),qty,unit:v.unit||'piece',length_m:v.unit==='rod'?Number(v.length_m):null};
}
export function parseVariants(text){
  text=String(text||'').trim();if(!text)return [];
  if(text.startsWith('[')){const a=JSON.parse(text);if(!Array.isArray(a))throw new Error('Некорректные варианты');const ids=new Set();return a.map(v=>{v=validateVariant(v);if(ids.has(v.id))throw new Error('Повтор варианта: '+v.name);ids.add(v.id);return v;});}
  return text.split(/\r?\n/).filter(x=>x.trim()).map((line,i)=>{const [name,price]=line.split('|').map(x=>x.trim());return {id:'legacy-'+i,name,price:price?Number(price.replace(',','.')):null,unit:'piece',availability:'order'};});
}
