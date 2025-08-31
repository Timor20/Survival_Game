const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const topBar = document.getElementById('top-bar');
const playerStats = document.getElementById('player-stats');
const inventoryDisplay = document.getElementById('inventory-display');
const controlsDisplay = document.getElementById('controls-display');
const craftingMenu = document.getElementById('crafting-menu');
const chestMenu = document.getElementById('chest-menu');
const furnaceMenu = document.getElementById('furnace-menu');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const TILE_SIZE = 50;

const world = {
  resources: [],
  foods: [],
  enemies: [],
  grassPatches: [],
  walls: [],
  chests: [],
  furnaces: [],
};

const camera = {
  x: 0,
  y: 0,
  width: canvas.width,
  height: canvas.height,
};

const player = {
  x: 0,
  y: 0,
  width: TILE_SIZE,
  height: TILE_SIZE,
  speed: 3,
  health: 100,
  hunger: 100,
  damage: 1,
  buildSelection: 'wall',
  consumableSelection: 'berry',
};

function generateInitialWorld() {
  for (let i = 0; i < 100; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = TILE_SIZE + Math.random() * (canvas.width * 2);
    const x = player.x + Math.cos(angle) * radius;
    const y = player.y + Math.sin(angle) * radius;
    const type = Math.random();
    if (type < 0.5) {
      world.resources.push({ x, y, width: 50, height: 50, type: 'wood', health: 5, isHit: false });
    } else if (type < 0.8) {
      world.resources.push({ x, y, width: 50, height: 50, color: 'gray', type: 'stone', health: 8, isHit: false });
    } else if (type < 0.9) {
      world.resources.push({ x, y, width: 50, height: 50, color: '#A9A9A9', type: 'iron', health: 10, isHit: false });
    } else if (type < 0.95) {
      world.resources.push({ x, y, width: 50, height: 50, color: '#282828', type: 'coal', health: 8, isHit: false });
    } else {
      world.resources.push({ x, y, width: 50, height: 50, color: '#FFD700', type: 'gold', health: 12, isHit: false });
    }
  }
  for (let i = 0; i < 30; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = TILE_SIZE + Math.random() * canvas.width;
    world.foods.push({
      x: player.x + Math.cos(angle) * radius,
      y: player.y + Math.sin(angle) * radius,
      width: 20, height: 20, color: 'red', type: 'berry',
    });
  }
  for (let i = 0; i < 20; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = TILE_SIZE + Math.random() * canvas.width;
    world.foods.push({
      x: player.x + Math.cos(angle) * radius,
      y: player.y + Math.sin(angle) * radius,
      width: 20, height: 20, color: 'green', type: 'herb',
    });
  }
}

const inventory = {
  wood: 0, stone: 0, iron: 0, coal: 0, gold: 0, ironBar: 0, goldBar: 0,
  plank: 0, wall: 0, door: 0, chest: 0, furnace: 0,
  berry: 0, rawMeat: 0, cookedMeat: 0, bandage: 0, herb: 0,
  woodenPickaxe: 0, stoneAxe: 0, stonePickaxe: 0, stoneSword: 0,
  ironAxe: 0, ironPickaxe: 0, ironSword: 0,
  goldAxe: 0, goldPickaxe: 0, goldSword: 0,
};

const craftingRecipes = {
  plank: { wood: 1 },
  wall: { plank: 2 },
  door: { plank: 6 },
  chest: { plank: 8 },
  furnace: { stone: 10 },
  woodenPickaxe: { wood: 5 },
  stoneAxe: { plank: 2, stone: 3 },
  stonePickaxe: { wood: 2, stone: 3 },
  stoneSword: { plank: 1, stone: 2 },
  ironAxe: { ironBar: 3, wood: 2 },
  ironPickaxe: { ironBar: 3, wood: 2 },
  ironSword: { ironBar: 2, wood: 1 },
  goldAxe: { goldBar: 3, wood: 2 },
  goldPickaxe: { goldBar: 3, wood: 2 },
  goldSword: { goldBar: 2, wood: 1 },
  bandage: { herb: 2 },
};

const gameTime = { day: true, time: 0, dayLength: 6000, dayCount: 1 };

let score = 0, scoreTimer = 60, gameOver = false;
let craftingMenuActive = false, chestMenuActive = false, furnaceMenuActive = false;
let activeChest = null, activeFurnace = null;

const sounds = {
  attack: new Audio('sounds/attack.wav'),
  eat: new Audio('sounds/eat.wav'),
  playerDamage: new Audio('sounds/player_damage.wav'),
  enemyDamage: new Audio('sounds/enemy_damage.wav'),
};
const playSound = (sound) => {
  const playPromise = sound.play();
  if (playPromise !== undefined) playPromise.catch(e => {});
};

