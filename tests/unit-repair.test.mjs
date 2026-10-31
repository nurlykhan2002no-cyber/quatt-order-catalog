import {test} from 'node:test';import assert from 'node:assert/strict';
import {replaceVariantUnits} from '../variant-unit-tools.js';import {buildImportPlan} from '../admin-data.js';import {variantsOf,unitLabel} from '../variant-model.js';
const wrong={id:'sheet',name:'Ø25×25 мм',unit:'sheet',diameter:'25×25',thickness_mm:'3',length_m:6,price:850.08,cost:607.2,availability:'order'};
const correct={...wrong,id:'rod',unit:'rod',price:5100.48,price_per_m:850.08};
test('bulk unit correction retains rates, procurement cost and length; merges exact corrected duplicates',()=>{
  const input=[wrong,correct],result=replaceVariantUnits(input,'sheet','rod');assert.equal(result.changed,1);assert.equal(result.merged,1);assert.equal(result.rows.length,1);assert.equal(result.rows[0].id,'rod');assert.equal(result.rows[0].cost,607.2);assert.equal(input[0].unit,'sheet');
  const single=replaceVariantUnits([wrong],'all','rod').rows[0];assert.equal(single.price_per_m,850.08);assert.equal(single.length_m,6);assert.equal(single.cost,607.2);
  assert.equal(replaceVariantUnits([wrong,{...correct,price_per_m:900}],'sheet','rod').rows.length,2);
  assert.throws(()=>replaceVariantUnits([{...wrong,length_m:null}],'sheet','rod'));assert.equal(wrong.unit,'sheet');
});
test('full import replacement is explicit; merge remains default and failed rows do not mutate products',()=>{
  const product={id:'p',name:'Уголок',variants:[wrong],variant_costs:{sheet:{cost:607.2}},price:850.08,cost:607.2};
  const row={'Группа вариантов':'Уголок','Единица продажи':'Пруток','Размер / Ду, мм':'25×25','Толщина, мм':3,'Длина, м':6,Цена:850.08,Закуп:607.2};
  assert.equal(buildImportPlan([row],[product],'2026-11-01')[0].payload.variants.length,2);
  const replaced=buildImportPlan([row],[product],'2026-11-01',{replaceVariants:true})[0];assert.equal(replaced.kind,'update');assert.equal(replaced.selected,false);assert.equal(replaced.payload.variants.length,1);assert.equal(replaced.payload.variants[0].unit,'rod');assert(!replaced.payload.variant_costs.sheet);assert.equal(product.variants[0].unit,'sheet');
  assert.equal(buildImportPlan([{...row,Цена:'ошибка'}],[product],'2026-11-01',{replaceVariants:true})[0].kind,'error');assert.equal(product.variants.length,1);
});
test('sheet is табақ and dimensions do not receive an automatic diameter symbol',()=>{
  assert.equal(unitLabel('sheet',true),'табақ');assert.equal(variantsOf({variants:[wrong]})[0].name,'25×25 мм');
  const p=buildImportPlan([{'Группа вариантов':'Уголок','Единица продажи':'Пруток','Размер / Ду, мм':'25×25','Длина, м':6,Цена:200,Закуп:100}],[],'2026-11-01')[0];assert(!p.payload.variants[0].name.includes('Ø'));
});
