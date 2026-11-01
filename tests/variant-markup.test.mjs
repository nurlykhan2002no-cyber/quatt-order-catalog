import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateVariantMarkup} from '../variant-editor.js';
test('markup uses each variant procurement cost and replaces previous markup',()=>{
  const rows=[{id:'a',unit:'piece',cost:2100,price:null},{id:'b',unit:'roll',cost:17600,price:24640},{id:'c',unit:'rod',cost:115.25,length_m:6,price_per_m:999},{id:'d',unit:'meter',cost:10.123456}];
  const result=calculateVariantMarkup(rows,20);assert.equal(result.changed,4);assert.equal(result.missing,0);
  assert.equal(result.rows[0].price,2520);assert.equal(result.rows[1].price,21120);assert.equal(result.rows[2].price_per_m,138.3);assert.equal(result.rows[3].price_per_m,12.148147);
  assert.deepEqual(calculateVariantMarkup(result.rows,20).rows,result.rows);
  assert.equal(rows[0].price,null);assert.equal(calculateVariantMarkup(rows,12.5).rows[0].price,2362.5);
});
test('missing costs leave prices intact and are reported; invalid percent does not change rows',()=>{
  const rows=[{unit:'piece',cost:'',price:30},{unit:'piece',price:40},{unit:'piece',cost:0,price:10}];
  const result=calculateVariantMarkup(rows,20);assert.equal(result.missing,2);assert.equal(result.changed,1);assert.equal(result.rows[0].price,30);assert.equal(result.rows[1].price,40);assert.equal(result.rows[2].price,0);
  assert.throws(()=>calculateVariantMarkup(rows,-1));assert.equal(rows[2].price,10);
});
