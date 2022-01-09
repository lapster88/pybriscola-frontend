import Phaser from "phaser";
import Game from "./scenes/game"

const config = {
  type: Phaser.AUTO,
  parent: "game-container",
  width: 1280,
  height: 720,
  scene: [
    Game
  ]
};

const urlParams = new URLSearchParams(window.location.search);
const gameID = urlParams.get('gameID');

if (gameID) {
  new Phaser.Game(config);
}