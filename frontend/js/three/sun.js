import * as THREE from 'three';

function createGlowSprite() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(255, 220, 140, 1)');
  gradient.addColorStop(0.3, 'rgba(242, 204, 96, 0.6)');
  gradient.addColorStop(0.7, 'rgba(240, 136, 62, 0.2)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({
    map: texture,
    blending: THREE.AdditiveBlending,
    transparent: true,
  });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(16, 16, 1);
  return sprite;
}

export function createSun() {
  const group = new THREE.Group();

  // Sun Core Mesh
  const sunGeo = new THREE.SphereGeometry(2.2, 32, 32);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffe082 });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  group.add(sunMesh);

  // Soft Outer Glow
  const glow = createGlowSprite();
  group.add(glow);

  // Directional Light
  const dirLight = new THREE.DirectionalLight(0xfff3d6, 1.8);
  dirLight.castShadow = false;
  group.add(dirLight);

  const radius = 55;

  function setHour(hour) {
    // 0 = midnight, 6 = dawn, 12 = noon, 18 = dusk, 24 = midnight
    const angle = ((hour - 6) / 12) * Math.PI;
    const x = Math.cos(angle) * radius * 0.8;
    const y = Math.sin(angle) * radius;
    const z = -25 + Math.sin(angle) * 10;

    group.position.set(x, Math.max(-10, y), z);

    // Adjust light intensity based on altitude
    if (y > 0) {
      const sunHeight = Math.min(1.0, y / (radius * 0.7));
      dirLight.intensity = THREE.MathUtils.lerp(0.2, 2.2, sunHeight);
      sunMat.color.setHex(0xffe082);
    } else {
      dirLight.intensity = 0.05; // Night faint ambient
      sunMat.color.setHex(0x3a4556);
    }
  }

  // Initialize at midday
  setHour(12);

  return {
    group,
    dirLight,
    setHour,
  };
}
