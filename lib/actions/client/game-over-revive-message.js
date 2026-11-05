/**
 *
 * Reldens - GameOverReviveMessage
 *
 * Renders the game over box content from its template ("gameOver") with the translated snippets: on the game over it
 * shows the death title and the wait message, then it adds how the dead player will be revived, as the server tells it
 * on the death: where it died, where it died consuming the restoration item, or in the town room. On the town revive
 * the resurrection ad button is rendered when the server offers that ad, the ad is played only when the player clicks
 * it: the click fires the ad event key sent by the server (the ads_event_video event key), the button stays, so the
 * player can ask again when the ad could not be played (the provider ignores the clicks while an ad is playing).
 *
 */

const { ActionsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class GameOverReviveMessage
{

    /**
     * @param {Object} props
     * @param {GameManager} props.gameManager
     * @param {EventsManager} props.events
     */
    constructor(props)
    {
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
    }

    /**
     * @param {Object} room
     * @returns {boolean}
     */
    listenRoomMessages(room)
    {
        room.onMessage('*', (message) => {
            this.onRoomMessage(message);
        });
        return true;
    }

    /**
     * @param {Object} message
     * @returns {boolean}
     */
    onRoomMessage(message)
    {
        if(GameConst.GAME_OVER === message?.act){
            return this.renderGameOverContent('', '');
        }
        if(ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE !== message?.act){
            return false;
        }
        if(-1 === Object.values(ActionsConst.DEATH.REVIVE_MODES).indexOf(message.mode)){
            Logger.warning('Unknown revive mode.', message.mode);
            return false;
        }
        return this.renderGameOverContent(
            this.gameManager.services.translator.t(
                ActionsConst.DEATH.SNIPPETS.PREFIX+message.mode,
                {itemLabel: sc.get(message, 'itemLabel', ''), townLabel: sc.get(message, 'townLabel', '')}
            ),
            String(sc.get(message, 'resurrectionAdEventKey', ''))
        );
    }

    /**
     * @param {string} reviveMessage
     * @param {string} resurrectionAdEventKey
     * @returns {boolean}
     */
    renderGameOverContent(reviveMessage, resurrectionAdEventKey)
    {
        let gameEngine = this.gameManager.gameEngine;
        let gameOverTemplate = gameEngine?.uiScene?.cache?.html.get(ActionsConst.TEMPLATES.GAME_OVER);
        if(!gameOverTemplate){
            Logger.warning('Game over template not available.');
            return false;
        }
        let translator = this.gameManager.services.translator;
        let gameOverContent = this.gameManager.gameDom.updateContent(
            ActionsConst.DEATH.SELECTORS.GAME_OVER_CONTENT,
            gameEngine.parseTemplate(gameOverTemplate, {
                gameOverTitle: translator.t(ActionsConst.DEATH.SNIPPETS.TITLE),
                gameOverWait: translator.t(ActionsConst.DEATH.SNIPPETS.WAIT),
                reviveMessage,
                resurrectionAd: '' !== resurrectionAdEventKey,
                resurrectionAdButton: translator.t(ActionsConst.DEATH.SNIPPETS.RESURRECTION_AD_BUTTON)
            })
        );
        if(!gameOverContent){
            Logger.warning('Game over content element not found.');
            return false;
        }
        let adButton = this.gameManager.gameDom.getElement(ActionsConst.DEATH.SELECTORS.RESURRECTION_AD_BUTTON);
        if(!adButton){
            return true;
        }
        adButton.addEventListener('click', async () => {
            await this.events.emit(resurrectionAdEventKey, {});
        });
        return true;
    }

}

module.exports.GameOverReviveMessage = GameOverReviveMessage;
