/**
 *
 * Reldens - Test Scores Message Listener
 *
 * Tests the client scores messages with the game manager and the UI scene stubbed (the template params rendered as
 * JSON, so the rendered scores and own score line are read back): the scores messages received before the UI scene
 * exists are queued and a non scores message is not, and the queued messages applied in order leave the latest values;
 * an update with no new total keeps the own score, a top scores update with no scores keeps the rows and an unknown
 * scores act changes nothing; no stored scores render no rows; and the configured title, content and own score label
 * are the translated texts, the label with the score in it.
 *
 */

const { BaseTest } = require('./base-test');
const { ScoresMessageListener } = require('../lib/scores/client/scores-message-listener');
const { MessageProcessor } = require('../lib/scores/client/messages-processor');
const { Translator } = require('../lib/snippets/translator');
const { ScoresConst } = require('../lib/scores/constants');
const { sc } = require('@reldens/utils');

class TestScoresMessageListener extends BaseTest
{

    createRoomEvents(uiScene, configValues = {})
    {
        let roomEvents = {renderedContents: [], titles: []};
        roomEvents.gameManager = {
            gameEngine: {uiScene, parseTemplate: (template, params) => sc.toJsonString(params)},
            services: {translator: new Translator({})},
            config: {getWithoutLogs: (path, defaultValue) => sc.get(configValues, path, defaultValue)},
            gameDom: {}
        };
        roomEvents.uiSetTitleAndContent = (uiBox, props) => roomEvents.titles.push([props.title, props.content]);
        roomEvents.uiSetContent = (uiBox, props) => roomEvents.renderedContents.push(sc.parseJson(props.content));
        return roomEvents;
    }

    createUiScene()
    {
        return {
            userInterfaces: {},
            elementsUi: {[ScoresConst.KEY]: {}},
            cache: {html: {get: () => 'scores-table-template'}}
        };
    }

    async sendMessages(roomEvents, messages)
    {
        let listener = new ScoresMessageListener();
        for(let message of messages){
            await listener.executeClientMessageActions({message, roomEvents});
        }
        return listener;
    }

    async testTheMessagesBeforeTheUiSceneAreQueuedAndAppliedInOrder()
    {
        await this.test('the scores messages before the UI scene are queued and applied in order', async () => {
            let roomEvents = this.createRoomEvents(false, {'client/scores/labels/myScore': 'Mine: %myScore'});
            let listener = await this.sendMessages(roomEvents, [
                {act: ScoresConst.ACTIONS.UPDATE, newTotalScore: 5},
                {act: 'notScores'},
                {act: ScoresConst.ACTIONS.UPDATE, newTotalScore: 9}
            ]);
            this.assert.deepStrictEqual(roomEvents.scoresMessagesQueue.map(message => message.newTotalScore), [5, 9]);
            let uiScene = this.createUiScene();
            roomEvents.gameManager.gameEngine.uiScene = uiScene;
            MessageProcessor.processScoresMessagesQueue(roomEvents, listener);
            this.assert.strictEqual(uiScene.currentPlayerScore, 9);
            this.assert.strictEqual(roomEvents.renderedContents.pop().currentPlayerScore, 'Mine: 9');
            this.assert.deepStrictEqual(roomEvents.scoresMessagesQueue, []);
        });
    }

    async testIncompleteAndUnknownMessagesChangeNothing()
    {
        await this.test('an update with no total, tops with no scores and an unknown act change nothing', async () => {
            let uiScene = this.createUiScene();
            uiScene.currentPlayerScore = 12;
            uiScene.scores = [{playerName: 'ImRoot', score: 12}];
            let roomEvents = this.createRoomEvents(uiScene);
            await this.sendMessages(roomEvents, [
                {act: ScoresConst.ACTIONS.UPDATE},
                {act: ScoresConst.ACTIONS.TOP_SCORES_UPDATE},
                {act: ScoresConst.PREFIX+'Unknown', scores: [], newTotalScore: 99}
            ]);
            this.assert.strictEqual(uiScene.currentPlayerScore, 12);
            this.assert.deepStrictEqual(uiScene.scores, [{playerName: 'ImRoot', score: 12}]);
            this.assert.deepStrictEqual(roomEvents.renderedContents, []);
        });
    }

    async testNoStoredScoresRenderNoRows()
    {
        await this.test('a top scores update with no stored scores renders no rows', async () => {
            let roomEvents = this.createRoomEvents(this.createUiScene());
            await this.sendMessages(roomEvents, [{act: ScoresConst.ACTIONS.TOP_SCORES_UPDATE, scores: []}]);
            this.assert.deepStrictEqual(roomEvents.renderedContents.pop().scores, []);
        });
    }

    async testTheConfiguredLabelsAreTranslated()
    {
        await this.test('the configured title, content and own score label are the translated texts', async () => {
            let roomEvents = this.createRoomEvents(this.createUiScene(), {
                'client/scores/labels/title': 'E2E title',
                'client/scores/labels/content': 'E2E content',
                'client/scores/labels/myScore': 'E2E points: %myScore'
            });
            await this.sendMessages(roomEvents, [{act: ScoresConst.ACTIONS.UPDATE, newTotalScore: 7}]);
            this.assert.deepStrictEqual(roomEvents.titles, [['E2E title', 'E2E content']]);
            this.assert.strictEqual(roomEvents.renderedContents.pop().currentPlayerScore, 'E2E points: 7');
        });
    }

}

module.exports.TestScoresMessageListener = TestScoresMessageListener;
