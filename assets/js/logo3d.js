/* 3D version of the Texas Real Estate Fund star mark (traced from the logo). */
import * as THREE from 'three';

// Outline in logo/SVG coordinates (y down). The star outline already has the building cut-out removed.
const STAR = [
  [767, 92], [840, 296], [1068, 296], [903, 423], [975, 617], [948, 604], [920, 594], [876, 567],
  [876, 353], [757, 270], [757, 345], [677, 395], [677, 447], [632, 477], [632, 582], [615, 592],
  [587, 603], [559, 617], [632, 423], [467, 296], [695, 296],
];
const TOWER_SMALL = [[658, 490], [705, 458], [705, 428], [735, 407], [735, 572], [696, 578], [658, 585]];
const TOWER_TALL = [[777, 315], [849, 365], [849, 585], [812, 577], [777, 572]];

const S = 1 / 300;
function toShape(pts) {
  const shape = new THREE.Shape();
  pts.forEach(([x, y], i) => {
    const px = (x - 767) * S, py = -(y - 400) * S;
    i ? shape.lineTo(px, py) : shape.moveTo(px, py);
  });
  shape.closePath();
  return shape;
}

function extrude(pts, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(toShape(pts), {
    depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments: 1,
  });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

export function createEmblem({ navy, gold, depth = 0.16 } = {}) {
  const group = new THREE.Group();
  const navyMat = navy || new THREE.MeshPhysicalMaterial({ color: 0x0b2341, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.15 });
  const goldMat = gold || new THREE.MeshPhysicalMaterial({ color: 0xe0bd72, metalness: 1, roughness: 0.2, clearcoat: 0.6, envMapIntensity: 1.8, emissive: 0x3d2a0a, emissiveIntensity: 0.5 });

  const star = new THREE.Mesh(extrude(STAR, depth, 0.025), navyMat);
  const t1 = new THREE.Mesh(extrude(TOWER_SMALL, depth * 1.9, 0.02), goldMat);
  const t2 = new THREE.Mesh(extrude(TOWER_TALL, depth * 2.3, 0.02), goldMat);
  [star, t1, t2].forEach((m) => { m.castShadow = true; m.receiveShadow = true; group.add(m); });
  group.userData = { star, towers: [t1, t2], navyMat, goldMat };
  return group;
}