const keys = {};
const mouse = { x: 0, y: 0, worldX: 0, worldY: 0 };
window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('click', () => { if (!craftingMenuActive && !chestMenuActive && !furnaceMenuActive) placeItem(); });
window.addEventListener('keydown', (e) => {
  keys[e.key] = true;
  if (e.key === 'c') toggleCraftingMenu();
  else if (e.key === 'e') interact();
  else if (e.key >= '1' && e.key <= '4') {
    const selections = ['wall', 'door', 'chest', 'furnace'];
    player.buildSelection = selections[parseInt(e.key) - 1];
  } else if (e.key >= '5' && e.key <= '7') {
    const consumables = ['berry', 'cookedMeat', 'bandage'];
    player.consumableSelection = consumables[parseInt(e.key) - 5];
  } else if (e.key === 'q') {
    eat(player.consumableSelection);
  }
  else if (e.key === ' ') attack();
  else if (e.key === 'f') gather();
  else if (gameOver && e.key === 'r') restartGame();
});
window.addEventListener('keyup', (e) => { delete keys[e.key]; });

let hungerTimer = 200, enemySpawnTimer = 900, healthRegenTimer = 500;

function update() {
  if (chestMenuActive || craftingMenuActive || furnaceMenuActive) return;

  mouse.worldX = mouse.x + camera.x;
  mouse.worldY = mouse.y + camera.y;

  if (--scoreTimer <= 0) { score++; scoreTimer = 60; }
  if (++gameTime.time >= gameTime.dayLength) {
    gameTime.time = 0;
    gameTime.day = !gameTime.day;
    if (gameTime.day) {
      gameTime.dayCount++;
    }
  }

  if (!gameTime.day && --enemySpawnTimer <= 0) {
    const angle = Math.random() * Math.PI * 2;
    const radius = canvas.width;
    const enemyTypeRoll = Math.random();
    let enemy;
    if (enemyTypeRoll < 0.4) {
        enemy = { x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius, width: 40, height: 40, speed: 0.45, health: 3, maxHealth: 3, damage: 1, canAttack: true, type: 'zombie' };
    } else if (enemyTypeRoll < 0.7) {
        enemy = { x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius, width: 30, height: 30, speed: 0.75, health: 2, maxHealth: 2, damage: 1, canAttack: true, type: 'spider', color: '#5A5A5A' };
    } else if (enemyTypeRoll < 0.9) {
        enemy = { x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius, width: 50, height: 50, speed: 0.3, health: 8, maxHealth: 8, damage: 3, canAttack: true, type: 'tankZombie', color: '#2E8B57' };
    } else {
        enemy = { x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius, width: 35, height: 35, speed: 1, health: 2, maxHealth: 2, damage: 1, canAttack: true, type: 'runnerZombie', color: '#FF4500' };
    }
    world.enemies.push(enemy);
    const baseSpawnTime = 900;
    const spawnTimeReduction = 50;
    const minSpawnTime = 100;
    enemySpawnTimer = Math.max(minSpawnTime, baseSpawnTime - (gameTime.dayCount - 1) * spawnTimeReduction);
  }

  if (--hungerTimer <= 0) { player.hunger--; hungerTimer = 200; }
  if (player.hunger <= 0) { player.health--; player.hunger = 0; }

  if (--healthRegenTimer <= 0) {
    if (player.hunger > 50 && player.health < 100) {
      player.health++;
    }
    healthRegenTimer = 500;
  }

  if (player.health <= 0) { gameOver = true; player.health = 0; }

  const move = { x: 0, y: 0 };
  if (keys['w'] || keys['ArrowUp']) move.y -= player.speed;
  if (keys['s'] || keys['ArrowDown']) move.y += player.speed;
  if (keys['a'] || keys['ArrowLeft']) move.x -= player.speed;
  if (keys['d'] || keys['ArrowRight']) move.x += player.speed;

  moveEntity(player, move.x, move.y, [
    ...world.walls.filter(wall => !(wall.type === 'door' && wall.isOpen)),
    ...world.resources,
    ...world.enemies
  ]);

  camera.x = player.x - camera.width / 2;
  camera.y = player.y - camera.height / 2;

  manageWorldPopulation();
  updateFurnaces();

  world.enemies.forEach(enemy => {
    const dx = player.x - enemy.x;
    const dy = player.y - enemy.y;
    const dist = Math.hypot(dx, dy);
    
    let moveX = 0;
    let moveY = 0;

    if (dist > TILE_SIZE / 2) {
        if (enemy.type === 'spider') {
            moveX = (dx / dist) * enemy.speed + (Math.random() - 0.5);
            moveY = (dy / dist) * enemy.speed + (Math.random() - 0.5);
        } else {
            moveX = (dx / dist) * enemy.speed;
            moveY = (dy / dist) * enemy.speed;
        }
    }

    moveEntity(enemy, moveX, moveY, [
        ...world.walls.filter(wall => !(wall.type === 'door' && wall.isOpen)),
        ...world.resources,
        player,
        ...world.enemies
    ]);
  });

  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const enemy = world.enemies[i];
    if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < (player.width / 2 + enemy.width / 2 + 10) && enemy.canAttack) {
      player.health -= enemy.damage || 1;
      playSound(sounds.playerDamage);


      enemy.canAttack = false;
      setTimeout(() => { if (world.enemies.includes(enemy)) enemy.canAttack = true; }, 500);
    }
  }
}

