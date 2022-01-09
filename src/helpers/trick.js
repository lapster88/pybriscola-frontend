class Trick {
  constructor(scene) {
    this.renderZone = () => {
      let dropZone = scene.add.zone(650, 250, 250, 250).setRectangleDropZone(150, 250);
      dropZone.setData({ cards: 0 });
      return dropZone;
    };
    this.renderOutline = (dropZone) => {
      let dropZoneOutline = scene.add.graphics();
      dropZoneOutline.lineStyle(4, 0xebd234);
      dropZoneOutline.strokeRect(dropZone.x - dropZone.input.hitArea.width / 2, dropZone.y - dropZone.input.hitArea.height / 2, dropZone.input.hitArea.width, dropZone.input.hitArea.height)
    }
  }
}

export default Trick;
