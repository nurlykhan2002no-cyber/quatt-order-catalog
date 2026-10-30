import {variantKey,validateVariant,variantSummary} from './variant-model.js?v=289';
export function groupVariantImports(rows,products,today,flat,identity,amount){
  const get=(r,...keys)=>{for(const k of keys){const found=Object.entries(r).find(([h,v])=>identity(h).replace(/_/g,' ')===identity(k)&&v!==null&&v!==undefined&&String(v).trim()!=='');if(found)return found[1];}return null;};
  const groups=new Map(),ordinary=[];
  rows.forEach((r,i)=>{const group=get(r,'Группа вариантов','Карточка');if(!group){if(get(r,'Длина прутка, м','Длина, м','Длина прутка')!==null)ordinary.push({row:r,line:i+2,error:'Укажите «Группа вариантов», чтобы объединить размеры в карточку'});else ordinary.push({row:r,line:i+2});return;}const article=get(r,'Артикул карточки','Артикул')||'',brand=get(r,'Бренд')||'',key=identity(article||group)+'|'+identity(brand);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({row:r,line:i+2,group,article,brand});});
  const result=ordinary.map(x=>{const item=flat([x.row],products,today)[0];item.line=x.line;if(item.target?.variants?.length&&(item.payload?.price!==undefined||item.payload?.cost!==undefined)){item.kind="error";item.errors=["Товар с размерами: заполните группу вариантов и цены по размерам"];item.selected=false;}if(x.error){item.kind='error';item.errors=[x.error];item.selected=false;}return item;});
  for(const records of groups.values()){
    const first=records[0],item={line:records.map(x=>x.line).join(', '),source:first.row,name:String(first.group),sku:String(first.article),errors:[],kind:'error',selected:false,applied:false};
    try{
      const byArticle=first.article?products.filter(p=>identity(p.article)===identity(first.article)):[];
      const matches=byArticle.length?byArticle:products.filter(p=>identity(p.name)===identity(first.group)&&(!first.brand||identity(p.brand)===identity(first.brand)));
      if(matches.length>1)throw new Error('Несколько карточек совпали. Укажите точный артикул карточки');const target=matches[0];
      if(target?.article&&first.article&&identity(target.article)!==identity(first.article))throw new Error('Название совпало, но артикул карточки отличается');
      if(records.some(x=>identity(x.group)!==identity(first.group)||identity(x.article)!==identity(first.article)))throw new Error('Название группы или артикул карточки отличаются между строками');
      const variants=[...(target?.variants||[])].map(v=>({...v,id:variantKey(v)})),costs=structuredClone(target?.variant_costs||{}),seen=new Set();
      for(const {row:r,line} of records){
        const unitRaw=identity(get(r,'Единица продажи')||'пруток'),unit=['пруток','rod'].includes(unitRaw)?'rod':['штука','шт','piece'].includes(unitRaw)?'piece':null;if(!unit)throw new Error('Строка '+line+': единица продажи — Пруток или Штука');
        const diameter=String(get(r,'Диаметр, мм','Диаметр')||'').trim(),length=amount(get(r,'Длина прутка, м','Длина, м','Длина прутка'));
        const explicitName=get(r,'Вариант','Название варианта');if(unit==='rod'&&(!diameter||!length))throw new Error('Строка '+line+': укажите диаметр и длину прутка');if(unit==='piece'&&!explicitName)throw new Error('Строка '+line+': укажите название варианта');
        const id=String(get(r,'Артикул варианта')||(unit==='rod'?[unit,diameter,length].join(':'):[unit,identity(explicitName)].join(':')));if(seen.has(id))throw new Error('Повтор размера в строке '+line);seen.add(id);
        const old=variants.find(v=>v.id===id)||(unit==='rod'?variants.find(v=>v.unit==='rod'&&String(v.diameter)===diameter&&Number(v.length_m)===length):null),key=old?.id||id;
        const price=amount(get(r,'Цена за метр','Продажа за метр','Продажа за метр, ₸','Цена','Розничная цена')),cost=amount(get(r,'Закуп за метр','Закуп за метр, ₸','Закуп'));
        const avail=identity(get(r,'Наличие')||old?.availability||'order'),available={'в наличии':'in_stock','под заказ':'order','нет в наличии':'out_of_stock',in_stock:'in_stock',order:'order',out_of_stock:'out_of_stock'}[avail];if(!available)throw new Error('Строка '+line+': неверное наличие');
        const v=validateVariant({...old,id:key,name:String(explicitName||(unit==='rod'?'Ø'+diameter+' мм · '+length+' м':'')),unit,diameter,length_m:unit==='rod'?length:length??old?.length_m??null,price_per_m:unit==='rod'?price??old?.price_per_m:null,price:unit==='piece'?price??old?.price:null,availability:available});
        if(cost===null&&!costs[key])throw new Error('Строка '+line+': укажите закуп для нового размера');if(cost!==null)costs[key]={cost};
        const index=variants.findIndex(x=>x.id===key);if(index<0)variants.push(v);else variants[index]=v;
      }
      const units=new Set(variants.map(v=>v.unit||'piece'));if(units.size>1)throw new Error('Прутки и штучные варианты загружайте в разные карточки');
      const summary=variantSummary({variants}),summaryCost=Math.min(...Object.values(costs).map(v=>Number(v.cost)).filter(Number.isFinite));
      const metadata={...first.row};for(const field of ['Категория','Поставщик','Адрес поставщика','Контакт поставщика','Дата проверки']){const values=[...new Set(records.map(x=>get(x.row,field)).filter(v=>v!==null).map(String))];if(values.length>1)throw new Error('В группе отличаются значения: '+field);if(values.length)metadata[field]=values[0];}
      const synthetic={...metadata,Артикул:first.article,Название:String(first.group),Бренд:first.brand,Цена:summary.price,Закуп:Number.isFinite(summaryCost)?summaryCost:target?.cost||0};
      const base=flat([synthetic],products,today)[0];if(base.errors.length)throw new Error(base.errors.join('; '));
      Object.assign(item,base,{line:records.map(x=>x.line).join(', '),source:first.row,variantInfo:records.length+' размеров из файла · всего в карточке: '+variants.length});
      Object.assign(item.payload,{variants,variant_costs:costs,availability:variants.some(v=>v.availability==='in_stock')?'in_stock':variants.some(v=>v.availability!=='out_of_stock')?'order':'out_of_stock',price_mode:'from',stock_qty:null,old_price:null,sale_end:null});item.target=target||base.target;
    }catch(e){item.kind='error';item.errors=[e.message];item.selected=false;}
    result.push(item);
  }
  const seenTargets=new Map();for(const item of result){if(item.kind==='error')continue;const key=item.target?'id:'+item.target.id:item.sku?'article:'+identity(item.sku):'name:'+identity(item.name);if(seenTargets.has(key)){const previous=seenTargets.get(key);previous.kind='error';previous.errors=['Повтор карточки в файле. Объедините размеры одинаковой группой'];previous.selected=false;item.kind='error';item.errors=[...previous.errors];item.selected=false;}seenTargets.set(key,item);}
  return result;
}
