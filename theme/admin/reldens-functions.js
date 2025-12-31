/**
 *
 * Reldens - Admin Functions
 *
 * Map rendering and tile interaction functions specific to Reldens admin panel.
 *
 */

function fetchMapFileAndDraw(mapJson, tileset, mapCanvas, withTileHighlight, tileClickCallback)
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
            drawMap(mapCanvasContext, tileset, data);
            drawTiles(mapCanvasContext, mapCanvas.width, mapCanvas.height, data.tilewidth, data.tileheight);
            if(withTileHighlight){
                mapCanvas.addEventListener('mousemove', (event) => {
                    let mouseX = event.offsetX;
                    let mouseY = event.offsetY;
                    // @TODO - BETA - Refactor to only re-draw the highlight area not the entire grid.
                    // highlightTile(mouseX, mouseY, data.tilewidth, data.tileheight, mapCanvasContext);
                    redrawWithHighlight(mapCanvasContext, mapCanvas.width, mapCanvas.height, data, mouseX, mouseY);
                });
            }
            if(tileClickCallback){
                mapCanvas.addEventListener('click', (event) => {
                    tileClickCallback(event, data);
                });
            }
        })
        .catch(error => console.error('Error fetching JSON:', error));
}

function drawMap(mapCanvasContext, tileset, mapData)
{
    // we are assuming there is only one tileset in mapData.tilesets since the maps are coming from the optimizer:
    let tilesetInfo = mapData.tilesets[0];
    let tileWidth = tilesetInfo.tilewidth;
    let tileHeight = tilesetInfo.tileheight;
    let margin = tilesetInfo.margin;
    let spacing = tilesetInfo.spacing;
    let columns = tilesetInfo.imagewidth / (tilesetInfo.tilewidth + tilesetInfo.spacing);
    for(let layer of mapData.layers){
        if('tilelayer' !== layer.type){
            continue;
        }
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
}

function drawTiles(canvasContext, canvasWidth, canvasHeight, tileWidth, tileHeight)
{
    canvasContext.save();
    canvasContext.globalAlpha = 0.4;
    canvasContext.strokeStyle = '#ccc';
    canvasContext.lineWidth = 2;
    for(let x = 0; x < canvasWidth; x += tileWidth){
        for(let y = 0; y < canvasHeight; y += tileHeight){
            canvasContext.strokeRect(x, y, tileWidth, tileHeight);
        }
    }
    canvasContext.restore();
}

function highlightTile(mouseX, mouseY, tileWidth, tileHeight, canvasContext)
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

function redrawWithHighlight(mapCanvasContext, mapCanvasWidth, mapCanvasHeight, mapData, mouseX, mouseY)
{
    drawTiles(mapCanvasContext, mapCanvasWidth, mapCanvasHeight, mapData.tilewidth, mapData.tileheight);
    highlightTile(mouseX, mouseY, mapData.tilewidth, mapData.tileheight, mapCanvasContext);
}

function loadAndCreateMap(mapJsonFileName, mapSceneImages, appendOnElement, tileClickCallback) {
    let mapCanvas = document.createElement('canvas');
    mapCanvas.classList.add('mapCanvas');
    appendOnElement.appendChild(mapCanvas);
    let sceneImages = mapSceneImages.split(',');
    if (1 === sceneImages.length) {
        let tileset = new Image();
        // for now, we will only handle 1 image cases:
        tileset.src = '/assets/maps/' + sceneImages[0];
        tileset.onload = () => {
            fetchMapFileAndDraw(
                '/assets/maps/' + mapJsonFileName,
                tileset,
                mapCanvas,
                true,
                tileClickCallback
            );
        };
        tileset.onerror = () => {
            console.error('Error loading tileset image');
        };
    }
    if (1 < sceneImages.length) {
        console.error('Maps link is not available for tilesets with multiple images for now.');
    }
}

function calculateTileData(event, data)
{
    let positionX = event.offsetX;
    let positionY = event.offsetY;
    let tileCol = Math.floor(positionX / data.tilewidth);
    let tileRow = Math.floor(positionY / data.tileheight);
    let positionTileX = (tileCol * data.tilewidth) + (data.tilewidth / 2);
    let positionTileY = (tileRow * data.tileheight) + (data.tileheight / 2);
    let cols = data.width;
    let rows = data.height;
    let tileIndex = tileRow * cols + tileCol;
    return {tileCol, tileRow, positionTileX, positionTileY, tileIndex, positionX, positionY, cols, rows};
}
