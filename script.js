// Plotting parameters
const canvas = document.getElementById('simulationCanvas');
canvas.width = 1000;
canvas.height = 550;
const ctx = canvas.getContext('2d');
const scaling = 200; // Scaling factor for converting meters to pixels

//Simulation/plotting variables
const h = 1 / 120; // Fixed stepsize for simulation and animation
const l = 1; // Length of the pendulum
let time = 0;
let mouse_active = false;
let codeInvalid = false;
const codeInput = document.getElementById('codeInput');

// State variables
let state = [canvas.width / 2 / scaling, 0, 0 * Math.PI, 0]; // Initial state [x, x_dot, phi, phi_dot]
let mouse_x = 0; // Target position for the cart
let mouse_y = 0; // Target position for the pendulum
let force_ext = 0; // External force acting on the cart
let force_pend_x = 0; // External force acting on the pendulum in x direction
let force_pend_y = 0; // External force acting on the pendulum in y direction
let total_energy = 0;

// Variables for Swing-up sequence
let swingUpSequence = false;
let timer = 0;

// Event Listener for Mouse Movement
canvas.addEventListener('mousemove', (event) => {
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;

  // Check if mouse is within the bounds of the canvas
  mouse_active = mouseX >= 10 && mouseX <= canvas.width - 10 && mouseY >= 10 && mouseY <= canvas.height - 200;
  mouse_x = (event.clientX - rect.left) / scaling; // Get mouse position relative to canvas
  mouse_y = 1.5 - (event.clientY - rect.top) / scaling; // Get mouse position relative to canvas
});

// Updates the physics of the system one step forward bringing together userinput and the physics of the system
function updatePhysics() {
  let [x, x_dot, phi, phi_dot] = state;
  const userCode = codeInput.value;
  try {
    eval(userCode);
    codeInvalid = false;
  } catch (e) {
    console.error('Error evaluating user code:', e);
    codeInvalid = true;
    force_ext = 0;
  }

  let pendulumX = x + l * Math.sin(phi);
  let pendulumX_dot = x_dot + l * phi_dot * Math.cos(phi);
  let pendulumY = -l * Math.cos(phi);
  let pendulumY_dot = l * phi_dot * Math.sin(phi);

  if (mouse_active) {
    force_pend_x = 1000 * (mouse_x - pendulumX) - 100 * pendulumX_dot;
    force_pend_y = 1000 * (mouse_y - pendulumY) - 100 * pendulumY_dot;
  } else {
    force_pend_x = 0;
    force_pend_y = 0;
  }

  time += h;

  state = rungeKuttaStep(state, force_ext, h);
}

// Runge-Kutta integration for the system dynamics
function rungeKuttaStep(state, force_ext, h) {
  let k1 = dynamics(state, force_ext);
  let k2 = dynamics(state.map((val, i) => val + (h / 2) * k1[i]), force_ext);
  let k3 = dynamics(state.map((val, i) => val + (h / 2) * k2[i]), force_ext);
  let k4 = dynamics(state.map((val, i) => val + h * k3[i]), force_ext);
  let new_state = state.map((val, i) => val + (h / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));

  // Normalize phi to [0, 2*pi]
  if (new_state[2] > 2 * Math.PI) {
    new_state[2] -= 2 * Math.PI;
  }
  if (new_state[2] < 0) {
    new_state[2] += 2 * Math.PI;
  }
  return new_state;
}

// System dynamics
function dynamics(state, force_ext) {
  const g = 9.81; // Gravitational acceleration
  const mc = 10; // Mass of the cart
  const mp = 1; // Mass of the pendulum
  const damping_x = 0.03; // Damping coefficient for the cart
  const damping_phi = 0.05; // Damping coefficient for the pendulum

  let [x, x_dot, phi, phi_dot] = state;

  total_energy = (mp * Math.pow(x_dot + l * phi_dot * Math.cos(phi), 2)) / 2 + (mc * Math.pow(x_dot, 2)) / 2 + (Math.pow(l, 2) * mp * Math.pow(phi_dot, 2) * Math.pow(Math.sin(phi), 2)) / 2 - g * l * mp * (Math.cos(phi) - 1);

  let x_ddot = (force_ext * l + damping_phi * phi_dot * Math.cos(phi) - (force_pend_y * l * Math.sin(2 * phi)) / 2 - damping_x * l * x_dot + l ** 2 * mp * phi_dot ** 2 * Math.sin(phi) + (g * l * mp * Math.sin(2 * phi)) / 2) 
              / (l * (-mp * Math.cos(phi) ** 2 + mc + mp));
  
  let phi_ddot = -(damping_phi * mc * phi_dot + damping_phi * mp * phi_dot + (l ** 2 * mp ** 2 * phi_dot ** 2 * Math.sin(2 * phi)) / 2 - force_pend_x * l * mc * Math.cos(phi) + force_ext * l * mp * Math.cos(phi) - force_pend_y * l * mc * Math.sin(phi) - force_pend_y * l * mp * Math.sin(phi) + g * l * mp ** 2 * Math.sin(phi) - damping_x * l * mp * x_dot * Math.cos(phi) + g * l * mc * mp * Math.sin(phi)) 
              / (l ** 2 * mp * (-mp * Math.cos(phi) ** 2 + mc + mp));
    
  return [x_dot, x_ddot, phi_dot, phi_ddot];
}

