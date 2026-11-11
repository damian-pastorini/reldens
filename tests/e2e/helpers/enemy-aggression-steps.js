/**
 *
 * Reldens - Enemy Aggression Steps
 *
 * Steps for the specs about how a placed forest enemy starts and ends its battles (CombatSkillCasting context): the
 * stored "interactionRadio" of the configured enemy (read from the collected game data), the player placement for an
 * aggression check (RoomAggressionPlacement, which releases the held aggression), the enemy held next to the player
 * again, the move of the player to the densest tile of the enemy respawn layer with the enemy held next to it there
 * (the forest players start away from the respawn areas and the enemy chase only walks on its respawn layer), the
 * quiet wait that proves the enemy is in no battle, and the chase: the stored skill of the enemy, the player placed on
 * the respawn layer out of that skill range, the enemy battle started in place until the enemy walks away from its
 * origin, and the wait until the enemy left the battle and walked back to its origin.
 *
 */

const { expect } = require('@playwright/test');
const { BaseE2eTest } = require('../base-e2e-test');
const { CombatSkillCasting } = require('./combat-skill-casting');
const { RoomObjectsApi } = require('./room-objects-api');
const { ForestEnemyKill } = require('./forest-enemy-kill');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { Navigation } = require('./navigation');
const { Login } = require('./login');

class EnemyAggressionSteps
{

    static QUIET_MS = 2000;
    static AREA_EXTRA_TILES = 4;
    static OUT_OF_RANGE_TILES = 1;
    static FAR_RANGE_TILES = 3;

    static loadInteractionRadio(gameConfig)
    {
        return BaseE2eTest.loadRoomEntries(Login.FOREST_ROOM_NAME, ['respawnAreas']).find(
            respawnArea => gameConfig.e2eEnemyKey === respawnArea.assetKey
        ).interactionRadio;
    }

    static async placeForAggression(page, context, placement, label)
    {
        let placed = await RoomObjectsApi.placePlayerForAggression(
            page,
            context.gameConfig,
            context.roomName,
            context.bodyKey,
            placement,
            context.timeout
        );
        expect(placed.reached, label+': '+placed.error).toBe(true);
        return placed;
    }

    static async placeEnemyNextToPlayer(page, context, holdAggression)
    {
        let placement = await RoomObjectsApi.placeAndTargetEnemy(
            page,
            context.gameConfig,
            context.roomName,
            context.enemyKey,
            ForestEnemyKill.FULL_LIFE,
            context.timeout,
            holdAggression
        );
        expect(placement.bodyKey, 'The enemy must be placed next to the player: '+placement.error).toBe(context.bodyKey);
    }

    static async moveToRespawnArea(page, context, interactionRadio)
    {
        await EnemyAggressionSteps.placeEnemyNextToPlayer(page, context, true);
        let inArea = await RoomObjectsApi.placePlayerInRespawnArea(
            page,
            context.gameConfig,
            context.roomName,
            context.bodyKey,
            interactionRadio + EnemyAggressionSteps.AREA_EXTRA_TILES * Navigation.TILE_SIZE,
            context.timeout
        );
        expect(inArea.reached, 'The player must stand on the enemy respawn area: '+inArea.error).toBe(true);
        await EnemyAggressionSteps.placeEnemyNextToPlayer(page, context, true);
    }

    static async expectNoBattle(page, context, label)
    {
        await page.waitForTimeout(EnemyAggressionSteps.QUIET_MS);
        expect(await CombatSkillCasting.fetchEnemyInBattle(context), label).toBe(0);
    }

    static async loadEnemySkill(gameConfig, enemyKey)
    {
        return (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsSkill', {
            id: [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'objectsSkills', {
                object_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'objects', {client_key: enemyKey})
            })].shift().skill_id
        })).shift();
    }

    static isAtOrigin(enemySnapshot)
    {
        return enemySnapshot.currentCol === enemySnapshot.originalCol
            && enemySnapshot.currentRow === enemySnapshot.originalRow;
    }

    static async startEnemyBattle(context)
    {
        let battle = await RoomObjectsApi.startEnemyBattle(
            context.gameConfig,
            context.roomName,
            context.playerName,
            context.enemyKey
        );
        expect(battle.enemyKey, 'The placed enemy battle must start: '+battle.error).toBe(context.enemyKey);
    }

    static async placeOutOfRange(page, context, enemySkill, isRespawnTile)
    {
        return await EnemyAggressionSteps.placeForAggression(page, context, {
            minimumDistance: Number(enemySkill.range) + EnemyAggressionSteps.OUT_OF_RANGE_TILES * Navigation.TILE_SIZE,
            maximumDistance: Number(enemySkill.range) + EnemyAggressionSteps.FAR_RANGE_TILES * Navigation.TILE_SIZE,
            isRespawnTile
        }, 'The player must stand out of the enemy skill range');
    }

    static async prepareChase(page, gameConfig, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let enemySkill = await EnemyAggressionSteps.loadEnemySkill(gameConfig, gameConfig.e2eEnemyKey);
        await EnemyAggressionSteps.moveToRespawnArea(page, context, EnemyAggressionSteps.loadInteractionRadio(gameConfig));
        await EnemyAggressionSteps.placeOutOfRange(page, context, enemySkill, true);
        return {context, enemySkill};
    }

    static async startChase(page, gameConfig, longRun)
    {
        let context = (await EnemyAggressionSteps.prepareChase(page, gameConfig, longRun)).context;
        await EnemyAggressionSteps.startEnemyBattle(context);
        await expect.poll(
            async () => EnemyAggressionSteps.isAtOrigin(await CombatSkillCasting.fetchEnemySnapshot(context)),
            {message: 'The enemy chases the player', timeout: context.timeout}
        ).toBe(false);
        return context;
    }

    static async expectBackToOrigin(context, leaveLabel)
    {
        await expect.poll(
            async () => await CombatSkillCasting.fetchEnemyInBattle(context),
            {message: leaveLabel, timeout: context.timeout}
        ).toBe(0);
        await expect.poll(
            async () => EnemyAggressionSteps.isAtOrigin(await CombatSkillCasting.fetchEnemySnapshot(context)),
            {message: 'The enemy walks back to its origin', timeout: context.timeout}
        ).toBe(true);
    }

}

module.exports.EnemyAggressionSteps = EnemyAggressionSteps;
