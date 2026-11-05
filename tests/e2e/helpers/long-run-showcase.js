/**
 *
 * Reldens - Long Run Showcase
 *
 * Steps that run only in the long run, so its videos show the result of the tested feature: record the video from the
 * game start (the login and the player selection are skipped, a bottom banner names the test), keep the screen still
 * for a while, zoom the game camera on the player (the DOM panels keep their size), open the panel that shows the
 * feature data, wait until an element or a polled value shows the expected state, move the player to the center of
 * the map (with the aggressive enemies disabled first, so none attacks on arrival, and preferring an enemy far enough
 * from the map borders that the camera keeps the player at the center, away from the panels) and target an enemy
 * some tiles away, so its life bar is visible and no battle starts from the bodies touching. The normal run skips
 * them.
 *
 */

const { expect, test } = require('@playwright/test');
const { BaseE2eTest } = require('../base-e2e-test');
const { RoomObjectsApi } = require('./room-objects-api');
const { TimeConstants } = require('./time-constants');
const { GameConst } = require('../../../lib/game/constants');
const { ObjectsConst } = require('../../../lib/objects/constants');
const { sc } = require('@reldens/utils');

class LongRunShowcase
{

    static OVER_PLAYER_LAYER_NAME = 'over-player';
    static CLEAR_TILES_RADIUS = 2;
    static TARGET_DISTANCE_TILES = 2;
    static CAMERA_ZOOM = 2;
    static CAMERA_ZOOM_MS = 1000;

    static async startGameplayRecording(page, longRun)
    {
        if(!longRun){
            return false;
        }
        await BaseE2eTest.startGameplayRecording(page, test.info());
        return await LongRunShowcase.pause(page, longRun);
    }

    static async pause(page, longRun)
    {
        if(!longRun){
            return false;
        }
        await page.waitForTimeout(TimeConstants.SHOWCASE);
        return true;
    }

    static async zoomCamera(page, longRun)
    {
        if(!longRun){
            return false;
        }
        await page.evaluate(
            (zoomData) => window.reldens.getActiveScene().cameras.main.zoomTo(zoomData.zoom, zoomData.duration),
            {zoom: LongRunShowcase.CAMERA_ZOOM, duration: LongRunShowcase.CAMERA_ZOOM_MS}
        );
        return await LongRunShowcase.pause(page, longRun);
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
        let enemies = await LongRunShowcase.filterCenteredObjects(
            page,
            passiveEnemies.filter(enemy => uncoveredKeys.includes(enemy.key))
        );
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

    static async filterCenteredObjects(page, roomObjects)
    {
        let viewArea = await page.evaluate((targetDistanceTiles) => ({
            halfWidth: window.reldens.getActiveScene().cameras.main.displayWidth / 2
                + window.reldens.getActiveScene().map.tileWidth * targetDistanceTiles,
            halfHeight: window.reldens.getActiveScene().cameras.main.displayHeight / 2
                + window.reldens.getActiveScene().map.tileWidth * targetDistanceTiles,
            mapWidth: window.reldens.getActiveScene().map.widthInPixels,
            mapHeight: window.reldens.getActiveScene().map.heightInPixels
        }), LongRunShowcase.TARGET_DISTANCE_TILES);
        let centeredObjects = roomObjects.filter(
            roomObject => viewArea.halfWidth <= roomObject.x
                && viewArea.mapWidth - viewArea.halfWidth >= roomObject.x
                && viewArea.halfHeight <= roomObject.y
                && viewArea.mapHeight - viewArea.halfHeight >= roomObject.y
        );
        if(0 === centeredObjects.length){
            return roomObjects;
        }
        return centeredObjects;
    }

    static async placePlayerAwayFromObject(page, gameConfig, roomName, objectKey, timeout)
    {
        let placement = await RoomObjectsApi.placePlayerNextToObject(
            page,
            gameConfig,
            roomName,
            objectKey,
            timeout,
            LongRunShowcase.TARGET_DISTANCE_TILES
        );
        expect(placement.reached, 'The player must be placed near the object: '+sc.toJsonString(placement)).toBe(true);
        return placement;
    }

    static async moveToCentralArea(page, gameConfig, roomName, timeout, longRun)
    {
        if(!longRun){
            return false;
        }
        await RoomObjectsApi.disableEnemies(gameConfig, roomName, true);
        await LongRunShowcase.placePlayerAwayFromObject(
            page,
            gameConfig,
            roomName,
            await LongRunShowcase.findCentralPassiveEnemyKey(page, gameConfig, roomName, '', longRun),
            timeout
        );
        return await LongRunShowcase.pause(page, longRun);
    }

    static async targetObjectNextToPlayer(page, gameConfig, roomName, objectKey, timeout, longRun)
    {
        if(!longRun){
            return false;
        }
        let placement = await LongRunShowcase.placePlayerAwayFromObject(page, gameConfig, roomName, objectKey, timeout);
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
