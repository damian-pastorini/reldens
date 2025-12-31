/**
 *
 * Reldens - Joystick
 *
 * Client-side virtual joystick controller for touch and mouse-based player movement. Creates an on-screen
 * joystick UI with draggable thumb control, handles touch/mouse events, calculates a movement direction based
 * on thumb position, and sends directional commands to the player. Supports 8-directional movement with
 * a configurable threshold and positioning.
 *
 */

const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./game-manager').GameManager} GameManager
 * @typedef {import('./game-dom').GameDom} GameDom
 * @typedef {import('./scene-preloader').ScenePreloader} ScenePreloader
 * @typedef {object} JoystickProps
 * @property {ScenePreloader} [scenePreloader]
 * @property {boolean} [useJoystickOnLowResolutions]
 */
class Joystick
{

    /** @param {JoystickProps} props */
    constructor(props)
    {
        /** @type {GameManager|undefined} */
        this.gameManager = props?.scenePreloader?.gameManager;
        /** @type {ScenePreloader|undefined} */
        this.scenePreloader = props?.scenePreloader;
        /** @type {GameDom|undefined} */
        this.gameDom = this.gameManager?.gameDom;
        /** @type {boolean} */
        this.isDragging = false;
        /** @type {number|boolean} */
        this.centerX = false;
        /** @type {number|boolean} */
        this.centerY = false;
        /** @type {number} */
        this.threshold = this.gameManager.config.getWithoutLogs('client/ui/controls/joystickThreshold', 20);
        /** @type {number} */
        this.joystickLeft = this.gameManager.config.getWithoutLogs('client/ui/controls/joystickLeft', 25);
        /** @type {number} */
        this.joystickTop = this.gameManager.config.getWithoutLogs('client/ui/controls/joystickTop', 25);
        /** @type {string} */
        this.positionSufix = 'px';
        /** @type {boolean} */
        this.useJoystickOnLowResolutions = sc.get(props, 'useJoystickOnLowResolutions', false);
    }

    /**
     * @returns {boolean}
     */
    registerJoystickController()
    {
        if(!this.gameManager){
            Logger.error('GameManager undefined on Joystick.');
            return false;
        }
        this.joystick = this.gameDom.getElement('#joystick');
        if(!this.joystick){
            Logger.error('Joystick element not found.');
            return false;
        }
        this.joystickThumb = this.gameDom.getElement('#joystick-thumb');
        this.joystickThumb.addEventListener('mousedown', (event) => {
            this.applyMovement(event.clientX, event.clientY);
        });
        this.joystickThumb.addEventListener('touchstart', (event) => {
            event.preventDefault();
            if(!event.touches || 0 === event.touches.length){
                Logger.debug('None event touches.', event);
                return false;
            }
            let touch = event.touches[0];
            this.applyMovement(touch.clientX, touch.clientY);
        });
        this.gameDom.getDocument().addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.gameDom.getDocument().addEventListener('mouseup', this.handleStop.bind(this));
        this.gameDom.getDocument().addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.gameDom.getDocument().addEventListener('touchend', this.handleStop.bind(this));
    }

    /**
     * @param {number} value
     * @returns {string}
     */
    position(value)
    {
        return value+this.positionSufix;
    }

    /**
     * @param {number} clientX
     * @param {number} clientY
     */
    applyMovement(clientX, clientY)
    {
        this.isDragging = true;
        let rect = this.joystick.getBoundingClientRect();
        this.centerX = rect.width / 2;
        this.centerY = rect.height / 2;
        this.updateThumbPosition(clientX - rect.left, clientY - rect.top);
    }

    handleStop()
    {
        this.isDragging = false;
        this.joystickThumb.style.left = this.position(this.joystickLeft);
        this.joystickThumb.style.top = this.position(this.joystickTop);
        this.gameManager.getCurrentPlayer().stop();
    }

    /**
     * @param {number} x
     * @param {number} y
     * @returns {string}
     */
    updateDirection(x, y)
    {
        let dx = x - this.centerX;
        let dy = y - this.centerY;
        let direction = GameConst.STOP;
        if(Math.abs(dx) > Math.abs(dy)){
            if(Math.abs(dx) > this.threshold){
                direction = dx > 0
                    ? (Math.abs(dy) > this.threshold ? (dy > 0 ? 'right-down' : 'right-up') : 'right')
                    : (Math.abs(dy) > this.threshold ? (dy > 0 ? 'left-down' : 'left-up') : 'left');
                for(let dir of direction.split('-')){
                    try {
                        this.gameManager.getCurrentPlayer()[dir]();
                    } catch (error) {
                        //Logger.debug('Unknown direction on PlayerEngine.', dir, error);
                    }
                }
                return direction;
            }
        }
        if(Math.abs(dy) > this.threshold){
            direction = dy > 0
                ? (Math.abs(dx) > this.threshold ? (dx > 0 ? 'down-right' : 'down-left') : 'down')
                : (Math.abs(dx) > this.threshold ? (dx > 0 ? 'up-right' : 'up-left') : 'up');
            for(let dir of direction.split('-')){
                try {
                    this.gameManager.getCurrentPlayer()[dir]();
                } catch (error) {
                    //Logger.debug('Unknown direction on PlayerEngine.', dir, error);
                }
            }
            return direction;
        }
        this.gameManager.getCurrentPlayer().stop();
        return direction;
    }

    /**
     * @param {number} x
     * @param {number} y
     */
    updateThumbPosition(x, y)
    {
        let dx = x - this.centerX;
        let dy = y - this.centerY;
        let distance = Math.sqrt(dx * dx + dy * dy);
        let maxDistance = Math.min(this.centerX, this.centerY);
        if(distance > maxDistance){
            let angle = Math.atan2(dy, dx);
            let joystickLeft = Math.cos(angle) * maxDistance + this.centerX - this.joystickThumb.offsetWidth / 2;
            this.joystickThumb.style.left = this.position(joystickLeft);
            let joystickTop = Math.sin(angle) * maxDistance + this.centerY - this.joystickThumb.offsetHeight / 2;
            this.joystickThumb.style.top = this.position(joystickTop);
            return;
        }
        let joystickLeft = x - this.joystickThumb.offsetWidth / 2;
        this.joystickThumb.style.left = this.position(joystickLeft);
        let joystickTop = y - this.joystickThumb.offsetHeight / 2;
        this.joystickThumb.style.top = this.position(joystickTop);
    }

    /**
     * @param {MouseEvent} event
     */
    handleMouseMove(event)
    {
        if(!this.isDragging){
            return;
        }
        let rect = this.joystick.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        this.updateThumbPosition(x, y);
        this.updateDirection(x, y);
    }

    /**
     * @param {TouchEvent} event
     * @returns {boolean}
     */
    handleTouchMove(event)
    {
        if(!this.isDragging){
            return;
        }
        if(!event.touches || 0 === event.touches.length){
            Logger.debug('None event touches for "handleTouchMove".', event);
            return false;
        }
        let touch = event.touches[0];
        let rect = this.joystick.getBoundingClientRect();
        let x = touch.clientX - rect.left;
        let y = touch.clientY - rect.top;
        this.updateThumbPosition(x, y);
        this.updateDirection(x, y);
    }

}

module.exports.Joystick = Joystick;