function attack() {
  playSound(sounds.attack);
  for (let i = world.enemies.length - 1; i >= 0; i--) {
    const enemy = world.enemies[i];
    if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < (player.width / 2 + enemy.width / 2 + 10)) {
      let damage = inventory.goldSword > 0 ? 5 : (inventory.ironSword > 0 ? 3 : (inventory.stoneSword > 0 ? 2 : 1));
      enemy.health -= damage;
      playSound(sounds.enemyDamage);

      const knockbackStrength = 180;
      const dx = enemy.x - player.x;
      const dy = enemy.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        const newEnemyX = enemy.x + (dx / dist) * knockbackStrength;
        const newEnemyY = enemy.y + (dy / dist) * knockbackStrength;

        let xCollision = world.walls.some(wall => !(wall.type === 'door' && wall.isOpen) && checkCollision({ ...enemy, x: newEnemyX }, wall));
        if (!xCollision) enemy.x = newEnemyX;
        
        let yCollision = world.walls.some(wall => !(wall.type === 'door' && wall.isOpen) && checkCollision({ ...enemy, y: newEnemyY }, wall));
        if (!yCollision) enemy.y = newEnemyY;
      }

      if (enemy.health <= 0) {
        if (Math.random() < 0.5) {
          inventory.rawMeat++;
        }
        world.enemies.splice(i, 1);
      }
    }
  }
}

function gather() {
  let closestItem = null, minDistance = Infinity, itemType = null;
  [...world.resources, ...world.foods].forEach(item => {
    const dist = Math.hypot(player.x - item.x, player.y - item.y);
    if (dist < minDistance) {
      minDistance = dist;
      closestItem = item;
      itemType = world.resources.includes(item) ? 'resource' : 'food';
    }
  });

  if (closestItem && minDistance < TILE_SIZE * 1.5) {
    if (itemType === 'resource') {
      let damage = 0;
      const type = closestItem.type;
      if (type === 'wood') damage = inventory.goldAxe > 0 ? 15 : (inventory.ironAxe > 0 ? 10 : (inventory.stoneAxe > 0 ? 5 : 1));
      else if (type === 'stone') {
        if (inventory.goldPickaxe > 0) damage = 4;
        else if (inventory.ironPickaxe > 0) damage = 2;
        else if (inventory.stonePickaxe > 0) damage = 2;
        else if (inventory.woodenPickaxe > 0) damage = 1;
        else { console.log("You need a pickaxe."); return; }
      } else if (type === 'iron' || type === 'coal') {
        if (inventory.goldPickaxe > 0) damage = 4;
        else if (inventory.ironPickaxe > 0) damage = 2;
        else if (inventory.stonePickaxe > 0) damage = 1;
        else { console.log("You need a better pickaxe."); return; }
      } else if (type === 'gold') {
        if (inventory.goldPickaxe > 0) damage = 2;
        else if (inventory.ironPickaxe > 0) damage = 1;
        else { console.log("You need an iron pickaxe to mine gold."); return; }
      }

      if (damage > 0) {
        closestItem.health -= damage;
        closestItem.isHit = true;
        setTimeout(() => { if(closestItem) closestItem.isHit = false; }, 100);
        if (closestItem.health <= 0) {
          const lootAmount = type === 'wood' ? 3 : (type === 'stone' ? 2 : (type === 'coal' ? 2 : (type === 'gold' ? 1 : 1)));
          inventory[type] += lootAmount;
          world.resources.splice(world.resources.indexOf(closestItem), 1);
        }
      }
    } else if (itemType === 'food') {
      inventory[closestItem.type]++;
      world.foods.splice(world.foods.indexOf(closestItem), 1);
    }
  }
}

