import { Coin } from "./gameController.ts";

export class InventoryView {
  private inventoryElement: HTMLElement;

  constructor(inventoryElementId: string) {
    const element = document.getElementById(inventoryElementId);
    if (!element) {
      throw new Error(`Element with id ${inventoryElementId} not found`);
    }
    this.inventoryElement = element;
  }

  updateInventory(
    playerCoins: Coin[],
    centerMapOnCache: (i: number, j: number) => void,
  ) {
    this.inventoryElement.innerHTML = "<h2>Inventory</h2>";
    playerCoins.forEach((coin) => {
      const coinCanvas = this.drawCoin(coin);
      const coinDiv = document.createElement("div");
      coinDiv.appendChild(coinCanvas);
      const coinName = document.createElement("span");
      coinName.textContent = `${coin.i}:${coin.j}#${coin.serial}`;
      coinDiv.appendChild(coinName);
      const centerButton = document.createElement("button");
      centerButton.innerHTML = "📍";
      centerButton.onclick = () => centerMapOnCache(coin.i, coin.j);
      coinDiv.appendChild(centerButton);
      this.inventoryElement.appendChild(coinDiv);
    });
  }

  private drawCoin(coin: Coin): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 50;
    canvas.height = 50;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = `hsl(${
        (coin.i + coin.j + coin.serial) % 360
      }, 100%, 50%)`;
      ctx.beginPath();
      ctx.arc(25, 25, 20, 0, 2 * Math.PI);
      ctx.fill();
    }
    return canvas;
  }
}
