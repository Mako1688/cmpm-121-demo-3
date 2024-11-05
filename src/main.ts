// Extend the Window interface to include our functions
declare global {
  interface Window {
    pickUpCoins: (i: number, j: number) => void;
    dropOffCoins: (i: number, j: number) => void;
  }
}

// Marco Ogaz-Vega
// CMPM 121

import L from "leaflet";
import { Board } from "./board.ts";
import { Geocache } from "./geocache.ts";
import luck from "./luck.ts";

// Initialize the map
const playerLat = 36.9895;
const playerLng = -122.0628;
const map = L.map("map").setView([playerLat, playerLng], 15);

// Add a tile layer to the map
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

const board = new Board(0.0001, 8);

// Add player marker
const playerMarker = L.marker([playerLat, playerLng])
  .addTo(map)
  .bindPopup("Player");

const playerPosition = { lat: playerLat, lng: playerLng };
let playerCoins = 0;
const caches: Map<string, Geocache> = new Map();
const cacheMarkers: Map<string, L.Marker> = new Map();

// Function to spawn a cache
function spawnCache(i: number, j: number): void {
  const luckValue = luck(`${i},${j}`);
  const numCoins = Math.floor(Math.pow(luckValue, 0.5) * 11); // Apply power transformation and generate between 0 and 10 coins
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
  let content = `Cache at (${i}, ${j}) with ${cache?.numCoins ?? 0} coins<br>`;
  if (cache && cache.numCoins > 0 && isPlayerAtCache(i, j)) {
    content +=
      `<button onclick="window.pickUpCoins(${i}, ${j})">Pick Up Coins</button><br>`;
  }
  if (playerCoins > 0 && isPlayerAtCache(i, j)) {
    content +=
      `<button onclick="window.dropOffCoins(${i}, ${j})">Drop Off Coins</button>`;
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

// Function to pick up coins
function pickUpCoins(i: number, j: number) {
  const cache = caches.get(`${i},${j}`);
  if (cache && cache.numCoins > 0) {
    playerCoins += cache.numCoins;
    alert(
      `Picked up ${cache.numCoins} coins. You now have ${playerCoins} coins.`,
    );
    cache.numCoins = 0;
    updateCacheMarker(i, j);
  } else {
    alert("No coins to pick up here.");
  }
}

// Function to drop off coins
function dropOffCoins(i: number, j: number) {
  const cache = caches.get(`${i},${j}`);
  if (cache) {
    cache.numCoins += playerCoins;
    alert(
      `Dropped off ${playerCoins} coins. Cache now has ${cache.numCoins} coins.`,
    );
    playerCoins = 0;
    updateCacheMarker(i, j);
  } else {
    alert("No cache to drop off coins here.");
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

// Generate cache locations
const originCell = board.getCellForPoint(L.latLng(playerLat, playerLng));
const { i: originI, j: originJ } = originCell;

for (let di = -8; di <= 8; di++) {
  for (let dj = -8; dj <= 8; dj++) {
    const i = originI + di;
    const j = originJ + dj;
    if (luck([i, j].toString()) < 0.1) {
      // 10% probability
      spawnCache(i, j);
    }
  }
}

// Bind control buttons to functions
document
  .getElementById("move-up")
  ?.addEventListener("click", () => movePlayer(0.00005, 0));
document
  .getElementById("move-down")
  ?.addEventListener("click", () => movePlayer(-0.00005, 0));
document
  .getElementById("move-left")
  ?.addEventListener("click", () => movePlayer(0, -0.00005));
document
  .getElementById("move-right")
  ?.addEventListener("click", () => movePlayer(0, 0.00005));

// Expose functions to the global scope for popup buttons
(globalThis as unknown as Window).pickUpCoins = pickUpCoins;
(globalThis as unknown as Window).dropOffCoins = dropOffCoins;
