/**
 *
 * Reldens - Test Combat Pvp
 *
 * Tests the hits results in the forest (CombatSkillCasting places the forest enemy next to the first player and the
 * second player next to the first one): an attack lowers the enemy server life by the damage shown to the attacker;
 * a PvP attack and a PvP fireball lower the target server life and its HUD; a PvP kill shows the game over only to
 * the killed player and clears the attacker target; a fireball that kills the enemy ends its battle and gives its
 * reward; two enemies hitting the last life point of the player at the same time give a single game over; and the
 * life lowered by an enemy hit is stored when the player leaves and loaded again on the next login (the enemies are
 * disabled before the login, so no hit changes it).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { SceneSpritesRecorder } = require('./helpers/scene-sprites-recorder');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { Login } = require('./helpers/login');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestCombatPvp
{

    static ATTACK_SHORT = 'attackShort';
    static FIREBALL = 'fireball';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};
    static LAST_LIFE = 1;
    static QUIET_MS = 1500;

    static async prepareTarget(page, secondPage, gameConfig, e2eGroup, longRun, skillKey)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        await Login.loginRootPlayer(secondPage, gameConfig, longRun, '2');
        context.targetPlayer = await CombatSkillCasting.placeSecondPlayer(secondPage, context);
        await CombatSkillCasting.changeSkill(context, e2eGroup, skillKey, TestCombatPvp.DIRECT_ATTACK);
        let attacker = await GameplayE2eStateApi.fetchPlayer(gameConfig, context.roomName, context.playerName);
        await CombatSkillCasting.setPlayerStats(context, {mp: attacker.statsBase.mp});
        await CombatSkillCasting.targetPlayer(page, context.targetPlayer.sessionId);
        return context;
    }

    static async expectTargetLife(secondPage, context, expectedLife)
    {
        let target = await GameplayE2eStateApi.fetchPlayer(
            context.gameConfig,
            context.roomName,
            context.targetPlayer.playerName
        );
        expect(target.life, 'The target server life').toBe(expectedLife);
        await expect.poll(
            async () => (await ForestEnemyKill.fetchClientLife(secondPage)).value,
            {message: 'The target HUD life', timeout: context.timeout}
        ).toBe(expectedLife);
    }

    static async runShownDamageTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let attackShort = TestCombatPvp.ATTACK_SHORT;
        await CombatSkillCasting.changeSkill(context, e2eGroup, attackShort, TestCombatPvp.DIRECT_ATTACK);
        let lifeBefore = await CombatSkillCasting.fetchEnemyLife(context);
        await SceneSpritesRecorder.start(page);
        await CombatSkillCasting.castSkill(page, context, attackShort, 1);
        let lostLife = lifeBefore - await CombatSkillCasting.fetchEnemyLife(context);
        expect(lostLife, 'The enemy loses life').toBeGreaterThan(0);
        await expect.poll(
            async () => await SceneSpritesRecorder.fetchTexts(page),
            {message: 'The shown damage is the lost life', timeout: context.timeout}
        ).toContain(String(lostLife));
        await screenshots.capture(page, 'shown-damage');
    }

    static async runPvpHitTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let attackShort = TestCombatPvp.ATTACK_SHORT;
        let context = await TestCombatPvp.prepareTarget(page, secondPage, gameConfig, e2eGroup, longRun, attackShort);
        let hit = await CombatSkillCasting.castSkill(page, context, attackShort, 1);
        expect(hit.newValue, 'The target survives').toBeGreaterThan(0);
        await TestCombatPvp.expectTargetLife(secondPage, context, hit.newValue);
        await screenshots.capture(secondPage, 'pvp-hit-target-hud');
    }

    static async runPvpFireballTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let fireball = TestCombatPvp.FIREBALL;
        let context = await TestCombatPvp.prepareTarget(page, secondPage, gameConfig, e2eGroup, longRun, fireball);
        let hit = await CombatSkillCasting.castSkill(page, context, fireball, 1);
        await TestCombatPvp.expectTargetLife(secondPage, context, hit.newValue);
        await screenshots.capture(secondPage, 'pvp-fireball-target-hud');
    }

    static async runPvpKillTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun)
    {
        let attackShort = TestCombatPvp.ATTACK_SHORT;
        let context = await TestCombatPvp.prepareTarget(page, secondPage, gameConfig, e2eGroup, longRun, attackShort);
        let lastLife = await RoomObjectsApi.setPlayerAffectedProperty(
            gameConfig,
            context.roomName,
            context.targetPlayer.playerName,
            TestCombatPvp.LAST_LIFE
        );
        expect(lastLife.value, 'The target last life must be set: '+lastLife.error).toBe(TestCombatPvp.LAST_LIFE);
        await CombatSkillCasting.castSkill(page, context, attackShort, 1);
        await TestCombatDeath.waitForPlayerHpCondition(secondPage, 'dead', context.timeout);
        await expect(secondPage.locator(Selectors.gameOver.box), 'The killed player gets the game over').toBeVisible();
        await expect.poll(
            async () => await page.evaluate(() => window.reldens.getCurrentPlayer().currentTarget),
            {message: 'The attacker target is cleared', timeout: context.timeout}
        ).toBe(false);
        await expect(page.locator(Selectors.gameOver.box), 'The attacker gets no game over').toBeHidden();
        await screenshots.capture(page, 'pvp-kill-attacker');
    }

    static async runFireballKillTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let fireball = TestCombatPvp.FIREBALL;
        await CombatSkillCasting.changeSkill(context, e2eGroup, fireball, TestCombatPvp.DIRECT_ATTACK);
        let attacker = await GameplayE2eStateApi.fetchPlayer(gameConfig, context.roomName, context.playerName);
        await CombatSkillCasting.setPlayerStats(context, {mp: attacker.statsBase.mp});
        await GameplayE2eStateApi.setEnemyBodyLife(gameConfig, context.roomName, context.bodyKey, TestCombatPvp.LAST_LIFE);
        await RoomMessagesRecorder.start(page);
        await CombatSkillCasting.castSkill(page, context, fireball, 1);
        await RoomMessagesRecorder.waitForMessage(page, ActionsConst.BATTLE_ENDED, context.timeout);
        let battleEnds = (await RoomMessagesRecorder.fetchMessages(page, ActionsConst.BATTLE_ENDED)).filter(
            message => context.enemyKey === message[ActionsConst.DATA_OBJECT_KEY_TARGET]
        );
        expect(battleEnds.length, 'The fireball kill ends the enemy battle').toBeGreaterThan(0);
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchPlayer(gameConfig, context.roomName, context.playerName)).experience,
            {message: 'The kill gives its reward', timeout: context.timeout}
        ).toBe(attacker.experience + context.enemyExperience);
        await screenshots.capture(page, 'fireball-enemy-kill');
    }

    static async runSingleGameOverTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let secondEnemy = (await RoomObjectsApi.fetchRoomObjects(gameConfig, context.roomName)).find(
            roomObject => gameConfig.e2eEnemyKey === roomObject.assetKey && context.enemyKey !== roomObject.key
        );
        expect(secondEnemy, 'The forest must have a second enemy of the same kind').toBeTruthy();
        let placement = await RoomObjectsApi.placeAndTargetEnemy(
            page,
            gameConfig,
            context.roomName,
            secondEnemy.key,
            ForestEnemyKill.FULL_LIFE,
            context.timeout,
            true
        );
        expect(placement.enemyKey, 'The second enemy must be placed: '+placement.error).toBe(secondEnemy.key);
        await ForestEnemyKill.lowerPlayerLife(page, gameConfig, TestCombatPvp.LAST_LIFE);
        await RoomMessagesRecorder.start(page);
        await Promise.all([context.enemyKey, secondEnemy.key].map(
            enemyKey => RoomObjectsApi.startEnemyBattle(gameConfig, context.roomName, context.playerName, enemyKey)
        ));
        await TestCombatDeath.waitForPlayerHpCondition(page, 'dead', context.timeout);
        await page.waitForTimeout(TestCombatPvp.QUIET_MS);
        expect(await RoomMessagesRecorder.fetchMessages(page, GameConst.GAME_OVER), 'A single game over').toHaveLength(1);
        await screenshots.capture(page, 'single-game-over');
    }

    static async runLoweredLifeKeptTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let fetchPlayer = async () => await GameplayE2eStateApi.fetchPlayer(gameConfig, context.roomName, context.playerName);
        let lifeBefore = (await fetchPlayer()).life;
        let battle = await RoomObjectsApi.startEnemyBattle(gameConfig, context.roomName, context.playerName, context.enemyKey);
        expect(battle.enemyKey, 'The enemy battle must start: '+battle.error).toBe(context.enemyKey);
        await expect.poll(
            async () => (await ForestEnemyKill.fetchClientLife(page)).value,
            {message: 'The enemy hit lowers the life', timeout: context.timeout}
        ).toBeLessThan(lifeBefore);
        await page.goto('about:blank');
        await expect.poll(
            async () => (await fetchPlayer()).error,
            {message: 'The player leaves the room', timeout: context.timeout}
        ).toBeTruthy();
        await RoomObjectsApi.disableEnemies(gameConfig, context.roomName);
        let loweredLife = await ForestEnemyKill.fetchStoredLife(gameConfig, context.playerName);
        expect(loweredLife, 'The lowered life is stored on leave').toBeLessThan(lifeBefore);
        await Login.startConfigPlayer(page, gameConfig, longRun);
        await expect.poll(
            async () => (await fetchPlayer()).life,
            {message: 'The lowered life is loaded again', timeout: context.timeout}
        ).toBe(loweredLife);
        await expect.poll(
            async () => (await ForestEnemyKill.fetchClientLife(page)).value,
            {message: 'The HUD shows the lowered life', timeout: context.timeout}
        ).toBe(loweredLife);
        await screenshots.capture(page, 'lowered-life-kept');
    }

    static run()
    {
        test.describe('Combat Pvp', () => {
            test('life lowered by an enemy hit is kept after leaving and logging in again', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatPvp.runLoweredLifeKeptTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('attack lowers the enemy server life by the damage shown to the attacker', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatPvp.runShownDamageTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('PvP attack lowers the target server life and its HUD', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatPvp.runPvpHitTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('PvP fireball lowers the target server life and its HUD', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatPvp.runPvpFireballTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('PvP kill shows the game over only to the killed player and clears the attacker target', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatPvp.runPvpKillTest(page, secondPage, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('fireball that kills the enemy ends its battle and gives its reward', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatPvp.runFireballKillTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('two enemies hitting the last life point at once give a single game over', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestCombatPvp.runSingleGameOverTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestCombatPvp.run();
