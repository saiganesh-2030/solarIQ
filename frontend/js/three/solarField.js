import * as THREE from 'three';

function createPanelTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Base dark blue solar wafer
  ctx.fillStyle = '#0c1d36';
  ctx.fillRect(0, 0, 256, 512);

  // Cell grid lines
  ctx.strokeStyle = '#1e3860';
  ctx.lineWidth = 2;
  const cols = 6;
  const rows = 12;
  const cw = 256 / cols;
  const rh = 512 / rows;

  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cw, 0);
    ctx.lineTo(c * cw, 512);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * rh);
    ctx.lineTo(256, r * rh);
    ctx.stroke();
  }

  // Silver busbars
  ctx.strokeStyle = '#486581';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cw * 2, 0);
  ctx.lineTo(cw * 2, 512);
  ctx.moveTo(cw * 4, 0);
  ctx.lineTo(cw * 4, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  return texture;
}

export function createSolarField() {
  const group = new THREE.Group();

  // Ground Grid
  const gridHelper = new THREE.GridHelper(120, 40, 0x30363d, 0x161b22);
  gridHelper.position.y = -0.05;
  group.add(gridHelper);

  // Ground plane
  const groundGeo = new THREE.PlaneGeometry(160, 160);
  const groundMat = new THREE.MeshBasicMaterial({ color: 0x080c12 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.1;
  group.add(ground);

  // Panels Setup: 8 cols x 5 rows
  const panelCols = 8;
  const panelRows = 5;
  const totalCount = panelCols * panelRows;

  const panelWidth = 3.6;
  const panelHeight = 0.12;
  const panelDepth = 2.0;

  const panelGeo = new THREE.BoxGeometry(panelWidth, panelHeight, panelDepth);
  const texture = createPanelTexture();

  const panelMat = new THREE.MeshPhysicalMaterial({
    color: 0x102542,
    map: texture,
    roughness: 0.25,
    metalness: 0.6,
    clearcoat: 0.8,
    clearcoatRoughness: 0.1,
    reflectivity: 0.9,
  });

  const instancedPanels = new THREE.InstancedMesh(panelGeo, panelMat, totalCount);
  instancedPanels.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const spacingX = 5.2;
  const spacingZ = 4.2;
  const dummy = new THREE.Object3D();

  let idx = 0;
  for (let r = 0; r < panelRows; r++) {
    for (let c = 0; c < panelCols; c++) {
      const x = (c - (panelCols - 1) / 2) * spacingX;
      const z = (r - (panelRows - 1) / 2) * spacingZ;
      dummy.position.set(x, 1.2, z);
      dummy.rotation.x = 0.35; // Default tilt toward sun
      dummy.updateMatrix();
      instancedPanels.setMatrixAt(idx++, dummy.matrix);
    }
  }
  instancedPanels.instanceMatrix.needsUpdate = true;
  group.add(instancedPanels);

  function updateTilt(tiltRad) {
    let i = 0;
    for (let r = 0; r < panelRows; r++) {
      for (let c = 0; c < panelCols; c++) {
        const x = (c - (panelCols - 1) / 2) * spacingX;
        const z = (r - (panelRows - 1) / 2) * spacingZ;
        dummy.position.set(x, 1.2, z);
        dummy.rotation.x = THREE.MathUtils.clamp(tiltRad, 0.1, 0.6);
        dummy.updateMatrix();
        instancedPanels.setMatrixAt(i++, dummy.matrix);
      }
    }
    instancedPanels.instanceMatrix.needsUpdate = true;
  }

  function setPowerGlow(ratio) {
    const intensity = THREE.MathUtils.lerp(0.05, 0.45, ratio);
    panelMat.emissive.setHex(0xf0883e);
    panelMat.emissiveIntensity = intensity;
  }

  return {
    group,
    updateTilt,
    setPowerGlow,
  };
}
