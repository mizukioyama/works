import * as THREE from "https://esm.sh/three@0.158.0";
import { OrbitControls } from "https://esm.sh/three@0.158.0/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/UnrealBloomPass";

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 8);

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

// 100 RINGS
const ringCount = 100;
const ringSegments = 128;
const rings = [];
for (let j = 0; j < ringCount; j++) {
  const radius = 1.5 + Math.random() * 3;
  const amplitude = 0.05 + Math.random() * 0.2;
  const frequency = 2 + Math.random() * 6;
  const phase = Math.random() * Math.PI * 2;
  const colorHue = 30 + Math.random() * 60;
  const color = new THREE.Color(`hsl(${colorHue}, 100%, 60%)`);

  const ringGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(ringSegments * 3);
  for (let i = 0; i < ringSegments; i++) {
    const angle = (i / ringSegments) * Math.PI * 2;
    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = Math.sin(angle) * radius;
    positions[i * 3 + 2] = 0;
  }
  ringGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const ringMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.3 + Math.random() * 0.5
  });

  const ring = new THREE.LineLoop(ringGeometry, ringMaterial);
  ring.userData = { radius, amplitude, frequency, phase };
  scene.add(ring);
  rings.push(ring);
}

// Postprocessing Bloom
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.0, 0.4, 0.85);
bloomPass.threshold = 0;
bloomPass.strength = 1.5;
bloomPass.radius = 0.8;
composer.addPass(bloomPass);

// Animate
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.01;

  moon.position.x += 0.01;
  if (moon.position.x > 3) moon.position.x = -3;

  // Animate Rings
  for (const ring of rings) {
    const pos = ring.geometry.attributes.position;
    const { radius, amplitude, frequency, phase } = ring.userData;
    for (let i = 0; i < ringSegments; i++) {
      const angle = (i / ringSegments) * Math.PI * 2;
      const wave = amplitude * Math.sin(angle * frequency + time + phase);
      pos.array[i * 3] = Math.cos(angle) * (radius + wave);
      pos.array[i * 3 + 1] = Math.sin(angle) * (radius + wave);
    }
    pos.needsUpdate = true;
  }

  controls.update();
  composer.render();
}
animate();

// Responsive
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
