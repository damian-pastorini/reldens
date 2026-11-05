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

    createLoginPlayerRoomState()
    {
        return new PlayerRoomState({
            config: {
                get: (path, defaultValue) => 'client/rooms/selection' === path ? {allowOnLogin: true} : defaultValue
            },
            roomsManager: {
                loginAvailableRooms: [{name: 'forest'}],
                loadRoomByName: async () => ({roomId: 4, returnPointDefault: false}),
                loadRoomById: async (roomId) => ({roomName: 4 === roomId ? 'forest' : 'town'})
            }
        });
    }

    async testTheLoginSelectedSceneReplacesThePlayerStoredState()
    {
        await this.test('the login selected scene replaces the player stored state and sets its scene', async () => {
            let playerRoomState = this.createLoginPlayerRoomState();
            let players = [{related_players_state: {room_id: 1, x: 10, y: 20, dir: GameConst.UP}}];
            playerRoomState.mapPlayerStateRelation(players);
            await playerRoomState.setSceneOnPlayers(players, 'forest');
            this.assert.deepStrictEqual(
                [...players].shift().state,
                {room_id: 4, x: 64, y: 64, dir: GameConst.DOWN, scene: 'forest'}
            );
        });
    }

    async testTheLastLocationKeepsThePlayerStoredState()
    {
        await this.test('the last location keeps the player stored state and sets its scene', async () => {
            let playerRoomState = this.createLoginPlayerRoomState();
            let player = {related_players_state: {room_id: 1, x: 10, y: 20, dir: GameConst.UP}};
            playerRoomState.mapPlayerStateRelation([player]);
            await playerRoomState.setSceneOnPlayers([player], RoomsConst.ROOM_LAST_LOCATION_KEY);
            this.assert.strictEqual(player.state, player.related_players_state);
            this.assert.deepStrictEqual(player.state, {room_id: 1, x: 10, y: 20, dir: GameConst.UP, scene: 'town'});
        });
    }

}

module.exports.TestPlayerRoomState = TestPlayerRoomState;
