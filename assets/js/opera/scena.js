// La scena 3D di Elegie Duino: il paese vero (terreno LiDAR della Regione, edifici e alberi da dati
// pubblici, ortofoto) e l'edificio ricostruito dalle tavole del progettista. Nessuna immagine generata.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/meshopt_decoder.module.js';
import { OrbitControls } from 'three/addons/OrbitControls.js';
import { posizioneSole, versoSole, istante } from './sole.js';

const LAT = 45.7737, LON = 13.6058; // aggiornati da contesto.json se presente
const ease = (t) => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export async function creaScena({ tela, base, dati, onProgress, onPronta, lingua }) {
  const mobile = matchMedia('(max-width: 760px)').matches;
  const fine = matchMedia('(pointer: fine)').matches;
  const ridotto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.6 : 1.75));
  renderer.setSize(tela.clientWidth, tela.clientHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.localClippingEnabled = true;
  tela.appendChild(renderer.domElement);

  const scena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(mobile ? 46 : 34, tela.clientWidth / tela.clientHeight, 0.5, 9000);
  camera.position.set(400, 300, 400);

  // ---------------------------------------------------------------- cielo
  const cieloU = { alto: { value: new THREE.Color('#5e86a4') }, orizzonte: { value: new THREE.Color('#e5e2d8') }, sole: { value: new THREE.Vector3(0, 1, 0) }, caldo: { value: new THREE.Color('#ffd9a0') } };
  const cielo = new THREE.Mesh(new THREE.SphereGeometry(8000, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: cieloU,
    vertexShader: 'varying vec3 v; void main(){ v = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 alto; uniform vec3 orizzonte; uniform vec3 sole; uniform vec3 caldo; varying vec3 v;
      void main(){ float h = clamp(v.y*1.6, 0.0, 1.0); vec3 c = mix(orizzonte, alto, pow(h, 0.6));
        float s = max(dot(normalize(v), normalize(sole)), 0.0); c += caldo * (pow(s, 24.0)*0.55 + pow(s, 2.0)*0.12*(1.0-h));
        if (v.y < 0.0) c = orizzonte * 0.92; gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  cielo.renderOrder = -10;
  scena.add(cielo);
  scena.fog = new THREE.Fog('#e5e2d8', 900, 5200);

  const emi = new THREE.HemisphereLight('#f4f5f4', '#a49b8c', 1.0);
  scena.add(emi);
  const sole = new THREE.DirectionalLight('#fff1dc', 2.6);
  sole.castShadow = true;
  sole.shadow.mapSize.set(mobile ? 2048 : 4096, mobile ? 2048 : 4096);
  sole.shadow.bias = -0.0003; sole.shadow.normalBias = 0.03;
  scena.add(sole); scena.add(sole.target);

  // riflessi per i vetri: un ambiente ricavato dal cielo
  const pmrem = new THREE.PMREMGenerator(renderer);
  const ambiente = () => { const s = new THREE.Scene(); s.add(cielo.clone()); scena.environment = pmrem.fromScene(s, 0.02).texture; };

  // ---------------------------------------------------------------- materiali
  const M = {
    intonaco: new THREE.MeshStandardMaterial({ color: '#f0ece5', roughness: 0.92, flatShading: true }),
    xlam: new THREE.MeshStandardMaterial({ color: '#dcb88d', roughness: 0.8, flatShading: true }),
    legno: new THREE.MeshStandardMaterial({ color: '#a8754c', roughness: 0.72, flatShading: true }),
    vetro: new THREE.MeshStandardMaterial({ color: '#203239', roughness: 0.06, metalness: 0.5, transparent: true, opacity: 0.86, flatShading: true, envMapIntensity: 1.3 }),
    scuro: new THREE.MeshStandardMaterial({ color: '#3a4044', roughness: 0.55, flatShading: true }),
    fv: new THREE.MeshStandardMaterial({ color: '#1c2734', roughness: 0.42, metalness: 0.25, flatShading: true }),
    cls: new THREE.MeshStandardMaterial({ color: '#b8b3a9', roughness: 1, flatShading: true }),
    vicini: new THREE.MeshStandardMaterial({ color: '#ebe7df', roughness: 1, flatShading: true, transparent: true, opacity: 1 }),
    alberi: new THREE.MeshStandardMaterial({ color: '#93a487', roughness: 1, flatShading: true, transparent: true, opacity: 1 }),
    volume: new THREE.MeshBasicMaterial({ color: '#f3c98b', transparent: true, opacity: 0, depthWrite: false }),
    mare: new THREE.MeshStandardMaterial({ color: '#2a5867', roughness: 0.22, metalness: 0.15 }),
    lotto: new THREE.LineBasicMaterial({ color: '#e23bd6', transparent: true, opacity: 0 }), // lo stesso magenta del perimetro disegnato sulla foto
    drenante: new THREE.MeshStandardMaterial({ color: '#cfc8bb', roughness: 1, flatShading: true }),
    prato: new THREE.MeshStandardMaterial({ color: '#9cac83', roughness: 1, flatShading: true }),
    pietra: new THREE.MeshStandardMaterial({ color: '#dcd8cf', roughness: 0.95, flatShading: true }),
    siepe: new THREE.MeshStandardMaterial({ color: '#5f7350', roughness: 1, flatShading: true }),
    chioma: new THREE.MeshStandardMaterial({ color: '#7f9470', roughness: 1, flatShading: true }),
    tronco: new THREE.MeshStandardMaterial({ color: '#6b5a48', roughness: 1, flatShading: true }),
  };
  const clipPT = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);
  const clipP1 = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);

  // ---------------------------------------------------------------- caricamento
  const gl = new GLTFLoader(); gl.setMeshoptDecoder(MeshoptDecoder);
  const pesi = { ctx: 0, edi: 0 };
  const avanza = () => onProgress && onProgress((pesi.ctx * 0.8 + pesi.edi * 0.2));
  const carica = (url, k) => new Promise((ok, ko) => gl.load(url, ok, (e) => { if (e.total) { pesi[k] = e.loaded / e.total; avanza(); } }, ko));
  const leggi = (url) => fetch(url).then((r) => (r.ok ? r.json() : null)).catch(() => null);

  const [ctxInfo, alberiDati] = await Promise.all([leggi(base + '3d/contesto.json'), leggi(base + '3d/alberi.json')]);
  const lat = ctxInfo?.lat ?? LAT, lon = ctxInfo?.lon ?? LON;

  let contesto = null;
  try { contesto = await carica(base + '3d/contesto.glb', 'ctx'); } catch (e) { contesto = null; }
  const edificio = await carica(base + '3d/edificio.glb', 'edi');
  pesi.ctx = pesi.edi = 1; avanza();

  // terreno, edifici del paese, mare
  const ortoMat = [];
  const ombreggianti = []; // case e chiome del paese: smettono di fare ombra quando si velano
  if (contesto) {
    contesto.scene.traverse((o) => {
      if (!o.isMesh) return;
      if (o.parent && o.parent.name && o.parent.name !== 'world' && (!o.name || /^mesh_\d+$/.test(o.name))) o.name = o.parent.name;
      if (/terreno/.test(o.name)) {
        const tex = o.material.map; if (tex) { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; }
        const m = new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
        m.onBeforeCompile = (sh) => {
          sh.uniforms.uSat = { value: 0.6 };
          sh.uniforms.uChiaro = { value: 0.07 };
          sh.uniforms.uCarta = { value: 0 };
          m.userData.sh = sh;
          sh.fragmentShader = 'uniform float uSat; uniform float uChiaro; uniform float uCarta;\n' + sh.fragmentShader.replace('#include <map_fragment>',
            `#include <map_fragment>
             float lum = dot(diffuseColor.rgb, vec3(0.299,0.587,0.114));
             diffuseColor.rgb = mix(vec3(lum), diffuseColor.rgb, uSat) * vec3(1.04,1.0,0.95) + uChiaro;
             diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.80, 0.78, 0.74), uCarta * 0.8);`).replace('#include <normal_fragment_begin>',
            `#include <normal_fragment_begin>
             normal = normalize(mix(normal, normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz), 0.55 + uCarta * 0.37));`);
        };
        o.material = m; ortoMat.push(m);
        o.receiveShadow = true; o.castShadow = false;
      } else if (/edifici/.test(o.name)) {
        o.material = M.vicini; o.castShadow = true; o.receiveShadow = true; ombreggianti.push(o);
      }
    });
    scena.add(contesto.scene);
    // il cantiere spiana il lotto: dentro il perimetro il terreno del rilievo (2009) scende al livello del giardino
    const L = ctxInfo?.lotto_mondo, Y = ctxInfo?.pianta_mondo?.ty;
    if (L && Y != null) {
      const poly = L.map(([x, , z]) => [x, z]);
      const dentro = (x, z) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) c = !c; } return c; };
      const vicino = (x, z) => dentro(x, z) || dentro(x + 1.6, z) || dentro(x - 1.6, z) || dentro(x, z + 1.6) || dentro(x, z - 1.6);
      contesto.scene.traverse((o) => {
        if (!o.isMesh || !/terreno_core/.test(o.name)) return;
        o.updateMatrixWorld(true);
        const pos = o.geometry.attributes.position; const v = new THREE.Vector3(); const inv = o.matrixWorld.clone().invert();
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
          if (vicino(v.x, v.z)) { v.y = Y - 0.12; v.applyMatrix4(inv); pos.setY(i, v.y); }
        }
        pos.needsUpdate = true; o.geometry.computeVertexNormals(); o.geometry.computeBoundingSphere();
      });
    }
  } else {
    const suolo = new THREE.Mesh(new THREE.CircleGeometry(600, 64), new THREE.MeshStandardMaterial({ color: '#d9d4c8', roughness: 1 }));
    suolo.rotation.x = -Math.PI / 2; suolo.position.y = 16; suolo.receiveShadow = true; scena.add(suolo);
  }
  const mare = new THREE.Mesh(new THREE.PlaneGeometry(30000, 30000), M.mare);
  mare.rotation.x = -Math.PI / 2; mare.position.y = 0.02; mare.receiveShadow = true;
  scena.add(mare);

  // alberi (chiome dal modello di altezza della vegetazione, 1 m)
  if (alberiDati && alberiDati.length) {
    const geo = new THREE.IcosahedronGeometry(1, 1);
    const inst = new THREE.InstancedMesh(geo, M.alberi, alberiDati.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
    alberiDati.forEach(([x, z, y, h, r], i) => {
      let rr = Math.max(1.4, Math.min(r, 9)); const hh = Math.max(3, h);
      rr *= 0.82;
      s.set(rr, Math.max(rr * 0.75, (hh * 0.42)), rr);
      p.set(x, y + hh - s.y * 0.9, z);
      q.setFromEuler(new THREE.Euler(0, (i * 1.7) % 6.28, 0));
      m4.compose(p, q, s); inst.setMatrixAt(i, m4);
      col.setHSL(0.24 + ((i * 37) % 10) / 300, 0.16, 0.5 + ((i * 13) % 10) / 120); inst.setColorAt(i, col);
    });
    inst.castShadow = true; inst.receiveShadow = true;
    scena.add(inst); ombreggianti.push(inst);
  }

  // ---------------------------------------------------------------- l'edificio
  const casa = edificio.scene;
  const pezzi = {}; // nome -> mesh
  casa.traverse((o) => {
    if (!o.isMesh) return;
    // gltfpack mette la mesh in un nodo figlio («mesh_12»): il nome vero sta sul padre
    if (o.parent && o.parent.name && o.parent.name !== 'world' && (!o.name || /^mesh_\d+$/.test(o.name))) o.name = o.parent.name;
    pezzi[o.name] = o;
    const n = o.name;
    o.castShadow = !/^vol_|^pianta_|vetri/.test(n);
    o.receiveShadow = true;
    if (/^vol_/.test(n)) { o.material = M.volume.clone(); o.renderOrder = 5; o.castShadow = false; }
    else if (/^pianta_/.test(n)) { o.visible = false; }
    else if (/vetri/.test(n)) o.material = M.vetro;
    else if (/telai|ringhiere|scossalina|linda|_tel$/.test(n)) o.material = M.scuro;
    else if (/oscuri/.test(n)) o.material = M.legno;
    else if (/fotovoltaico$/.test(n)) o.material = M.fv;
    else if (/fondazione|vespaio/.test(n)) o.material = M.cls;
    else if (/f7_lotto/.test(n)) o.material = M.drenante;
    else if (/f7_prato/.test(n)) o.material = M.prato;
    else if (/f7_pavimenti/.test(n)) o.material = M.pietra;
    else if (/f7_siepi/.test(n)) o.material = M.siepe;
    else if (/f7_alberi/.test(n)) o.material = M.chioma;
    else if (/f7_tronchi/.test(n)) o.material = M.tronco;
    else o.material = M.intonaco;
    if (!/^vol_|^pianta_/.test(n)) { o.material = o.material.clone(); o.userData.colore = o.material.color.clone(); }
    // taglio «casa di bambola» per piano
    if (/_terra$|pianta_u[1-4]|vol_u[1-4]/.test(n)) o.userData.piano = 'terra';
    if (/_primo$|pianta_u[5-8]|vol_u[5-8]/.test(n)) o.userData.piano = 'primo';
  });
  // posizione nel mondo: dal piano del progettista alla carta (contesto.json → pianta)
  const T = ctxInfo?.pianta_mondo;
  if (T) {
    casa.rotation.y = T.rotY;              // radianti
    casa.position.set(T.tx, T.ty, T.tz);   // m
  } else {
    const b = new THREE.Box3().setFromObject(casa); const c = b.getCenter(new THREE.Vector3());
    casa.position.set(-c.x, 17.4, -c.z);
  }
  scena.add(casa);
  casa.updateMatrixWorld(true);
  const centro = new THREE.Box3().setFromObject(pezzi.f4_copertura || casa).getCenter(new THREE.Vector3());
  centro.y = casa.position.y + 2.6;

  // pavimenti disegnati (piante del DWG)
  const texLoader = new THREE.TextureLoader();
  for (const n of ['1', '2', '3', '4', '5', '6', '7', '8']) {
    const m = pezzi['pianta_u' + n]; if (!m) continue;
    texLoader.load(base + '3d/pav_u' + n + '.jpg', (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; m.material = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 }); });
  }

  // i gruppi per le fasi del cantiere
  const FASI = [
    { k: 'fondazione', re: /^f1_/ },
    { k: 'xlam', re: /^f2_(muri|architravi|scala|pilastri)/ },
    { k: 'solai', re: /^f2_solaio/ },
    { k: 'cappotto', re: null },
    { k: 'serramenti', re: /^f3_/ },
    { k: 'oscuri', re: /^f5_/ },
    { k: 'copertura', re: /^f4_|^f6_/ },
    { k: 'esterni', re: /^f7_/ },
  ];
  const strutturali = Object.values(pezzi).filter((m) => /^f2_(muri|architravi|scala|pilastri|solaio)|^f4_copertura/.test(m.name));

  // il perimetro del lotto, disegnato sul terreno
  let lotto = null;
  if (ctxInfo?.lotto_mondo) {
    const pts = ctxInfo.lotto_mondo.map(([x, y, z]) => new THREE.Vector3(x, y + 0.25, z));
    pts.push(pts[0].clone());
    lotto = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), M.lotto);
    scena.add(lotto);
  }

  // ---------------------------------------------------------------- etichette dei luoghi
  const strato = document.querySelector('.etichette3d');
  const etichette = [];
  function etichetta(testo, sotto, pos, cls = '') {
    const el = document.createElement('div');
    el.className = 'et3d ' + cls;
    el.innerHTML = '<b></b>' + (sotto ? '<small></small>' : '');
    el.querySelector('b').textContent = testo;
    if (sotto) el.querySelector('small').textContent = sotto;
    strato.appendChild(el);
    const e = { el, pos: pos.clone(), gruppo: cls };
    etichette.push(e); return e;
  }
  const luoghi = (dati.luoghi || []).filter((l) => l.mondo);
  for (const l of luoghi) l.et = etichetta(l.nome, l.sotto, new THREE.Vector3(...l.mondo), 'luogo');
  const casaEt = etichetta(dati.testi.qui, dati.testi.quiSotto, centro.clone().add(new THREE.Vector3(0, 12, 0)), 'et3d--casa qui');
  const unitaEt = {};
  for (const u of dati.unita) {
    const v = pezzi['vol_u' + u.n]; if (!v) continue;
    const bb = new THREE.Box3().setFromObject(v); const c = bb.getCenter(new THREE.Vector3());
    // piano terra: l'etichetta sta a metà della facciata; primo piano: sopra il tetto
    c.y = u.piano === 'terra' ? bb.min.y + 1.4 : bb.max.y + 1.6;
    unitaEt[u.n] = etichetta(u.n, u.venduta ? dati.testi.venduta : u.prezzoBreve, c, 'unita');
  }
  const gruppiVisibili = new Set();
  function aggiornaEtichette() {
    const w = tela.clientWidth, h = tela.clientHeight; const v = new THREE.Vector3();
    for (const e of etichette) {
      const on = gruppiVisibili.has(e.gruppo.split(' ').pop());
      if (!on) { e.el.classList.remove('vista'); continue; }
      v.copy(e.pos).project(camera);
      const dentro = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
      e.el.classList.toggle('vista', dentro);
      if (dentro) e.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px) translate(-50%, -100%)`;
    }
  }

  // ---------------------------------------------------------------- sole
  const statoSole = { anno: new Date().getFullYear(), giorno: 172, minuti: 16 * 60 };
  function impostaSole(anno, giorno, minuti, forza = false) {
    Object.assign(statoSole, { anno, giorno, minuti });
    const p = posizioneSole(istante(anno, giorno, minuti), lat, lon);
    const d = versoSole(Math.max(p.alt, -4), p.az);
    sole.position.set(centro.x + d[0] * 300, centro.y + d[1] * 300, centro.z + d[2] * 300);
    sole.target.position.copy(centro);
    const giorno01 = clamp((p.alt + 4) / 30);
    const tramonto = clamp(1 - Math.abs(p.alt - 4) / 14);
    sole.intensity = p.alt > 0 ? lerp(0.6, 2.8, clamp(p.alt / 35)) : 0;
    sole.color.setHSL(0.09, lerp(0.15, 0.85, tramonto), lerp(0.93, 0.68, tramonto));
    emi.intensity = lerp(0.18, 0.95, giorno01);
    cieloU.alto.value.setHSL(0.56, 0.32, lerp(0.07, 0.5, giorno01));
    cieloU.orizzonte.value.setHSL(lerp(0.58, 0.08, tramonto), lerp(0.12, 0.55, tramonto), lerp(0.16, 0.85, giorno01));
    cieloU.sole.value.set(d[0], d[1], d[2]);
    scena.fog.color.copy(cieloU.orizzonte.value);
    M.mare.color.setHSL(0.53, 0.42, lerp(0.07, 0.26, giorno01));
    renderer.shadowMap.needsUpdate = true;
    return p;
  }
  // inquadratura dell'ombra: attorno al lotto
  const sc = sole.shadow.camera; sc.left = -90; sc.right = 90; sc.top = 90; sc.bottom = -90; sc.near = 50; sc.far = 700; sc.updateProjectionMatrix();

  // ---------------------------------------------------------------- inquadrature
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const drone = ctxInfo?.drone_0755;
  const POSE = {
    drone: drone ? { pos: V(...drone.position), tgt: V(...drone.target), fov: drone.fov, up: V(...drone.up), foto: true } : { pos: centro.clone().add(V(150, 180, -160)), tgt: centro.clone().add(V(-120, -10, 160)), fov: 46 },
    luogo: { pos: V(330, 430, -310), tgt: V(-150, 25, 150), fov: mobile ? 52 : 40 },
    vicino: { pos: centro.clone().add(V(46, 26, 62)), tgt: centro.clone(), fov: mobile ? 48 : 34 },
    costruzione: { pos: centro.clone().add(V(44, 30, 56)), tgt: centro.clone().add(V(0, -1, 0)), fov: mobile ? 50 : 34 },
    luce: { pos: centro.clone().add(V(-24, 92, 84)), tgt: centro.clone().add(V(0, -2, 0)), fov: mobile ? 52 : 38 },
    case: { pos: centro.clone().add(V(22, 34, 74)), tgt: centro.clone().add(V(0, -1, 0)), fov: mobile ? 52 : 34 },
    casaPiano: { pos: centro.clone().add(V(8, 72, 46)), tgt: centro.clone().add(V(0, -1, 2)), fov: mobile ? 52 : 34 },
  };
  if (mobile) for (const k of ['vicino', 'costruzione', 'luce', 'case', 'casaPiano']) POSE[k].pos.add(POSE[k].pos.clone().sub(POSE[k].tgt).multiplyScalar(0.45));

  const SU = V(0, 1, 0);
  for (const k in POSE) if (!POSE[k].up) POSE[k].up = SU;
  const cam = { pos: POSE.drone.pos.clone(), tgt: POSE.drone.tgt.clone(), fov: POSE.drone.fov, up: POSE.drone.up.clone(), foto: 1 };
  // dove deve cadere il centro dell'inquadratura: a destra dei pannelli (schermo largo) o sopra (telefono)
  const SPOSTA = { luce: [0.16, 0], case: [0.17, 0] };
  const SPOSTA_MOBILE = { luce: [0, 0.26], case: [0, 0.22], costruzione: [0, 0.12], sorge: [0, 0.2] };
  const spost = { x: 0, y: 0, ax: 0, ay: 0 };
  let volo = null; // { da, a, t0, durata }
  function vola(nome, durata = 1800) {
    const a = POSE[nome]; if (!a) return;
    if (!a.up) a.up = SU;
    if (ridotto) durata = 1;
    volo = { da: { pos: cam.pos.clone(), tgt: cam.tgt.clone(), fov: cam.fov, up: cam.up.clone(), foto: cam.foto }, a, t0: performance.now(), durata };
  }
  function posa(nome) { const a = POSE[nome]; cam.pos.copy(a.pos); cam.tgt.copy(a.tgt); cam.fov = a.fov; cam.up.copy(a.up); cam.foto = a.foto ? 1 : 0; volo = null; }

  // controlli (solo con il mouse): si accendono nei capitoli interattivi
  let controlli = null;
  if (fine) {
    controlli = new OrbitControls(camera, renderer.domElement);
    controlli.enableDamping = true; controlli.dampingFactor = 0.08; controlli.enablePan = false;
    controlli.minDistance = 25; controlli.maxDistance = 260; controlli.maxPolarAngle = Math.PI * 0.47;
    controlli.enableZoom = false; // la rotella fa scorrere la pagina, non zooma
    controlli.enabled = false;
    controlli.addEventListener('start', () => { volo = null; giro.attivo = false; });
  }
  const giro = { attivo: false, ang: 0 };
  let altezzaFoto = 0;

  // ---------------------------------------------------------------- stati
  const stato = { nome: null, sorgi: 1, fase: 8, piano: null, scelta: null, sopra: null };
  // la picchiata: dal punto del drone fin sopra il lotto, mentre l'edificio sorge (legata allo scorrimento)
  const avanti = POSE.drone.tgt.clone().sub(POSE.drone.pos).normalize();
  const VICINO = { pos: centro.clone().sub(avanti.clone().multiplyScalar(mobile ? 120 : 92)).add(V(0, 6, 0)), tgt: centro.clone().add(V(0, -1, 0)), fov: mobile ? 50 : 38, up: SU };
  function picchiata(t) {
    const e = t * t * (3 - 2 * t);
    volo = null;
    cam.pos.lerpVectors(POSE.drone.pos, VICINO.pos, e); cam.tgt.lerpVectors(POSE.drone.tgt, VICINO.tgt, e);
    cam.up.lerpVectors(POSE.drone.up, VICINO.up, e).normalize(); cam.fov = lerp(POSE.drone.fov, VICINO.fov, e);
    cam.foto = e < 0.002 ? 1 : 0;
  }
  function sorgi(t) { // l'edificio che sorge dal lotto vuoto
    stato.sorgi = t;
    if (stato.nome === 'sorge') picchiata(clamp(t));
    const k = Math.max(0.0001, ease(clamp(t)));
    casa.scale.set(1, k, 1);
    casa.visible = t > 0.001;
    renderer.shadowMap.needsUpdate = true;
  }
  function fase(i) { // 0..8: quante fasi del cantiere sono fatte
    stato.fase = i;
    for (const m of Object.values(pezzi)) {
      if (/^vol_|^pianta_/.test(m.name)) continue;
      let idx = FASI.findIndex((f) => f.re && f.re.test(m.name));
      if (idx < 0) idx = 1;
      m.visible = i > idx;
    }
    const cappotto = i > 3;
    for (const m of strutturali) m.material.color.copy(cappotto ? m.userData.colore : M.xlam.color);
    renderer.shadowMap.needsUpdate = true;
  }
  function piano(p) { // null = tutto; 'terra' | 'primo' = casa di bambola
    stato.piano = p;
    const y0 = casa.position.y;
    clipPT.constant = 1e5; clipP1.constant = 1e5;
    for (const m of Object.values(pezzi)) {
      const pi = m.userData.piano;
      if (/^vol_/.test(m.name)) continue;
      if (/^pianta_/.test(m.name)) { m.visible = !!p && pi === p; continue; }
      if (p === 'terra') {
        const sopra = pi === 'primo' || /f2_solaio_p1|f4_|f6_|f5_|f3_ringhiere/.test(m.name);
        m.visible = !sopra;
        m.material.clippingPlanes = pi === 'terra' ? [clipPT] : null;
      } else if (p === 'primo') {
        const sopra = /f4_|f6_/.test(m.name);
        m.visible = !sopra;
        m.material.clippingPlanes = (pi === 'primo' || /f5_oscuri/.test(m.name)) ? [clipP1] : null;
      } else {
        m.visible = true; m.material.clippingPlanes = null;
      }
    }
    if (p === 'terra') clipPT.constant = y0 + 0.15 + 1.35;
    if (p === 'primo') clipP1.constant = y0 + 3.10 + 1.35;
    for (const u of dati.unita) {
      const v = pezzi['vol_u' + u.n]; if (!v) continue;
      v.visible = !p || v.userData.piano === p;
    }
    renderer.shadowMap.needsUpdate = true;
    // etichette: solo quelle del piano scelto
    for (const u of dati.unita) { const e = unitaEt[u.n]; if (e) e.el.style.display = (!p || u.piano === p) ? '' : 'none'; }
    if (stato.nome === 'case') vola(p ? 'casaPiano' : 'case', 1200);
    evidenzia();
  }
  function evidenzia() {
    for (const u of dati.unita) {
      const v = pezzi['vol_u' + u.n]; if (!v) continue;
      let o = 0;
      if (stato.nome === 'case') {
        o = u.venduta ? 0.0 : 0.16;
        if (stato.sopra === u.n) o = u.venduta ? 0.12 : 0.42;
        if (stato.scelta === u.n) o = 0.55;
      }
      v.material.opacity = o;
      v.material.color.set(u.venduta ? '#9aa4a6' : '#f3c98b');
      v.material.depthTest = !(stato.piano);
    }
  }

  // da vicino il paese si fa da parte: case e chiome intorno diventano velate (non nel capitolo del sole)
  let velo = 1, veloA = 1, carta = 0, cartaA = 0;
  function vela(v) {
    veloA = v;
    for (const o of ombreggianti) o.castShadow = v > 0.5;
    renderer.shadowMap.needsUpdate = true;
  }
  function aggiornaVelo(dt) {
    const k = Math.min(1, dt * 3.5);
    velo += (veloA - velo) * k; carta += (cartaA - carta) * k;
    for (const m of [M.vicini, M.alberi]) { m.opacity = velo; m.depthWrite = velo > 0.98; }
    for (const m of ortoMat) if (m.userData.sh) { m.userData.sh.uniforms.uSat.value = lerp(0.6, 0.2, carta); m.userData.sh.uniforms.uChiaro.value = lerp(0.07, 0.05, carta); m.userData.sh.uniforms.uCarta.value = carta; }
  }
  function imposta(nome, opz = {}) {
    if (stato.nome === nome && !opz.forza) return;
    const prima = stato.nome; stato.nome = nome;
    gruppiVisibili.clear();
    if (controlli) controlli.enabled = (nome === 'luce' || nome === 'case');
    giro.attivo = false;
    if (lotto) M.lotto.opacity = (nome === 'drone' || nome === 'sorge') ? 0.95 : 0;
    if (nome === 'drone' || nome === 'sorge') {
      gruppiVisibili.add('qui');
      if (nome === 'drone') { if (prima == null || prima === 'sorge') posa('drone'); else vola('drone', 1400); }
      fase(8); piano(null);
    }
    if (nome === 'luogo') { gruppiVisibili.add('luogo'); gruppiVisibili.add('qui'); vola('luogo', 2400); sorgi(1); fase(8); piano(null); setTimeout(() => { if (stato.nome === 'luogo' && !ridotto) giro.attivo = true; }, 2500); }
    if (nome === 'costruzione') { vola('costruzione', 1800); sorgi(1); piano(null); giro.attivo = !ridotto; }
    if (nome === 'luce') { vola('luce', 1800); sorgi(1); fase(8); piano(null); }
    if (nome === 'case') { gruppiVisibili.add('unita'); vola('case', 1800); sorgi(1); fase(8); piano(stato.piano || null); }
    const sp = (mobile ? SPOSTA_MOBILE : SPOSTA)[nome] || [0, 0]; spost.ax = sp[0]; spost.ay = sp[1];
    vela(nome === 'costruzione' || nome === 'case' ? 0.16 : 1);
    cartaA = (nome === 'costruzione' || nome === 'case' || nome === 'luce') ? 1 : 0;
    if (nome !== 'luce') impostaSole(statoSole.anno, 172, 17 * 60 + 10);
    evidenzia();
  }

  // ---------------------------------------------------------------- scelta delle unità col puntatore
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  const volumi = () => dati.unita.map((u) => pezzi['vol_u' + u.n]).filter((v) => v && v.visible);
  function colpita(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const h = ray.intersectObjects(volumi(), false)[0];
    return h ? h.object.name.replace('vol_u', '') : null;
  }
  let pressione = null;
  renderer.domElement.addEventListener('pointermove', (ev) => {
    if (stato.nome !== 'case') return;
    const n = colpita(ev);
    if (n !== stato.sopra) { stato.sopra = n; evidenzia(); renderer.domElement.style.cursor = n ? 'pointer' : ''; api.onSopra && api.onSopra(n); }
  });
  renderer.domElement.addEventListener('pointerdown', (ev) => { pressione = { x: ev.clientX, y: ev.clientY }; });
  renderer.domElement.addEventListener('pointerup', (ev) => {
    if (stato.nome !== 'case' || !pressione) return;
    if (Math.hypot(ev.clientX - pressione.x, ev.clientY - pressione.y) > 6) return;
    const n = colpita(ev); if (n) api.onScelta && api.onScelta(n);
  });

  // ---------------------------------------------------------------- ciclo
  function ridimensiona() {
    const w = tela.clientWidth, h = tela.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  addEventListener('resize', ridimensiona);
  let attiva = true, ultimo = performance.now();
  function ciclo(t) {
    requestAnimationFrame(ciclo);
    if (!attiva || document.hidden) return;
    const dt = Math.min(0.05, (t - ultimo) / 1000); ultimo = t;
    if (volo) {
      const k = ease(clamp((t - volo.t0) / volo.durata));
      cam.pos.lerpVectors(volo.da.pos, volo.a.pos, k); cam.tgt.lerpVectors(volo.da.tgt, volo.a.tgt, k); cam.fov = lerp(volo.da.fov, volo.a.fov, k);
      cam.up.lerpVectors(volo.da.up, volo.a.up, k).normalize(); cam.foto = lerp(volo.da.foto, volo.a.foto ? 1 : 0, k);
      if (k >= 1) volo = null;
      if (controlli) controlli.target.copy(cam.tgt);
      camera.position.copy(cam.pos);
    } else if (giro.attivo) {
      const off = cam.pos.clone().sub(cam.tgt); off.applyAxisAngle(new THREE.Vector3(0, 1, 0), dt * 0.05); cam.pos.copy(cam.tgt).add(off);
      camera.position.copy(cam.pos);
    } else if (controlli && controlli.enabled) {
      controlli.update(); cam.pos.copy(camera.position); cam.tgt.copy(controlli.target);
    } else {
      camera.position.copy(cam.pos);
    }
    aggiornaVelo(dt);
    spost.x += (spost.ax - spost.x) * Math.min(1, dt * 3); spost.y += (spost.ay - spost.y) * Math.min(1, dt * 3);
    const w = tela.clientWidth, h = tela.clientHeight, A = w / h, F = 16 / 9;
    if (cam.foto > 0.999) {
      // come object-fit: cover della foto d'apertura (object-position 50% 62%; sul telefono il taglio verticale
      // centrato al 52%). Il ritaglio si calcola sull'altezza vera della foto (hp), che sul telefono può essere
      // più bassa della tela (barra del browser).
      const hp = altezzaFoto || h, Ap = w / hp;
      camera.aspect = F;
      if (Ap >= F) { const fh = w / F; camera.setViewOffset(w, fh, 0, (fh - hp) * 0.62, w, h); }
      else { const fw = hp * F; const cx = Ap < 0.8 ? (drone?.centro_verticale ?? 0.52) : 0.5; camera.setViewOffset(fw, hp, Math.max(0, Math.min(fw - w, cx * fw - w / 2)), 0, w, h); }
    } else {
      camera.aspect = A;
      if (Math.abs(spost.x) > 0.001 || Math.abs(spost.y) > 0.001) camera.setViewOffset(w, h, -spost.x * w, spost.y * h, w, h);
      else if (camera.view && camera.view.enabled) camera.clearViewOffset();
      else camera.updateProjectionMatrix();
    }
    if (Math.abs(camera.fov - cam.fov) > 0.01) { camera.fov = cam.fov; camera.updateProjectionMatrix(); }
    camera.up.copy(cam.up);
    camera.lookAt(cam.tgt);
    renderer.render(scena, camera);
    aggiornaEtichette();
  }

  impostaSole(statoSole.anno, 172, 17 * 60 + 10);
  ambiente();
  imposta('drone');
  sorgi(0);
  requestAnimationFrame(ciclo);
  onPronta && onPronta();

  const api = {
    imposta, sorgi, fase, piano, impostaSole,
    attiva: (on) => { attiva = on; },
    scegli: (n) => { stato.scelta = n; evidenzia(); },
    sopra: (n) => { stato.sopra = n; evidenzia(); },
    vola, posa,
    altezzaFoto: (v) => { altezzaFoto = v; },
    guardaUnita(n) {
      const v = pezzi['vol_u' + n]; if (!v) return;
      const c = new THREE.Box3().setFromObject(v).getCenter(new THREE.Vector3());
      POSE.unita = { pos: c.clone().add(new THREE.Vector3(14, 30, 34).multiplyScalar(mobile ? 1.5 : 1)), tgt: c, fov: mobile ? 50 : 34 };
      vola('unita', 1200);
    },
    saturazione(v) { for (const m of ortoMat) if (m.userData.sh) m.userData.sh.uniforms.uSat.value = v; },
    renderer, scena, camera, pezzi, ctxInfo, centro,
  };
  return api;
}
