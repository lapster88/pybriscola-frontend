import Card from './card'

class Dealer {
  constructor(scene) {
    this.dealCards = () => {
      for (let i = 0; i < 8; i++) {
        let playerCard = new Card(scene);
        playerCard.render(290 + (i * 100), 550, 'cardBack');

        //let opponentCard = new Card(scene);
        //scene.opponentCards.push(opponentCard.render(290 + (i * 100), 125, 'cardBack').disableInteractive());
      }
    }
  }
}

export default Dealer;
