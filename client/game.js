const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const uiContainer = document.getElementById('ui-container');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  width: 50,
  height: 50,
  color: 'blue',
  speed: 5,
  health: 100,
  hunger: 100,
};

const resources = [
  { x: 100, y: 100, width: 50, height: 50, color: 'green', type: 'wood' },
  { x: 500, y: 300, width: 50, height: 50, color: 'gray', type: 'stone' },
  { x: 200, y: 500, width: 50, height: 50, color: 'green', type: 'wood' },
];

const foods = [
  { x: 300, y: 150, width: 20, height: 20, color: 'red', type: 'berry' },
  { x: 600, y: 400, width: 20, height: 20, color: 'red', type: 'berry' },
];

const enemies = [
  { x: 400, y: 200, width: 40, height: 40, color: 'purple', speed: 2, health: 3 },
  { x: 700, y: 500, width: 40, height: 40, color: 'purple', speed: 2, health: 3 },
];

const grassPatches = [];
for (let i = 0; i < 50; i++) {
  grassPatches.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    width: Math.random() * 20 + 10,
    height: Math.random() * 20 + 10,
    color: `rgba(0, ${Math.random() * 100 + 100}, 0, 0.5)`,
  });
}

const inventory = {
  wood: 0,
  stone: 0,
  plank: 0,
  wall: 0,
  berry: 0,
};

const craftingRecipes = {
  plank: {
    wood: 1,
  },
  wall: {
    plank: 2,
  },
};

const gameTime = {
  day: true,
  time: 0,
  dayLength: 1000, // 1000 frames for a full day/night cycle
};

const tutorial = {
  message: 'Use WASD or Arrow Keys to move. Collect resources and press C or V to craft.',
  duration: 500, // 500 frames
  alpha: 1,
};

let score = 0;
let scoreTimer = 60; // Increase score every 60 frames (1 second)

let gameOver = false;

const sounds = {
  attack: new Audio('sounds/attack.wav'),
  eat: new Audio('sounds/eat.wav'),
  playerDamage: new Audio('sounds/player_damage.wav'),
  enemyDamage: new Audio('sounds/enemy_damage.wav'),
};

const keys = {};

window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key === 'c') {
    craft('plank');
  }
  if (e.key === 'v') {
    craft('wall');
  }
  if (e.key === 'e') {
    eat('berry');
  }
  if (e.key === ' ') {
    attack();
  }
  if (gameOver && e.key === 'r') {
    restartGame();
  }
});

window.addEventListener('keyup', (e) => {
  delete keys[e.key];
});

let hungerTimer = 200; // Decrease hunger every 200 frames

function update() {
  // Score
  scoreTimer--;
  if (scoreTimer <= 0) {
    score++;
    scoreTimer = 60;
  }

  // Day/night cycle
  gameTime.time++;
  if (gameTime.time >= gameTime.dayLength) {
    gameTime.time = 0;
    gameTime.day = !gameTime.day;
  }

  // Hunger and health logic
  hungerTimer--;
  if (hungerTimer <= 0) {
    player.hunger--;
    hungerTimer = 200;
  }

  if (player.hunger <= 0) {
    player.health--;
    player.hunger = 0;
  }

  if (player.health <= 0) {
    gameOver = true;
    player.health = 0;
  }

  if (keys['w'] || keys['ArrowUp']) {
    player.y -= player.speed;
  }
  if (keys['s'] || keys['ArrowDown']) {
    player.y += player.speed;
  }
  if (keys['a'] || keys['ArrowLeft']) {
    player.x -= player.speed;
  }
  if (keys['d'] || keys['ArrowRight']) {
    player.x += player.speed;
  }

  // Check for resource gathering
  for (let i = resources.length - 1; i >= 0; i--) {
    const resource = resources[i];
    if (
      player.x < resource.x + resource.width &&
      player.x + player.width > resource.x &&
      player.y < resource.y + resource.height &&
      player.y + player.height > resource.y
    ) {
      // Add resource to inventory
      inventory[resource.type]++;
      console.log(inventory);

      // Remove the resource
      resources.splice(i, 1);
    }
  }

  // Check for food gathering
  for (let i = foods.length - 1; i >= 0; i--) {
    const food = foods[i];
    if (
      player.x < food.x + food.width &&
      player.x + player.width > food.x &&
      player.y < food.y + food.height &&
      player.y + player.height > food.y
    ) {
      // Add food to inventory
      inventory[food.type]++;
      console.log(inventory);

      // Remove the food
      foods.splice(i, 1);
    }
  }
  // Update enemies
  enemies.forEach(enemy => {
    // Simple random movement
    enemy.x += (Math.random() - 0.5) * enemy.speed;
    enemy.y += (Math.random() - 0.5) * enemy.speed;
  });

  // Check for player attacking enemies
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    if (
      player.x < enemy.x + enemy.width &&
      player.x + player.width > enemy.x &&
      player.y < enemy.y + enemy.height &&
      player.y + player.height > enemy.y
    ) {
      player.health--;
      sounds.playerDamage.play();
    }
  }
}

