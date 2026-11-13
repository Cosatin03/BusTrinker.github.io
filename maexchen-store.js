import {createRoom,transition,commitment} from './maexchen-core.js?v=20261113-rules2';
export class MaexchenStore {
  constructor(db){this.db=db;}
  ref(code){return this.db.collection('maexchenRooms').doc(code);}
  async create(code,id,name){
    if(!name.trim())throw new Error('Trage deinen Namen ein.');
    return this.db.runTransaction(async tx=>{const ref=this.ref(code);if((await tx.get(ref)).exists)throw new Error('CODE_COLLISION');const r=createRoom(id,name);tx.set(ref,r);return r;});
  }
  async command(code,id,command){
    const cmd={...command};delete cmd.verified;
    const hash=cmd.type==='reveal'?await commitment(cmd.dice,cmd.nonce):null;
    return this.db.runTransaction(async tx=>{
      const ref=this.ref(code), snap=await tx.get(ref);
      if(!snap.exists)throw new Error('Dieser Raum existiert nicht.');
      const r=snap.data();
      if(cmd.type==='reveal')cmd.verified=hash===r.commitment;
      const next=transition(r,id,cmd);tx.set(ref,next);return next;
    });
  }
}
