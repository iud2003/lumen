import test from 'node:test';
import assert from 'node:assert/strict';
import {testCardLayout,aspectLabel} from '../src/testCardLayout.mjs';
test('test card geometry fits standard, wide, portrait and small canvases',()=>{
 for(const [w,h] of [[1920,1080],[1728,432],[3840,2160],[1080,1920],[240,240],[7680,240]]){
  const layout=testCardLayout(w,h);for(const r of [layout.panel,layout.chroma,layout.luma]){
   assert.ok(r.x>=0&&r.y>=0);assert.ok(r.x+r.width<=w&&r.y+r.height<=h);assert.ok(r.width>0&&r.height>0);
  }
  assert.ok(layout.cx-layout.radius>=0&&layout.cx+layout.radius<=w);
  assert.ok(layout.cy-layout.radius>=0&&layout.cy+layout.radius<=h);
 }
});
test('aspect readout is generated from the actual canvas dimensions',()=>{
 assert.equal(aspectLabel(1920,1080),'16:9');assert.equal(aspectLabel(1728,432),'4:1');assert.equal(aspectLabel(1080,1920),'9:16');assert.equal(aspectLabel(1281,721),'183:103');
});
