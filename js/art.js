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
camera.position.set(0, 0, 10);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);

// Lights
scene.add(new THREE.AmbientLight(0x222222));
const pointLight = new THREE.PointLight(0xffffff, 2, 100);
pointLight.position.set(5, 5, 5);
scene.add(pointLight);

// === Custom shader for the Sun (morphing new moon to full moon) ===
const sunUniforms = {
  time: { value: 0.0 },
  color: { value: new THREE.Color(0xffcc00) },
  emissiveColor: { value: new THREE.Color(0xffaa00) },
};

const sunMaterial = new THREE.ShaderMaterial({
  uniforms: sunUniforms,
  transparent: true,
  side: THREE.FrontSide,
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 color;
    uniform vec3 emissiveColor;
    varying vec2 vUv;

    void main() {
      float d = distance(vUv, vec2(0.5));
      if (d > 0.5) discard;

      // Eclipse phase oscillates from 0.0 (full) to 1.0 (new moon)
      float phase = 0.5 + 0.5 * sin(time * 0.5);
      float cutX = 0.5 + (phase - 0.5) * 0.5;

      // Mask to simulate moon phase
      float mask = smoothstep(cutX - 0.02, cutX + 0.02, vUv.x) * (1.0 - smoothstep(1.0 - cutX - 0.02, 1.0 - cutX + 0.02, vUv.x));

      vec3 finalColor = mix(color, emissiveColor, 0.5 + 0.5 * mask);
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `,
});

const sunGeo = new THREE.SphereGeometry(1, 128, 128);
const sun = new THREE.Mesh(sunGeo, sunMaterial);
scene.add(sun);

// === Wavy Rings ===
const ringCount = 1000;
const ringSegments = 128;
const rings = [];
for (let j = 0; j < ringCount; j++) {
  const radius = 1.5 + Math.random() * 3;
  const amplitude = 0.02 + Math.random() * 0.1;
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
    opacity: 0.05 + Math.random() * 0.2
  });

  const ring = new THREE.LineLoop(ringGeometry, ringMaterial);
  ring.userData = { radius, amplitude, frequency, phase };
  scene.add(ring);
  rings.push(ring);
}

// === Bloom ===
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 2.5, 0.6, 0.95);
bloomPass.threshold = 0;
bloomPass.strength = 2.0;
bloomPass.radius = 1.0;
composer.addPass(bloomPass);

// === Animate ===
let time = 0;
function animate() {
  requestAnimationFrame(animate);
  time += 0.01;
  sunUniforms.time.value = time;

  // Sun pulsates
  const scale = 1.0 + 0.2 * Math.sin(time * 1.5);
  sun.scale.set(scale, scale, scale);

  // Animate rings
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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});
