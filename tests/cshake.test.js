import test from "node:test";
import assert from "node:assert/strict";
import {ShakeDetector,standings} from "../cshake-core.js";

test("continuous alternating up/down strokes count without a quiet valley",()=>{
  const d=new ShakeDetector({threshold:5,minIntervalMs:60});
  for(const [t,y] of [[10,9],[80,-11],[150,12],[220,-10],[290,13]])d.sample({x:0,y,z:0,time:t});
  assert.equal(d.score,5);
});
test("constant force and same-direction samples count once",()=>{
  const d=new ShakeDetector({threshold:5});
  for(let t=10;t<500;t+=20)d.sample({x:0,y:12,z:0,time:t});
  assert.equal(d.score,1);
});
test("only Y is considered, X and Z spikes do not count",()=>{
  const d=new ShakeDetector({threshold:5});
  for(const [t,x,z] of [[10,25,0],[110,-25,0],[210,0,30]])d.sample({x,y:0,z,time:t});
  assert.equal(d.score,0);
});
test("small oscillations below threshold do not count",()=>{
  const d=new ShakeDetector({threshold:5});
  for(const [t,y] of [[10,4],[80,-4],[150,4]])d.sample({y,time:t});
  assert.equal(d.score,0);
});
test("too-fast reversals are debounced",()=>{
  const d=new ShakeDetector({threshold:5,minIntervalMs:65});
  for(const [t,y] of [[10,10],[30,-10],[100,10],[180,-10]])d.sample({y,time:t});
  assert.equal(d.score,3);
});
test("fallback gravity-inclusive Y subtracts fixed baseline",()=>{
  const d=new ShakeDetector({threshold:5,minIntervalMs:60});
  for(const [t,y] of [[10,9.8],[90,17],[170,1],[250,17]])d.sample({y,time:t,includesGravity:true});
  assert.equal(d.score,3);
});
test("duplicate and out-of-order samples ignored",()=>{
  const d=new ShakeDetector({threshold:5});
  d.sample({y:10,time:100});
  d.sample({y:-10,time:100});
  d.sample({y:-10,time:99});
  assert.equal(d.score,1);
});
test("rank ties are shared",()=>{
  assert.deepEqual(standings([{score:4},{score:4},{score:2}]).map(p=>p.rank),[1,1,3]);
});
