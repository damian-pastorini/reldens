/**
 *
 * Reldens - Test Cross Server Room Urls
 *
 * Tests how the client matches the server_url of a room against its own server (exclusive group, the first house stored
 * with a server_url written in another form and reloaded on both servers by CrossServerHouseAssignment, the player
 * logged in the town on server-1 and walking into the first house): the server-1 address with a trailing slash, an
 * uppercase host or the ws scheme is the current server, so no second game room is joined and the player arrives in
 * the house with no modal; the server-1 address with the 127.0.0.1 host alias is not resolved as the current server
 * (#425, a server serves only the rooms named by its own address), so the move is refused with the reconnect error
 * modal; the chat room and the forest
 * (stored with no server_url, mapped to the server-1 address) are joined on the host of the client's own server with
 * no second game room; and an unparsable server_url
 * makes the join fail with the reconnect error modal.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { E2eServerInstances } = require('./helpers/e2e-server-instances');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerRoomUrls
{

    static FIRST_HOUSE = 'reldens-house-1';
    static UNPARSABLE_URL = 'e2e not a server url';
    static READ_GAME_ROOMS_URLS = () => Object.keys(window.reldens.gameClient.gameRoomsByServer);
    static CURRENT_SERVER_FORMS = {
        'a trailing slash': serverUrl => serverUrl+'/',
        'an uppercase host': serverUrl => serverUrl.replace('//localhost', '//LOCALHOST'),
        'the ws scheme': serverUrl => serverUrl.replace(/^http/, 'ws')
    };

    static async enterWithHouseUrl(context, houseServerUrl)
    {
        await CrossServerHouseAssignment.assignRoomsServersUrls(context, {
            [TestCrossServerRoomUrls.FIRST_HOUSE]: houseServerUrl,
            [Login.TOWN_ROOM_NAME]: E2eServerInstances.fetchAllServersUrls()[0]
        });
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
    }

    static async expectHouseArrival(context, expectedGameRoomsUrls, message)
    {
        let page = context.page;
        await CrossServerHouseAssignment.walkFromTown(context, TestCrossServerRoomUrls.FIRST_HOUSE);
        await page.waitForTimeout(CrossServerHouseAssignment.QUIET_MS);
        expect(
            {
                gameRoomsUrls: await page.evaluate(TestCrossServerRoomUrls.READ_GAME_ROOMS_URLS),
                hasModal: await page.locator(Selectors.reloadModal.container).isVisible()
            },
            message
        ).toEqual({gameRoomsUrls: expectedGameRoomsUrls, hasModal: false});
    }

    static async runCurrentServerFormTest(context, formKey)
    {
        await TestCrossServerRoomUrls.enterWithHouseUrl(
            context,
            TestCrossServerRoomUrls.CURRENT_SERVER_FORMS[formKey](E2eServerInstances.fetchAllServersUrls()[0])
        );
        await TestCrossServerRoomUrls.expectHouseArrival(
            context,
            [],
            'The server-1 address with '+formKey+' is the current server: no second game room, no modal'
        );
    }

    static async runHostAliasTest(context)
    {
        await TestCrossServerRoomUrls.expectRefusedHouse(
            context,
            E2eServerInstances.fetchAllServersUrls()[0].replace('//localhost', '//127.0.0.1'),
            'A room named by a host alias of the current server is not served there: the reconnect error modal'
        );
    }

    static async expectRefusedHouse(context, houseServerUrl, message)
    {
        await TestCrossServerRoomUrls.enterWithHouseUrl(context, houseServerUrl);
        await CrossServerHouseAssignment.expectRefusedMove(
            context,
            TestCrossServerRoomUrls.FIRST_HOUSE,
            message,
            TimeConstants.ROOM_TRANSITION
        );
    }

    static async runOwnServerRoomsTest(context)
    {
        let {page, gameConfig, longRun} = context;
        await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginAndEnterForest(page, gameConfig, longRun);
        let clientRooms = await page.evaluate((roomsNames) => {
            let gameClient = window.reldens.gameClient;
            return {
                serverUrl: new URL(gameClient.serverUrl).host,
                chatUrl: new URL(gameClient.roomsUrls[roomsNames.chat]).host,
                forestUrl: new URL(gameClient.roomsUrls[roomsNames.forest]).host,
                gameRoomsUrls: Object.keys(gameClient.gameRoomsByServer)
            };
        }, {chat: ChatConst.CHAT_GLOBAL, forest: Login.FOREST_ROOM_NAME});
        expect(
            clientRooms,
            'The chat room and the forest are joined on the host of the own server, no second game room'
        ).toEqual({
            serverUrl: clientRooms.serverUrl,
            chatUrl: clientRooms.serverUrl,
            forestUrl: clientRooms.serverUrl,
            gameRoomsUrls: []
        });
    }

    static async runUnparsableUrlTest(context)
    {
        await TestCrossServerRoomUrls.expectRefusedHouse(
            context,
            TestCrossServerRoomUrls.UNPARSABLE_URL,
            'A room with an unparsable server_url fails the join with the reconnect error modal'
        );
    }

    static run()
    {
        test.describe('Cross Server Room Urls', () => {
            for(let formKey of Object.keys(TestCrossServerRoomUrls.CURRENT_SERVER_FORMS)){
                test('a room server_url naming the current server with '+formKey+' joins no second game room', async ({ page, gameConfig, e2eGroup, longRun }) => {
                    await TestCrossServerRoomUrls.runCurrentServerFormTest({page, gameConfig, e2eGroup, longRun}, formKey);
                });
            }
            test('a room server_url with another host alias of the current server is refused with the reconnect error modal', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerRoomUrls.runHostAliasTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the chat room and a room stored with no server_url are joined on the own server', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerRoomUrls.runOwnServerRoomsTest({page, gameConfig, e2eGroup, longRun});
            });
            test('a room with an unparsable server_url fails the join with the reconnect error modal', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerRoomUrls.runUnparsableUrlTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerRoomUrls.run();
