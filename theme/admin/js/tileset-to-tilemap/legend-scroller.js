class TilesetLegendScroller
{
    constructor(app)
    {
        this.app = app;
    }

    scrollIntoView(list, row)
    {
        if(!list || !row){
            return;
        }
        list.scrollTop = row.getBoundingClientRect().top - list.getBoundingClientRect().top + list.scrollTop;
    }

    scrollLegendRowIntoView(tilesetIndex, selector)
    {
        let refs = this.app.refs[tilesetIndex];
        if(!refs || !refs.list){
            return;
        }
        this.scrollIntoView(refs.list, refs.list.querySelector(selector));
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
        let selectedRow = list.querySelector('.element-row[data-element-index="'+this.app.selectedElement+'"]');
        this.scrollIntoView(list, selectedRow);
    }

    scrollLegendToSpot(tilesetIndex, spotIndex)
    {
        let list = this.app.refs[tilesetIndex].list;
        let spots = this.app.state[tilesetIndex].spots;
        if(!spots || !spots[spotIndex]){
            return;
        }
        this.scrollIntoView(list, list.querySelector('.spot-row[data-spot-name="'+spots[spotIndex].name+'"]'));
    }

    scrollCanvasToElement(tilesetIndex, elementIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let element = tileset.elements[elementIndex];
        if(!element){
            return;
        }
        let topLeft = this.findTopLeftTile(this.app.collectElementTiles(element));
        if(!topLeft){
            return;
        }
        this.scrollCanvasToTile(tilesetIndex, topLeft);
    }

    scrollCanvasToTile(tilesetIndex, tile)
    {
        let tilePos = this.app.tileGeometry.getTilePosition(this.app.state[tilesetIndex], tile);
        let zoom = this.app.zoomLevels[tilesetIndex] || 1;
        let panel = this.app.refs[tilesetIndex].canvas.parentElement;
        panel.scrollLeft = Math.max(0, tilePos.x * zoom - panel.clientWidth / 2);
        panel.scrollTop = Math.max(0, tilePos.y * zoom - panel.clientHeight / 2);
    }

    scrollCanvasToSpot(tilesetIndex, spotIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let spot = tileset.spots ? tileset.spots[spotIndex] : null;
        if(!spot){
            return;
        }
        let topLeft = this.findTopLeftTile(this.spotTiles(tileset, spot));
        if(!topLeft){
            return;
        }
        this.scrollCanvasToTile(tilesetIndex, topLeft);
    }

    spotTiles(tileset, spot)
    {
        let tiles = [];
        for(let flatIndex of this.app.renderer.spotDrawer.collectSpotFlatIndices(spot)){
            tiles.push(this.app.tileGeometry.flatIndexToTile(tileset, flatIndex));
        }
        return tiles;
    }

    findTopLeftTile(tiles)
    {
        let topLeft = null;
        for(let tile of tiles){
            if(!topLeft){
                topLeft = tile;
                continue;
            }
            topLeft = [Math.min(topLeft[0], tile[0]), Math.min(topLeft[1], tile[1])];
        }
        return topLeft;
    }
}
window.TilesetLegendScroller = TilesetLegendScroller;