function eat(food) {
  if (inventory[food] > 0) {
    playSound(sounds.eat);
    inventory[food]--;
    if (food === 'berry') {
      player.hunger = Math.min(100, player.hunger + 10);
    } else if (food === 'cookedMeat') {
      player.hunger = Math.min(100, player.hunger + 40);
    } else if (food === 'bandage') {
      player.health = Math.min(100, player.health + 25);
    }
  }
}

function craft(item) {
  const recipe = craftingRecipes[item];
  if (!recipe) return;
  if (Object.keys(recipe).every(res => inventory[res] >= recipe[res])) {
    Object.keys(recipe).forEach(res => inventory[res] -= recipe[res]);
    inventory[item]++;
  }
}

function draw() {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);
  ctx.fillStyle = '#6B8E23';
  ctx.fillRect(camera.x, camera.y, canvas.width, canvas.height);

  world.grassPatches.forEach(patch => {
    ctx.fillStyle = patch.color;
    ctx.fillRect(patch.x, patch.y, patch.width, patch.height);
  });

  world.resources.forEach(resource => {
    const sprite = sprites[resource.type];
    if (sprite) {
        ctx.drawImage(sprite, resource.x, resource.y, resource.width, resource.height);
    } else {
        ctx.fillStyle = resource.color || 'purple';
        ctx.fillRect(resource.x, resource.y, resource.width, resource.height);
    }
    if (resource.isHit) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(resource.x, resource.y, resource.width, resource.height);
    }
  });

  world.walls.forEach(wall => {
    let sprite;
    if (wall.type === 'door') {
        sprite = wall.isOpen ? sprites.door_open : sprites.door_closed;
    } else {
        sprite = sprites.wall;
    }
    if (sprite) {
        ctx.drawImage(sprite, wall.x, wall.y, wall.width, wall.height);
    } else {
        ctx.fillStyle = (wall.type === 'door' && wall.isOpen) ? '#C68642' : (wall.color || '#8B4513');
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    }
  });

  world.chests.forEach(chest => {
    if (sprites.chest) {
        ctx.drawImage(sprites.chest, chest.x, chest.y, chest.width, chest.height);
    } else {
        ctx.fillStyle = '#A0522D';
        ctx.fillRect(chest.x, chest.y, chest.width, chest.height);
    }
  });
  
  world.furnaces.forEach(furnace => {
    const sprite = furnace.isSmelting ? sprites.furnace_on : sprites.furnace_off;
    if (sprite) {
        ctx.drawImage(sprite, furnace.x, furnace.y, furnace.width, furnace.height);
    } else {
        ctx.fillStyle = furnace.isSmelting ? '#FF4500' : '#36454F';
        ctx.fillRect(furnace.x, furnace.y, furnace.width, furnace.height);
    }
  });

  const itemToBuild = player.buildSelection;
  if (inventory[itemToBuild] > 0 && !craftingMenuActive && !chestMenuActive && !furnaceMenuActive) {
    const gridX = Math.floor(mouse.worldX / TILE_SIZE) * TILE_SIZE;
    const gridY = Math.floor(mouse.worldY / TILE_SIZE) * TILE_SIZE;
    const colors = { wall: 'rgba(139, 69, 19, 0.5)', door: 'rgba(200, 150, 100, 0.5)', chest: 'rgba(160, 82, 45, 0.5)', furnace: 'rgba(54, 69, 79, 0.5)' };
    if (colors[itemToBuild]) {
        ctx.fillStyle = colors[itemToBuild];
        ctx.fillRect(gridX, gridY, TILE_SIZE, TILE_SIZE);
    }
  }

  world.foods.forEach(food => {
    const sprite = sprites[food.type];
    if (sprite) {
        ctx.drawImage(sprite, food.x, food.y, food.width, food.height);
    } else {
        ctx.fillStyle = food.color;
        ctx.fillRect(food.x, food.y, food.width, food.height);
    }
  });

  world.enemies.forEach(enemy => {
    const sprite = sprites[enemy.type];
    if (sprite) {
        ctx.drawImage(sprite, enemy.x, enemy.y, enemy.width, enemy.height);
    } else {
        ctx.fillStyle = enemy.color || 'pink';
        ctx.fillRect(enemy.x, enemy.y, enemy.width, enemy.height);
    }
    if (enemy.health < enemy.maxHealth) {
        const barWidth = enemy.width;
        const barHeight = 5;
        const barX = enemy.x;
        const barY = enemy.y - 10;
        const healthPercentage = enemy.health / enemy.maxHealth;
        ctx.fillStyle = '#333';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(barX, barY, barWidth * healthPercentage, barHeight);
    }
  });

  ctx.drawImage(sprites.player, player.x, player.y, player.width, player.height);

  if (!gameTime.day) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(camera.x, camera.y, canvas.width, camera.height);
  }
  ctx.restore();
}

