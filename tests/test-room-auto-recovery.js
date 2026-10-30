/**
 *
 * Reldens - Test Room Auto Recovery
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { RoomAutoRecovery } = require('../lib/actions/server/room-auto-recovery');
const { ActionsConst } = require('../lib/actions/constants');
const { ObjectsConst } = require('../lib/objects/constants');
const { GameConst } = require('../lib/game/constants');

class TestRoomAutoRecovery extends BaseTest
{

    createRoom(roomId)
    {
        let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
        let client = GameplayPlayerBuilder.createClient(playerSchema.sessionId);
        let enemy = {
            type: ObjectsConst.TYPE_ENEMY,
            broadcastKey: 'enemy-1',
            stats: {hp: 10},
            initialStats: {hp: 100},
            objectBody: {bodyState: {inState: GameConst.STATUS.ACTIVE}}
        };
        let room = {
            roomId,
            roomName: 'room-'+roomId,
            playersAffectedProperty: 'hp',
            playerSchema,
            enemy,
            config: GameplayPlayerBuilder.createConfig({
                [ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.TICK_MS]: 60000,
                [ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS]: {enabled: true, properties: {hp: 5}},
                [ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS]: {enabled: true, properties: {hp: 5}}
            }),
            objectsManager: {roomObjects: {enemy1: enemy}}
        };
        room.broadcast = () => true;
        room.playersKeysFromState = () => [playerSchema.sessionId];
        room.playerBySessionIdFromState = () => playerSchema;
        room.getClientById = () => client;
        return room;
    }

    createRoomAutoRecovery()
    {
        return new RoomAutoRecovery({events: {emit: async () => true}});
    }

    async testRoomTicksStartAndStop()
    {
        await this.test('every room gets one recovery interval and its stop clears it', async () => {
            let roomAutoRecovery = this.createRoomAutoRecovery();
            let room = this.createRoom('room-a');
            this.assert.strictEqual(roomAutoRecovery.startRoomTicks(room), true);
            this.assert.strictEqual(roomAutoRecovery.startRoomTicks(room), true);
            this.assert.deepStrictEqual(Object.keys(roomAutoRecovery.roomsIntervals), ['room-a']);
            this.assert.strictEqual(roomAutoRecovery.stopRoomTicks('room-a'), true);
            this.assert.deepStrictEqual(Object.keys(roomAutoRecovery.roomsIntervals), []);
            this.assert.strictEqual(roomAutoRecovery.stopRoomTicks('room-a'), false);
        });
    }

    async testTickRecoversTheRoomEnemiesAndPlayers()
    {
        await this.test('a tick recovers the room enemies and players with the configured amounts', async () => {
            let roomAutoRecovery = this.createRoomAutoRecovery();
            let room = this.createRoom('room-a');
            let tickResult = await roomAutoRecovery.runRoomTick(room);
            this.assert.deepStrictEqual(tickResult, {recoveredObjects: 1, recoveredPlayers: 1});
            this.assert.strictEqual(room.enemy.stats.hp, 15);
            this.assert.strictEqual(room.playerSchema.stats.hp, 55);
            this.assert.deepStrictEqual(Object.keys(roomAutoRecovery.runningRooms), []);
        });
    }

    async testTickIsSkippedWhileThePreviousTickRuns()
    {
        await this.test('a tick is skipped while the previous tick of the same room is running', async () => {
            let roomAutoRecovery = this.createRoomAutoRecovery();
            let room = this.createRoom('room-a');
            roomAutoRecovery.runningRooms['room-a'] = true;
            this.assert.strictEqual(await roomAutoRecovery.runRoomTick(room), false);
            this.assert.strictEqual(room.enemy.stats.hp, 10);
            this.assert.strictEqual(room.playerSchema.stats.hp, 50);
        });
    }

    async testFailedTickReleasesTheRoom()
    {
        await this.test('a failed tick returns false and releases the room for the next tick', async () => {
            let roomAutoRecovery = this.createRoomAutoRecovery();
            let room = this.createRoom('room-a');
            room.playersKeysFromState = () => {
                throw new TypeError('Room state not available.');
            };
            this.assert.strictEqual(await roomAutoRecovery.runRoomTick(room), false);
            this.assert.deepStrictEqual(Object.keys(roomAutoRecovery.runningRooms), []);
        });
    }

}

module.exports.TestRoomAutoRecovery = TestRoomAutoRecovery;
