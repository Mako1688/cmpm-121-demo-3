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
const STORAGE_KEY = "geocoin-carrier-state";

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
const playerPath: L.LatLng[] = [];
const cacheMarkers: Map<string, L.Marker> = new Map();
const cacheRectangles: Map<string, L.Rectangle> = new Map();
let geolocationWatchId: number | null = null;
let playerPolyline: L.Polyline | null = null;

// Function to spawn a cache
function spawnCache(i: number, j: number): void {
  const luckValue = luck(`${i},${j}`);
  const numCoins = Math.floor(Math.pow(luckValue, 0.5) * COIN_SCALE_FACTOR); // Apply power transformation and generate between 0 and 10 coins
  console.log(
    `Cache at (${i}, ${j}) with luck value ${luckValue} has ${numCoins} coins`,
  );
  const cache = new Geocache(i, j, numCoins);
  board.setCache(i, j, cache);
  const bounds = board.getCellBounds({ i, j });
  const center = bounds.getCenter();
  const marker = L.marker(center).addTo(map).bindPopup(getPopupContent(i, j));
  const rectangle = L.rectangle(bounds, { color: "#ff7800", weight: 1 }).addTo(
    map,
  );
  cacheMarkers.set(`${i},${j}`, marker);
  cacheRectangles.set(`${i},${j}`, rectangle);
  marker.on("click", () => {
    marker.setPopupContent(getPopupContent(i, j));
  });
}

// Function to get popup content
function getPopupContent(i: number, j: number): string {
  const cache = board.getCache(i, j);
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
  playerPath.push(L.latLng(playerPosition.lat, playerPosition.lng));
  updateVisibleCaches();
  updatePlayerPath();
  saveGameState();
}

// Function to update the player's path
function updatePlayerPath() {
  if (playerPolyline) {
    map.removeLayer(playerPolyline);
  }
  playerPolyline = L.polyline(playerPath, { color: "blue" }).addTo(map);
}

// Function to pick up a coin
function pickUpCoin(i: number, j: number, serial: number) {
  const cache = board.getCache(i, j);
  if (cache) {
    const coin = cache.pickUpCoin(serial);
    if (coin) {
      playerCoins.push(coin);
      alert(
        `Picked up coin ${coin.i}:${coin.j}#${serial}. You now have ${playerCoins.length} coins.`,
      );
      updateCacheMarker(i, j);
      updateInventory();
      saveGameState();
    } else {
      alert("Coin not found.");
    }
  } else {
    alert("No cache found.");
  }
}