function displayControls() {
    controlsDisplay.innerHTML = `
        <b>Controls</b><br>
        WASD: Move<br>
        Mouse: Aim<br>
        Click: Build<br>
        1-4: Select Build<br>
        F: Gather<br>
        E: Interact<br>
        Q: Use Consumable<br>
        5-7: Select Consumable<br>
        C: Crafting<br>
        Space: Attack
    `;
}

function updateUI() {
  topBar.innerHTML = `Score: ${score} | ${gameTime.day ? 'Day' : 'Night'}`;
  document.getElementById('health-bar').style.width = player.health + '%';
  document.getElementById('hunger-bar').style.width = player.hunger + '%';
  let invHTML = 'Inventory:<br>';
  Object.keys(inventory).forEach(item => { if (inventory[item] > 0) invHTML += `${item}: ${inventory[item]}<br>`; });
  inventoryDisplay.innerHTML = invHTML;
  document.getElementById('consumable-display').innerHTML = `Selected: ${player.consumableSelection}`;
}

function toggleCraftingMenu() { craftingMenuActive = !craftingMenuActive; craftingMenu.classList.toggle('hidden'); if (craftingMenuActive) updateCraftingMenu(); }
function toggleChestMenu(chest) { chestMenuActive = !chestMenuActive; chestMenu.classList.toggle('hidden'); activeChest = chestMenuActive ? chest : null; if (chestMenuActive) updateChestMenu(); }
function toggleFurnaceMenu(furnace) { furnaceMenuActive = !furnaceMenuActive; furnaceMenu.classList.toggle('hidden'); activeFurnace = furnaceMenuActive ? furnace : null; if (furnaceMenuActive) updateFurnaceMenu(); }

function updateCraftingMenu() {
  let html = '<h2>Crafting</h2>';
  for (const item in craftingRecipes) {
    const recipe = craftingRecipes[item];
    const canCraft = Object.keys(recipe).every(res => inventory[res] >= recipe[res]);
    html += `<button ${canCraft ? '' : 'disabled'} onclick="craft('${item}'); updateCraftingMenu();">${item} (${Object.entries(recipe).map(([k,v])=>`${v} ${k}`).join(', ')})</button><br>`;
  }
  craftingMenu.innerHTML = html;
}

function updateChestMenu() {
  if (!activeChest) return;
  let playerInv = '<h3>Your Inventory</h3>';
  Object.keys(inventory).forEach(item => { if (inventory[item] > 0) playerInv += `<div>${item}: ${inventory[item]} <button onclick="storeItem('${item}', 1)">Store 1</button></div>`; });
  let chestInv = '<h3>Chest Inventory</h3>';
  Object.keys(activeChest.inventory).forEach(item => { if (activeChest.inventory[item] > 0) chestInv += `<div>${item}: ${activeChest.inventory[item]} <button onclick="takeItem('${item}', 1)">Take 1</button></div>`; });
  chestMenu.innerHTML = `<div class="chest-container"><div class="inventory-panel">${playerInv}</div><div class="inventory-panel">${chestInv}</div></div><button onclick="toggleChestMenu(null)">Close</button>`;
}

function storeItem(item, amount) { if (inventory[item] >= amount) { inventory[item] -= amount; activeChest.inventory[item] += amount; updateChestMenu(); updateUI(); } }
function takeItem(item, amount) { if (activeChest.inventory[item] >= amount) { activeChest.inventory[item] -= amount; inventory[item] += amount; updateChestMenu(); updateUI(); } }

