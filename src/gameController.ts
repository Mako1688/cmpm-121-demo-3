import { Board } from "./board.ts";
import * as L from "leaflet";
import luck from "./luck.ts";
import { Geocache } from "./geocache.ts";
import { InventoryView } from "./inventoryView.ts";

// Constants
const PLAYER_LAT = 36.9895;
const PLAYER_LNG = -122.0628;
const MAP_ZOOM_LEVEL = 15;
const CACHE_PROBABILITY = 0.1;
const COIN_SCALE_FACTOR = 11;
const STORAGE_KEY = "geocoin-carrier-state";

export interface Coin {
  i: number;
  j: number;
  serial: number;
}

export class GameController {
  private board: Board;
  private map: L.Map;
  private playerPosition: { lat: number; lng: number };
  private playerCoins: Coin[];
  private playerPath: L.LatLng[];
  private cacheMarkers: Map<string, L.Marker>;
  private cacheRectangles: Map<string, L.Rectangle>;
  private playerPolyline: L.Polyline | null;
  private geolocationWatchId: number | null;
  private playerMarker: L.Marker;
  private inventoryView: InventoryView;

  constructor(board: Board, map: L.Map, inventoryView: InventoryView) {
    this.board = board;
    this.map = map;
    this.playerPosition = { lat: PLAYER_LAT, lng: PLAYER_LNG };
    this.playerCoins = [];
    this.playerPath = [];
    this.cacheMarkers = new Map();
    this.cacheRectangles = new Map();
    this.playerPolyline = null;
    this.geolocationWatchId = null;
    this.playerMarker = L.marker([PLAYER_LAT, PLAYER_LNG])
      .addTo(this.map)
      .bindPopup("Player");
    this.inventoryView = inventoryView;

    // Listen for custom events
    document.addEventListener("pickUpCoin", (event) => {
      const { i, j, serial } = (event as CustomEvent).detail;
      this.pickUpCoin(i, j, serial);
    });

    document.addEventListener("dropCoin", (event) => {
      const { i, j, serial } = (event as CustomEvent).detail;
      this.dropCoin(i, j, serial);
    });

    document.addEventListener("centerMapOnCache", (event) => {
      const { i, j } = (event as CustomEvent).detail;
      this.centerMapOnCache(i, j);
    });
  }

  setPlayerPosition(lat: number, lng: number) {
    this.playerPosition.lat = lat;
    this.playerPosition.lng = lng;
    this.updatePlayerMarker();
  }

  movePlayerTo(lat: number, lng: number) {
    this.setPlayerPosition(lat, lng);
    this.map.setView([lat, lng], MAP_ZOOM_LEVEL);
  }

  updatePlayerMarker() {
    this.playerMarker.setLatLng([
      this.playerPosition.lat,
      this.playerPosition.lng,
    ]);
  }

  pickUpCoin(i: number, j: number, serial: number) {
    const cache = this.board.getCache(i, j);
    if (cache) {
      const coin = cache.pickUpCoin(serial);
      if (coin) {
        this.playerCoins.push(coin);
        this.updateInventory();
        this.updateCacheMarker(i, j);
        this.saveGameState();
      }
    }
  }

  dropCoin(i: number, j: number, serial: number) {
    const cache = this.board.getCache(i, j);
    if (cache) {
      const index = this.playerCoins.findIndex(
        (coin) => coin.serial === serial,
      );
      if (index !== -1) {
        const [coin] = this.playerCoins.splice(index, 1);
        cache.dropCoin(coin);
        this.updateInventory();
        this.updateCacheMarker(i, j);
        this.saveGameState();
      }
    }
  }

  centerMapOnCache(i: number, j: number) {
    const bounds = this.board.getCellBounds({ i, j });
    const center = bounds.getCenter();
    this.map.setView(center, MAP_ZOOM_LEVEL);
  }

  createCacheMarker(i: number, j: number) {
    const bounds = this.board.getCellBounds({ i, j });
    const center = bounds.getCenter();
    const marker = L.marker(center)
      .addTo(this.map)
      .bindPopup(this.getPopupContent(i, j));
    const rectangle = L.rectangle(bounds, {
      color: "#ff7800",
      weight: 1,
    }).addTo(this.map);
    this.cacheMarkers.set(`${i},${j}`, marker);
    this.cacheRectangles.set(`${i},${j}`, rectangle);
    marker.on("click", () => {
      marker.setPopupContent(this.getPopupContent(i, j));
    });
  }

  spawnCache(i: number, j: number): void {
    const luckValue = luck(`${i},${j}`);
    const numCoins = Math.floor(Math.pow(luckValue, 0.5) * COIN_SCALE_FACTOR);
    const cache = new Geocache(i, j, numCoins);
    this.board.setCache(i, j, cache);
    this.createCacheMarker(i, j);
  }

  getPopupContent(i: number, j: number): string {
    const cache = this.board.getCache(i, j);
    let content = `Cache at (${i}, ${j}) with ${
      cache?.coins.length ?? 0
    } coins<br>`;
    if (cache && cache.coins.length > 0 && this.isPlayerAtCache(i, j)) {
      cache.coins.forEach((coin) => {
        content +=
          `<button data-i="${i}" data-j="${j}" data-serial="${coin.serial}" class="pick-up-coin">Pick Up Coin ${coin.i}:${coin.j}#${coin.serial}</button><br>`;
      });
    }
    if (this.playerCoins.length > 0 && this.isPlayerAtCache(i, j)) {
      this.playerCoins.forEach((coin) => {
        content +=
          `<button data-i="${i}" data-j="${j}" data-serial="${coin.serial}" class="drop-coin">Drop Coin ${coin.i}:${coin.j}#${coin.serial}</button><br>`;
      });
    }
    if (cache) {
      content +=
        `<button data-i="${i}" data-j="${j}" class="center-map-on-cache">Go to Cache ${i}:${j}</button><br>`;
    }
    return content;
  }

