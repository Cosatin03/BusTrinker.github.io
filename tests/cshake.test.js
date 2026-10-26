import test from "node:test";import assert from "node:assert/strict";import {ShakeDetector,standings} from "../cshake-core.js";
test("sustained acceleration scores once",()=>{const d=new ShakeDetector({threshold:5});for(let t=1;t<600;t+=20)d.sample({x:15,y:0,z:0,time:t});assert.equal(d.score,1);});
test("valleys and cooldown separate shakers",()=>{const d=new ShakeDetector({threshold:5,minIntervalMs:180});for(const [t,x] of [[1,9],[30,0],[90,-9],[130,0],[205,9]])d.sample({x,y:0,z:0,time:t});assert.equal(d.score,2);});
test("duplicate and out-of-order samples ignored",()=>{const d=new ShakeDetector({threshold:5});d.sample({x:10,y:0,z:0,time:100});d.sample({x:0,y:0,z:0,time:100});d.sample({x:8,y:0,z:0,time:99});assert.equal(d.score,1);});
test("rank ties are shared",()=>{assert.deepEqual(standings([{score:4},{score:4},{score:2}]).map(p=>p.rank),[1,1,3]);});