function updateFurnaceMenu() {
    if (!activeFurnace) return;
    let html = `<h2>Furnace</h2>
        <div class="furnace-slots">
            <div class="slot">Input: ${activeFurnace.input?.type || 'Empty'} (${activeFurnace.input?.amount || 0})</div>
            <div class="slot">Fuel: ${activeFurnace.fuel?.type || 'Empty'} (${activeFurnace.fuel?.amount || 0})</div>
            <div class="slot">Output: ${activeFurnace.output?.type || 'Empty'} (${activeFurnace.output?.amount || 0})</div>
        </div>
        <div>Smelting Progress: ${activeFurnace.isSmelting ? (100 - (activeFurnace.smeltTimer / 300 * 100)).toFixed(0) + '%' : 'Idle'}</div>
        <h3>Your Inventory</h3>`;
    if (inventory.iron > 0) html += `<div>Iron: ${inventory.iron} <button onclick="addMaterialToFurnace('iron')">Add Iron</button></div>`;
    if (inventory.gold > 0) html += `<div>Gold: ${inventory.gold} <button onclick="addMaterialToFurnace('gold')">Add Gold</button></div>`;
    if (inventory.rawMeat > 0) html += `<div>Raw Meat: ${inventory.rawMeat} <button onclick="addMaterialToFurnace('rawMeat')">Add Raw Meat</button></div>`;
    if (inventory.coal > 0) html += `<div>Coal: ${inventory.coal} <button onclick="addFuelToFurnace('coal')">Add Coal</button></div>`;
    if (activeFurnace.output?.amount > 0) html += `<button onclick="takeFromFurnace()">Take ${activeFurnace.output.type}</button>`;
    html += `<button onclick="toggleFurnaceMenu(null)">Close</button>`;
    furnaceMenu.innerHTML = html;
}

function addMaterialToFurnace(item) {
    if (inventory[item] > 0 && (!activeFurnace.input || activeFurnace.input.amount === 0)) {
        inventory[item]--;
        activeFurnace.input = { type: item, amount: 1 };
        updateFurnaceMenu();
        updateUI();
    }
}

function addFuelToFurnace(item) {
    if (inventory[item] > 0 && (!activeFurnace.fuel || activeFurnace.fuel.amount === 0)) {
        inventory[item]--;
        activeFurnace.fuel = { type: item, amount: 1 };
        updateFurnaceMenu();
        updateUI();
    }
}

function takeFromFurnace() {
    if (activeFurnace.output && activeFurnace.output.amount > 0) {
        inventory[activeFurnace.output.type] += activeFurnace.output.amount;
        activeFurnace.output = null;
        updateFurnaceMenu();
        updateUI();
    }
}

function updateFurnaces() {
    world.furnaces.forEach(furnace => {
        if (furnace.input && furnace.fuel && !furnace.isSmelting && !furnace.output) {
            furnace.isSmelting = true;
            furnace.smeltTimer = 300; // 5 seconds
        }
        if (furnace.isSmelting) {
            furnace.smeltTimer--;
            if (furnace.smeltTimer <= 0) {
                furnace.isSmelting = false;
                if (furnace.input.type === 'iron' && furnace.fuel.type === 'coal') {
                    furnace.output = { type: 'ironBar', amount: 1 };
                } else if (furnace.input.type === 'gold' && furnace.fuel.type === 'coal') {
                    furnace.output = { type: 'goldBar', amount: 1 };
                } else if (furnace.input.type === 'rawMeat' && furnace.fuel.type === 'coal') {
                    furnace.output = { type: 'cookedMeat', amount: 1 };
                }
                furnace.input = null;
                furnace.fuel = null;
            }
        }
    });
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
  player.x = 0;
  player.y = 0;
  for (const item in inventory) inventory[item] = 0;
  Object.keys(world).forEach(key => world[key] = []);
  generateInitialWorld();
  gameTime.time = 0;
  gameTime.day = true;
  gameTime.dayCount = 1;
  score = 0;
  gameOver = false;
  gameLoop();
}

function gameLoop() {
  if (gameOver) { drawGameOver(); return; }
  update();
  draw();
  updateUI();
  requestAnimationFrame(gameLoop);
}

const sprites = {};
const assetsToLoad = [
  { name: 'player', src: 'sprites/human.png' },
  { name: 'tree', src: 'sprites/tree.png', alias: 'wood' },
  { name: 'zombie', src: 'sprites/zombie.png' },
];
let assetsLoaded = 0;
function assetLoaded() {
  if (++assetsLoaded === assetsToLoad.length + Object.keys(svgSprites).length) {
    generateInitialWorld();
    displayControls();
    gameLoop();
  }
}

function createSvgSprite(svgString, callback) {
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = callback;
    img.src = url;
    return img;
}

