class TilesetCanvasTileEditor
{
    constructor(app)
    {
        this.app = app;
    }

    findTileInLayer(layer, tileRow, tileCol)
    {
        for(let tile of layer.tiles){
            if(tile[0] === tileRow && tile[1] === tileCol){
                return true;
            }
        }
        return false;
    }

    findTileLayerIndex(element, tileRow, tileCol)
    {
        for(let li = 0; li < element.layers.length; li++){
            if(this.findTileInLayer(element.layers[li], tileRow, tileCol)){
                return li;
            }
        }
        return -1;
    }

    removeTileFromLayer(layer, row, col)
    {
        layer.tiles = layer.tiles.filter(t => !(t[0] === row && t[1] === col));
    }

    countElementTiles(element)
    {
        let total = 0;
        for(let layer of element.layers){
            total += layer.tiles.length;
        }
        return total;
    }

    getTileFromEvent(event, canvas, tileset)
    {
        let rect = canvas.getBoundingClientRect();
        let scaleX = canvas.width / rect.width;
        let scaleY = canvas.height / rect.height;
        let clickX = (event.clientX - rect.left) * scaleX;
        let clickY = (event.clientY - rect.top) * scaleY;
        let tileCol = Math.floor(
            (clickX - tileset.margin) / (tileset.tileWidth + tileset.spacing)
        );
        let tileRow = Math.floor(
            (clickY - tileset.margin) / (tileset.tileHeight + tileset.spacing)
        );
        if(
            tileCol < 0 || tileCol >= tileset.tilesetColumns
            || tileRow < 0 || tileRow >= tileset.tileRows
        ){
            return null;
        }
        return { row: tileRow, col: tileCol };
    }

    handleTileRemoveClick(tilesetIndex, tileRow, tileCol)
    {
        let element = this.app.state[tilesetIndex].elements[this.app.selectedElement];
        let ownerLayerIndex = this.findTileLayerIndex(element, tileRow, tileCol);
        if(-1 === ownerLayerIndex){
            return;
        }
        this.removeTileFromLayer(element.layers[ownerLayerIndex], tileRow, tileCol);
        this.app.refresh(tilesetIndex);
    }

    handleTileRemoveViewAll(tilesetIndex, tileRow, tileCol)
    {
        let tileset = this.app.state[tilesetIndex];
        let ownerElementIndex = -1;
        let ownerLayerIndex = -1;
        for(let ei = 0; ei < tileset.elements.length; ei++){
            let li = this.findTileLayerIndex(tileset.elements[ei], tileRow, tileCol);
            if(-1 === li){
                continue;
            }
            ownerElementIndex = ei;
            ownerLayerIndex = li;
            break;
        }
        if(-1 === ownerElementIndex){
            return;
        }
        let element = tileset.elements[ownerElementIndex];
        this.removeTileFromLayer(element.layers[ownerLayerIndex], tileRow, tileCol);
        if(0 === this.countElementTiles(element)){
            this.app.editor.removeElement(tilesetIndex, ownerElementIndex);
            return;
        }
        this.app.refresh(tilesetIndex);
    }

    handleTileEditClick(tilesetIndex, tileRow, tileCol)
    {
        let element = this.app.state[tilesetIndex].elements[this.app.selectedElement];
        let ownerLayerIndex = this.findTileLayerIndex(element, tileRow, tileCol);
        if(-1 !== ownerLayerIndex){
            let ownerLayer = element.layers[ownerLayerIndex];
            this.removeTileFromLayer(ownerLayer, tileRow, tileCol);
            if(ownerLayer.type === this.app.activeLayerType){
                this.app.refresh(tilesetIndex);
                return;
            }
        }
        let activeLayerIndex = -1;
        for(let li = 0; li < element.layers.length; li++){
            if(element.layers[li].type === this.app.activeLayerType){
                activeLayerIndex = li;
                break;
            }
        }
        if(-1 === activeLayerIndex){
            element.layers.push({ type: this.app.activeLayerType, tiles: [] });
            activeLayerIndex = element.layers.length - 1;
        }
        element.layers[activeLayerIndex].tiles.push([tileRow, tileCol]);
        this.app.refresh(tilesetIndex);
    }

    handleTileSelectClick(tilesetIndex, tileRow, tileCol)
    {
        let elements = this.app.state[tilesetIndex].elements;
        for(let ei = 0; ei < elements.length; ei++){
            let layerIndex = this.findTileLayerIndex(elements[ei], tileRow, tileCol);
            if(-1 !== layerIndex){
                this.app.editor.selectElement(tilesetIndex, ei);
                return;
            }
        }
        let tileset = this.app.state[tilesetIndex];
        let spots = tileset.spots || [];
        let flatIndex = tileRow * tileset.tilesetColumns + tileCol;
        for(let si = 0; si < spots.length; si++){
            if(this.spotHasTile(spots[si], flatIndex)){
                this.app.selectedSpot = { tilesetIndex, spotIndex: si };
                this.app.refresh(tilesetIndex);
                this.app.editor.scrollLegendToSpot(tilesetIndex, si);
                return;
            }
        }
    }

    posMapHasTile(posMap, flatIndex)
    {
        let found = false;
        let keys = Object.keys(posMap);
        for(let key of keys){
            if(posMap[key] === flatIndex){
                found = true;
            }
        }
        return found;
    }

    spotHasTile(spot, flatIndex)
    {
        if(spot.spotTile === flatIndex){
            return true;
        }
        if(spot.spotTileVariations && spot.spotTileVariations.includes(flatIndex)){
            return true;
        }
        let hasPosMapTile = false;
        let posMaps = [spot.surroundingTiles, spot.corners, spot.bordersTiles, spot.borderCornersTiles];
        for(let posMap of posMaps){
            if(posMap && this.posMapHasTile(posMap, flatIndex)){
                hasPosMapTile = true;
            }
        }
        return hasPosMapTile;
    }

    removeTilesInRectFromElement(element, inRect)
    {
        for(let layer of element.layers){
            layer.tiles = layer.tiles.filter(t => !inRect(t));
        }
    }

    applyAreaRemoval(tilesetIndex, minRow, maxRow, minCol, maxCol)
    {
        let tileset = this.app.state[tilesetIndex];
        let inRect = t => t[0] >= minRow && t[0] <= maxRow && t[1] >= minCol && t[1] <= maxCol;
        if(this.app.viewAllMode){
            let toRemove = [];
            for(let ei = 0; ei < tileset.elements.length; ei++){
                let element = tileset.elements[ei];
                this.removeTilesInRectFromElement(element, inRect);
                if(0 === this.countElementTiles(element)){
                    toRemove.push(ei);
                }
            }
            for(let i = toRemove.length - 1; i >= 0; i--){
                tileset.elements.splice(toRemove[i], 1);
            }
            this.app.updatePaletteStyles();
            this.app.refresh(tilesetIndex);
            return;
        }
        if(this.app.selectedTileset !== tilesetIndex){
            return;
        }
        if(null === this.app.selectedElement){
            return;
        }
        let element = tileset.elements[this.app.selectedElement];
        this.removeTilesInRectFromElement(element, inRect);
        this.app.refresh(tilesetIndex);
    }
}
