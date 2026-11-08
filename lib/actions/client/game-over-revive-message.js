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
 * when the ad could not be played (the provider ignores the clicks while an ad is playing). The game manager and the
 * events manager are validated once (validate) before the plugin attaches it, the template and the snippets that never
 * change are read once when the UI scene is created (prepareTemplate), a message received before that is not rendered.
 *
 */

const { ActionsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('../../snippets/translator').Translator} Translator
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('phaser').Scene} Scene
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
        /** @type {Array<string>} */
        this.reviveModes = Object.keys(ActionsConst.DEATH.REVIVE_MODES).map(
            modeKey => ActionsConst.DEATH.REVIVE_MODES[modeKey]
        );
        /** @type {Translator|boolean} */
        this.translator = false;
        /** @type {string|boolean} */
        this.gameOverTemplate = false;
        /** @type {Object} */
        this.fixedTemplateParams = {};
    }

    /**
     * @returns {boolean}
     */
    validate()
    {
        if(!this.gameManager){
            Logger.error('Missing GameManager in GameOverReviveMessage.');
            return false;
        }
        if(!this.events){
            Logger.error('Missing EventsManager in GameOverReviveMessage.');
            return false;
        }
        return true;
    }

    /**
     * @param {Scene} uiScene
     * @returns {boolean}
     */
    prepareTemplate(uiScene)
    {
        let translator = this.gameManager.services.translator;
        let gameOverTemplate = uiScene?.cache?.html.get(ActionsConst.TEMPLATES.GAME_OVER);
        if(!translator || !gameOverTemplate){
            Logger.error('Missing translator or game over template, the game over revive message is not rendered.');
            return false;
        }
        this.translator = translator;
        this.fixedTemplateParams = {
            gameOverTitle: translator.t(ActionsConst.SNIPPETS.DEATH_TITLE),
            restorationItemUseButton: translator.t(ActionsConst.SNIPPETS.DEATH_RESTORATION_ITEM_USE_BUTTON),
            restorationItemKeepButton: translator.t(ActionsConst.SNIPPETS.DEATH_RESTORATION_ITEM_KEEP_BUTTON),
            reviveButton: translator.t(ActionsConst.SNIPPETS.DEATH_REVIVE_BUTTON),
            resurrectionAdButton: translator.t(ActionsConst.SNIPPETS.DEATH_RESURRECTION_AD_BUTTON)
        };
        this.gameOverTemplate = gameOverTemplate;
        return true;
    }

    /**
     * @param {Object} room
     * @returns {boolean}
     */
    listenRoomMessages(room)
    {
        if(!room){
            return false;
        }
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
        let messageAction = message?.act;
        if(GameConst.GAME_OVER !== messageAction && ActionsConst.DEATH.ACTIONS.REVIVE_MESSAGE !== messageAction){
            return false;
        }
        if(GameConst.GAME_OVER !== messageAction && -1 === this.reviveModes.indexOf(message.mode)){
            Logger.warning('Unknown revive mode.', message.mode);
            return false;
        }
        return this.renderGameOverContent(GameConst.GAME_OVER === messageAction ? {} : message);
    }

    /**
     * @param {Object} reviveMessage
     * @returns {boolean}
     */
    renderGameOverContent(reviveMessage)
    {
        if(!this.gameOverTemplate){
            Logger.warning('Game over template not ready.');
            return false;
        }
        let gameOverContent = this.gameManager.gameDom.updateContent(
            ActionsConst.DEATH.SELECTORS.GAME_OVER_CONTENT,
            this.gameManager.gameEngine.parseTemplate(this.gameOverTemplate, this.createTemplateParams(reviveMessage))
        );
        if(!gameOverContent){
            Logger.warning('Game over content element not found.');
            return false;
        }
        return this.listenButtons(String(sc.get(reviveMessage, 'resurrectionAdEventKey', '')));
    }

    /**
     * @param {Object} reviveMessage
     * @returns {Object}
     */
    createTemplateParams(reviveMessage)
    {
        let mode = sc.get(reviveMessage, 'mode', '');
        let reviveReady = true === sc.get(reviveMessage, 'reviveReady', false);
        return Object.assign({
            gameOverWait: this.translateWait(reviveReady, Number(sc.get(reviveMessage, 'reviveWaitSeconds', 0))),
            reviveMessage: '' === mode ? '' : this.translator.t(ActionsConst.SNIPPETS.DEATH_PREFIX+mode, {
                itemLabel: sc.get(reviveMessage, 'itemLabel', ''),
                townLabel: sc.get(reviveMessage, 'townLabel', '')
            }),
            restorationItemQuestion: ActionsConst.DEATH.REVIVE_MODES.ASK_RESTORATION_ITEM === mode,
            reviveReady,
            resurrectionAd: '' !== String(sc.get(reviveMessage, 'resurrectionAdEventKey', ''))
        }, this.fixedTemplateParams);
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
     * @param {boolean} reviveReady
     * @param {number} reviveWaitSeconds
     * @returns {string}
     */
    translateWait(reviveReady, reviveWaitSeconds)
    {
        let waitSnippet = ActionsConst.SNIPPETS.DEATH_WAIT;
        if(0 < reviveWaitSeconds){
            waitSnippet = ActionsConst.SNIPPETS.DEATH_REVIVE_WAIT;
        }
        if(reviveReady){
            waitSnippet = ActionsConst.SNIPPETS.DEATH_REVIVE_READY;
        }
        return this.translator.t(waitSnippet, {seconds: reviveWaitSeconds});
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
