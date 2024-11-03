// Marco Ogaz-Vega
// CMPM 121

import L from "leaflet";

// Initialize the map
const map = L.map("map").setView([51.505, -0.09], 13);

// Add a tile layer to the map
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "&copy; OpenStreetMap contributors",
}).addTo(map);

// Create a button element
const button = document.createElement("button");
button.textContent = "Click me";

// Add an event listener to the button
button.addEventListener("click", () => {
  alert("You clicked the button!");
});

// Append the button to the body of the document
document.body.appendChild(button);
