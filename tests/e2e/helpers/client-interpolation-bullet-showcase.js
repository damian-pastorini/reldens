/**
 *
 * Reldens - Client Interpolation Bullet Showcase
 *
 * Steps of the client interpolation bullet test that run only in the long run: a central enemy, a bullet flying at its
 * stored speed along a line short enough to keep its vertical speed (the body stops any speed below a tenth of the
 * horizontal one and the bullet starts 18.5 pixels above the target row, so a flat flight would pass over the enemy
 * sprite) and the real enemy life and stored skill magnitude in the captions. The normal run skips them.
 *
 */

const { expect } = require('@playwright/test');
const { Login } = require('./login');
const { LongRunShowcase } = require('./long-run-showcase');
const { ShowcaseSteps } = require('./showcase-steps');
const { RoomObjectsApi } = require('./room-objects-api');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { ClientInterpolationShowcase } = require('./client-interpolation-showcase');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { TimeConstants } = require('./time-constants');
const { sc } = require('@reldens/utils');

class ClientInterpolationBulletShowcase
{

    static TILES_DISTANCES = [5, 4, 3];

    static async findCentralEnemy(page, gameConfig, enemy, longRun)
    {
        if(!longRun){
            return enemy;
        }
        let enemyKey = await LongRunShowcase.findCentralPassiveEnemyKey(
            page,
            gameConfig,
            Login.FOREST_ROOM_NAME,
            enemy.key,
            longRun
        );
        let enemies = await RoomObjectsApi.fetchRoomObjects(gameConfig, Login.FOREST_ROOM_NAME);
        let centralEnemy = enemies.find(snapshot => enemyKey === snapshot.key);
        expect(centralEnemy, 'The central enemy '+enemyKey+' must be in the room snapshot').toBeTruthy();
        return centralEnemy;
    }

    static async fetchEnemyLifeText(gameConfig, bodyKey)
    {
        let enemyLife = await GameplayE2eStateApi.fetchEnemyLife(gameConfig, Login.FOREST_ROOM_NAME, bodyKey);
        expect(enemyLife.totalLife, 'The enemy life must be readable: '+sc.toJsonString(enemyLife)).toBeGreaterThan(0);
        return enemyLife.life+' of '+enemyLife.totalLife;
    }

    static async fetchStoredMagnitude(gameConfig, skillKey)
    {
        let physicalData = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'skillsSkillPhysicalData', {
            skill_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'skillsSkill', {key: skillKey})
        })].shift();
        expect(physicalData, 'The skill '+skillKey+' must have its stored physical data').toBeTruthy();
        return physicalData.magnitude;
    }

    static async prepareFlight(page, gameConfig, skillKey, bodyKey, longRun)
    {
        if(!longRun){
            return false;
        }
        return await ClientInterpolationShowcase.startRecording(
            page,
            'The player shoots the enemy with HP '
                +await ClientInterpolationBulletShowcase.fetchEnemyLifeText(gameConfig, bodyKey)
                +': bullet speed '
                +await ClientInterpolationBulletShowcase.fetchStoredMagnitude(gameConfig, skillKey)
                +' in the physics world',
            longRun
        );
    }

    static async showResult(page, gameConfig, bodyKey, summary, longRun)
    {
        if(!longRun){
            return false;
        }
        return await ShowcaseSteps.showAndPause(
            page,
            'The bullet flight ended: enemy HP '
                +await ClientInterpolationBulletShowcase.fetchEnemyLifeText(gameConfig, bodyKey)+', '
                +summary.frames+' frames, '+summary.mismatches.length+' mismatches',
            longRun
        );
    }

    static async hoverBeforeClick(page, selector, longRun)
    {
        if(!longRun){
            return false;
        }
        await page.hover(selector, {force: true});
        await page.waitForTimeout(TimeConstants.pauseMs(longRun));
        return true;
    }

}

module.exports.ClientInterpolationBulletShowcase = ClientInterpolationBulletShowcase;
