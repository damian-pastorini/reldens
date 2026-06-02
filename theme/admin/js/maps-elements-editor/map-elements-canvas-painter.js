class MapElementsCanvasPainter
{
    constructor(editor)
    {
        this.editor = editor;
        this.outOfBoundsColor = 'rgba(224,84,84,0.55)';
        this.hoverColor = 'rgba(91,140,255,0.35)';
        this.dragColor = 'rgba(91,255,140,0.5)';
    }

    render()
    {
        let mapJson = this.editor.mapJson;
        this.editor.canvas.width = mapJson.width * mapJson.tilewidth;
        this.editor.canvas.height = mapJson.height * mapJson.tileheight;
        this.drawBase();
        this.drawHover();
        this.drawDragGhost();
        this.drawDuplicateGhost();
    }

    drawDuplicateGhost()
    {
        let placingState = this.editor.duplicator.placingState;
        if(!placingState){
            return;
        }
        let color = placingState.outOfBounds ? this.outOfBoundsColor : this.dragColor;
        this.fillElementTiles(
            placingState.source,
            placingState.ghostCol - placingState.source.bounds.col,
            placingState.ghostRow - placingState.source.bounds.row,
            color
        );
    }

    drawBase()
    {
        for(let mapLayer of this.editor.mapJson.layers){
            if('tilelayer' !== mapLayer.type){
                continue;
            }
            this.paintLayerData(mapLayer);
        }
    }

    paintLayerData(mapLayer)
    {
        let tileset = this.editor.tileset;
        if(!tileset){
            return;
        }
        let mapJson = this.editor.mapJson;
        if(!mapJson.tilesets || 0 === mapJson.tilesets.length){
            return;
        }
        let tilesetInfo = mapJson.tilesets[0];
        for(let i = 0; i < mapLayer.data.length; i++){
            this.paintCell(mapLayer.data[i], i, tileset, tilesetInfo, mapJson);
        }
    }

    paintCell(gid, index, tileset, tilesetInfo, mapJson)
    {
        if(0 === gid){
            return;
        }
        let tileId = gid - 1;
        let spacing = tilesetInfo.spacing ? tilesetInfo.spacing : 0;
        let margin = tilesetInfo.margin ? tilesetInfo.margin : 0;
        let columns = Math.floor((tilesetInfo.imagewidth - 2 * margin + spacing) / (mapJson.tilewidth + spacing));
        let sx = margin + (tileId % columns) * (mapJson.tilewidth + spacing);
        let sy = margin + Math.floor(tileId / columns) * (mapJson.tileheight + spacing);
        this.editor.ctx.drawImage(
            tileset,
            sx,
            sy,
            mapJson.tilewidth,
            mapJson.tileheight,
            (index % mapJson.width) * mapJson.tilewidth,
            Math.floor(index / mapJson.width) * mapJson.tileheight,
            mapJson.tilewidth,
            mapJson.tileheight
        );
    }

    drawHover()
    {
        if(this.editor.mover.dragState){
            return;
        }
        let instanceId = this.editor.hoveredInstanceId;
        if(!instanceId){
            return;
        }
        let element = this.editor.mover.findByInstance(instanceId);
        if(!element){
            return;
        }
        this.fillElementTiles(element, 0, 0, this.hoverColor);
    }

    drawDragGhost()
    {
        let dragState = this.editor.mover.dragState;
        if(!dragState){
            return;
        }
        let element = this.editor.mover.findByInstance(dragState.instanceId);
        if(!element){
            return;
        }
        let color = dragState.outOfBounds
            ? this.outOfBoundsColor
            : this.dragColor;
        this.fillElementTiles(
            element,
            dragState.currentCol - dragState.anchorCol,
            dragState.currentRow - dragState.anchorRow,
            color
        );
    }

    fillElementTiles(element, deltaCol, deltaRow, color)
    {
        let ctx = this.editor.ctx;
        let mapJson = this.editor.mapJson;
        ctx.save();
        ctx.fillStyle = color;
        for(let elementLayer of element.layers){
            this.fillLayerTiles(ctx, elementLayer.tiles, deltaCol, deltaRow, mapJson.tilewidth, mapJson.tileheight);
        }
        ctx.restore();
    }

    fillLayerTiles(ctx, tiles, deltaCol, deltaRow, tileWidth, tileHeight)
    {
        for(let tile of tiles){
            ctx.fillRect((tile.col + deltaCol) * tileWidth, (tile.row + deltaRow) * tileHeight, tileWidth, tileHeight);
        }
    }
}
window.MapElementsCanvasPainter = MapElementsCanvasPainter;
