// Premium Three.js Background Visualization
// Particle System with Connected Nodes

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.body.appendChild(renderer.domElement);
renderer.domElement.style.position = 'fixed';
renderer.domElement.style.top = '0';
renderer.domElement.style.left = '0';
renderer.domElement.style.zIndex = '0';
renderer.domElement.style.pointerEvents = 'none';

const particlesCount = 120;
const positions = new Float32Array(particlesCount * 3);
const velocities = new Float32Array(particlesCount * 3);

for(let i = 0; i < particlesCount * 3; i++) {
  positions[i] = (Math.random() - 0.5) * 10;
  velocities[i] = (Math.random() - 0.5) * 0.01;
}

const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const material = new THREE.PointsMaterial({
  color: 0xa78bfa,
  size: 0.05,
  transparent: true,
  opacity: 0.8
});

const points = new THREE.Points(geometry, material);
scene.add(points);

// Lines between particles
const lineMaterial = new THREE.LineBasicMaterial({
  color: 0x38bdf8,
  transparent: true,
  opacity: 0.1
});

const lineGeometry = new THREE.BufferGeometry();
const linePositions = new Float32Array(particlesCount * particlesCount * 6);
lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
scene.add(lines);

camera.position.z = 5;

let mouseX = 0;
let mouseY = 0;

window.addEventListener('mousemove', (e) => {
  mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
  mouseY = -(e.clientY / window.innerHeight - 0.5) * 2;
});

function animate() {
  requestAnimationFrame(animate);

  const pos = geometry.attributes.position.array;
  let lineIdx = 0;

  for(let i = 0; i < particlesCount; i++) {
    pos[i*3] += velocities[i*3];
    pos[i*3+1] += velocities[i*3+1];
    pos[i*3+2] += velocities[i*3+2];

    // Boundary check
    if(Math.abs(pos[i*3]) > 5) velocities[i*3] *= -1;
    if(Math.abs(pos[i*3+1]) > 5) velocities[i*3+1] *= -1;
    if(Math.abs(pos[i*3+2]) > 5) velocities[i*3+2] *= -1;

    // Check connections
    for(let j = i + 1; j < particlesCount; j++) {
      const dx = pos[i*3] - pos[j*3];
      const dy = pos[i*3+1] - pos[j*3+1];
      const dz = pos[i*3+2] - pos[j*3+2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

      if(dist < 1.5) {
        linePositions[lineIdx++] = pos[i*3];
        linePositions[lineIdx++] = pos[i*3+1];
        linePositions[lineIdx++] = pos[i*3+2];
        linePositions[lineIdx++] = pos[j*3];
        linePositions[lineIdx++] = pos[j*3+1];
        linePositions[lineIdx++] = pos[j*3+2];
      }
    }
  }

  geometry.attributes.position.needsUpdate = true;
  lineGeometry.attributes.position.needsUpdate = true;
  lineGeometry.setDrawRange(0, lineIdx / 3);

  // Subtle camera drift based on mouse
  camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05;
  camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.05;
  camera.lookAt(scene.position);

  renderer.render(scene, camera);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
