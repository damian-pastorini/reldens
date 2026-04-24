class TilesetCanvasRenderer
{
    constructor(app)
    {
        this.app = app;
        this.markers = new TilesetCanvasMarkers(this);
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
        let img = new Image();
        img.onload = () => {
            this.app.imageCache[tilesetIndex] = img;
            this.drawCanvas(canvas, img, tileset, tilesetIndex);
        };
        img.src = tileset.imageUrl;
    }

    drawCanvas(canvas, img, tileset, tilesetIndex)
    {
        if(canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight){
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
        }
        let ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        this.drawTileGrid(ctx, tileset);
        this.drawFilteredTiles(ctx, tileset);
        this.drawElementTiles(ctx, tileset, tilesetIndex);
        this.drawSpotTiles(ctx, tileset, tilesetIndex);
        this.markers.draw(ctx, tileset, tilesetIndex);
        if(this.app.isAreaSelect && this.app.areaSelectTileset === tilesetIndex){
            this.drawAreaSelectRect(ctx, tileset);
        }
        this.applyZoom(tilesetIndex);
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
            let pos = this.app.tileGeometry.getTilePosition(tileset, tile);
            ctx.globalAlpha = 0.06;
            ctx.fillRect(pos.x, pos.y, tileset.tileWidth, tileset.tileHeight);
            ctx.globalAlpha = 0.2;
            ctx.strokeRect(pos.x, pos.y, tileset.tileWidth, tileset.tileHeight);
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
        let colors = {'over-player':'#5b8cff','collisions':'#ff5b5b','collisions-over-player':'#ff5bff','base':'#d4a017','below-player':'#5bff8c','path':'#f0a040'};
        if(colors[type]){
            return colors[type];
        }
        return '#8888aa';
    }

    drawTile(ctx, tileset, tile, color, lineWidth, dashed, dimmed)
    {
        let pos = this.app.tileGeometry.getTilePosition(tileset, tile);
        ctx.save();
        ctx.globalAlpha = dimmed ? 0.1 : 0.35;
        ctx.fillStyle = color;
        ctx.fillRect(pos.x, pos.y, tileset.tileWidth, tileset.tileHeight);
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = dimmed ? 0.25 : 1;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if(dashed){
            ctx.setLineDash([4, 3]);
        }
        ctx.strokeRect(
            pos.x + lineWidth/2, pos.y + lineWidth/2,
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
        if('spot' === element.type){
            return;
        }
        let tilePickActive = this.isTilePickActive();
        if(!tilePickActive && hasSelection && !this.app.showAllElements){
            return;
        }
        let color = SharedUtils.colorForIndex(element.colorIndex);
        let isCluster = 'cluster' === element.type;
        let drawnKeys = new Set();
        let dimmed = hasSelection;
        for(let layer of element.layers){
            this.drawElementLayerTiles(ctx, tileset, layer, color, isCluster, dimmed, drawnKeys);
        }
    }

    drawElementTiles(ctx, tileset, tilesetIndex)
    {
        if(!this.markers.isMapObjectsTabActive(tilesetIndex)){
            return;
        }
        let hasSelection = this.app.selectedTileset === tilesetIndex
            && null !== this.app.selectedElement;
        let selectedEl = null;
        for(let ei = 0; ei < tileset.elements.length; ei++){
            let element = tileset.elements[ei];
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
        canvas.style.width = Math.round(canvas.width * zoom)+'px';
        canvas.style.height = Math.round(canvas.height * zoom)+'px';
    }

    drawSpotTiles(ctx, tileset, tilesetIndex)
    {
        if(!this.markers.isMapObjectsTabActive(tilesetIndex)){
            return;
        }
        let spots = tileset.spots;
        if(!spots || !spots.length){
            return;
        }
        let hasSelection = this.app.selectedSpot && this.app.selectedSpot.tilesetIndex === tilesetIndex;
        let selectedSpot = null;
        for(let si = 0; si < spots.length; si++){
            if(hasSelection && this.app.selectedSpot.spotIndex === si){
                selectedSpot = spots[si];
                continue;
            }
            this.drawSingleSpot(ctx, tileset, spots[si], hasSelection);
        }
        if(selectedSpot){
            this.drawSingleSpot(ctx, tileset, selectedSpot, false);
        }
    }

    drawSingleSpot(ctx, tileset, spot, dimmed)
    {
        let cols = tileset.tilesetColumns;
        let flatIndices = this.collectSpotFlatIndices(spot);
        ctx.save();
        ctx.strokeStyle = '#ff8c5b';
        ctx.lineWidth = 2;
        for(let fi of flatIndices){
            let tile = [Math.floor(fi / cols), fi % cols];
            let pos = this.app.tileGeometry.getTilePosition(tileset, tile);
            ctx.globalAlpha = dimmed ? 0.1 : 0.4;
            ctx.fillStyle = '#ff8c5b';
            ctx.fillRect(pos.x, pos.y, tileset.tileWidth, tileset.tileHeight);
            ctx.globalAlpha = dimmed ? 0.25 : 1;
            ctx.strokeRect(pos.x + 1, pos.y + 1, tileset.tileWidth - 2, tileset.tileHeight - 2);
        }
        ctx.restore();
    }

    collectSpotFlatIndices(spot)
    {
        let indices = new Set();
        if(null !== spot.spotTile && undefined !== spot.spotTile){
            indices.add(spot.spotTile);
        }
        if(spot.spotTileVariations){
            for(let fi of spot.spotTileVariations){
                indices.add(fi);
            }
        }
        this.addPositionalIndices(indices, spot.surroundingTiles);
        this.addPositionalIndices(indices, spot.corners);
        this.addPositionalIndices(indices, spot.bordersTiles);
        this.addPositionalIndices(indices, spot.borderCornersTiles);
        return indices;
    }

    addPositionalIndices(indices, posObj)
    {
        if(!posObj){
            return;
        }
        for(let key of Object.keys(posObj)){
            let fi = posObj[key];
            if(null !== fi && undefined !== fi){
                indices.add(fi);
            }
        }
    }
}
