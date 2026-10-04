/**
 *
 * Reldens - Minimap
 *
 * Client-side minimap component for displaying a simplified view of the game map. The map image is drawn once by
 * MinimapTexture (one solid color square per tile, pixelsPerTile pixels each) and placed outside the world bounds, so
 * only the minimap camera sees it; a player marker follows the player position scaled to the image and the secondary
 * camera follows the marker. Supports circular/round map display with masking, configurable positioning and styling.
 * Integrates with the UI scene and emits events for plugin hooks.
 *
 */

const { MinimapTexture } = require('./minimap-texture');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('phaser').GameObjects.Sprite} Sprite
 * @typedef {import('./scene-dynamic').SceneDynamic} SceneDynamic
 *
 * @typedef {object} MinimapProps
 * @property {ConfigManager} config
 * @property {EventsManager} events
 */
class Minimap
{

    /** @param {MinimapProps} props */
    constructor(props)
    {
        /** @type {ConfigManager} */
        this.config = props.config;
        /** @type {EventsManager} */
        this.events = props.events;
    }

    /**
     * @param {SceneDynamic} scene
     * @param {Sprite} playerSprite
     */
    createMap(scene, playerSprite)
    {
        this.minimapCamera = false;
        this.circle = false;
        this.scope = false;
        this.scene = scene;
        this.awaitOnCamera = sc.get(this.config, 'awaitOnCamera', 400);
        this.autoWidth = scene.map.widthInPixels / sc.get(this.config, 'mapWidthDivisor', 1);
        this.camWidth = sc.get(this.config, 'fixedWidth', this.autoWidth);
        this.autoHeight = scene.map.heightInPixels / sc.get(this.config, 'mapHeightDivisor', 1);
        this.camHeight = sc.get(this.config, 'fixedHeight', this.autoHeight);
        this.camX = sc.get(this.config, 'camX', 0);
        this.camY = sc.get(this.config, 'camY', 0);
        this.camBackgroundColor = sc.get(this.config, 'camBackgroundColor', 'rgba(0,0,0,0.6)');
        this.camZoom = sc.get(this.config, 'camZoom', 0.15);
        this.roundMap = sc.get(this.config, 'roundMap', false);
        this.addCircle = sc.get(this.config, 'addCircle', false);
        this.cameraOrigin = {
            x: sc.get(this.config, 'mapCameraOriginX', 0.18),
            y: sc.get(this.config, 'mapCameraOriginY', 0.18)
        };
        if(this.roundMap){
            this.fitCameraToCircle();
        }
        this.pixelsPerTile = sc.get(
            this.config,
            'pixelsPerTile',
            Math.max(1, Math.round(this.camZoom * scene.map.tileWidth))
        );
        this.createMapImage(scene);
        this.createPlayerMarker(scene, playerSprite);
        this.createMinimapCamera(scene, this.playerMarker);
        this.createRoundMap(scene);
        this.events.emitSync('reldens.createdMinimap', this);
    }

    /**
     * @param {SceneDynamic} scene
     */
    createMapImage(scene)
    {
        this.textureKey = 'minimap-'+scene.key;
        let minimapTexture = new MinimapTexture({
            gameDom: scene.gameManager.gameDom,
            pixelsPerTile: this.pixelsPerTile,
            collisionsDarken: sc.get(this.config, 'collisionsDarken', 1),
            collisionsLayerKey: sc.get(this.config, 'collisionsLayerKey', 'collisions'),
            skipLayersKeys: sc.get(this.config, 'skipLayersKeys', ['pathfinder'])
        });
        minimapTexture.create(scene, this.textureKey);
        this.mapOrigin = {x: scene.map.widthInPixels + this.camWidth, y: 0};
        this.mapImage = scene.add.image(this.mapOrigin.x, this.mapOrigin.y, this.textureKey).setOrigin(0, 0);
        scene.cameras.main.ignore(this.mapImage);
    }

    /**
     * @param {SceneDynamic} scene
     * @param {Sprite} playerSprite
     */
    createPlayerMarker(scene, playerSprite)
    {
        this.mapScale = this.pixelsPerTile / scene.map.tileWidth;
        this.playerMarker = scene.add.circle(
            0,
            0,
            sc.get(this.config, 'playerMarkerRadius', 3),
            sc.get(this.config, 'playerMarkerColor', 0xffffff)
        );
        this.playerMarker.setStrokeStyle(
            sc.get(this.config, 'playerMarkerStrokeWidth', 1),
            sc.get(this.config, 'playerMarkerStrokeColor', 0x000000)
        );
        scene.cameras.main.ignore(this.playerMarker);
        this.updatePlayerMarkerListener = () => this.updatePlayerMarker(playerSprite);
        this.updatePlayerMarker(playerSprite);
        scene.events.on('update', this.updatePlayerMarkerListener);
    }

    /**
     * @param {Sprite} playerSprite
     */
    updatePlayerMarker(playerSprite)
    {
        this.playerMarker.setPosition(
            this.mapOrigin.x + playerSprite.x * this.mapScale,
            this.mapOrigin.y + playerSprite.y * this.mapScale
        );
    }

