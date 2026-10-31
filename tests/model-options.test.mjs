import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildImportPlan} from '../admin-data.js';
import {validateVariant} from '../variant-model.js';
test('models retain separate specifications and stock through import updates',()=>{
  const rows=['Model A','Model B'].map((name,i)=>({'Группа вариантов':'Kazboiler',Вариант:name,'Единица продажи':'Штука',Цена:42000+i*10000,Закуп:30000, 'Характеристики модели':'Объём: '+(50+i*30)+' л','Остаток размера':i+2}));
  const result=buildImportPlan(rows,[],'2026-11-01')[0];assert.equal(result.kind,'new');
  assert.equal(result.payload.variants[1].specs,'Объём: 80 л');assert.equal(result.payload.variants[0].stock_qty,2);
  const target={id:'p',...result.payload,price_mode:'ask',stock_qty:10};
  const update=buildImportPlan(rows.map(r=>({...r,'Характеристики модели':'','Остаток размера':''})),[target],'2026-11-01')[0];
  assert.equal(update.payload.price_mode,'ask');assert.equal(update.payload.stock_qty,10);
  assert.equal(update.payload.variants[1].specs,'Объём: 80 л');assert.equal(update.payload.variants[0].stock_qty,2);
});
test('stock is nonnegative and respects the sale unit',()=>{
  const row={id:'r',name:'12 мм',unit:'rod',diameter:12,length_m:6,price_per_m:140};
  for(const n of [-1,1.5,NaN])assert.throws(()=>validateVariant({...row,stock_qty:n}));
  assert.equal(validateVariant({...row,stock_qty:0}).stock_qty,0);
  assert.equal(validateVariant({...row,unit:'meter',stock_qty:1.25}).stock_qty,1.25);
});
