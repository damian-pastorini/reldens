/**
 *
 * Reldens - Test Chat Scenes
 *
 * Tests the chat between group players in different scenes (ChatSteps, the messages each client receives recorded from
 * the scene room and the global chat room): a room message does not reach a player in another scene; a private message
 * reaches a recipient in another scene through the global chat room; a global message reaches a client in the same
 * scene and one in another scene and is also shown in the general tab; and after a scene change (the player placed on
 * the change point of its room) the player is announced to the new scene players, still gets each global and private
 * message once and no longer gets the old room messages.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ChatSteps } = require('./helpers/chat-steps');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ChatConst } = require('../../lib/chat/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestChatScenes
{

    static COOLDOWN_MS = 1100;
    static SETTLE_MS = 1500;

    static async enterTwoScenes(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, context.longRun));
        await Login.startConfigPlayer(context.page, context.gameConfig, context.longRun, Login.TOWN_ROOM_NAME);
        await Login.startConfigPlayer(context.secondPage, Login.fetchSecondPlayerConfig(context.gameConfig), context.longRun, Login.FOREST_ROOM_NAME);
        await ChatSteps.recordChat(context.page);
        await ChatSteps.recordChat(context.secondPage);
    }

    static async runOtherSceneRoomMessageTest(context)
    {
        await TestChatScenes.enterTwoScenes(context);
        let text = 'e2e-other-scene-'+Date.now();
        await ChatSteps.sendText(context.page, text);
        await expect.poll(async () => await ChatSteps.fetchTexts(context.page, ChatConst.TYPES.MESSAGE), {timeout: TimeConstants.SERVER_RESPONSE})
            .toEqual([text]);
        await context.secondPage.waitForTimeout(TestChatScenes.SETTLE_MS);
        expect(await ChatSteps.fetchTexts(context.secondPage, ChatConst.TYPES.MESSAGE), 'Another scene gets nothing').toEqual([]);
    }

    static async runOtherScenePrivateTest(context)
    {
        await TestChatScenes.enterTwoScenes(context);
        let text = 'e2e-other-scene-private-'+Date.now();
        await ChatSteps.sendText(context.page, '@'+context.gameConfig.e2ePlayerName2+' '+text);
        await expect.poll(
            async () => (await ChatSteps.fetchChat(context.secondPage)).map(message => [message.room, message[ChatConst.MESSAGE.KEY].trim()]),
            {message: 'The recipient in another scene gets it from the chat room', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([[ChatSteps.CHAT_ROOM, text]]);
    }

    static async runGlobalEveryClientTest(context)
    {
        await TestChatScenes.enterTwoScenes(context);
        let thirdClient = await Login.openClientPage(context.page, context.gameConfig);
        await Login.loginRootPlayer(thirdClient.clientPage, context.gameConfig, context.longRun, '3');
        await ChatSteps.recordChat(thirdClient.clientPage);
        let text = 'e2e-global-'+Date.now();
        await ChatSteps.sendText(context.page, '#'+text);
        for(let page of [context.page, context.secondPage, thirdClient.clientPage]){
            await expect.poll(async () => await ChatSteps.fetchTexts(page, ChatConst.TYPES.GLOBAL), {timeout: TimeConstants.SERVER_RESPONSE})
                .toEqual([text]);
        }
        await ChatSteps.openChat(context.secondPage);
        await expect(context.secondPage.locator(Selectors.chat.tabContentGeneral), 'Also shown in the general tab').toContainText(text);
        await expect(context.secondPage.locator(Selectors.chat.tabContentGlobal), 'Shown in the global tab').toContainText(text);
        await thirdClient.clientContext.close();
    }

    static async runSceneChangeTest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START * 4, context.longRun));
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.startConfigPlayer(context.page, context.gameConfig, context.longRun, Login.TOWN_ROOM_NAME);
        await Login.startConfigPlayer(context.secondPage, secondGameConfig, context.longRun, Login.FOREST_ROOM_NAME);
        let thirdClient = await Login.openClientPage(context.page, context.gameConfig);
        await Login.loginAndStartGame(
            thirdClient.clientPage,
            context.gameConfig.e2eUsername3,
            context.gameConfig.e2ePassword3 || context.gameConfig.e2ePassword,
            context.gameConfig.e2ePlayerName3,
            context.longRun,
            false,
            Login.TOWN_ROOM_NAME
        );
        await ChatSteps.recordChat(thirdClient.clientPage);
        let placed = await RoomObjectsApi.placePlayerOnChangePoint(context.secondPage, secondGameConfig, Login.FOREST_ROOM_NAME, Login.TOWN_ROOM_NAME);
        expect(placed.position, 'The second player is placed on the change point to the town: '+placed.error).toBeTruthy();
        await Navigation.waitForRoom(context.secondPage, Login.TOWN_ROOM_NAME, TimeConstants.ROOM_TRANSITION);
        await expect.poll(async () => await ChatSteps.fetchTexts(thirdClient.clientPage, ChatConst.TYPES.SYSTEM), {
            message: 'The town players see the joined line',
            timeout: TimeConstants.SERVER_RESPONSE
        }).toEqual([ChatConst.SNIPPETS.JOINED_ROOM]);
        await ChatSteps.recordChat(context.secondPage);
        let text = 'e2e-after-change-'+Date.now();
        await ChatSteps.sendText(thirdClient.clientPage, '#'+text);
        await thirdClient.clientPage.waitForTimeout(TestChatScenes.COOLDOWN_MS);
        await ChatSteps.sendText(thirdClient.clientPage, '@'+secondGameConfig.e2ePlayerName+' '+text);
        await context.page.waitForTimeout(TestChatScenes.COOLDOWN_MS);
        await Login.startConfigPlayer(context.page, context.gameConfig, context.longRun, Login.FOREST_ROOM_NAME);
        await ChatSteps.sendText(context.page, text+'-old-room');
        await context.secondPage.waitForTimeout(TestChatScenes.SETTLE_MS);
        expect(await ChatSteps.fetchTexts(context.secondPage).then(texts => texts.filter(found => -1 !== found.indexOf(text))), 'Each message once and no old room message')
            .toEqual([text, text]);
        await thirdClient.clientContext.close();
    }

    static run()
    {
        test.describe('Chat Scenes', () => {
            test('room message does not reach another scene', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatScenes.runOtherSceneRoomMessageTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('private message reaches another scene through the chat room', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatScenes.runOtherScenePrivateTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('global message reaches every scene and the general tab', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatScenes.runGlobalEveryClientTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('scene change announces the player and keeps global and private once', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestChatScenes.runSceneChangeTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestChatScenes.run();