    /**
     * @param {DOMRect} closeButtonRect
     * @param {DOMRect} canvasRect
     * @param {number} gameWidth
     * @returns {boolean}
     */
    alignToCloseButton(closeButtonRect, canvasRect, gameWidth)
    {
        if(!this.minimapCamera || 0 === canvasRect.width){
            return false;
        }
        let gameScale = gameWidth / canvasRect.width;
        let circleConfig = this.getCircleConfig();
        let buttonHalfDiagonal = Math.hypot(closeButtonRect.width, closeButtonRect.height) / 2 * gameScale;
        let strokeHalfWidth = sc.get(this.config, 'circleStrokeLineWidth', 6) / 2;
        let diagonal = Math.SQRT1_2 * (circleConfig.radius + strokeHalfWidth + buttonHalfDiagonal);
        let offsetX = (closeButtonRect.x - canvasRect.x + closeButtonRect.width / 2) * gameScale - diagonal
            - circleConfig.x;
        let offsetY = (closeButtonRect.y - canvasRect.y + closeButtonRect.height / 2) * gameScale + diagonal
            - circleConfig.y;
        this.minimapCamera.setPosition(this.camX + offsetX, this.camY + offsetY);
        if(this.circle){
            this.circle.setPosition(circleConfig.x + offsetX, circleConfig.y + offsetY);
        }
        return true;
    }

    fitCameraToCircle()
    {
        let circleConfig = this.getCircleConfig();
        this.camX = circleConfig.x - circleConfig.radius;
        this.camY = circleConfig.y - circleConfig.radius;
        this.camWidth = circleConfig.radius * 2;
        this.camHeight = circleConfig.radius * 2;
        this.cameraOrigin = {x: 0.5, y: 0.5};
    }

    /**
     * @returns {{x: number, y: number, radius: number}}
     */
    getCircleConfig()
    {
        return {
            x: sc.get(this.config, 'circleX', 220),
            y: sc.get(this.config, 'circleY', 88),
            radius: sc.get(this.config, 'circleRadio', 80.35)
        };
    }

    /**
     * @param {SceneDynamic} scene
     * @param {Phaser.GameObjects.Arc} playerMarker
     */
    createMinimapCamera(scene, playerMarker)
    {
        this.minimapCamera = scene.cameras.add(this.camX, this.camY, this.camWidth, this.camHeight)
            .setName('minimap')
            .setBackgroundColor(this.camBackgroundColor)
            .startFollow(
                playerMarker,
                sc.get(this.config, 'mapCameraRoundPixels', true),
                sc.get(this.config, 'mapCameraLerpX', 1),
                sc.get(this.config, 'mapCameraLerpY', 1)
            )
            .setRoundPixels(true)
            .setVisible(false)
            .setOrigin(this.cameraOrigin.x, this.cameraOrigin.y);
    }

    /**
     * @param {SceneDynamic} scene
     * @returns {boolean}
     */
    createRoundMap(scene)
    {
        if(!this.roundMap){
            return false;
        }
        if(this.addCircle){
            this.addMinimapCircle(scene);
        }
        this.createRoundCamera(scene);
        return true;
    }

    /**
     * @param {SceneDynamic} scene
     */
    addMinimapCircle(scene)
    {
        let { x, y, radius } = this.getCircleConfig();
        let activeScenePreloader = scene.gameManager.getActiveScenePreloader();
        this.circle = activeScenePreloader.add.circle(
            x,
            y,
            radius,
            sc.get(this.config, 'circleColor', 'rgb(0,0,0)'),
            sc.get(this.config, 'circleAlpha', 1)
        );
        this.circle.setStrokeStyle(
            sc.get(this.config, 'circleStrokeLineWidth', 6),
            sc.get(this.config, 'circleStrokeColor', 0),
            sc.get(this.config, 'circleStrokeAlpha', 0.6));
        this.circle.setFillStyle(
            sc.get(this.config, 'circleFillColor', 1),
            sc.get(this.config, 'circleFillAlpha', 0)
        );
        this.circle.setVisible(false);
    }

    /**
     * @param {SceneDynamic} scene
     */
    createRoundCamera(scene)
    {
        let { x, y, radius } = this.getCircleConfig();
        let maskKey = 'minimap-circle-mask';
        if(scene.sys.textures.exists(maskKey)){
            scene.sys.textures.remove(maskKey);
        }
        let maskTexture = scene.sys.textures.addDynamicTexture(maskKey, this.camWidth, this.camHeight);
        let maskGfx = scene.make.graphics({x: 0, y: 0, add: false});
        maskGfx.fillStyle(0xffffff, 1);
        maskGfx.fillCircle(x - this.camX, y - this.camY, radius);
        maskTexture.capture(maskGfx);
        maskTexture.render();
        maskGfx.destroy();
        this.minimapCamera.filters.internal.addMask(maskKey);
    }

    destroyMap()
    {
        if(this.scene && this.updatePlayerMarkerListener){
            this.scene.events.off('update', this.updatePlayerMarkerListener);
        }
        delete this.minimapCamera;
        delete this.circle;
        delete this.scope;
        delete this.mapImage;
        delete this.playerMarker;
        delete this.updatePlayerMarkerListener;
    }

}
module.exports.Minimap = Minimap;
