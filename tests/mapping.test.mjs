import test from 'node:test';
import assert from 'node:assert/strict';
import {createMapping,mappingIsValid} from '../worker/mapping.mjs';
import {initialState,validState} from '../worker/model.mjs';
test('mapping presets fit odd and standard processor canvases without losing edge pixels',()=>{
 for(const [w,h] of [[1920,1080],[1281,721],[240,240]])for(const preset of ['single','panels','grid','stage']){
  const mapping=createMapping(w,h,preset);assert.equal(mappingIsValid(mapping,w,h),true);
  assert.equal(mapping.slices.reduce((area,s)=>area+s.output.width*s.output.height,0),w*h);
  assert.equal(new Set(mapping.slices.map(s=>s.id)).size,mapping.slices.length);
 }
});
test('invalid slice geometry, duplicate identifiers, and excessive effect values are rejected',()=>{
 for(const change of [m=>m.slices[0].input.x=-1,m=>m.slices[0].output.width=2000,m=>m.slices[0].rotation=Infinity,m=>m.slices.push({...m.slices[0]}),m=>m.slices=[],m=>m.slices=[null]]){
  const m=createMapping(1920,1080);change(m);assert.equal(mappingIsValid(m,1920,1080),false);
 }
 const state=initialState();state.cue.mapping=createMapping(1920,1080,'stage');assert.equal(validState(state),true);
 state.cue.layers[0].brightness=10;assert.equal(validState(state),false);
});
test('older saved shows remain valid and mapping is independently staged',()=>{
 const state=initialState();assert.equal(validState(state),true);
 state.cue.mapping=createMapping(1920,1080,'stage');state.cue.layers[0].blend='screen';state.cue.layers[0].saturation=0;assert.equal(validState(state),true);
 assert.equal(state.live.mapping,undefined);assert.equal(state.live.layers[0].saturation,undefined);
});
