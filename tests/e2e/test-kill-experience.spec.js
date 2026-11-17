/**
 *
 * Reldens - Test Kill Experience
 *
 * Tests who gets the experience of an enemy killed by the first group player, with both group players in the forest
 * and the configured enemy placed next to the first player with one hit point (ForestEnemyKill, its experience is the
 * sum of its stored rewards): without a team only the killer gains it (live and stored) while the other player in the
 * room keeps its live, shown and stored experience; in a team (ObserverSteps) with the rewards split in equal parts
 * (the rewards subscriber "splitExperience", read from the config once on start, changed on the live subscriber for
 * the group) each member gains the half, and split by the levels (the members on different class path levels, set for
 * the group before the login) each member gains the share of its level in the levels total.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { ObserverSteps } = require('./helpers/observer-steps');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { KillScoreSteps } = require('./helpers/kill-score-steps');
const { PlayerLevelSteps } = require('./helpers/player-level-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { RewardsConst } = require('../../lib/rewards/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestKillExperience
{

    static REWARDS_SUBSCRIBER_PATH = 'rewards/package/rewardsSubscriber';
    static SPLIT_EXPERIENCE_PROPERTY = 'splitExperience';
    static PERCENT_BASE = 100;
    static FIRST_MEMBER_LEVEL = 1;
    static SECOND_MEMBER_LEVEL = 5;
    static EXPERIENCE_DIGITS = 5;

    static async fetchExperience(gameConfig)
    {
        return (await PlayerLevelSteps.fetchLiveLevel(gameConfig)).experience;
    }

    static async fetchStoredExperience(gameConfig)
    {
        return Number((await PlayerLevelSteps.loadClassPathData(gameConfig)).ownerRow.currentExp);
    }

    static async killPlacedEnemy(context)
    {
        let placement = await ForestEnemyKill.placeEnemyToKill(
            context.page,
            context.gameConfig,
            TimeConstants.SCENE_LOAD,
            context.longRun
        );
        expect(placement.experience, 'The enemy rewards must give experience').toBeGreaterThan(0);
        let killed = await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        return Object.assign({rewardExperience: placement.experience}, killed);
    }

    static async splitExperience(context, splitExperience)
    {
        let changed = await GameplayE2eStateApi.changeFeatureProperty(
            context.gameConfig,
            context.e2eGroup,
            TestKillExperience.REWARDS_SUBSCRIBER_PATH,
            TestKillExperience.SPLIT_EXPERIENCE_PROPERTY,
            splitExperience
        );
        expect(changed.value, 'The rewards split must change: '+changed.error).toBe(splitExperience);
    }

    static async enterTeam(context)
    {
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        await ObserverSteps.joinTeam(context, await DeathObserverSteps.fetchSessionId(context.secondPage));
        await ObserverSteps.waitForTeam(context.gameConfig);
        return secondContext;
    }

    static async runKillerOnlyTest(context)
    {
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        let secondGameConfig = secondContext.gameConfig;
        let secondBefore = await PlayerLevelSteps.fetchLiveLevel(secondGameConfig);
        let secondStoredBefore = await TestKillExperience.fetchStoredExperience(secondGameConfig);
        let killed = await TestKillExperience.killPlacedEnemy(context);
        let killerExperience = killed.experienceBefore + killed.rewardExperience;
        expect(killed.experienceAfter, 'The killer gains the enemy experience').toBe(killerExperience);
        await expect.poll(
            async () => await TestKillExperience.fetchStoredExperience(context.gameConfig),
            {message: 'The killer experience is stored', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(killerExperience);
        await context.secondPage.waitForTimeout(TimeConstants.SERVER_RESPONSE);
        expect(
            (await PlayerLevelSteps.fetchLiveLevel(secondGameConfig)).experience,
            'The other player gains no experience'
        ).toBe(secondBefore.experience);
        expect(await TestKillExperience.fetchStoredExperience(secondGameConfig), 'The other player stored experience')
            .toBe(secondStoredBefore);
        await PlayerLevelSteps.expectShownLevel(context.secondPage, secondBefore, 'The other player shown experience');
    }

    static async runEqualSplitTest(context)
    {
        let secondContext = await TestKillExperience.enterTeam(context);
        await TestKillExperience.splitExperience(context, RewardsConst.SPLIT_EXPERIENCE.ALL);
        let secondBefore = await TestKillExperience.fetchExperience(secondContext.gameConfig);
        let killed = await TestKillExperience.killPlacedEnemy(context);
        let share = killed.rewardExperience / 2;
        expect(killed.experienceAfter, 'The killer gains the half').toBeCloseTo(
            killed.experienceBefore + share,
            TestKillExperience.EXPERIENCE_DIGITS
        );
        await expect.poll(
            async () => await TestKillExperience.fetchExperience(secondContext.gameConfig),
            {message: 'The other member gains the half', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeCloseTo(secondBefore + share, TestKillExperience.EXPERIENCE_DIGITS);
    }

    static async setMemberLevel(context, gameConfig, level)
    {
        let levelRow = (await PlayerLevelSteps.loadClassPathData(gameConfig)).levels.find(
            levelData => level === Number(levelData.key)
        );
        expect(levelRow, 'The class path of '+gameConfig.e2ePlayerName+' must have the level '+level).toBeTruthy();
        await PlayerLevelSteps.setClassPathLevel(gameConfig, context.e2eGroup, level, Number(levelRow.required_experience));
    }

    static async runProportionalSplitTest(context)
    {
        await TestKillExperience.setMemberLevel(context, context.gameConfig, TestKillExperience.FIRST_MEMBER_LEVEL);
        await TestKillExperience.setMemberLevel(
            context,
            Login.fetchSecondPlayerConfig(context.gameConfig),
            TestKillExperience.SECOND_MEMBER_LEVEL
        );
        let secondContext = await TestKillExperience.enterTeam(context);
        await TestKillExperience.splitExperience(context, RewardsConst.SPLIT_EXPERIENCE.PROPORTIONAL_BY_LEVEL);
        let firstLevel = (await PlayerLevelSteps.fetchLiveLevel(context.gameConfig)).level;
        let second = await PlayerLevelSteps.fetchLiveLevel(secondContext.gameConfig);
        expect(second.level, 'The members are on different levels').not.toBe(firstLevel);
        let killed = await TestKillExperience.killPlacedEnemy(context);
        let levelsTotal = firstLevel + second.level;
        let shareOf = (level) => level * TestKillExperience.PERCENT_BASE / levelsTotal
            * killed.rewardExperience / TestKillExperience.PERCENT_BASE;
        expect(killed.experienceAfter, 'The killer gains the share of its level').toBeCloseTo(
            killed.experienceBefore + shareOf(firstLevel),
            TestKillExperience.EXPERIENCE_DIGITS
        );
        await expect.poll(
            async () => await TestKillExperience.fetchExperience(secondContext.gameConfig),
            {message: 'The other member gains the share of its level', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeCloseTo(second.experience + shareOf(second.level), TestKillExperience.EXPERIENCE_DIGITS);
    }

    static run()
    {
        test.describe('Kill Experience', () => {
            test('kill experience goes only to the killer', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillExperience.runKillerOnlyTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('team kill split in equal parts gives each member the half', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillExperience.runEqualSplitTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('team kill split by levels gives each member the share of its level', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillExperience.runProportionalSplitTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestKillExperience.run();
