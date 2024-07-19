/**
 *
 * Reldens - Renderer
 *
 */

const { Box } = require('p2');

class Renderer
{

    constructor(scene)
    {
        // @TODO - BETA - Refactor this entire class.
        this.scene = scene;
        this.gameDom = scene.gameManager.gameDom;
        this.world = scene.debugWorld;
        this.canvasElement = false;
        this.canvasContext = false;
    }

    fetchCanvasContext()
    {
        this.canvasContext = this.canvasElement.getContext('2d');
    }

    createCanvas(width, height)
    {
        this.canvasElement = this.gameDom.createElement('canvas');
        this.canvasElement.width = width;
        this.canvasElement.height = height;
        this.canvasElement.id = 'physicsCanvas';
        this.gameDom.getDocument().body.appendChild(this.canvasElement);
        this.fetchCanvasContext();
    }

    renderLoop()
    {
        // @TODO - BETA - Finish implementation to render all the objects movement.
        this.canvasContext.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        this.renderP2World();
        this.gameDom.getWindow().requestAnimationFrame(this.renderLoop.bind(this));
    }

    renderP2World()
    {
        let context = this.canvasContext;
        for(let i = 0; i < this.world.bodies.length; i++){
            let body = this.world.bodies[i];
            if(!body.isWall){
                continue;
            }
            let shape = body.shapes[0];
            context.fillStyle = '#2f7dde';
            context.strokeStyle = '#333333';
            if(shape instanceof Box){
                let x = body.position[0];
                let y = body.position[1];
                let width = shape.width;
                let height = shape.height;
                context.save();
                context.translate(x, y);
                context.rotate(body.angle);
                context.beginPath();
                context.rect(-width / 2, -height / 2, width, height);
                context.closePath();
                context.fill();
                context.stroke();
                context.restore();
            }
            context.closePath();
            context.fill();
            context.stroke();
        }
        let textIndex = 0;
        for(let i = 0; i < this.world.bodies.length; i++){
            let body = this.world.bodies[i];
            if(!body.isWall){
                continue;
            }
            let shape = body.shapes[0];
            if(shape instanceof Box){
                let tileIndex = body.firstTileIndex || 0;
                context.fillStyle = '#000000';
                context.font = '9px Arial';
                let fullText = tileIndex.toString()+' / '+shape.width + ' / '+body.position[0];
                let x = body.position[0];
                let y = body.position[1];
                let textX = x - context.measureText(fullText).width / 2;
                let textY = y;
                context.textAlign = 'left';
                context.textBaseline = 'middle';
                context.fillText(fullText, textX, textY);
                textIndex++;
            }
        }
    }

    debugWorld()
    {
        this.gameDom.getElement('.wrapper').style.display = 'none';
        this.createCanvas(
            this.scene.map.width * this.scene.map.tileWidth,
            this.scene.map.height * this.scene.map.tileHeight
        );
        this.renderP2World();
    }

}

module.exports.Renderer = Renderer;
