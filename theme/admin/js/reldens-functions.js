class AdminMapRenderer
{
    fetchMapFileAndDraw(mapJson, tileset, mapCanvas, withTileHighlight, tileClickCallback, withTileSelect)
    {
        if(!mapJson){
            return false;
        }
        let selectedTile = { x: null, y: null };
        fetch(mapJson)
            .then(response => response.json())
            .then(data => {
                mapCanvas.width = data.width * data.tilewidth;
                mapCanvas.height = data.height * data.tileheight;
                let mapCanvasContext = mapCanvas.getContext('2d');
                this.drawMap(mapCanvasContext, tileset, data);
                this.drawTiles(mapCanvasContext, mapCanvas.width, mapCanvas.height, data.tilewidth, data.tileheight);
                if(withTileHighlight){
                    mapCanvas.addEventListener('mousemove', (event) => {
                        let mouseX = event.offsetX;
                        let mouseY = event.offsetY;
                        this.redrawWithHighlight(
                            mapCanvasContext,
                            mapCanvas.width,
                            mapCanvas.height,
                            data,
                            mouseX,
                            mouseY,
                            selectedTile.x,
                            selectedTile.y
                        );
                    });
                }
                if(tileClickCallback){
                    mapCanvas.addEventListener('click', (event) => {
                        this.handleTileClick(event, data, mapCanvasContext, mapCanvas, tileset, withTileSelect, tileClickCallback, selectedTile);
                    });
                }
            })
            .catch((error) => {
                mapCanvas.dataset.loadError = error.message;
                return false;
            });
    }

    handleTileClick(event, data, mapCanvasContext, mapCanvas, tileset, withTileSelect, tileClickCallback, selectedTile)
    {
        let mouseX = event.offsetX;
        let mouseY = event.offsetY;
        let newTileX = Math.floor(mouseX / data.tilewidth) * data.tilewidth;
        let newTileY = Math.floor(mouseY / data.tileheight) * data.tileheight;
        if(withTileSelect){
            if(newTileX === selectedTile.x && newTileY === selectedTile.y){
                selectedTile.x = null;
                selectedTile.y = null;
                this.drawMap(mapCanvasContext, tileset, data);
                this.drawTiles(mapCanvasContext, mapCanvas.width, mapCanvas.height, data.tilewidth, data.tileheight);
                return;
            }
            selectedTile.x = newTileX;
            selectedTile.y = newTileY;
            this.drawMap(mapCanvasContext, tileset, data);
            this.drawTiles(mapCanvasContext, mapCanvas.width, mapCanvas.height, data.tilewidth, data.tileheight);
            this.drawSelectedTile(mapCanvasContext, selectedTile.x, selectedTile.y, data.tilewidth, data.tileheight);
        }
        tileClickCallback(event, data);
    }

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
            // adjusting for 0-based index:
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

    redrawWithHighlight(mapCanvasContext, mapCanvasWidth, mapCanvasHeight, mapData, mouseX, mouseY, selectedTileX, selectedTileY)
    {
        this.drawTiles(mapCanvasContext, mapCanvasWidth, mapCanvasHeight, mapData.tilewidth, mapData.tileheight);
        if(null !== selectedTileX && null !== selectedTileY){
            this.drawSelectedTile(mapCanvasContext, selectedTileX, selectedTileY, mapData.tilewidth, mapData.tileheight);
        }
        this.highlightTile(mouseX, mouseY, mapData.tilewidth, mapData.tileheight, mapCanvasContext);
    }

    loadAndCreateMap(mapJsonFileName, mapSceneImages, appendOnElement, tileClickCallback, withTileSelect)
    {
        let mapCanvas = document.createElement('canvas');
        mapCanvas.classList.add('mapCanvas');
        appendOnElement.appendChild(mapCanvas);
        let sceneImages = mapSceneImages.split(',');
        if(1 < sceneImages.length){
            mapCanvas.dataset.loadError = 'multiple-images';
            return false;
        }
        let tileset = new Image();
        // for now, we will only handle 1 image cases:
        tileset.src = '/assets/maps/'+sceneImages[0];
        tileset.onload = () => {
            this.fetchMapFileAndDraw(
                '/assets/maps/'+mapJsonFileName,
                tileset,
                mapCanvas,
                true,
                tileClickCallback,
                withTileSelect
            );
        };
        tileset.onerror = () => {
            tileset.dataset.loadError = '1';
        };
    }

    calculateTileData(event, data)
    {
        let positionX = event.offsetX;
        let positionY = event.offsetY;
        let tileCol = Math.floor(positionX / data.tilewidth);
        let tileRow = Math.floor(positionY / data.tileheight);
        let result = {tileCol, tileRow, positionX, positionY, cols: data.width, rows: data.height};
        result.positionTileX = (tileCol * data.tilewidth) + (data.tilewidth / 2);
        result.positionTileY = (tileRow * data.tileheight) + (data.tileheight / 2);
        result.tileIndex = (tileRow * data.width) + tileCol;
        return result;
    }
}
window.adminMapRenderer = new AdminMapRenderer();
