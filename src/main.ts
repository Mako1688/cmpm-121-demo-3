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
  const cache = new Geocache(i, j, Math.floor(Math.random() * 10));
  const bounds = board.getCellBounds({ i, j });
  const center = bounds.getCenter();
  const marker = L.marker(center)
    .addTo(map)
    .bindPopup(`Cache at (${i}, ${j}) with ${cache.numCoins} coins`);
  L.rectangle(bounds, { color: "#ff7800", weight: 1 }).addTo(map);
  caches.set(`${i},${j}`, cache);
  cacheMarkers.set(`${i},${j}`, marker);
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

// Function to move the player
function movePlayer(latOffset: number, lngOffset: number) {
  playerPosition.lat += latOffset;
  playerPosition.lng += lngOffset;
  playerMarker.setLatLng([playerPosition.lat, playerPosition.lng]);
  map.setView([playerPosition.lat, playerPosition.lng]);
}

// Function to pick up coins
function pickUpCoins() {
  const cell = board.getCellForPoint(
    L.latLng(playerPosition.lat, playerPosition.lng),
  );
  const cache = caches.get(`${cell.i},${cell.j}`);
  if (cache && cache.numCoins > 0) {
    playerCoins += cache.numCoins;
    alert(
      `Picked up ${cache.numCoins} coins. You now have ${playerCoins} coins.`,
    );
    cache.numCoins = 0;
    updateCacheMarker(cell.i, cell.j);
  } else {
    alert("No coins to pick up here.");
  }
}

// Function to drop off coins
function dropOffCoins() {
  const cell = board.getCellForPoint(
    L.latLng(playerPosition.lat, playerPosition.lng),
  );
  const cache = caches.get(`${cell.i},${cell.j}`);
  if (cache) {
    cache.numCoins += playerCoins;
    alert(
      `Dropped off ${playerCoins} coins. Cache now has ${cache.numCoins} coins.`,
    );
    playerCoins = 0;
    updateCacheMarker(cell.i, cell.j);
  } else {
    alert("No cache to drop off coins here.");
  }
}

// Function to update the cache marker popup
function updateCacheMarker(i: number, j: number) {
  const cache = caches.get(`${i},${j}`);
  const marker = cacheMarkers.get(`${i},${j}`);
  if (cache && marker) {
    marker.setPopupContent(
      `Cache at (${i}, ${j}) with ${cache.numCoins} coins`,
    );
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
document
  .getElementById("pick-up-coins")
  ?.addEventListener("click", pickUpCoins);
document
  .getElementById("drop-off-coins")
  ?.addEventListener("click", dropOffCoins);
