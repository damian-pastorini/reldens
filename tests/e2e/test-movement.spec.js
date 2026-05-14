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

    static async chaseEnemy(page, enemyKey, range, timeout)
    {
        return Navigation.moveToObjectWithinRange(
            page,
            enemyKey ? 'asset_key' : 'type',
            enemyKey || 'enemy',
            enemyKey ? 'active' : 'visible',
            range,
            timeout
        );
    }

    static async runReturnPointTest(page, screenshots, gameConfig, longRun)
    {
        let returnRoom = gameConfig.e2eReturnRoom || '';
        let enemyKey = gameConfig.e2eEnemyKey || '';
        expect(returnRoom, 'e2eReturnRoom not configured for return point test').toBeTruthy();
        await TestMovement.loginAndPrepare(page, gameConfig, longRun, 'reldens-forest');
        let pauseMs = TimeConstants.pauseMs(longRun);
        let sceneTimeout = TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, longRun);
        let navTimeout = TimeConstants.forLongRun(TimeConstants.NAVIGATION, longRun);
        let inForest = await Navigation.ensureInRoom(page, 'reldens-forest', 608, 16, navTimeout);
        expect(inForest, 'Player must reach reldens-forest before continuing').toBeTruthy();
        await screenshots.capture(page, 'in-forest-before-death');
        await (enemyKey
            ? Phaser.waitForObjectByAssetKey(page, enemyKey, sceneTimeout)
            : Phaser.waitForObjectByType(page, 'enemy', sceneTimeout));
        test.setTimeout(
            TimeConstants.forLongRun(TimeConstants.GAME_START + TimeConstants.NAVIGATION, longRun)
            + TimeConstants.ENEMY_KILL
            + TimeConstants.PLAYER_REVIVE
        );
        await TestMovement.chaseEnemy(page, enemyKey, 80, navTimeout);
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
            await TestMovement.chaseEnemy(page, enemyKey, 80, Math.min(6000, remaining));
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
        await page.evaluate((args) => {
            let scene = window.reldens.getActiveScene();
            if(!scene || !scene.cameras || !scene.cameras.main){
                return;
            }
            let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            let player = room && room.state && room.state.players
                ? window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId)
                : null;
            if(!player){
                return;
            }
            let worldX = player.state.x + args.dx;
            let worldY = player.state.y + args.dy;
            let tileSize = 32;
            window.reldens.activeRoomEvents.send({
                'act': 'mp',
                'column': Math.floor(worldX / tileSize),
                'row': Math.floor(worldY / tileSize),
                'x': worldX,
                'y': worldY
            });
        }, { dx, dy });
    }

    static async walkUntilRoomChanged(page, initialRoom, maxAttempts, waitMs)
    {
        let directions = ['ArrowUp', 'ArrowLeft', 'ArrowRight', 'ArrowDown'];
        for(let attempt = 0; attempt < maxAttempts; attempt++){
            let currentRoom = await Navigation.getCurrentRoomName(page);
            if(currentRoom !== initialRoom){
                return true;
            }
            let direction = directions[attempt % directions.length];
            await Navigation.walkInDirection(page, direction, waitMs);
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
                await Login.loginAndStartGame(page, username, password, playerName, longRun, false, 'reldens-town');
                let roomTimeout = TimeConstants.forLongRun(TimeConstants.ROOM_TRANSITION, longRun);
                await Navigation.waitForRoom(page, 'reldens-town', roomTimeout);
                let initialRoom = await Navigation.getCurrentRoomName(page);
                await screenshots.capture(page, 'in-town-before-transition');
                let reached = await TestMovement.walkUntilRoomChanged(page, initialRoom, 30, 1500);
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
