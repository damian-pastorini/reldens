/**
 *
 * Reldens - Kill Score Rules Steps
 *
 * The steps of the kill score rules spec (KillScoreSteps: the player scores and scores detail rows preserved for the
 * group, the forest enemy with its own "killScore" placed next to the player with one life point, the second group
 * player placed next to the first one with one life point and targeted): the score config values overridden for the
 * group, the stored score row and detail rows of a player, the placed enemy properties changed for the group (only that
 * enemy instance, by its own key), the enemy or the victim killed with the scores rows read before and after the kill,
 * the attack repeated with no kill expected, and the cases shared by the spec tests.
 *
 */

const { expect, test } = require('@playwright/test');
const { KillScoreSteps } = require('./kill-score-steps');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { TestCombatDeath } = require('./test-combat-death');
const { RoomObjectsApi } = require('./room-objects-api');
const { ForestEnemyKill } = require('./forest-enemy-kill');
const { CombatSkillCasting } = require('./combat-skill-casting');
const { Login } = require('./login');
const { TimeConstants } = require('./time-constants');
const { GameConst } = require('../../../lib/game/constants');

class KillScoreRulesSteps
{

    static SCORES_PATH = 'server/scores';
    static NO_KILL_ATTACK_MS = 5000;
    static REMOVED_KILL_SCORE = {propertyKey: 'killScore', removeProperty: true};
    static CUSTOM_NPC_SCORE = 7;
    static NEGATIVE_KILL_SCORE = -1000000;
    static LEVEL_MULTIPLIER = 2;
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};

    static async prepare(context)
    {
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, context.longRun)
            + 2 * TimeConstants.SCENE_LOAD
            + TimeConstants.ENEMY_KILL
        );
        return await KillScoreSteps.prepareKillScore(context.gameConfig, context.e2eGroup, context.longRun);
    }

    static async prepareTwoPlayers(context)
    {
        return {
            scoreData: await KillScoreRulesSteps.prepare(context),
            secondScoreData: await KillScoreSteps.prepareKillScore(
                context.gameConfig,
                context.e2eGroup,
                context.longRun,
                context.gameConfig.e2ePlayerName2
            )
        };
    }

    static async useDirectAttack(context, roomName, playerName)
    {
        await CombatSkillCasting.changeSkill(
            {gameConfig: context.gameConfig, roomName, playerName},
            context.e2eGroup,
            ForestEnemyKill.ATTACK_SKILL_KEY,
            KillScoreRulesSteps.DIRECT_ATTACK
        );
    }

    static async prepareSecondPlayerKill(context, bodyKey)
    {
        await GameplayE2eStateApi.setEnemyBodyLife(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            bodyKey,
            ForestEnemyKill.ONE_HIT_LIFE
        );
        await KillScoreRulesSteps.useDirectAttack(context, Login.FOREST_ROOM_NAME, context.gameConfig.e2ePlayerName2);
        await CombatSkillCasting.targetEnemy(context.secondPage, {bodyKey});
    }

    static async overrideScores(context, values)
    {
        for(let configKey of Object.keys(values)){
            await E2eSeedAndRestoreApi.overrideConfig(
                context.gameConfig,
                context.e2eGroup,
                KillScoreRulesSteps.SCORES_PATH+'/'+configKey,
                values[configKey]
            );
        }
    }

    static async fetchConfigNumber(context, configKey)
    {
        return Number(await E2eSeedAndRestoreApi.fetchConfigValue(
            context.gameConfig,
            KillScoreRulesSteps.SCORES_PATH+'/'+configKey
        ));
    }

    static async fetchScoreRow(context, playerId)
    {
        return [...await KillScoreSteps.fetchScoreRows(context.gameConfig, playerId)].shift() || false;
    }

    static async fetchDetails(context, playerId)
    {
        return await E2eSeedAndRestoreApi.loadRows(context.gameConfig, 'scoresDetail', {player_id: playerId});
    }

    static totalScore(row)
    {
        return Number(row?.total_score || 0);
    }

    static countDifference(kill, countKey)
    {
        return Number(kill.rowAfter?.[countKey] || 0) - Number(kill.rowBefore?.[countKey] || 0);
    }

    static async changePlacedEnemy(context, placement, propertyChange)
    {
        let changed = await GameplayE2eStateApi.changeEnemiesProperty(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            placement.enemyKey,
            propertyChange
        );
        expect(changed.changedEnemies, 'The placed enemy must change: '+changed.error).toBe(1);
    }

    static async killEnemy(context, scoreData, enemyChanges = [])
    {
        let placement = await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        for(let enemyChange of enemyChanges){
            await KillScoreRulesSteps.changePlacedEnemy(context, placement, enemyChange);
        }
        let rowBefore = await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId);
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        return {placement, rowBefore, rowAfter: await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId)};
    }

    static async fetchVictim(context)
    {
        return await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName2
        );
    }

    static async placeVictim(context)
    {
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        return await KillScoreSteps.placeTargetedVictim(context.page, context.secondPage, context.gameConfig, context.longRun);
    }

    static async killVictim(context, scoreData, beforeAttack = false)
    {
        let victimLevel = await KillScoreRulesSteps.placeVictim(context);
        if(beforeAttack){
            await beforeAttack();
        }
        let rowBefore = await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId);
        await KillScoreSteps.attackUntil(
            context.page,
            async () => GameConst.STATUS.DEATH === (await KillScoreRulesSteps.fetchVictim(context)).inState,
            'The victim must be killed'
        );
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        return {victimLevel, rowBefore, rowAfter: await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId)};
    }

    static async attackWithoutKill(context)
    {
        await RoomObjectsApi.attackTargetUntil(
            context.page,
            ForestEnemyKill.ATTACK_SKILL_KEY,
            async () => false,
            KillScoreRulesSteps.NO_KILL_ATTACK_MS
        );
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
    }

    static async runEnemyKillCountsTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let kill = await KillScoreRulesSteps.killEnemy(context, scoreData);
        expect(KillScoreRulesSteps.countDifference(kill, 'npcs_kills_count'), 'The enemy kill is counted').toBe(1);
        expect(kill.rowAfter.last_npc_kill_time, 'The enemy kill time is stored').toBeTruthy();
        let enemyObjectId = await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'objects', {
            client_key: context.gameConfig.e2eEnemyKey,
            room_id: await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'rooms', {name: Login.FOREST_ROOM_NAME})
        });
        expect(
            (await KillScoreRulesSteps.fetchDetails(context, scoreData.playerId)).map(detail => [
                Number(detail.obtained_score),
                Number(detail.kill_npc_id)
            ]),
            'The kill stores a detail row with the kill score and the enemy id'
        ).toContainEqual([kill.placement.killScore, enemyObjectId]);
    }

    static async runPlayerKillCountsTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let victimData = await KillScoreSteps.prepareKillScore(
            context.gameConfig,
            context.e2eGroup,
            context.longRun,
            context.gameConfig.e2ePlayerName2
        );
        let victimRowBefore = await KillScoreRulesSteps.fetchScoreRow(context, victimData.playerId);
        let kill = await KillScoreRulesSteps.killVictim(context, scoreData);
        expect(KillScoreRulesSteps.countDifference(kill, 'players_kills_count'), 'The player kill is counted').toBe(1);
        expect(kill.rowAfter.last_player_kill_time, 'The player kill time is stored').toBeTruthy();
        expect(
            (await KillScoreRulesSteps.fetchDetails(context, scoreData.playerId)).map(detail => Number(detail.kill_player_id)),
            'The kill stores a detail row with the killed player id'
        ).toContain(victimData.playerId);
        expect(
            await KillScoreRulesSteps.fetchScoreRow(context, victimData.playerId),
            'The victim scores row does not change and no row is created for it'
        ).toEqual(victimRowBefore);
        await KillScoreRulesSteps.attackWithoutKill(context);
        expect(
            KillScoreRulesSteps.totalScore(await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId)),
            'Attacking the dead victim again gives no second score'
        ).toBe(KillScoreRulesSteps.totalScore(kill.rowAfter));
    }

    static async runPlayerKillsOffTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        await KillScoreRulesSteps.overrideScores(context, {'playerKills/enabled': 0});
        let detailsBefore = await KillScoreRulesSteps.fetchDetails(context, scoreData.playerId);
        let kill = await KillScoreRulesSteps.killVictim(context, scoreData);
        expect(kill.rowAfter, 'The player kills switch off adds no score').toEqual(kill.rowBefore);
        expect(
            await KillScoreRulesSteps.fetchDetails(context, scoreData.playerId),
            'The disabled kill type stores no detail row'
        ).toEqual(detailsBefore);
    }

    static async runMissingSwitchTest(context, switchKey, isPlayerKill)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        await E2eSeedAndRestoreApi.removeConfig(
            context.gameConfig,
            context.e2eGroup,
            KillScoreRulesSteps.SCORES_PATH+'/'+switchKey+'/enabled'
        );
        let kill = isPlayerKill
            ? await KillScoreRulesSteps.killVictim(context, scoreData)
            : await KillScoreRulesSteps.killEnemy(context, scoreData);
        expect(
            KillScoreRulesSteps.totalScore(kill.rowAfter),
            'The kill with its switch config key missing is scored'
        ).toBeGreaterThan(KillScoreRulesSteps.totalScore(kill.rowBefore));
    }

    static async runEnemyScoreTest(context, configValues, enemyChanges, expectedScore)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        await KillScoreRulesSteps.overrideScores(context, configValues);
        let kill = await KillScoreRulesSteps.killEnemy(context, scoreData, enemyChanges);
        expect(
            KillScoreRulesSteps.totalScore(kill.rowAfter) - KillScoreRulesSteps.totalScore(kill.rowBefore),
            'The enemy kill adds the expected score'
        ).toBe(await expectedScore());
        expect(KillScoreRulesSteps.countDifference(kill, 'npcs_kills_count'), 'The enemy kill is counted').toBe(1);
    }

    static async runPlayerScoreTest(context, configValues, expectedScore)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        await KillScoreRulesSteps.overrideScores(context, configValues);
        let kill = await KillScoreRulesSteps.killVictim(context, scoreData);
        expect(
            KillScoreRulesSteps.totalScore(kill.rowAfter) - KillScoreRulesSteps.totalScore(kill.rowBefore),
            'The player kill adds the expected score'
        ).toBe(await expectedScore(kill.victimLevel));
        expect(KillScoreRulesSteps.countDifference(kill, 'players_kills_count'), 'The player kill is counted').toBe(1);
    }

    static async runEnemyKillsPlayerTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        let rowBefore = await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId);
        await TestCombatDeath.killPlayerWithEnemyAttack(
            context.page,
            context.gameConfig,
            context.gameConfig.e2eEnemyKey,
            TimeConstants.ENEMY_KILL
        );
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        expect(
            await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId),
            'The player killed by an enemy changes no score'
        ).toEqual(rowBefore);
    }

    static async runNoScoreVictimTest(context, preventKill, message)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        await KillScoreRulesSteps.placeVictim(context);
        let rowBefore = await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId);
        await preventKill();
        await KillScoreRulesSteps.attackWithoutKill(context);
        expect(await KillScoreRulesSteps.fetchScoreRow(context, scoreData.playerId), message).toEqual(rowBefore);
    }

}

module.exports.KillScoreRulesSteps = KillScoreRulesSteps;
