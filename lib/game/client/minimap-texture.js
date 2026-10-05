/**
 *
 * Reldens - MinimapTexture
 *
 * Draws the minimap image of a scene map once, when the minimap is created: every map tile is reduced to a
 * pixelsPerTile thumbnail where each pixel is the alpha weighted average of the tile pixels it covers, the thumbnails of
 * every layer are drawn in the layers order (the transparent parts blend with the layers below instead of covering
 * them) and the tiles of the collision layers can be drawn darker, so the minimap shows a clear simplified map instead
 * of a zoomed out view of the game camera. The texture uses the nearest filter, so the pixels keep sharp edges.
 *
 */

const { Textures } = require('phaser');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./game-dom').GameDom} GameDom
 * @typedef {import('./scene-dynamic').SceneDynamic} SceneDynamic
 *
 * @typedef {object} MinimapTextureProps
 * @property {GameDom} gameDom
 * @property {number} pixelsPerTile
 * @property {number} collisionsDarken
 * @property {string} collisionsLayerKey
 * @property {Array<string>} skipLayersKeys
 *
 * @typedef {object} MinimapCellArea
 * @property {number} fromX
 * @property {number} toX
 * @property {number} fromY
 * @property {number} toY
 */
class MinimapTexture
{

    /** @param {MinimapTextureProps} props */
    constructor(props)
    {
        /** @type {GameDom} */
        this.gameDom = props.gameDom;
        /** @type {number} */
        this.pixelsPerTile = props.pixelsPerTile;
        /** @type {number} */
        this.collisionsDarken = props.collisionsDarken;
        /** @type {string} */
        this.collisionsLayerKey = props.collisionsLayerKey;
        /** @type {Array<string>} */
        this.skipLayersKeys = props.skipLayersKeys;
        /** @type {Object<string, ImageData|false>} */
        this.tilesetsPixels = {};
        /** @type {Object<string, HTMLCanvasElement|false>} */
        this.tilesThumbnails = {};
    }

    /**
     * @param {SceneDynamic} scene
     * @param {string} textureKey
     * @returns {Textures.CanvasTexture|false}
     */
    create(scene, textureKey)
    {
        if(scene.textures.exists(textureKey)){
            scene.textures.remove(textureKey);
        }
        let canvasTexture = scene.textures.createCanvas(
            textureKey,
            scene.map.width * this.pixelsPerTile,
            scene.map.height * this.pixelsPerTile
        );
        if(!canvasTexture){
            return false;
        }
        for(let layerIndex of Object.keys(scene.layers)){
            this.drawLayer(canvasTexture.context, scene.layers[layerIndex].layer, scene.map.tilesets);
        }
        canvasTexture.refresh();
        canvasTexture.setFilter(Textures.FilterMode.NEAREST);
        return canvasTexture;
    }

    /**
     * @param {CanvasRenderingContext2D} context
     * @param {Object} layerData
     * @param {Array<Object>} tilesets
     * @returns {boolean}
     */
    drawLayer(context, layerData, tilesets)
    {
        if(this.skipLayersKeys.some(layerKey => -1 !== layerData.name.indexOf(layerKey))){
            return false;
        }
        let darken = -1 !== layerData.name.indexOf(this.collisionsLayerKey) ? this.collisionsDarken : 1;
        for(let tilesRow of layerData.data){
            this.drawTilesRow(context, tilesRow, tilesets, darken);
        }
        return true;
    }

    /**
     * @param {CanvasRenderingContext2D} context
     * @param {Array<Object>} tilesRow
     * @param {Array<Object>} tilesets
     * @param {number} darken
     */
    drawTilesRow(context, tilesRow, tilesets, darken)
    {
        for(let tile of tilesRow){
            if(0 > tile.index){
                continue;
            }
            let tileThumbnail = this.fetchTileThumbnail(tile.index, tilesets, darken);
            if(!tileThumbnail){
                continue;
            }
            context.drawImage(tileThumbnail, tile.x * this.pixelsPerTile, tile.y * this.pixelsPerTile);
        }
    }

    /**
     * @param {number} tileIndex
     * @param {Array<Object>} tilesets
     * @param {number} darken
     * @returns {HTMLCanvasElement|false}
     */
    fetchTileThumbnail(tileIndex, tilesets, darken)
    {
        let cacheKey = tileIndex+'-'+darken;
        if(sc.hasOwn(this.tilesThumbnails, cacheKey)){
            return this.tilesThumbnails[cacheKey];
        }
        let tileset = tilesets.find(mapTileset => mapTileset.containsTileIndex(tileIndex));
        this.tilesThumbnails[cacheKey] = tileset ? this.createTileThumbnail(tileset, tileIndex, darken) : false;
        return this.tilesThumbnails[cacheKey];
    }

