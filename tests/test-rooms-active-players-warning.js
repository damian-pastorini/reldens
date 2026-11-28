/**
 *
 * Reldens - Test Rooms Active Players Warning
 *
 */

const { BaseTest } = require('./base-test');
const { RoomsActivePlayersWarning } = require('../lib/admin/server/rooms-active-players-warning');
const { RoomsAvailability } = require('../lib/game/server/health/rooms-availability');
const { sc } = require('@reldens/utils');

class TestRoomsActivePlayersWarning extends BaseTest
{

    createWarning(localPlayersByRoomId, otherServersRoomsUsage)
    {
        let roomsAvailability = Object.create(RoomsAvailability.prototype);
        roomsAvailability.fetchOtherServersRoomsUsage = async () => otherServersRoomsUsage;
        return new RoomsActivePlayersWarning({
            config: {getWithoutLogs: (path, defaultValue) => defaultValue},
            roomsManager: {
                findRoomInstanceById: (roomId) => sc.hasOwn(localPlayersByRoomId, roomId)
                    ? {playersCountInState: () => localPlayersByRoomId[roomId]}
                    : false
            },
            roomsAvailability
        });
    }

    async testTheRoomPlayersAddTheOtherServersPlayersOfThatRoom()
    {
        await this.test('the room players count adds this server instance and the other servers players of that room', async () => {
            let otherServersRoomsUsage = [{playersByStoredRoomId: {'4': 3, '5': 1}}, {playersByStoredRoomId: {'4': 2}}, {}];
            let counts = [];
            for(let roomId of [4, 5, 6]){
                counts.push(await this.createWarning({4: 1}, otherServersRoomsUsage).countRoomPlayers(roomId));
            }
            counts.push(await this.createWarning({4: 1}, []).countRoomPlayers(4));
            counts.push(await this.createWarning({}, []).countRoomPlayers(4));
            this.assert.deepStrictEqual(counts, [6, 1, 0, 1, 0]);
        });
    }

}

module.exports.TestRoomsActivePlayersWarning = TestRoomsActivePlayersWarning;
