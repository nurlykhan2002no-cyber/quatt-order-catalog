// Supplier layout adapter. No supplier prices or customer data are embedded here.
import {normalizeSize} from './variant-attributes.js?v=293';
const num=x=>{const s=String(x??'').replace(/\s/g,'').replace(',','.');return /^\d+(?:\.\d+)?$/.test(s)?Number(s):null;};
const amount=n=>Math.round(n*1e6)/1e6;
export function recognizeMetalPrice(matrix){return matrix.some(r=>/Диаметр.*diameter/i.test(String(r[1])))&&matrix.some(r=>/Цена за тонну/i.test(String(r[7])));}
export function convertMetalPrice(matrix,markup){
  const rows=[],warnings=[];let group='',sourceCount=0;
  const hasMarkup=markup!==''&&markup!=null&&Number.isFinite(Number(markup))&&Number(markup)>=0&&Number(markup)<=10000;
  for(let i=0;i<matrix.length;i++){
    const r=matrix[i]||[],marker=String(r[0]||'').trim(),title=String(r[1]??'').trim();
    if(marker.startsWith('#')||(!group&&/АРМАТУРА/i.test(title))){group=title.split('*')[0].trim().replace(/\s+/g,' ');continue;}
    if(!group||marker==='@'||!title||!r.slice(4,9).some(v=>v!==''&&v!=null))continue;
    sourceCount++;const line=i+1,isSheet=/^ЛИСТ/.test(group),isMesh=/^СЕТКА КЛАДОЧНАЯ/.test(group),isRoll=/^СЕТКА РАБИЦА/.test(group),isCoil=/бухта/i.test(String(r[3])),onOrder=/под заказ/i.test(String(r[8]));
    const format=String(r[3]??'').trim(),dimension=normalizeSize(title),weight=num(r[6]),ton=num(r[7]);
    let unit=isCoil?'Килограмм':isSheet?'Лист':isMesh?'Карта':isRoll?'Рулон':'Пруток';
    let cost=isCoil?(ton==null?null:ton/1000):num(r[8]),error='';
    if(cost==null&&onOrder&&weight!=null&&ton!=null){cost=amount(weight*ton/1000);warnings.push('Строка '+line+': цена рассчитана из ставки за тонну и удельного веса; товар под заказ.');}
    if(cost==null)error='Нет однозначной закупочной цены';
    if(isSheet&&normalizeSize(format).split('×').length>2)error='Неоднозначный формат «'+format+'»: уточните размер';
    let thickness=isSheet?(/^\d+(?:[.,]\d+)?$/.test(title)?title:/^(\d+)\s*\(/.test(title)?title.match(/^(\d+)/)[1]:''):isMesh||isRoll?'':num(r[2])!=null?r[2]:'';
    let lengths=[''];
    if(unit==='Пруток'){
      lengths=format.split('/').map(x=>x.trim());
      if(/^н\s*\/\s*м$/i.test(format))lengths=['н/м'];
      else if(lengths.some(x=>num(x)==null||num(x)<=0))error='Не удалось распознать длину «'+format+'»';
    }
    if(!hasMarkup&&!error)error='Введите наценку для расчёта розничных цен';
    for(const length of lengths){
      const attrs={'Толщина / стенка, мм':thickness,'Формат листа / рулона':isSheet||isMesh||isRoll?format:'','Марка стали':isRoll?'':String(r[5]??'').trim(),'ГОСТ / ТУ':String(r[4]??'').trim(),'Покрытие / обработка':!isSheet&&!isMesh&&!isRoll&&num(r[2])==null?String(r[2]??'').trim():isSheet&&num(r[2])==null?String(r[2]??'').trim():'','Ячейка, мм':isMesh?dimension:isRoll?String(r[2]??'').replace(/^яч\.\s*/i,''):'','Проволока, мм':isMesh?r[2]:isRoll?(title.match(/[\d.,]+/)||[''])[0]:'','Масса единицы, кг':isSheet||isMesh?weight??'':'','Масса метра, кг':!isSheet&&!isMesh&&!isRoll&&!isCoil?weight??'':'','Другие характеристики':isCoil?'Бухта по фактическому весу; итог после взвешивания':isSheet&&/ПВЛ/.test(group)?'Обозначение '+title:''};
      rows.push({'Группа вариантов':group,'Категория':'Металлопрокат','Размер / Ду, мм':isSheet||isRoll?'':dimension,'Длина, м':length,'Единица продажи':unit,'Вариант':[dimension,isSheet||isMesh||isRoll?format:isCoil?'бухта, по весу':length+' м'].filter(Boolean).join(' · '),...attrs,'Цена':hasMarkup&&cost!=null?amount(cost*(1+Number(markup)/100)):'','Закуп':cost??'','Наличие':'Под заказ','Поставщик':'Металлсервис','Исходная строка':line,'Ошибка импорта':error});
    }
  }
  return {rows,warnings,sourceCount,hasMarkup};
}
