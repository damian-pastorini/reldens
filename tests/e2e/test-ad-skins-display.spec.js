/**
 *
 * Reldens - Test Ad Skins Display
 *
 * Tests the skin item avatar on every client (exclusive group, the skin item rewarded by the skin ad seeded in the
 * player inventory, the inventory rows of the group players preserved and restored by the group reset): equipping the
 * skin item stores it as active and switches the player sprite texture on its own client and on the other client in the
 * room, a player joining the room after the equip sees the skin, and the unequip stores it as inactive and restores the
 * class path avatar on every client; the equipped skin is applied again after a new login (the player already in the
 * room sees the player entering with the skin) and after a scene change, and an unequipped one leaves the class path
 * after a new login; a trashed equipped skin item restores the avatar; and
 * walking with the skin plays the skin walk animation.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { SkinSteps } = require('./helpers/skin-steps');
const { TradeSteps } = require('./helpers/trade-steps');
const { TeamSteps } = require('./helpers/team-steps');
const { Login } = require('./helpers/login');
const { ShowcaseSteps } = require('./helpers/showcase-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { TimeConstants } = require('./helpers/time-constants');
const { InventoryConst } = require('../../lib/inventory/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAdSkinsDisplay
{

    static WALK_KEY = 'ArrowRight';

    static async enterWithSkin(context, playersCount)
    {
        let skinPlayer = {skinData: await SkinSteps.loadSkinData(context.gameConfig)};
        skinPlayer.players = await TradeSteps.enterPlayers(context, playersCount, [
            {playerIndex: 0, itemKey: skinPlayer.skinData.rewardItemKey, qty: 1}
        ]);
        let owner = skinPlayer.players[0];
        skinPlayer.classAvatar = (await SkinSteps.fetchSprite(owner.page, owner.playerName)).avatarKey;
        return skinPlayer;
    }

    static async equipSkin(context, skinPlayer, message)
    {
        let owner = skinPlayer.players[0];
        await TradeSteps.sendItemAction(context, owner, InventoryConst.ACTIONS.EQUIP, skinPlayer.skinData.rewardItemKey);
        await SkinSteps.expectSprite(owner.page, owner.playerName, skinPlayer.skinData.skinKey, message);
    }

    static async expectStoredActive(context, skinPlayer, isActive, message)
    {
        await expect.poll(async () => (await E2eSeedAndRestoreApi.loadInventoryRows(
            context.gameConfig,
            skinPlayer.players[0].playerName,
            skinPlayer.skinData.rewardItemKey
        )).map(row => Number(row.is_active)), {message, timeout: TimeConstants.SERVER_RESPONSE}).toEqual([isActive]);
    }

    static async runOtherClientsTest(context)
    {
        let skinPlayer = await TestAdSkinsDisplay.enterWithSkin(context, 2);
        let [owner, viewer] = skinPlayer.players;
        let skinKey = skinPlayer.skinData.skinKey;
        await TestAdSkinsDisplay.equipSkin(context, skinPlayer, 'The own sprite shows the skin');
        await SkinSteps.expectSprite(viewer.page, owner.playerName, skinKey, 'The other client sprite shows the skin');
        await TestAdSkinsDisplay.expectStoredActive(context, skinPlayer, 1, 'The equipped skin item is stored as active');
        let joiningPage = (await Login.startThirdPlayer(context, Login.TOWN_ROOM_NAME)).clientPage;
        await SkinSteps.expectSprite(joiningPage, owner.playerName, skinKey, 'The player joining after the equip sees the skin');
        await TradeSteps.sendItemAction(context, owner, InventoryConst.ACTIONS.EQUIP, skinPlayer.skinData.rewardItemKey);
        for(let clientPage of [owner.page, viewer.page, joiningPage]){
            await SkinSteps.expectSprite(
                clientPage,
                owner.playerName,
                skinPlayer.classAvatar,
                'The unequip restores the class path avatar on every client'
            );
        }
        await TestAdSkinsDisplay.expectStoredActive(context, skinPlayer, 0, 'The unequipped skin item is stored as inactive');
    }

    static async runLoginAndSceneChangeTest(context)
    {
        let gameConfig = context.gameConfig;
        let skinPlayer = await TestAdSkinsDisplay.enterWithSkin(context, 2);
        let [owner, viewer] = skinPlayer.players;
        let skinKey = skinPlayer.skinData.skinKey;
        await TestAdSkinsDisplay.equipSkin(context, skinPlayer, 'The skin is equipped');
        await owner.page.reload();
        await Login.loginRootPlayer(owner.page, gameConfig, context.longRun);
        await SkinSteps.expectSprite(owner.page, owner.playerName, skinKey, 'The skin is applied again after a new login');
        await SkinSteps.expectSprite(
            viewer.page,
            owner.playerName,
            skinKey,
            'The player in the room sees the player entering with the skin'
        );
        expect(
            (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, owner.playerName)).avatarKey,
            'The server avatar is the skin after the new login'
        ).toBe(skinKey);
        await TeamSteps.changeScene(context, {page: owner.page, playerName: owner.playerName});
        await SkinSteps.expectSprite(owner.page, owner.playerName, skinKey, 'The skin is applied again after a scene change');
        await TeamSteps.changeScene(
            context,
            {page: owner.page, playerName: owner.playerName},
            Login.FOREST_ROOM_NAME,
            Login.TOWN_ROOM_NAME
        );
        await SkinSteps.expectSprite(owner.page, owner.playerName, skinKey, 'The skin is kept back in the first room');
        await TradeSteps.sendItemAction(context, owner, InventoryConst.ACTIONS.EQUIP, skinPlayer.skinData.rewardItemKey);
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, owner.playerName)).avatarKey,
            {message: 'The server avatar is restored by the unequip', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(skinPlayer.classAvatar);
        await SkinSteps.expectSprite(owner.page, owner.playerName, skinPlayer.classAvatar, 'The unequip restores the avatar');
        await owner.page.reload();
        await Login.loginRootPlayer(owner.page, gameConfig, context.longRun);
        await SkinSteps.expectSprite(
            owner.page,
            owner.playerName,
            skinPlayer.classAvatar,
            'An unequipped skin leaves the class path avatar after a new login'
        );
    }

    static async runTrashedSkinTest(context)
    {
        let skinPlayer = await TestAdSkinsDisplay.enterWithSkin(context, 1);
        let owner = skinPlayer.players[0];
        await TestAdSkinsDisplay.equipSkin(context, skinPlayer, 'The skin is equipped');
        await TradeSteps.sendItemAction(context, owner, InventoryConst.ACTIONS.REMOVE, skinPlayer.skinData.rewardItemKey);
        await TradeSteps.expectQuantity(context, owner, skinPlayer.skinData.rewardItemKey, 0, 'The skin item is trashed');
        await SkinSteps.expectSprite(
            owner.page,
            owner.playerName,
            skinPlayer.classAvatar,
            'The trashed equipped skin restores the avatar'
        );
        expect(
            (await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.TOWN_ROOM_NAME, owner.playerName)).avatarKey,
            'The server avatar is restored'
        ).toBe(skinPlayer.classAvatar);
    }

    static async runSkinWalkTest(context)
    {
        let skinPlayer = await TestAdSkinsDisplay.enterWithSkin(context, 1);
        let owner = skinPlayer.players[0];
        await ShowcaseSteps.placePlayerOnMapCenter(
            owner.page,
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            owner.playerName,
            context.longRun
        );
        await TestAdSkinsDisplay.equipSkin(context, skinPlayer, 'The skin is equipped');
        await owner.page.keyboard.down(TestAdSkinsDisplay.WALK_KEY);
        await expect.poll(
            async () => (await SkinSteps.fetchSprite(owner.page, owner.playerName)).hasAvatarAnimation,
            {message: 'The walk plays the skin animation', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
        await owner.page.keyboard.up(TestAdSkinsDisplay.WALK_KEY);
    }

    static run()
    {
        test.describe('Ad Skins Display', () => {
            test('equipped skin is seen by the players in the room and by a player joining after, the unequip restores it', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsDisplay.runOtherClientsTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('equipped skin is applied again after a new login and a scene change, an unequipped one is not', async ({ page, secondPage, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsDisplay.runLoginAndSceneChangeTest({page, secondPage, gameConfig, e2eGroup, longRun});
            });
            test('trashed equipped skin item restores the avatar', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsDisplay.runTrashedSkinTest({page, gameConfig, e2eGroup, longRun});
            });
            test('walking with the skin plays the skin walk animation', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestAdSkinsDisplay.runSkinWalkTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestAdSkinsDisplay.run();