const svgSprites = {
    spider: `<svg viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#333" stroke-width="1.5"><path d="M11 20l-7 5M19 20l7 5M11 20V10l-7-5M19 20V10l7-5"/><ellipse cx="15" cy="15" rx="6" ry="8"/><path d="M13 12a.5.5 0 100-1 .5.5 0 000 1zM17 12a.5.5 0 100-1 .5.5 0 000 1z" fill="red" stroke="none"/></g></svg>`,
    tankZombie: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="15" width="30" height="30" fill="#2E8B57" rx="5"/><rect x="18" y="10" width="14" height="14" fill="#1D5937" rx="3"/><rect x="15" y="45" width="8" height="5" fill="#444"/><rect x="27" y="45" width="8" height="5" fill="#444"/><path d="M12 25h-5v5h5zm31 0h-5v5h5z" fill="#2E8B57"/></svg>`,
    runnerZombie: `<svg viewBox="0 0 35 35" xmlns="http://www.w3.org/2000/svg"><g transform="rotate(15 17.5 17.5)"><rect x="10" y="5" width="15" height="25" fill="#FF4500" rx="4"/><rect x="14" y="2" width="7" height="7" fill="#D93A00" rx="2"/><path d="M5 20l5-5m15 5l5-5" stroke="#FF4500" stroke-width="3" fill="none"/></g></svg>`,
    stone: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M5 25C5 10 10 5 25 5s20 5 20 20-5 20-20 20S5 40 5 25z" fill="#A9A9A9"/><path d="M15 20l10-5 10 5-5 15H20z" fill="#808080"/><path d="M22 18h6v10h-6z" fill="#696969"/></svg>`,
    iron: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M5 25C5 10 10 5 25 5s20 5 20 20-5 20-20 20S5 40 5 25z" fill="#A9A9A9"/><path d="M15 15l-5 5 15 15 5-5-5-10zM35 35l5-5-15-15-5 5 5 10z" fill="#D3D3D3" opacity="0.8"/></svg>`,
    coal: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M10 10l30 5-5 30-30-5 5-30z" fill="#282828"/><path d="M12 12l26 4-4 26-26-4 4-26z" fill="#181818" opacity="0.5"/></svg>`,
    gold: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><path d="M5 25C5 10 10 5 25 5s20 5 20 20-5 20-20 20S5 40 5 25z" fill="#A9A9A9"/><path d="M18 12l-8 8 15 15 8-8-5-10zM40 40l-5-5" fill="#FFD700" opacity="0.9"/></svg>`,
    berry: `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><circle cx="10" cy="12" r="7" fill="#C0392B"/><path d="M10 5L8 2h4z" fill="#27AE60"/></svg>`,
    herb: `<svg viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 20C5 15 5 15 2 8l8-6 8 6c-3 7-3 7-8 12z" fill="#2ECC71"/><path d="M10 20V7" stroke="#27AE60" stroke-width="1.5"/></svg>`,
    wall: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="planks" width="10" height="50" patternUnits="userSpaceOnUse"><path d="M0 0h10v50H0z" fill="#8B4513"/><path d="M0 25h10" stroke="#654321" stroke-width="1"/></pattern></defs><rect width="50" height="50" fill="url(#planks)"/></svg>`,
    door_closed: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect width="50" height="50" fill="#8B4513"/><rect x="5" y="5" width="40" height="40" fill="#A0522D" rx="2"/><circle cx="40" cy="25" r="2" fill="#333"/></svg>`,
    door_open: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect width="50" height="50" fill="none"/><rect x="-20" y="0" width="45" height="50" fill="#A0522D" rx="2" transform="rotate(20 2.5 25)"/><circle cx="18" cy="25" r="2" fill="#333" transform="rotate(20 2.5 25)"/></svg>`,
    chest: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="15" width="40" height="30" fill="#A0522D" rx="3"/><rect x="2" y="12" width="46" height="10" fill="#8B4513" rx="2"/><rect x="22" y="28" width="6" height="6" fill="#333"/></svg>`,
    furnace_off: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect width="50" height="50" fill="#696969" rx="5"/><rect x="10" y="30" width="30" height="10" fill="#36454F" rx="2"/></svg>`,
    furnace_on: `<svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg"><rect width="50" height="50" fill="#696969" rx="5"/><rect x="10" y="30" width="30" height="10" fill="#36454F" rx="2"/><circle cx="25" cy="35" r="8" fill="#FF4500"/><circle cx="25" cy="35" r="5" fill="#FFD700"/></svg>`,
};

assetsToLoad.forEach(asset => {
  const img = new Image();
  img.onload = assetLoaded;
  img.src = asset.src;
  sprites[asset.name] = img;
  if (asset.alias) {
    sprites[asset.alias] = img;
  }
});

for (const [name, svgString] of Object.entries(svgSprites)) {
    sprites[name] = createSvgSprite(svgString, assetLoaded);
}

function checkCollision(rect1, rect2) {
  return rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height && rect1.y + rect1.height > rect2.y;
}

function moveEntity(entity, dx, dy, obstacles) {
    // Move X
    entity.x += dx;
    for (const obstacle of obstacles) {
        if (entity !== obstacle && checkCollision(entity, obstacle)) {
            entity.x -= dx;
            break;
        }
    }

    // Move Y
    entity.y += dy;
    for (const obstacle of obstacles) {
        if (entity !== obstacle && checkCollision(entity, obstacle)) {
            entity.y -= dy;
            break;
        }
    }
}

