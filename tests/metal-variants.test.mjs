import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildImportPlan} from '../admin-data.js';
import {variantCartRow,roundMoney,validVariantQty} from '../variant-model.js';
import {convertMetalPrice} from '../supplier-import.js';

test('wall and steel grade distinguish otherwise identical variants; partial updates retain private costs',()=>{
  const row=(wall,grade)=>({'Группа вариантов':'Труба','Единица продажи':'Пруток','Размер / Ду, мм':'20×40','Длина, м':6,'Толщина, мм':wall,'Марка стали':grade,Цена:200.123,Закуп:100.123});
  const plan=buildImportPlan([row(2,'Ст3'),row(2.5,'Ст3'),row(2,'Ст2')],[],'2026-10-31')[0];
  assert.equal(plan.kind,'new');assert.equal(plan.payload.variants.length,3);
  const product={id:'parent',...plan.payload},v=product.variants[0];
  const updated=buildImportPlan([{'Группа вариантов':'Труба','Артикул варианта':v.id,'Единица продажи':'Пруток','Размер / Ду, мм':'20×40','Длина, м':6,Цена:250}], [product],'2026-10-31')[0];
  assert.equal(updated.kind,'update');assert.equal(updated.payload.variants.length,3);assert.equal(updated.payload.variants[0].thickness_mm,'2');assert.deepEqual(updated.payload.variant_costs,product.variant_costs);
  assert(!JSON.stringify(updated.payload.variants).includes('cost'));
});

test('sheet pricing is per sheet; weight and metre quantities support three decimal places',()=>{
  const sheet={id:'s',name:'1 мм · 1250×2500 мм',unit:'sheet',price:10000,availability:'order'};
  assert.equal(variantCartRow({id:'p',name:'Лист'},sheet,2).price,10000);
  assert.throws(()=>variantCartRow({id:'p',name:'Лист'},sheet,1.5));
  for(const unit of ['kg','ton','meter','sqm'])assert(validVariantQty({unit},1.125));
  assert(!validVariantQty({unit:'kg'},1.1234));
  const weight={id:'w',name:'Бухта по весу',unit:'kg',price:600.123456,availability:'order'};
  const cart=variantCartRow({id:'w',name:'Проволока'},weight,2.5);assert.equal(roundMoney(cart.price*cart.qty),1500.31);
});

test('supplier section controls price basis; markup is required and ambiguous formats are blocked',()=>{
  const matrix=[['#','КАТАНКА В БУХТАХ'],['',6,'','бухта/шығанақ','ГОСТ','Ст3','факт',400000,''],['#','ЛИСТ ПВЛ'],['','4 (406)','','1000х3000х3100','ГОСТ','Ст3',25,400000,10000]];
  const missing=convertMetalPrice(matrix,'');assert(!missing.hasMarkup);assert(missing.rows.every(r=>r['Ошибка импорта']));
  const result=convertMetalPrice(matrix,25);assert.equal(result.sourceCount,2);assert.equal(result.rows[0]['Единица продажи'],'Килограмм');assert.equal(result.rows[0].Цена,500);assert.match(result.rows[1]['Ошибка импорта'],/Неоднозначный/);
});
