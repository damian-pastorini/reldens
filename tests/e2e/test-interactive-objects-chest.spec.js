/**
 *
 * Reldens - Test Interactive Objects Chest
 *
 * Tests the forest treasure chest (e2eChestKey) with the player placed next to it and its quests progress rows preserved
 * for the group (a stored chest row of the player is moved away, so every case starts with the chest not looted):
 * the first open gives one coin, stores the progress row, answers opened and plays the open animation; a second open
 * says it is empty with no coin; after a new login the chest is still looted; a second player loots it and gets its own
 * coin while the first player client gets no dialog; a real click on a looted chest toggles the animation without a
 * message; a real double click sends one interaction; a click out of reach closes with no dialog and a later click in
 * range opens it; a coin that can not be added says it is stuck and stores no row; two messages in one tick give one
 * coin and one row, the second gets no answer; a disabled player gets no answer, coin or row; with the close on out of reach off no close message is sent; and a wrong id, a different act or a
 * click on a page element over the chest get no chest answer.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { TimingMiningSteps } = require('./helpers/timing-mining-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Phaser } = require('./helpers/phaser');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { GameConst } = require('../../lib/game/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestInteractiveObjectsChest
{

    static COIN_KEY = 'coins';
    static FOUND = 'You found a coin!';
    static EMPTY = 'The chest is empty.';
    static STUCK = 'The chest seems stuck...';
    static OPEN_ANIMATION = 'chest_forest_1_open';
    static MOVED_QUEST_KEY = 'e2e-moved-chest-row';
    static OUT_OF_REACH_TILES = [8, 7, 6, 5];
    static CLICK_OFFSET = 6;
    static SETTLE_MS = 1000;

    static async prepareChest(context, gameConfig = context.gameConfig, page = context.page)
    {
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName});
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, context.e2eGroup, 'questsProgress', {player_id: playerId});
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, context.e2eGroup, 'questsProgress', {
            quest_key: gameConfig.e2eChestKey,
            player_id: playerId
        }, {quest_key: TestInteractiveObjectsChest.MOVED_QUEST_KEY});
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2eChestKey,
            TimeConstants.SCENE_LOAD
        );
        expect(placement.reached, 'The player must be placed next to the chest: '+placement.error).toBe(true);
        await RoomMessagesRecorder.start(page);
        return {
            playerId,
            chestKey: placement.bodyKey,
            coinsBefore: await TestInteractiveObjectsChest.fetchCoins(gameConfig)
        };
    }

    static async enterForest(context)
    {
        test.setTimeout(TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION * 2, context.longRun));
        await TimingObjectSession.enterForestWithoutEnemies(context.page, context.gameConfig, context.longRun);
    }

    static async fetchCoins(gameConfig)
    {
        return await E2eSeedAndRestoreApi.fetchInventoryQuantity(gameConfig, gameConfig.e2ePlayerName, TestInteractiveObjectsChest.COIN_KEY);
    }

    static async fetchChestRows(gameConfig, chest)
    {
        return await E2eSeedAndRestoreApi.loadRows(gameConfig, 'questsProgress', {quest_key: chest.chestKey, player_id: chest.playerId});
    }

    static async openChest(page, chest, message = {})
    {
        return await RoomMessagesRecorder.sendObjectMessage(page, chest.chestKey, Object.assign({act: ObjectsConst.OBJECT_INTERACTION}, message));
    }

    static async fetchChestAnswers(page)
    {
        return (await RoomMessagesRecorder.fetchMessages(page, GameConst.UI)).map(message => message.content);
    }

    static async expectAnswer(page, content, message)
    {
        await expect.poll(async () => await TestInteractiveObjectsChest.fetchChestAnswers(page), {message, timeout: TimeConstants.SERVER_RESPONSE})
            .toEqual([content]);
    }

    static async fetchChestClient(page, chestKey)
    {
        return await page.evaluate((key) => {
            let {isOpen, isLooted, pendingOpen, sceneSprite} = window.reldens.getActiveScene().objectsAnimations[key];
            return {isOpen, isLooted, pendingOpen, animation: sceneSprite?.anims?.currentAnim?.key || ''};
        }, chestKey);
    }

    static async runFirstOpenTest(context)
    {
        await TestInteractiveObjectsChest.enterForest(context);
        let chest = await TestInteractiveObjectsChest.prepareChest(context);
        await TestInteractiveObjectsChest.openChest(context.page, chest);
        await TestInteractiveObjectsChest.expectAnswer(context.page, TestInteractiveObjectsChest.FOUND, 'The chest gives a coin');
        expect(await TestInteractiveObjectsChest.fetchCoins(context.gameConfig), 'One coin is stored').toBe(chest.coinsBefore + 1);
        expect((await TestInteractiveObjectsChest.fetchChestRows(context.gameConfig, chest)).length, 'One progress row').toBe(1);
        expect((await RoomMessagesRecorder.fetchMessages(context.page, GameConst.UI)).shift().opened, 'Answered opened').toBe(true);
        await expect.poll(
            async () => await TestInteractiveObjectsChest.fetchChestClient(context.page, chest.chestKey),
            {message: 'The open animation plays', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual({isOpen: true, isLooted: true, pendingOpen: false, animation: TestInteractiveObjectsChest.OPEN_ANIMATION});
        await RoomMessagesRecorder.start(context.page);
        await TestInteractiveObjectsChest.openChest(context.page, chest);
        await TestInteractiveObjectsChest.expectAnswer(context.page, TestInteractiveObjectsChest.EMPTY, 'The second open is empty');
        expect(await TestInteractiveObjectsChest.fetchCoins(context.gameConfig), 'No second coin').toBe(chest.coinsBefore + 1);
    }

    static async runLootedAfterLoginTest(context)
    {
        await TestInteractiveObjectsChest.enterForest(context);
        let chest = await TestInteractiveObjectsChest.prepareChest(context);
        await TestInteractiveObjectsChest.openChest(context.page, chest);
        await TestInteractiveObjectsChest.expectAnswer(context.page, TestInteractiveObjectsChest.FOUND, 'The chest gives a coin');
        await context.page.reload();
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            context.page,
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            chest.chestKey,
            TimeConstants.SCENE_LOAD
        );
        expect(placement.reached, 'The player is placed next to the chest again').toBe(true);
        await RoomMessagesRecorder.start(context.page);
        await TestInteractiveObjectsChest.openChest(context.page, chest);
        await TestInteractiveObjectsChest.expectAnswer(context.page, TestInteractiveObjectsChest.EMPTY, 'The chest stays looted');
    }

    static async runSecondPlayerTest(context)
    {
        await TestInteractiveObjectsChest.enterForest(context);
        let chest = await TestInteractiveObjectsChest.prepareChest(context);
        let secondGameConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, secondGameConfig, context.longRun);
        let secondChest = await TestInteractiveObjectsChest.prepareChest(context, secondGameConfig, context.secondPage);
        await RoomMessagesRecorder.start(context.page);
        await TestInteractiveObjectsChest.openChest(context.page, chest);
        await TestInteractiveObjectsChest.expectAnswer(context.page, TestInteractiveObjectsChest.FOUND, 'The first player loots');
        expect(await TestInteractiveObjectsChest.fetchChestAnswers(context.secondPage), 'The second player gets no dialog').toEqual([]);
        expect((await TestInteractiveObjectsChest.fetchChestClient(context.secondPage, chest.chestKey)).isOpen, 'Closed for the second player')
            .toBe(false);
        await TestInteractiveObjectsChest.openChest(context.secondPage, secondChest);
        await TestInteractiveObjectsChest.expectAnswer(context.secondPage, TestInteractiveObjectsChest.FOUND, 'The second player loots');
        expect(await TestInteractiveObjectsChest.fetchCoins(secondGameConfig), 'The second player coin').toBe(secondChest.coinsBefore + 1);
    }

    static async runRealClicksTest(context)
    {
        await TestInteractiveObjectsChest.enterForest(context);
        let chest = await TestInteractiveObjectsChest.prepareChest(context);
        await TimingMiningSteps.countInteractions(context.gameConfig, context.e2eGroup, chest.chestKey);
        await Phaser.clickObjectAwayFromOwnPlayer(context.page, chest.chestKey, TestInteractiveObjectsChest.CLICK_OFFSET, true);
        await TestInteractiveObjectsChest.expectAnswer(context.page, TestInteractiveObjectsChest.FOUND, 'The double click opens the chest');
        await context.page.waitForTimeout(TestInteractiveObjectsChest.SETTLE_MS);
        expect(await TimingMiningSteps.fetchInteractions(context.gameConfig, chest.chestKey), 'One interaction').toBe(1);
        await Phaser.clickObjectAwayFromOwnPlayer(context.page, chest.chestKey, TestInteractiveObjectsChest.CLICK_OFFSET);
        await context.page.waitForTimeout(TestInteractiveObjectsChest.SETTLE_MS);
        expect(await TimingMiningSteps.fetchInteractions(context.gameConfig, chest.chestKey), 'The looted chest asks nothing').toBe(1);
        expect((await TestInteractiveObjectsChest.fetchChestClient(context.page, chest.chestKey)).isOpen, 'The click closes it')
            .toBe(false);
    }

    static async walkOutOfReach(context, chest)
    {
        let chestState = await TimingObjectSession.fetchTimingState(context.gameConfig, chest.chestKey);
        expect(chestState.interactionArea, 'The chest interaction area is read: '+chestState.error).toBeGreaterThan(0);
        await TimingMiningSteps.walkOutOfArea(context, {rock: chestState}, TestInteractiveObjectsChest.OUT_OF_REACH_TILES);
    }

    static async runOutOfReachTest(context)
    {
        await TestInteractiveObjectsChest.enterForest(context);
        let chest = await TestInteractiveObjectsChest.prepareChest(context);
        await TestInteractiveObjectsChest.walkOutOfReach(context, chest);
        await Phaser.clickObjectAwayFromOwnPlayer(context.page, chest.chestKey, TestInteractiveObjectsChest.CLICK_OFFSET);
        await RoomMessagesRecorder.waitForMessage(context.page, GameConst.CLOSE_UI_ACTION, TimeConstants.SERVER_RESPONSE);
        expect(await TestInteractiveObjectsChest.fetchChestAnswers(context.page), 'No dialog out of reach').toEqual([]);
        await RoomObjectsApi.placePlayerNextToObject(context.page, context.gameConfig, Login.FOREST_ROOM_NAME, chest.chestKey, TimeConstants.SCENE_LOAD);
        await Phaser.clickObjectAwayFromOwnPlayer(context.page, chest.chestKey, TestInteractiveObjectsChest.CLICK_OFFSET);
        await context.page.waitForTimeout(TimeConstants.SERVER_RESPONSE);
    }

    static async runStuckTest(context)
    {
        await TestInteractiveObjectsChest.enterForest(context);
        let chest = await TestInteractiveObjectsChest.prepareChest(context);
        await TimingObjectSession.overrideInventoryMethod(context.gameConfig, context.e2eGroup, 'addItem', {failuresCount: 1, rejects: false});
        await TestInteractiveObjectsChest.openChest(context.page, chest);
        await TestInteractiveObjectsChest.expectAnswer(context.page, TestInteractiveObjectsChest.STUCK, 'The coin add failure says stuck');
        expect(await TestInteractiveObjectsChest.fetchChestRows(context.gameConfig, chest), 'No progress row').toEqual([]);
    }

    static async runSameTickTest(context)
    {
        await TestInteractiveObjectsChest.enterForest(context);
        let chest = await TestInteractiveObjectsChest.prepareChest(context);
        let objectId = await context.page.evaluate((key) => {
            let {key: chestKey, asset_key: assetKey, id} = window.reldens.getActiveScene().objectsAnimations[key];
            return chestKey === assetKey ? id : chestKey;
        }, chest.chestKey);
        await RoomMessagesRecorder.sendMessages(context.page, [
            {act: ObjectsConst.OBJECT_INTERACTION, id: objectId},
            {act: ObjectsConst.OBJECT_INTERACTION, id: objectId}
        ]);
        await context.page.waitForTimeout(TestInteractiveObjectsChest.SETTLE_MS);
        expect(await TestInteractiveObjectsChest.fetchChestAnswers(context.page), 'Only the first message is answered')
            .toEqual([TestInteractiveObjectsChest.FOUND]);
        expect(await TestInteractiveObjectsChest.fetchCoins(context.gameConfig), 'One coin is stored').toBe(chest.coinsBefore + 1);
        expect((await TestInteractiveObjectsChest.fetchChestRows(context.gameConfig, chest)).length, 'One progress row').toBe(1);
    }

    static async runDisabledPlayerTest(context)
    {
        await TestInteractiveObjectsChest.enterForest(context);
        let chest = await TestInteractiveObjectsChest.prepareChest(context);
        await TimingObjectSession.disableForestPlayer(context.gameConfig);
        await TestInteractiveObjectsChest.openChest(context.page, chest);
        await context.page.waitForTimeout(TestInteractiveObjectsChest.SETTLE_MS);
        expect(await TestInteractiveObjectsChest.fetchChestAnswers(context.page), 'The disabled player gets no answer').toEqual([]);
        expect(await TestInteractiveObjectsChest.fetchCoins(context.gameConfig), 'The disabled player gets no coin').toBe(chest.coinsBefore);
        expect(await TestInteractiveObjectsChest.fetchChestRows(context.gameConfig, chest), 'No progress row').toEqual([]);
    }

    static async runNoCloseUiTest(context)
    {
        await TestInteractiveObjectsChest.enterForest(context);
        let chest = await TestInteractiveObjectsChest.prepareChest(context);
        await TimingObjectSession.changeObjectProperty(context.gameConfig, context.e2eGroup, chest.chestKey, 'closeInteractionOnOutOfReach', false);
        await TestInteractiveObjectsChest.walkOutOfReach(context, chest);
        await RoomMessagesRecorder.start(context.page);
        await TestInteractiveObjectsChest.openChest(context.page, chest);
        await context.page.waitForTimeout(TestInteractiveObjectsChest.SETTLE_MS);
        expect(await RoomMessagesRecorder.fetchMessages(context.page, GameConst.CLOSE_UI_ACTION), 'No close message').toEqual([]);
    }

    static async runNoAnswerTest(context)
    {
        await TestInteractiveObjectsChest.enterForest(context);
        let chest = await TestInteractiveObjectsChest.prepareChest(context);
        await RoomMessagesRecorder.sendMessage(context.page, {act: ObjectsConst.OBJECT_INTERACTION, id: 'e2eMissingChest'});
        await TestInteractiveObjectsChest.openChest(context.page, chest, {act: 'e2eOtherAct'});
        await context.page.waitForTimeout(TestInteractiveObjectsChest.SETTLE_MS);
        expect(await TestInteractiveObjectsChest.fetchChestAnswers(context.page), 'No chest answer').toEqual([]);
        expect(await TestInteractiveObjectsChest.fetchCoins(context.gameConfig), 'No coin').toBe(chest.coinsBefore);
    }

    static async runOverlayClickTest(context)
    {
        await TestInteractiveObjectsChest.enterForest(context);
        let chest = await TestInteractiveObjectsChest.prepareChest(context);
        await TimingMiningSteps.countInteractions(context.gameConfig, context.e2eGroup, chest.chestKey);
        expect(
            await Phaser.clickPageElementOverObject(context.page, chest.chestKey, TestInteractiveObjectsChest.CLICK_OFFSET),
            'A page element over the chest is clicked'
        ).toBe(true);
        await context.page.waitForTimeout(TestInteractiveObjectsChest.SETTLE_MS);
        expect(await TimingMiningSteps.fetchInteractions(context.gameConfig, chest.chestKey), 'No interaction is sent').toBe(0);
    }

    static run()
    {
        test.describe('Interactive Objects Chest', () => {
            test('click on a page element over the chest sends nothing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsChest.runOverlayClickTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('first open gives a coin and plays the open animation, the second is empty', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsChest.runFirstOpenTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('chest stays looted after a new login', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsChest.runLootedAfterLoginTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second player loots its own coin and the first client gets no dialog', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsChest.runSecondPlayerTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('real double click opens once and a click on the looted chest asks nothing', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsChest.runRealClicksTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('click out of reach closes with no dialog and a later click opens it', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsChest.runOutOfReachTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('coin add failure says stuck and stores no row', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsChest.runStuckTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two messages in one tick give one coin and one row', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsChest.runSameTickTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('disabled player gets no chest answer, coin or row', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsChest.runDisabledPlayerTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('close on out of reach off sends no close message', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsChest.runNoCloseUiTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('wrong id and different act get no chest answer', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestInteractiveObjectsChest.runNoAnswerTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestInteractiveObjectsChest.run();
