import * as THREE from 'https://unpkg.com/three@0.158.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.158.0/examples/jsm/controls/OrbitControls.js';

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 6);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Lights
const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

const ambientLight = new THREE.AmbientLight(0x222222);
scene.add(ambientLight);

// Sun
const sunGeo = new THREE.SphereGeometry(1, 64, 64);
const sunMat = new THREE.MeshStandardMaterial({
  color: 0xffcc00,
  emissive: 0xffaa00,
  emissiveIntensity: 0.5,
  metalness: 0.4,
  roughness: 0.6
});
const sun = new THREE.Mesh(sunGeo, sunMat);
scene.add(sun);

// Moon
const moonGeo = new THREE.SphereGeometry(1.05, 64, 64);
const moonMat = new THREE.MeshStandardMaterial({
  color: 0x000000,
  metalness: 0.2,
  roughness: 0.9
});
const moon = new THREE.Mesh(moonGeo, moonMat);
moon.position.set(-3, 0, 0);
scene.add(moon);

// Wavy Ring
const ringSegments = 128;
const ringRadius = 2;
const ringGeometry = new THREE.BufferGeometry();
const ringPositions = new Float32Array(ringSegments * 3);
for (let i = 0; i < ringSegments; i++) {
  const angle = (i / ringSegments) * Math.PI * 2;
  ringPositions[i * 3] = Math.cos(angle) * ringRadius;
  ringPositions[i * 3 + 1] = Math.sin(angle) * ringRadius;
  ringPositions[i * 3 + 2] = 0;
}
ringGeometry.setAttribute('position', new THREE.BufferAttribute(ringPositions, 3));
const ringMaterial = new THREE.LineBasicMaterial({ color: 0xffaa00, transparent: true, opacity: 0.6 });
const ring = new THREE.LineLoop(ringGeometry, ringMaterial);
scene.add(ring);

// Animate
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.01;

  moon.position.x += 0.01;
  if (moon.position.x > 3) moon.position.x = -3;

  const pos = ring.geometry.attributes.position;
  for (let i = 0; i < ringSegments; i++) {
    const angle = (i / ringSegments) * Math.PI * 2;
    const wave = 0.15 * Math.sin(angle * 4 + time * 2);
    pos.array[i * 3] = Math.cos(angle) * (ringRadius + wave);
    pos.array[i * 3 + 1] = Math.sin(angle) * (ringRadius + wave);
  }
  pos.needsUpdate = true;

  controls.update();
  renderer.render(scene, camera);
}
animate();

// Responsive
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
