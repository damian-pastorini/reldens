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
        let movementSetup = {movedDirections: [], room: Object.create(RoomScene.prototype)};
        movementSetup.room.movementInterval = {};
        movementSetup.room.config = {get: () => false};
        movementSetup.playerSchema = {
            player_id: 7,
            isDeath: () => false,
            isDisabled: () => false,
            physicalBody: {
                isChangingScene: false,
                isBlocked: false,
                world: {timeStep},
                initMove: (direction) => movementSetup.movedDirections.push(direction),
                stopMove: () => true
            }
        };
        return movementSetup;
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
            roomGame.loginManager = {createNewPlayer: async (formData) => createdPlayers.push(formData)};
            let client = {sessionId: 'session-a', auth: {id: 1}, send: () => true};
            await roomGame.handleReceivedMessage(client, {act: GameConst.CREATE_PLAYER});
            await roomGame.handleReceivedMessage(client, {act: GameConst.CREATE_PLAYER, formData: {}});
            this.assert.strictEqual(createdPlayers.length, 0);
        });
    }

}

module.exports.TestSceneMovementAndMessageGuards = TestSceneMovementAndMessageGuards;
