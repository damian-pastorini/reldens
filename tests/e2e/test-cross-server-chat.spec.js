/**
 *
 * Reldens - Test Cross Server Chat
 *
 * Tests the chat of players moving between two servers (exclusive group, the second house on server-2 and the town on
 * server-1 set by CrossServerHouseAssignment): the first player logs in on server-1 and crosses into the second house
 * (origin server-1, playing on server-2), the second player plays in the town on server-1 (origin server-1) and the
 * third player is stored in the second house and logs in from a server-2 page (origin server-2, never on server-1).
 * A player on server-2 uses the server-2 chat (the #438 decision): a global message of the moved player is sent with no
 * connection lost modal, reaches the server-2 player and not the server-1 player; back in the town on server-1 its
 * global message is sent with no modal and reaches the server-1 player; a global message of the
 * server-2 player reaches the moved player; private messages between the moved player and the server-2 player, both
 * on server-2, are delivered both ways; private messages between the moved player and the server-1 player are
 * delivered both ways; and with the origin server-1 down (the moved player keeps no open server-1 room, and server-1
 * refuses every signed request of server-2 with another signed tokens secret, since a run can not stop server-1) the
 * room, global and private messages of the moved player reach the server-2 player with no connection lost modal.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { ChatSteps } = require('./helpers/chat-steps');
const { ChangePointsSteps } = require('./helpers/change-points-steps');
const { E2eServerInstances } = require('./helpers/e2e-server-instances');
const { LoginServerApi } = require('./helpers/login-server-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerChat
{

    static HOUSE_OFFSET = 64;
    static COOLDOWN_MS = 1100;

    static async enterChatPlayers(context)
    {
        let {page, secondPage, gameConfig, longRun} = context;
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, longRun) + TimeConstants.ROOM_TRANSITION);
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await CrossServerHouseAssignment.storePlayerInHouse(context, gameConfig.e2ePlayerName3, TestCrossServerChat.HOUSE_OFFSET);
        let secondServerPage = (await Login.openClientPage(page, secondServerConfig)).clientPage;
        await Login.loginRootPlayer(secondServerPage, secondServerConfig, longRun, '3');
        await Navigation.waitForRoom(secondServerPage, CrossServerHouseAssignment.SECOND_HOUSE, TimeConstants.ROOM_TRANSITION);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        await Login.loginRootPlayer(page, gameConfig, longRun);
        await ChatSteps.recordChat(page);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        let chatPages = {mover: page, firstServer: secondPage, secondServer: secondServerPage};
        for(let pageKey of Object.keys(chatPages)){
            await ChatSteps.recordChat(chatPages[pageKey]);
        }
        return chatPages;
    }

    static async expectReceived(chatPage, chatType, text, message)
    {
        await expect.poll(async () => await ChatSteps.fetchTexts(chatPage, chatType), {
            message,
            timeout: TimeConstants.SERVER_RESPONSE
        }).toContain(text);
    }

    static async sendPrivate(fromPage, toPlayerName, text)
    {
        await fromPage.waitForTimeout(TestCrossServerChat.COOLDOWN_MS);
        await ChatSteps.sendText(fromPage, '@'+toPlayerName+' '+text);
    }

    static async sendGlobalConnected(chatPage, text, message)
    {
        await ChatSteps.sendText(chatPage, '#'+text);
        await chatPage.waitForTimeout(CrossServerHouseAssignment.QUIET_MS);
        await expect(chatPage.locator(Selectors.reloadModal.container), message).toBeHidden();
    }

    static async runReturnedGlobalTest(context)
    {
        let chatPages = await TestCrossServerChat.enterChatPlayers(context);
        let topology = await ChangePointsSteps.loadTopology(context.gameConfig);
        await ChangePointsSteps.changeRoom(
            Object.assign({}, context, {
                gameConfig: E2eServerInstances.forServer(context.gameConfig, CrossServerHouseAssignment.SECOND_SERVER)
            }),
            {page: chatPages.mover, playerName: context.gameConfig.e2ePlayerName},
            topology,
            ChangePointsSteps.buildRoundTrips(topology, Login.TOWN_ROOM_NAME, CrossServerHouseAssignment.SECOND_HOUSE)[1]
        );
        await ChatSteps.recordChat(chatPages.mover);
        let text = 'e2e-returned-global-'+Date.now();
        await TestCrossServerChat.sendGlobalConnected(
            chatPages.mover,
            text,
            'The global chat of the player back on server-1 is still connected'
        );
        await TestCrossServerChat.expectReceived(
            chatPages.firstServer,
            ChatConst.TYPES.GLOBAL,
            text,
            'The server-1 player gets the global message of the player back on server-1'
        );
    }

    static async runMoverGlobalTest(context)
    {
        let chatPages = await TestCrossServerChat.enterChatPlayers(context);
        let text = 'e2e-moved-global-'+Date.now();
        await TestCrossServerChat.sendGlobalConnected(
            chatPages.mover,
            text,
            'The global chat of the player that moved to server-2 is still connected'
        );
        await TestCrossServerChat.expectReceived(
            chatPages.secondServer,
            ChatConst.TYPES.GLOBAL,
            text,
            'The server-2 player gets the global message of the player that moved to server-2'
        );
        expect(
            await ChatSteps.fetchTexts(chatPages.firstServer, ChatConst.TYPES.GLOBAL),
            'The server-1 player does not get the global message sent on the server-2 chat'
        ).not.toContain(text);
    }

    static async runSecondServerGlobalTest(context)
    {
        let chatPages = await TestCrossServerChat.enterChatPlayers(context);
        let text = 'e2e-second-server-global-'+Date.now();
        await ChatSteps.sendText(chatPages.secondServer, '#'+text);
        await TestCrossServerChat.expectReceived(
            chatPages.mover,
            ChatConst.TYPES.GLOBAL,
            text,
            'The player that moved to server-2 gets the global message of the server-2 player'
        );
    }

    static async runPrivatePairTest(context, otherPageKey, otherPlayerName)
    {
        let chatPages = await TestCrossServerChat.enterChatPlayers(context);
        let toMoverText = 'e2e-to-moved-'+Date.now();
        await TestCrossServerChat.sendPrivate(chatPages[otherPageKey], context.gameConfig.e2ePlayerName, toMoverText);
        await TestCrossServerChat.expectReceived(
            chatPages.mover,
            ChatConst.TYPES.PRIVATE,
            toMoverText,
            'The player that moved to server-2 gets the private message of '+otherPlayerName
        );
        let answerText = 'e2e-from-moved-'+Date.now();
        await TestCrossServerChat.sendPrivate(chatPages.mover, otherPlayerName, answerText);
        await TestCrossServerChat.expectReceived(
            chatPages[otherPageKey],
            ChatConst.TYPES.PRIVATE,
            answerText,
            otherPlayerName+' gets the private answer of the player that moved to server-2'
        );
    }

    static async runOriginServerDownTest(context)
    {
        let chatPages = await TestCrossServerChat.enterChatPlayers(context);
        expect(
            await chatPages.mover.evaluate(() => {
                let joinedRooms = window.reldens.joinedRooms;
                return [window.reldens.gameRoom, ...Object.keys(joinedRooms).map(roomKey => joinedRooms[roomKey])]
                    .filter(room => room?.connection?.isOpen).length;
            }),
            'The moved player keeps no open room of server-1'
        ).toBe(0);
        await LoginServerApi.setSignedTokensSecret(context.gameConfig, true);
        let roomText = 'e2e-origin-down-room-'+Date.now();
        await ChatSteps.sendText(chatPages.mover, roomText);
        await TestCrossServerChat.expectReceived(
            chatPages.secondServer,
            ChatConst.TYPES.MESSAGE,
            roomText,
            'The room message of the moved player reaches the server-2 player while server-1 is down'
        );
        let globalText = 'e2e-origin-down-global-'+Date.now();
        await chatPages.mover.waitForTimeout(TestCrossServerChat.COOLDOWN_MS);
        await TestCrossServerChat.sendGlobalConnected(chatPages.mover, globalText, 'No connection lost modal');
        await TestCrossServerChat.expectReceived(
            chatPages.secondServer,
            ChatConst.TYPES.GLOBAL,
            globalText,
            'The global message of the moved player reaches the server-2 player while server-1 is down'
        );
        let privateText = 'e2e-origin-down-private-'+Date.now();
        await TestCrossServerChat.sendPrivate(chatPages.mover, context.gameConfig.e2ePlayerName3, privateText);
        await TestCrossServerChat.expectReceived(
            chatPages.secondServer,
            ChatConst.TYPES.PRIVATE,
            privateText,
            'The private message of the moved player reaches the server-2 player while server-1 is down'
        );
        await expect(chatPages.mover.locator(Selectors.reloadModal.container), 'No connection lost modal').toBeHidden();
    }

    static run()
    {
        test.describe('Cross Server Chat', () => {
            test('a global message of a player moved to server-2 goes through the server-2 chat', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerChat.runMoverGlobalTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a player back on server-1 after a move to server-2 sends global messages through the server-1 chat', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerChat.runReturnedGlobalTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('a global message of a server-2 player reaches the player that moved to server-2', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerChat.runSecondServerGlobalTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('private messages between a moved player and a server-2 player are delivered both ways', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerChat.runPrivatePairTest(
                    {page, secondPage, gameConfig, e2eGroup, longRun},
                    'secondServer',
                    gameConfig.e2ePlayerName3
                );
            });
            test('private messages between a moved player and a server-1 player are delivered both ways', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerChat.runPrivatePairTest(
                    {page, secondPage, gameConfig, e2eGroup, longRun},
                    'firstServer',
                    gameConfig.e2ePlayerName2
                );
            });
            test('a player moved to server-2 keeps its room, global and private messages while server-1 is down', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerChat.runOriginServerDownTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerChat.run();
