import leaflet from "leaflet";
import { Geocache } from "./geocache.ts";

interface Cell {
  readonly i: number;
  readonly j: number;
}

export class Board {
  readonly tileWidth: number;
  readonly tileVisibilityRadius: number;
  private readonly knownCells: Map<string, Cell>;
  private readonly caches: Map<string, Geocache>;

  constructor(tileWidth: number, tileVisibilityRadius: number) {
    this.tileWidth = tileWidth;
    this.tileVisibilityRadius = tileVisibilityRadius;
    this.knownCells = new Map<string, Cell>();
    this.caches = new Map<string, Geocache>();
  }

  private getCanonicalCell(cell: Cell): Cell {
    const { i, j } = cell;
    const key = [i, j].toString();
    if (!this.knownCells.has(key)) {
      this.knownCells.set(key, cell);
    }
    return this.knownCells.get(key)!;
  }

  getCellForPoint(point: leaflet.LatLng): Cell {
    const i = Math.floor(point.lat / this.tileWidth);
    const j = Math.floor(point.lng / this.tileWidth);
    return this.getCanonicalCell({ i, j });
  }

  getCellBounds(cell: Cell): leaflet.LatLngBounds {
    const { i, j } = cell;
    const southWest = leaflet.latLng(i * this.tileWidth, j * this.tileWidth);
    const northEast = leaflet.latLng(
      (i + 1) * this.tileWidth,
      (j + 1) * this.tileWidth,
    );
    return leaflet.latLngBounds(southWest, northEast);
  }

  getCellsNearPoint(point: leaflet.LatLng): Cell[] {
    const resultCells: Cell[] = [];
    const originCell = this.getCellForPoint(point);
    const { i, j } = originCell;

    for (
      let di = -this.tileVisibilityRadius;
      di <= this.tileVisibilityRadius;
      di++
    ) {
      for (
        let dj = -this.tileVisibilityRadius;
        dj <= this.tileVisibilityRadius;
        dj++
      ) {
        resultCells.push(this.getCanonicalCell({ i: i + di, j: j + dj }));
      }
    }

    return resultCells;
  }

  getCache(i: number, j: number): Geocache | null {
    const key = `${i},${j}`;
    return this.caches.get(key) || null;
  }

  setCache(i: number, j: number, cache: Geocache): void {
    const key = `${i},${j}`;
    this.caches.set(key, cache);
  }

  getCacheMomento(i: number, j: number): string | null {
    const cache = this.getCache(i, j);
    return cache ? cache.toMomento() : null;
  }

  setCacheFromMomento(i: number, j: number, momento: string): void {
    const cache = new Geocache(i, j);
    cache.fromMomento(momento);
    this.setCache(i, j, cache);
  }

  getAllCaches(): Map<string, Geocache> {
    return this.caches;
  }

  clearCaches(): void {
    this.caches.clear();
  }
}
