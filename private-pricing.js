// Price and procurement cost must use the same sale unit (metre for rods).
export function privatePricingText(price,cost,money){
  const valid=n=>n!==null&&n!==undefined&&n!==''&&Number.isFinite(Number(n));
  if(!valid(cost))return 'Закуп не указан · Наценка не рассчитана';
  if(!valid(price))return 'Закуп: '+money(cost)+' · Наценка не рассчитана: цена не указана';
  const difference=Math.round((Number(price)-Number(cost))*100)/100;
  const percent=Number(cost)>0?new Intl.NumberFormat('ru-RU',{maximumFractionDigits:1}).format(difference/Number(cost)*100)+'%':'не рассчитана (закуп 0 ₸)';
  return 'Закуп: '+money(cost)+' · Продажа: '+money(price)+' · Наценка: '+percent+' ('+(difference>=0?'+':'')+money(difference)+')';
}
