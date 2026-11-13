import test from 'node:test';
import assert from 'node:assert/strict';
import {VALUES,rank,label,valueOf,createRoom,transition,commitment} from '../maexchen-core.js';
import {MaexchenStore} from '../maexchen-store.js';
import {createThrow,topFace,FACES} from '../maexchen-physics.js';
import * as C from '../vendor/cannon-es/cannon-es.js';
import {MemoryFirestore} from './memory-firestore.js';
const next=(r,id,type,extra={})=>transition(r,id,{type,revision:r.revision,...extra});
function playing(){let r=createRoom('a','Anna');r=next(r,'b','join',{name:'Ben'});return next(r,'a','start');}
function claimed(value=31){let r=playing();r=next(r,'a','rolled',{commitment:'a'.repeat(64)});return next(r,'a','claim',{value});}
test('all 36 dice combinations follow Mäxchen ordering',()=>{const values=new Set();for(let a=1;a<=6;a++)for(let b=1;b<=6;b++){assert.equal(valueOf([a,b]),valueOf([b,a]));values.add(valueOf([a,b]));}assert.deepEqual([...values].sort(),[...VALUES].sort());assert.ok(rank(21)>rank(66));assert.ok(rank(11)>rank(65));assert.throws(()=>valueOf([0,7]));});
test('turn, stale revision, membership and phase guards',()=>{const r=playing();assert.throws(()=>next(r,'b','rolled',{commitment:'a'.repeat(64)}));assert.throws(()=>transition(r,'a',{type:'reset',revision:0}));assert.throws(()=>next(r,'x','start'));assert.throws(()=>next(r,'b','join',{name:'Ben'}));assert.throws(()=>next(r,'a','claim',{value:21}));});
test('truthful claim and bluff resolve, player after loser starts next',()=>{for(const [dice,loser]of [[[6,5],'b'],[[3,1],'a']]){let r=claimed(64);r=next(r,'b','challenge');r=next(r,'a','reveal',{dice,verified:true});assert.equal(r.result.loser,loser);assert.equal(r.players.find(p=>p.id===loser).penalty,1);r=next(r,loser,'next');assert.equal(r.turn,loser==='a'?'b':'a');assert.equal(r.claim,0);}});
test('Mäxchen challenge doubles penalty; accepting costs one',()=>{let r=claimed(21);assert.throws(()=>next(r,'b','accept'));const accepted=next(r,'b','concede');assert.equal(accepted.players[1].penalty,1);r=next(r,'b','challenge');r=next(r,'a','reveal',{dice:[1,2],verified:true});assert.equal(r.players[1].penalty,2);});
test('accept retains minimum and cannot announce equal or invalid value',()=>{let r=next(claimed(65),'b','accept');r=next(r,'b','rolled',{commitment:'b'.repeat(64)});assert.throws(()=>next(r,'b','claim',{value:65}));assert.throws(()=>next(r,'b','claim',{value:99}));assert.equal(next(r,'b','claim',{value:11}).claim,11);});
test('leave transfers host and safely resets active round',()=>{const r=next(claimed(),'a','leave');assert.equal(r.host,'b');assert.equal(r.phase,'lobby');assert.equal(r.claim,0);assert.equal(next(r,'b','leave').phase,'closed');});
test('transaction race accepts exactly one action, commitment rejects changed dice',async()=>{
 const db=new MemoryFirestore(),store=new MaexchenStore(db),code='ABC234';await store.create(code,'a','Anna');await store.command(code,'b',{type:'join',name:'Ben'});let r=await store.command(code,'a',{type:'start',revision:1});
 const hash=await commitment([3,1],'secret');const cmd={type:'rolled',commitment:hash,revision:r.revision};const race=await Promise.allSettled([store.command(code,'a',cmd),store.command(code,'a',cmd)]);assert.equal(race.filter(r=>r.status==='fulfilled').length,1);
 r=(await store.ref(code).get()).data();assert.equal(JSON.stringify(r).includes('secret'),false);assert.equal('dice'in r,false);
 r=await store.command(code,'a',{type:'claim',value:64,revision:r.revision});r=await store.command(code,'b',{type:'challenge',revision:r.revision});
 await assert.rejects(store.command(code,'a',{type:'reveal',dice:[6,6],nonce:'secret',verified:true,revision:r.revision}));
 r=await store.command(code,'a',{type:'reveal',dice:[3,1],nonce:'secret',revision:r.revision});assert.equal(r.result.loser,'a');
});
test('face normals match their visible values and opposite sides sum to seven',()=>{for(let i=0;i<FACES.length;i++){const f=FACES[i];const b=new C.Body();b.quaternion.setFromVectors(new C.Vec3(...f.v),new C.Vec3(0,1,0));assert.equal(topFace(b),f.n);assert.equal(f.n+FACES[i^1].n,7);}});
test('100 physical throws settle inside tray with valid upward faces',()=>{let seed=123456;const rand=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);let settled=0;for(let n=0;n<100;n++){const sim=createThrow(rand);try{let dice;for(let i=0;i<2401&&!dice;i++)dice=sim.step();assert.ok(dice);valueOf(dice);for(const b of sim.bodies){assert.ok(Math.abs(b.position.x)<5);assert.ok(Math.abs(b.position.z)<3.5);assert.ok(b.position.y>.45);}settled++;}catch(e){assert.match(e.message,/schräg|Ruhe/);}}assert.ok(settled>=95,`${settled}/100 settled`);});

test('all doubles have Pasch labels and outrank 65',()=>{
  for(let n=1;n<=6;n++){assert.equal(label(valueOf([n,n])),`${n}er-Pasch`);assert.ok(rank(valueOf([n,n]))>rank(65));}
  assert.equal(label(65),'65');assert.equal(label(21),'21 · Mäxchen');
});
test('three-player rotation follows loser, including conceded Mäxchen and wraparound',()=>{
  for(const loser of ['a','b','c']){
    let r=createRoom('a','Anna');r=next(r,'b','join',{name:'Ben'});r=next(r,'c','join',{name:'Clara'});r=next(r,'a','start');
    const index=r.players.findIndex(p=>p.id===loser), predecessor=r.players[(index+2)%3].id;
    r.turn=predecessor;r=next(r,predecessor,'rolled',{commitment:'a'.repeat(64)});r=next(r,predecessor,'claim',{value:21});
    assert.equal(r.turn,loser);r=next(r,loser,'concede');
    const old=structuredClone(r);r=next(r,'a','next');
    assert.equal(r.turn,r.players[(index+1)%3].id);assert.equal(r.claim,0);assert.equal(r.phase,'roll');
    assert.equal(r.players[index].penalty,1);assert.equal(r.result,null);
    assert.throws(()=>transition(r,'a',{type:'next',revision:old.revision}));
  }
});
test('one-pair truthfully beats a 65 claim',()=>{let r=claimed(65);r=next(r,'b','challenge');r=next(r,'a','reveal',{dice:[1,1],verified:true});assert.equal(r.result.truthful,true);assert.equal(r.result.loser,'b');});
