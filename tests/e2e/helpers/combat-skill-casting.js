/**
 *
 * Reldens - Combat Skill Casting
 *
 * Page and server steps for the combat rules specs: the player enters the forest, one enemy is placed next to it and
 * targeted with its aggression held (ForestEnemyKill), every other enemy of the room is disabled, the player skills
 * events are recorded, and the player attack and the enemy defense stats get balanced values (the same attack and
 * defense totals and the same aim and dodge), so the damage of a skill is its stored hit damage until a test changes a
 * stat or a skill property. A cast clicks the skill button of the HUD once the skill can be activated again and waits
 * until the server recorded the expected damages count; the skill rows and values are read from the database instead
 * of repeating the stored values. The PvP preparation logs the first and the second players of the group in their
 * start room (the town), places the second player next to the first one, gives it the enemy balanced defense stats
 * and targets it.
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { RoomObjectsApi } = require('./room-objects-api');
const { ForestEnemyKill } = require('./forest-enemy-kill');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { GameConst } = require('../../../lib/game/constants');
const { ObjectsConst } = require('../../../lib/objects/constants');

class CombatSkillCasting
{

    static ROOM_NAME = Login.FOREST_ROOM_NAME;
    static BALANCED_PLAYER_STATS = {atk: 50, speed: 50, aim: 100};
    static BALANCED_ENEMY_STATS = {def: 50, speed: 50, dodge: 100};
    static QUIET_MS = 1500;

    static async prepareEnemyTarget(page, gameConfig, longRun)
    {
        let entered = await ForestEnemyKill.enterForestWithPlacedEnemy(page, gameConfig, longRun);
        let roomName = CombatSkillCasting.ROOM_NAME;
        await RoomObjectsApi.disableEnemies(gameConfig, roomName, false, entered.placement.bodyKey);
        let context = {
            gameConfig,
            roomName,
            playerName: gameConfig.e2ePlayerName,
            enemyKey: entered.placement.enemyKey,
            bodyKey: entered.placement.bodyKey,
            enemyPosition: entered.placement.position,
            enemyExperience: entered.placement.experience,
            enemyKillScore: entered.placement.killScore,
            timeout: entered.timeout
        };
        await GameplayE2eStateApi.recordPlayerSkills(gameConfig, roomName, context.playerName);
        await CombatSkillCasting.setPlayerStats(context, CombatSkillCasting.BALANCED_PLAYER_STATS);
        await CombatSkillCasting.setEnemyStats(context, CombatSkillCasting.BALANCED_ENEMY_STATS);
        return context;
    }

    static async preparePlayerTarget(page, secondPage, gameConfig, longRun)
    {
        await Login.startConfigPlayer(page, gameConfig, longRun);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        let context = {
            gameConfig,
            roomName: Login.TOWN_ROOM_NAME,
            playerName: gameConfig.e2ePlayerName,
            timeout: TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun)
        };
        await GameplayE2eStateApi.recordPlayerSkills(gameConfig, context.roomName, context.playerName);
        await CombatSkillCasting.setPlayerStats(context, CombatSkillCasting.BALANCED_PLAYER_STATS);
        context.targetPlayer = await CombatSkillCasting.placeSecondPlayer(secondPage, context);
        await GameplayE2eStateApi.setPlayerStats(
            gameConfig,
            context.roomName,
            context.targetPlayer.playerName,
            CombatSkillCasting.BALANCED_ENEMY_STATS
        );
        await CombatSkillCasting.targetPlayer(page, context.targetPlayer.sessionId);
        return context;
    }

    static async loadSkillRow(gameConfig, entityKey, skillKey)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, entityKey, {
            skill_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'skillsSkill', {key: skillKey})
        })).shift();
    }

    static async loadSkillValue(gameConfig, entityKey, skillKey, fieldKey)
    {
        return Number((await CombatSkillCasting.loadSkillRow(gameConfig, entityKey, skillKey))[fieldKey]);
    }

    static async loadCastTime(gameConfig, skillKey)
    {
        return Number(
            [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsSkill', {key: skillKey})].shift().castTime
        );
    }

    static async setPlayerStats(context, stats)
    {
        return await GameplayE2eStateApi.setPlayerStats(
            context.gameConfig,
            context.roomName,
            context.playerName,
            stats
        );
    }

    static async setEnemyStats(context, stats)
    {
        return await GameplayE2eStateApi.setEnemyStats(context.gameConfig, context.roomName, context.bodyKey, stats);
    }

    static async changeSkill(context, group, skillKey, properties)
    {
        let skill = await GameplayE2eStateApi.changePlayerSkill(
            context.gameConfig,
            group,
            context.roomName,
            context.playerName,
            skillKey,
            properties
        );
        expect(skill.key, 'The skill '+skillKey+' must be changed: '+skill.error).toBe(skillKey);
        return skill;
    }

    static async fetchSkill(context, skillKey)
    {
        return await GameplayE2eStateApi.fetchPlayerSkill(
            context.gameConfig,
            context.roomName,
            context.playerName,
            skillKey
        );
    }

    static async fetchRecorded(context)
    {
        return await GameplayE2eStateApi.fetchRecordedSkills(context.gameConfig, context.playerName);
    }

    static async fetchPlayerStat(context, statKey)
    {
        return (await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            context.roomName,
            context.playerName
        )).stats[statKey];
    }

    static async fetchEnemySnapshot(context)
    {
        return (await RoomObjectsApi.fetchRoomObjects(context.gameConfig, context.roomName)).find(
            roomObject => context.bodyKey === roomObject.bodyKey
        );
    }

    static async fetchEnemyInBattle(context)
    {
        return (await CombatSkillCasting.fetchEnemySnapshot(context)).inBattle;
    }

    static async fetchEnemyLife(context)
    {
        return (await GameplayE2eStateApi.fetchEnemyLife(context.gameConfig, context.roomName, context.bodyKey)).life;
    }

    static async placeSecondPlayer(secondPage, context)
    {
        let secondPlayer = {playerName: context.gameConfig.e2ePlayerName2};
        let placed = await RoomObjectsApi.placePlayerNearPlayer(
            context.gameConfig,
            context.roomName,
            secondPlayer.playerName,
            context.playerName
        );
        expect(placed.position, 'The second player must be placed: '+placed.error).toBeTruthy();
        secondPlayer.sessionId = await secondPage.evaluate(() => window.reldens.activeRoomEvents.room.sessionId);
        return secondPlayer;
    }

    static async prepareTargetAndObserver(page, secondPage, context, longRun)
    {
        await Login.loginRootPlayer(secondPage, context.gameConfig, longRun, '2');
        let players = {targetPlayer: await CombatSkillCasting.placeSecondPlayer(secondPage, context)};
        players.observerClient = await Login.openClientPage(page, context.gameConfig);
        await Login.loginRootPlayer(players.observerClient.clientPage, context.gameConfig, longRun, '3');
        return players;
    }

    static async placeByEnemy(page, context, placementMethod, distance, label)
    {
        let placed = await placementMethod(
            page,
            context.gameConfig,
            context.roomName,
            context.enemyKey,
            context.timeout,
            distance
        );
        expect(placed.reached, label+': '+placed.error).toBe(true);
        return placed;
    }

    static async targetPlayer(page, sessionId)
    {
        await page.evaluate((target) => {
            window.reldens.getActiveScene().player.currentTarget = target;
        }, {id: sessionId, type: GameConst.TYPE_PLAYER});
    }

    static async targetEnemy(page, context)
    {
        await page.evaluate((target) => {
            window.reldens.getActiveScene().player.currentTarget = {
                id: window.reldens.getActiveScene().objectsAnimations[target.bodyKey].key,
                type: target.type
            };
        }, {bodyKey: context.bodyKey, type: ObjectsConst.TYPE_OBJECT});
    }

    static async targetSelf(page)
    {
        await page.evaluate((playerType) => {
            window.reldens.getActiveScene().player.currentTarget = {
                id: window.reldens.activeRoomEvents.room.sessionId,
                type: playerType
            };
        }, GameConst.TYPE_PLAYER);
    }

    static async clickWhenReady(page, context, skillKey)
    {
        await expect.poll(
            async () => (await CombatSkillCasting.fetchSkill(context, skillKey)).isReady,
            {message: skillKey+' must be ready', timeout: context.timeout}
        ).toBe(true);
        await page.click(Selectors.combat.skillButton(skillKey), {force: true});
    }

    static async startCast(page, context, skillKey)
    {
        await CombatSkillCasting.clickWhenReady(page, context, skillKey);
        await expect.poll(
            async () => (await CombatSkillCasting.fetchSkill(context, skillKey)).isCasting,
            {message: 'The '+skillKey+' cast must start', timeout: context.timeout}
        ).toBe(true);
    }

    static async castSkill(page, context, skillKey, expectedDamagesCount)
    {
        await CombatSkillCasting.clickWhenReady(page, context, skillKey);
        await expect.poll(
            async () => (await CombatSkillCasting.fetchRecorded(context)).damages.length,
            {message: skillKey+' damage must be recorded', timeout: context.timeout}
        ).toBe(expectedDamagesCount);
        return [...(await CombatSkillCasting.fetchRecorded(context)).damages].pop();
    }

    static async waitForEndStates(context, skillKey, expectedCount)
    {
        await expect.poll(
            async () => (await CombatSkillCasting.fetchRecorded(context)).endStates.filter(
                endState => skillKey === endState.skillKey
            ),
            {message: skillKey+' must run its logic', timeout: context.timeout}
        ).toHaveLength(expectedCount);
        return [...(await CombatSkillCasting.fetchRecorded(context)).endStates].pop();
    }

    static async expectSkillRun(page, context, skillKey, isAccepted, label)
    {
        let endStatesCount = (await CombatSkillCasting.fetchRecorded(context)).endStates.length;
        await CombatSkillCasting.clickWhenReady(page, context, skillKey);
        await page.waitForTimeout(CombatSkillCasting.QUIET_MS);
        await expect.poll(
            async () => (await CombatSkillCasting.fetchRecorded(context)).endStates.length,
            {message: label, timeout: context.timeout}
        ).toBe(endStatesCount + (isAccepted ? 1 : 0));
    }

    static async expectNothingApplied(page, context, expectedDamagesCount, waitMs, label)
    {
        await page.waitForTimeout(waitMs);
        expect((await CombatSkillCasting.fetchRecorded(context)).damages.length, label).toBe(expectedDamagesCount);
    }

}

module.exports.CombatSkillCasting = CombatSkillCasting;
