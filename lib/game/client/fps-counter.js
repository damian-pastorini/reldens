/**
 *
 * Reldens - FPSCounter
 *
 * Client-side FPS (frames per second) counter utility for displaying game performance metrics.
 * Creates a DOM element showing real-time FPS, updated every 60 frames. Displays in a fixed
 * position overlay with configurable styling.
 *
 */

/**
 * @typedef {import('./game-dom').GameDom} GameDom
 */
class FPSCounter
{

    /**
     * @param {GameDom} gameDom
     */
    constructor(gameDom)
    {
        /** @type {number} */
        this.lastFrameTime = performance.now();
        /** @type {number} */
        this.frameCount = 0;
        /** @type {HTMLElement} */
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
        if(0 === this.frameCount % 60){
            this.fpsDisplay.textContent = 'FPS: ' + fps;
        }
        requestAnimationFrame(this.updateFPS.bind(this));
    }

    start()
    {
        this.updateFPS();
    }

}

module.exports.FPSCounter = FPSCounter;
