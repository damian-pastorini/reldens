/**
 *
 * Reldens - Test Scene Movement And Message Guards
 *
 */

const timersPromises = require('timers/promises');
const { BaseTest } = require('./base-test');
const { RoomScene } = require('../lib/rooms/server/scene');
const { RoomGame } = require('../lib/rooms/server/game');
const { GameConst } = require('../lib/game/constants');

class TestSceneMovementAndMessageGuards extends BaseTest
{

    createMovementSetup(timeStep)
    {
        let movementSetup = {movedDirections: [], stopsCount: 0, inState: 'active', room: Object.create(RoomScene.prototype)};
        movementSetup.room.movementInterval = {};
        movementSetup.room.config = {get: () => false};
        movementSetup.playerSchema = {
            player_id: 7,
            isDeath: () => 'death' === movementSetup.inState,
            isDisabled: () => 'disabled' === movementSetup.inState,
            physicalBody: {
                isChangingScene: false,
                isBlocked: false,
                world: {timeStep},
                initMove: (direction) => movementSetup.movedDirections.push(direction),
                stopMove: () => movementSetup.stopsCount++
            }
        };
        return movementSetup;
    }

    async sendMovementMessages(room, playerSchema, messages)
    {
        let results = [];
        for(let message of messages){
            results.push(await room.executeMovePlayerActions(playerSchema, message));
        }
        return results;
    }

    async testDeadOrDisabledPlayerMovementIsStopped()
    {
        await this.test('a dead or disabled player direction or pointer is stopped and clears its running movement', async () => {
            for(let inState of ['death', 'disabled']){
                let movementSetup = this.createMovementSetup(1000);
                let room = movementSetup.room;
                await room.executeMovePlayerActions(movementSetup.playerSchema, {dir: GameConst.UP});
                movementSetup.inState = inState;
                let results = await this.sendMovementMessages(room, movementSetup.playerSchema, [
                    {dir: GameConst.DOWN},
                    {act: GameConst.POINTER, column: 3, row: 4}
                ]);
                this.assert.deepStrictEqual(results, [false, false]);
                this.assert.deepStrictEqual(room.movementInterval, {});
                this.assert.strictEqual(movementSetup.stopsCount, 2);
            }
        });
    }

    async testChangingSceneOrBlockedBodyIgnoresTheMovement()
    {
        await this.test('a body changing scene or blocked ignores the movement input', async () => {
            for(let bodyFlag of ['isChangingScene', 'isBlocked']){
                let movementSetup = this.createMovementSetup(1000);
                movementSetup.playerSchema.physicalBody[bodyFlag] = true;
                this.assert.strictEqual(
                    await movementSetup.room.executeMovePlayerActions(movementSetup.playerSchema, {dir: GameConst.UP}),
                    false
                );
                this.assert.deepStrictEqual(movementSetup.room.movementInterval, {});
                this.assert.deepStrictEqual(movementSetup.movedDirections, []);
            }
        });
    }

    async testStopMessageStopsABlockedBody()
    {
        await this.test('the stop message stops a blocked body and clears its running movement', async () => {
            let movementSetup = this.createMovementSetup(1000);
            let room = movementSetup.room;
            await room.executeMovePlayerActions(movementSetup.playerSchema, {dir: GameConst.UP});
            movementSetup.playerSchema.physicalBody.isBlocked = true;
            await room.executeMovePlayerActions(movementSetup.playerSchema, {act: GameConst.STOP});
            this.assert.deepStrictEqual(room.movementInterval, {});
            this.assert.strictEqual(movementSetup.stopsCount, 1);
        });
    }

