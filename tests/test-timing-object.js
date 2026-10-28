/**
 *
 * Reldens - Test Timing Object
 *
 */

const timersPromises = require('node:timers/promises');
const { BaseTest } = require('./base-test');
const { TimingObject } = require('../lib/objects/server/object/type/timing-object');
const { sc } = require('@reldens/utils');

class TestTimingObject extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.affectedProperty = 'hp';
        this.startHp = 100;
        this.timingDuration = 5000;
        this.shortTimingDuration = 50;
        this.checksWaitMs = 350;
        this.healCheckWaitMs = 150;
        this.configValues = {'client/actions/skills/affectedProperty': this.affectedProperty};
    }

    createTimingObject(privateParams, timingDuration = this.timingDuration)
    {
        return new TimingObject({
            events: {},
            config: {
                get: (path) => this.configValues[path],
                getWithoutLogs: (path, defaultValue) => defaultValue
            },
            dataServer: {},
            client_key: 'timing_object',
            id: 1,
            client_params: sc.toJsonString({timingDuration}),
            private_params: sc.toJsonString(privateParams)
        });
    }

    createTimingSetup(privateParams, timingDuration = this.timingDuration)
    {
        let timingSetup = {
            timingObject: this.createTimingObject(privateParams, timingDuration),
            client: {sessionId: 'session-1', sentActions: []},
            addedItems: [],
            playerSchema: {state: {x: 100, y: 100}, stats: {[this.affectedProperty]: this.startHp}}
        };
        timingSetup.client.send = (type, data) => timingSetup.client.sentActions.push(data.act);
        timingSetup.playerSchema.inventory = {
            manager: {
                createItemInstance: (itemKey) => ({key: itemKey}),
                addItem: async (item) => timingSetup.addedItems.push(item.key)
            }
        };
        timingSetup.roomPlayers = {[timingSetup.client.sessionId]: timingSetup.playerSchema};
        timingSetup.room = {
            config: timingSetup.timingObject.config,
            playerBySessionIdFromState: (sessionId) => sc.get(timingSetup.roomPlayers, sessionId, false)
        };
        return timingSetup;
    }

    async runTimingWithPlayerChange(privateParams, changePlayer)
    {
        let timingSetup = this.createTimingSetup(privateParams);
        let timingObject = timingSetup.timingObject;
        timingObject.startTiming(timingSetup.client, timingSetup.room, timingSetup.playerSchema);
        await changePlayer(timingSetup.playerSchema, timingSetup);
        await timersPromises.setTimeout(this.checksWaitMs);
        clearInterval(timingObject.timingCheckInterval);
        clearTimeout(timingObject.timingTimer);
        return {sentActions: timingSetup.client.sentActions, isActive: timingObject.isActive};
    }

    async testPlayerLeavingTheRoomStopsTheTiming()
    {
        await this.test('a player that leaves the room stops the timing so the object can be used again', async () => {
            let result = await this.runTimingWithPlayerChange({cancelOnMove: true}, (playerSchema, timingSetup) => {
                timingSetup.roomPlayers = {};
            });
            this.assert.deepStrictEqual(result, {sentActions: ['timingStart'], isActive: false});
        });
    }

    async testCompletedTimingOfARemovedPlayerGivesNoReward()
    {
        await this.test('a timing that completes after the player left gives no reward and never rejects', async () => {
            let timingSetup = this.createTimingSetup({rewards: [{key: 'ore', rate: 100}]});
            timingSetup.roomPlayers = {};
            timingSetup.playerSchema.inventory = null;
            timingSetup.timingObject.isActive = true;
            await timingSetup.timingObject.completeTiming(timingSetup.client, timingSetup.room, timingSetup.playerSchema);
            this.assert.strictEqual(timingSetup.timingObject.isActive, false);
            this.assert.deepStrictEqual(timingSetup.client.sentActions, []);
        });
    }

    async testCompletedTimingRewardsThePlayerInTheRoom()
    {
        await this.test('a timing that completes with the player in the room adds the reward item', async () => {
            let timingSetup = this.createTimingSetup({rewards: [{key: 'ore', rate: 100}]}, this.shortTimingDuration);
            let timingObject = timingSetup.timingObject;
            timingObject.startTiming(timingSetup.client, timingSetup.room, timingSetup.playerSchema);
            await timersPromises.setTimeout(this.checksWaitMs);
            this.assert.deepStrictEqual(timingSetup.addedItems, ['ore']);
            this.assert.deepStrictEqual(timingSetup.client.sentActions, ['timingStart', 'timingComplete']);
            this.assert.strictEqual(timingObject.isActive, false);
        });
    }

    async testRejectedRewardAddIsCaught()
    {
        await this.test('a rejected reward item add is caught and the object can be used again', async () => {
            let timingSetup = this.createTimingSetup({rewards: [{key: 'ore', rate: 100}]}, this.shortTimingDuration);
            let timingObject = timingSetup.timingObject;
            timingSetup.playerSchema.inventory.manager.addItem = async () => Promise.reject({message: 'Storage.'});
            timingObject.startTiming(timingSetup.client, timingSetup.room, timingSetup.playerSchema);
            await timersPromises.setTimeout(this.checksWaitMs);
            this.assert.deepStrictEqual(timingSetup.client.sentActions, ['timingStart']);
            this.assert.strictEqual(timingObject.isActive, false);
        });
    }

    async testHitCancelsTheTiming()
    {
        await this.test('a hit that lowers the player affected property cancels the timing with cancelOnHit', async () => {
            let result = await this.runTimingWithPlayerChange({cancelOnHit: true}, (playerSchema) => {
                playerSchema.stats[this.affectedProperty] = this.startHp - 10;
            });
            this.assert.deepStrictEqual(result, {sentActions: ['timingStart', 'timingCancel'], isActive: false});
        });
    }

    async testHitDoesNotCancelWithoutCancelOnHit()
    {
        await this.test('a hit does not cancel the timing when cancelOnHit is not set', async () => {
            let result = await this.runTimingWithPlayerChange({cancelOnMove: true}, (playerSchema) => {
                playerSchema.stats[this.affectedProperty] = this.startHp - 10;
            });
            this.assert.deepStrictEqual(result, {sentActions: ['timingStart'], isActive: true});
        });
    }

    async testHealDoesNotCancelTheTiming()
    {
        await this.test('a heal that raises the player affected property does not cancel the timing', async () => {
            let result = await this.runTimingWithPlayerChange({cancelOnHit: true}, (playerSchema) => {
                playerSchema.stats[this.affectedProperty] = this.startHp + 10;
            });
            this.assert.deepStrictEqual(result, {sentActions: ['timingStart'], isActive: true});
        });
    }

    async testHitAfterAHealCancelsTheTiming()
    {
        await this.test('a hit after a heal cancels the timing even when the value stays above the starting one', async () => {
            let result = await this.runTimingWithPlayerChange({cancelOnHit: true}, async (playerSchema) => {
                playerSchema.stats[this.affectedProperty] = this.startHp + 20;
                await timersPromises.setTimeout(this.healCheckWaitMs);
                playerSchema.stats[this.affectedProperty] = this.startHp + 10;
            });
            this.assert.deepStrictEqual(result, {sentActions: ['timingStart', 'timingCancel'], isActive: false});
        });
    }

    async testMoveCancelsTheTiming()
    {
        await this.test('a player move cancels the timing with cancelOnMove', async () => {
            let result = await this.runTimingWithPlayerChange({cancelOnMove: true}, (playerSchema) => {
                playerSchema.state.x = playerSchema.state.x + 1;
            });
            this.assert.deepStrictEqual(result, {sentActions: ['timingStart', 'timingCancel'], isActive: false});
        });
    }

}

module.exports.TestTimingObject = TestTimingObject;
