import * as C from './vendor/cannon-es/cannon-es.js';
// BoxGeometry material order: +X, -X, +Y, -Y, +Z, -Z; opposite faces sum to seven.
export const FACES=[{n:1,v:[1,0,0]},{n:6,v:[-1,0,0]},{n:2,v:[0,1,0]},{n:5,v:[0,-1,0]},{n:3,v:[0,0,1]},{n:4,v:[0,0,-1]}];
export function topFace(body){
  const faces=FACES.map(f=>({n:f.n,y:body.quaternion.vmult(new C.Vec3(...f.v)).y})).sort((a,b)=>b.y-a.y);
  return faces[0].y>.985?faces[0].n:null;
}
export function createThrow(random=Math.random){
  const world=new C.World({gravity:new C.Vec3(0,-19.62,0),allowSleep:true});
  world.solver.iterations=20;
  world.defaultContactMaterial.friction=.38;world.defaultContactMaterial.restitution=.28;
  const box=(size,pos,mass=0)=>{const b=new C.Body({mass,shape:new C.Box(new C.Vec3(...size)),position:new C.Vec3(...pos)});world.addBody(b);return b;};
  box([5,.25,3.5],[0,-.25,0]);
  box([.25,3,3.5],[-5.25,3,0]);box([.25,3,3.5],[5.25,3,0]);box([5,3,.25],[0,3,-3.75]);box([5,3,.25],[0,3,3.75]);
  const bodies=[-1,1].map(x=>{
    const b=box([.48,.48,.48],[x*1.3,2.5+random(),0],1);
    b.quaternion.setFromEuler(random()*6.28,random()*6.28,random()*6.28);
    b.velocity.set((random()-.5)*7,2+random()*3,(random()-.5)*6);
    b.angularVelocity.set((random()-.5)*22,(random()-.5)*22,(random()-.5)*22);
    b.angularDamping=.2;b.linearDamping=.12;b.sleepSpeedLimit=.12;b.sleepTimeLimit=.6;return b;
  });
  let steps=0;
  return {world,bodies,step(){world.step(1/120);steps++;if(bodies.every(b=>b.sleepState===C.Body.SLEEPING)){const dice=bodies.map(topFace);if(dice.every(Boolean))return dice;throw new Error('Würfel liegt schräg. Bitte erneut würfeln.');}if(steps>2400)throw new Error('Wurf kam nicht zur Ruhe. Bitte erneut würfeln.');return null;}};
}