// Function to drop a coin
function dropCoin(i: number, j: number, serial: number) {
  const cache = board.getCache(i, j);
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
      saveGameState();
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
function _updateAllCacheMarkers() {
  cacheMarkers.forEach((_, key) => {
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

// Function to update visible caches based on player's position
function updateVisibleCaches() {
  const visibleCells = board.getCellsNearPoint(
    L.latLng(playerPosition.lat, playerPosition.lng),
  );
  const visibleCellKeys = new Set(
    visibleCells.map((cell) => `${cell.i},${cell.j}`),
  );

  // Add new visible caches
  visibleCells.forEach((cell) => {
    const { i, j } = cell;
    if (!cacheMarkers.has(`${i},${j}`)) {
      const momento = board.getCacheMomento(i, j);
      if (momento) {
        board.setCacheFromMomento(i, j, momento);
        const bounds = board.getCellBounds({ i, j });
        const center = bounds.getCenter();
        const marker = L.marker(center)
          .addTo(map)
          .bindPopup(getPopupContent(i, j));
        const rectangle = L.rectangle(bounds, {
          color: "#ff7800",
          weight: 1,
        }).addTo(map);
        cacheMarkers.set(`${i},${j}`, marker);
        cacheRectangles.set(`${i},${j}`, rectangle);
        marker.on("click", () => {
          marker.setPopupContent(getPopupContent(i, j));
        });
      } else if (luck([i, j].toString()) < CACHE_PROBABILITY) {
        spawnCache(i, j);
      }
    }
  });

  // Remove caches that are out of range
  cacheMarkers.forEach((_, key) => {
    if (!visibleCellKeys.has(key)) {
      const [i, j] = key.split(",").map(Number);
      const momento = board.getCacheMomento(i, j);
      if (momento) {
        board.setCacheFromMomento(i, j, momento);
      }
      const marker = cacheMarkers.get(key);
      const rectangle = cacheRectangles.get(key);
      if (marker) {
        map.removeLayer(marker);
        cacheMarkers.delete(key);
      }
      if (rectangle) {
        map.removeLayer(rectangle);
        cacheRectangles.delete(key);
      }
    }
  });
}

// Function to save the game state to localStorage
function saveGameState() {
  const state = {
    playerPosition,
    playerCoins,
    playerPath,
    caches: Array.from(board.getAllCaches().entries()).map(([key, cache]) => ({
      key,
      momento: cache.toMomento(),
    })),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Function to load the game state from localStorage
function loadGameState() {
  const state = localStorage.getItem(STORAGE_KEY);
  if (state) {
    const {
      playerPosition: savedPosition,
      playerCoins: savedCoins,
      playerPath: savedPath,
      caches,
    } = JSON.parse(state);
    playerPosition.lat = savedPosition.lat;
    playerPosition.lng = savedPosition.lng;
    playerCoins.push(...savedCoins);
    playerPath.push(...savedPath);
    caches.forEach(({ key, momento }: { key: string; momento: string }) => {
      const [i, j] = key.split(",").map(Number);
      board.setCacheFromMomento(i, j, momento);
      const bounds = board.getCellBounds({ i, j });
      const center = bounds.getCenter();
      const marker = L.marker(center)
        .addTo(map)
        .bindPopup(getPopupContent(i, j));
      const rectangle = L.rectangle(bounds, {
        color: "#ff7800",
        weight: 1,
      }).addTo(map);
      cacheMarkers.set(`${i},${j}`, marker);
      cacheRectangles.set(`${i},${j}`, rectangle);
      marker.on("click", () => {
        marker.setPopupContent(getPopupContent(i, j));
      });
    });
    playerMarker.setLatLng([playerPosition.lat, playerPosition.lng]);
    map.setView([playerPosition.lat, playerPosition.lng]);
    updateInventory();
    updatePlayerPath();
  }
}

// Function to enable geolocation
function enableGeolocation() {
  if (navigator.geolocation) {
    geolocationWatchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        movePlayer(
          latitude - playerPosition.lat,
          longitude - playerPosition.lng,
        );
      },
      (error) => {
        console.error("Geolocation error:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      },
    );
  } else {
    alert("Geolocation is not supported by this browser.");
  }
}

// Function to disable geolocation
function _disableGeolocation() {
  if (geolocationWatchId !== null) {
    navigator.geolocation.clearWatch(geolocationWatchId);
    geolocationWatchId = null;
  }
}

// Function to reset the game state
function resetGameState() {
  if (confirm("Are you sure you want to reset the game state?")) {
    playerPosition.lat = PLAYER_LAT;
    playerPosition.lng = PLAYER_LNG;
    playerCoins.length = 0;
    playerPath.length = 0;
    board.clearCaches();
    cacheMarkers.forEach((marker) => map.removeLayer(marker));
    cacheMarkers.clear();
    cacheRectangles.forEach((rectangle) => map.removeLayer(rectangle));
    cacheRectangles.clear();
    if (playerPolyline) {
      map.removeLayer(playerPolyline);
      playerPolyline = null;
    }
    playerMarker.setLatLng([PLAYER_LAT, PLAYER_LNG]);
    map.setView([PLAYER_LAT, PLAYER_LNG]);
    updateInventory();
    updateVisibleCaches();
    saveGameState();
  }
}

// Function to initialize the game
function initializeGame() {
  // Load game state from localStorage
  loadGameState();

  // Generate initial cache locations
  updateVisibleCaches();

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
  document
    .getElementById("geolocation")
    ?.addEventListener("click", enableGeolocation);
  document.getElementById("reset")?.addEventListener("click", resetGameState);

  // Expose functions to the global scope for popup buttons
  (globalThis as unknown as GlobalThis).pickUpCoin = pickUpCoin;
  (globalThis as unknown as GlobalThis).dropCoin = dropCoin;
}

// Initialize the game
initializeGame();
