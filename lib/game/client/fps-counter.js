/**
 *
 * Reldens - GameDom
 *
 */

class FPSCounter
{

    constructor(gameDom)
    {
        this.lastFrameTime = performance.now();
        this.frameCount = 0;
        this.fpsDisplay = gameDom.createElementWithStyles('div', 'fps-counter', {
            padding: '0 20px',
            background: '#000',
            color: '#00ff00'
        });
        gameDom.getElement('.header').appendChild(this.fpsDisplay);
    }

    updateFPS()
    {
        let currentTime = performance.now();
        let deltaTime = currentTime - this.lastFrameTime;
        this.lastFrameTime = currentTime;
        const fps = Math.round(1000 / deltaTime);
        this.frameCount++;
        if (this.frameCount % 60 === 0) {
            this.fpsDisplay.textContent = 'FPS: ' + fps;
        }
        requestAnimationFrame(this.updateFPS.bind(this));
    }

    start()
    {
        this.updateFPS();
    }

}

module.exports.FPSCounter = FPSCounter
