/**
 *
 * Reldens - Test Movement
 *
 * Tests arrow key movement, all directions, room transitions, minimap, and return-point on death.
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { Navigation } = require('./helpers/navigation');
const { ObjectChase } = require('./helpers/object-chase');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestMovement
{
    static DEATH_CHASE_RANGE = 40;
    static TOWN_DOOR_COLUMN = 44;
    static TOWN_DOOR_ROW = 39;
    static TOWN_DOOR_ARRIVAL_RANGE = 24;
    static DOOR_MOVE_RETRY_MS = 1000;
    static DOOR_STEP_MS = 1500;
    static DOOR_ENTER_ATTEMPTS = 4;

    static async loginAndPrepare(page, gameConfig, longRun, scene = null)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        page.on('dialog', dialog => dialog.dismiss());
        await Login.loginAndStartGame(page, username, password, playerName, longRun, false, scene);
        await Phaser.waitForPlayerInRoomState(page, TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun));
        await Navigation.focusGame(page);
    }

    static async runReturnPointTest(page, screenshots, gameConfig, longRun)
    {
        let returnRoom = gameConfig.e2eReturnRoom || '';
        let enemyKey = gameConfig.e2eEnemyKey || '';
        expect(returnRoom, 'e2eReturnRoom not configured for return point test').toBeTruthy();
        page.on('dialog', dialog => dialog.dismiss());
        let forestData = await Login.loginAndEnterForest(page, gameConfig, longRun);
        let pauseMs = forestData.pauseMs;
        let sceneTimeout = forestData.sceneTimeout;
        let navTimeout = forestData.navTimeout;
        await Phaser.waitForPlayerInRoomState(page, sceneTimeout);
        await Navigation.focusGame(page);
        await screenshots.capture(page, 'in-forest-before-death');
        await (enemyKey
            ? Phaser.waitForObjectByAssetKey(page, enemyKey, sceneTimeout)
            : Phaser.waitForObjectByType(page, 'enemy', sceneTimeout));
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
            + TimeConstants.ENEMY_KILL
            + TimeConstants.PLAYER_REVIVE
        );
        await ObjectChase.moveToEnemyWithinRange(page, enemyKey, TestMovement.DEATH_CHASE_RANGE, navTimeout);
        let deathDeadline = Date.now() + TimeConstants.ENEMY_KILL;
        let deathMaxSteps = Math.ceil(TimeConstants.ENEMY_KILL / 500) + 1;
        let isDead = false;
        for(let i = 0; i < deathMaxSteps; i++){
            isDead = await page.evaluate(() => {
                return null !== document.querySelector('#game-over:not(.hidden)');
            });
            if(isDead){
                break;
            }
            let remaining = deathDeadline - Date.now();
            if(0 >= remaining){
                break;
            }
            await ObjectChase.moveToEnemyWithinRange(
                page,
                enemyKey,
                TestMovement.DEATH_CHASE_RANGE,
                Math.min(6000, remaining)
            );
            let waitMs = Math.min(1000, deathDeadline - Date.now());
            if(0 < waitMs){
                await page.waitForTimeout(waitMs);
            }
        }
        expect(isDead, 'Player must die from enemy attacks within timeout').toBeTruthy();
        await screenshots.capture(page, 'player-died-in-forest');
        await Navigation.waitForRoom(page, returnRoom, TimeConstants.PLAYER_REVIVE);
        let currentRoom = await Navigation.getCurrentRoomName(page);
        expect(currentRoom).toBe(returnRoom);
        await page.waitForTimeout(pauseMs);
        await screenshots.capture(page, 'player-at-return-point-after-death');
    }

    static async sendPointerOriginMove(page, dx, dy)
    {
        let position = await Phaser.getPlayerServerPosition(page);
        expect(position, 'Player position must be available before click-to-move').not.toBeNull();
        await Navigation.moveToWorldPoint(page, position.x + dx, position.y + dy);
    }

    static async moveBelowTownDoor(page, timeout)
    {
        let tileSize = Navigation.TILE_SIZE;
        let targetX = TestMovement.TOWN_DOOR_COLUMN * tileSize + tileSize / 2;
        let targetY = (TestMovement.TOWN_DOOR_ROW + 1) * tileSize + tileSize / 2;
        let maxChecks = Math.ceil(timeout / TestMovement.DOOR_MOVE_RETRY_MS);
        for(let check = 0; check < maxChecks; check++){
            await Navigation.moveToWorldPoint(page, targetX, targetY);
            await page.waitForTimeout(TestMovement.DOOR_MOVE_RETRY_MS);
            let position = await Phaser.getPlayerServerPosition(page);
            if(TestMovement.TOWN_DOOR_ARRIVAL_RANGE >= Math.hypot(position.x - targetX, position.y - targetY)){
                return true;
            }
        }
        return false;
    }

    static async enterTownDoor(page, initialRoom, maxAttempts, timeout)
    {
        for(let attempt = 0; attempt < maxAttempts; attempt++){
            if(await TestMovement.moveBelowTownDoor(page, timeout)){
                await Navigation.walkInDirection(page, 'ArrowUp', TestMovement.DOOR_STEP_MS);
            }
            if(initialRoom !== await Navigation.getCurrentRoomName(page)){
                return true;
            }
            Logger.error(
                'enterTownDoor attempt '+attempt+': still in '+initialRoom+' at '
                +sc.toJsonString(await Phaser.getPlayerServerPosition(page))
            );
        }
        return false;
    }

    static async runClickToMoveTest(page, screenshots, gameConfig, longRun)
    {
        await TestMovement.loginAndPrepare(page, gameConfig, longRun);
        let before = await Phaser.getPlayerServerPosition(page);
        await screenshots.capture(page, 'before-click-to-move');
        await TestMovement.sendPointerOriginMove(page, 150, 0);
        await page.waitForTimeout(2000);
        let after = await Phaser.getPlayerServerPosition(page);
        expect(before).not.toBeNull();
        expect(after).not.toBeNull();
        let moved = after.x !== before.x || after.y !== before.y;
        expect(moved, 'Player position did not change after click-to-move').toBeTruthy();
        await screenshots.capture(page, 'after-click-to-move');
    }

    static async runSceneSelectionTest(page, screenshots, gameConfig, longRun)
    {
        let username = gameConfig.e2eUsername || 'root';
        let password = gameConfig.e2ePassword || 'root';
        let playerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(page, username, password, playerName, longRun, false, Login.FOREST_ROOM_NAME);
        await Navigation.waitForRoom(
            page,
            Login.FOREST_ROOM_NAME,
            TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, longRun)
        );
        let currentRoom = await Navigation.getCurrentRoomName(page);
        expect(currentRoom, 'Player must start in the selected scene '+Login.FOREST_ROOM_NAME).toBe(Login.FOREST_ROOM_NAME);
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
                await Login.loginAndStartGame(page, username, password, playerName, longRun, false, Login.TOWN_ROOM_NAME);
                let roomTimeout = TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, longRun);
                await Navigation.waitForRoom(page, Login.TOWN_ROOM_NAME, roomTimeout);
                let initialRoom = await Navigation.getCurrentRoomName(page);
                await screenshots.capture(page, 'in-town-before-transition');
                let reached = await TestMovement.enterTownDoor(
                    page,
                    initialRoom,
                    TestMovement.DOOR_ENTER_ATTEMPTS,
                    TimeConstants.forLongRun(TimeConstants.NAVIGATION, longRun)
                );
                expect(reached, 'Player must enter a new room via transition tile').toBeTruthy();
                let currentRoom = await Navigation.getCurrentRoomName(page);
                expect(currentRoom).not.toBe(initialRoom);
                await screenshots.capture(page, 'in-new-room-after-transition');
            });
            test('minimap panel opens when button is clicked', async ({ page, screenshots, gameConfig, longRun }) => {
                let username = gameConfig.e2eUsername || 'root';
                let password = gameConfig.e2ePassword || 'root';
                let playerName = gameConfig.e2ePlayerName || 'ImRoot';
                await Login.loginAndStartGame(page, username, password, playerName, longRun);
                let pauseMs = TimeConstants.pauseMs(longRun);
                let uiTimeout = TimeConstants.forLongRun(TimeConstants.UI_OPEN, longRun);
                await page.locator(Selectors.hud.minimapOpen).waitFor({ state: 'visible', timeout: uiTimeout });
                await page.click(Selectors.hud.minimapOpen);
                await page.waitForTimeout(pauseMs);
                await expect(page.locator(Selectors.hud.minimapUi)).not.toHaveClass(/hidden/, { timeout: uiTimeout });
                await screenshots.capture(page, 'minimap-panel-open');
            });
            test('player returns to configured return point after death', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestMovement.runReturnPointTest(page, screenshots, gameConfig, longRun);
            });
            test('player can select a scene at login and starts in that room', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestMovement.runSceneSelectionTest(page, screenshots, gameConfig, longRun);
            });
            test('click-to-move changes player position', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestMovement.runClickToMoveTest(page, screenshots, gameConfig, longRun);
            });
        });
    }
}

TestMovement.run();
