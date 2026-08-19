class AdminMapRenderer
{
    constructor()
    {
        this.mapsBucket = '/assets/maps/';
        this.loadedMapsData = {};
    }

    fetchMapData(mapJsonPath)
    {
        if(this.loadedMapsData[mapJsonPath]){
            return Promise.resolve(this.loadedMapsData[mapJsonPath]);
        }
        return fetch(mapJsonPath)
            .then((response) => response.json())
            .then((data) => {
                this.loadedMapsData[mapJsonPath] = data;
                return data;
            });
    }

    fetchMapFileAndDraw(mapJson, tileset, mapCanvas, withTileHighlight, tileClickCallback, withTileSelect, initialTileIndex, initialPosition)
    {
        if(!mapJson){
            return false;
        }
        this.fetchMapData(mapJson)
            .then(data => {
                mapCanvas.width = data.width * data.tilewidth;
                mapCanvas.height = data.height * data.tileheight;
                let mapCanvasContext = mapCanvas.getContext('2d');
                let baseCanvas = this.createBaseCanvas(tileset, data);
                let selectedTile = this.resolveInitialSelectedTile(initialTileIndex, initialPosition, data);
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
        adminMapCanvasDrawer.drawMap(baseCanvasContext, tileset, data);
        adminMapCanvasDrawer.drawTiles(baseCanvasContext, baseCanvas.width, baseCanvas.height, data.tilewidth, data.tileheight);
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

    positionFromTileIndex(tileIndex, data)
    {
        let position = this.tileIndexToPosition(tileIndex, data);
        if(null === position.x){
            return position;
        }
        position.x += (data.tilewidth / 2);
        position.y += (data.tileheight / 2);
        return position;
    }

    positionToTileIndex(positionX, positionY, data)
    {
        if(null === positionX){
            return null;
        }
        if('' === positionX){
            return null;
        }
        if(null === positionY){
            return null;
        }
        if('' === positionY){
            return null;
        }
        let numericX = Number(positionX);
        if(isNaN(numericX)){
            return null;
        }
        let numericY = Number(positionY);
        if(isNaN(numericY)){
            return null;
        }
        return (Math.floor(numericY / data.tileheight) * data.width) + Math.floor(numericX / data.tilewidth);
    }

    resolveInitialSelectedTile(initialTileIndex, initialPosition, data)
    {
        let positionFromIndex = this.tileIndexToPosition(initialTileIndex, data);
        if(null !== positionFromIndex.x){
            return positionFromIndex;
        }
        if(!initialPosition){
            return {x: null, y: null};
        }
        return this.tileIndexToPosition(this.positionToTileIndex(initialPosition.x, initialPosition.y, data), data);
    }

    renderMap(mapCanvasContext, baseCanvas, selectedTile, data, hoverX, hoverY)
    {
        mapCanvasContext.clearRect(0, 0, baseCanvas.width, baseCanvas.height);
        mapCanvasContext.drawImage(baseCanvas, 0, 0);
        if(null !== selectedTile.x && null !== selectedTile.y){
            adminMapCanvasDrawer.drawSelectedTile(mapCanvasContext, selectedTile.x, selectedTile.y, data.tilewidth, data.tileheight);
        }
        if(null !== hoverX && null !== hoverY){
            adminMapCanvasDrawer.highlightTile(hoverX, hoverY, data.tilewidth, data.tileheight, mapCanvasContext);
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

    loadAndCreateMap(mapJsonFileName, mapSceneImages, appendOnElement, tileClickCallback, withTileSelect, initialTileIndex, initialPosition)
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
        tileset.src = this.mapsBucket+sceneImages[0];
        tileset.onload = () => {
            this.fetchMapFileAndDraw(
                this.mapsBucket+mapJsonFileName,
                tileset,
                mapCanvas,
                true,
                tileClickCallback,
                withTileSelect,
                initialTileIndex,
                initialPosition
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

    findRoomById(roomsList, roomId)
    {
        if(!roomsList){
            return false;
        }
        return roomsList.find((room) => String(room.id) === String(roomId));
    }

    toggleMapPicker(mapContainer, appendAfterElement, mapSource, tileClickCallback, initialTileIndex, initialPosition)
    {
        if(!mapContainer.classList.contains('hidden')){
            mapContainer.classList.add('hidden');
            return false;
        }
        if(!mapSource || !mapSource.mapFile){
            return false;
        }
        appendAfterElement.after(mapContainer);
        mapContainer.classList.remove('hidden');
        this.loadMapPickerContent(mapContainer, mapSource, tileClickCallback, initialTileIndex, initialPosition);
        return true;
    }

    loadMapPickerContent(mapContainer, mapSource, tileClickCallback, initialTileIndex, initialPosition)
    {
        mapContainer.innerHTML = '';
        this.loadAndCreateMap(
            mapSource.mapFile,
            mapSource.mapImages,
            mapContainer,
            tileClickCallback,
            true,
            initialTileIndex,
            initialPosition
        );
    }

    attachInlinePickerButton(pickerButton, fieldInput)
    {
        let fieldValueSpan = fieldInput.parentElement;
        fieldValueSpan.classList.add('with-inline-button');
        fieldValueSpan.appendChild(pickerButton);
        pickerButton.classList.remove('hidden');
    }
}
window.adminMapRenderer = new AdminMapRenderer();
