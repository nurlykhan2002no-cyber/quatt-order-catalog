// Optional characteristics are shared by manual editing, Excel and customer selection.
export const attributeFields=[['thickness_mm','Толщина / стенка, мм'],['format','Формат листа / рулона'],['steel_grade','Марка стали'],['gost','ГОСТ / ТУ'],['finish','Покрытие / обработка'],['series','Серия профиля'],['mesh','Ячейка, мм'],['wire_mm','Проволока, мм'],['weight','Масса единицы, кг'],['weight_per_m','Масса метра, кг'],['extra','Другие характеристики']];
export const normalizeSize=x=>String(x??'').normalize('NFKC').trim().replace(/\s*[xх×]\s*/gi,'×').replace(/(\d),(\d)/g,'$1.$2').replace(/\s+/g,' ');
export const attributeSignature=v=>attributeFields.filter(([k])=>!['weight','weight_per_m','extra'].includes(k)).map(([k])=>normalizeSize(v[k]).toLocaleLowerCase('ru')).join('|');
export const variantDetails=v=>[v.thickness_mm?'стенка / толщина '+v.thickness_mm+' мм':'',v.format,v.steel_grade,v.gost?'ГОСТ / ТУ '+v.gost:'',v.finish,v.series,v.mesh?'ячейка '+v.mesh+' мм':'',v.wire_mm?'проволока '+v.wire_mm+' мм':'',v.extra].filter(Boolean).join(' · ');
export const fractionalUnit=u=>['meter','kg','ton','sqm'].includes(u);
export const saleUnits={rod:'Пруток',piece:'Штука',meter:'Метр',coil:'Бухта',sheet:'Лист',card:'Карта',roll:'Рулон',kg:'Килограмм',ton:'Тонна',sqm:'Квадратный метр'};
