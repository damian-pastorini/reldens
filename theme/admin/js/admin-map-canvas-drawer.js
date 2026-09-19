class AdminMapCanvasDrawer
{
    drawMap(mapCanvasContext, tileset, mapData)
    {
        let tilesetInfo = mapData.tilesets[0];
        for(let layer of mapData.layers){
            if('tilelayer' !== layer.type){
                continue;
            }
            this.drawLayerTiles(mapCanvasContext, tileset, tilesetInfo, layer);
        }
    }

    drawLayerTiles(mapCanvasContext, tileset, tilesetInfo, layer)
    {
        let tileWidth = tilesetInfo.tilewidth;
        let tileHeight = tilesetInfo.tileheight;
        let margin = tilesetInfo.margin;
        let spacing = tilesetInfo.spacing;
        let columns = tilesetInfo.imagewidth / (tilesetInfo.tilewidth + tilesetInfo.spacing);
        let width = layer.width;
        for(let index = 0; index < layer.data.length; index++){
            let tileIndex = Number(layer.data[index]);
            if(0 === tileIndex){
                continue;
            }
            let colIndex = index % width;
            let rowIndex = Math.floor(index / width);
            let tileId = tileIndex - 1;
            let sx = margin + (tileId % columns) * (tileWidth + spacing);
            let sy = margin + Math.floor(tileId / columns) * (tileHeight + spacing);
            mapCanvasContext.drawImage(
                tileset,
                sx,
                sy,
                tileWidth,
                tileHeight,
                colIndex * tileWidth,
                rowIndex * tileHeight,
                tileWidth,
                tileHeight
            );
        }
    }

    drawTiles(canvasContext, canvasWidth, canvasHeight, tileWidth, tileHeight)
    {
        canvasContext.save();
        canvasContext.globalAlpha = 0.4;
        canvasContext.strokeStyle = '#ccc';
        canvasContext.lineWidth = 2;
        for(let x = 0; x < canvasWidth; x += tileWidth){
            this.drawTileColumn(canvasContext, x, canvasHeight, tileWidth, tileHeight);
        }
        canvasContext.restore();
    }

    drawTileColumn(canvasContext, x, canvasHeight, tileWidth, tileHeight)
    {
        for(let y = 0; y < canvasHeight; y += tileHeight){
            canvasContext.strokeRect(x, y, tileWidth, tileHeight);
        }
    }

    drawSelectedTile(canvasContext, tileX, tileY, tileWidth, tileHeight)
    {
        canvasContext.save();
        canvasContext.globalAlpha = 0.35;
        canvasContext.fillStyle = '#e05454';
        canvasContext.fillRect(tileX, tileY, tileWidth, tileHeight);
        canvasContext.globalAlpha = 1;
        canvasContext.strokeStyle = '#e05454';
        canvasContext.lineWidth = 2;
        canvasContext.strokeRect(tileX, tileY, tileWidth, tileHeight);
        canvasContext.restore();
    }

    highlightTile(mouseX, mouseY, tileWidth, tileHeight, canvasContext)
    {
        let tileCol = Math.floor(mouseX / tileWidth);
        let tileRow = Math.floor(mouseY / tileHeight);
        let highlightX = tileCol * tileWidth;
        let highlightY = tileRow * tileHeight;
        canvasContext.save();
        canvasContext.strokeStyle = 'red';
        canvasContext.lineWidth = 2;
        canvasContext.strokeRect(highlightX, highlightY, tileWidth, tileHeight);
        canvasContext.restore();
    }
}
window.adminMapCanvasDrawer = new AdminMapCanvasDrawer();
