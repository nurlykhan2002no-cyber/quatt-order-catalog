export function localizedProductName(p,kk=false){return String(kk&&p?.name_kk?.trim()?p.name_kk:p?.name||'');}
export function localizedCartName(row,product,kk=false){
  const base=row.name_ru||row.name||'',ru=product?.name||'';
  if(product&&base.startsWith(ru))return localizedProductName(product,kk)+base.slice(ru.length);
  return kk&&row.name_kk?row.name_kk:base;
}
