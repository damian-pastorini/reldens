/**
 *
 * Reldens - Test Rooms Origin Validation
 *
 * Tests the request origin validation of the server-2 game room (exclusive group, the server-2 config values restored
 * by its group reset): with server/rooms/validateRoomsOriginRequest on in server-2, a page loaded from server-1 joins
 * the server-2 game room through a Colyseus client created in the page (the browser sends the server-1 origin); the
 * join is rejected while the server-2 corsOrigin does not list the server-1 origin and accepted once it does. The
 * server-2 game room reads these values when it is created, so it is disposed before every join and after the test.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DirectFormSubmit } = require('./helpers/direct-form-submit');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { E2eServerInstances } = require('./helpers/e2e-server-instances');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestRoomsOriginValidation
{

    static SECOND_SERVER = 'server-2';
    static CORS_ORIGIN_PATH = 'server/appServerConfig/corsOrigin';

    static async joinSecondServerGameRoom(page, gameConfig, secondServerConfig, corsOrigin)
    {
        await E2eSeedAndRestoreApi.overrideConfig(
            secondServerConfig,
            gameConfig.e2eGroup,
            TestRoomsOriginValidation.CORS_ORIGIN_PATH,
            corsOrigin
        );
        await GameplayE2eStateApi.disposeRoom(secondServerConfig, GameConst.ROOM_GAME);
        return await page.evaluate(async (joinData) => {
            let ClientClass = window.reldens.gameClient.roomClient(joinData.roomName).constructor;
            let joinResult = {joined: false, error: ''};
            let joinedRoom = await new ClientClass(joinData.serverUrl).joinOrCreate(joinData.roomName, joinData.userData)
                .catch((error) => {
                    joinResult.error = error.message;
                    return false;
                });
            if(joinedRoom){
                joinResult.joined = true;
                await joinedRoom.leave();
            }
            return joinResult;
        }, {
            serverUrl: secondServerConfig.serverBaseUrl,
            roomName: GameConst.ROOM_GAME,
            userData: {username: gameConfig.e2eUsername, password: gameConfig.e2ePassword}
        });
    }

    static async runOriginTest(page, gameConfig, e2eGroup)
    {
        let secondServerConfig = E2eServerInstances.forServer(gameConfig, TestRoomsOriginValidation.SECOND_SERVER);
        let firstServerOrigin = E2eServerInstances.fetchAllServersUrls()[0];
        await E2eSeedAndRestoreApi.overrideConfig(
            secondServerConfig,
            e2eGroup,
            'server/rooms/validateRoomsOriginRequest',
            true
        );
        await DirectFormSubmit.openPage(page);
        await page.evaluate(() => window.reldens.initializeClient());
        let joinContext = Object.assign({}, gameConfig, {e2eGroup});
        let rejectedJoin = await TestRoomsOriginValidation.joinSecondServerGameRoom(
            page,
            joinContext,
            secondServerConfig,
            ''
        );
        let acceptedJoin = await TestRoomsOriginValidation.joinSecondServerGameRoom(
            page,
            joinContext,
            secondServerConfig,
            firstServerOrigin
        );
        await GameplayE2eStateApi.disposeRoom(secondServerConfig, GameConst.ROOM_GAME);
        expect(
            [rejectedJoin, acceptedJoin.joined],
            'The server-1 page joins the server-2 game room only once the server-2 corsOrigin lists its origin'
        ).toEqual([{joined: false, error: 'Could not connect to the game.'}, true]);
    }

    static run()
    {
        test.describe('Rooms Origin Validation', () => {
            test('a page of another server joins the game room only when the corsOrigin lists its origin', async ({ page, gameConfig, e2eGroup }) => {
                await TestRoomsOriginValidation.runOriginTest(page, gameConfig, e2eGroup);
            });
        });
    }

}

TestRoomsOriginValidation.run();
