/**
 *
 * Reldens - Test Timing Objects Cancel
 *
 * Tests the cancel rules of the timing objects on the forest mining rocks: the mining is cancelled and gives no reward
 * when the player moves (cancelOnMove), when an enemy hits the player and when another player hits the player
 * (cancelOnHit). The enemies are disabled for every case, the player is placed from the server next to the first
 * mining rock and the enemy hit case places one enemy next to the player.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { Login } = require('./helpers/login');
const { Phaser } = require('./helpers/phaser');
const { PhaserRange } = require('./helpers/phaser-range');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { Selectors } = require('./selectors');
const { sc } = require('@reldens/utils');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestTimingObjectsCancel
{
    static ENEMY_OBJECT_TYPE = 4;
    static ATTACK_SKILL_KEY = 'attackShort';

    static async assertNoRewardAfterTimingDuration(page, mining)
    {
        await TimingObjectSession.expectRewardAfterDuration(
            page,
            mining,
            mining.rewardQtyBefore,
            'A cancelled mining must not give the reward item'
        );
    }

    static async assertHitCancelledMining(page, mining, hpBefore, positionBefore)
    {
        await TimingObjectSession.waitForTimingAction(page, 'timingCancel', mining.serverTimeout);
        expect(await Phaser.getPlayerServerPosition(page), 'The hit must not move the player, only cancel the mining')
            .toEqual(positionBefore);
        await expect.poll(
            async () => TestCombatDeath.getPlayerHpFromState(page),
            {timeout: mining.serverTimeout, message: 'The hit must lower the player HP'}
        ).toBeLessThan(hpBefore);
        await TestTimingObjectsCancel.assertNoRewardAfterTimingDuration(page, mining);
    }

    static async runMoveCancelTest(page, screenshots, gameConfig, longRun)
    {
        let mining = await TimingObjectSession.prepareMining(page, gameConfig, longRun);
        await TimingObjectSession.startTiming(page, mining.rockKey, mining.serverTimeout);
        await screenshots.capture(page, 'mining-started-before-move');
        await TimingObjectSession.sideStep(page);
        await TimingObjectSession.waitForTimingAction(page, 'timingCancel', mining.serverTimeout);
        await TestTimingObjectsCancel.assertNoRewardAfterTimingDuration(page, mining);
        await screenshots.capture(page, 'mining-cancelled-by-move');
    }

    static async runEnemyHitCancelTest(page, screenshots, gameConfig, longRun)
    {
        let passiveEnemyArea = BaseE2eTest.loadRoomEntries(Login.FOREST_ROOM_NAME, ['respawnAreas']).find(
            area => TestTimingObjectsCancel.ENEMY_OBJECT_TYPE === area.childObjectType && !area.isAggressive
        );
        expect(passiveEnemyArea, 'The forest must have a passive enemy').toBeTruthy();
        let mining = await TimingObjectSession.prepareMining(page, gameConfig, longRun);
        await TimingObjectSession.startTiming(page, mining.rockKey, mining.serverTimeout);
        let hpBefore = await TestCombatDeath.getPlayerHpFromState(page);
        let positionBefore = await Phaser.getPlayerServerPosition(page);
        let enemyAttack = await RoomObjectsApi.startEnemyAttack(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName || 'ImRoot',
            passiveEnemyArea.assetKey
        );
        expect(enemyAttack.enemyKey, 'The enemy attack must start: '+sc.get(enemyAttack, 'error', '')).toBeTruthy();
        await screenshots.capture(page, 'mining-enemy-attack-started');
        await TestTimingObjectsCancel.assertHitCancelledMining(page, mining, hpBefore, positionBefore);
        await screenshots.capture(page, 'mining-cancelled-by-enemy-hit');
    }

    static async targetPlayerByName(page, playerName)
    {
        return page.evaluate((name) => {
            let playerEngine = window.reldens.getActiveScene().player;
            let sessionId = Object.keys(playerEngine.players).find(id => name === playerEngine.players[id].playerName);
            if(!sessionId){
                return false;
            }
            playerEngine.setTargetPlayerById(sessionId);
            return sessionId;
        }, playerName);
    }

    static async placeAttackerNextToMiner(attackerPage, gameConfig, minerName, minerPosition, attackRange, serverTimeout)
    {
        let placement = await RoomObjectsApi.placePlayerNearPlayer(
            gameConfig,
            Login.FOREST_ROOM_NAME,
            gameConfig.e2ePlayerName2 || 'ImRoot2',
            minerName
        );
        expect(placement.position, 'The attacker must be placed next to the miner: '+sc.get(placement, 'error', ''))
            .toBeTruthy();
        await PhaserRange.waitForPlayerWithinRange(attackerPage, placement.position, 1, serverTimeout);
        expect(
            Math.hypot(placement.position.x - minerPosition.x, placement.position.y - minerPosition.y),
            'The attacker must stand inside the attack range'
        ).toBeLessThanOrEqual(attackRange);
    }

    static async runPlayerHitCancelTest(page, secondPage, screenshots, gameConfig, longRun)
    {
        let attackSkill = BaseE2eTest.loadGameData().players.root2.skills.find(
            skill => TestTimingObjectsCancel.ATTACK_SKILL_KEY === skill.key
        );
        expect(attackSkill, 'The second player must have the attack skill').toBeTruthy();
        let mining = await TimingObjectSession.prepareMining(page, gameConfig, longRun);
        let minerName = gameConfig.e2ePlayerName || 'ImRoot';
        await Login.loginAndStartGame(
            secondPage,
            gameConfig.e2eUsername2 || 'root2',
            gameConfig.e2ePassword2 || 'root',
            gameConfig.e2ePlayerName2 || 'ImRoot2',
            longRun,
            false,
            Login.FOREST_ROOM_NAME
        );
        await TestTimingObjectsCancel.placeAttackerNextToMiner(
            secondPage,
            gameConfig,
            minerName,
            await Phaser.getPlayerServerPosition(page),
            attackSkill.range,
            mining.serverTimeout
        );
        await TimingObjectSession.startTiming(page, mining.rockKey, mining.serverTimeout);
        let hpBefore = await TestCombatDeath.getPlayerHpFromState(page);
        let positionBefore = await Phaser.getPlayerServerPosition(page);
        expect(await TestTimingObjectsCancel.targetPlayerByName(secondPage, minerName), 'The miner must be targeted')
            .toBeTruthy();
        await secondPage.click(Selectors.combat.skillButton(TestTimingObjectsCancel.ATTACK_SKILL_KEY), {force: true});
        await screenshots.capture(secondPage, 'mining-player-attack-sent');
        await TestTimingObjectsCancel.assertHitCancelledMining(page, mining, hpBefore, positionBefore);
        await screenshots.capture(page, 'mining-cancelled-by-player-hit');
    }

    static run()
    {
        test.describe('Timing Objects Cancel', () => {
            test('player moving cancels the mining and receives no item', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestTimingObjectsCancel.runMoveCancelTest(page, screenshots, gameConfig, longRun);
            });
            test('enemy hit cancels the mining and the player receives no item', async ({ page, screenshots, gameConfig, longRun }) => {
                await TestTimingObjectsCancel.runEnemyHitCancelTest(page, screenshots, gameConfig, longRun);
            });
            test('another player hit cancels the mining and the player receives no item', async ({ page, secondPage, screenshots, gameConfig, longRun }) => {
                await TestTimingObjectsCancel.runPlayerHitCancelTest(page, secondPage, screenshots, gameConfig, longRun);
            });
        });
    }
}

TestTimingObjectsCancel.run();
