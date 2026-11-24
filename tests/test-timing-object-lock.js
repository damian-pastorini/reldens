/**
 *
 * Reldens - Test Timing Object Lock
 *
 * Covers the timing with server/objects/timing/lockPlayer enabled: the start stops the player movement intervals and
 * body, locks it and tells the client the timing is locked, the scene refuses every movement of the locked player and
 * accepts it again once the timing ends, a position change never cancels a locked timing (the move cancel rule only
 * applies unlocked) while the death still does and frees the lock, the completion frees the lock, and only the timing
 * cancel request of the player running it with this object id cancels it (another player, another object id or no
 * running timing changes nothing). Without the config the timing start is not locked, stops nothing and the scene keeps
 * the movement.
 *
 */

const timersPromises = require('node:timers/promises');
const { BaseTest } = require('./base-test');
const { TimingObjectBuilder } = require('./fixtures/timing-object-builder');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { RoomScene } = require('../lib/rooms/server/scene');
const { ObjectsConst } = require('../lib/objects/constants');
const { GameConst } = require('../lib/game/constants');
const { WorldTimer } = require('../lib/world/world-timer');

class TestTimingObjectLock extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.timingBuilder = new TimingObjectBuilder();
        this.lockedConfig = this.timingBuilder.lockedConfigValues;
        this.cancelRequest = {act: ObjectsConst.TIMING_CANCEL_REQUEST, id: this.timingBuilder.objectId};
        this.worldTimeStep = 40;
    }

    async startByInteraction(timingSetup)
    {
        return await timingSetup.timingObject.executeMessageActions(
            timingSetup.client,
            this.timingBuilder.interactionMessage,
            timingSetup.room,
            timingSetup.playerSchema
        );
    }

    async movePlayer(timingSetup)
    {
        let playerBody = timingSetup.playerSchema.physicalBody;
        playerBody.isBlocked = false;
        playerBody.world = {timeStep: this.worldTimeStep};
        playerBody.initMove = () => true;
        let scene = {
            movementInterval: {},
            worldTimer: new WorldTimer({clockInstance: {setInterval: () => 'world-steps-timer'}})
        };
        scene.worldTimer.startWorldSteps(playerBody.world);
        let moved = await RoomScene.prototype.executeMovePlayerActions.call(
            scene,
            timingSetup.playerSchema,
            {dir: GameConst.UP}
        );
        let intervals = Object.keys(scene.movementInterval);
        for(let intervalKey of intervals){
            clearInterval(scene.movementInterval[intervalKey]);
        }
        return {moved, intervals};
    }

    startMessage(isLocked)
    {
        return {act: 'timingStart', id: this.timingBuilder.objectId, key: this.timingBuilder.objectKey, locked: isLocked};
    }

    async testLockedStartStopsAndLocksThePlayerUntilTheEnd()
    {
        await this.test('the locked start stops and locks the player and the scene refuses its moves until the end', async () => {
            let timingSetup = this.timingBuilder.createTimingSetup({}, this.timingBuilder.timingDuration, this.lockedConfig);
            let playerSchema = timingSetup.playerSchema;
            await this.startByInteraction(timingSetup);
            this.assert.deepStrictEqual(timingSetup.client.sentMessages, [this.startMessage(true)]);
            this.assert.deepStrictEqual(
                [timingSetup.clearedIntervals, timingSetup.bodyStops],
                [[playerSchema.player_id], ['stopMove', 'resetAuto']]
            );
            this.assert.strictEqual(playerSchema.getPrivate(ObjectsConst.TIMING_MOVEMENT_LOCKED), true);
            this.assert.deepStrictEqual(await this.movePlayer(timingSetup), {moved: false, intervals: []});
            timingSetup.timingObject.stopTiming();
            this.assert.strictEqual(playerSchema.getPrivate(ObjectsConst.TIMING_MOVEMENT_LOCKED), null);
            this.assert.deepStrictEqual(
                await this.movePlayer(timingSetup),
                {moved: true, intervals: [playerSchema.player_id+'_'+GameConst.UP]}
            );
        });
    }

    async testUnlockedStartKeepsTheMovement()
    {
        await this.test('without the lock config the start is not locked, stops nothing and keeps the moves', async () => {
            let timingSetup = this.timingBuilder.createTimingSetup({});
            let playerSchema = timingSetup.playerSchema;
            await this.startByInteraction(timingSetup);
            this.assert.deepStrictEqual(timingSetup.client.sentMessages, [this.startMessage(false)]);
            this.assert.deepStrictEqual([timingSetup.clearedIntervals, timingSetup.bodyStops], [[], []]);
            this.assert.strictEqual(playerSchema.getPrivate(ObjectsConst.TIMING_MOVEMENT_LOCKED), null);
            this.assert.deepStrictEqual(
                await this.movePlayer(timingSetup),
                {moved: true, intervals: [playerSchema.player_id+'_'+GameConst.UP]}
            );
            let cancelled = await timingSetup.timingObject.executeMessageActions(
                timingSetup.client,
                this.cancelRequest,
                timingSetup.room,
                playerSchema
            );
            this.assert.strictEqual(cancelled, true);
            this.timingBuilder.assertFreedTiming(this.assert, timingSetup, ['timingStart', 'timingCancel']);
        });
    }

    async testPositionChangeNeverCancelsTheLockedTiming()
    {
        await this.test('a position change never cancels a locked timing, the death cancels it and frees the lock', async () => {
            let movedResult = await this.timingBuilder.runTimingWithPlayerChange(
                {cancelOnMove: true},
                (playerSchema) => {
                    playerSchema.state = {x: this.timingBuilder.objectPosition + 10, y: this.timingBuilder.objectPosition};
                },
                this.lockedConfig
            );
            this.assert.deepStrictEqual(movedResult, {
                sentActions: ['timingStart'],
                isActive: true,
                activeTiming: this.timingBuilder.objectKey,
                movementLocked: true
            });
            let deadResult = await this.timingBuilder.runTimingWithPlayerChange(
                {cancelOnMove: true},
                (playerSchema) => {
                    playerSchema.inState = GameConst.STATUS.DEATH;
                },
                this.lockedConfig
            );
            this.assert.deepStrictEqual(deadResult, {
                sentActions: ['timingStart', 'timingCancel'],
                isActive: false,
                activeTiming: null,
                movementLocked: null
            });
        });
    }

    async testCompletedLockedTimingFreesTheLock()
    {
        await this.test('the completed locked timing gives the reward and frees the lock', async () => {
            let timingSetup = this.timingBuilder.createTimingSetup(
                this.timingBuilder.oreRewards,
                this.timingBuilder.shortTimingDuration,
                this.lockedConfig
            );
            timingSetup.timingObject.startTiming(timingSetup.client, timingSetup.room, timingSetup.playerSchema);
            await timersPromises.setTimeout(this.timingBuilder.checksWaitMs);
            this.timingBuilder.assertFreedTiming(this.assert, timingSetup, ['timingStart', 'timingComplete']);
            this.assert.deepStrictEqual(timingSetup.addedItems, ['ore']);
            this.assert.strictEqual(timingSetup.playerSchema.getPrivate(ObjectsConst.TIMING_MOVEMENT_LOCKED), null);
        });
    }

    async testOnlyTheRunningPlayerCancelRequestCancels()
    {
        await this.test('only the cancel request of the player running the timing with this object id cancels it', async () => {
            let timingSetup = this.timingBuilder.createTimingSetup({}, this.timingBuilder.timingDuration, this.lockedConfig);
            let playerSchema = timingSetup.playerSchema;
            let requestArgs = [timingSetup.client, this.cancelRequest, timingSetup.room, playerSchema];
            let notRunning = await timingSetup.timingObject.executeMessageActions(...requestArgs);
            await this.startByInteraction(timingSetup);
            let otherPlayer = GameplayPlayerBuilder.createPlayerSchema({sessionId: 'session-2'});
            let ignoredResults = [
                await timingSetup.timingObject.executeMessageActions(
                    timingSetup.client,
                    {act: ObjectsConst.TIMING_CANCEL_REQUEST, id: this.timingBuilder.objectId + 1},
                    timingSetup.room,
                    playerSchema
                ),
                await timingSetup.timingObject.executeMessageActions(
                    timingSetup.client,
                    this.cancelRequest,
                    timingSetup.room,
                    otherPlayer
                )
            ];
            this.assert.deepStrictEqual([notRunning, ...ignoredResults], [false, false, false]);
            this.assert.deepStrictEqual(timingSetup.client.sentActions, ['timingStart']);
            this.timingBuilder.assertBusyTiming(this.assert, timingSetup);
            this.assert.strictEqual(playerSchema.getPrivate(ObjectsConst.TIMING_MOVEMENT_LOCKED), true);
            this.assert.strictEqual(await timingSetup.timingObject.executeMessageActions(...requestArgs), true);
            this.timingBuilder.assertFreedTiming(this.assert, timingSetup, ['timingStart', 'timingCancel']);
            this.assert.strictEqual(playerSchema.getPrivate(ObjectsConst.TIMING_MOVEMENT_LOCKED), null);
        });
    }

}

module.exports.TestTimingObjectLock = TestTimingObjectLock;
