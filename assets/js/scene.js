/* Fixed, scroll-choreographed 3D architectural scene (procedural — no photography rights needed). */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createEmblem } from './logo3d.js';

const NAVY_BG = 0x050d1a;
const GOLD = 0xc9a259;

function rng(seed) { // deterministic so the skyline is identical on every visit
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  const cols = 8, rows = 32, cw = c.width / cols, rh = c.height / rows;
  const r = rng(7);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x === 0 && y === 0) continue; // keep (0,0) dark: used for roofs
      const v = r();
      let col;
      if (v > 0.9) col = `rgba(255, ${200 + r() * 40 | 0}, ${130 + r() * 50 | 0}, ${0.65 + r() * 0.35})`;
      else if (v > 0.8) col = `rgba(255, 220, 170, ${0.18 + r() * 0.15})`;
      else col = `rgba(90, 130, 190, ${0.03 + r() * 0.05})`;
      g.fillStyle = col;
      g.fillRect(x * cw + cw * 0.18, y * rh + rh * 0.22, cw * 0.64, rh * 0.56);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function boxEdges(out, x, z, w, h, d) {
  const hw = w / 2, hd = d / 2;
  const c = [[-hw, 0, -hd], [hw, 0, -hd], [hw, 0, hd], [-hw, 0, hd]].map(([a, , b]) => [x + a, z + b]);
  for (let i = 0; i < 4; i++) {
    const [ax, az] = c[i], [bx, bz] = c[(i + 1) % 4];
    out.push(ax, h, az, bx, h, bz);       // roof outline
    out.push(ax, 0, az, ax, h, az);       // vertical corners
  }
}

