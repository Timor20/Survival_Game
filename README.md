# 2D Top-Down Survival Game

This is a 2D top-down survival game built with Node.js and HTML5 Canvas. Explore a procedurally generated world, gather resources, craft tools and weapons, build a base, and defend yourself against waves of enemies that appear at night.

## Features

*   **Infinite, Procedurally Generated World:** The world is generated around the player, creating an endless map to explore.
*   **Resource Gathering:** Collect wood, stone, iron, coal, gold, and herbs from the environment.
*   **Extensive Crafting System:**
    *   **Tools:** Craft axes and pickaxes from wood, stone, iron, and gold to gather resources more efficiently.
    *   **Weapons:** Forge swords to defend yourself against enemies.
    *   **Building:** Create planks, walls, doors, and chests to build a protective base.
    *   **Utilities:** Craft bandages for healing and a furnace for smelting ores.
*   **Building & Base Management:**
    *   Place walls and doors to create a shelter.
    *   Use chests to store your items.
    *   Use furnaces to smelt iron and gold ore into bars and cook raw meat.
*   **Combat:**
    *   Fight off various enemy types that spawn at night.
    *   Enemy difficulty and spawn rates increase with each passing day.
    *   Use swords for melee combat with knockback effects.
*   **Survival Mechanics:**
    *   Manage your health and hunger to survive.
    *   Eat berries or cooked meat to restore hunger. Use bandages to restore health.
*   **Day/Night Cycle:** The game features a full day/night cycle. Enemies become more aggressive and numerous during the night.
*   **Dynamic UI:** A clean UI displays your stats, inventory, crafting menu, and game information.
*   **Custom Sprites:** All in-game items, resources, and characters have custom SVG sprites for a cohesive visual style.

## How to Play

*   **WASD / Arrow Keys:** Move the player.
*   **Mouse:** Aim.
*   **Left Click:** Place the selected buildable item.
*   **Spacebar:** Attack enemies.
*   **F:** Gather the nearest resource or food item.
*   **E:** Interact with doors, chests, and furnaces.
*   **C:** Toggle the crafting menu.
*   **Q:** Use the selected consumable item.
*   **1-4:** Select a buildable item (1: Wall, 2: Door, 3: Chest, 4: Furnace).
*   **5-7:** Select a consumable item (5: Berry, 6: Cooked Meat, 7: Bandage).
*   **R:** Restart the game after dying.

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd survival_game
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the server:**
    ```bash
    npm start
    ```
4.  **Open the game:**
    Open your web browser and navigate to `http://localhost:3000`.
