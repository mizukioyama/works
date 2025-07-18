import * as THREE from 'https://cdn.skypack.dev/three@0.150.0';
import { OrbitControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls.js';

let scene = new THREE.Scene();
let camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 太陽（光る球体）
let sunGeometry = new THREE.SphereGeometry(1, 128, 128);
let sunMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    color1: { value: new THREE.Color("#fff89e") }, // 中心：白黄色
    color2: { value: new THREE.Color("#ff8800") }, // 外周：橙
    shadowProgress: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec2 resolution;
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float shadowProgress;
    varying vec2 vUv;

    float circle(vec2 uv, float radius) {
      return smoothstep(radius, radius - 0.01, length(uv - 0.5));
    }

    void main() {
      vec2 uv = vUv;
      vec2 center = vec2(0.5);
      float dist = distance(uv, center);

      // 太陽のグラデーション
      float sun = 1.0 - smoothstep(0.0, 0.5, dist);
      vec3 color = mix(color2, color1, sun);

      // 月の影（黒い領域が太陽を覆う）
      float shadowSize = 0.5 * (1.0 - abs(2.0 * shadowProgress - 1.0)); // 満月で0、半月で最大
      float shadow = smoothstep(shadowSize, shadowSize - 0.02, abs(uv.x - 0.5));
      color *= 1.0 - shadow;

      gl_FragColor = vec4(color, 1.0);
    }
  `,
  transparent: false
});

let sun = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sun);

// 雲ノイズ背景（Plane）
let cloudGeometry = new THREE.PlaneGeometry(10, 10);
let cloudMaterial = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
    }
  `,
  fragmentShader: `
    uniform float time;
    varying vec2 vUv;

    float noise(vec2 p){
      return fract(sin(dot(p ,vec2(12.9898,78.233))) * 43758.5453);
    }

    void main(){
      float n = noise(vUv * 10.0 + vec2(time * 0.05, time * 0.02));
      vec3 col = vec3(n * 0.1);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
  depthWrite: false,
  depthTest: false,
  transparent: true
});
let clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
clouds.position.z = -1.5;
scene.add(clouds);

// コントロール
let controls = new OrbitControls(camera, renderer.domElement);

// アニメーションループ
let clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);

  let t = clock.getElapsedTime();
  let loopDuration = 10.0;
  let progress = (t % loopDuration) / loopDuration; // 0.0 ~ 1.0

  // 満ち欠けにイージングをかける
  let eased = 0.5 - 0.5 * Math.cos(progress * 2.0 * Math.PI);
  sunMaterial.uniforms.shadowProgress.value = eased;

  // 更新
  sunMaterial.uniforms.time.value = t;
  cloudMaterial.uniforms.time.value = t;

  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});