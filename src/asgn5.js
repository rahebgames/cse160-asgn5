import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const textureLoader = new THREE.TextureLoader();
const objLoader = new OBJLoader();
const gltfLoader = new GLTFLoader();

const scene = new THREE.Scene();
const fov = 90;
const aspect = 2;  // the canvas default
const near = 0.1;
const far = 1000;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const emissionMaterial = new THREE.MeshStandardMaterial({
  emissive: 'rgb(255, 0, 0)',
  emissiveIntensity: 15
});
emissionMaterial.toneMapped = false;

// const orb1 = await objLoader.loadAsync('../assets/greatDodecahedron.obj');
// orb1.children[0].material = emissionMaterial;
// orb1.position.set(0, 0.8, 9);
// scene.add(orb1);

// const orb2 = await objLoader.loadAsync('../assets/greatDodecahedron.obj');
// orb2.children[0].material = emissionMaterial;
// orb2.position.set(0, 0.8, -9);
// scene.add(orb2);

const triGeometry = new THREE.BufferGeometry();
const triVertices = new Float32Array([
  // FRONT
  -0.5,-0.5,0.5, 0.5,-0.5,0.5, 0,0.5,0,
  // LEFT
  0,-0.5,-0.5, -0.5,-0.5,0.5, 0,0.5,0,
  // RIGHT
  0.5,-0.5,0.5, 0,-0.5,-0.5, 0,0.5,0,
  // BOTTOM
  -0.5,-0.5,0.5, 0,-0.5,-0.5, 0.5,-0.5,0.5
]);
triGeometry.setAttribute( 'position', new THREE.BufferAttribute( triVertices, 3 ) );

const tri1 = new THREE.Mesh( triGeometry, emissionMaterial );
tri1.position.set(0, 0.8, 11);
tri1.scale.set(2, 2, 2);
scene.add(tri1);

const tri2 = new THREE.Mesh( triGeometry, emissionMaterial );
tri2.position.set(0, 0.8, -11);
tri2.scale.set(2, 2, 2);
scene.add(tri2);

let rotationShapes = [tri1, tri2];

const gltf = await gltfLoader.loadAsync('../assets/monster.glb');
scene.add(gltf.scene);

const sphereRadius = 3;
const sphereWidthDivisions = 32;
const sphereHeightDivisions = 16;
const sphereGeo = new THREE.SphereGeometry(sphereRadius, sphereWidthDivisions, sphereHeightDivisions);
const sphereMat = new THREE.MeshPhongMaterial({
  map: textureLoader.load('../assets/sphereTexture.png')
});
const mesh = new THREE.Mesh(sphereGeo, sphereMat);
mesh.position.set(-sphereRadius - 1, sphereRadius + 2, 0);
scene.add(mesh);

const skyboxTexture = textureLoader.load(
  '../assets/skybox.png',
  () => {
    skyboxTexture.mapping = THREE.EquirectangularReflectionMapping;
    skyboxTexture.colorSpace = THREE.SRGBColorSpace;
    scene.background = skyboxTexture;
    scene.backgroundRotation.y = Math.PI;
  }
);

const boxGeometry = new THREE.BoxGeometry( 1, 1, 1 );

let orb;
let radius = 40.0;
let orbCount = 100.0;
let circleHeight = 47.5;

for (let x = -radius; x <= radius; x += (2.0 * radius) / orbCount) {
  if ( x == -radius || x >= radius - ((2.0 * radius) / orbCount) ) {
    orb = new THREE.Mesh(boxGeometry, emissionMaterial);
    orb.position.set(-50, Math.sqrt((radius * radius) - (x * x)) + circleHeight, x);
    orb.scale.set(4, 4, 4);
    scene.add(orb);
    rotationShapes.push(orb);

    orb = new THREE.Mesh(boxGeometry, emissionMaterial);
    orb.position.set(-50, -Math.sqrt((radius * radius) - (x * x)) + circleHeight, x);
    orb.scale.set(4, 4, 4);
    scene.add(orb);
    rotationShapes.push(orb);

  } else {
    orb = await objLoader.loadAsync('../assets/greatDodecahedron.obj');
    orb.children[0].material = emissionMaterial;
    orb.position.set(-50, Math.sqrt((radius * radius) - (x * x)) + circleHeight, x);
    scene.add(orb);
    rotationShapes.push(orb);

    orb = await objLoader.loadAsync('../assets/greatDodecahedron.obj');
    orb.children[0].material = emissionMaterial;
    orb.position.set(-50, -Math.sqrt((radius * radius) - (x * x)) + circleHeight, x);
    scene.add(orb);
    rotationShapes.push(orb);
  }
}

let color = 'rgb(255, 217, 0)';
let intensity = 2;
let light = new THREE.DirectionalLight(color, intensity);
light.position.set(-6, 0, 0);
light.lookAt(gltf.scene);
scene.add(light);

color = 0xFFFFFF;
intensity = 1;
light = new THREE.AmbientLight(color, intensity);
scene.add(light);

const skyColor = 'rgb(255, 217, 0)';
const groundColor = 'rgb(255, 0, 0)';
intensity = 100;
light = new THREE.HemisphereLight(skyColor, groundColor, intensity);
light.position.set(0, -6, 0);
light.lookAt(gltf.scene);
// scene.add(light);

camera.position.z = 18.92;
function updateCamera() {
  camera.updateProjectionMatrix();
}

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0, 0);
controls.rotateLeft(-0.5 * Math.PI);
//controls.rotateUp(-0.179 * Math.PI);
controls.rotateUp(-0.225 * Math.PI);
controls.update();

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.1, // strength
  50, // radius
  3.5  // threshold
);
composer.addPass(bloomPass);

function animate(time) {
  time *= 0.001;  // convert time to seconds

  for (let i = 0; i < rotationShapes.length; i++) {
    rotationShapes[i].rotation.x = time + i;
    rotationShapes[i].rotation.y = time + i;
  }
  renderer.render(scene, camera);
  composer.render();
}
renderer.setAnimationLoop(animate);
