/**
 *
 * Reldens - Test Quests Tracking
 *
 * Tests the quests tracking plugins with the storage, the client and the room stubbed: the server sends the quest keys
 * of the player rows and of the global rows (loaded with one OR filter), sends nothing for a player with no player id
 * and an empty list when the load gives no results; the client stores the received keys and fires the loaded event,
 * stores an empty list for a message without quests and ignores the messages with another act.
 *
 */

const { BaseTest } = require('./base-test');
const { QuestsPlugin } = require('../lib/quests/server/plugin');
const { QuestsClientPlugin } = require('../lib/quests/client/plugin');
const { QuestsConst } = require('../lib/quests/constants');
const { EventsManager } = require('@reldens/utils');

class TestQuestsTracking extends BaseTest
{

    async sendQuestsData(currentPlayer, loadedRows)
    {
        let questsSend = {loadFilters: [], sentMessages: []};
        let questsRepository = {};
        questsRepository.load = async (filters) => {
            questsSend.loadFilters.push(filters);
            return loadedRows;
        };
        let client = {send: (messageKey, message) => questsSend.sentMessages.push(message)};
        questsSend.result = await new QuestsPlugin().sendPlayerQuestsData(client, currentPlayer, {
            dataServer: {getEntity: () => questsRepository}
        });
        return questsSend;
    }

    async testThePlayerAndGlobalQuestKeysAreSent()
    {
        await this.test('the quest keys of the player rows and of the global rows are sent to the player', async () => {
            let questsSend = await this.sendQuestsData({player_id: 7}, [
                {player_id: 7, quest_key: 'e2e-player-quest'},
                {player_id: null, quest_key: 'e2e-global-quest'}
            ]);
            this.assert.deepStrictEqual(questsSend.loadFilters, [{OR: [{player_id: 7}, {player_id: null}]}]);
            this.assert.deepStrictEqual(questsSend.sentMessages, [{
                act: QuestsConst.QUESTS_TRACKING.MESSAGE_ACT,
                quests: ['e2e-player-quest', 'e2e-global-quest']
            }]);
        });
    }

    async testNoPlayerIdOrNoResultsSendNoKeys()
    {
        await this.test('a player with no id sends nothing and a load with no results sends an empty list', async () => {
            let noPlayerSend = await this.sendQuestsData({}, []);
            this.assert.deepStrictEqual([noPlayerSend.result, noPlayerSend.loadFilters, noPlayerSend.sentMessages], [
                false,
                [],
                []
            ]);
            let noResultsSend = await this.sendQuestsData({player_id: 7}, false);
            this.assert.deepStrictEqual(noResultsSend.sentMessages, [{
                act: QuestsConst.QUESTS_TRACKING.MESSAGE_ACT,
                quests: []
            }]);
        });
    }

    createQuestsClient()
    {
        let questsClient = {events: new EventsManager(), gameManager: {}, loadedEvents: [], messageHandlers: []};
        questsClient.events.on(QuestsConst.QUESTS_TRACKING.EVENT_LOADED, (questsData) => {
            questsClient.loadedEvents.push(questsData);
        });
        new QuestsClientPlugin().setup({events: questsClient.events});
        let room = {onMessage: (messageKey, handler) => questsClient.messageHandlers.push(handler)};
        questsClient.events.emitSync('reldens.activateRoom', room, questsClient.gameManager);
        return questsClient;
    }

    async testTheClientStoresTheQuestKeys()
    {
        await this.test('the client stores the received keys, an empty list without quests and ignores other acts', async () => {
            let questsClient = this.createQuestsClient();
            let handleMessage = questsClient.messageHandlers[0];
            this.assert.strictEqual(handleMessage({act: 'otherAct', quests: ['e2e-other']}), false);
            this.assert.strictEqual(Object.keys(questsClient.gameManager).includes('playerQuestsData'), false);
            this.assert.deepStrictEqual(questsClient.loadedEvents, []);
            this.assert.strictEqual(handleMessage({act: QuestsConst.QUESTS_TRACKING.MESSAGE_ACT, quests: ['e2e-a']}), true);
            this.assert.deepStrictEqual(questsClient.gameManager.playerQuestsData, ['e2e-a']);
            handleMessage({act: QuestsConst.QUESTS_TRACKING.MESSAGE_ACT});
            this.assert.deepStrictEqual(questsClient.gameManager.playerQuestsData, []);
            this.assert.deepStrictEqual(questsClient.loadedEvents, [['e2e-a'], []]);
        });
    }

}

module.exports.TestQuestsTracking = TestQuestsTracking;
