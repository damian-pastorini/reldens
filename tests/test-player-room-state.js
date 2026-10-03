/**
 *
 * Reldens - Test Player Room State
 *
 */

const { BaseTest } = require('./base-test');
const { PlayerRoomState } = require('../lib/game/server/player-room-state');
const { RoomsConst } = require('../lib/rooms/constants');
const { GameConst } = require('../lib/game/constants');

class TestPlayerRoomState extends BaseTest
{

    createPlayerRoomState(loadedRoom)
    {
        return new PlayerRoomState({
            config: {get: (path, defaultValue) => defaultValue},
            roomsManager: {loadRoomById: async () => loadedRoom}
        });
    }

    async testTheStateIsPlacedOnTheRoomDefaultReturnPoint()
    {
        await this.test('the player state is placed on the room default return point', async () => {
            let playerRoomState = this.createPlayerRoomState(false);
            let returnPointDefault = {
                [RoomsConst.RETURN_POINT_KEYS.X]: 100,
                [RoomsConst.RETURN_POINT_KEYS.Y]: 200,
                [RoomsConst.RETURN_POINT_KEYS.DIRECTION]: GameConst.UP
            };
            this.assert.deepStrictEqual(
                playerRoomState.getStateObjectFromRoom({roomId: 3, returnPointDefault}),
                {room_id: 3, x: 100, y: 200, dir: GameConst.UP}
            );
        });
    }

    async testTheStateUsesTheDefaultPositionWithoutAReturnPoint()
    {
        await this.test('the player state uses the default position when the room has no return point', async () => {
            let playerRoomState = this.createPlayerRoomState(false);
            this.assert.deepStrictEqual(
                playerRoomState.getStateObjectFromRoom({roomId: 5, returnPointDefault: false}),
                {room_id: 5, x: 64, y: 64, dir: GameConst.DOWN}
            );
        });
    }

    async testTheRoomNameFallsBackToTheMapName()
    {
        await this.test('the room name is the loaded room name or the map name when the room is missing', async () => {
            let loadedRoomState = this.createPlayerRoomState({roomName: 'forest'});
            let missingRoomState = this.createPlayerRoomState(false);
            this.assert.strictEqual(await loadedRoomState.getRoomNameById(2), 'forest');
            this.assert.strictEqual(await missingRoomState.getRoomNameById(99), GameConst.ROOM_NAME_MAP);
        });
    }

}

module.exports.TestPlayerRoomState = TestPlayerRoomState;
