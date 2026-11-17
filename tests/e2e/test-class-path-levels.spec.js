/**
 *
 * Reldens - Test Class Path Levels
 *
 * Tests the player class path levels (PlayerLevelSteps: the class path level and experience set for the group before
 * the login, the experience added to the player class path, the same path a kill reward uses): the shown level,
 * experience, next level experience and class path label match the stored row and the live class path; one level up to
 * the level with a stored label shows the new level texts and label, adds the stored skills of that level to the skill
 * bar, plays the default level animation and applies the stored level modifiers to the stats; one experience that
 * reaches several levels applies the modifiers of every passed level (the generated levels use the modifiers of the
 * last stored level below them); on the top level the experience is added with no level up or stat change; the level
 * and experience are stored and shown again after a new login; the room change keeps the shown texts and the skill
 * buttons once; and the experience and level up of the first player leave the texts of the second one.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { PlayerLevelSteps } = require('./helpers/player-level-steps');
const { ItemGrowthSteps } = require('./helpers/item-growth-steps');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { Navigation } = require('./helpers/navigation');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ModifierConst } = require('@reldens/modifiers');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestClassPathLevels
{

    static DEFAULT_ANIMATION_KEY = 'level_default';
    static STATS_PATH_PREFIX = 'stats/';
    static TOP_LEVEL_EXPERIENCE = 100;

    static setTimeOut(context, logins = 1)
    {
        test.setTimeout(
            logins * TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + ItemGrowthSteps.GROWTH_TIME_OUT_MS
        );
    }

    static async enterOnLevel(context, level, experience)
    {
        TestClassPathLevels.setTimeOut(context);
        await PlayerLevelSteps.setClassPathLevel(context.gameConfig, context.e2eGroup, level, experience);
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        return await PlayerLevelSteps.fetchLiveLevel(context.gameConfig);
    }

    static labeledLevel(classPathData)
    {
        let labeledLevel = classPathData.levels.find(
            levelRow => classPathData.labels.some(labelRow => labelRow.level_id === levelRow.id)
        );
        expect(labeledLevel, 'The class path must have a stored level label').toBeTruthy();
        return labeledLevel;
    }

    static addStatsIncreases(statsModifiers, modifierRows)
    {
        for(let modifierRow of modifierRows){
            if(!modifierRow.property_key.startsWith(TestClassPathLevels.STATS_PATH_PREFIX)){
                continue;
            }
            if(ModifierConst.OPS.INC !== Number(modifierRow.operation)){
                continue;
            }
            let statKey = modifierRow.property_key.replace(TestClassPathLevels.STATS_PATH_PREFIX, '');
            statsModifiers[statKey] = sc.get(statsModifiers, statKey, 0) + Number(modifierRow.value);
        }
        return statsModifiers;
    }

    static async loadStatsModifiers(gameConfig, levelRows)
    {
        let statsModifiers = {};
        for(let levelRow of levelRows){
            TestClassPathLevels.addStatsIncreases(
                statsModifiers,
                await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsLevelsModifiers', {level_id: levelRow.id})
            );
        }
        return statsModifiers;
    }

    static passedStoredLevels(levelRows, fromLevel, toLevel)
    {
        let passedLevels = [];
        for(let levelKey = fromLevel + 1; levelKey <= toLevel; levelKey++){
            passedLevels.push([...levelRows.filter(levelRow => Number(levelRow.key) <= levelKey)].pop());
        }
        return passedLevels;
    }

    static async expectStatsIncreased(gameConfig, statsBefore, statsModifiers)
    {
        let statsKeys = Object.keys(statsModifiers);
        expect(statsKeys.length, 'The passed levels must have stats modifiers').toBeGreaterThan(0);
        let player = await PlayerLevelSteps.fetchLiveLevel(gameConfig);
        expect(statsKeys.map(statKey => player.stats[statKey]), 'The stats get the levels modifiers').toEqual(
            statsKeys.map(statKey => statsBefore[statKey] + statsModifiers[statKey])
        );
    }

    static async gainLevelExperience(context, live)
    {
        await ItemGrowthSteps.addExperience(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            live.nextLevelExperience - live.experience
        );
        await expect.poll(
            async () => (await PlayerLevelSteps.fetchLiveLevel(context.gameConfig)).level,
            {message: 'The player reaches the next level', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(live.level + 1);
        return await PlayerLevelSteps.fetchLiveLevel(context.gameConfig);
    }

    static async runShownLevelTest(context)
    {
        TestClassPathLevels.setTimeOut(context);
        let classPathData = await PlayerLevelSteps.loadClassPathData(context.gameConfig);
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let live = await PlayerLevelSteps.fetchLiveLevel(context.gameConfig);
        expect([live.level, live.experience], 'The live class path loads the stored level and experience').toEqual(
            [Number(classPathData.ownerRow.currentLevel), Number(classPathData.ownerRow.currentExp)]
        );
        await PlayerLevelSteps.expectShownLevel(context.page, live, 'The shown level texts match the stored values');
    }

    static async runLevelUpTest(context)
    {
        let classPathData = await PlayerLevelSteps.loadClassPathData(context.gameConfig);
        let labeledLevel = TestClassPathLevels.labeledLevel(classPathData);
        let live = await TestClassPathLevels.enterOnLevel(context, Number(labeledLevel.key) - 1, 0);
        expect(live.nextLevelExperience, 'The next level is the labeled one').toBe(Number(labeledLevel.required_experience));
        await SceneSpritesRecorder.start(context.page);
        let leveled = await TestClassPathLevels.gainLevelExperience(context, live);
        expect(leveled.classPathLabel, 'The class path label changes to the stored label of the level').toBe(
            classPathData.labels.find(labelRow => labelRow.level_id === labeledLevel.id).label
        );
        await PlayerLevelSteps.expectShownLevel(context.page, leveled, 'The shown level texts follow the level up');
        let levelSkillsIds = classPathData.levelSkills.filter(row => row.level_id === labeledLevel.id).map(row => row.skill_id);
        expect(levelSkillsIds.length, 'The labeled level must give skills').toBeGreaterThan(0);
        for(let skillId of levelSkillsIds){
            let skillRow = [...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'skillsSkill', {id: skillId})].shift();
            await expect(
                context.page.locator(Selectors.combat.skillButton(skillRow.key)),
                'The level skill '+skillRow.key+' is added to the skill bar'
            ).toBeVisible({timeout: TimeConstants.SERVER_RESPONSE});
        }
        expect(
            (await SceneSpritesRecorder.fetchSprites(context.page, TestClassPathLevels.DEFAULT_ANIMATION_KEY)).length,
            'The level animation is played'
        ).toBeGreaterThan(0);
        await TestClassPathLevels.expectStatsIncreased(
            context.gameConfig,
            live.stats,
            await TestClassPathLevels.loadStatsModifiers(context.gameConfig, [labeledLevel])
        );
    }

    static async runSeveralLevelsTest(context)
    {
        let classPathData = await PlayerLevelSteps.loadClassPathData(context.gameConfig);
        let firstLevel = Number([...classPathData.levels].shift().key);
        let labeledLevel = TestClassPathLevels.labeledLevel(classPathData);
        let live = await TestClassPathLevels.enterOnLevel(context, firstLevel, 0);
        await ItemGrowthSteps.addExperience(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            Number(labeledLevel.required_experience)
        );
        await expect.poll(
            async () => (await PlayerLevelSteps.fetchLiveLevel(context.gameConfig)).level,
            {message: 'One experience reaches several levels', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(Number(labeledLevel.key));
        await TestClassPathLevels.expectStatsIncreased(
            context.gameConfig,
            live.stats,
            await TestClassPathLevels.loadStatsModifiers(
                context.gameConfig,
                TestClassPathLevels.passedStoredLevels(classPathData.levels, firstLevel, Number(labeledLevel.key))
            )
        );
    }

    static async runTopLevelTest(context)
    {
        let classPathData = await PlayerLevelSteps.loadClassPathData(context.gameConfig);
        let topLevel = [...classPathData.levels].pop();
        let live = await TestClassPathLevels.enterOnLevel(context, Number(topLevel.key), Number(topLevel.required_experience));
        await ItemGrowthSteps.addExperience(
            context.gameConfig,
            context.gameConfig.e2ePlayerName,
            TestClassPathLevels.TOP_LEVEL_EXPERIENCE
        );
        let expectedExperience = live.experience + TestClassPathLevels.TOP_LEVEL_EXPERIENCE;
        await expect.poll(
            async () => Number([...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'skillsOwnersClassPath', {
                owner_id: classPathData.ownerRow.owner_id
            })].shift().currentExp),
            {message: 'The top level stores the added experience', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(expectedExperience);
        let topLive = await PlayerLevelSteps.fetchLiveLevel(context.gameConfig);
        expect([topLive.level, topLive.experience, topLive.stats], 'The top level keeps the level and the stats').toEqual(
            [live.level, expectedExperience, live.stats]
        );
        await PlayerLevelSteps.expectShownLevel(context.page, topLive, 'The shown texts follow the top level experience');
    }

    static async runNewLoginTest(context)
    {
        let classPathData = await PlayerLevelSteps.loadClassPathData(context.gameConfig);
        let labeledLevel = TestClassPathLevels.labeledLevel(classPathData);
        let live = await TestClassPathLevels.enterOnLevel(context, Number(labeledLevel.key) - 1, 0);
        TestClassPathLevels.setTimeOut(context, 2);
        let leveled = await TestClassPathLevels.gainLevelExperience(context, live);
        await context.page.reload();
        await Login.loginRootPlayer(context.page, context.gameConfig, context.longRun);
        await Navigation.waitForRoom(context.page, Login.FOREST_ROOM_NAME, TimeConstants.SCENE_LOAD);
        let storedRow = [...await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'skillsOwnersClassPath', {
            owner_id: classPathData.ownerRow.owner_id
        })].shift();
        expect([Number(storedRow.currentLevel), Number(storedRow.currentExp)], 'The level and experience are stored').toEqual(
            [leveled.level, leveled.experience]
        );
        await PlayerLevelSteps.expectShownLevel(
            context.page,
            await PlayerLevelSteps.fetchLiveLevel(context.gameConfig),
            'The new login shows the stored level texts'
        );
    }

    static async runRoomChangeTest(context)
    {
        let live = await TestClassPathLevels.enterOnLevel(context, 1, 0);
        await ItemGrowthSteps.addExperience(context.gameConfig, context.gameConfig.e2ePlayerName, 1);
        await AutoRecoverySteps.moveToTown(context.page, context.gameConfig);
        let townLive = await PlayerLevelSteps.fetchLiveLevel(context.gameConfig, Login.TOWN_ROOM_NAME);
        expect(townLive.experience, 'The room change keeps the gained experience').toBe(live.experience + 1);
        await PlayerLevelSteps.expectShownLevel(context.page, townLive, 'The room change keeps the shown level texts');
        for(let skillKey of townLive.skillsKeys){
            await expect(
                context.page.locator(Selectors.combat.skillButton(skillKey)),
                'The skill '+skillKey+' button is shown once'
            ).toHaveCount(1);
        }
    }

    static async runOtherPlayerTest(context)
    {
        let live = await TestClassPathLevels.enterOnLevel(context, 1, 0);
        TestClassPathLevels.setTimeOut(context, 2);
        await Login.loginAndEnterForest(context.secondPage, Login.fetchSecondPlayerConfig(context.gameConfig), context.longRun);
        let secondShown = await PlayerLevelSteps.fetchShownLevel(context.secondPage);
        let leveled = await TestClassPathLevels.gainLevelExperience(context, live);
        await PlayerLevelSteps.expectShownLevel(context.page, leveled, 'The first player sees its level up');
        expect(
            await PlayerLevelSteps.fetchShownLevel(context.secondPage),
            'The second player texts do not change'
        ).toEqual(secondShown);
    }

    static run()
    {
        test.describe('Class Path Levels', () => {
            test('shown level texts match the stored and live class path', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClassPathLevels.runShownLevelTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('level up shows the level texts, label, skills, animation and applies the level modifiers', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClassPathLevels.runLevelUpTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('one experience that reaches several levels applies every passed level modifiers', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClassPathLevels.runSeveralLevelsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('top level adds the experience with no level up or stat change', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClassPathLevels.runTopLevelTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('level and experience are stored and shown again after a new login', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClassPathLevels.runNewLoginTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('room change keeps the level texts and the skill buttons once', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClassPathLevels.runRoomChangeTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('experience and level up of a player leave the other player texts', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestClassPathLevels.runOtherPlayerTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestClassPathLevels.run();
