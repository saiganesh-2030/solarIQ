import * as THREE from 'three';
import { createSolarField } from './solarField.js';
import { createSun } from './sun.js';
import { createParticles } from './particles.js';

let renderer, scene, camera;
let solarField, sun, particles;
let animId = null;
let isPaused = false;
let currentMode = 'home';

const targetCameraPos = new THREE.Vector3(0, 14, 30);
const targetCameraLookAt = new THREE.Vector3(0, 3, 0);
const currentLookAt = new THREE.Vector3(0, 3, 0);

let mouseX = 0, mouseY = 0;

export function initScene(canvas) {
  if (!canvas) return;

  // Check WebGL availability
  try {
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) {
      document.querySelector('.canvas-fallback')?.style.setProperty('display', 'block');
      return;
    }
  } catch (e) {
    document.querySelector('.canvas-fallback')?.style.setProperty('display', 'block');
    return;
  }

  // Respect prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.querySelector('.canvas-fallback')?.style.setProperty('display', 'block');
    return;
  }

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0d1117);
  scene.fog = new THREE.FogExp2(0x0d1117, 0.015);

  // Camera
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
  camera.position.copy(targetCameraPos);

  // Renderer
  const isMobile = window.innerWidth <= 768;
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    powerPreference: 'high-performance',
    alpha: false,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2.0));

  // Ambient Lighting
  const ambientLight = new THREE.AmbientLight(0x2a3649, 1.2);
  scene.add(ambientLight);

  // Sun
  sun = createSun();
  scene.add(sun.group);

  // Solar Field
  solarField = createSolarField();
  scene.add(solarField.group);

  // Floating Particles (reduce count on mobile)
  particles = createParticles(isMobile ? 80 : 180);
  scene.add(particles.points);

  // Mouse Parallax Listener
  window.addEventListener('mousemove', onMouseMove, { passive: true });
  window.addEventListener('resize', onWindowResize, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange);

  // Start Animation Loop
  animate();
}

function onMouseMove(e) {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
}

function onWindowResize() {
  if (!camera || !renderer) return;
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onVisibilityChange() {
  if (document.hidden) {
    pause();
  } else {
    resume();
  }
}

function animate() {
  if (isPaused) return;
  animId = requestAnimationFrame(animate);

  // Smooth camera parallax
  const parallaxX = mouseX * 2.5;
  const parallaxY = -mouseY * 1.5;

  camera.position.x += (targetCameraPos.x + parallaxX - camera.position.x) * 0.05;
  camera.position.y += (targetCameraPos.y + parallaxY - camera.position.y) * 0.05;
  camera.position.z += (targetCameraPos.z - camera.position.z) * 0.05;

  currentLookAt.lerp(targetCameraLookAt, 0.05);
  camera.lookAt(currentLookAt);

  // Update floating particles
  if (particles) particles.update();

  renderer.render(scene, camera);
}

export function setMode(modeName) {
  currentMode = modeName;
  if (modeName === 'home') {
    targetCameraPos.set(0, 14, 30);
    targetCameraLookAt.set(0, 3, 0);
    if (scene) scene.fog.density = 0.012;
  } else {
    targetCameraPos.set(0, 22, 38);
    targetCameraLookAt.set(0, 1.5, 0);
    if (scene) scene.fog.density = 0.022; // Dimmer background for contrast
  }
}

export function setSunHour(hour) {
  if (sun) sun.setHour(hour);
  if (solarField) {
    const tilt = THREE.MathUtils.lerp(0.2, 0.55, Math.sin((hour / 24) * Math.PI));
    solarField.updateTilt(tilt);
  }
}

export function setPower(ratio) {
  if (solarField) solarField.setPowerGlow(ratio);
}

export function pulse(type = 'info') {
  if (!solarField) return;
  solarField.setPowerGlow(1.0);
  setTimeout(() => {
    solarField.setPowerGlow(currentMode === 'home' ? 0.3 : 0.1);
  }, 450);
}

export function pause() {
  isPaused = true;
  if (animId) cancelAnimationFrame(animId);
}

export function resume() {
  if (isPaused) {
    isPaused = false;
    animate();
  }
}

export function dispose() {
  pause();
  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('resize', onWindowResize);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  if (renderer) renderer.dispose();
}