    /**
     * @param {Object} tileset
     * @param {number} tileIndex
     * @param {number} darken
     * @returns {HTMLCanvasElement|false}
     */
    createTileThumbnail(tileset, tileIndex, darken)
    {
        let coordinates = tileset.getTileTextureCoordinates(tileIndex);
        if(!coordinates){
            return false;
        }
        let pixels = this.fetchTilesetPixels(tileset);
        if(!pixels){
            return false;
        }
        let canvas = this.gameDom.createElement('canvas');
        canvas.width = this.pixelsPerTile;
        canvas.height = this.pixelsPerTile;
        let context = canvas.getContext('2d');
        let thumbnail = context.createImageData(this.pixelsPerTile, this.pixelsPerTile);
        for(let cellY = 0; cellY < this.pixelsPerTile; cellY++){
            this.drawThumbnailRow(thumbnail, pixels, tileset, coordinates, cellY, darken);
        }
        context.putImageData(thumbnail, 0, 0);
        return canvas;
    }

    /**
     * @param {ImageData} thumbnail
     * @param {ImageData} pixels
     * @param {Object} tileset
     * @param {{x: number, y: number}} coordinates
     * @param {number} cellY
     * @param {number} darken
     */
    drawThumbnailRow(thumbnail, pixels, tileset, coordinates, cellY, darken)
    {
        for(let cellX = 0; cellX < this.pixelsPerTile; cellX++){
            let cellArea = {
                fromX: coordinates.x + Math.floor(cellX * tileset.tileWidth / this.pixelsPerTile),
                toX: coordinates.x + Math.floor((cellX + 1) * tileset.tileWidth / this.pixelsPerTile),
                fromY: coordinates.y + Math.floor(cellY * tileset.tileHeight / this.pixelsPerTile),
                toY: coordinates.y + Math.floor((cellY + 1) * tileset.tileHeight / this.pixelsPerTile)
            };
            this.averageCell(thumbnail, (cellY * this.pixelsPerTile + cellX) * 4, pixels, cellArea, darken);
        }
    }

    /**
     * @param {ImageData} thumbnail
     * @param {number} thumbnailOffset
     * @param {ImageData} pixels
     * @param {MinimapCellArea} cellArea
     * @param {number} darken
     * @returns {boolean}
     */
    averageCell(thumbnail, thumbnailOffset, pixels, cellArea, darken)
    {
        let sum = {red: 0, green: 0, blue: 0, alpha: 0, count: 0};
        for(let pixelY = cellArea.fromY; pixelY < cellArea.toY; pixelY++){
            this.addCellRowPixels(sum, pixels, pixelY, cellArea);
        }
        if(0 === sum.alpha){
            return false;
        }
        thumbnail.data[thumbnailOffset] = Math.round(sum.red / sum.alpha * darken);
        thumbnail.data[thumbnailOffset + 1] = Math.round(sum.green / sum.alpha * darken);
        thumbnail.data[thumbnailOffset + 2] = Math.round(sum.blue / sum.alpha * darken);
        thumbnail.data[thumbnailOffset + 3] = Math.round(sum.alpha / sum.count);
        return true;
    }

    /**
     * @param {{red: number, green: number, blue: number, alpha: number, count: number}} sum
     * @param {ImageData} pixels
     * @param {number} pixelY
     * @param {MinimapCellArea} cellArea
     */
    addCellRowPixels(sum, pixels, pixelY, cellArea)
    {
        for(let pixelX = cellArea.fromX; pixelX < cellArea.toX; pixelX++){
            let offset = (pixelY * pixels.width + pixelX) * 4;
            let alpha = pixels.data[offset + 3];
            sum.red += pixels.data[offset] * alpha;
            sum.green += pixels.data[offset + 1] * alpha;
            sum.blue += pixels.data[offset + 2] * alpha;
            sum.alpha += alpha;
            sum.count++;
        }
    }

    /**
     * @param {Object} tileset
     * @returns {ImageData|false}
     */
    fetchTilesetPixels(tileset)
    {
        if(sc.hasOwn(this.tilesetsPixels, tileset.name)){
            return this.tilesetsPixels[tileset.name];
        }
        let image = tileset.image ? tileset.image.getSourceImage() : false;
        if(!image){
            this.tilesetsPixels[tileset.name] = false;
            return false;
        }
        let canvas = this.gameDom.createElement('canvas');
        canvas.width = image.width;
        canvas.height = image.height;
        let context = canvas.getContext('2d', {willReadFrequently: true});
        context.drawImage(image, 0, 0);
        this.tilesetsPixels[tileset.name] = context.getImageData(0, 0, image.width, image.height);
        return this.tilesetsPixels[tileset.name];
    }

}

module.exports.MinimapTexture = MinimapTexture;