    async testPointerMoveNeedsTheTapMovement()
    {
        await this.test('a pointer move walks the body only with the tap movement on and both tile values', async () => {
            let pointerMessage = {act: GameConst.POINTER, column: 3, row: 4};
            let cases = [
                {tapMovement: false, expectedMoves: [], expectedStops: 0},
                {tapMovement: true, expectedMoves: [Object.assign({validated: true}, pointerMessage)], expectedStops: 1}
            ];
            for(let pointerCase of cases){
                let movementSetup = this.createMovementSetup(1000);
                let pointedMoves = [];
                movementSetup.room.config = {get: () => pointerCase.tapMovement};
                movementSetup.room.pointsValidator = {
                    makeValidPoints: (pointData) => Object.assign({validated: true}, pointData)
                };
                movementSetup.playerSchema.physicalBody.moveToPoint = (pointData) => pointedMoves.push(pointData);
                await this.sendMovementMessages(movementSetup.room, movementSetup.playerSchema, [
                    {act: GameConst.POINTER, column: 3},
                    pointerMessage
                ]);
                this.assert.deepStrictEqual(pointedMoves, pointerCase.expectedMoves);
                this.assert.strictEqual(movementSetup.stopsCount, pointerCase.expectedStops);
            }
        });
    }

    createMessagesSetup(playerSchema)
    {
        let messagesSetup = {
            executedMessages: [],
            room: Object.create(RoomScene.prototype, {roomName: {value: 'test-room'}, roomId: {value: 'test-room-id'}})
        };
        messagesSetup.room.playerBySessionIdFromState = () => playerSchema;
        messagesSetup.room.executeSceneMessageActions = async (client, messageData) => {
            messagesSetup.executedMessages.push(messageData);
        };
        messagesSetup.room.executeMovePlayerActions = async () => true;
        messagesSetup.room.executePlayerStatsAction = () => true;
        return messagesSetup;
    }

    async testMovementRejectsInvalidDirection()
    {
        await this.test('the scene movement rejects a direction outside the allowed directions', async () => {
            let movementSetup = this.createMovementSetup(1000);
            let moveResult = await movementSetup.room.executeMovePlayerActions(
                movementSetup.playerSchema,
                {dir: 'invalid'}
            );
            this.assert.strictEqual(moveResult, false);
            this.assert.strictEqual(Object.keys(movementSetup.room.movementInterval).length, 0);
        });
    }

    async testMovementReplacesTheIntervalForTheSameDirection()
    {
        await this.test('the scene movement clears the previous interval for the same direction', async () => {
            let movementSetup = this.createMovementSetup(5);
            let room = movementSetup.room;
            await room.executeMovePlayerActions(movementSetup.playerSchema, {dir: GameConst.UP});
            await room.executeMovePlayerActions(movementSetup.playerSchema, {dir: GameConst.UP});
            this.assert.strictEqual(Object.keys(room.movementInterval).length, 1);
            room.clearMovementIntervals(movementSetup.playerSchema.player_id);
            let movesAfterClear = movementSetup.movedDirections.length;
            await timersPromises.setTimeout(50);
            this.assert.strictEqual(movementSetup.movedDirections.length, movesAfterClear);
        });
    }

    async testSceneIgnoresInvalidMessages()
    {
        await this.test('the scene room ignores non-object messages and non-string actions', async () => {
            let messagesSetup = this.createMessagesSetup({player_id: 7});
            let client = {sessionId: 'session-a'};
            await messagesSetup.room.handleReceivedMessage(client, null);
            await messagesSetup.room.handleReceivedMessage(client, {act: 123});
            this.assert.strictEqual(messagesSetup.executedMessages.length, 0);
            await messagesSetup.room.handleReceivedMessage(client, {dir: GameConst.UP});
            this.assert.strictEqual(messagesSetup.executedMessages.length, 1);
        });
    }

    async testGameRoomIgnoresCreatePlayerWithoutFormData()
    {
        await this.test('the game room ignores a create player message without valid form data', async () => {
            let createdPlayers = [];
            let roomGame = Object.create(RoomGame.prototype);
            roomGame.loginManager = {
                playerCreation: {createNewPlayer: async (formData) => createdPlayers.push(formData)}
            };
            let client = {sessionId: 'session-a', auth: {id: 1}, send: () => true};
            await roomGame.handleReceivedMessage(client, {act: GameConst.CREATE_PLAYER});
            await roomGame.handleReceivedMessage(client, {act: GameConst.CREATE_PLAYER, formData: {}});
            this.assert.strictEqual(createdPlayers.length, 0);
        });
    }

}

module.exports.TestSceneMovementAndMessageGuards = TestSceneMovementAndMessageGuards;
