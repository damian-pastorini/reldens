/**
 *
 * Reldens - ScoresMessageHandler
 *
 * Handles scores-related messages on the client side, managing the scores UI creation and updates.
 * Creates and updates the scores interface including player scores and top scores leaderboard.
 *
 */

const { UserInterface } = require('../../game/client/user-interface');
const { ScoresConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../rooms/client/room-events').RoomEvents} RoomEvents
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('../../game/client/game-dom').GameDom} GameDom
 * @typedef {import('../../game/client/scene-preloader').ScenePreloader} ScenePreloader
 *
 * @typedef {Object} ScoresMessageHandlerProps
 * @property {RoomEvents} roomEvents
 * @property {Object} message
 */
class ScoresMessageHandler
{

    /**
     * @param {ScoresMessageHandlerProps} props
     */
    constructor(props)
    {
        /** @type {RoomEvents|boolean} */
        this.roomEvents = sc.get(props, 'roomEvents', false);
        /** @type {Object|boolean} */
        this.message = sc.get(props, 'message', false);
        /** @type {GameManager|undefined} */
        this.gameManager = this.roomEvents?.gameManager;
        /** @type {GameDom|undefined} */
        this.gameDom = this.gameManager?.gameDom;
        /** @type {ScenePreloader|undefined} */
        this.uiScene = this.gameManager?.gameEngine?.uiScene;
    }

    /**
     * @returns {ScenePreloader|boolean}
     */
    validate()
    {
        if(!this.roomEvents){
            Logger.info('Missing RoomEvents on ScoresMessageHandler.');
            return false;
        }
        if(!this.message){
            Logger.info('Missing message on ScoresMessageHandler.');
            return false;
        }
        if(!this.gameManager){
            Logger.info('Missing GameManager on ScoresMessageHandler.');
            return false;
        }
        // @NOTE: the message could arrive before the uiScene gets ready.
        // if(!this.uiScene){
        //     Logger.info('Missing UI Scene on ScoresMessageHandler.');
        // }
        return this.uiScene;
    }

    /**
     * @returns {UserInterface|boolean}
     */
    createScoresUi()
    {
        let scoresUi = sc.get(this.uiScene.userInterfaces, ScoresConst.KEY);
        if(scoresUi){
            return scoresUi;
        }
        if(!this.uiScene.userInterfaces){
            this.uiScene.userInterfaces = {};
        }
        let uiScores = new UserInterface(
            this.gameManager,
            {id: ScoresConst.KEY, type: ScoresConst.KEY, defaultOpen: true, defaultClose: true},
            '/assets/features/scores/templates/ui-scores.html',
            ScoresConst.KEY
        );
        uiScores.createUiElement(this.uiScene, ScoresConst.KEY);
        // @TODO - BETA - Check if this can be moved inside the createUiElement.
        let uiBox = this.uiScene.elementsUi[ScoresConst.KEY];
        if(!uiBox){
            Logger.error('Scores UI box not found.', {uiScores, uiBox});
            return false;
        }
        let title = this.gameManager.services.translator.t(
            this.gameManager.config.getWithoutLogs('client/scores/labels/title', ScoresConst.SNIPPETS.TITLE)
        );
        let content = this.gameManager.services.translator.t(
            this.gameManager.config.getWithoutLogs('client/scores/labels/content', ScoresConst.SNIPPETS.CONTENT)
        );
        this.roomEvents.uiSetTitleAndContent(uiBox, {title, content}, this.uiScene);
        this.uiScene.userInterfaces[ScoresConst.KEY] = uiScores;
        return this.uiScene.userInterfaces[ScoresConst.KEY];
    }

    updatePlayerScore()
    {
        this.createScoresUi();
        let currentPlayerScore = sc.get(this.message, 'newTotalScore', false);
        if(!currentPlayerScore){
            Logger.debug('Missing new total score on update message.');
            return;
        }
        this.uiScene.currentPlayerScore = currentPlayerScore;
        this.roomEvents.uiSetContent(
            this.uiScene.elementsUi[ScoresConst.KEY],
            {content: this.createContentsUpdate()},
            this.uiScene
        );
    }

    updateScoresBox()
    {
        this.createScoresUi();
        let scores = sc.get(this.message, 'scores', false);
        if(!scores){
            Logger.debug('Missing scores data on message.');
            return;
        }
        this.uiScene.scores = scores;
        this.roomEvents.uiSetContent(
            this.uiScene.elementsUi[ScoresConst.KEY],
            {content: this.createContentsUpdate()},
            this.uiScene
        );
    }

    /**
     * @returns {string}
     */
    createContentsUpdate()
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let templateContent = this.uiScene.cache.html.get(ScoresConst.TEMPLATES.SCORES_TABLE);
        if(!templateContent){
            Logger.error('Missing template "' + ScoresConst.TEMPLATES.SCORES_TABLE + '".');
            return '';
        }
        let templateParams = {
            scores: this.uiScene.scores,
            showCurrentPlayer: true,
            currentPlayerScore: this.gameManager.services.translator.t(
                this.gameManager.config.getWithoutLogs('client/scores/labels/myScore', ScoresConst.SNIPPETS.MY_SCORE),
                {myScore: this.uiScene.currentPlayerScore || '0'}
            )
        };
        return this.gameManager.gameEngine.parseTemplate(templateContent, templateParams);
    }
}

module.exports.ScoresMessageHandler = ScoresMessageHandler;