export async function initCityScene(canvas, { reduceMotion = false } = {}) {
  const isMobile = window.matchMedia('(max-width: 768px)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, powerPreference: 'high-performance' });
  let pixelRatio = Math.min(window.devicePixelRatio, isMobile ? 1.25 : 1.6);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(NAVY_BG, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(NAVY_BG, isMobile ? 0.02 : 0.016);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(isMobile ? 62 : 48, 1, 0.1, 400);

  /* ---------- Lights ---------- */
  scene.add(new THREE.HemisphereLight(0x29446e, 0x05080f, 0.6));
  const moon = new THREE.DirectionalLight(0x9db8e8, 0.9); moon.position.set(-30, 60, -20); scene.add(moon);
  const warm = new THREE.PointLight(0xffc77a, 140, 60, 1.6); warm.position.set(0, 36, 0); scene.add(warm);
  const street = new THREE.PointLight(0xd8a861, 60, 40, 1.8); street.position.set(4, 2, 6); scene.add(street);

  /* ---------- Ground ---------- */
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(400, 400),
    new THREE.MeshStandardMaterial({ color: 0x060e1b, metalness: 0.85, roughness: 0.42, envMapIntensity: 0.25 }),
  );
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const grid = new THREE.GridHelper(240, 75, GOLD, GOLD);
  grid.material.transparent = true; grid.material.opacity = 0.07; grid.material.depthWrite = false;
  grid.position.y = 0.01; scene.add(grid);

  /* ---------- Camera paths (defined early so the city can keep them clear) ---------- */
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const posPath = new THREE.CatmullRomCurve3([V(9, 2.6, 22), V(-17, 9, 15), V(-7.5, 35, 9.5), V(26, 24, -18), V(36, 54, 34), V(7, 36, 13)], false, 'centripetal');
  const tgtPath = new THREE.CatmullRomCurve3([V(0, 13, 0), V(0, 16, 0), V(0, 33.5, 0), V(0, 9, 0), V(0, 0, 0), V(0, 34, 0)], false, 'centripetal');
  if (isMobile) posPath.points.forEach((pt) => pt.multiplyScalar(1.12));
  const pathSamples = posPath.getSpacedPoints(160);
  const blocksCamera = (x, z, h) => pathSamples.some((s) => s.y < h + 4 && Math.hypot(s.x - x, s.z - z) < 5.5);

  /* ---------- City (instanced) ---------- */
  const r = rng(42);
  const range = isMobile ? 26 : 42, step = 3.4;
  const towers = [];
  for (let x = -range; x <= range; x += step) {
    for (let z = -range; z <= range; z += step) {
      const jx = x + (r() - 0.5) * 0.6, jz = z + (r() - 0.5) * 0.6;
      const dist = Math.hypot(jx, jz);
      if (dist < 6.5 || r() < 0.12) continue; // plaza around landmark + breathing room
      const fall = Math.max(0.15, 1 - dist / (range * 1.15));
      const h = (2 + Math.pow(r(), 2.2) * 24) * fall + 1.5;
      const w = 1.5 + r() * 1.2, d = 1.5 + r() * 1.2;
      if (blocksCamera(jx, jz, h)) continue;
      towers.push({ x: jx, z: jz, w, d, h });
    }
  }

  const winTex = windowTexture();
  const towerMat = new THREE.MeshStandardMaterial({
    color: 0x1a2c47, metalness: 0.6, roughness: 0.42, envMapIntensity: 0.5,
    emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.95,
  });
  towerMat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>
      #if defined(USE_INSTANCING) && defined(USE_EMISSIVEMAP)
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vec2 s = abs(normal.x) > 0.5 ? vec2(sc.z, sc.y) : (abs(normal.z) > 0.5 ? vec2(sc.x, sc.y) : vec2(0.0));
        vec2 off = abs(normal.y) > 0.5 ? vec2(0.0) : vec2(floor(instanceMatrix[3].x * 1.7) * 0.125, floor(instanceMatrix[3].z * 2.3) * 0.0625);
        vEmissiveMapUv = vEmissiveMapUv * s * vec2(0.55, 0.19) + off;
      #endif`);
  };
  const boxGeo = new THREE.BoxGeometry(1, 1, 1); boxGeo.translate(0, 0.5, 0);
  const city = new THREE.InstancedMesh(boxGeo, towerMat, towers.length);
  const m4 = new THREE.Matrix4();
  towers.forEach((t, i) => {
    m4.makeScale(t.w, t.h, t.d); m4.setPosition(t.x, 0, t.z);
    city.setMatrixAt(i, m4);
  });
  city.instanceMatrix.needsUpdate = true;
  scene.add(city);

  // Gold architectural edges on the tallest towers
  const edgePos = [];
  [...towers].sort((a, b) => b.h - a.h).slice(0, isMobile ? 18 : 40).forEach((t) => boxEdges(edgePos, t.x, t.z, t.w, t.h, t.d));
  const edgeGeo = new THREE.BufferGeometry();
  edgeGeo.setAttribute('position', new THREE.Float32BufferAttribute(edgePos, 3));
  const edges = new THREE.LineSegments(edgeGeo, new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.45 }));
  scene.add(edges);

  /* ---------- Landmark: twisted glass tower ---------- */
  const H = 30, twist = Math.PI * 0.55;
  let tGeo = new THREE.CylinderGeometry(1.7, 2.6, H, 4, 48, false);
  tGeo.rotateY(Math.PI / 4);
  tGeo.translate(0, H / 2, 0);
  const p = tGeo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = (v.y / H) * twist, cs = Math.cos(a), sn = Math.sin(a);
    p.setXYZ(i, v.x * cs - v.z * sn, v.y, v.x * sn + v.z * cs);
  }
  tGeo = tGeo.toNonIndexed(); tGeo.computeVertexNormals();
  const landmark = new THREE.Mesh(tGeo, new THREE.MeshPhysicalMaterial({
    color: 0x0f2747, metalness: 0.95, roughness: 0.12, envMapIntensity: 1.1, clearcoat: 1, clearcoatRoughness: 0.08,
  }));
  scene.add(landmark);

  // Gold corner ribs + floor lines following the twist
  const rib = [];
  const corner = (k, y) => {
    const t = y / H, rad = 2.6 + (1.7 - 2.6) * t, a = (Math.PI / 4) + k * Math.PI / 2 + t * twist;
    return [Math.cos(a) * rad * 1.003, y, Math.sin(a) * rad * 1.003];
  };
  for (let k = 0; k < 4; k++) {
    for (let y = 0; y < H; y += 0.5) rib.push(...corner(k, y), ...corner(k, Math.min(H, y + 0.5)));
  }
  for (let y = 1.2; y <= H; y += 1.2) {
    for (let k = 0; k < 4; k++) rib.push(...corner(k, y), ...corner((k + 1) % 4, y));
  }
  const ribGeo = new THREE.BufferGeometry();
  ribGeo.setAttribute('position', new THREE.Float32BufferAttribute(rib, 3));
  const ribs = new THREE.LineSegments(ribGeo, new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.55 }));
  // floor lines a bit softer
  scene.add(ribs);

  // Plaza ring
  const ring = new THREE.Mesh(new THREE.RingGeometry(5.2, 5.28, 96), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; scene.add(ring);
  const ring2 = ring.clone(); ring2.scale.setScalar(1.35); ring2.material = ring.material.clone(); ring2.material.opacity = 0.22; scene.add(ring2);

  /* ---------- Crown: the Texas star ---------- */
  const crown = createEmblem({
    gold: new THREE.MeshPhysicalMaterial({ color: GOLD, metalness: 1, roughness: 0.22, emissive: 0x6b4a12, emissiveIntensity: 0.9 }),
    navy: new THREE.MeshPhysicalMaterial({ color: 0x163a66, metalness: 0.8, roughness: 0.2, clearcoat: 1, emissive: 0x061325 }),
  });
  crown.scale.setScalar(2.1);
  crown.position.set(0, H + 3.2, 0);
  scene.add(crown);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: (() => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      grd.addColorStop(0, 'rgba(230,190,110,.55)'); grd.addColorStop(0.4, 'rgba(200,150,70,.15)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
      return new THREE.CanvasTexture(c);
    })(),
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  halo.scale.setScalar(13); halo.position.copy(crown.position); scene.add(halo);

  /* ---------- Gold dust ---------- */
  const N = isMobile ? 500 : 1400;
  const dustPos = new Float32Array(N * 3), dustSpeed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    dustPos[i * 3] = (r() - 0.5) * 90; dustPos[i * 3 + 1] = r() * 55; dustPos[i * 3 + 2] = (r() - 0.5) * 90;
    dustSpeed[i] = 0.004 + r() * 0.012;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    color: 0xe3c987, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending,
  }));
  scene.add(dust);

  /* ---------- Scroll choreography ---------- */
  let targetP = 0, curP = 0;
  const readScroll = () => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    targetP = max > 0 ? THREE.MathUtils.clamp(window.scrollY / max, 0, 1) : 0;
  };
  window.addEventListener('scroll', readScroll, { passive: true });
  readScroll(); curP = targetP;

  const mouse = new THREE.Vector2(), mouseS = new THREE.Vector2();
  window.addEventListener('pointermove', (e) => {
    mouse.set(e.clientX / window.innerWidth - 0.5, e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  const camPos = new THREE.Vector3(), camTgt = new THREE.Vector3(), introOffset = new THREE.Vector3(0, 14, 18);
  let frames = 0, acc = 0, adapted = false;

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    curP += (targetP - curP) * (reduceMotion ? 1 : Math.min(1, dt * 2.6));
    mouseS.lerp(mouse, reduceMotion ? 0 : Math.min(1, dt * 2));

    posPath.getPoint(curP, camPos);
    tgtPath.getPoint(curP, camTgt);

    const intro = reduceMotion ? 0 : Math.pow(Math.max(0, 1 - t / 4.5), 3);
    camPos.addScaledVector(introOffset, intro);
    camPos.x += mouseS.x * 2.4; camPos.y -= mouseS.y * 1.4;
    if (!reduceMotion) { camPos.x += Math.sin(t * 0.15) * 0.6; camPos.y += Math.sin(t * 0.21) * 0.3; }
    camera.position.copy(camPos);
    camera.lookAt(camTgt);

    if (!reduceMotion) {
      crown.rotation.y = t * 0.35;
      crown.position.y = H + 3.2 + Math.sin(t * 0.8) * 0.25;
      halo.position.y = crown.position.y;
      halo.material.opacity = 0.75 + Math.sin(t * 1.3) * 0.15;
      ring.scale.setScalar(1 + Math.sin(t * 0.6) * 0.03);
      const arr = dustGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        arr[i * 3 + 1] += dustSpeed[i];
        arr[i * 3] += Math.sin(t * 0.3 + i) * 0.002;
        if (arr[i * 3 + 1] > 55) arr[i * 3 + 1] = 0;
      }
      dustGeo.attributes.position.needsUpdate = true;
      edges.material.opacity = 0.38 + Math.sin(t * 0.7) * 0.08;
    }

    renderer.render(scene, camera);

    // Adaptive quality: drop resolution once on slow devices
    if (!adapted && t > 2) {
      frames++; acc += dt;
      if (frames === 90) {
        adapted = true;
        if (acc / frames > 1 / 40 && pixelRatio > 1) { pixelRatio = 1; renderer.setPixelRatio(1); resize(); }
      }
    }
  }

  renderer.setAnimationLoop(frame);
  document.addEventListener('visibilitychange', () => {
    renderer.setAnimationLoop(document.hidden ? null : frame);
    if (!document.hidden) clock.getDelta();
  });
}
