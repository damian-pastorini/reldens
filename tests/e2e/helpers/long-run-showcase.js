/**
 *
 * Reldens - Long Run Showcase
 *
 * Steps that run only in the long run, so its videos show the result of the tested feature: keep the screen still for
 * a while, open the panel that shows the feature data, wait until an element or a polled value shows the expected
 * state, and place an enemy next to the player targeting it, so its life bar is visible. The normal run skips them.
 *
 */

const { expect } = require('@playwright/test');
const { RoomObjectsApi } = require('./room-objects-api');
const { TimeConstants } = require('./time-constants');
const { GameConst } = require('../../../lib/game/constants');
const { ObjectsConst } = require('../../../lib/objects/constants');
const { sc } = require('@reldens/utils');

class LongRunShowcase
{

    static OVER_PLAYER_LAYER_NAME = 'over-player';
    static CLEAR_TILES_RADIUS = 2;

    static async pause(page, longRun)
    {
        if(!longRun){
            return false;
        }
        await page.waitForTimeout(TimeConstants.SHOWCASE);
        return true;
    }

    static async openPanel(page, openSelector, panelSelector, longRun)
    {
        if(!longRun){
            return false;
        }
        await page.click(openSelector);
        await expect(page.locator(panelSelector)).toBeVisible();
        return await LongRunShowcase.pause(page, longRun);
    }

    static async showElementsCount(page, selector, count, timeout, longRun)
    {
        if(!longRun){
            return false;
        }
        await expect(page.locator(selector)).toHaveCount(count, {timeout});
        return await LongRunShowcase.pause(page, longRun);
    }

    static async showWhen(page, isShown, message, timeout, longRun)
    {
        if(!longRun){
            return false;
        }
        await expect.poll(isShown, {message, timeout}).toBe(true);
        return await LongRunShowcase.pause(page, longRun);
    }

    static async findCentralPassiveEnemyKey(page, gameConfig, roomName, enemyKey, longRun)
    {
        if(!longRun){
            return enemyKey;
        }
        let passiveEnemies = (await RoomObjectsApi.fetchRoomObjects(gameConfig, roomName)).filter(
            roomObject => ObjectsConst.TYPE_ENEMY === roomObject.type
                && !roomObject.isAggressive
                && GameConst.STATUS.ACTIVE === roomObject.inState
                && 0 === roomObject.inBattle
        );
        let areaSize = await page.evaluate(
            (clearTilesRadius) => window.reldens.getActiveScene().map.tileWidth * clearTilesRadius,
            LongRunShowcase.CLEAR_TILES_RADIUS
        );
        let uncoveredKeys = await page.evaluate((args) => args.candidates.filter(
            candidate => !Object.keys(window.reldens.getActiveScene().layers).some(
                layerIndex => window.reldens.getActiveScene().layers[layerIndex]
                    && -1 !== window.reldens.getActiveScene().layers[layerIndex].layer.name.indexOf(
                        args.overPlayerLayerName
                    )
                    && 0 < window.reldens.getActiveScene().layers[layerIndex].getTilesWithinWorldXY(
                        candidate.x - args.areaSize,
                        candidate.y - args.areaSize,
                        args.areaSize * 2,
                        args.areaSize * 2,
                        {isNotEmpty: true}
                    ).length
            )
        ).map(candidate => candidate.key), {
            overPlayerLayerName: LongRunShowcase.OVER_PLAYER_LAYER_NAME,
            areaSize,
            candidates: passiveEnemies.map(enemy => ({key: enemy.key, x: enemy.x, y: enemy.y}))
        });
        let enemies = passiveEnemies.filter(enemy => uncoveredKeys.includes(enemy.key));
        let center = {
            x: enemies.reduce((total, enemy) => total + enemy.x, 0) / enemies.length,
            y: enemies.reduce((total, enemy) => total + enemy.y, 0) / enemies.length
        };
        enemies.sort(
            (first, second) => Math.hypot(first.x - center.x, first.y - center.y)
                - Math.hypot(second.x - center.x, second.y - center.y)
        );
        return sc.get([...enemies].shift(), 'key', enemyKey);
    }

    static async targetObjectNextToPlayer(page, gameConfig, roomName, objectKey, timeout, longRun)
    {
        if(!longRun){
            return false;
        }
        let placement = await RoomObjectsApi.placePlayerNextToObject(page, gameConfig, roomName, objectKey, timeout);
        expect(placement.reached, 'The player must be placed next to the object: '+sc.toJsonString(placement)).toBe(
            true
        );
        let targeted = await (await page.waitForFunction((bodyKey) => {
            let scene = window.reldens.getActiveScene();
            let animation = scene?.objectsAnimations?.[bodyKey];
            if(!scene?.player || !animation){
                return false;
            }
            scene.player.currentTarget = {id: animation.key, type: 'obj'};
            window.reldens.gameEngine.showTarget(
                animation.targetName || animation.key,
                scene.player.currentTarget,
                false
            );
            return true;
        }, placement.bodyKey, {timeout})).jsonValue();
        expect(targeted, 'The object next to the player must be targeted').toBe(true);
        return await LongRunShowcase.pause(page, longRun);
    }

}

module.exports.LongRunShowcase = LongRunShowcase;
