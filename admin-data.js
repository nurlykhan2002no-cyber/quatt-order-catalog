import {groupVariantImports} from "./variant-import.js?v=288";
export const identity = value=>String(value??'').normalize('NFKC').trim().toLocaleLowerCase('ru').replace(/\s+/g,' ');
export function priceAge(date, today=new Date()) {
  if(!date)return null;
  const parsed=new Date(String(date).slice(0,10)+'T00:00:00');
  if(!Number.isFinite(parsed.getTime()))return null;
  const now=new Date(today.getFullYear(),today.getMonth(),today.getDate());
  return Math.max(0,Math.floor((now-parsed)/86400000));
}
export function parseAmount(value) {
  if(value===null||value===undefined||String(value).trim()==='')return null;
  const s=String(value).replace(/[\s\u00a0\u202f]/g,'').replace(/₸|KZT|тенге/gi,'').replace(',','.');
  if(!/^\d+(?:\.\d+)?$/.test(s))throw new Error('Некорректное число: '+String(value).slice(0,35));
  const n=Number(s);if(!Number.isFinite(n)||n<0)throw new Error('Число должно быть неотрицательным');return n;
}
function cell(row, aliases) {
  const normalized=Object.fromEntries(Object.entries(row).map(([k,v])=>[identity(k).replace(/_/g,' '),v]));
  for(const key of aliases){const value=normalized[identity(key).replace(/_/g,' ')];if(value!==undefined&&String(value).trim()!=='')return value;}
  return null;
}
export function buildFlatImportPlan(rows, products, today) {
  const seen=new Set();
  return rows.map((row,index)=>{
    const item={line:index+2,source:row,errors:[],selected:false,applied:false};
    try {
      const sku=String(cell(row,['Артикул','SKU','Код товара','Код'])??'').trim();
      const name=String(cell(row,['Название','Наименование','Название товара','name'])??'').trim();
      const brand=String(cell(row,['Бренд','brand'])??'').trim();
      const bySku=sku?products.filter(p=>identity(p.article)===identity(sku)):[];
      const byName=name?products.filter(p=>identity(p.name)===identity(name)&&(!brand||identity(p.brand)===identity(brand))):[];
      const matches=bySku.length?bySku:byName;
      if(matches.length>1)throw new Error('Несколько совпадений. Укажите точный артикул.');
      const target=matches[0]||null;
      if(sku&&target?.article&&identity(sku)!==identity(target.article))throw new Error('Название совпало, но артикул отличается. Проверьте строку.');
      if(!name&&!target)throw new Error('Нет названия товара');
      const duplicateKey=target?'id:'+target.id:sku?'sku:'+identity(sku):'name:'+identity(name)+'|'+identity(brand);
      if(seen.has(duplicateKey))throw new Error('Повтор товара в этом файле');seen.add(duplicateKey);
      const price=parseAmount(cell(row,['Цена','Розничная цена','price']));
      const cost=parseAmount(cell(row,['Закуп','Закупочная цена','cost']));
      const stock=parseAmount(cell(row,['Остаток','Количество','stock_qty']));
      if(stock!==null&&!Number.isInteger(stock))throw new Error('Остаток должен быть целым числом');
      if(!target&&price===null)throw new Error('Для нового товара нужна розничная цена');
      if(!target&&cost===null)throw new Error('Для нового товара нужна закупочная цена');
      const payload={};
      if(name)payload.name=name;if(sku)payload.article=sku;if(brand)payload.brand=brand;
      if(price!==null)payload.price=price;if(cost!==null)payload.cost=cost;if(stock!==null)payload.stock_qty=stock;
      for(const [key,aliases] of Object.entries({specs:['Характеристики','Описание','specs'],supplier:['Поставщик','supplier'],supplier_address:['Адрес поставщика','supplier_address'],supplier_contact:['Контакт поставщика','supplier_contact'],delivery:['Срок поставки','delivery']})){
        const value=cell(row,aliases);if(value!==null)payload[key]=String(value).trim();
      }
      const category=String(cell(row,['Категория','Группа','category'])??'').trim();
      const checked=cell(row,['Дата проверки','Дата проверки цены','checked_date']);
      if(checked!==null){
        let date=typeof checked==='number'?new Date((checked-25569)*86400000).toISOString().slice(0,10):String(checked).trim();
        if(/^\d{2}\.\d{2}\.\d{4}$/.test(date))date=date.split('.').reverse().join('-');
        if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date+'T00:00:00Z'))||new Date(date+'T00:00:00Z').toISOString().slice(0,10)!==date)throw new Error('Дата проверки: используйте ДД.ММ.ГГГГ или ГГГГ-ММ-ДД');
        payload.checked_date=date;
      }else if(price!==null||cost!==null)payload.checked_date=today;
      const finalPrice=price??Number(target?.price||0),finalCost=cost??Number(target?.cost||0);
      if(price!==null||cost!==null)payload.markup=finalCost?(finalPrice/finalCost-1)*100:0;
      if(!target)Object.assign(payload,{active:false,archived:false,availability:'order',price_mode:'show',brand:brand||null,article:sku||null,stock_qty:stock});
      item.target=target;item.payload=payload;item.category=category;item.name=name||target.name;item.sku=sku||target?.article||'';item.kind=target?'update':'new';item.selected=!target;
      if(target&&!category&&!Object.keys(payload).some(k=>!['name','article','brand'].includes(k)&&String(payload[k]??'')!==String(target[k]??''))&&(!sku||identity(sku)===identity(target.article)))item.note='Данные без существенных изменений';
    }catch(e){item.kind='error';item.errors.push(e.message);}
    return item;
  });
}

export function buildImportPlan(rows,products,today){return groupVariantImports(rows,products,today,buildFlatImportPlan,identity,parseAmount);}
