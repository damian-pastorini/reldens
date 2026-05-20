class TilesetLegendScroller
{
    constructor(app)
    {
        this.app = app;
    }

    scrollLegendToSelected(tilesetIndex)
    {
        if(this.app.selectedTileset !== tilesetIndex){
            return;
        }
        if(null === this.app.selectedElement){
            return;
        }
        let list = this.app.refs[tilesetIndex].list;
        let rows = list.querySelectorAll('.element-row');
        let targetRow = rows[this.app.selectedElement];
        if(!targetRow){
            return;
        }
        list.scrollTop = targetRow.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    }

    scrollLegendToSpot(tilesetIndex, spotIndex)
    {
        let list = this.app.refs[tilesetIndex].list;
        let spots = this.app.state[tilesetIndex].spots;
        if(!spots || !spots[spotIndex]){
            return;
        }
        let row = list.querySelector('.spot-row[data-spot-name="'+spots[spotIndex].name+'"]');
        if(!row){
            return;
        }
        list.scrollTop = row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    }

    scrollCanvasToElement(tilesetIndex, elementIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let element = tileset.elements[elementIndex];
        if(!element){
            return;
        }
        let allTiles = this.app.collectElementTiles(element);
        if(!allTiles.length){
            return;
        }
        let firstTile = [...allTiles].shift();
        let minRow = firstTile[0];
        let minCol = firstTile[1];
        for(let tile of allTiles){
            if(tile[0] < minRow){
                minRow = tile[0];
            }
            if(tile[1] < minCol){
                minCol = tile[1];
            }
        }
        let tilePos = this.app.tileGeometry.getTilePosition(tileset, [minRow, minCol]);
        let zoom = this.app.zoomLevels[tilesetIndex] || 1;
        let panel = this.app.refs[tilesetIndex].canvas.parentElement;
        panel.scrollLeft = Math.max(0, tilePos.x * zoom - panel.clientWidth / 2);
        panel.scrollTop = Math.max(0, tilePos.y * zoom - panel.clientHeight / 2);
    }
}
window.TilesetLegendScroller = TilesetLegendScroller;
