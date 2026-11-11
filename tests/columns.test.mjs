import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState,validState} from '../worker/model.mjs';
import {getColumns,addColumn,duplicateColumn,moveColumn,removeColumn,clearColumn,MAX_COLUMNS} from '../worker/columns.mjs';
test('legacy shows expand to named columns without changing active or live clips',()=>{
 const state=initialState(),live=structuredClone(state.live),active=state.cue.layers.map(l=>l.clip);
 assert.equal(getColumns(state).length,8);addColumn(state);assert.equal(state.columns.length,9);
 for(const layer of state.cue.layers)assert.equal(layer.slots.length,9);
 assert.deepEqual(state.cue.layers.map(l=>l.clip),active);assert.deepEqual(state.live,live);assert.equal(validState(state),true);
});
test('duplicate, move, clear and remove maintain matching slots on every layer',()=>{
 const state=initialState(),original=state.cue.layers.map(l=>l.slots[0]);duplicateColumn(state,0);
 assert.deepEqual(state.cue.layers.map(l=>l.slots[1]),original);assert.notEqual(state.columns[0].id,state.columns[1].id);
 const id=state.columns[1].id;moveColumn(state,1,1);assert.equal(state.columns[2].id,id);assert.deepEqual(state.cue.layers.map(l=>l.slots[2]),original);
 clearColumn(state,2);assert.ok(state.cue.layers.every(l=>l.slots[2]===null));removeColumn(state,2);assert.equal(state.columns.length,8);assert.equal(validState(state),true);
});
test('column limits and metadata are validated and the final column cannot be deleted',()=>{
 const state=initialState();for(let i=0;i<70;i++)addColumn(state);assert.equal(state.columns.length,MAX_COLUMNS);assert.equal(validState(state),true);
 state.columns[0].color='invalid';assert.equal(validState(state),false);state.columns[0].color='cyan';
 while(state.columns.length>1)removeColumn(state,0);removeColumn(state,0);assert.equal(state.columns.length,1);assert.equal(validState(state),true);
});
