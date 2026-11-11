/**
 *
 * Reldens - Test Timing Object
 *
 * Covers the timing cancel causes and the completion, and checks every timing end frees the object and the player for
 * the next timing.
 *
 */

const timersPromises = require('node:timers/promises');
const { BaseTest } = require('./base-test');
const { TimingObjectBuilder } = require('./fixtures/timing-object-builder');

class TestTimingObject extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.timingBuilder = new TimingObjectBuilder();
        this.affectedProperty = this.timingBuilder.affectedProperty;
        this.startHp = this.timingBuilder.startHp;
        this.healCheckWaitMs = 150;
        this.slowAddItemMs = 300;
        this.busyCheckWaitMs = 150;
        this.cancelledResult = {sentActions: ['timingStart', 'timingCancel'], isActive: false, activeTiming: null};
        this.runningResult = {sentActions: ['timingStart'], isActive: true, activeTiming: this.timingBuilder.objectKey};
    }

    async testPlayerLeavingTheRoomStopsTheTiming()
    {
        await this.test('a player that leaves the room stops the timing so the object can be used again', async () => {
            let result = await this.timingBuilder.runTimingWithPlayerChange(
                {cancelOnMove: true},
                (playerSchema, timingSetup) => {
                    timingSetup.roomPlayers = {};
                }
            );
            this.assert.deepStrictEqual(result, {sentActions: ['timingStart'], isActive: false, activeTiming: null});
        });
    }

    async testCompletedTimingOfARemovedPlayerGivesNoReward()
    {
        await this.test('a timing completed after the player left gives no reward and frees the object', async () => {
            let timingSetup = this.timingBuilder.startRewardTiming();
            timingSetup.roomPlayers = {};
            timingSetup.playerSchema.inventory = null;
            await timersPromises.setTimeout(this.timingBuilder.checksWaitMs);
            this.assert.deepStrictEqual(timingSetup.addedItems, []);
            this.timingBuilder.assertFreedTiming(this.assert, timingSetup, ['timingStart']);
        });
    }

    async testObjectStaysBusyWhileTheRewardIsAdded()
    {
        await this.test('the object stays busy while the reward is added and is freed when the add ends', async () => {
            let addedItems = [];
            let timingSetup = this.timingBuilder.startRewardTiming(async (item) => {
                await timersPromises.setTimeout(this.slowAddItemMs);
                addedItems.push(item.key);
                return true;
            });
            await timersPromises.setTimeout(this.busyCheckWaitMs);
            this.timingBuilder.assertBusyTiming(this.assert, timingSetup);
            this.assert.deepStrictEqual(addedItems, []);
            await timersPromises.setTimeout(this.timingBuilder.checksWaitMs);
            this.assert.deepStrictEqual(addedItems, ['ore']);
            this.timingBuilder.assertFreedTiming(this.assert, timingSetup, ['timingStart', 'timingComplete']);
        });
    }

    async testRejectedRewardAddKeepsTheObjectBusyUntilItSettles()
    {
        await this.test('a rejected reward add keeps the object busy until it settles and frees it after', async () => {
            let timingSetup = this.timingBuilder.startRewardTiming(async () => {
                await timersPromises.setTimeout(this.slowAddItemMs);
                return Promise.reject({message: 'Storage.'});
            });
            await timersPromises.setTimeout(this.busyCheckWaitMs);
            this.timingBuilder.assertBusyTiming(this.assert, timingSetup);
            await timersPromises.setTimeout(this.timingBuilder.checksWaitMs);
            this.timingBuilder.assertFreedTiming(this.assert, timingSetup, ['timingStart']);
        });
    }

    async testNotAddedRewardCancelsTheTiming()
    {
        await this.test('a reward the inventory does not add cancels the timing and frees the object', async () => {
            let timingSetup = await this.timingBuilder.runRewardTiming(async () => false);
            this.timingBuilder.assertFreedTiming(this.assert, timingSetup, ['timingStart', 'timingCancel']);
        });
    }

    async testCompletedTimingRewardsThePlayerInTheRoom()
    {
        await this.test('a timing that completes with the player in the room adds the reward item', async () => {
            let timingSetup = await this.timingBuilder.runRewardTiming();
            this.assert.deepStrictEqual(timingSetup.addedItems, ['ore']);
            this.timingBuilder.assertFreedTiming(this.assert, timingSetup, ['timingStart', 'timingComplete']);
        });
    }

    async testRejectedRewardAddIsCaught()
    {
        await this.test('a rejected reward item add is caught and the object can be used again', async () => {
            let timingSetup = await this.timingBuilder.runRewardTiming(
                async () => Promise.reject({message: 'Storage.'})
            );
            this.timingBuilder.assertFreedTiming(this.assert, timingSetup, ['timingStart']);
        });
    }

    async testHitCancelsTheTiming()
    {
        await this.test('a hit lowering the player affected property cancels the timing with cancelOnHit', async () => {
            let result = await this.timingBuilder.runTimingWithPlayerChange({cancelOnHit: true}, (playerSchema) => {
                playerSchema.stats[this.affectedProperty] = this.startHp - 10;
            });
            this.assert.deepStrictEqual(result, this.cancelledResult);
        });
    }

    async testHitDoesNotCancelWithoutCancelOnHit()
    {
        await this.test('a hit does not cancel the timing when cancelOnHit is not set', async () => {
            let result = await this.timingBuilder.runTimingWithPlayerChange({cancelOnMove: true}, (playerSchema) => {
                playerSchema.stats[this.affectedProperty] = this.startHp - 10;
            });
            this.assert.deepStrictEqual(result, this.runningResult);
        });
    }

    async testHealDoesNotCancelTheTiming()
    {
        await this.test('a heal that raises the player affected property does not cancel the timing', async () => {
            let result = await this.timingBuilder.runTimingWithPlayerChange({cancelOnHit: true}, (playerSchema) => {
                playerSchema.stats[this.affectedProperty] = this.startHp + 10;
            });
            this.assert.deepStrictEqual(result, this.runningResult);
        });
    }

    async testHitAfterAHealCancelsTheTiming()
    {
        await this.test('a hit after a heal cancels the timing even above the starting value', async () => {
            let result = await this.timingBuilder.runTimingWithPlayerChange(
                {cancelOnHit: true},
                async (playerSchema) => {
                    playerSchema.stats[this.affectedProperty] = this.startHp + 20;
                    await timersPromises.setTimeout(this.healCheckWaitMs);
                    playerSchema.stats[this.affectedProperty] = this.startHp + 10;
                }
            );
            this.assert.deepStrictEqual(result, this.cancelledResult);
        });
    }

    async testMoveCancelsTheTiming()
    {
        await this.test('a player move cancels the timing with cancelOnMove', async () => {
            let result = await this.timingBuilder.runTimingWithPlayerChange({cancelOnMove: true}, (playerSchema) => {
                playerSchema.state.x = playerSchema.state.x + 1;
            });
            this.assert.deepStrictEqual(result, this.cancelledResult);
        });
    }

    async testOutOfRangeCancelsTheTiming()
    {
        await this.test('a player leaving the object reach cancels the timing with cancelOnOutOfRange', async () => {
            let result = await this.timingBuilder.runTimingWithPlayerChange(
                {cancelOnOutOfRange: true},
                (playerSchema) => {
                    playerSchema.state.x = this.timingBuilder.outOfReachPosition;
                }
            );
            this.assert.deepStrictEqual(result, this.cancelledResult);
        });
    }

}

module.exports.TestTimingObject = TestTimingObject;
