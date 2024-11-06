# Geocoin Carrier

## Overview

Geocoin Carrier is a web-based game where players navigate a map to collect and transport coins between geocaches. The game is built using Leaflet for map visualization and TypeScript for game logic. Players can move around the map, pick up coins from geocaches, and drop them off at other geocaches. Each coin has a unique identity based on the cache it was originally spawned in.

## Features

- **Map Navigation**: Players can move around the map using directional buttons.
- **Geocaches**: Geocaches are randomly generated on the map with a variable number of coins.
- **Coin Collection**: Players can pick up individual coins from geocaches.
- **Coin Drop-off**: Players can drop off individual coins at any geocache.
- **Inventory System**: Players can view their collected coins in an inventory display.
- **Unique Coin Identity**: Each coin has a unique identity based on the cache it was originally spawned in, represented as `i:j#serial`.

## Implementations

### Map Initialization

The map is initialized using Leaflet and centered at a specific latitude and longitude. A tile layer is added to the map for visualization.
