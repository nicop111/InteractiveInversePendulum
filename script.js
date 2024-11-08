const canvas = document.getElementById('simulationCanvas');
const ctx = canvas.getContext('2d');

// Pendulum and Cart Parameters
let cartX = canvas.width / 2;
let cartY = 300;
let pendulumLength = 150;
let angle = Math.PI * 3/4; // Initial angle
let angleVelocity = 0;
let angleAcceleration = 0;
let gravity = 0.98;
let damping = 0.995; // Damping factor to slow motion
let cartMass = 1;
let pendulumMass = 0.1;

let targetCartX = cartX; // Target position for the cart
let cartVelocity = 0; // Cart velocity
let cartAcceleration = 0; // Cart acceleration

let lastUpdateTime = performance.now(); // Initialize with the current timestamp
let deltaTime = 0; // Time difference between frames in milliseconds

// Event Listener for Mouse Movement
canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  targetCartX = event.clientX - rect.left; // Get mouse position relative to canvas
});

function drawCart() {
  ctx.fillStyle = 'grey';
  ctx.fillRect(cartX - 50, cartY, 100, 30);
}

function drawPendulum() {
  let pendulumX = cartX + pendulumLength * Math.sin(angle);
  let pendulumY = cartY + pendulumLength * Math.cos(angle);
  
  ctx.beginPath();
  ctx.moveTo(cartX, cartY);
  ctx.lineTo(pendulumX, pendulumY);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  ctx.beginPath();
  ctx.arc(pendulumX, pendulumY, 10, 0, Math.PI * 2);
  ctx.fillStyle = 'black';
  ctx.fill();
}


function updatePhysics() {
  // daltatime
  const currentTime = performance.now();
  deltaTime = (currentTime - lastUpdateTime) / 1000; // Convert to seconds
  lastUpdateTime = currentTime;

  // Spring force to mouse
  let force_ext = 1000 * (targetCartX - cartX) - 100*cartVelocity;

  // Update dynamics (Euler forward)
  cartAcceleration = (
    Math.sin(angle) * Math.pow(angleVelocity, 2) * Math.pow(pendulumMass, 2) * pendulumLength +
    Math.sin(angle) * Math.pow(angleVelocity, 2) * pendulumMass * Math.pow(pendulumLength, 3) +
    gravity * Math.cos(angle) * Math.sin(angle) * Math.pow(pendulumMass, 2) * Math.pow(pendulumLength, 2) +
    force_ext * pendulumMass +
    force_ext * Math.pow(pendulumLength, 2)
  ) / (
    -Math.pow(Math.cos(angle), 2) * Math.pow(pendulumMass, 2) * Math.pow(pendulumLength, 2) +
    Math.pow(pendulumMass, 2) +
    pendulumMass * Math.pow(pendulumLength, 2) +
    cartMass * pendulumMass +
    cartMass * Math.pow(pendulumLength, 2)
  );
  
  angleAcceleration = -(
    pendulumMass * pendulumLength * (
      pendulumMass * pendulumLength * Math.cos(angle) * Math.sin(angle) * Math.pow(angleVelocity, 2) +
      force_ext * Math.cos(angle) +
      gravity * pendulumMass * Math.sin(angle) +
      cartMass * gravity * Math.sin(angle)
    )
  ) / (
    -Math.pow(Math.cos(angle), 2) * Math.pow(pendulumMass, 2) * Math.pow(pendulumLength, 2) +
    Math.pow(pendulumMass, 2) +
    pendulumMass * Math.pow(pendulumLength, 2) +
    cartMass * pendulumMass +
    cartMass * Math.pow(pendulumLength, 2)
  );
  
  cartVelocity += 0.7*cartAcceleration * deltaTime;
  angleVelocity += damping*angleAcceleration * deltaTime;

  cartX += cartVelocity * deltaTime;
  angle += angleVelocity * deltaTime;
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawCart();
  drawPendulum();
  updatePhysics();
  requestAnimationFrame(animate);
}

animate();
