// Extend the Window interface to include our functions
declare global {
  interface Window {
    pickUpCoin: (i: number, j: number, serial: number) => void;
    dropCoin: (i: number, j: number, serial: number) => void;
  }
}

interface GlobalThis {
  pickUpCoin: (i: number, j: number, serial: number) => void;
  dropCoin: (i: number, j: number, serial: number) => void;
}

// Marco Ogaz-Vega
// CMPM 121

import L from "leaflet";
import { Board } from "./board.ts";
import { Coin, Geocache } from "./geocache.ts";
import luck from "./luck.ts";

// Constants
const PLAYER_LAT = 36.9895;
const PLAYER_LNG = -122.0628;
const MAP_ZOOM_LEVEL = 15;
const TILE_WIDTH = 0.0001;
const TILE_VISIBILITY_RADIUS = 8;
const CACHE_PROBABILITY = 0.1;
const COIN_SCALE_FACTOR = 11;
const PLAYER_MOVE_OFFSET = 0.00005;

// Initialize the map
const map = L.map("map").setView([PLAYER_LAT, PLAYER_LNG], MAP_ZOOM_LEVEL);

// Add a tile layer to the map
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const board = new Board(TILE_WIDTH, TILE_VISIBILITY_RADIUS);

// Add player marker
const playerMarker = L.marker([PLAYER_LAT, PLAYER_LNG])
  .addTo(map)
  .bindPopup("Player");

const playerPosition = { lat: PLAYER_LAT, lng: PLAYER_LNG };
const playerCoins: Coin[] = [];
const caches: Map<string, Geocache> = new Map();
const cacheMarkers: Map<string, L.Marker> = new Map();

// Function to spawn a cache
function spawnCache(i: number, j: number): void {
  const luckValue = luck(`${i},${j}`);
  const numCoins = Math.floor(Math.pow(luckValue, 0.5) * COIN_SCALE_FACTOR); // Apply power transformation and generate between 0 and 10 coins
  console.log(
    `Cache at (${i}, ${j}) with luck value ${luckValue} has ${numCoins} coins`,
  );
  const cache = new Geocache(i, j, numCoins);
  const bounds = board.getCellBounds({ i, j });
  const center = bounds.getCenter();
  const marker = L.marker(center).addTo(map).bindPopup(getPopupContent(i, j));
  L.rectangle(bounds, { color: "#ff7800", weight: 1 }).addTo(map);
  caches.set(`${i},${j}`, cache);
  cacheMarkers.set(`${i},${j}`, marker);
  marker.on("click", () => {
    marker.setPopupContent(getPopupContent(i, j));
  });
}

// Function to get popup content
function getPopupContent(i: number, j: number): string {
  const cache = caches.get(`${i},${j}`);
  let content = `Cache at (${i}, ${j}) with ${
    cache?.coins.length ?? 0
  } coins<br>`;
  if (cache && cache.coins.length > 0 && isPlayerAtCache(i, j)) {
    cache.coins.forEach((coin) => {
      content +=
        `<button onclick="window.pickUpCoin(${i}, ${j}, ${coin.serial})">Pick Up Coin ${coin.i}:${coin.j}#${coin.serial}</button><br>`;
    });
  }
  if (playerCoins.length > 0 && isPlayerAtCache(i, j)) {
    playerCoins.forEach((coin) => {
      content +=
        `<button onclick="window.dropCoin(${i}, ${j}, ${coin.serial})">Drop Coin ${coin.i}:${coin.j}#${coin.serial}</button><br>`;
    });
  }
  console.log(`Popup content for cache at (${i}, ${j}): ${content}`);
  return content;
}

// Function to check if player is at cache location
function isPlayerAtCache(i: number, j: number): boolean {
  const bounds = board.getCellBounds({ i, j });
  const isAtCache = bounds.contains(
    L.latLng(playerPosition.lat, playerPosition.lng),
  );
  console.log(`Player at cache (${i}, ${j}): ${isAtCache}`);
  return isAtCache;
}

