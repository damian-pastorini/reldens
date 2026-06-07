class MapElementsCanvasPainter
{
    constructor(editor)
    {
        this.editor = editor;
        this.outOfBoundsColor = 'rgba(224,84,84,0.55)';
        this.hoverColor = 'rgba(91,140,255,0.35)';
        this.dragColor = 'rgba(91,255,140,0.5)';
        this.baseCanvas = null;
        this.baseCtx = null;
        this.baseDirty = true;
        this.tilesetLut = null;
        this.lastCanvasWidth = 0;
        this.lastCanvasHeight = 0;
    }

    markBaseDirty()
    {
        this.baseDirty = true;
    }

    render()
    {
        let mapJson = this.editor.mapJson;
        this.ensureCanvasSize(mapJson);
        this.ensureBaseCache(mapJson);
        let ctx = this.editor.ctx;
        ctx.clearRect(0, 0, this.editor.canvas.width, this.editor.canvas.height);
        if(this.baseCanvas){
            ctx.drawImage(this.baseCanvas, 0, 0);
        }
        this.drawHover();
        this.drawDragGhost();
        this.drawDuplicateGhost();
    }

    ensureCanvasSize(mapJson)
    {
        let width = mapJson.width * mapJson.tilewidth;
        let height = mapJson.height * mapJson.tileheight;
        if(width === this.lastCanvasWidth && height === this.lastCanvasHeight){
            return;
        }
        this.editor.canvas.width = width;
        this.editor.canvas.height = height;
        this.lastCanvasWidth = width;
        this.lastCanvasHeight = height;
        this.baseDirty = true;
        this.tilesetLut = null;
    }

    ensureBaseCache(mapJson)
    {
        if(!this.baseDirty && this.baseCanvas){
            return;
        }
        if(!this.baseCanvas){
            this.baseCanvas = document.createElement('canvas');
        }
        if(this.baseCanvas.width !== this.editor.canvas.width){
            this.baseCanvas.width = this.editor.canvas.width;
        }
        if(this.baseCanvas.height !== this.editor.canvas.height){
            this.baseCanvas.height = this.editor.canvas.height;
        }
        this.baseCtx = this.baseCanvas.getContext('2d');
        this.baseCtx.clearRect(0, 0, this.baseCanvas.width, this.baseCanvas.height);
        this.paintAllLayersInto(this.baseCtx, mapJson);
        this.baseDirty = false;
    }

    ensureTilesetLut(mapJson)
    {
        if(this.tilesetLut){
            return this.tilesetLut;
        }
        if(!mapJson.tilesets || 0 === mapJson.tilesets.length){
            this.tilesetLut = {
                columns: 0,
                spacing: 0,
                margin: 0,
                tileWidth: mapJson.tilewidth,
                tileHeight: mapJson.tileheight
            };
            return this.tilesetLut;
        }
        let tilesetInfo = mapJson.tilesets[0];
        let spacing = tilesetInfo.spacing ? tilesetInfo.spacing : 0;
        let margin = tilesetInfo.margin ? tilesetInfo.margin : 0;
        this.tilesetLut = {
            columns: Math.floor((tilesetInfo.imagewidth - 2 * margin + spacing) / (mapJson.tilewidth + spacing)),
            spacing,
            margin,
            tileWidth: mapJson.tilewidth,
            tileHeight: mapJson.tileheight,
            mapWidth: mapJson.width
        };
        return this.tilesetLut;
    }

    paintAllLayersInto(ctx, mapJson)
    {
        let tileset = this.editor.tileset;
        if(!tileset){
            return;
        }
        let lut = this.ensureTilesetLut(mapJson);
        if(0 === lut.columns){
            return;
        }
        for(let mapLayer of mapJson.layers){
            if('tilelayer' !== mapLayer.type){
                continue;
            }
            this.paintLayerInto(ctx, mapLayer, lut, tileset);
        }
    }

    paintLayerInto(ctx, mapLayer, lut, tileset)
    {
        for(let i = 0; i < mapLayer.data.length; i++){
            if(0 === mapLayer.data[i]){
                continue;
            }
            let tileId = mapLayer.data[i] - 1;
            ctx.drawImage(
                tileset,
                lut.margin + (tileId % lut.columns) * (lut.tileWidth + lut.spacing),
                lut.margin + Math.floor(tileId / lut.columns) * (lut.tileHeight + lut.spacing),
                lut.tileWidth,
                lut.tileHeight,
                (i % lut.mapWidth) * lut.tileWidth,
                Math.floor(i / lut.mapWidth) * lut.tileHeight,
                lut.tileWidth,
                lut.tileHeight
            );
        }
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
        this.fillElementTiles(
            element,
            dragState.currentCol - dragState.anchorCol,
            dragState.currentRow - dragState.anchorRow,
            dragState.outOfBounds ? this.outOfBoundsColor : this.dragColor
        );
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
