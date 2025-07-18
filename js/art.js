    import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
    import { OrbitControls } from 'https://unpkg.com/three@0.160.1/examples/jsm/controls/OrbitControls.js';

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // 太陽（本体）
    const sphereGeometry = new THREE.SphereGeometry(1, 64, 64);
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color1: { value: new THREE.Color('#ffffcc') },
        color2: { value: new THREE.Color('#ffaa00') },
        color3: { value: new THREE.Color('#ffffff') },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color1;
        uniform vec3 color2;
        uniform vec3 color3;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float intensity = dot(normalize(vNormal), vec3(0.0, 0.0, 1.0));
          vec3 gradient = mix(color1, color2, vPosition.y * 0.5 + 0.5);
          gradient = mix(gradient, color3, intensity);
          gl_FragColor = vec4(gradient, 1.0);
        }
      `,
    });
    const sun = new THREE.Mesh(sphereGeometry, sphereMaterial);
    scene.add(sun);

    // 黒いマスク（月）
    const moonMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const moon = new THREE.Mesh(new THREE.SphereGeometry(1.01, 64, 64), moonMaterial);
    scene.add(moon);

    // 光源
    const pointLight = new THREE.PointLight(0xffffff, 2, 100);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // コントロール
    const controls = new OrbitControls(camera, renderer.domElement);

    // リサイズ対応
    window.addEventListener('resize', () => {
      camera.aspect = window.innerWidth/window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // 満ち欠けアニメーション
    let time = 0;
    function animate() {
      requestAnimationFrame(animate);
      time += 0.01;

      // 緩急をつけた振動（0～1の間を波のように動く）
      const moonOffset = Math.cos(time) * 1.5;

      // スムーズに見えるようにカメラ方向に常に向ける
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      direction.normalize();
      moon.position.copy(direction.multiplyScalar(moonOffset));

      // 形状の変化に合わせてスケール変化（擬似的に黒い月を小さくする）
      const scale = 1.5 - 0.5 * Math.cos(time);
      moon.scale.set(scale, scale, scale);

      controls.update();
      renderer.render(scene, camera);
    }

    animate();