function attack() {
  sounds.attack.play();
  for (let i = enemies.length - 1; i >= 0; i--) {
    const enemy = enemies[i];
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < player.width) {
      enemy.health--;
      if (enemy.health <= 0) {
        enemies.splice(i, 1);
      }
      sounds.enemyDamage.play();
    }
  }
}

function eat(food) {
  sounds.eat.play();
  if (inventory[food] > 0) {
    inventory[food]--;
    player.hunger += 20;
    if (player.hunger > 100) {
      player.hunger = 100;
    }
    console.log(`Eaten a ${food}. Hunger: ${player.hunger}`);
  } else {
    console.log(`You don't have any ${food} to eat.`);
  }
}

function craft(item) {
  const recipe = craftingRecipes[item];
  if (recipe) {
    let canCraft = true;
    for (const resource in recipe) {
      if (inventory[resource] < recipe[resource]) {
        canCraft = false;
        break;
      }
    }

    if (canCraft) {
      for (const resource in recipe) {
        inventory[resource] -= recipe[resource];
      }
      inventory[item]++;
      console.log(`Crafted ${item}!`, inventory);
    } else {
      console.log(`Not enough resources to craft ${item}.`);
    }
  } else {
    console.log(`Recipe for ${item} not found.`);
  }
}

function draw() {
  // Draw background
  ctx.fillStyle = '#6B8E23'; // A grassy green color
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw grass patches
  grassPatches.forEach(patch => {
    ctx.fillStyle = patch.color;
    ctx.fillRect(patch.x, patch.y, patch.width, patch.height);
  });

  // Draw player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x, player.y, player.width, player.height);

  // Draw resources
  resources.forEach(resource => {
    ctx.fillStyle = resource.color;
    ctx.fillRect(resource.x, resource.y, resource.width, resource.height);
  });

  // Darken screen at night
  if (!gameTime.day) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Draw food
  foods.forEach(food => {
    ctx.fillStyle = food.color;
    ctx.fillRect(food.x, food.y, food.width, food.height);
  });
  // Draw enemies
  enemies.forEach(enemy => {
    ctx.fillStyle = enemy.color;
    ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
  });
}

function drawTutorial() {
  if (tutorial.duration > 0) {
    ctx.save();
    ctx.globalAlpha = tutorial.alpha;
    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(tutorial.message, canvas.width / 2, 100);
    ctx.restore();
    tutorial.duration--;
    if (tutorial.duration < 100) {
      tutorial.alpha -= 0.01;
    }
  }
}

function updateUI() {
  let scoreText = `Score: ${score}<br><br>`;
  let timeText = `Time: ${gameTime.day ? 'Day' : 'Night'}<br><br>`;
  let statsText = `Health: ${player.health}<br>Hunger: ${player.hunger}<br><br>`;
  let inventoryText = 'Inventory:<br>';
  for (const item in inventory) {
    if (inventory[item] > 0) {
      inventoryText += `${item}: ${inventory[item]}<br>`;
    }
  }

  let craftingText = '<br>Crafting (key):<br>';
  for (const item in craftingRecipes) {
    craftingText += `${item} (c): `;
    const recipe = craftingRecipes[item];
    for (const resource in recipe) {
      craftingText += `${recipe[resource]} ${resource} `;
    }
    craftingText += '<br>';
  }

  uiContainer.innerHTML = scoreText + timeText + statsText + inventoryText + craftingText;
}

function drawGameOver() {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = 'white';
  ctx.font = '48px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Game Over', canvas.width / 2, canvas.height / 2 - 50);

  ctx.font = '24px Arial';
  ctx.fillText(`Your score: ${score}`, canvas.width / 2, canvas.height / 2);

  ctx.font = '18px Arial';
  ctx.fillText('Press R to Replay', canvas.width / 2, canvas.height / 2 + 50);
}

function restartGame() {
  player.health = 100;
  player.hunger = 100;
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;

  for (const item in inventory) {
    inventory[item] = 0;
  }

  resources.push(
    { x: 100, y: 100, width: 50, height: 50, color: 'green', type: 'wood' },
    { x: 500, y: 300, width: 50, height: 50, color: 'gray', type: 'stone' },
    { x: 200, y: 500, width: 50, height: 50, color: 'green', type: 'wood' }
  );

  foods.push(
    { x: 300, y: 150, width: 20, height: 20, color: 'red', type: 'berry' },
    { x: 600, y: 400, width: 20, height: 20, color: 'red', type: 'berry' }
  );

  enemies.push(
    { x: 400, y: 200, width: 40, height: 40, color: 'purple', speed: 2, health: 3 },
    { x: 700, y: 500, width: 40, height: 40, color: 'purple', speed: 2, health: 3 }
  );

  score = 0;
  gameOver = false;
  gameLoop();
}

function gameLoop() {
  if (gameOver) {
    drawGameOver();
    return;
  }
  // Game logic will go here
  update();

  // Draw game objects
  draw();
  drawTutorial();
  updateUI();
  
  requestAnimationFrame(gameLoop);
}

gameLoop();