  isPlayerAtCache(i: number, j: number): boolean {
    const bounds = this.board.getCellBounds({ i, j });
    return bounds.contains(
      L.latLng(this.playerPosition.lat, this.playerPosition.lng),
    );
  }

  movePlayer(latOffset: number, lngOffset: number) {
    this.playerPosition.lat += latOffset;
    this.playerPosition.lng += lngOffset;
    this.map.setView([this.playerPosition.lat, this.playerPosition.lng]);
    this.updatePlayerMarker();
    this.playerPath.push(
      L.latLng(this.playerPosition.lat, this.playerPosition.lng),
    );
    this.updateVisibleCaches();
    this.updatePlayerPath();
    this.saveGameState();
  }

  updatePlayerPath() {
    if (this.playerPolyline) {
      this.map.removeLayer(this.playerPolyline);
    }
    this.playerPolyline = L.polyline(this.playerPath, { color: "blue" }).addTo(
      this.map,
    );
  }

  updateCacheMarker(i: number, j: number) {
    const marker = this.cacheMarkers.get(`${i},${j}`);
    if (marker) {
      marker.setPopupContent(this.getPopupContent(i, j));
    }
  }

  updateInventory() {
    this.inventoryView.updateInventory(this.playerCoins);
  }

  updateVisibleCaches() {
    const visibleCells = this.board.getCellsNearPoint(
      L.latLng(this.playerPosition.lat, this.playerPosition.lng),
    );
    const visibleCellKeys = new Set(
      visibleCells.map((cell) => `${cell.i},${cell.j}`),
    );

    visibleCells.forEach((cell) => {
      const { i, j } = cell;
      if (!this.cacheMarkers.has(`${i},${j}`)) {
        const momento = this.board.getCacheMomento(i, j);
        if (momento) {
          this.board.setCacheFromMomento(i, j, momento);
          this.createCacheMarker(i, j);
        } else if (luck([i, j].toString()) < CACHE_PROBABILITY) {
          this.spawnCache(i, j);
        }
      }
    });

    this.cacheMarkers.forEach((_, key) => {
      if (!visibleCellKeys.has(key)) {
        const [i, j] = key.split(",").map(Number);
        const momento = this.board.getCacheMomento(i, j);
        if (momento) {
          this.board.setCacheFromMomento(i, j, momento);
        }
        const marker = this.cacheMarkers.get(key);
        const rectangle = this.cacheRectangles.get(key);
        if (marker) {
          this.map.removeLayer(marker);
          this.cacheMarkers.delete(key);
        }
        if (rectangle) {
          this.map.removeLayer(rectangle);
          this.cacheRectangles.delete(key);
        }
      }
    });
  }

  saveGameState() {
    const state = {
      playerPosition: this.playerPosition,
      playerCoins: this.playerCoins,
      playerPath: this.playerPath,
      caches: Array.from(this.board.getAllCaches().entries()).map(
        ([key, cache]) => ({
          key,
          momento: cache.toMomento(),
        }),
      ),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  loadGameState() {
    const state = localStorage.getItem(STORAGE_KEY);
    if (state) {
      const {
        playerPosition: savedPosition,
        playerCoins: savedCoins,
        playerPath: savedPath,
        caches,
      } = JSON.parse(state);
      this.playerPosition.lat = savedPosition.lat;
      this.playerPosition.lng = savedPosition.lng;
      this.playerCoins.push(...savedCoins);
      this.playerPath.push(...savedPath);
      caches.forEach(({ key, momento }: { key: string; momento: string }) => {
        const [i, j] = key.split(",").map(Number);
        this.board.setCacheFromMomento(i, j, momento);
        this.createCacheMarker(i, j);
      });
      this.map.setView([this.playerPosition.lat, this.playerPosition.lng]);
      this.updatePlayerMarker();
      this.updateInventory();
      this.updatePlayerPath();
    }
  }

  enableGeolocation() {
    if (navigator.geolocation) {
      this.geolocationWatchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.movePlayer(
            latitude - this.playerPosition.lat,
            longitude - this.playerPosition.lng,
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

  disableGeolocation() {
    if (this.geolocationWatchId !== null) {
      navigator.geolocation.clearWatch(this.geolocationWatchId);
      this.geolocationWatchId = null;
    }
  }

  resetGameState() {
    if (confirm("Are you sure you want to reset the game state?")) {
      this.playerPosition.lat = PLAYER_LAT;
      this.playerPosition.lng = PLAYER_LNG;
      this.playerCoins.length = 0;
      this.playerPath.length = 0;
      this.board.clearCaches();
      this.cacheMarkers.forEach((marker) => this.map.removeLayer(marker));
      this.cacheMarkers.clear();
      this.cacheRectangles.forEach((rectangle) =>
        this.map.removeLayer(rectangle)
      );
      this.cacheRectangles.clear();
      if (this.playerPolyline) {
        this.map.removeLayer(this.playerPolyline);
        this.playerPolyline = null;
      }
      this.map.setView([PLAYER_LAT, PLAYER_LNG]);
      this.updatePlayerMarker();
      this.updateInventory();
      this.updateVisibleCaches();
      this.saveGameState();
    }
  }
}
