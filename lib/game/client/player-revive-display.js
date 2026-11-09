/**
 *
 * Reldens - PlayerReviveDisplay
 *
 * Applies a revive message on one client. The server broadcasts the revive so every client shows the revived player
 * again and plays its revive animation, but only the client of the revived player closes its game over box and allows
 * its player input again: a player who is still dead keeps its own game over box open.
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {import('./game-manager').GameManager} GameManager
 * @typedef {import('./scene-dynamic').SceneDynamic} SceneDynamic
 */
class PlayerReviveDisplay
{

    static ANIMATION_KEY = 'default_revive';
    static ANIMATION_DEPTH = 10500;
    static GAME_OVER_SELECTOR = '#game-over';

    /**
     * @param {Object} message
     * @param {GameManager} gameManager
     * @param {SceneDynamic} scene
     * @returns {boolean}
     */
    static show(message, gameManager, scene)
    {
        let currentPlayer = gameManager.getCurrentPlayer();
        if(message.t === currentPlayer?.playerId){
            gameManager.gameDom.getElement(this.GAME_OVER_SELECTOR).classList.add('hidden');
            scene.stopOnDeathOrDisabledSent = false;
        }
        let revivedSprite = sc.get(currentPlayer?.players, message.t, false);
        if(!revivedSprite){
            return false;
        }
        revivedSprite.visible = true;
        if(sc.hasOwn(revivedSprite, 'nameSprite') && revivedSprite.nameSprite){
            revivedSprite.nameSprite.visible = true;
        }
        return this.playAnimation(scene, sc.get(message, 'x', revivedSprite.x), sc.get(message, 'y', revivedSprite.y));
    }

    /**
     * @param {SceneDynamic} scene
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    static playAnimation(scene, x, y)
    {
        if(!scene.getAnimationByKey(this.ANIMATION_KEY)){
            return false;
        }
        let reviveSprite = scene.physics.add.sprite(x, y, this.ANIMATION_KEY);
        reviveSprite.setDepth(this.ANIMATION_DEPTH);
        reviveSprite.anims.play(this.ANIMATION_KEY, true).on('animationcomplete', () => {
            reviveSprite.destroy();
        });
        return true;
    }

}

module.exports.PlayerReviveDisplay = PlayerReviveDisplay;
