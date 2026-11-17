/**
 *
 * Reldens - Test Item Growth Players
 *
 * Tests the growing items of more than one owner or instance (ItemGrowthSteps: the swords seeded for the group and
 * equipped in the forest): with both group players in the forest, each with its own sword, the experience of the first
 * player grows only its sword and only its stat, the level reached message and the item update reach only the owner,
 * and in a team (ObserverSteps) an experience reward given through the rewards subscriber grows each sword with the
 * share of its owner, split in equal parts or by the members levels; two sword instances of one player keep their own
 * level and modifier; and growing items equipped in two groups (the sword and the warlock robe, given a growth for the
 * group) both grow with the same experience.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { ItemGrowthChecks } = require('./helpers/item-growth-checks');
const { ObserverSteps } = require('./helpers/observer-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { SecurityApi } = require('./helpers/security-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { RewardsConst } = require('../../lib/rewards/constants');
const { ItemGrowthCalculator, ItemsConst } = require('@reldens/items-system');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestItemGrowthPlayers
{

    static SECOND_LEVEL = 2;
    static THIRD_LEVEL = 3;
    static TEAM_REWARD_EXPERIENCE = 8;
    static PROPORTIONAL_REWARD_EXPERIENCE = 40;
    static PERCENT_BASE = 100;
    static ROBE_KEY = 'skin_warlock_robe';

    static async enterBothWithSwords(context)
    {
        let secondContext = Object.assign({}, context, {
            page: context.secondPage,
            gameConfig: Login.fetchSecondPlayerConfig(context.gameConfig)
        });
        await ItemGrowthSteps.seedGrowingItem(context, false, secondContext.gameConfig.e2ePlayerName);
        let started = await ItemGrowthSteps.startGrowth(context);
        test.setTimeout(
            test.info().timeout
            + TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
        );
        await ItemGrowthSteps.enterWithGrowingItem(secondContext);
        started.secondContext = secondContext;
        started.secondStatsBefore = await ItemGrowthSteps.fetchPlayerStats(secondContext.gameConfig);
        await RoomMessagesRecorder.start(secondContext.page);
        return started;
    }

    static growthFor(growth, addedExperience)
    {
        let experience = ItemGrowthCalculator.experienceFor(growth.experienceShare, addedExperience);
        let memberGrowth = {};
        if(0 < experience){
            memberGrowth = {level: ItemGrowthCalculator.levelFor(experience, growth.levels, ItemsConst.GROWTH.DEFAULT_LEVEL), experience};
        }
        return memberGrowth;
    }

    static async giveTeamReward(context, experience, splitExperience)
    {
        await ObserverSteps.waitForTeam(context.gameConfig);
        let rewarded = await SecurityApi.request(context.gameConfig, 'POST', ObserverSteps.REWARD_TARGETS_PATH, {
            roomName: Login.FOREST_ROOM_NAME,
            group: context.e2eGroup,
            playerName: context.gameConfig.e2ePlayerName,
            splitExperience,
            experience
        });
        expect(rewarded.errors, 'The experience reward must be given: '+rewarded.error).toEqual([]);
    }

    static async prepareTeam(context)
    {
        let started = await TestItemGrowthPlayers.enterBothWithSwords(context);
        await ObserverSteps.joinTeam(context, await DeathObserverSteps.fetchSessionId(context.secondPage));
        return started;
    }

    static async runOwnersTest(context)
    {
        let started = await TestItemGrowthPlayers.enterBothWithSwords(context);
        let statKey = started.itemData.statKey;
        expect(
            (await ItemGrowthSteps.fetchPlayerStats(context.gameConfig))[statKey],
            'The other player sword equip leaves the first player stat'
        ).toBe(started.statsBefore[statKey]);
        let threshold = ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthPlayers.SECOND_LEVEL);
        let item = await ItemGrowthSteps.gainExperience(context, threshold, {
            level: TestItemGrowthPlayers.SECOND_LEVEL,
            experience: threshold
        });
        await ItemGrowthChecks.expectItemOnLevel(context, started, item, TestItemGrowthPlayers.SECOND_LEVEL);
        let secondGameConfig = started.secondContext.gameConfig;
        await ItemGrowthChecks.expectItemOnLevel(
            started.secondContext,
            Object.assign({}, started, {statsBefore: started.secondStatsBefore}),
            await ItemGrowthSteps.fetchGrowingItem(secondGameConfig, secondGameConfig.e2ePlayerName),
            1
        );
        expect(
            await ItemGrowthSteps.fetchItemGrowth(secondGameConfig, secondGameConfig.e2ePlayerName),
            'The other player sword gets no experience'
        ).toEqual({});
    }

    static async runOwnerMessagesTest(context)
    {
        let started = await TestItemGrowthPlayers.enterBothWithSwords(context);
        let threshold = ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthPlayers.SECOND_LEVEL);
        await ItemGrowthSteps.gainExperience(context, threshold, {level: TestItemGrowthPlayers.SECOND_LEVEL, experience: threshold});
        await ItemGrowthChecks.expectLevelMessages(context.page, 1);
        expect(
            (await RoomMessagesRecorder.fetchMessages(context.page, ItemsConst.ACTION_UPDATE)).length,
            'The owner gets the sword update'
        ).toBeGreaterThan(0);
        let secondPage = started.secondContext.page;
        expect(await ItemGrowthSteps.fetchLevelMessages(secondPage), 'The other player gets no level message').toEqual([]);
        expect(
            await RoomMessagesRecorder.fetchMessages(secondPage, ItemsConst.ACTION_UPDATE),
            'The other player gets no sword update'
        ).toEqual([]);
    }

    static async runEqualTeamShareTest(context)
    {
        let started = await TestItemGrowthPlayers.prepareTeam(context);
        let rewardExperience = TestItemGrowthPlayers.TEAM_REWARD_EXPERIENCE;
        await TestItemGrowthPlayers.giveTeamReward(context, rewardExperience, RewardsConst.SPLIT_EXPERIENCE.ALL);
        let memberGrowth = TestItemGrowthPlayers.growthFor(started.growth, rewardExperience / 2);
        await ItemGrowthSteps.waitForStoredGrowth(context, memberGrowth);
        await ItemGrowthSteps.waitForStoredGrowth(started.secondContext, memberGrowth);
    }

    static async runProportionalTeamShareTest(context)
    {
        let started = await TestItemGrowthPlayers.prepareTeam(context);
        let contexts = [context, started.secondContext];
        let levels = [];
        for(let memberContext of contexts){
            levels.push((await GameplayE2eStateApi.fetchPlayer(
                memberContext.gameConfig,
                Login.FOREST_ROOM_NAME,
                memberContext.gameConfig.e2ePlayerName
            )).level);
        }
        let rewardExperience = TestItemGrowthPlayers.PROPORTIONAL_REWARD_EXPERIENCE;
        await TestItemGrowthPlayers.giveTeamReward(
            context,
            rewardExperience,
            RewardsConst.SPLIT_EXPERIENCE.PROPORTIONAL_BY_LEVEL
        );
        let levelsTotal = levels.reduce((total, level) => total + level, 0);
        for(let memberIndex of contexts.keys()){
            let proportion = levels[memberIndex] * TestItemGrowthPlayers.PERCENT_BASE / levelsTotal;
            await ItemGrowthSteps.waitForStoredGrowth(
                contexts[memberIndex],
                TestItemGrowthPlayers.growthFor(
                    started.growth,
                    proportion * rewardExperience / TestItemGrowthPlayers.PERCENT_BASE
                )
            );
        }
    }

    static async runInstancesTest(context)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + ItemGrowthSteps.GROWTH_TIME_OUT_MS
        );
        let itemData = await ItemGrowthSteps.loadGrowingItemData(context.gameConfig);
        let secondThreshold = ItemGrowthChecks.levelThreshold(itemData.growth, TestItemGrowthPlayers.SECOND_LEVEL);
        let thirdGrowth = {
            level: TestItemGrowthPlayers.THIRD_LEVEL,
            experience: ItemGrowthChecks.levelThreshold(itemData.growth, TestItemGrowthPlayers.THIRD_LEVEL)
        };
        let firstRow = await ItemGrowthSteps.seedGrowingItem(context);
        let secondRow = await ItemGrowthSteps.seedGrowingItem(context, sc.toJsonString({growth: thirdGrowth}));
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let playerName = context.gameConfig.e2ePlayerName;
        let firstItem = (await ItemGrowthSteps.fetchGrowingItems(context.gameConfig, playerName)).find(
            item => firstRow.id === item.id
        );
        expect(firstItem, 'The first sword instance must be loaded').toBeTruthy();
        await ItemGrowthSteps.toggleEquip(context.page, context.gameConfig, firstItem, true);
        await ItemGrowthSteps.addExperience(context.gameConfig, playerName, secondThreshold);
        let modifierRow = itemData.modifierRow;
        let percent = itemData.growth[ItemGrowthChecks.PERCENT_KEY];
        await expect.poll(
            async () => (await ItemGrowthSteps.fetchGrowingItems(context.gameConfig, playerName))
                .filter(item => [firstRow.id, secondRow.id].includes(item.id))
                .sort((itemA, itemB) => itemA.id - itemB.id)
                .map(item => [
                    item.growthLevel,
                    item.growthExperience,
                    item.modifiers.find(modifier => modifierRow.key === modifier.key)?.value
                ]),
            {message: 'Each sword instance keeps its own level and modifier', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual([
            [
                TestItemGrowthPlayers.SECOND_LEVEL,
                secondThreshold,
                ItemGrowthCalculator.scaledValue(modifierRow.value, TestItemGrowthPlayers.SECOND_LEVEL, percent)
            ],
            [
                thirdGrowth.level,
                thirdGrowth.experience,
                ItemGrowthCalculator.scaledValue(modifierRow.value, thirdGrowth.level, percent)
            ]
        ]);
    }

    static async runTwoGroupsTest(context)
    {
        let gameConfig = context.gameConfig;
        let robeKey = TestItemGrowthPlayers.ROBE_KEY;
        let robeRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'itemsItem', {key: robeKey})].shift();
        expect(robeRow, 'The warlock robe must be stored').toBeTruthy();
        let itemData = await ItemGrowthSteps.loadGrowingItemData(gameConfig);
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, context.e2eGroup, 'itemsItem', {key: robeKey}, {
            customData: sc.toJsonString(Object.assign({}, sc.toJson(robeRow.customData, {}), {growth: itemData.growth}))
        });
        await E2eSeedAndRestoreApi.seedInventoryItem(gameConfig, context.e2eGroup, gameConfig.e2ePlayerName, robeKey, 1);
        let started = await ItemGrowthSteps.startGrowth(context);
        let robe = (await ItemGrowthSteps.fetchItems(gameConfig, gameConfig.e2ePlayerName)).find(item => robeKey === item.key);
        expect(robe, 'The player must carry the warlock robe').toBeTruthy();
        await ItemGrowthSteps.toggleEquip(context.page, gameConfig, robe, true);
        let growth = {
            level: TestItemGrowthPlayers.SECOND_LEVEL,
            experience: ItemGrowthChecks.levelThreshold(started.growth, TestItemGrowthPlayers.SECOND_LEVEL)
        };
        await ItemGrowthSteps.gainExperience(context, growth.experience, growth);
        await expect.poll(
            async () => await ItemGrowthSteps.fetchItemGrowth(gameConfig, gameConfig.e2ePlayerName, robeKey),
            {message: 'The robe of the other group grows too', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(growth);
    }

    static run()
    {
        test.describe('Item Growth Players', () => {
            test('each player sword grows alone and its stat goes to its owner only', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPlayers.runOwnersTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('level reached message and sword update reach only the owner', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPlayers.runOwnerMessagesTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('team experience split in equal parts grows each sword with its owner share', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPlayers.runEqualTeamShareTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('team experience split by levels grows each sword with its member share', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPlayers.runProportionalTeamShareTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two sword instances keep their own level and modifier', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPlayers.runInstancesTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('growing items equipped in two groups both grow', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestItemGrowthPlayers.runTwoGroupsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestItemGrowthPlayers.run();
