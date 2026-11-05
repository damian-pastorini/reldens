/**
 *
 * Reldens - GameOverReviveMessage
 *
 * Renders the game over box content from its template ("gameOver") with the translated snippets: on the game over it
 * shows the death title and the wait message, then it adds how the dead player will be revived, as the server tells it
 * on the death: where it died, where it died consuming the restoration item, or in the town room. When the restoration
 * item is not consumed automatically the server asks to use it, the yes and no buttons send that choice and the server
 * tells the chosen revive. When the auto revive is disabled the wait message shows the seconds left to the revive and,
 * once that time passed, the revive button that asks the server for the revive. On the town revive the resurrection ad
 * button is rendered when the server offers that ad, the ad is played only when the player clicks it: the click fires
 * the ad event key sent by the server (the ads_event_video event key), the button stays, so the player can ask again
 * when the ad could not be played (the provider ignores the clicks while an ad is playing).
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
            return this.renderGameOverContent({});
        }
        if(ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE !== message?.act){
            return false;
        }
        if(-1 === Object.values(ActionsConst.DEATH.REVIVE_MODES).indexOf(message.mode)){
            Logger.warning('Unknown revive mode.', message.mode);
            return false;
        }
        return this.renderGameOverContent(message);
    }

    /**
     * @param {Object} reviveMessage
     * @returns {boolean}
     */
    renderGameOverContent(reviveMessage)
    {
        let gameEngine = this.gameManager.gameEngine;
        let gameOverTemplate = gameEngine?.uiScene?.cache?.html.get(ActionsConst.TEMPLATES.GAME_OVER);
        if(!gameOverTemplate){
            Logger.warning('Game over template not available.');
            return false;
        }
        let gameOverContent = this.gameManager.gameDom.updateContent(
            ActionsConst.DEATH.SELECTORS.GAME_OVER_CONTENT,
            gameEngine.parseTemplate(gameOverTemplate, this.createTemplateParams(reviveMessage))
        );
        if(!gameOverContent){
            Logger.warning('Game over content element not found.');
            return false;
        }
        return this.listenButtons(String(sc.get(reviveMessage, 'resurrectionAdEventKey', '')));
    }

    /**
     * @param {string} resurrectionAdEventKey
     * @returns {boolean}
     */
    listenButtons(resurrectionAdEventKey)
    {
        let choiceAction = ActionsConst.DEATH.ACTIONS.RESTORATION_ITEM_CHOICE;
        this.listenButton(ActionsConst.DEATH.SELECTORS.RESURRECTION_AD_BUTTON, async () => {
            await this.events.emit(resurrectionAdEventKey, {});
        });
        this.listenButton(ActionsConst.DEATH.SELECTORS.REVIVE_BUTTON, () => {
            this.gameManager.activeRoomEvents.send({act: ActionsConst.DEATH.ACTIONS.REVIVE_REQUEST});
        });
        this.listenButton(ActionsConst.DEATH.SELECTORS.RESTORATION_ITEM_USE_BUTTON, () => {
            this.gameManager.activeRoomEvents.send({act: choiceAction, use: true});
        });
        this.listenButton(ActionsConst.DEATH.SELECTORS.RESTORATION_ITEM_KEEP_BUTTON, () => {
            this.gameManager.activeRoomEvents.send({act: choiceAction, use: false});
        });
        return true;
    }

    /**
     * @param {Object} reviveMessage
     * @returns {Object}
     */
    createTemplateParams(reviveMessage)
    {
        let translator = this.gameManager.services.translator;
        let mode = sc.get(reviveMessage, 'mode', '');
        let reviveReady = true === sc.get(reviveMessage, 'reviveReady', false);
        return {
            gameOverTitle: translator.t(ActionsConst.DEATH.SNIPPETS.TITLE),
            gameOverWait: this.translateWait(reviveReady, Number(sc.get(reviveMessage, 'reviveWaitSeconds', 0))),
            reviveMessage: '' === mode ? '' : translator.t(
                ActionsConst.DEATH.SNIPPETS.PREFIX+mode,
                {itemLabel: sc.get(reviveMessage, 'itemLabel', ''), townLabel: sc.get(reviveMessage, 'townLabel', '')}
            ),
            restorationItemQuestion: ActionsConst.DEATH.REVIVE_MODES.ASK_RESTORATION_ITEM === mode,
            restorationItemUseButton: translator.t(ActionsConst.DEATH.SNIPPETS.RESTORATION_ITEM_USE_BUTTON),
            restorationItemKeepButton: translator.t(ActionsConst.DEATH.SNIPPETS.RESTORATION_ITEM_KEEP_BUTTON),
            reviveReady,
            reviveButton: translator.t(ActionsConst.DEATH.SNIPPETS.REVIVE_BUTTON),
            resurrectionAd: '' !== String(sc.get(reviveMessage, 'resurrectionAdEventKey', '')),
            resurrectionAdButton: translator.t(ActionsConst.DEATH.SNIPPETS.RESURRECTION_AD_BUTTON)
        };
    }

    /**
     * @param {boolean} reviveReady
     * @param {number} reviveWaitSeconds
     * @returns {string}
     */
    translateWait(reviveReady, reviveWaitSeconds)
    {
        let translator = this.gameManager.services.translator;
        if(reviveReady){
            return translator.t(ActionsConst.DEATH.SNIPPETS.REVIVE_READY);
        }
        if(0 < reviveWaitSeconds){
            return translator.t(ActionsConst.DEATH.SNIPPETS.REVIVE_WAIT, {seconds: reviveWaitSeconds});
        }
        return translator.t(ActionsConst.DEATH.SNIPPETS.WAIT);
    }

    /**
     * @param {string} buttonSelector
     * @param {function(): void|Promise<void>} onClick
     * @returns {boolean}
     */
    listenButton(buttonSelector, onClick)
    {
        let button = this.gameManager.gameDom.getElement(buttonSelector);
        if(!button){
            return false;
        }
        button.addEventListener('click', onClick);
        return true;
    }

}

module.exports.GameOverReviveMessage = GameOverReviveMessage;