// Function to move the player
function movePlayer(latOffset: number, lngOffset: number) {
  playerPosition.lat += latOffset;
  playerPosition.lng += lngOffset;
  playerMarker.setLatLng([playerPosition.lat, playerPosition.lng]);
  map.setView([playerPosition.lat, playerPosition.lng]);
  updateAllCacheMarkers();
}

// Function to pick up a coin
function pickUpCoin(i: number, j: number, serial: number) {
  const cache = caches.get(`${i},${j}`);
  if (cache) {
    const coin = cache.pickUpCoin(serial);
    if (coin) {
      playerCoins.push(coin);
      alert(
        `Picked up coin ${coin.i}:${coin.j}#${serial}. You now have ${playerCoins.length} coins.`,
      );
      updateCacheMarker(i, j);
      updateInventory();
    } else {
      alert("Coin not found.");
    }
  } else {
    alert("No cache found.");
  }
}

// Function to drop a coin
function dropCoin(i: number, j: number, serial: number) {
  const cache = caches.get(`${i},${j}`);
  if (cache) {
    const index = playerCoins.findIndex((coin) => coin.serial === serial);
    if (index !== -1) {
      const coin = playerCoins.splice(index, 1)[0];
      cache.dropCoin(coin);
      alert(
        `Dropped coin ${coin.i}:${coin.j}#${serial}. Cache now has ${cache.coins.length} coins.`,
      );
      updateCacheMarker(i, j);
      updateInventory();
    } else {
      alert("Coin not found in inventory.");
    }
  } else {
    alert("No cache found.");
  }
}

// Function to update the cache marker popup
function updateCacheMarker(i: number, j: number) {
  const marker = cacheMarkers.get(`${i},${j}`);
  if (marker) {
    marker.setPopupContent(getPopupContent(i, j));
  }
}

// Function to update all cache markers
function updateAllCacheMarkers() {
  caches.forEach((_, key) => {
    const [i, j] = key.split(",").map(Number);
    updateCacheMarker(i, j);
  });
}

// Function to update the player's inventory display
function updateInventory() {
  const inventory = document.getElementById("inventory");
  if (inventory) {
    inventory.innerHTML = "<h2>Inventory</h2>";
    playerCoins.forEach((coin) => {
      inventory.innerHTML += `<div>${coin.i}:${coin.j}#${coin.serial}</div>`;
    });
  }
}

// Function to initialize the game
function initializeGame() {
  // Generate cache locations
  const originCell = board.getCellForPoint(L.latLng(PLAYER_LAT, PLAYER_LNG));
  const { i: originI, j: originJ } = originCell;

  for (let di = -TILE_VISIBILITY_RADIUS; di <= TILE_VISIBILITY_RADIUS; di++) {
    for (let dj = -TILE_VISIBILITY_RADIUS; dj <= TILE_VISIBILITY_RADIUS; dj++) {
      const i = originI + di;
      const j = originJ + dj;
      if (luck([i, j].toString()) < CACHE_PROBABILITY) {
        spawnCache(i, j);
      }
    }
  }

  // Bind control buttons to functions
  document
    .getElementById("move-up")
    ?.addEventListener("click", () => movePlayer(PLAYER_MOVE_OFFSET, 0));
  document
    .getElementById("move-down")
    ?.addEventListener("click", () => movePlayer(-PLAYER_MOVE_OFFSET, 0));
  document
    .getElementById("move-left")
    ?.addEventListener("click", () => movePlayer(0, -PLAYER_MOVE_OFFSET));
  document
    .getElementById("move-right")
    ?.addEventListener("click", () => movePlayer(0, PLAYER_MOVE_OFFSET));

  // Expose functions to the global scope for popup buttons
  (globalThis as unknown as GlobalThis).pickUpCoin = pickUpCoin;
  (globalThis as unknown as GlobalThis).dropCoin = dropCoin;
}

// Initialize the game
initializeGame();
