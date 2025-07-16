    import * as THREE from "https://esm.sh/three@0.158.0";
    import { OrbitControls } from "https://esm.sh/three@0.158.0/examples/jsm/controls/OrbitControls";
    import { EffectComposer } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/EffectComposer";
    import { RenderPass } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/RenderPass";
    import { UnrealBloomPass } from "https://esm.sh/three@0.158.0/examples/jsm/postprocessing/UnrealBloomPass";

    // === Scene, Camera, Renderer ===
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 10);

    const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    const controls = new OrbitControls(camera, renderer.domElement);

    // === Lights ===
    scene.add(new THREE.AmbientLight(0x222222));
    const pointLight = new THREE.PointLight(0xffffff, 2, 100);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // === Sun Shader (phases) ===
    const sunUniforms = {
      time: { value: 0.0 },
      speed: { value: 0.05 },
      edgeSoftness: { value: 0.1 },
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
        uniform float speed;
        uniform float edgeSoftness;
        uniform vec3 color;
        uniform vec3 emissiveColor;
        varying vec2 vUv;

        void main() {
          float d = distance(vUv, vec2(0.5));
          if (d > 0.5) discard;

          // Smooth lunar phase curve
          float rawPhase = sin(time * speed);
          float phase = sign(rawPhase) * pow(abs(rawPhase), 0.7);

          float cutoff = smoothstep(0.5 + phase * 0.35 - edgeSoftness, 0.5 + phase * 0.35 + edgeSoftness, vUv.x);

          float fade = 1.0 - smoothstep(0.4, 0.5, d);

          float visibility = cutoff * fade;
          visibility = smoothstep(0.0, 1.0, visibility);

          gl_FragColor = vec4(mix(color, emissiveColor, visibility), visibility);
        }
      `,
    });

    const sunGeo = new THREE.SphereGeometry(1, 128, 128);
    const sun = new THREE.Mesh(sunGeo, sunMaterial);
    scene.add(sun);

    // === Wavy Colorful Rings ===
    const ringCount = 1000;
    const ringSegments = 128;
    const rings = [];

    for (let j = 0; j < ringCount; j++) {
      const radius = 1.5 + Math.random() * 3;
      const amplitude = 0.02 + Math.random() * 0.08;
      const frequency = 2 + Math.random() * 4;
      const phase = Math.random() * Math.PI * 2;

      const positions = new Float32Array(ringSegments * 3);
      const colors = new Float32Array(ringSegments * 3);

      for (let i = 0; i < ringSegments; i++) {
        const angle = (i / ringSegments) * Math.PI * 2;
        positions[i * 3] = Math.cos(angle) * radius;
        positions[i * 3 + 1] = Math.sin(angle) * radius;
        positions[i * 3 + 2] = 0;

        const hue = (angle / Math.PI / 2) * 360.0 + Math.random() * 30;
        const color = new THREE.Color(`hsl(${hue % 360}, 100%, 60%)`);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      const ringGeometry = new THREE.BufferGeometry();
      ringGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      ringGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const ringMaterial = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.05 + Math.random() * 0.2,
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

      // Pulsate sun size
      const scale = 1.0 + 0.2 * Math.sin(time * 1.5);
      sun.scale.set(scale, scale, scale);

      // Animate rings
      for (const ring of rings) {
        const pos = ring.geometry.attributes.position;
        const colors = ring.geometry.attributes.color;
        const { radius, amplitude, frequency, phase } = ring.userData;

        // Complex modulator with multiple sine waves
        const n1 = Math.sin(time * 0.1 + phase);
        const n2 = Math.sin(time * 0.27 + phase * 1.3);
        const n3 = Math.sin(time * 0.55 + phase * 2.1);
        const modulator = 0.5 + 0.5 * (0.5 * n1 + 0.3 * n2 + 0.2 * n3);
        const dynamicAmp = amplitude * modulator;

        for (let i = 0; i < ringSegments; i++) {
          const angle = (i / ringSegments) * Math.PI * 2;
          const wave = dynamicAmp * Math.sin(angle * frequency + time + phase);

          pos.array[i * 3] = Math.cos(angle) * (radius + wave);
          pos.array[i * 3 + 1] = Math.sin(angle) * (radius + wave);

          // Color time modulation (sunlike)
          const t = time * 10 + angle;
          const hue = 40 + 20 * Math.sin(t + phase);
          const color = new THREE.Color();
          color.setHSL(hue / 360, 1.0, 0.6);

          colors.array[i * 3] = color.r;
          colors.array[i * 3 + 1] = color.g;
          colors.array[i * 3 + 2] = color.b;
        }

        pos.needsUpdate = true;
        colors.needsUpdate = true;
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