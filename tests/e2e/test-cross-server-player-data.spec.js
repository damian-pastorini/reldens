/**
 *
 * Reldens - Test Cross Server Player Data
 *
 * Tests the player data kept when a player moves to a room of another server (exclusive group, the second house on
 * server-2 and the town on server-1 set by CrossServerHouseAssignment): the stats (lowered on server-1), base stats,
 * level and experience on server-2 are the ones server-1 had when the player left; the inventory rows and the equipped
 * items are the same on server-2; and the tracked quest keys (a seeded quest row of the player, removed by the group
 * reset) are listed again by the client once it arrived on server-2; and the active reward events of the rewards
 * update requested on server-2 are the ones server-1 sent; and a skin equipped on server-1 (the skin item seeded for the
 * player, restored by the group reset) is shown on the own client and on a house observer once on server-2; and an
 * equipped growing item grown to the second level on server-1 keeps its level and experience on server-2, where the
 * experience added to the player is added to the item once.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CrossServerHouseAssignment } = require('./helpers/cross-server-house-assignment');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { ItemGrowthChecks } = require('./helpers/item-growth-checks');
const { RewardsSteps } = require('./helpers/rewards-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { SkinSteps } = require('./helpers/skin-steps');
const { TradeSteps } = require('./helpers/trade-steps');
const { InventoryConst } = require('../../lib/inventory/constants');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCrossServerPlayerData
{

    static LOWERED_HP = 7;
    static LOWERED_MP = 3;
    static QUEST_KEY = 'e2e-quest-cross-server';
    static OBSERVER_OFFSET = 64;
    static GROWTH_LEVEL = 2;
    static SMALL_EXPERIENCE = 5;
    static READ_QUEST_KEYS = (questKey) => (window.reldens?.playerQuestsData || []).filter(key => questKey === key);

    static async enterTown(context)
    {
        let secondServerConfig = await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        return secondServerConfig;
    }

    static async runStatsKeptTest(context)
    {
        let gameConfig = context.gameConfig;
        let playerName = gameConfig.e2ePlayerName;
        let secondServerConfig = await TestCrossServerPlayerData.enterTown(context);
        let joined = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        let lowered = {
            hp: joined.stats.hp - TestCrossServerPlayerData.LOWERED_HP,
            mp: joined.stats.mp - TestCrossServerPlayerData.LOWERED_MP
        };
        await GameplayE2eStateApi.setPlayerStats(gameConfig, Login.TOWN_ROOM_NAME, playerName, lowered);
        let leaving = await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.TOWN_ROOM_NAME, playerName);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        let arrived = await GameplayE2eStateApi.fetchPlayer(
            secondServerConfig,
            CrossServerHouseAssignment.SECOND_HOUSE,
            playerName
        );
        expect(
            [arrived.stats, arrived.statsBase, arrived.level, arrived.experience],
            'The stats, base stats, level and experience on server-2 are the ones server-1 had when the player left: '
                +arrived.error
        ).toEqual([Object.assign({}, leaving.stats, lowered), leaving.statsBase, leaving.level, leaving.experience]);
    }

    static async fetchMappedItems(gameConfig, playerName, roomName)
    {
        return (await ItemGrowthSteps.fetchItems(gameConfig, playerName, roomName)).map(
            item => [item.inventoryId, item.key, item.equipped]
        ).sort((itemA, itemB) => String(itemA[0]).localeCompare(String(itemB[0])));
    }

    static async runInventoryKeptTest(context)
    {
        let gameConfig = context.gameConfig;
        let playerName = gameConfig.e2ePlayerName;
        let secondServerConfig = await TestCrossServerPlayerData.enterTown(context);
        let townItems = await TestCrossServerPlayerData.fetchMappedItems(gameConfig, playerName, Login.TOWN_ROOM_NAME);
        expect(townItems.length, 'The player carries items on server-1').toBeGreaterThan(0);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        expect(
            await TestCrossServerPlayerData.fetchMappedItems(
                secondServerConfig,
                playerName,
                CrossServerHouseAssignment.SECOND_HOUSE
            ),
            'The inventory items and the equipped ones on server-2 are the ones the player had on server-1'
        ).toEqual(townItems);
    }

    static async expectQuestListed(page, message)
    {
        await expect.poll(
            async () => page.evaluate(TestCrossServerPlayerData.READ_QUEST_KEYS, TestCrossServerPlayerData.QUEST_KEY),
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([TestCrossServerPlayerData.QUEST_KEY]);
    }

    static async runQuestsKeptTest(context)
    {
        let {page, gameConfig, e2eGroup} = context;
        await E2eSeedAndRestoreApi.createRow(gameConfig, e2eGroup, 'questsProgress', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName}),
            quest_key: TestCrossServerPlayerData.QUEST_KEY
        });
        await TestCrossServerPlayerData.enterTown(context);
        await TestCrossServerPlayerData.expectQuestListed(page, 'The tracked quest is listed on server-1');
        await page.evaluate(() => {
            window.reldens.playerQuestsData = [];
        });
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        await TestCrossServerPlayerData.expectQuestListed(page, 'The tracked quest is listed again by server-2');
    }

    static async fetchRewardsUpdateIds(page)
    {
        await RoomMessagesRecorder.start(page);
        return await RewardsSteps.requestUpdateIds({page});
    }

    static async runRewardsKeptTest(context)
    {
        let page = context.page;
        await TestCrossServerPlayerData.enterTown(context);
        let townRewardsIds = await TestCrossServerPlayerData.fetchRewardsUpdateIds(page);
        expect(townRewardsIds.length, 'Server-1 sends active reward events').toBeGreaterThan(0);
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        expect(
            await TestCrossServerPlayerData.fetchRewardsUpdateIds(page),
            'Server-2 sends the same active reward events once the player arrived'
        ).toEqual(townRewardsIds);
    }

    static async runSkinKeptTest(context)
    {
        let {page, gameConfig, e2eGroup} = context;
        let player = {page, playerName: gameConfig.e2ePlayerName};
        let skinData = await SkinSteps.loadSkinData(gameConfig);
        await E2eSeedAndRestoreApi.preserveRows(gameConfig, e2eGroup, 'itemsInventory', {
            owner_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: player.playerName})
        });
        await E2eSeedAndRestoreApi.seedInventoryItem(gameConfig, e2eGroup, player.playerName, skinData.rewardItemKey, 1);
        await CrossServerHouseAssignment.assignHouseToSecondServer(context);
        let houseObserver = await CrossServerHouseAssignment.loginHouseObserver(
            context,
            TestCrossServerPlayerData.OBSERVER_OFFSET
        );
        await Login.loginRootPlayer(page, gameConfig, context.longRun);
        await TradeSteps.sendItemAction(context, player, InventoryConst.ACTIONS.EQUIP, skinData.rewardItemKey);
        await SkinSteps.expectSprite(page, player.playerName, skinData.skinKey, 'The skin is equipped on server-1');
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        await SkinSteps.expectSprite(page, player.playerName, skinData.skinKey, 'The own client shows the skin on server-2');
        await SkinSteps.expectSprite(
            houseObserver,
            player.playerName,
            skinData.skinKey,
            'The other client in the server-2 room shows the skin'
        );
    }

    static async runGrowthKeptTest(context)
    {
        let {page, gameConfig} = context;
        let playerName = gameConfig.e2ePlayerName;
        let threshold = ItemGrowthChecks.levelThreshold(
            (await ItemGrowthSteps.loadGrowingItemData(gameConfig)).growth,
            TestCrossServerPlayerData.GROWTH_LEVEL
        );
        await ItemGrowthSteps.seedGrowingItem(context);
        let secondServerConfig = await TestCrossServerPlayerData.enterTown(context);
        await ItemGrowthSteps.toggleEquip(
            page,
            gameConfig,
            await ItemGrowthSteps.fetchGrowingItem(gameConfig, playerName, Login.TOWN_ROOM_NAME),
            true,
            Login.TOWN_ROOM_NAME
        );
        await ItemGrowthSteps.gainExperience(
            context,
            threshold,
            {level: TestCrossServerPlayerData.GROWTH_LEVEL, experience: threshold},
            Login.TOWN_ROOM_NAME
        );
        await CrossServerHouseAssignment.walkFromTown(context, CrossServerHouseAssignment.SECOND_HOUSE);
        let houseItem = await ItemGrowthSteps.fetchGrowingItem(
            secondServerConfig,
            playerName,
            CrossServerHouseAssignment.SECOND_HOUSE
        );
        expect(
            [houseItem.equipped, houseItem.growthLevel, houseItem.growthExperience],
            'The equipped growing item keeps its level and experience on server-2'
        ).toEqual([true, TestCrossServerPlayerData.GROWTH_LEVEL, threshold]);
        let experience = threshold + TestCrossServerPlayerData.SMALL_EXPERIENCE;
        let grownItem = await ItemGrowthSteps.gainExperience(
            Object.assign({}, context, {gameConfig: secondServerConfig}),
            TestCrossServerPlayerData.SMALL_EXPERIENCE,
            {level: TestCrossServerPlayerData.GROWTH_LEVEL, experience},
            CrossServerHouseAssignment.SECOND_HOUSE
        );
        expect(grownItem.growthExperience, 'The experience gained on server-2 is added to the item once').toBe(experience);
    }

    static run()
    {
        test.describe('Cross Server Player Data', () => {
            test('an equipped growing item keeps its level and experience on server-2 and grows there once', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerPlayerData.runGrowthKeptTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the equipped skin is shown on the own client and the other clients after the move to server-2', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerPlayerData.runSkinKeptTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the active reward events sent by server-2 are the ones server-1 sent', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerPlayerData.runRewardsKeptTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the stats, level and experience on server-2 are the ones the player had on server-1 when it left', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerPlayerData.runStatsKeptTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the inventory and the equipped items on server-2 are the ones the player had on server-1', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerPlayerData.runInventoryKeptTest({page, gameConfig, e2eGroup, longRun});
            });
            test('the tracked quests of the player are listed again after the move to server-2', async ({ page, gameConfig, e2eGroup, longRun }) => {
                await TestCrossServerPlayerData.runQuestsKeptTest({page, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestCrossServerPlayerData.run();
