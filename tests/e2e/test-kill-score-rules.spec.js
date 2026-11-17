/**
 *
 * Reldens - Test Kill Score Rules
 *
 * Tests how a kill is scored (KillScoreRulesSteps): the enemy kill counts the npc kill and its time and stores a detail
 * row with the kill score and the enemy id; the player kill counts the player kill and its time, stores a detail row
 * with the killed player id, leaves the victim scores untouched and attacking the dead victim again gives no second
 * score; the player kills switch off adds no score and no detail row, and with the switches config keys removed both
 * kill types are scored; the enemy "killScore" 0 adds no points but counts the kill, a removed or not numeric
 * "killScore" falls back to the obtainedScorePerNpc config, and the enemy "useNpcCustomScore" number with no
 * "killScore" adds that number; a player killed by an enemy changes no score; a victim with its client gone, a disabled
 * victim and a disabled attacker give no score; the score config values changed for the group (useNpcCustomScore off,
 * obtainedScorePerNpc 0, obtainedScorePerPlayer 0 and the player level multiplier) apply to the next kill (the e2e
 * config override creates the kill score subscriber again, like the restart that loads a changed config); and a
 * negative kill score never takes the total below zero while the kill is still counted.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { KillScoreRulesSteps } = require('./helpers/kill-score-rules-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { Login } = require('./helpers/login');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestKillScoreRules
{

    static async runNegativeKillScoreTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let kill = await KillScoreRulesSteps.killEnemy(
            context,
            scoreData,
            [{propertyKey: 'killScore', value: KillScoreRulesSteps.NEGATIVE_KILL_SCORE}]
        );
        expect(KillScoreRulesSteps.totalScore(kill.rowAfter), 'The total score never goes below zero')
            .toBeGreaterThanOrEqual(0);
        expect(
            KillScoreRulesSteps.countDifference(kill, 'npcs_kills_count'),
            'The negative kill score does not break the update, the kill is counted'
        ).toBe(1);
    }

    static async runDisabledPlayerTest(context, playerName, message)
    {
        await KillScoreRulesSteps.runNoScoreVictimTest(
            context,
            async () => await GameplayE2eStateApi.setPlayerState(
                context.gameConfig,
                Login.FOREST_ROOM_NAME,
                playerName,
                GameConst.STATUS.DISABLED
            ),
            message
        );
    }

    static run()
    {
        test.describe('Kill Score Rules', () => {
            test('enemy kill counts the npc kill, its time and stores its detail row', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await KillScoreRulesSteps.runEnemyKillCountsTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player kill counts the player kill, stores its detail row and leaves the victim scores', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await KillScoreRulesSteps.runPlayerKillCountsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player kills switch off adds no score and no detail row', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await KillScoreRulesSteps.runPlayerKillsOffTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player kill with its switch config key missing is scored', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await KillScoreRulesSteps.runMissingSwitchTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    'playerKills',
                    true
                );
            });
            test('enemy kill with its switch config key missing is scored', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await KillScoreRulesSteps.runMissingSwitchTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    'npcKills',
                    false
                );
            });
            test('enemy kill score 0 adds no points but counts the kill', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await KillScoreRulesSteps.runEnemyScoreTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {},
                    [{propertyKey: 'killScore', value: 0}],
                    async () => 0
                );
            });
            test('enemy without kill score adds the obtainedScorePerNpc config', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await KillScoreRulesSteps.runEnemyScoreTest(
                    context,
                    {},
                    [KillScoreRulesSteps.REMOVED_KILL_SCORE],
                    async () => await KillScoreRulesSteps.fetchConfigNumber(context, 'obtainedScorePerNpc')
                );
            });
            test('enemy not numeric kill score adds the obtainedScorePerNpc config', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await KillScoreRulesSteps.runEnemyScoreTest(
                    context,
                    {},
                    [{propertyKey: 'killScore', value: 'not-a-number'}],
                    async () => await KillScoreRulesSteps.fetchConfigNumber(context, 'obtainedScorePerNpc')
                );
            });
            test('enemy useNpcCustomScore number with no kill score adds that number', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await KillScoreRulesSteps.runEnemyScoreTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {},
                    [
                        KillScoreRulesSteps.REMOVED_KILL_SCORE,
                        {propertyKey: 'useNpcCustomScore', value: KillScoreRulesSteps.CUSTOM_NPC_SCORE}
                    ],
                    async () => KillScoreRulesSteps.CUSTOM_NPC_SCORE
                );
            });
            test('player killed by an enemy changes no score', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await KillScoreRulesSteps.runEnemyKillsPlayerTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('victim with its client gone from the room gives no score', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await KillScoreRulesSteps.runNoScoreVictimTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    async () => await GameplayE2eStateApi.hideRoomClient(
                        gameConfig,
                        e2eGroup,
                        Login.FOREST_ROOM_NAME,
                        gameConfig.e2ePlayerName2
                    ),
                    'The victim with its client gone gives no score'
                );
            });
            test('disabled victim hit with a lethal attack gives no score', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreRules.runDisabledPlayerTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    gameConfig.e2ePlayerName2,
                    'The disabled victim gives no score'
                );
            });
            test('disabled attacker gives no score', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreRules.runDisabledPlayerTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    gameConfig.e2ePlayerName,
                    'The disabled attacker gives no score'
                );
            });
            test('useNpcCustomScore config off adds the obtainedScorePerNpc config', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, screenshots, gameConfig, e2eGroup, longRun};
                await KillScoreRulesSteps.runEnemyScoreTest(
                    context,
                    {useNpcCustomScore: 0},
                    [],
                    async () => await KillScoreRulesSteps.fetchConfigNumber(context, 'obtainedScorePerNpc')
                );
            });
            test('obtainedScorePerNpc 0 and no custom score adds 0 and counts the kill', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await KillScoreRulesSteps.runEnemyScoreTest(
                    {page, screenshots, gameConfig, e2eGroup, longRun},
                    {obtainedScorePerNpc: 0},
                    [KillScoreRulesSteps.REMOVED_KILL_SCORE],
                    async () => 0
                );
            });
            test('player level multiplier above 0 adds the killed player level points', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                let context = {page, secondPage, screenshots, gameConfig, e2eGroup, longRun};
                await KillScoreRulesSteps.runPlayerScoreTest(
                    context,
                    {obtainedScorePerPlayerLevelMultiplier: KillScoreRulesSteps.LEVEL_MULTIPLIER},
                    async (victimLevel) => await KillScoreRulesSteps.fetchConfigNumber(context, 'obtainedScorePerPlayer')
                        + KillScoreRulesSteps.LEVEL_MULTIPLIER * victimLevel
                );
            });
            test('obtainedScorePerPlayer 0 and multiplier 0 adds 0 and counts the kill', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await KillScoreRulesSteps.runPlayerScoreTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun},
                    {obtainedScorePerPlayer: 0, obtainedScorePerPlayerLevelMultiplier: 0},
                    async () => 0
                );
            });
            test('negative enemy kill score never takes the total below zero', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreRules.runNegativeKillScoreTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestKillScoreRules.run();
