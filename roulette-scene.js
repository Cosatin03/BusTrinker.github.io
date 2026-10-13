import * as THREE from "./vendor/three/three.module.min.js";
import { WHEEL, color } from "./roulette-core.js";
import { roulettePose, restingAngle } from "./roulette-motion.js";
const TAU = Math.PI * 2,
  STEP = TAU / 37;
const palette = { red: 0xa52c39, black: 0x18272b, green: 0x08785d };
export function createRouletteScene(host, onFailure, onMotion = () => {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute(
    "aria-label",
    "Dreidimensionales Roulette-Rad mit Kugel und Jetons",
  );
  renderer.domElement.setAttribute("role", "img");
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 60);
  camera.position.set(0, 8.4, 8.2);
  camera.lookAt(0, 0, 0.25);
  scene.add(new THREE.HemisphereLight(0xe1efff, 0x273921, 2));
  const light = new THREE.DirectionalLight(0xffdfae, 3.5);
  light.position.set(-3, 7, 4);
  scene.add(light);
  const rimLight = new THREE.DirectionalLight(0xa8d7ff, 1.8);
  rimLight.position.set(4, 3, -4);
  scene.add(rimLight);
  const gold = new THREE.MeshStandardMaterial({
    color: 0xd6ad60,
    metalness: 0.8,
    roughness: 0.25,
  });
  const wood = new THREE.MeshStandardMaterial({
    color: 0x382020,
    metalness: 0.15,
    roughness: 0.3,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x111e1c,
    roughness: 0.5,
  });
  const ivory = new THREE.MeshStandardMaterial({
    color: 0xfff5d8,
    roughness: 0.18,
    metalness: 0.12,
  });
  function mesh(geometry, material, parent = scene, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  }
  function ring(radius, tube, y, parent = scene, material = gold) {
    const m = mesh(
      new THREE.TorusGeometry(radius, tube, 12, 128),
      material,
      parent,
      0,
      y,
    );
    m.rotation.x = -Math.PI / 2;
    return m;
  }
  mesh(new THREE.CylinderGeometry(2.9, 2.75, 0.38, 96), wood, scene, 0, -0.17);
  mesh(new THREE.CylinderGeometry(2.67, 2.67, 0.06, 96), dark, scene, 0, 0.06);
  ring(2.86, 0.08, 0.08);
  ring(2.67, 0.04, 0.13);
  ring(2.42, 0.06, 0.11);
  const rotor = new THREE.Group();
  scene.add(rotor);
  mesh(new THREE.CylinderGeometry(1.7, 1.85, 0.2, 96), wood, rotor, 0, 0.11);
  ring(1.69, 0.04, 0.22, rotor);
  ring(2.27, 0.035, 0.17, rotor);
  const textures = [],
    pockets = [];
  WHEEL.forEach((number, i) => {
    const angle = -i * STEP;
    const material = new THREE.MeshStandardMaterial({
      color: palette[color(number)],
      roughness: 0.55,
    });
    pockets.push(material);
    const sector = mesh(
      new THREE.RingGeometry(1.73, 2.25, 8, 1, angle - STEP / 2, STEP),
      material,
      rotor,
      0,
      0.18,
    );
    sector.rotation.x = -Math.PI / 2;
    const divider = mesh(
      new THREE.BoxGeometry(0.52, 0.075, 0.016),
      gold,
      rotor,
      1.99 * Math.cos(angle - STEP / 2),
      0.2,
      -1.99 * Math.sin(angle - STEP / 2),
    );
    divider.rotation.y = angle - STEP / 2;
    const canvas = document.createElement("canvas");
    canvas.width = 96;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff6de";
    ctx.font = "bold 52px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(number), 48, 48);
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    textures.push(map);
    const label = mesh(
      new THREE.PlaneGeometry(0.29, 0.29),
      new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        depthWrite: false,
      }),
      rotor,
      2.08 * Math.cos(angle),
      0.231,
      -2.08 * Math.sin(angle),
    );
    label.rotation.set(-Math.PI / 2, 0, angle - Math.PI / 2);
  });
  mesh(new THREE.ConeGeometry(1.55, 0.36, 96), wood, rotor, 0, 0.29);
  ring(0.53, 0.035, 0.46, rotor);
  mesh(new THREE.CylinderGeometry(0.13, 0.22, 0.5, 32), gold, rotor, 0, 0.61);
  mesh(new THREE.SphereGeometry(0.21, 24, 16), gold, rotor, 0, 0.91);
  const arm = mesh(
    new THREE.BoxGeometry(1.15, 0.06, 0.075),
    gold,
    rotor,
    0,
    0.77,
  );
  const arm2 = arm.clone();
  arm2.rotation.y = Math.PI / 2;
  rotor.add(arm2);
  const ball = mesh(
    new THREE.SphereGeometry(0.075, 24, 16),
    ivory,
    scene,
    0,
    0.29,
    1.84,
  );
  const felt = new THREE.MeshStandardMaterial({
    color: 0x0b322e,
    roughness: 1,
  });
  mesh(new THREE.CylinderGeometry(3.8, 3.8, 0.1, 96), felt, scene, 0, -0.44);
  const chips = new THREE.Group();
  scene.add(chips);
  const chipGeometry = new THREE.CylinderGeometry(0.25, 0.25, 0.095, 32);
  const chipMats = [0xba4559, 0x3f9e9b, 0xdcc390, 0x8d79bd].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.35 }),
  );
  const stripeGeometry = new THREE.BoxGeometry(0.085, 0.07, 0.05);
  function setChips(count = 4) {
    chips.clear();
    for (let stack = 0; stack < 4; stack++)
      for (
        let level = 0;
        level < Math.min(7, 1 + Math.floor((count + stack) / 3));
        level++
      ) {
        const chip = new THREE.Group();
        chip.position.set(
          -1.15 + stack * 0.73,
          -0.32 + level * 0.105,
          3.08 + (stack % 2) * 0.13,
        );
        mesh(chipGeometry, chipMats[stack], chip);
        for (let k = 0; k < 8; k++) {
          const a = (k * TAU) / 8;
          const stripe = mesh(
            stripeGeometry,
            ivory,
            chip,
            0.231 * Math.cos(a),
            0,
            0.231 * Math.sin(a),
          );
          stripe.rotation.y = -a;
        }
        chips.add(chip);
      }
  }
  setChips();
  let state = null,
    raf = 0,
    lost = false;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  function render() {
    cancelAnimationFrame(raf);
    if (lost || document.hidden) return;
    const spinning = state?.phase === "spinning";
    const previous = state?.history?.[state.phase === "result" ? 1 : 0] ?? 0;
    const outcome = state?.outcome ?? state?.history?.[0] ?? 0;
    const elapsed = state ? Date.now() - state.startedAt : 0;
    const moving = spinning && !reduced.matches;
    const pose = moving
      ? roulettePose(outcome, elapsed, state.settings.duration, previous)
      : {
          wheelAngle: restingAngle(outcome),
          ballAngle: -Math.PI / 2,
          radius: 1.85,
          height: 0.29,
          progress: 1,
        };
    rotor.rotation.y = pose.wheelAngle;
    ball.position.set(
      Math.cos(pose.ballAngle) * pose.radius,
      pose.height,
      -Math.sin(pose.ballAngle) * pose.radius,
    );
    ball.rotation.x = pose.ballAngle * 12;
    renderer.domElement.dataset.wheelAngle = String(pose.wheelAngle);
    renderer.domElement.dataset.ballAngle = String(pose.ballAngle);
    renderer.domElement.dataset.progress = String(pose.progress);
    pockets.forEach((material, i) => {
      material.emissive.setHex(
        state?.phase === "result" && WHEEL[i] === outcome ? 0x8e641c : 0x000000,
      );
      material.emissiveIntensity = 0.7;
    });
    if (moving) onMotion(pose.stage);
    renderer.render(scene, camera);
    if (moving && pose.progress < 1) raf = requestAnimationFrame(render);
  }
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const wake = () => render();
  document.addEventListener("visibilitychange", wake);
  const contextLost = (e) => {
    e.preventDefault();
    lost = true;
    cancelAnimationFrame(raf);
    onFailure();
  };
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  return {
    update(next) {
      state = next;
      setChips(next?.bets.length ?? 4);
      resize();
    },
    dispose() {
      observer.disconnect();
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", wake);
      renderer.domElement.removeEventListener("webglcontextlost", contextLost);
      const geometries = new Set(),
        materials = new Set();
      scene.traverse((o) => {
        if (o.geometry) geometries.add(o.geometry);
        if (o.material) materials.add(o.material);
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