// Example Feedback controller for the cart-pendulum system
function perfectFeedback() {
  let [x, x_dot, phi, phi_dot] = state;
  
  let x_des = 2.5;
  let phi_des = Math.PI;
  let delta_x = x_des - x;

  phi_des = phi_des - delta_x * 0.15;
  let phi_des_dot = x_dot * 0.6;

  let feedback = 0;

  // Normal mode
  if (Math.abs(phi - Math.PI) < Math.PI * 0.3) {
    feedback = 3000 * (phi_des - phi) + 600 * (phi_des_dot - phi_dot) + 130 * delta_x - 100 * x_dot;
  }

  // Stabelize pendulum when it fell down
  if (phi < Math.PI / 2 || phi > 3 * Math.PI / 2) {
    let phi_normed = phi;
    x_des = 0.2;
    if (phi > Math.PI) {
      phi_normed = phi - 2 * Math.PI;
    }
    feedback = 5 * (75 * (x_des - x) - 100 * x_dot + 200 * Math.sin(phi));
    if (Math.abs(phi_dot) < 0.05 && Math.abs(x_dot) < 0.05 && Math.abs(x - x_des) < 0.05) {
      swingUpSequence = true;
      timer = time;
    }
  }

  // Swing-up sequence
  if (swingUpSequence) {
    feedback = 0;
    if (time - timer < 0.2) {
      feedback = 350;
    } 
    if (time - timer > 0.3) {
      feedback = -350;
    }
    if (Math.abs(phi - Math.PI) < Math.PI * 0.3) {
      swingUpSequence = false;
    }
  }

  return feedback;
}

// Draw the cart-pendulum system into the canvas
function draw() { 
  let x = scaling * state[0];
  let phi = state[2];
  const y = 300;
  const l_plot = scaling * l;

  // Draw the cart
  ctx.fillStyle = 'grey';
  ctx.fillRect(x - 50, y, 100, 30);
  
  ctx.beginPath();
  ctx.arc(x - 30, y + 38, 10, 0, Math.PI * 2);
  ctx.fillStyle = 'grey';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(x + 30, y + 38, 10, 0, Math.PI * 2);
  ctx.fillStyle = 'grey';
  ctx.fill();

  // Plot street
  ctx.beginPath();
  ctx.moveTo(0, y + 50);
  ctx.lineTo(canvas.width, y + 50);
  ctx.strokeStyle = 'grey';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw the pendulum
  let pendulumX = x + l_plot * Math.sin(phi);
  let pendulumY = y + l_plot * Math.cos(phi);

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(pendulumX, pendulumY);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(pendulumX, pendulumY, 10, 0, Math.PI * 2);
  ctx.fillStyle = 'black';
  ctx.fill();

  // Draw external force
  ctx.beginPath();
  ctx.moveTo(x, y + 15);
  ctx.lineTo(x + force_ext, y + 15);
  ctx.strokeStyle = 'red';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Draw external force on pendulum
  ctx.beginPath();
  ctx.moveTo(pendulumX, pendulumY);
  ctx.lineTo(pendulumX + force_pend_x / 5, pendulumY - force_pend_y / 5);
  ctx.strokeStyle = 'orange';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Display the current state as text
  ctx.font = '16px Arial';
  ctx.fillStyle = 'black';
  const labels = ['x', 'x_dot', 'phi', 'phi_dot'];

  state.forEach((value, index) => {
    ctx.fillText(`${labels[index]}: ${value.toFixed(2)}`, 10, 20 * (index + 1));
  });
  // Display total energy
  ctx.fillText(`energy: ${total_energy.toFixed(2)}`, 10, 20 * (state.length + 1));
  // Display external force
  ctx.fillText(`force_ext: ${force_ext.toFixed(2)}`, 10, 20 * (state.length + 2));  
  // Display elapsed time
  ctx.fillText(`time: ${time.toFixed(2)} s`, 10, 20 * (state.length + 3));
  // Display code status
  if (codeInvalid) {
    ctx.fillStyle = 'red';
    ctx.fillText('Invalid code', 10, 20 * (state.length + 4));
  }
}

// Run simulation at fixed frequency h (e.g., 120 Hz)
setInterval(() => {
  updatePhysics();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  draw();
}, 1000 * h);
