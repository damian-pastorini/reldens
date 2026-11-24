/**
 *
 * Reldens - Test Rooms Server Validation
 *
 * Tests the room server validation of a scene join (exclusive group, the room row and the config value restored by the
 * group reset, which reloads the stored rooms again): the gravity room stored with the server-2 address as its
 * server_url and the stored rooms reloaded like a restart, a join of that room forged on server-1 through the Colyseus
 * client is rejected and creates no instance on server-1 while server/rooms/validateRoomOnServer is on, and with it off
 * the same forged join creates the room instance on server-1. A room stored with server-1 own address is created on
 * server-1, and with a trailing slash too.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { E2eServerInstances } = require('./helpers/e2e-server-instances');
const { GameRoomJoin } = require('./helpers/game-room-join');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { SecurityApi } = require('./helpers/security-api');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRoomsServerValidation
{

    static ROOM_NAME = 'reldens-gravity';
    static SECOND_SERVER = 'server-2';

    static async forgeJoin(gameConfig)
    {
        let joinResult = await GameRoomJoin.join(
            gameConfig,
            {username: gameConfig.e2eUsername, password: gameConfig.e2ePassword},
            GameRoomJoin.IPV4_HOST,
            TestRoomsServerValidation.ROOM_NAME
        );
        return {
            joined: joinResult.joined,
            isCreated: !(await RoomObjectsApi.fetchChangePoints(gameConfig, TestRoomsServerValidation.ROOM_NAME)).error
        };
    }

    static async storeRoomServerUrl(gameConfig, e2eGroup, roomServerUrl)
    {
        await E2eSeedAndRestoreApi.updateWithPreserve(
            gameConfig,
            e2eGroup,
            'rooms',
            {name: TestRoomsServerValidation.ROOM_NAME},
            {server_url: roomServerUrl}
        );
        await SecurityApi.request(gameConfig, 'POST', '/api/e2e/data/reload-rooms', {
            group: e2eGroup,
            roomsNames: [TestRoomsServerValidation.ROOM_NAME]
        });
    }

    static async runForgedJoinTest(context)
    {
        let {gameConfig, e2eGroup} = context;
        let secondServerUrl = E2eServerInstances.fetchServersUrls()[TestRoomsServerValidation.SECOND_SERVER];
        expect(secondServerUrl, 'The run has a second server').toBeTruthy();
        await TestRoomsServerValidation.storeRoomServerUrl(gameConfig, e2eGroup, secondServerUrl);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'server/rooms/validateRoomOnServer', true);
        let validatedJoin = await TestRoomsServerValidation.forgeJoin(gameConfig);
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'server/rooms/validateRoomOnServer', false);
        let unvalidatedJoin = await TestRoomsServerValidation.forgeJoin(gameConfig);
        expect(
            [validatedJoin, unvalidatedJoin.isCreated],
            'The forged join of a server-2 room is rejected with no instance on server-1 only while the validation is on'
        ).toEqual([{joined: false, isCreated: false}, true]);
    }

    static async runOwnUrlJoinTest(context)
    {
        let {gameConfig, e2eGroup} = context;
        let ownServerUrl = E2eServerInstances.fetchAllServersUrls()[0];
        await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, 'server/rooms/validateRoomOnServer', true);
        let joins = [];
        for(let roomServerUrl of [ownServerUrl, ownServerUrl+'/']){
            await TestRoomsServerValidation.storeRoomServerUrl(gameConfig, e2eGroup, roomServerUrl);
            joins.push((await TestRoomsServerValidation.forgeJoin(gameConfig)).isCreated);
        }
        expect(
            joins,
            'A room stored with this server address, with or without a trailing slash, is created on this server'
        ).toEqual([true, true]);
    }

    static run()
    {
        test.describe('Rooms Server Validation', () => {
            test('a room stored with this server address and a trailing slash is created on this server', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestRoomsServerValidation.runOwnUrlJoinTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a forged join of another server room creates no instance while validateRoomOnServer is on and one with it off', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestRoomsServerValidation.runForgedJoinTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestRoomsServerValidation.run();
