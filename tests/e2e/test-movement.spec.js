/**
 *
 * Reldens - Test Movement
 *
 * Tests arrow key movement, all directions, room transitions, minimap, and return-point on death.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { Navigation } = require('./helpers/navigation');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovement
{
    static async loginAndPrepare(page, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        page.on('dialog', dialog => dialog.dismiss());
        await Login.loginAndStartGame(page, username, password, playerName, longRun);
        await Phaser.waitForPlayerInRoomState(page, TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun));
        await Navigation.focusGame(page);
    }

    static async runReturnPointTest(page, screenshots, gameConfig, longRun)
    {
        let returnRoom = gameConfig.e2eReturnRoom || '';
        let enemyKey = gameConfig.e2eEnemyKey || '';
        test.skip(!returnRoom, 'e2eReturnRoom not configured for return point test');
        await TestMovement.loginAndPrepare(page, gameConfig, longRun);
        let pauseMs = TimeConstants.pauseMs(longRun);
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        let navTimeout = TimeConstants.forLongRun(TimeConstants.NAVIGATION, longRun);
        let inForest = await Navigation.ensureInRoom(page, 'reldens-forest', 608, 16, navTimeout);
        expect(inForest, 'Player must reach reldens-forest before continuing').toBeTruthy();
        await screenshots.capture(page, 'in-forest-before-death');
        await (enemyKey
            ? Phaser.waitForObjectByAssetKey(page, enemyKey, sceneTimeout)
            : Phaser.waitForObjectByType(page, 'enemy', sceneTimeout));
        await (enemyKey ? Phaser.clickObjectByAssetKey(page, enemyKey) : Phaser.clickObjectByType(page, 'enemy'));
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
            + TimeConstants.ENEMY_KILL
            + TimeConstants.PLAYER_REVIVE
        );
        await page.waitForFunction(() => {
            let room = window.reldens && window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!room || !room.state || !room.state.players) {
                return false;
            }
            let player = window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
            if(!player){
                return false;
            }
            if(!player.stats){
                return false;
            }
            return Number(player.stats.hp) <= 0;
        }, { timeout: TimeConstants.ENEMY_KILL });
        await screenshots.capture(page, 'player-died-in-forest');
        await Navigation.waitForRoom(page, returnRoom, TimeConstants.PLAYER_REVIVE);
        let currentRoom = await Navigation.getCurrentRoomName(page);
        expect(currentRoom).toBe(returnRoom);
        await page.waitForTimeout(pauseMs);
        await screenshots.capture(page, 'player-at-return-point-after-death');
    }

    static async runSceneSelectionTest(page, screenshots, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun, false, 'reldens-forest');
        await Navigation.waitForRoom(
            page,
            'reldens-forest',
            TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, longRun)
        );
        let currentRoom = await Navigation.getCurrentRoomName(page);
        expect(currentRoom, 'Player must start in the selected scene reldens-forest').toBe('reldens-forest');
        await screenshots.capture(page, 'started-in-selected-scene');
    }

    static run()
    {
        test.describe('Movement and World Navigation', () => {
            test('arrow key movement changes player position', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestMovement.loginAndPrepare(page, gameConfig, longRun);
                let before = await Phaser.getPlayerServerPosition(page);
                await screenshots.capture(page, 'before-arrow-movement');
                await Navigation.walkInDirection(page, 'ArrowRight', 1500);
                await page.waitForTimeout(500);
                let after = await Phaser.getPlayerServerPosition(page);
                expect(before).not.toBeNull();
                expect(after).not.toBeNull();
                let moved = after.x !== before.x || after.y !== before.y;
                expect(moved, 'Player position did not change after arrow key movement').toBeTruthy();
                await screenshots.capture(page, 'after-arrow-movement');
            });
            test('player can walk in all 4 directions', async ({ page, screenshots, gameConfig, longRun }) => {
                let pauseMs = longRun ? 300 : 200;
                await TestMovement.loginAndPrepare(page, gameConfig, longRun);
                await screenshots.capture(page, 'initial-position');
                await Navigation.walkInDirection(page, 'ArrowRight', 800);
                await page.waitForTimeout(pauseMs);
                await screenshots.capture(page, 'after-walk-right');
                await Navigation.walkInDirection(page, 'ArrowLeft', 800);
                await page.waitForTimeout(pauseMs);
                await screenshots.capture(page, 'after-walk-left');
                await Navigation.walkInDirection(page, 'ArrowDown', 800);
                await page.waitForTimeout(pauseMs);
                await screenshots.capture(page, 'after-walk-down');
                await Navigation.walkInDirection(page, 'ArrowUp', 800);
                await page.waitForTimeout(pauseMs);
                await screenshots.capture(page, 'after-walk-up');
                let position = await Phaser.getPlayerServerPosition(page);
                expect(position).not.toBeNull();
            });
            test('player walks through transition tile and enters new room', async ({ page, screenshots, gameConfig, longRun }) => {
                let username = gameConfig.e2eUsername2 || 'root2';
                let password = gameConfig.e2ePassword2 || 'root';
                let playerName = gameConfig.e2ePlayerName2 || 'ImRoot2';
                page.on('dialog', dialog => dialog.dismiss());
                await Login.loginAndStartGame(page, username, password, playerName, longRun);
                let roomTimeout = TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, longRun);
                await Navigation.waitForRoom(page, 'reldens-town', roomTimeout);
                await screenshots.capture(page, 'in-town-before-transition');
                let inForest = await Navigation.ensureInRoom(page, 'reldens-forest', 608, 16, roomTimeout);
                expect(inForest, 'Player must reach reldens-forest after transition').toBeTruthy();
                let currentRoom = await Navigation.getCurrentRoomName(page);
                expect(currentRoom).toBe('reldens-forest');
                await screenshots.capture(page, 'in-forest-after-transition');
            });
            test('minimap panel opens when button is clicked', async ({ page, screenshots, gameConfig, longRun }) => {
                let username = gameConfig.e2eUsername || 'root';
                let password = gameConfig.e2ePassword || 'root';
                let playerName = gameConfig.e2ePlayerName || 'ImRoot';
                await Login.loginAndStartGame(page, username, password, playerName, longRun);
                let pauseMs = TimeConstants.pauseMs(longRun);
                await page.click(Selectors.hud.minimapOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.hud.minimapUi)).toBeVisible();
                await expect(page.locator(Selectors.hud.minimapClose)).toBeVisible();
                await screenshots.capture(page, 'minimap-panel-open');
            });
            test('player returns to configured return point after death', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestMovement.runReturnPointTest(page, screenshots, gameConfig, longRun);
            });
            test('player can select a scene at login and starts in that room', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestMovement.runSceneSelectionTest(page, screenshots, gameConfig, longRun);
            });
            test('click-to-move changes player position', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestMovement.loginAndPrepare(page, gameConfig, longRun);
                let before = await Phaser.getPlayerServerPosition(page);
                await screenshots.capture(page, 'before-click-to-move');
                let playerCoords = await Phaser.getPlayerScreenCoords(page);
                let canvasBox = await page.locator(Selectors.canvas).boundingBox();
                await page.mouse.click(canvasBox.x + playerCoords.x + 150, canvasBox.y + playerCoords.y);
                await page.waitForTimeout(2000);
                let after = await Phaser.getPlayerServerPosition(page);
                expect(before).not.toBeNull();
                expect(after).not.toBeNull();
                let moved = after.x !== before.x || after.y !== before.y;
                expect(moved, 'Player position did not change after click-to-move').toBeTruthy();
                await screenshots.capture(page, 'after-click-to-move');
            });
        });
    }
}

TestMovement.run();
