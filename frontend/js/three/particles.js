import * as THREE from 'three';

export function createParticles(count = 200) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 80;
    positions[i * 3 + 1] = Math.random() * 25;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    speeds[i] = 0.02 + Math.random() * 0.04;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xf2cc60,
    size: 0.28,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);

  function update() {
    const pos = geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      pos[i * 3 + 1] += speeds[i];
      if (pos[i * 3 + 1] > 25) {
        pos[i * 3 + 1] = 0.5;
      }
    }
    geometry.attributes.position.needsUpdate = true;
  }

  return {
    points,
    update,
  };
}
