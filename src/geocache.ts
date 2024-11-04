interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

export class Geocache implements Momento<string> {
  i: number;
  j: number;
  numCoins: number;

  constructor(i: number, j: number, numCoins: number = 0) {
    this.i = i;
    this.j = j;
    this.numCoins = numCoins;
  }

  toMomento(): string {
    return JSON.stringify({ i: this.i, j: this.j, numCoins: this.numCoins });
  }

  fromMomento(momento: string): void {
    const data = JSON.parse(momento);
    this.i = data.i;
    this.j = data.j;
    this.numCoins = data.numCoins;
  }
}