function placeItem() {
  const itemToBuild = player.buildSelection;
  if (inventory[itemToBuild] > 0) {
    const gridX = Math.floor(mouse.worldX / TILE_SIZE) * TILE_SIZE;
    const gridY = Math.floor(mouse.worldY / TILE_SIZE) * TILE_SIZE;
    const isOccupied = world.walls.some(w => w.x === gridX && w.y === gridY) || world.chests.some(c => c.x === gridX && c.y === gridY) || world.furnaces.some(f => f.x === gridX && f.y === gridY);
    if (!isOccupied) {
      inventory[itemToBuild]--;
      const newItem = { x: gridX, y: gridY, width: TILE_SIZE, height: TILE_SIZE, type: itemToBuild };
      if (itemToBuild === 'wall') { newItem.color = '#8B4513'; world.walls.push(newItem); }
      else if (itemToBuild === 'door') { newItem.isOpen = false; world.walls.push(newItem); }
      else if (itemToBuild === 'chest') { newItem.inventory = {}; Object.keys(inventory).forEach(k => newItem.inventory[k] = 0); world.chests.push(newItem); }
      else if (itemToBuild === 'furnace') { newItem.input = null; newItem.fuel = null; newItem.output = null; newItem.isSmelting = false; newItem.smeltTimer = 0; world.furnaces.push(newItem); }
    }
  }
}

function interact() {
  let closest = { dist: Infinity, item: null };
  [...world.walls, ...world.chests, ...world.furnaces].forEach(item => {
    if (item.type === 'door' || item.type === 'chest' || item.type === 'furnace') {
      const dist = Math.hypot(player.x - item.x, player.y - item.y);
      if (dist < closest.dist) {
        closest = { dist, item };
      }
    }
  });

  if (closest.item && closest.dist < TILE_SIZE * 1.5) {
    if (closest.item.type === 'door') closest.item.isOpen = !closest.item.isOpen;
    else if (closest.item.type === 'chest') toggleChestMenu(closest.item);
    else if (closest.item.type === 'furnace') toggleFurnaceMenu(closest.item);
  } else {
  }
}

function manageWorldPopulation() {
  const despawnDist = canvas.width * 2;
  const spawnDist = canvas.width;
  
  ['resources', 'foods', 'grassPatches', 'enemies'].forEach(type => {
    world[type] = world[type].filter(obj => Math.hypot(player.x - obj.x, player.y - obj.y) < despawnDist);
  });

  if (world.resources.length < 150) {
    const angle = Math.random() * Math.PI * 2;
    const radius = spawnDist * 0.75 + Math.random() * spawnDist * 0.5;
    const x = player.x + Math.cos(angle) * radius;
    const y = player.y + Math.sin(angle) * radius;
    const rType = Math.random();
    if (rType < 0.5) world.resources.push({ x, y, width: 50, height: 50, type: 'wood', health: 5, isHit: false });
    else if (rType < 0.8) world.resources.push({ x, y, width: 50, height: 50, color: 'gray', type: 'stone', health: 8, isHit: false });
    else if (rType < 0.9) world.resources.push({ x, y, width: 50, height: 50, color: '#A9A9A9', type: 'iron', health: 10, isHit: false });
    else if (rType < 0.95) world.resources.push({ x, y, width: 50, height: 50, color: '#282828', type: 'coal', health: 8, isHit: false });
    else world.resources.push({ x, y, width: 50, height: 50, color: '#FFD700', type: 'gold', health: 12, isHit: false });
  }

  if (world.foods.length < 50) {
    const angle = Math.random() * Math.PI * 2;
    const radius = spawnDist / 2 + Math.random() * spawnDist;
    world.foods.push({ x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius, width: 20, height: 20, color: 'red', type: 'berry' });
  }

  if (world.foods.filter(f => f.type === 'herb').length < 20) {
    const angle = Math.random() * Math.PI * 2;
    const radius = spawnDist / 2 + Math.random() * spawnDist;
    world.foods.push({ x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius, width: 20, height: 20, color: 'green', type: 'herb' });
  }
  
  if (world.grassPatches.length < 300) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * spawnDist * 1.5;
    world.grassPatches.push({ x: player.x + Math.cos(angle) * radius, y: player.y + Math.sin(angle) * radius, width: Math.random() * 20 + 10, height: Math.random() * 20 + 10, color: `rgba(0, ${Math.random() * 100 + 100}, 0, 0.5)` });
  }
}