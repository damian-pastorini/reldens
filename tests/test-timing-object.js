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
        this.checksWaitMs = 350;
        this.healCheckWaitMs = 150;
        this.configValues = {'client/actions/skills/affectedProperty': this.affectedProperty};
    }

    createTimingObject(privateParams)
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
            client_params: sc.toJsonString({timingDuration: this.timingDuration}),
            private_params: sc.toJsonString(privateParams)
        });
    }

    async runTimingWithPlayerChange(privateParams, changePlayer)
    {
        let timingObject = this.createTimingObject(privateParams);
        let client = {sentActions: []};
        client.send = (type, data) => client.sentActions.push(data.act);
        let playerSchema = {state: {x: 100, y: 100}, stats: {[this.affectedProperty]: this.startHp}};
        timingObject.startTiming(client, {config: timingObject.config}, playerSchema);
        await changePlayer(playerSchema);
        await timersPromises.setTimeout(this.checksWaitMs);
        clearInterval(timingObject.timingCheckInterval);
        clearTimeout(timingObject.timingTimer);
        return {sentActions: client.sentActions, isActive: timingObject.isActive};
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
