import {localizedProductName} from './product-language.js?v=310';
import {privatePricingText} from './private-pricing.js?v=310';
import {variantDetails,fractionalUnit} from './variant-attributes.js?v=310';
import {variantsOf,piecePrice,roundMoney,unknownRodLength,unitLabel,quantityUnitLabel,validVariantQty,isRateUnit} from './variant-model.js?v=310';
export function bindVariantPicker({p,root,money,esc,specsHtml,kk,addCustomer,addSeller,whatsapp,message}){
  const variants=variantsOf(p).flatMap(v=>v.unit==='rod'&&v.length_options?.length?v.length_options.map(n=>({...v,id:v.id+'@length:'+n,length_m:n,name:v.name+' · '+n+' м'})): [v]);if(!variants.length)return;
  const host=root.querySelector('#variantPicker');if(!host)return;let selected=null;
  const rods=variants.every(v=>v.unit==='rod'),diameters=[...new Set(variants.map(v=>String(v.diameter||'')))];
  const hasThickness=rods&&variants.some(v=>v.thickness_mm);
  const lengthLabel=kk?'Ұзындығы нақтыланады':'Длина уточняется';
  host.innerHTML='<h3>'+(rods?(kk?'Өлшемді таңдаңыз':'Выберите размер'):(kk?'Модельді / нұсқаны таңдаңыз':'Выберите модель / вариант'))+'</h3><div class="variant-pick-fields">'+(rods?'<label>Размер / диаметр, мм<select id="pickDiameter">'+diameters.map(d=>'<option value="'+esc(d)+'">'+esc(d)+' мм</option>').join('')+'</select></label>':'')+(hasThickness?'<label>'+(kk?'Қабырға қалыңдығы, мм':'Толщина стенки, мм')+'<select id="pickThickness"></select></label>':'')+'<label>'+(rods?kk?'Шыбық ұзындығы':'Длина изделия':kk?'Модель / нұсқа':'Модель / вариант')+'<select id="pickVariant"></select></label><label>'+(rods?(kk?'Шыбық саны':'Количество целых изделий'):(kk?'Саны':'Количество'))+'<input id="pickQty" type="number" min="1" max="100000" step="1" value="1" inputmode="numeric"></label></div><div id="pickCalculation" aria-live="polite"></div>';
  const $=id=>host.querySelector('#'+id),quantity=()=>Number($('pickQty').value);
  const rodWord=n=>kk?'шыбық':n%100>=11&&n%100<=14?'прутков':n%10===1?'пруток':n%10>=2&&n%10<=4?'прутка':'прутков';
  const wa=root.querySelector('#detailWhatsapp'),defaultWaText=wa?.textContent||'WhatsApp';
  function update(){
    selected=variants.find(v=>v.id===$('pickVariant').value);
    const unknown=unknownRodLength(selected),qty=quantity(),price=selected?piecePrice(selected):null;
    const qtyValid=validVariantQty(selected,qty);const qtyInput=$('pickQty');qtyInput.min=fractionalUnit(selected?.unit)?'0.001':'1';qtyInput.step=fractionalUnit(selected?.unit)?'0.001':'1';qtyInput.inputMode=fractionalUnit(selected?.unit)?'decimal':'numeric';qtyInput.closest('label').firstChild.textContent=selected?.unit==='meter'?(kk?'Метраж, м':'Метраж, м'):selected?.unit==='coil'?(kk?'Орам саны':'Количество бухт'):selected?.unit==='rod'?(kk?'Шыбық саны':'Количество целых изделий'):(kk?'Саны':'Количество');
    const valid=selected&&!unknown&&qtyValid&&Number.isFinite(price)&&selected.price!==null&&selected.availability!=='out_of_stock';
    const m=['rod','coil'].includes(selected?.unit)&&!unknown?Math.round(Number(selected.length_m)*qty*1000)/1000:selected?.unit==='meter'?qty:null;
    $('pickQty').closest('label').hidden=unknown;
    $('pickQty').disabled=unknown;
    let calculation='';
    if(selected){
      if(selected.availability==='out_of_stock')calculation='<p>'+(kk?'Қоймада жоқ':'Нет в наличии')+'</p>';
      else if(unknown){const rate=selected.unit==='rod'?selected.price_per_m:selected.price;calculation='<p><b>'+esc(rate==null?(kk?'Бағасын нақтылаңыз':'Уточнить цену'):money(rate))+'</b> / '+(selected.unit==='rod'?'м':unitLabel(selected.unit,kk))+'</p>';}
      else calculation='<p><b>'+esc(selected.price===null?(kk?'Бағасын нақтылаңыз':'Уточнить цену'):money(selected.unit==='rod'?selected.price_per_m:price))+'</b> / '+unitLabel(selected.unit==='rod'?'meter':selected.unit,kk)+(selected.unit==='rod'?' · '+esc(money(price))+' / '+(kk?'шыбық':'пруток'):'')+'</p>';
      calculation+='<p>'+(unknown?(kk?'Ұзындығы әртүрлі болуы мүмкін. Ұзындығы мен жалпы сомасын WhatsApp арқылы нақтылаңыз.':'Длина уточняется. Уточните длину и итоговую стоимость в WhatsApp.'):valid?(kk?'Барлығы: ':'Всего: ')+qty+' '+(selected.unit==='rod'?rodWord(qty):quantityUnitLabel(selected.unit,qty,kk))+(m!==null&&selected.unit!=='meter'?' · '+m+' м':'')+' · <strong>'+esc(money(roundMoney(price*qty)))+'</strong>':kk?'Бүтін санды көрсетіңіз немесе басқа нұсқаны таңдаңыз':'Укажите целое количество или выберите доступный вариант')+'</p>';
    }
    if(p.price_mode==='ask')calculation='<p><b>'+(kk?'Бағасын нақтылаңыз':'Уточнить цену')+'</b></p><p>'+(kk?'WhatsApp арқылы хабарласыңыз':'Напишите в WhatsApp для уточнения цены')+'</p>';
    if(selected)calculation+='<p>'+esc(({in_stock:kk?'Қоймада бар':'В наличии',order:kk?'Тапсырыспен':'Под заказ',out_of_stock:kk?'Қоймада жоқ':'Нет в наличии'})[selected.availability||'order'])+'</p>';
    if(selected?.stock_qty!=null&&selected.stock_qty!=='')calculation+='<p>'+(kk?'Қалдық: ':'Остаток размера: ')+esc(String(selected.stock_qty))+' '+quantityUnitLabel(selected.unit,Number(selected.stock_qty),kk)+'</p>';
    $('pickCalculation').innerHTML=calculation;
    const specifications=root.querySelector('#detailSpecifications');if(specifications&&specsHtml)specifications.innerHTML=specsHtml(selected?.specs?.trim()||p.specs);
    const privateSummary=root.querySelector('#selectedVariantMarkup');
    if(privateSummary&&selected){
      const sourceId=selected.id.replace(/@length:[\d.]+$/,'');
      privateSummary.textContent='Выбранный размер: '+selected.name+' · '+privatePricingText(isRateUnit(selected)?selected.price_per_m:selected.price,p.variant_costs?.[sourceId]?.cost,money)+' · за '+(isRateUnit(selected)?'метр':unitLabel(selected.unit));
    }
    for(const id of ['detailCustomerAdd','addToCartFromDetail']){const button=root.querySelector('#'+id);if(button)button.disabled=!valid||p.price_mode==='ask';}
    if(wa){wa.disabled=!(selected&&(unknown||qtyValid));wa.textContent=unknown?(kk?'Ұзындығын WhatsApp арқылы нақтылау':'Уточнить длину в WhatsApp'):defaultWaText;}
  }
  function options(){
    const rows=rods?variants.filter(v=>String(v.diameter||'')===$('pickDiameter').value&&(!hasThickness||String(v.thickness_mm||'')===$('pickThickness').value)):variants;
    $('pickVariant').innerHTML=rows.map(v=>'<option value="'+esc(v.id)+'">'+esc(rods?(unknownRodLength(v)?lengthLabel:v.length_m+' м'):v.name.replace(/Длина уточняется/gi,lengthLabel)+' · '+unitLabel(v.unit,kk)+(v.unit==='coil'&&!unknownRodLength(v)?' · '+v.length_m+' м':''))+(!rods&&variantDetails(v)?' · '+esc(variantDetails(v)):'')+(v.availability==='out_of_stock'?(kk?' — жоқ':' — нет в наличии'):'')+'</option>').join('');update();
  }
  function dimensions(){if(hasThickness){const walls=[...new Set(variants.filter(v=>String(v.diameter||'')===$('pickDiameter').value).map(v=>String(v.thickness_mm||'')))];$('pickThickness').innerHTML=walls.map(t=>'<option value="'+esc(t)+'">'+esc(t|| (kk?'Көрсетілмеген':'Не указана'))+'</option>').join('');}options();}
  if(rods)$('pickDiameter').onchange=dimensions;if(hasThickness)$('pickThickness').onchange=options;$('pickVariant').onchange=update;$('pickQty').oninput=update;dimensions();
  root.querySelector('#detailCustomerAdd').onclick=()=>{if(!root.querySelector('#detailCustomerAdd').disabled)addCustomer(selected,quantity());};
  const seller=root.querySelector('#addToCartFromDetail');if(seller)seller.onclick=()=>{if(!seller.disabled)addSeller(selected,quantity());};
  if(wa)wa.onclick=()=>{
    if(wa.disabled||!selected)return;
    const prefix=message({...p,name_kk:null,name:localizedProductName(p,kk)+' — '+selected.name.replace(/Длина уточняется/gi,lengthLabel)+(variantDetails(selected)?' · '+variantDetails(selected):'')});
    if(p.price_mode==='ask')return whatsapp(prefix+'\n'+(kk?'Саны: ':'Количество: ')+quantity()+' '+quantityUnitLabel(selected.unit,quantity(),kk)+'\n'+(kk?'Бағасын нақтылаңызшы.':'Подскажите актуальную цену.'));
    if(unknownRodLength(selected))return whatsapp(prefix+'\n'+lengthLabel+'\n'+(kk?'Бағасы: ':'Цена: ')+(selected.unit==='rod'?money(selected.price_per_m)+' / м':selected.price==null?(kk?'нақтыланады':'уточняется'):money(selected.price)+' / '+unitLabel(selected.unit,kk))+'\n'+(kk?'Қолда бар ұзындығы мен толық құнын айтыңызшы.':'Подскажите доступную длину и стоимость целого прутка.'));
    whatsapp(prefix+'\n'+(kk?'Саны: ':'Количество: ')+quantity()+' '+(selected.unit==='rod'?rodWord(quantity()):quantityUnitLabel(selected.unit,quantity(),kk))+(['rod','coil'].includes(selected.unit)?' · '+Math.round(quantity()*selected.length_m*1000)/1000+' м':'')+'\n'+(kk?'Сома: ':'Сумма: ')+(selected.price===null?(kk?'Бағасын нақтылаңыз':'Цена уточняется'):money(roundMoney(piecePrice(selected)*quantity()))));
  };
}
