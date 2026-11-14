/**
 *
 * Reldens - Test Timing Object Start
 *
 * Covers the timing start by an interaction or a hit and every refused start: a dead or disabled player, a wrong
 * message, a busy object, a player out of reach or already running the timing of another object, which keeps a second
 * object in reach from starting until that timing ends and is never freed by the end of another timing.
 *
 */

const { BaseTest } = require('./base-test');
const { TimingObjectBuilder } = require('./fixtures/timing-object-builder');
const { ObjectsConst } = require('../lib/objects/constants');
const { GameConst } = require('../lib/game/constants');

class TestTimingObjectStart extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.timingBuilder = new TimingObjectBuilder();
        this.activeTimingKey = this.timingBuilder.activeTimingKey;
        this.objectKey = this.timingBuilder.objectKey;
        this.secondObjectKey = this.timingBuilder.secondObjectKey;
    }

    async testInteractionStartsTheTimingAndMarksThePlayer()
    {
        await this.test('an interaction in reach starts the timing and marks the player with its key', async () => {
            let timingSetup = this.timingBuilder.createTimingSetup({});
            await timingSetup.timingObject.executeMessageActions(
                timingSetup.client,
                this.timingBuilder.interactionMessage,
                timingSetup.room,
                timingSetup.playerSchema
            );
            this.assert.deepStrictEqual(timingSetup.client.sentActions, ['timingStart']);
            this.timingBuilder.assertBusyTiming(this.assert, timingSetup);
            timingSetup.timingObject.stopTiming();
            this.timingBuilder.assertFreedTiming(this.assert, timingSetup, ['timingStart']);
        });
    }

    async testRefusedInteractionsStartNothing()
    {
        await this.test('a refused interaction starts no timing and keeps the object and player state', async () => {
            let baseCase = Object.assign({
                message: this.timingBuilder.interactionMessage,
                isActive: false,
                position: this.timingBuilder.objectPosition,
                sentActions: [],
                activeTiming: null
            }, this.timingBuilder.freePlayer);
            let refusedCases = [
                {inState: GameConst.STATUS.DEATH},
                {inState: GameConst.STATUS.DISABLED},
                {message: {act: ObjectsConst.OBJECT_INTERACTION, id: this.timingBuilder.objectId + 1}},
                {message: {act: GameConst.BUTTON_OPTION, id: this.timingBuilder.objectId}},
                {isActive: true},
                {runningTiming: this.secondObjectKey, activeTiming: this.secondObjectKey},
                {position: this.timingBuilder.outOfReachPosition, sentActions: [GameConst.CLOSE_UI_ACTION]}
            ];
            for(let refusedCaseProps of refusedCases){
                let refusedCase = Object.assign({}, baseCase, refusedCaseProps);
                let timingSetup = this.timingBuilder.createPlayerCaseSetup({}, refusedCase);
                timingSetup.playerSchema.state = {x: refusedCase.position, y: refusedCase.position};
                timingSetup.timingObject.isActive = refusedCase.isActive;
                let started = await timingSetup.timingObject.executeMessageActions(
                    timingSetup.client,
                    refusedCase.message,
                    timingSetup.room,
                    timingSetup.playerSchema
                );
                this.assert.strictEqual(started, false);
                this.assert.deepStrictEqual(timingSetup.client.sentActions, refusedCase.sentActions);
                this.assert.strictEqual(timingSetup.timingObject.isActive, refusedCase.isActive);
                this.assert.strictEqual(timingSetup.timingObject.timingPlayer, null);
                this.assert.strictEqual(
                    timingSetup.playerSchema.getPrivate(this.activeTimingKey),
                    refusedCase.activeTiming
                );
            }
        });
    }

    async testSecondObjectStartsNothingWhileThePlayerTimingRuns()
    {
        await this.test('a second object in reach starts nothing until the running player timing ends', async () => {
            let timingSetup = this.timingBuilder.createTimingSetup({});
            let secondObject = this.timingBuilder.createTimingObject(
                {},
                this.timingBuilder.timingDuration,
                this.secondObjectKey
            );
            let interactionArgs = [
                timingSetup.client,
                this.timingBuilder.interactionMessage,
                timingSetup.room,
                timingSetup.playerSchema
            ];
            await timingSetup.timingObject.executeMessageActions(...interactionArgs);
            this.assert.strictEqual(await secondObject.executeMessageActions(...interactionArgs), false);
            this.assert.deepStrictEqual(timingSetup.client.sentActions, ['timingStart']);
            this.assert.strictEqual(secondObject.isActive, false);
            this.assert.strictEqual(timingSetup.playerSchema.getPrivate(this.activeTimingKey), this.objectKey);
            timingSetup.timingObject.cancelTiming(timingSetup.client);
            await secondObject.executeMessageActions(...interactionArgs);
            this.assert.deepStrictEqual(timingSetup.client.sentActions, ['timingStart', 'timingCancel', 'timingStart']);
            this.assert.strictEqual(secondObject.isActive, true);
            this.assert.strictEqual(timingSetup.playerSchema.getPrivate(this.activeTimingKey), this.secondObjectKey);
            secondObject.stopTiming();
            this.assert.strictEqual(timingSetup.playerSchema.getPrivate(this.activeTimingKey), null);
        });
    }

    async testEndedTimingKeepsTheTimingOfAnotherObject()
    {
        await this.test('an ended timing never frees the player timing of another object', async () => {
            let timingSetup = this.timingBuilder.createTimingSetup({});
            let timingObject = timingSetup.timingObject;
            timingObject.startTiming(timingSetup.client, timingSetup.room, timingSetup.playerSchema);
            timingSetup.playerSchema.setPrivate(this.activeTimingKey, this.secondObjectKey);
            timingObject.stopTiming();
            this.assert.strictEqual(timingObject.isActive, false);
            this.assert.strictEqual(timingObject.timingPlayer, null);
            this.assert.strictEqual(timingSetup.playerSchema.getPrivate(this.activeTimingKey), this.secondObjectKey);
        });
    }

    async testHitStartsTheTimingOnlyForAFreePlayer()
    {
        await this.test('a hit starts the timing only for a player not dead, disabled or busy', async () => {
            let baseCase = Object.assign(
                {sentActions: [], isActive: false, activeTiming: null},
                this.timingBuilder.freePlayer
            );
            let hitCases = [
                {sentActions: ['timingStart'], isActive: true, activeTiming: this.objectKey},
                {inState: GameConst.STATUS.DEATH},
                {inState: GameConst.STATUS.DISABLED},
                {runningTiming: this.secondObjectKey, activeTiming: this.secondObjectKey}
            ];
            for(let hitCaseProps of hitCases){
                let hitCase = Object.assign({}, baseCase, hitCaseProps);
                let timingSetup = this.timingBuilder.createPlayerCaseSetup({runOnHit: true}, hitCase);
                timingSetup.timingObject.onHit({
                    room: timingSetup.room,
                    bodyA: {playerId: this.timingBuilder.sessionId},
                    bodyB: {}
                });
                this.assert.deepStrictEqual(timingSetup.client.sentActions, hitCase.sentActions);
                this.assert.strictEqual(timingSetup.timingObject.isActive, hitCase.isActive);
                this.assert.strictEqual(
                    timingSetup.playerSchema.getPrivate(this.activeTimingKey),
                    hitCase.activeTiming
                );
                timingSetup.timingObject.stopTiming();
            }
        });
    }

}

module.exports.TestTimingObjectStart = TestTimingObjectStart;
