import test from "node:test";
import assert from "node:assert/strict";
import { ShakeDetector, standings } from "../cshake-core.js";

function feed(detector, samples, more={}) {
  return samples.map(([time,y])=>detector.sample({time,y,...more}));
}
test("one up and one down count exactly one point",()=>{
  const d=new ShakeDetector({threshold:5,minIntervalMs:60});
  assert.deepEqual(feed(d,[[10,9],[80,-11]]),[false,true]);
  assert.equal(d.score,1);
});
test("continuous fast up/down yields one point per pair, not per direction",()=>{
  const d=new ShakeDetector({threshold:5,minIntervalMs:60});
  assert.deepEqual(feed(d,[[10,9],[80,-11],[150,12],[220,-10],[290,13],[360,-12]]),[false,true,false,true,false,true]);
  assert.equal(d.score,3);
});
test("an unfinished half-cycle never adds a point",()=>{
  const d=new ShakeDetector({threshold:5,minIntervalMs:60});
  feed(d,[[10,9],[80,-11],[150,12]]);
  assert.equal(d.score,1);
});
test("starting downward also requires the return direction",()=>{
  const d=new ShakeDetector({threshold:5,minIntervalMs:60});
  assert.deepEqual(feed(d,[[10,-10],[80,11]]),[false,true]);
});
test("constant force and same direction samples do not add points",()=>{
  const d=new ShakeDetector({threshold:5});
  for(let t=10;t<500;t+=20)d.sample({x:0,y:12,z:0,time:t});
  assert.equal(d.score,0);
});
test("only Y is considered, X and Z spikes do not count",()=>{
  const d=new ShakeDetector({threshold:5});
  for(const [t,x,z] of [[10,25,0],[110,-25,0],[210,0,30]])d.sample({x,y:0,z,time:t});
  assert.equal(d.score,0);
});
test("small oscillations below threshold do not count",()=>{
  const d=new ShakeDetector({threshold:5});
  feed(d,[[10,4],[80,-4],[150,4]]);
  assert.equal(d.score,0);
});
test("too-fast reversals are ignored but later valid reversal counts",()=>{
  const d=new ShakeDetector({threshold:5,minIntervalMs:65});
  assert.deepEqual(feed(d,[[10,10],[30,-10],[100,-10],[180,10],[260,-10]]),[false,false,true,false,true]);
  assert.equal(d.score,2);
});
test("gravity fallback uses initial baseline and counts full cycles",()=>{
  const d=new ShakeDetector({threshold:5,minIntervalMs:60});
  assert.deepEqual(feed(d,[[10,9.8],[90,17],[170,1],[250,17],[330,1]],{includesGravity:true}),[false,false,true,false,true]);
  assert.equal(d.score,2);
});
test("sensor gap drops an incomplete half-cycle",()=>{
  const d=new ShakeDetector({threshold:5,minIntervalMs:60,maxGapMs:500});
  feed(d,[[10,10],[800,-10],[880,10]]);
  assert.equal(d.score,1);
});
test("duplicate and out-of-order samples ignored",()=>{
  const d=new ShakeDetector({threshold:5});
  feed(d,[[100,10],[100,-10],[99,-10]]);
  assert.equal(d.score,0);
});
test("rank ties are shared",()=>{
  assert.deepEqual(standings([{score:4},{score:4},{score:2}]).map(p=>p.rank),[1,1,3]);
});
