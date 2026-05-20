class TilesetCanvasRenderer
{
    constructor(app)
    {
        this.app = app;
        this.markers = new TilesetCanvasMarkers(this);
        this.spotDrawer = new TilesetSpotCanvasDrawer(this);
    }

    renderCanvas(tilesetIndex)
    {
        let tileset = this.app.state[tilesetIndex];
        let canvas = this.app.refs[tilesetIndex].canvas;
        let cached = this.app.imageCache[tilesetIndex];
        if(cached){
            this.drawCanvas(canvas, cached, tileset, tilesetIndex);
            return;
        }
        let image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            if(!this.app.state[tilesetIndex] || this.app.state[tilesetIndex] !== tileset){
                return;
            }
            this.app.imageCache[tilesetIndex] = image;
            this.drawCanvas(canvas, image, tileset, tilesetIndex);
        };
        image.onerror = () => {
            canvas.title = 'Failed to load tileset image: '+tileset.imageUrl;
        };
        image.src = tileset.imageUrl;
    }

    drawCanvas(canvas, image, tileset, tilesetIndex)
    {
        let sizeChanged = canvas.width !== image.naturalWidth || canvas.height !== image.naturalHeight;
        if(sizeChanged){
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
        }
        let ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
        this.drawTileGrid(ctx, tileset);
        this.drawFilteredTiles(ctx, tileset);
        this.drawElementTiles(ctx, tileset, tilesetIndex);
        this.spotDrawer.drawSpotTiles(ctx, tileset, tilesetIndex);
        this.markers.draw(ctx, tileset, tilesetIndex);
        if(this.app.isAreaSelect && this.app.areaSelectTileset === tilesetIndex){
            this.drawAreaSelectRect(ctx, tileset);
        }
        if(sizeChanged){
            this.applyZoom(tilesetIndex);
        }
    }

    drawAreaSelectRect(ctx, tileset)
    {
        let start = this.app.areaSelectStart;
        let end = this.app.areaSelectEnd;
        if(!start || !end){
            return;
        }
        let minRow = Math.min(start.row, end.row);
        let maxRow = Math.max(start.row, end.row);
        let minCol = Math.min(start.col, end.col);
        let maxCol = Math.max(start.col, end.col);
        let areaPos = this.app.tileGeometry.getTilePosition(tileset, [minRow, minCol]);
        let x = areaPos.x;
        let y = areaPos.y;
        let w = (maxCol - minCol + 1) * tileset.tileWidth + (maxCol - minCol) * tileset.spacing;
        let h = (maxRow - minRow + 1) * tileset.tileHeight + (maxRow - minRow) * tileset.spacing;
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#ff4444';
        ctx.fillRect(x, y, w, h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 3]);
        ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
        ctx.restore();
    }

    drawFilteredTiles(ctx, tileset)
    {
        if(!tileset.filteredTiles || !tileset.filteredTiles.length){
            return;
        }
        ctx.save();
        ctx.fillStyle = '#888888';
        ctx.strokeStyle = '#555555';
        ctx.lineWidth = 0.5;
        ctx.setLineDash([2, 3]);
        for(let tile of tileset.filteredTiles){
            let tilePos = this.app.tileGeometry.getTilePosition(tileset, tile);
            ctx.globalAlpha = 0.06;
            ctx.fillRect(tilePos.x, tilePos.y, tileset.tileWidth, tileset.tileHeight);
            ctx.globalAlpha = 0.2;
            ctx.strokeRect(tilePos.x, tilePos.y, tileset.tileWidth, tileset.tileHeight);
        }
        ctx.restore();
    }

    drawTileGrid(ctx, tileset)
    {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#96a0b4';
        ctx.lineWidth = 0.5;
        for(let c = 0; c <= tileset.tilesetColumns; c++){
            let x = tileset.margin + c * (tileset.tileWidth + tileset.spacing);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, ctx.canvas.height);
            ctx.stroke();
        }
        for(let r = 0; r <= tileset.tileRows; r++){
            let y = tileset.margin + r * (tileset.tileHeight + tileset.spacing);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(ctx.canvas.width, y);
            ctx.stroke();
        }
        ctx.restore();
    }

    layerTypeColor(type)
    {
        return SharedUtils.LAYER_TYPE_COLORS[type] || '#8888aa';
    }

    fillStrokeTile(ctx, tileset, tile, options)
    {
        let tilePos = this.app.tileGeometry.getTilePosition(tileset, tile);
        ctx.save();
        ctx.fillStyle = options.color;
        ctx.strokeStyle = options.color;
        ctx.lineWidth = options.lineWidth || 1;
        if(options.dashed){
            ctx.setLineDash([4, 3]);
        }
        ctx.globalAlpha = options.alphaFill || 0.35;
        ctx.fillRect(tilePos.x, tilePos.y, tileset.tileWidth, tileset.tileHeight);
        ctx.globalAlpha = options.alphaStroke || 1;
        let lw = options.lineWidth || 1;
        ctx.strokeRect(
            tilePos.x + lw/2, tilePos.y + lw/2,
            tileset.tileWidth - lw, tileset.tileHeight - lw
        );
        ctx.restore();
    }

    drawTile(ctx, tileset, tile, color, lineWidth, dashed, dimmed)
    {
        let tilePos = this.app.tileGeometry.getTilePosition(tileset, tile);
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if(dashed){
            ctx.setLineDash([4, 3]);
        }
        ctx.globalAlpha = dimmed ? 0.1 : 0.35;
        ctx.fillRect(tilePos.x, tilePos.y, tileset.tileWidth, tileset.tileHeight);
        ctx.globalAlpha = dimmed ? 0.25 : 1;
        ctx.strokeRect(
            tilePos.x + lineWidth/2, tilePos.y + lineWidth/2,
            tileset.tileWidth - lineWidth, tileset.tileHeight - lineWidth
        );
        ctx.restore();
    }

    drawSelectedLayerTiles(ctx, tileset, layer, color, lineWidth)
    {
        for(let tile of layer.tiles){
            this.drawTile(ctx, tileset, tile, color, lineWidth);
        }
    }

    drawSelectedElementTiles(ctx, tileset, element)
    {
        for(let layer of element.layers){
            let color = this.layerTypeColor(layer.type);
            let lineWidth = layer.type === this.app.activeLayerType ? 3 : 1.5;
            this.drawSelectedLayerTiles(ctx, tileset, layer, color, lineWidth);
        }
    }

    drawElementLayerTiles(ctx, tileset, layer, color, isCluster, dimmed, drawnKeys)
    {
        for(let tile of layer.tiles){
            let key = SharedUtils.tileKey(tile);
            if(drawnKeys.has(key)){
                continue;
            }
            drawnKeys.add(key);
            this.drawTile(ctx, tileset, tile, color, 2, isCluster, dimmed);
        }
    }

    isTilePickActive()
    {
        return this.app.tileOptionsBinder
            && null !== this.app.tileOptionsBinder.activeOptionKey;
    }

    drawNonSelectedElement(ctx, tileset, element, hasSelection)
    {
        if(SharedUtils.SPOT_TYPE === element.type){
            return;
        }
        let tilePickActive = this.isTilePickActive();
        if(!tilePickActive && hasSelection && !this.app.showAllElements){
            return;
        }
        let color = SharedUtils.colorForIndex(element.colorIndex);
        let isCluster = SharedUtils.CLUSTER_TYPE === element.type;
        let drawnKeys = new Set();
        let dimmed = hasSelection;
        for(let layer of element.layers){
            this.drawElementLayerTiles(ctx, tileset, layer, color, isCluster, dimmed, drawnKeys);
        }
    }

    readVisibilityFilters(tilesetIndex)
    {
        if(!this.markers.isMapObjectsTabActive(tilesetIndex)){
            return null;
        }
        let refs = this.app.refs[tilesetIndex];
        return {
            showElements: !refs || !refs.showElementsCheck || refs.showElementsCheck.checked,
            showClusters: !refs || !refs.showClustersCheck || refs.showClustersCheck.checked,
            showSpots: !refs || !refs.showSpotsCheck || refs.showSpotsCheck.checked
        };
    }

    drawElementTiles(ctx, tileset, tilesetIndex)
    {
        let filters = this.readVisibilityFilters(tilesetIndex);
        if(!filters){
            return;
        }
        let hasSelection = this.app.selectedTileset === tilesetIndex && null !== this.app.selectedElement;
        let selectedEl = null;
        for(let ei = 0; ei < tileset.elements.length; ei++){
            let element = tileset.elements[ei];
            let isCluster = SharedUtils.CLUSTER_TYPE === element.type;
            let isSpotEl = SharedUtils.SPOT_TYPE === element.type;
            if(!((isCluster && filters.showClusters) || (isSpotEl && filters.showSpots) || (!isCluster && !isSpotEl && filters.showElements))){
                continue;
            }
            if(hasSelection && this.app.selectedElement === ei){
                selectedEl = element;
                continue;
            }
            this.drawNonSelectedElement(ctx, tileset, element, hasSelection);
        }
        if(selectedEl){
            this.drawSelectedElementTiles(ctx, tileset, selectedEl);
        }
    }

    applyZoom(tilesetIndex)
    {
        let zoom = this.app.zoomLevels[tilesetIndex] ? this.app.zoomLevels[tilesetIndex] : 1;
        let canvas = this.app.refs[tilesetIndex].canvas;
        canvas.style.width = (canvas.width * zoom)+'px';
        canvas.style.height = (canvas.height * zoom)+'px';
        if(this.app.refs[tilesetIndex]){
            this.app.refs[tilesetIndex].cachedScale = null;
        }
    }

}
window.TilesetCanvasRenderer = TilesetCanvasRenderer;
