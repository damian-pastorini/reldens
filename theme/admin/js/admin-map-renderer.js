class AdminMapRenderer
{
    fetchMapFileAndDraw(mapJson, tileset, mapCanvas, withTileHighlight, tileClickCallback, withTileSelect, initialTileIndex)
    {
        if(!mapJson){
            return false;
        }
        fetch(mapJson)
            .then(response => response.json())
            .then(data => {
                mapCanvas.width = data.width * data.tilewidth;
                mapCanvas.height = data.height * data.tileheight;
                let mapCanvasContext = mapCanvas.getContext('2d');
                let baseCanvas = this.createBaseCanvas(tileset, data);
                let selectedTile = this.tileIndexToPosition(initialTileIndex, data);
                this.renderMap(mapCanvasContext, baseCanvas, selectedTile, data, null, null);
                if(withTileHighlight){
                    mapCanvas.addEventListener('mousemove', (event) => {
                        this.renderMap(mapCanvasContext, baseCanvas, selectedTile, data, event.offsetX, event.offsetY);
                    });
                }
                if(tileClickCallback){
                    mapCanvas.addEventListener('click', (event) => {
                        this.handleTileClick(event, data, mapCanvasContext, baseCanvas, withTileSelect, tileClickCallback, selectedTile);
                    });
                }
            })
            .catch((error) => {
                mapCanvas.dataset.loadError = error.message;
                return false;
            });
    }

    createBaseCanvas(tileset, data)
    {
        let baseCanvas = document.createElement('canvas');
        baseCanvas.width = data.width * data.tilewidth;
        baseCanvas.height = data.height * data.tileheight;
        let baseCanvasContext = baseCanvas.getContext('2d');
        this.drawMap(baseCanvasContext, tileset, data);
        this.drawTiles(baseCanvasContext, baseCanvas.width, baseCanvas.height, data.tilewidth, data.tileheight);
        return baseCanvas;
    }

    tileIndexToPosition(tileIndex, data)
    {
        let position = {x: null, y: null};
        if(null === tileIndex || '' === tileIndex){
            return position;
        }
        let numericIndex = Number(tileIndex);
        if(isNaN(numericIndex)){
            return position;
        }
        position.x = (numericIndex % data.width) * data.tilewidth;
        position.y = Math.floor(numericIndex / data.width) * data.tileheight;
        return position;
    }

    renderMap(mapCanvasContext, baseCanvas, selectedTile, data, hoverX, hoverY)
    {
        mapCanvasContext.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
        mapCanvasContext.drawImage(baseCanvas, 0, 0);
        if(null !== selectedTile.x && null !== selectedTile.y){
            this.drawSelectedTile(mapCanvasContext, selectedTile.x, selectedTile.y, data.tilewidth, data.tileheight);
        }
        if(null !== hoverX && null !== hoverY){
            this.highlightTile(hoverX, hoverY, data.tilewidth, data.tileheight, mapCanvasContext);
        }
    }

    handleTileClick(event, data, mapCanvasContext, baseCanvas, withTileSelect, tileClickCallback, selectedTile)
    {
        let mouseX = event.offsetX;
        let mouseY = event.offsetY;
        if(withTileSelect){
            let newTileX = Math.floor(mouseX / data.tilewidth) * data.tilewidth;
            let newTileY = Math.floor(mouseY / data.tileheight) * data.tileheight;
            if(newTileX === selectedTile.x && newTileY === selectedTile.y){
                selectedTile.x = null;
                selectedTile.y = null;
                this.renderMap(mapCanvasContext, baseCanvas, selectedTile, data, mouseX, mouseY);
                return;
            }
            selectedTile.x = newTileX;
            selectedTile.y = newTileY;
            this.renderMap(mapCanvasContext, baseCanvas, selectedTile, data, mouseX, mouseY);
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

    loadAndCreateMap(mapJsonFileName, mapSceneImages, appendOnElement, tileClickCallback, withTileSelect, initialTileIndex)
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
                withTileSelect,
                initialTileIndex
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

    loadObjectRoomMap(mapContainer, roomsList, roomSelector, tileIndexInput)
    {
        mapContainer.innerHTML = '';
        let selectedRoom = roomsList.find((room) => String(room.id) === String(roomSelector.value));
        if(!selectedRoom){
            return;
        }
        this.loadAndCreateMap(
            selectedRoom.mapFile,
            selectedRoom.mapImages,
            mapContainer,
            (event, data) => {
                tileIndexInput.value = this.calculateTileData(event, data).tileIndex;
            },
            true,
            tileIndexInput.value
        );
    }

    bindObjectTileSelector()
    {
        let mapContainer = document.querySelector('.object-tile-selector-container');
        if(!mapContainer){
            return;
        }
        let entityData = mapContainer.dataset.entitySerializedData
            ? JSON.parse(mapContainer.dataset.entitySerializedData) // HOFF
            : false;
        let roomsList = entityData?.extraData?.roomsList;
        if(!roomsList){
            return;
        }
        let roomSelector = document.querySelector('[name="room_id"]');
        if(!roomSelector){
            return;
        }
        let tileIndexInput = document.querySelector('[name="tile_index"]');
        if(!tileIndexInput){
            return;
        }
        this.loadObjectRoomMap(mapContainer, roomsList, roomSelector, tileIndexInput);
        roomSelector.addEventListener('change', () => {
            this.loadObjectRoomMap(mapContainer, roomsList, roomSelector, tileIndexInput);
        });
    }
}
window.adminMapRenderer = new AdminMapRenderer();
