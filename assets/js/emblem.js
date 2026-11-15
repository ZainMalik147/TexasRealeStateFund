/* Interactive 3D logo emblem shown in the Philosophy section. */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createEmblem } from './logo3d.js';

export function initEmblem(canvas, { reduceMotion = false } = {}) {
  const host = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 5.6);

  const key = new THREE.DirectionalLight(0xfff1d6, 2.2); key.position.set(3, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x8fb4ff, 1.2); rim.position.set(-4, -1, -3); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));
  const fill = new THREE.DirectionalLight(0xffe2b0, 1.4); fill.position.set(0, 1, 6); scene.add(fill);

  const emblem = createEmblem();
  const pivot = new THREE.Group();
  pivot.add(emblem);
  emblem.position.y = -0.05;
  scene.add(pivot);

  // Soft contact shadow
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(11,35,65,.35)'); grd.addColorStop(1, 'rgba(11,35,65,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.position.set(0, -1.35, 0); shadow.rotation.x = -Math.PI / 2.4; scene.add(shadow);

  // Drag to rotate with inertia
  let dragging = false, lastX = 0, lastY = 0, velY = 0.004, velX = 0, rotY = -0.5, rotX = 0.1;
  host.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; lastY = e.clientY; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    velY = (e.clientX - lastX) * 0.006; velX = (e.clientY - lastY) * 0.004;
    lastX = e.clientX; lastY = e.clientY;
  });
  const end = () => { dragging = false; };
  host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
  host.style.touchAction = 'pan-y';

  function resize() {
    const { width, height } = host.getBoundingClientRect();
    renderer.setSize(width, height, false);
    camera.aspect = width / height; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  resize();

  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(host);

  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    if (!visible) return;
    const t = clock.getElapsedTime();
    if (!dragging) {
      velY += ((reduceMotion ? 0 : 0.0035) - velY) * 0.03;
      velX *= 0.92;
      rotX += (0.08 - rotX) * 0.03;
    }
    rotY += velY; rotX = THREE.MathUtils.clamp(rotX + velX, -0.6, 0.6);
    pivot.rotation.set(rotX, rotY, 0);
    pivot.position.y = reduceMotion ? 0 : Math.sin(t * 0.9) * 0.05;
    renderer.render(scene, camera);
  }
  tick();
}
