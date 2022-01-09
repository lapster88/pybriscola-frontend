import Card from '../helpers/card';
import Dealer from "../helpers/dealer";
import Trick from '../helpers/trick';

import CardBack from '../assets/back.svg';

export default class Game extends Phaser.Scene {
  constructor() {
    super({
      key: 'Game'
    });
  }

  preload() {
    this.load.svg('cardBack', CardBack, { scale: 2});
  }

  create() {
    this.cameras.main.backgroundColor.setTo(53,101,77);

    this.isPlayerA = false;
    this.opponentCards = [];

    this.zone = new Trick(this);
    this.dropZone = this.zone.renderZone();
    this.outline = this.zone.renderOutline(this.dropZone);

    this.dealer = new Dealer(this);

    let self = this;

    self.dealer.dealCards();

    this.titleText = this.add.text(16, 16, ['Briscola Chiamata']).setFontSize(18).setFontFamily('Trebuchet MS').setColor('#ebd234')

    this.turnText = this.add.text(1132, 16, ['Player 1: 0', 'Player 2: 0', 'Player 3: 0', 'Player 4: 0', 'Player 5: 0']).setFontSize(18).setFontFamily('Trebuchet MS').setColor('#ebd234').setLineSpacing(16)

    this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
      gameObject.x = dragX;
      gameObject.y = dragY;
    })

    this.input.on('dragstart', function (pointer, gameObject) {
      gameObject.setTint(0xff69b4);
      self.children.bringToTop(gameObject);
    })

    this.input.on('dragend', function (pointer, gameObject, dropped) {
      gameObject.setTint();
      if (!dropped) {
        gameObject.x = gameObject.input.dragStartX;
        gameObject.y = gameObject.input.dragStartY;
      }
    })

    this.input.on('drop', function (pointer, gameObject, dropZone) {
      dropZone.data.values.cards++;
      gameObject.x = (dropZone.x - 350) + (dropZone.data.values.cards * 50);
      gameObject.y = dropZone.y;
      gameObject.disableInteractive();
    })
  }

  update() {

  }
}