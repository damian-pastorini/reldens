/**
 *
 * Reldens - Minimap
 *
 * Client-side minimap component for displaying a scaled-down view of the game map. Creates a secondary
 * Phaser camera that follows the player, supports circular/round map display with masking, configurable
 * positioning, zoom levels, and styling. Integrates with the UI scene and emits events for plugin hooks.
 *
 */

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
        // @TODO - BETA - Improve camera.
        this.minimapCamera = false;
        this.circle = false;
        this.scope = false;
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
        this.createMinimapCamera(scene, playerSprite);
        this.createRoundMap(scene);
        this.events.emitSync('reldens.createdMinimap', this);
    }

    /**
     * @param {SceneDynamic} scene
     * @param {Sprite} playerSprite
     */
    createMinimapCamera(scene, playerSprite)
    {
        this.minimapCamera = scene.cameras.add(this.camX, this.camY, this.camWidth, this.camHeight)
            .setName('minimap')
            .setBackgroundColor(this.camBackgroundColor)
            .setZoom(this.camZoom)
            .startFollow(
                playerSprite,
                sc.get(this.config, 'mapCameraRoundPixels', true),
                sc.get(this.config, 'mapCameraLerpX', 1),
                sc.get(this.config, 'mapCameraLerpY', 1)
            )
            .setRoundPixels(true)
            .setVisible(false)
            .setOrigin(
                sc.get(this.config, 'mapCameraOriginX', 0.18),
                sc.get(this.config, 'mapCameraOriginY', 0.18)
            );
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
        let activeScenePreloader = scene.gameManager.getActiveScenePreloader();
        this.circle = activeScenePreloader.add.circle(
            sc.get(this.config, 'circleX', 220),
            sc.get(this.config, 'circleY', 88),
            sc.get(this.config, 'circleRadio', 80.35),
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
        this.scope = scene.add.graphics();
        this.scope.fillStyle(0x000000, 0).fillCircle(
            sc.get(this.config, 'circleX', 220),
            sc.get(this.config, 'circleY', 88),
            sc.get(this.config, 'circleRadio', 80.35)
        );
        this.minimapCamera.setMask(this.scope.createGeometryMask());
    }

    destroyMap()
    {
        delete this.minimapCamera;
        delete this.circle;
        delete this.scope;
    }

}
module.exports.Minimap = Minimap;
