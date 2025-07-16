import * as THREE from "https://esm.sh/three@0.158.0";
import { OrbitControls } from "https://esm.sh/three@0.158.0/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/UnrealBloomPass";

// Layers
const LAYER_SUN = 1;
const LAYER_MOON = 10;
const LAYER_RING = 1000;

// Scene
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 0, 8);
camera.layers.enableAll();

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Lights
const pointLight = new THREE.PointLight(0xffffff, 2, 100);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);
scene.add(new THREE.AmbientLight(0x333333));

// Sun
const sunGeo = new THREE.SphereGeometry(1, 64, 64);
const sunMat = new THREE.MeshStandardMaterial({
  color: 0xffcc00,
  emissive: 0xffaa00,
  emissiveIntensity: 0.8,
  metalness: 0.4,
  roughness: 0.4
});
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.layers.set(LAYER_SUN);
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
moon.layers.set(LAYER_MOON);
scene.add(moon);

// Rings
const ringCount = 1000;
const ringSegments = 128;
const rings = [];
for (let j = 0; j < ringCount; j++) {
  const radius = 1.5 + Math.random() * 3;
  const amplitude = 0.03 + Math.random() * 0.12;
  const frequency = 2 + Math.random() * 5;
  const phase = Math.random() * Math.PI * 2;
  const hue = 40 + Math.random() * 40;
  const color = new THREE.Color(`hsl(${hue}, 100%, 60%)`);

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
    opacity: 0.1 + Math.random() * 0.3
  });

  const ring = new THREE.LineLoop(ringGeometry, ringMaterial);
  ring.userData = { radius, amplitude, frequency, phase };
  ring.layers.set(LAYER_RING);
  scene.add(ring);
  rings.push(ring);
}

// Postprocessing (Bloom)
const bloomComposer = new EffectComposer(renderer);
const bloomRenderPass = new RenderPass(scene, camera);
bloomComposer.addPass(bloomRenderPass);
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2.0, 0.6, 0.95);
bloomPass.threshold = 0;
bloomPass.strength = 2.5;
bloomPass.radius = 1.2;
bloomComposer.addPass(bloomPass);

// Animate
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.01;

  // Animate Moon
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

  // Animate Sun scaling (pulsing)
  const scale = 1.0 + 0.2 * Math.sin(time * 1.5);
  sun.scale.set(scale, scale, scale);

  // Render Bloom Layer Only
  camera.layers.set(LAYER_SUN);
  renderer.clear();
  bloomComposer.render();

  // Render Rings Over
  camera.layers.set(LAYER_RING);
  renderer.render(scene, camera);

  // Render Moon on Top
  camera.layers.set(LAYER_MOON);
  renderer.render(scene, camera);

  controls.update();
}
animate();

// Responsive
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  bloomComposer.setSize(window.innerWidth, window.innerHeight);
});
