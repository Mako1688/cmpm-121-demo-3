// Extend the Window interface to include our functions
declare global {
  interface Window {
    pickUpCoin: (i: number, j: number, serial: number) => void;
    dropCoin: (i: number, j: number, serial: number) => void;
    centerMapOnCache: (i: number, j: number) => void;
  }
}

interface GlobalThis {
  pickUpCoin: (i: number, j: number, serial: number) => void;
  dropCoin: (i: number, j: number, serial: number) => void;
  centerMapOnCache: (i: number, j: number) => void;
}

// Marco Ogaz-Vega
// CMPM 121

import L from "leaflet";
import { Board } from "./board.ts";
import { GameController } from "./gameController.ts";
import { InventoryView } from "./inventoryView.ts";

// Constants
const PLAYER_LAT = 36.9895;
const PLAYER_LNG = -122.0628;
const MAP_ZOOM_LEVEL = 15;
const TILE_WIDTH = 0.0001;
const TILE_VISIBILITY_RADIUS = 8;
const PLAYER_MOVE_OFFSET = 0.00005;

// Initialize the map
const map = L.map("map").setView([PLAYER_LAT, PLAYER_LNG], MAP_ZOOM_LEVEL);

// Add a tile layer to the map
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const board = new Board(TILE_WIDTH, TILE_VISIBILITY_RADIUS);

// Initialize the InventoryView
const inventoryView = new InventoryView("inventory");

// Initialize an instance of the GameController
const gameController = new GameController(board, map, inventoryView);

// Function to initialize the game
function initializeGame() {
  // Load game state from localStorage
  gameController.loadGameState();

  // Generate initial cache locations
  gameController.updateVisibleCaches();

  // Bind control buttons to functions
  document
    .getElementById("move-up")
    ?.addEventListener(
      "click",
      () => gameController.movePlayer(PLAYER_MOVE_OFFSET, 0),
    );
  document
    .getElementById("move-down")
    ?.addEventListener(
      "click",
      () => gameController.movePlayer(-PLAYER_MOVE_OFFSET, 0),
    );
  document
    .getElementById("move-left")
    ?.addEventListener(
      "click",
      () => gameController.movePlayer(0, -PLAYER_MOVE_OFFSET),
    );
  document
    .getElementById("move-right")
    ?.addEventListener(
      "click",
      () => gameController.movePlayer(0, PLAYER_MOVE_OFFSET),
    );
  document
    .getElementById("geolocation")
    ?.addEventListener("click", () => gameController.enableGeolocation());
  document
    .getElementById("reset")
    ?.addEventListener("click", () => gameController.resetGameState());

  // Expose functions to the global scope for popup buttons
  (globalThis as unknown as GlobalThis).pickUpCoin = gameController.pickUpCoin
    .bind(gameController);
  (globalThis as unknown as GlobalThis).dropCoin = gameController.dropCoin.bind(
    gameController,
  );
  (globalThis as unknown as GlobalThis).centerMapOnCache = gameController
    .centerMapOnCache.bind(gameController);
}

// Initialize the game
initializeGame();
