import {test} from 'node:test';import assert from 'node:assert/strict';
import {localizedProductName,localizedCartName} from '../product-language.js';
import {buildImportPlan} from '../admin-data.js';import {variantCartRow} from '../variant-model.js';
test('names switch without changing model codes, with Russian fallback',()=>{
  const p={name:'Арматура А500С',name_kk:'А500С арматурасы'};
  assert.equal(localizedProductName(p,true),'А500С арматурасы');assert.equal(localizedProductName(p,false),p.name);assert.equal(localizedProductName({...p,name_kk:' '},true),p.name);
});
test('existing and new carts change language while retaining selected size',()=>{
  const p={id:'p',name:'Труба',name_kk:'Құбыр'};
  assert.equal(localizedCartName({name:'Труба — 20 мм'},p,true),'Құбыр — 20 мм');
  const row=variantCartRow(p,{id:'v',name:'20 мм',unit:'rod',diameter:20,length_m:6,price_per_m:200},1);
  assert.equal(localizedCartName(row,p,true),'Құбыр — 20 мм');assert.equal(localizedCartName(row,p,false),'Труба — 20 мм');
});
test('Excel translated name imports for ordinary and grouped products; blanks preserve existing translations',()=>{
  const simple=buildImportPlan([{Название:'Раковина','Название на казахском':'Қолжуғыш',Цена:100,Закуп:50}],[],'2026-10-31')[0];assert.equal(simple.payload.name_kk,'Қолжуғыш');
  const row={'Группа вариантов':'Труба','Название на казахском':'Құбыр','Размер / Ду, мм':20,'Длина, м':'6/12',Цена:200,Закуп:100};
  const grouped=buildImportPlan([row],[],'2026-10-31')[0];assert.equal(grouped.payload.name_kk,'Құбыр');
  const update=buildImportPlan([{...row,'Название на казахском':''}],[{id:'p',...grouped.payload}],'2026-10-31')[0];assert.equal(update.kind,'update');assert.equal(update.payload.name_kk,undefined);
  assert.equal(buildImportPlan([row,{...row,'Длина, м':10,'Название на казахском':'Другое'}],[],'2026-10-31')[0].kind,'error');
});
