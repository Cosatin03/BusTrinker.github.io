import * as THREE from "./vendor/three/three.module.min.js";
import { CATEGORIES, fieldPosition } from "./ladders-core.js";
export const COLORS = [
  "#dafa7a",
  "#ecc2a8",
  "#a8c9ec",
  "#dcacd7",
  "#f5b75a",
  "#7edac5",
  "#f58f9c",
  "#c6b2ff",
];
export function createBoard(host, state, selectField, failed) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.append(renderer.domElement);
  renderer.domElement.setAttribute("role", "img");
  renderer.domElement.setAttribute(
    "aria-label",
    "3D-Spielbrett mit Rutschen, Leitern und nummerierten Spielfiguren. Alle Felder sind auch in der Feldübersicht erreichbar.",
  );
  const scene = new THREE.Scene(),
    camera = new THREE.OrthographicCamera();
  const cols = Math.ceil(Math.sqrt(state.settings.size)),
    rows = Math.ceil(state.settings.size / cols);
  camera.position.set(0, 18, 12);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0xfffbe9, 0x264f43, 2.6));
  const light = new THREE.DirectionalLight(0xffffff, 2.7);
  light.position.set(-5, 12, 8);
  scene.add(light);
  const root = new THREE.Group();
  scene.add(root);
  const textures = [],
    clickable = [],
    tokens = [];
  let stopped = false,
    raf = 0,
    animation = null,
    resolveAnimation;
  const mat = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.45, ...extra });
  const mesh = (geometry, material, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    parent.add(m);
    return m;
  };
  function textTexture(text, bg, fg, small = "") {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = fg;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 105px system-ui";
    ctx.fillText(text, 128, small ? 105 : 128);
    if (small) {
      ctx.font = "bold 30px system-ui";
      ctx.fillText(small, 128, 202);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.push(texture);
    return texture;
  }
  mesh(
    new THREE.BoxGeometry(cols + 0.65, 0.36, rows + 0.65),
    mat("#9d8351", { metalness: 0.4 }),
    root,
    0,
    -0.25,
    0,
  );
  mesh(
    new THREE.BoxGeometry(cols + 0.42, 0.15, rows + 0.42),
    mat("#183a30"),
    root,
    0,
    -0.03,
    0,
  );
  for (let n = 1; n <= state.settings.size; n++) {
    const p = fieldPosition(n, state.settings.size),
      c = CATEGORIES[state.fields[n - 1]],
      link = state.links.find((l) => l.from === n);
    const tile = mesh(
      new THREE.BoxGeometry(0.92, 0.12, 0.92),
      mat(c.color),
      root,
      p.x,
      0.1,
      p.z,
    );
    tile.userData.field = n;
    clickable.push(tile);
    const label = mesh(
      new THREE.PlaneGeometry(0.89, 0.89),
      new THREE.MeshBasicMaterial({
        map: textTexture(
          String(n),
          c.color,
          "#19362e",
          n === state.settings.size
            ? "ZIEL"
            : link
              ? `${link.type === "ladder" ? "↑" : "↓"} ${link.to}`
              : state.settings.fields[n]
                ? "EIGEN"
                : c.icon,
        ),
      }),
      root,
      p.x,
      0.166,
      p.z,
    );
    label.rotation.x = -Math.PI / 2;
    label.userData.field = n;
    clickable.push(label);
  }
  function rod(a, b, r, material, parent = root) {
    const delta = new THREE.Vector3().subVectors(b, a);
    const m = mesh(
      new THREE.CylinderGeometry(r, r, delta.length(), 8),
      material,
      parent,
    );
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      delta.normalize(),
    );
    return m;
  }
  function linkPoint(link, t) {
    const a = fieldPosition(link.from, state.settings.size),
      b = fieldPosition(link.to, state.settings.size);
    return new THREE.Vector3(
      a.x + (b.x - a.x) * t,
      0.27 + Math.sin(Math.PI * t) * (link.type === "slide" ? 0.45 : 0.2),
      a.z + (b.z - a.z) * t,
    );
  }
  for (const link of state.links) {
    const a = linkPoint(link, 0),
      b = linkPoint(link, 1),
      delta = b.clone().sub(a),
      side = new THREE.Vector3(-delta.z, 0, delta.x)
        .normalize()
        .multiplyScalar(0.15);
    if (link.type === "ladder") {
      const gold = mat("#f5db82", { metalness: 0.55 });
      rod(a.clone().add(side), b.clone().add(side), 0.035, gold);
      rod(a.clone().sub(side), b.clone().sub(side), 0.035, gold);
      const steps = Math.max(3, Math.ceil(delta.length() * 3));
      for (let i = 0; i <= steps; i++) {
        const c = a.clone().lerp(b, i / steps);
        rod(c.clone().add(side), c.clone().sub(side), 0.025, gold);
      }
    } else {
      const curve = new THREE.CatmullRomCurve3(
        Array.from({ length: 25 }, (_, i) => linkPoint(link, i / 24)),
      );
      mesh(
        new THREE.TubeGeometry(curve, 32, 0.1, 10, false),
        mat("#f19485", { metalness: 0.15 }),
        root,
      );
      for (const sign of [-1, 1]) {
        const rail = new THREE.CatmullRomCurve3(
          Array.from({ length: 25 }, (_, i) =>
            linkPoint(link, i / 24)
              .add(side.clone().multiplyScalar(sign))
              .add(new THREE.Vector3(0, 0.08, 0)),
          ),
        );
        mesh(
          new THREE.TubeGeometry(rail, 32, 0.022, 6, false),
          mat("#f9cab0"),
          root,
        );
      }
    }
  }
  state.players.forEach((p, i) => {
    const group = new THREE.Group();
    root.add(group);
    const color = COLORS[i % COLORS.length],
      material = mat(color, { metalness: 0.3 });
    mesh(
      new THREE.CylinderGeometry(0.15, 0.21, 0.13, 20),
      material,
      group,
      0,
      0.08,
      0,
    );
    mesh(new THREE.ConeGeometry(0.14, 0.33, 20), material, group, 0, 0.27, 0);
    mesh(new THREE.SphereGeometry(0.12, 16, 12), material, group, 0, 0.48, 0);
    const badge = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: textTexture(String(i + 1), "#19362e", color),
      }),
    );
    badge.scale.set(0.27, 0.27, 1);
    badge.position.y = 0.73;
    group.add(badge);
    tokens.push(group);
  });
  // Three's box material order: +X, -X, +Y, -Y, +Z, -Z.
  function dieTexture(value) {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    x.fillStyle = "#fff4d6";
    x.fillRect(0, 0, 128, 128);
    x.fillStyle = "#19362e";
    const patterns = {
      1: [[0, 0]],
      2: [
        [-1, -1],
        [1, 1],
      ],
      3: [
        [-1, -1],
        [0, 0],
        [1, 1],
      ],
      4: [
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ],
      5: [
        [-1, -1],
        [1, -1],
        [0, 0],
        [-1, 1],
        [1, 1],
      ],
      6: [
        [-1, -1],
        [1, -1],
        [-1, 0],
        [1, 0],
        [-1, 1],
        [1, 1],
      ],
    };
    for (const [a, b] of patterns[value]) {
      x.beginPath();
      x.arc(64 + a * 34, 64 + b * 34, 10, 0, Math.PI * 2);
      x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    textures.push(t);
    return t;
  }
  const die = mesh(
    new THREE.BoxGeometry(0.68, 0.68, 0.68),
    [3, 4, 1, 6, 2, 5].map(
      (n) =>
        new THREE.MeshStandardMaterial({ map: dieTexture(n), roughness: 0.28 }),
    ),
    root,
    cols / 2 - 0.3,
    0.5,
    rows / 2 + 0.8,
  );
  const faceRotations = {
    1: [0, 0, 0],
    2: [-Math.PI / 2, 0, 0],
    3: [0, 0, Math.PI / 2],
    4: [0, 0, -Math.PI / 2],
    5: [Math.PI / 2, 0, 0],
    6: [Math.PI, 0, 0],
  };
  function setDie(n) {
    die.rotation.set(...faceRotations[n || 1]);
  }
  function offset(i, position, players) {
    const at = players
        .map((p, j) => (p.position === position ? j : -1))
        .filter((j) => j >= 0),
      rank = at.indexOf(i);
    if (at.length < 2) return [0, 0];
    const angle = (rank * Math.PI * 2) / at.length;
    return [Math.cos(angle) * 0.26, Math.sin(angle) * 0.26];
  }
  function place(s) {
    s.players.forEach((p, i) => {
      const point = fieldPosition(p.position, s.settings.size),
        o = offset(i, p.position, s.players);
      tokens[i].position.set(point.x + o[0], 0.2, point.z + o[1]);
    });
    setDie(s.move?.die);
  }
  function render() {
    if (!stopped) renderer.render(scene, camera);
  }
  function resize() {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    const aspect = w / h,
      vertical = Math.max(rows * 0.92 + 3, (cols + 2.4) / aspect);
    camera.left = (-vertical * aspect) / 2;
    camera.right = (vertical * aspect) / 2;
    camera.top = vertical / 2;
    camera.bottom = -vertical / 2;
    camera.near = 0.1;
    camera.far = 100;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  function stopAnimation() {
    cancelAnimationFrame(raf);
    animation = null;
    resolveAnimation?.();
    resolveAnimation = null;
  }
  function animate(move, s, reduced) {
    stopAnimation();
    if (reduced) {
      place(s);
      render();
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      resolveAnimation = resolve;
      const speed = s.settings.speed,
        rollDuration = 900 / speed,
        stepDuration = 180 / speed,
        linkDuration = 1000 / speed;
      const path = [move.from, ...move.path];
      const started = performance.now(),
        finalRot = faceRotations[move.die];
      animation = true;
      function frame(now) {
        if (stopped || !animation) return;
        const elapsed = now - started;
        if (elapsed < rollDuration) {
          const t = elapsed / rollDuration,
            e = 1 - Math.pow(1 - t, 3);
          die.rotation.set(
            finalRot[0] + Math.PI * 6 * e,
            finalRot[1] + Math.PI * 4 * e,
            finalRot[2] + Math.PI * 6 * e,
          );
          die.position.y = 0.5 + Math.sin(t * Math.PI) * 1.1;
        } else {
          setDie(move.die);
          die.position.y = 0.5;
          const travel = elapsed - rollDuration,
            walk = (path.length - 1) * stepDuration;
          if (travel < walk) {
            const k = Math.floor(travel / stepDuration),
              t = (travel % stepDuration) / stepDuration,
              a = fieldPosition(path[k], s.settings.size),
              b = fieldPosition(path[k + 1], s.settings.size);
            tokens[move.player].position.set(
              a.x + (b.x - a.x) * t,
              0.2 + Math.sin(t * Math.PI) * 0.35,
              a.z + (b.z - a.z) * t,
            );
          } else if (move.link && travel < walk + linkDuration) {
            const t = (travel - walk) / linkDuration,
              e = t * t * (3 - 2 * t),
              p = linkPoint(move.link, e);
            tokens[move.player].position.copy(p);
          } else {
            place(s);
            render();
            animation = null;
            resolveAnimation = null;
            resolve();
            return;
          }
        }
        render();
        raf = requestAnimationFrame(frame);
      }
      raf = requestAnimationFrame(frame);
    });
  }
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2();
  function click(e) {
    if (animation) return;
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(clickable)[0];
    if (hit) selectField(hit.object.userData.field);
  }
  renderer.domElement.addEventListener("click", click);
  renderer.domElement.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    stopAnimation();
    failed();
  });
  place(state);
  resize();
  return {
    id: state.id,
    animate,
    sync(s) {
      stopAnimation();
      place(s);
      render();
    },
    dispose() {
      stopped = true;
      stopAnimation();
      observer.disconnect();
      root.traverse((o) => {
        o.geometry?.dispose();
        if (o.material)
          for (const m of Array.isArray(o.material) ? o.material : [o.material])
            m.dispose();
      });
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
