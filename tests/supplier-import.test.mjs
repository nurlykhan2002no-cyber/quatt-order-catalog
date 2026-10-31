import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildImportPlan} from '../admin-data.js';
const supplier={name:'Металлсервис',address:'Тестовый адрес',contact:'Тестовый контакт'};
const row={Название:'Круг',Цена:140,Закуп:100,Поставщик:'  МЕТАЛЛСЕРВИС  '};
const build=(rows,products=[],suppliers=[supplier])=>buildImportPlan(rows,products,'2026-11-01',{suppliers});
test('ordinary and grouped Excel imports fill supplier details before applying',()=>{
  for(const source of [row,{'Группа вариантов':'Круг','Размер / Ду, мм':12,'Длина, м':'6/12',Цена:140,Закуп:100,Поставщик:supplier.name}]){
    const result=build([source])[0];assert.equal(result.kind,'new');
    assert.equal(result.payload.supplier_address,supplier.address);assert.equal(result.payload.supplier_contact,supplier.contact);
    assert.deepEqual(result.supplierAutofilled,['адрес','контакт']);
  }
});
test('Excel details and existing details for the same supplier are preserved',()=>{
  const target={id:'p',name:'Круг',price:140,cost:100,supplier:supplier.name,supplier_address:'Свой адрес',supplier_contact:'Свой контакт'};
  const unchanged=build([row],[target])[0];assert.equal(unchanged.payload.supplier_address,undefined);assert.equal(unchanged.payload.supplier_contact,undefined);
  const explicit=build([{...row,'Адрес поставщика':'Адрес из Excel'}])[0];assert.equal(explicit.payload.supplier_address,'Адрес из Excel');assert.equal(explicit.payload.supplier_contact,supplier.contact);
  const changed=build([row],[{...target,supplier:'Другой'}])[0];assert.equal(changed.payload.supplier_contact,supplier.contact);assert.equal(target.supplier_contact,'Свой контакт');
});
test('legacy supplier details fill only when unambiguous; unknown names stay blank',()=>{
  const legacy={id:'old',name:'Другой товар',supplier:supplier.name,supplier_address:'Адрес',supplier_contact:'Контакт'};
  assert.equal(build([row],[legacy],[])[0].payload.supplier_address,'Адрес');
  const ambiguous=build([row],[legacy,{...legacy,id:'other',supplier_contact:'Другой контакт'}],[])[0];
  assert.equal(ambiguous.payload.supplier_address,'Адрес');assert.equal(ambiguous.payload.supplier_contact,undefined);
  assert.equal(build([{...row,Поставщик:'Новый поставщик'}])[0].payload.supplier_address,undefined);
});
