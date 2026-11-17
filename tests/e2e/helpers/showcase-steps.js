/**
 *
 * Reldens - Showcase Steps
 *
 * Steps of the long run videos on top of LongRunShowcase: a caption kept on screen for a while, a click the fake cursor
 * makes visible (hovered and held before the click, on the corner of the element so the cursor never hides its text,
 * the normal run only clicks), a click on a game object followed by the pointer leaving it (a pointer that stays over
 * the object, or goes from it to a DOM dialog, keeps its hover highlight on), a config value overridden only for the
 * long run (until the next group reset), the walk of the player toward the map center (to the walkable tile closest
 * to the center, or to a point some tiles away on the way to it) and the player
 * placed on the map center before the recording, with the game camera centered for the zoomed view of a map smaller
 * than the screen, because the game only centers it for the not zoomed view (GameEngine.centerSmallMapsCamera) and the
 * zoomed view would keep the player on the right side with part of the map out of the screen.
 *
 */

const { expect } = require('@playwright/test');
const { LongRunShowcase } = require('./long-run-showcase');
const { MovementScenario } = require('./movement-scenario');
const { RoomMovementApi } = require('./room-movement-api');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { WalkableTileLocator } = require('./walkable-tile-locator');
const { Phaser } = require('./phaser');
const { TimeConstants } = require('./time-constants');
const { Selectors } = require('../selectors');
const { sc } = require('@reldens/utils');

class ShowcaseSteps
{

    static TILES_RADIUS = 3;
    static WHOLE_WAY_TILES = Number.MAX_SAFE_INTEGER;
    static CORNER_CLICK = {position: {x: 4, y: 4}};
    static POINTER_REST_HEIGHT_RATIO = 0.85;

    static async showAndPause(page, stepText, longRun)
    {
        await LongRunShowcase.showStep(page, stepText, longRun);
        return await LongRunShowcase.pause(page, longRun);
    }

    static async click(page, locator, longRun)
    {
        if(!longRun){
            return await locator.click();
        }
        await locator.hover(ShowcaseSteps.CORNER_CLICK);
        await page.waitForTimeout(TimeConstants.pauseMs(longRun));
        await locator.click(ShowcaseSteps.CORNER_CLICK);
    }

    static async clickObjectAndLeave(page, objectKey, longRun)
    {
        await Phaser.clickObject(page, objectKey);
        if(!longRun){
            return false;
        }
        let canvasBox = await page.locator(Selectors.canvas).boundingBox();
        await page.mouse.move(
            canvasBox.x + canvasBox.width / 2,
            canvasBox.y + canvasBox.height * ShowcaseSteps.POINTER_REST_HEIGHT_RATIO
        );
        return true;
    }

    static async overrideConfig(gameConfig, e2eGroup, configPath, value, longRun)
    {
        if(!longRun){
            return false;
        }
        return await E2eSeedAndRestoreApi.overrideConfig(gameConfig, e2eGroup, configPath, value);
    }

    static async fetchMapCenterTile(page, timeout)
    {
        return await (await page.waitForFunction(() => {
            let map = window.reldens.getActiveScene()?.map;
            return map ? [Math.floor(map.width / 2), Math.floor(map.height / 2)] : false;
        }, null, {timeout})).jsonValue();
    }

    static mapTileAtRatio(fromTile, toTile, walkRatio)
    {
        return [
            Math.round(fromTile[0] + (toTile[0] - fromTile[0]) * walkRatio),
            Math.round(fromTile[1] + (toTile[1] - fromTile[1]) * walkRatio)
        ];
    }

    static mapTileOnWay(player, centerTile, maxTiles)
    {
        return ShowcaseSteps.mapTileAtRatio(
            [player.currentCol, player.currentRow],
            centerTile,
            Math.min(1, maxTiles / Math.hypot(centerTile[0] - player.currentCol, centerTile[1] - player.currentRow))
        );
    }

    static async fetchClosestWalkableTile(gameConfig, roomName, tile)
    {
        return [...WalkableTileLocator.findClosestTiles(
            (await RoomMovementApi.fetchTiles(gameConfig, roomName, tile, ShowcaseSteps.TILES_RADIUS)).walkable,
            tile,
            1
        )].shift();
    }

    static async walkTowardMapCenter(page, gameConfig, roomName, playerName, maxTiles, timeout)
    {
        await Phaser.waitForPlayerInRoomState(page, timeout);
        return await MovementScenario.movePlayer(
            page,
            {
                fetchPlayer: async () => await RoomMovementApi.fetchPlayer(gameConfig, roomName, playerName),
                isStill: (snapshot) => 0 === snapshot.pathSteps && 0 === snapshot.velocityX && 0 === snapshot.velocityY
            },
            await ShowcaseSteps.fetchClosestWalkableTile(
                gameConfig,
                roomName,
                ShowcaseSteps.mapTileOnWay(
                    await RoomMovementApi.fetchPlayer(gameConfig, roomName, playerName),
                    await ShowcaseSteps.fetchMapCenterTile(page, timeout),
                    maxTiles
                )
            ),
            timeout
        );
    }

    static async centerSmallMapCamera(page)
    {
        return await page.evaluate((zoom) => {
            let scene = window.reldens.getActiveScene();
            let camera = scene.cameras.main;
            camera.setPosition(
                Math.max(0, (camera.width - scene.map.widthInPixels * zoom) / 2),
                Math.max(0, (camera.height - scene.map.heightInPixels * zoom) / 2)
            );
            return true;
        }, LongRunShowcase.CAMERA_ZOOM);
    }

    static async placePlayerOnMapCenter(page, gameConfig, roomName, playerName, longRun)
    {
        if(!longRun){
            return false;
        }
        let movement = await ShowcaseSteps.walkTowardMapCenter(
            page,
            gameConfig,
            roomName,
            playerName,
            ShowcaseSteps.WHOLE_WAY_TILES,
            TimeConstants.forLongRun(TimeConstants.NAVIGATION, longRun)
        );
        expect(movement.done, 'The player must walk to the map center: '+sc.toJsonString(movement.last)).toBe(true);
        return await ShowcaseSteps.centerSmallMapCamera(page);
    }

}

module.exports.ShowcaseSteps = ShowcaseSteps;
