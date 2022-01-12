/**
 *
 * Reldens - Minimap
 *
 */

const { Renderer } = require('phaser');
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
        this.autoWidth = scene.map.widthInPixels / sc.get(this.config, 'mapWidthDivisor', 1);
        this.camWidth = sc.get(this.config, 'fixedWidth', this.autoWidth);
        this.autoHeight = scene.map.heightInPixels / sc.get(this.config, 'mapHeightDivisor', 1);
        this.camHeight = sc.get(this.config, 'fixedHeight', this.autoHeight);
        this.camX = sc.get(this.config, 'camX', 0);
        this.camY = sc.get(this.config, 'camY', 0);
        this.camBackgroundColor = sc.get(this.config, 'camBackgroundColor', 'rgba(0,0,0,0.6)');
        this.camZoom = sc.get(this.config, 'camZoom', 0.35);
        this.minimapCamera = scene.cameras.add(this.camX, this.camY, this.camWidth, this.camHeight)
            .setName('minimap')
            .setBackgroundColor(this.camBackgroundColor)
            .setZoom(this.camZoom)
            .startFollow(playerSprite)
            .setRoundPixels(true)
            .setVisible(false);
        this.roundMap = sc.get(this.config, 'roundMap', false);
        if(this.roundMap){
            // @NOTE: because of the camara zoom the circle size append to the preload scene is different from the map
            // size.
            this.addCircle = sc.get(this.config, 'addCircle', false);
            if(this.addCircle){
                this.addMinimapCircle(scene);
            }
            this.createRoundCamera(scene);
        }
        this.events.emitSync('reldens.createdMinimap', this);
    }

    addMinimapCircle(scene)
    {
        if(this.circle){
            return true;
        }
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
        if(!this.minimapPipeline || !this.minimapCamera){
            this.pipelineInstance = new Renderer.WebGL.Pipelines.TextureTintPipeline({
                game: scene.game,
                renderer: scene.game.renderer,
                fragShader: `
                precision mediump float;
                uniform sampler2D uMainSampler;
                varying vec2 outTexCoord;
    
                void main(void)
                {
                    if (length(outTexCoord.xy - vec2(0.5, 0.5)) > 0.5) {
                        discard;
                    } else {
                        gl_FragColor = texture2D(uMainSampler, outTexCoord);
                    }
                }`
            });
            this.minimapPipeline = scene.game.renderer.addPipeline('MinimapPipeline_' + scene.key, this.pipelineInstance);
        }
        this.minimapCamera.setRenderToTexture(this.minimapPipeline);
    }

}

module.exports.Minimap = Minimap;