import {parseVariants,validateVariant,roundMoney,parseVariantLength,unknownRodLength,isRateUnit} from './variant-model.js?v=290';
const cleanAmount=value=>value===''||value==null?value:Number.isFinite(Number(value))&&Math.abs(Number(value)-roundMoney(value))<1e-8?roundMoney(value):value;
export function setupVariantEditor({el,state,esc,money}){
  const area=el.fVariants,box=document.createElement('section');box.className='wide variant-admin';area.parentElement.replaceWith(box);area.hidden=true;
  const costs=document.createElement('input');costs.type='hidden';costs.id='fVariantCosts';
  box.innerHTML='<div class="variant-editor-toolbar"><div><h3>Размеры и цены <span id="variantRowCount"></span></h3><p class="fine">Выберите размер ниже, чтобы изменить его поля.</p></div><button type="button" class="small-btn" id="addVariantRow">＋ Добавить размер</button></div><details class="variant-editor-help"><summary>Как указывать цену и длину</summary><p class="fine">Пруток и Метр — цена и закуп за метр. Бухта — за целую бухту, длина — метры одной бухты. Штука — за одну штуку. Для немерной длины напишите «н/м». При смене единицы введите цены заново.</p></details><div class="variant-list-actions"><span class="fine">Закуп видят только администратор и снабженец.</span><button type="button" class="small-btn" id="toggleVariantRows">Развернуть все</button></div><div class="variant-editor-list"></div>';
  box.prepend(area,costs);let rows=[];const list=box.querySelector('.variant-editor-list');
  const unitNames={rod:'Пруток',piece:'Штука',meter:'Метр',coil:'Бухта'};
  const rowName=r=>r.name.trim()||(['rod','coil'].includes(r.unit)?(r.diameter?'Ø'+r.diameter+' мм · ':r.unit==='coil'?'Бухта · ':'')+(unknownRodLength(r)?'Длина уточняется':r.length_m+' м'):r.unit==='meter'?(r.diameter?'Ø'+r.diameter+' мм':'Погонный метр'):'');
  const priceUnit=r=>isRateUnit(r)?'метр':r.unit==='coil'?'бухту':'штуку';
  function summary(r,i){const n=isRateUnit(r)?r.price_per_m:r.price;return {name:rowName(r)||'Новый размер '+(i+1),info:(unitNames[r.unit]||'Штука')+' · '+(n===''||n==null?'Цена не указана':money(cleanAmount(n))+' за '+priceUnit(r))};}
  function sync(){
    el.fAvailability.disabled=rows.length>0;el.fPriceMode.disabled=rows.length>0;el.fStockQty.readOnly=rows.length>0;el.fPrice.readOnly=rows.length>0;el.fCost.readOnly=rows.length>0;
    if(rows.length){el.fPrice.value=Math.min(...rows.map(r=>Number(isRateUnit(r)?r.price_per_m:r.price)||0));el.fCost.value=Math.min(...rows.map(r=>Number(r.cost)||0));}
    area.value=JSON.stringify(rows.map(r=>{const v={...r,name:rowName(r)};delete v.cost;v.price=unknownRodLength(v)&&v.unit==='rod'?null:v.unit==='meter'?Number(v.price_per_m):v.unit==='rod'?roundMoney(Number(v.price_per_m)*Number(v.length_m)):v.price===''||v.price==null?null:Number(v.price);return v;}));
    costs.value=JSON.stringify(Object.fromEntries(rows.filter(r=>r.cost!==''&&r.cost!=null).map(r=>[r.id,{cost:Number(r.cost)}])));area.dispatchEvent(new Event('input',{bubbles:true}));
  }
  function updateToggle(){const cards=[...list.querySelectorAll('.variant-editor-card')];box.querySelector('#toggleVariantRows').hidden=!cards.length;box.querySelector('#toggleVariantRows').textContent=cards.length&&cards.every(c=>c.open)?'Свернуть все':'Развернуть все';}
  function render(openId,first=false){
    const opened=new Set([...list.querySelectorAll('.variant-editor-card[open]')].map(c=>c.dataset.id));if(openId)opened.add(openId);
    list.innerHTML=rows.length?rows.map((r,i)=>{const s=summary(r,i);return '<details class="variant-editor-card" data-index="'+i+'" data-id="'+esc(r.id)+'" '+(opened.has(r.id)||(first&&i===0)?'open':'')+'><summary><span class="variant-card-number">'+(i+1)+'</span><span class="variant-card-caption"><b data-row-title>'+esc(s.name)+'</b><small data-row-info>'+esc(s.info)+'</small></span><span class="variant-edit-label">Изменить</span></summary><div class="variant-card-body"><div class="variant-editor-fields">'+
      '<label>Продажа<select data-field="unit">'+Object.entries(unitNames).map(([v,n])=>'<option value="'+v+'" '+((r.unit||'piece')===v?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'+
      '<label class="variant-field-name">Название / размер<input data-field="name" aria-label="Название варианта" value="'+esc(r.name)+'" placeholder="Можно оставить пустым — составится из размера"></label>'+
      '<label>Наличие<select data-field="availability">'+[['order','Под заказ'],['in_stock','В наличии'],['out_of_stock','Нет в наличии']].map(([v,n])=>'<option value="'+v+'" '+((r.availability||'order')===v?'selected':'')+'>'+n+'</option>').join('')+'</select></label>'+
      '<label>Диаметр, мм<input data-field="diameter" aria-label="Диаметр" value="'+esc(r.diameter||'')+'" inputmode="decimal" placeholder="Например, 12"></label>'+
      '<label>'+(r.unit==='coil'?'Метров в бухте':'Длина, м')+'<input data-field="length_m" aria-label="Длина, м" type="text" placeholder="6 или н/м" value="'+esc(unknownRodLength(r)?'н/м':r.length_m??'')+'"></label>'+
      '<label>Цена за '+priceUnit(r)+', ₸<input data-field="'+(isRateUnit(r)?'price_per_m':'price')+'" aria-label="Цена варианта" type="number" min="0" step="0.01" inputmode="decimal" value="'+esc(cleanAmount(isRateUnit(r)?r.price_per_m??'':r.price??''))+'"></label>'+
      '<label>Закуп за '+priceUnit(r)+', ₸<input data-field="cost" aria-label="Закуп варианта" type="number" min="0" step="0.01" inputmode="decimal" value="'+esc(cleanAmount(r.cost??''))+'"></label></div><p class="variant-row-error" role="status" hidden></p><div class="variant-row-actions"><button type="button" class="small-btn" data-copy="'+i+'">Дублировать размер</button><button type="button" class="small-btn danger-lite" data-remove="'+i+'">Удалить размер</button></div></div></details>';}).join(''):'<p class="fine variant-editor-empty">Размеров пока нет. Нажмите «Добавить размер», если у товара несколько вариантов.</p>';
    box.querySelector('#variantRowCount').textContent=rows.length?'('+rows.length+')':'';
    list.querySelectorAll('.variant-editor-card').forEach(card=>{const toggle=()=>{card.querySelector('.variant-edit-label').textContent=card.open?'Свернуть':'Изменить';updateToggle();};card.addEventListener('toggle',toggle);toggle();});
    list.querySelectorAll('[data-field]').forEach(input=>input.onchange=()=>{
      const card=input.closest('.variant-editor-card'),r=rows[Number(card.dataset.index)],k=input.dataset.field;
      r[k]=['price_per_m','price','cost'].includes(k)?input.value===''?'':cleanAmount(Number(input.value)):input.value;
      if(k==='length_m'){try{Object.assign(r,parseVariantLength(input.value));}catch{r.length_unknown=false;}}
      if(k==='unit'){r.length_unknown=false;r.cost='';r.price='';r.price_per_m='';r.length_m='';}
      card.querySelector('.variant-row-error').hidden=true;card.classList.remove('has-error');sync();
      if(k==='unit')render(r.id);else{const s=summary(r,Number(card.dataset.index));card.querySelector('[data-row-title]').textContent=s.name;card.querySelector('[data-row-info]').textContent=s.info;}
    });
    list.querySelectorAll('input[data-field]').forEach(input=>{input.oninput=()=>input.onchange();input.addEventListener('blur',()=>{if(['price_per_m','price','cost'].includes(input.dataset.field)&&input.value!=='')input.value=cleanAmount(input.value);});});
    list.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{rows.splice(Number(b.dataset.remove),1);sync();render();});
    list.querySelectorAll('[data-copy]').forEach(b=>b.onclick=()=>{const copy={...rows[Number(b.dataset.copy)],id:crypto.randomUUID()};rows.push(copy);sync();render(copy.id);list.lastElementChild.querySelector('[data-field="name"]').focus();});updateToggle();
  }
  list.addEventListener('invalid',e=>{const card=e.target.closest('.variant-editor-card');if(card)card.open=true;},true);
  box.querySelector('#toggleVariantRows').onclick=()=>{const cards=[...list.querySelectorAll('.variant-editor-card')],open=!cards.every(c=>c.open);cards.forEach(c=>c.open=open);updateToggle();};
  box.querySelector('#addVariantRow').onclick=()=>{const r={id:crypto.randomUUID(),name:'',unit:rows.at(-1)?.unit||'rod',length_m:rows.at(-1)?.unit&&rows.at(-1).unit!=='rod'?'':6,price_per_m:'',price:'',cost:'',availability:'order'};rows.push(r);sync();render(r.id);list.lastElementChild.querySelector('[data-field="name"]').focus();};
  return {
    refresh(){let parsed=[];try{parsed=area.value.trim().startsWith('[')?JSON.parse(area.value):parseVariants(area.value);}catch{}let privateCosts={};try{privateCosts=JSON.parse(costs.value||'{}');}catch{}rows=parsed.map(v=>({...v,price:cleanAmount(v.price),price_per_m:cleanAmount(v.price_per_m),cost:cleanAmount(privateCosts[v.id]?.cost??'')}));el.fPrice.readOnly=rows.length>0;el.fCost.readOnly=rows.length>0;render(null,true);},
    validate(){for(let i=0;i<rows.length;i++){const r=rows[i];try{validateVariant({...r,name:rowName(r)});if(r.cost!==''&&r.cost!=null&&(!Number.isFinite(Number(r.cost))||Number(r.cost)<0))throw new Error('Проверьте закуп варианта');}catch(e){const card=list.querySelector('[data-index="'+i+'"]');card.open=true;card.classList.add('has-error');const message=card.querySelector('.variant-row-error');message.textContent=e.message;message.hidden=false;card.querySelector('[data-field]').focus();throw e;}}sync();return {variants:parseVariants(area.value),variant_costs:JSON.parse(costs.value||'{}')};}
  };
}
