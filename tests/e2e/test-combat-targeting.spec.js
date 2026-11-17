/**
 *
 * Reldens - Test Combat Targeting
 *
 * Tests the client target selection with the keyboard: ESC clears the target and closes the target box, TAB selects
 * the closest object (the placed enemy, its random movement stopped) and shows its stored title in the target box, the
 * next TAB moves to another object, TAB in a room with nothing to target leaves no target and throws nothing, and the
 * target box close button clears the target, empties the box and closes it. The closest candidates are read from the
 * same client sprites the TAB reads, right before the key press.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { InterpolationFramesRecorder } = require('./helpers/interpolation-frames-recorder');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombatTargeting
{

    static EMPTY_ROOM_NAME = 'reldens-new-age-town-house-03';
    static TARGET_CONTAINER = '#target-container';
    static CLOSE_TARGET_BUTTON = '#box-target .close-target';
    static NOTHING_CHANGED_WAIT_MS = 500;

    static async fetchCandidates(page)
    {
        return await page.evaluate((types) => {
            let player = window.reldens.getCurrentPlayer();
            let objects = window.reldens.getActiveScene().objectsAnimations;
            let candidates = Object.keys(objects).filter(key => objects[key].targetName).map(key => ({
                id: objects[key].key,
                type: types.object,
                name: objects[key].targetName,
                distance: Math.hypot(objects[key].x - player.state.x, objects[key].y - player.state.y)
            }));
            for(let sessionId of Object.keys(player.players)){
                let otherPlayer = player.players[sessionId];
                if(player.playerName === otherPlayer.playerName){
                    continue;
                }
                candidates.push({
                    id: sessionId,
                    type: types.player,
                    name: otherPlayer.playerName,
                    distance: Math.hypot(otherPlayer.x - player.state.x, otherPlayer.y - player.state.y)
                });
            }
            return candidates.sort((first, second) => first.distance - second.distance);
        }, {object: ObjectsConst.TYPE_OBJECT, player: GameConst.TYPE_PLAYER});
    }

    static async pressKey(page, key)
    {
        await page.keyboard.press(key);
        await page.waitForTimeout(TestCombatTargeting.NOTHING_CHANGED_WAIT_MS);
        return await page.evaluate(() => window.reldens.getCurrentPlayer().currentTarget);
    }

    static async clearTarget(page)
    {
        expect(await TestCombatTargeting.pressKey(page, 'Escape'), 'ESC clears the target').toBe(false);
        await expect(page.locator(Selectors.combat.targetBox), 'ESC closes the target box').toBeHidden();
    }

    static async expectBoxName(page, targetName)
    {
        await expect(page.locator(Selectors.combat.targetBox)).toBeVisible();
        await expect(page.locator(TestCombatTargeting.TARGET_CONTAINER)).toHaveText(targetName);
    }

    static async runObjectsTabTest(page, screenshots, gameConfig, longRun)
    {
        let entered = await ForestEnemyKill.enterForestWithPlacedEnemy(page, gameConfig, longRun);
        let enemyTitle = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'objects', {
            client_key: gameConfig.e2eEnemyKey
        })).shift().title;
        await TestCombatTargeting.clearTarget(page);
        let closest = [...await TestCombatTargeting.fetchCandidates(page)].shift();
        expect(closest.id, 'The placed enemy is the closest target').toBe(entered.placement.enemyKey);
        let firstTarget = await TestCombatTargeting.pressKey(page, 'Tab');
        expect([firstTarget.id, firstTarget.type], 'TAB selects the closest').toEqual([closest.id, closest.type]);
        await TestCombatTargeting.expectBoxName(page, enemyTitle);
        await screenshots.capture(page, 'tab-closest-enemy');
        let secondTarget = await TestCombatTargeting.pressKey(page, 'Tab');
        expect(secondTarget.id, 'The next TAB selects another target').not.toBe(firstTarget.id);
        let secondCandidate = (await TestCombatTargeting.fetchCandidates(page)).find(
            candidate => secondTarget.id === candidate.id
        );
        await TestCombatTargeting.expectBoxName(page, secondCandidate.name);
        await TestCombatTargeting.clearTarget(page);
    }

    static async runNothingToTargetTest(page, screenshots, gameConfig, longRun)
    {
        let pageErrors = InterpolationFramesRecorder.trackPageErrors(page);
        await Login.startConfigPlayer(page, gameConfig, longRun, TestCombatTargeting.EMPTY_ROOM_NAME);
        expect(await TestCombatTargeting.fetchCandidates(page), 'Nothing to target').toEqual([]);
        expect(await TestCombatTargeting.pressKey(page, 'Tab'), 'No target').toBe(false);
        await expect(page.locator(Selectors.combat.targetBox), 'No empty target box opened').toBeHidden();
        expect(pageErrors, 'No client error').toEqual([]);
        await screenshots.capture(page, 'tab-nothing-to-target');
    }

    static async runCloseButtonTest(page, screenshots, gameConfig, longRun)
    {
        let entered = await ForestEnemyKill.enterForestWithPlacedEnemy(page, gameConfig, longRun);
        await TestCombatTargeting.clearTarget(page);
        let target = await TestCombatTargeting.pressKey(page, 'Tab');
        expect(target.id, 'TAB selects the placed enemy').toBe(entered.placement.enemyKey);
        await expect(page.locator(Selectors.combat.targetBox), 'The target box is open').toBeVisible();
        await page.click(TestCombatTargeting.CLOSE_TARGET_BUTTON);
        await expect.poll(
            async () => await page.evaluate(() => window.reldens.getCurrentPlayer().currentTarget),
            {message: 'The close button clears the target', timeout: TestCombatTargeting.NOTHING_CHANGED_WAIT_MS * 4}
        ).toBe(false);
        await expect(page.locator(Selectors.combat.targetBox), 'The close button closes the target box').toBeHidden();
        await expect(page.locator(TestCombatTargeting.TARGET_CONTAINER), 'The target box is emptied').toHaveText('');
    }

    static run()
    {
        test.describe('Combat Targeting', () => {
            test('ESC clears the target, TAB selects the closest object and the next TAB another one', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCombatTargeting.runObjectsTabTest(page, screenshots, gameConfig, longRun);
            });
            test('TAB with nothing to target leaves no target and no error', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCombatTargeting.runNothingToTargetTest(page, screenshots, gameConfig, longRun);
            });
            test('target box close button clears the target and closes the box', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestCombatTargeting.runCloseButtonTest(page, screenshots, gameConfig, longRun);
            });
        });
    }

}

TestCombatTargeting.run();
