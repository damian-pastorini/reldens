class MapsElementsCanvasPainter
{
    static HOVER_ALPHA = 0.35;
    static GHOST_ALPHA = 0.6;
    static FADED_ALPHA = 0.3;
    static OUT_OF_BOUNDS_COLOR = 'rgba(224,84,84,0.55)';

    constructor(editor)
    {
        this.editor = editor;
    }

    render()
    {
        let mapJson = this.editor.mapJson;
        this.editor.canvas.width = mapJson.width * mapJson.tilewidth;
        this.editor.canvas.height = mapJson.height * mapJson.tileheight;
        this.editor.ctx.clearRect(0, 0, this.editor.canvas.width, this.editor.canvas.height);
        this.drawBase();
        this.drawHover();
        this.drawDragGhost();
    }

    drawBase()
    {
        let mapJson = this.editor.mapJson;
        let draggedId = this.editor.mover.dragState ? this.editor.mover.dragState.instanceId : null;
        let draggedLayerNames = draggedId ? this.collectLayerNames(draggedId) : null;
        for(let mapLayer of mapJson.layers){
            if('tilelayer' !== mapLayer.type){
                continue;
            }
            this.drawLayer(mapLayer, draggedLayerNames);
        }
    }

    collectLayerNames(instanceId)
    {
        let element = this.editor.mover.findByInstance(instanceId);
        if(!element){
            return null;
        }
        let names = new Set();
        for(let elementLayer of element.layers){
            names.add(elementLayer.name);
        }
        return names;
    }

    drawLayer(mapLayer, draggedLayerNames)
    {
        let ctx = this.editor.ctx;
        ctx.save();
        if(draggedLayerNames && draggedLayerNames.has(mapLayer.name)){
            ctx.globalAlpha = MapsElementsCanvasPainter.FADED_ALPHA;
        }
        this.paintLayerData(mapLayer);
        ctx.restore();
    }

    paintLayerData(mapLayer)
    {
        let tileset = this.editor.tileset;
        if(!tileset){
            return;
        }
        let mapJson = this.editor.mapJson;
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
        let columns = tilesetInfo.imagewidth / (mapJson.tilewidth + (tilesetInfo.spacing || 0));
        let margin = tilesetInfo.margin || 0;
        let spacing = tilesetInfo.spacing || 0;
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
        this.fillElementTiles(element, 0, 0, 'rgba(91,140,255,0.35)');
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
        let color = dragState.outOfBounds ? MapsElementsCanvasPainter.OUT_OF_BOUNDS_COLOR : 'rgba(91,255,140,0.5)';
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
window.MapsElementsCanvasPainter = MapsElementsCanvasPainter;
