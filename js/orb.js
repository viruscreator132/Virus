// orb.js — clean & responsive version
(function(){
  document.addEventListener('DOMContentLoaded', function(){
    if (typeof THREE === 'undefined') {
      console.error('Three.js not loaded. Include three.min.js before orb.js');
      return;
    }

    const BRAND_HEX = '#D6FF00';
    const DPR = Math.min(window.devicePixelRatio || 1, 2);
    const container = document.getElementById('orb-container');
    if (!container) return;

    function hexToVec3(hex){
      const h = hex.replace('#','');
      return new THREE.Vector3(
        parseInt(h.substring(0,2),16)/255,
        parseInt(h.substring(2,4),16)/255,
        parseInt(h.substring(4,6),16)/255
      );
    }
    const brandColor = hexToVec3(BRAND_HEX);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(DPR);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0, 3.2);

    let seg = container.clientWidth > 700 ? 160 : 80;
    const geometry = new THREE.SphereGeometry(1, seg, seg);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        u_time: { value: 0.0 },
        u_main: { value: brandColor },
        u_light: { value: new THREE.Vector3(1.0,1.0,1.0) },
        u_amp: { value: 0.12 },
        u_freq: { value: 2.6 },
        u_gloss: { value: 1.1 },
        u_resolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
        u_viewPos: { value: new THREE.Vector3() }
      },
      vertexShader: `
        uniform float u_time;
        uniform float u_amp;
        uniform float u_freq;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        varying float vWave;
        float waveField(vec3 p){
          float t = u_time * 0.8;
          float w = 0.0;
          w += 0.45 * sin((p.x * 1.3 + p.y * 0.7 + p.z * 0.9) * u_freq + t*1.0);
          w += 0.30 * sin((p.y * 1.9 - p.x * 0.6 + p.z * 0.4) * (u_freq*1.1) + t*1.4 + 0.7);
          w += 0.20 * sin((p.z * 2.3 + p.x * 0.5 - p.y * 0.2) * (u_freq*0.8) + t*0.6 - 0.4);
          float r = length(p);
          w *= (0.8 + 0.2 * sin(r * 3.0 + t * 0.6));
          return w;
        }
        void main(){
          vNormal = normalize(normalMatrix * normal);
          vec3 pos = position;
          float n = waveField(pos);
          vWave = n;
          pos += normal * (n * u_amp);
          vec4 worldPos = modelMatrix * vec4(pos,1.0);
          vWorldPos = worldPos.xyz;
          vViewDir = normalize((cameraPosition - vWorldPos));
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;
        uniform float u_time;
        uniform vec3 u_main;
        uniform vec3 u_light;
        uniform float u_gloss;
        uniform vec3 u_viewPos;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        varying vec3 vViewDir;
        varying float vWave;
        float specularBlinn(vec3 N, vec3 V, vec3 L, float shin){
          vec3 H = normalize(L + V);
          return pow(max(dot(N,H), 0.0), shin);
        }
        void main(){
          vec3 N = normalize(vNormal);
          vec3 V = normalize(vViewDir);
          float up = smoothstep(-0.6, 0.9, N.y);
          vec3 base = mix(vec3(0.06,0.06,0.06), vec3(1.0,1.0,1.0), up);
          base = mix(base, u_main, 0.6);
          float fres = pow(1.0 - max(dot(N, V), 0.0), 3.0);
          base += fres * (u_main * 0.25);
          vec3 L1 = normalize(vec3(0.6, 0.9, 1.0));
          vec3 L2 = normalize(vec3(-0.4, 0.2, -0.8));
          float diff = max(dot(N, L1), 0.0) * 0.9 + max(dot(N, L2), 0.0) * 0.35;
          float spec = specularBlinn(N, V, L1, 40.0) * 0.9 + specularBlinn(N,V,L2,80.0)*0.35;
          spec *= (0.6 + clamp(vWave*1.2, 0.0, 1.0)) * u_gloss;
          vec3 color = base * (0.65 + diff*0.6) + vec3(spec);
          color += pow(1.0 - max(dot(N,V),0.0), 6.0) * u_main * 0.12;
          color = pow(color, vec3(1.0/1.9));
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: true
    });

    const orb = new THREE.Mesh(geometry, material);
    scene.add(orb);

    scene.add(new THREE.AmbientLight(0xffffff, 0.28));
    const dir = new THREE.DirectionalLight(0xffffff, 0.55);
    dir.position.set(4,6,2);
    scene.add(dir);

    function adapt(){
      const w = container.clientWidth;
      const h = Math.max(container.clientHeight, Math.round(window.innerHeight * 0.45));
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      material.uniforms.u_resolution.value.set(w, h);

      let scale = 1.0;
      if (w < 480) scale = 0.7;
      else if (w < 768) scale = 0.85;
      else if (w < 1100) scale = 0.95;
      orb.scale.set(scale, scale, scale);
      orb.position.x = 0;
    }

    adapt();
    window.addEventListener('resize', adapt);
    if (window.ResizeObserver) new ResizeObserver(adapt).observe(container);

    const clock = new THREE.Clock();
    function animate(){
      const t = clock.getElapsedTime();
      material.uniforms.u_time.value = t * 0.9;
      orb.rotation.y = t * 0.08;
      orb.rotation.x = Math.sin(t * 0.12) * 0.03;
      orb.position.y = Math.sin(t * 0.5) * 0.045;
      material.uniforms.u_viewPos.value.copy(camera.position);
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }
    animate();

    container.addEventListener('pointermove', (e) => {
      const r = container.getBoundingClientRect();
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      orb.rotation.y += (nx * 0.25 - orb.rotation.y) * 0.06;
      orb.rotation.x += (-ny * 0.12 - orb.rotation.x) * 0.06;
    });
  });
})();
