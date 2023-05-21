/**
 *
 * Reldens - FullScreenHandler
 *
 */

const { GameConst } = require('../../constants');

class FullScreenHandler
{

    constructor(gameManager)
    {
        this.gameManager = gameManager;
        this.gameDom = this.gameManager.gameDom;
        this.body = this.gameDom.getElement(GameConst.SELECTORS.BODY);
    }

    activateFullScreen()
    {
        this.gameDom.getElement(GameConst.SELECTORS.FULL_SCREEN_BUTTON)?.addEventListener('click', (e) => {
            e.preventDefault();
            if(!this.gameDom.getDocument().fullscreenEnabled){
                return false;
            }
            this.body.requestFullscreen();
            this.goFullScreen();
        });
        this.gameDom.getWindow().matchMedia('(display-mode: fullscreen)').addEventListener('change', ({ matches }) => {
            if(matches){
                this.goFullScreen();
                return;
            }
            this.exitFullScreen();
        });
    }

    goFullScreen()
    {
        this.body.classList.add(GameConst.CLASSES.FULL_SCREEN_ON);
        if(this.gameManager?.gameEngine){
            this.gameManager.gameEngine.updateGameSize(this.gameManager);
        }
    }

    exitFullScreen()
    {
        this.body.classList.remove(GameConst.CLASSES.FULL_SCREEN_ON);
        if(this.gameManager?.gameEngine){
            this.gameManager.gameEngine.updateGameSize(this.gameManager);
        }
    }
}

module.exports.FullScreenHandler = FullScreenHandler;
