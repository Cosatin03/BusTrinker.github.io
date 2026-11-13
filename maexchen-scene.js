import * as T from './vendor/three/three.module.min.js';
import {createThrow,FACES} from './maexchen-physics.js';
export class DiceScene {
  constructor(container){
    this.scene=new T.Scene();this.scene.background=new T.Color('#153c36');
    this.camera=new T.PerspectiveCamera(42,1,.1,60);this.camera.position.set(0,12,9);this.camera.lookAt(0,0,0);
    this.renderer=new T.WebGLRenderer({antialias:true});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.shadowMap.enabled=true;
    container.append(this.renderer.domElement);this.renderer.domElement.setAttribute('aria-label','3D-Würfeltisch');
    this.scene.add(new T.HemisphereLight(0xffffff,0x25332a,2.5));const light=new T.DirectionalLight(0xffead2,4);light.position.set(-3,9,5);light.castShadow=true;this.scene.add(light);
    const mat=new T.MeshStandardMaterial({color:0x24594a,roughness:1});
    const box=(w,h,d,x,y,z,color=mat)=>{const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),color);mesh.position.set(x,y,z);mesh.receiveShadow=true;this.scene.add(mesh);};
    box(10,.5,7,0,-.25,0);const wood=new T.MeshStandardMaterial({color:0x70472e});
    box(.5,.7,7.5,-5.25,.2,0,wood);box(.5,.7,7.5,5.25,.2,0,wood);box(10,.7,.5,0,.2,-3.75,wood);box(10,.7,.5,0,.2,3.75,wood);
    const materials=FACES.map(f=>{
      const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const c=canvas.getContext('2d');c.fillStyle='#fff8e5';c.fillRect(0,0,128,128);c.fillStyle='#203d36';
      const points={1:[[0,0]],2:[[-1,-1],[1,1]],3:[[-1,-1],[0,0],[1,1]],4:[[-1,-1],[1,-1],[-1,1],[1,1]],5:[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]],6:[[-1,-1],[-1,0],[-1,1],[1,-1],[1,0],[1,1]]};
      for(const [x,y] of points[f.n]){c.beginPath();c.arc(64+x*31,64+y*31,10,0,Math.PI*2);c.fill();}
      const map=new T.CanvasTexture(canvas);map.colorSpace=T.SRGBColorSpace;return new T.MeshStandardMaterial({map,roughness:.45});
    });
    this.meshes=[-1,1].map(x=>{const m=new T.Mesh(new T.BoxGeometry(.96,.96,.96),materials);m.position.set(x,.48,0);m.castShadow=true;this.scene.add(m);return m;});
    this.observer=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.render();});this.observer.observe(container);this.render();
  }
  render(){this.renderer.render(this.scene,this.camera);}
  hide(){this.meshes.forEach(m=>m.visible=false);this.render();}
  show(dice){this.meshes.forEach((m,i)=>{m.visible=true;m.position.set(i?1:-1,.48,0);const f=FACES.find(f=>f.n===dice[i]);m.quaternion.setFromUnitVectors(new T.Vector3(...f.v),new T.Vector3(0,1,0));});this.render();}
  async roll(){
    const sim=createThrow();this.meshes.forEach(m=>m.visible=true);
    return new Promise((resolve,reject)=>{
      let last=performance.now(),acc=0;
      this.renderer.setAnimationLoop(now=>{
        acc+=Math.min((now-last)/1000,.1);last=now;
        try{
          let dice;while(acc>=1/120){dice=sim.step();acc-=1/120;if(dice)break;}
          this.meshes.forEach((m,i)=>{m.position.copy(sim.bodies[i].position);m.quaternion.copy(sim.bodies[i].quaternion);});this.render();
          if(dice){this.renderer.setAnimationLoop(null);resolve(dice);}
        }catch(e){this.renderer.setAnimationLoop(null);reject(e);}
      });
    });
  }
}
