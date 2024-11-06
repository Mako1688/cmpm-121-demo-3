interface Momento<T> {
  toMomento(): T;
  fromMomento(momento: T): void;
}

export interface Coin {
  i: number;
  j: number;
  serial: number;
}

export class Geocache implements Momento<string> {
  i: number;
  j: number;
  coins: Coin[];

  constructor(i: number, j: number, numCoins: number = 0) {
    this.i = i;
    this.j = j;
    this.coins = [];
    for (let serial = 0; serial < numCoins; serial++) {
      this.coins.push({ i, j, serial });
    }
  }

  toMomento(): string {
    return JSON.stringify({ i: this.i, j: this.j, coins: this.coins });
  }

  fromMomento(momento: string): void {
    const data = JSON.parse(momento);
    this.i = data.i;
    this.j = data.j;
    this.coins = data.coins;
  }

  pickUpCoin(serial: number): Coin | null {
    const index = this.coins.findIndex((coin) => coin.serial === serial);
    if (index !== -1) {
      return this.coins.splice(index, 1)[0];
    }
    return null;
  }

  dropCoin(coin: Coin): void {
    this.coins.push(coin);
  }
}
