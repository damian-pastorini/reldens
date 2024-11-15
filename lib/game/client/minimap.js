/**
 *
 * Reldens - Minimap
 *
 */

const { sc } = require('@reldens/utils');

class Minimap
{

    constructor(props)
    {
        this.config = props.config;
        this.events = props.events;
    }

    createMap(scene, playerSprite)
    {
        // @TODO - BETA - Improve camera.
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

    createRoundMap(scene)
    {
        if(!this.roundMap){
            return false;
        }
        if(this.addCircle){
            this.addMinimapCircle(scene);
        }
        this.createRoundCamera(scene);
    }

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
