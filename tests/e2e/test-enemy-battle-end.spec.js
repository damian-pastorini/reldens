/**
 *
 * Reldens - Test Enemy Battle End
 *
 * Tests how a placed forest enemy battle goes on and ends (CombatSkillCasting places it next to the player with its
 * aggression held and disables every other enemy, the server starts the enemy battle in place): a hit on a player that
 * keeps life lowers the HUD, live and stored life and the enemy keeps hitting; a hit that kills the player ends the
 * enemy battle, the enemy walks back to its origin after the chase and hits no more; the player revived next to the
 * enemy that killed it (with its aggression off by a 1 pixel "interactionRadio") sees the default config game over box
 * (the title, the auto revive wait text and the revive in place message, no buttons, the forest group keeps the stored
 * death config), revives where it died with exactly its base life and the enemy waits until the player hits it; a player that disconnects or stands out of the enemy respawn layer (the enemy
 * chase only walks on that layer) ends the battle; an enemy without actions (every enemy gets the configured default
 * skill, so its actions are emptied by a group override) leaves the battle it was attacked in; and an attack on an
 * enemy already at zero life ends the battle with no damage. The chase cases
 * move the player to the enemy respawn layer and out of the enemy skill range first (EnemyAggressionSteps).
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { EnemyAggressionSteps } = require('./helpers/enemy-aggression-steps');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestEnemyBattleEnd
{

    static ATTACK_SHORT = 'attackShort';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};
    static LAST_LIFE = 1;
    static NO_AGGRESSION_RADIO = 1;
    static GAME_OVER_TIME_OUT_PATH = 'server/players/gameOver/timeOut';
    static AFFECTED_PROPERTY_PATH = 'client/actions/skills/affectedProperty';
    static DEATH_BOX_BUTTONS = [
        Selectors.gameOver.reviveButton,
        Selectors.gameOver.restorationItemUseButton,
        Selectors.gameOver.restorationItemKeepButton,
        Selectors.gameOver.resurrectionAdButton
    ];

    static async fetchPlayer(context)
    {
        return await GameplayE2eStateApi.fetchPlayer(context.gameConfig, context.roomName, context.playerName);
    }

    static async killPlayer(page, context)
    {
        await ForestEnemyKill.lowerPlayerLife(page, context.gameConfig, TestEnemyBattleEnd.LAST_LIFE);
        await EnemyAggressionSteps.startEnemyBattle(context);
        await TestCombatDeath.waitForPlayerHpCondition(page, 'dead', context.timeout);
        await expect.poll(
            async () => await CombatSkillCasting.fetchEnemyInBattle(context),
            {message: 'The enemy leaves the battle when the player dies', timeout: context.timeout}
        ).toBe(0);
    }

    static async expectDefaultDeathBox(page)
    {
        let deathSnippets = DeathReviveSteps.DEATH_SNIPPETS;
        await expect(page.locator(Selectors.gameOver.box), 'The game over box is shown').toBeVisible();
        await expect(page.locator(Selectors.gameOver.title)).toHaveText(deathSnippets.title);
        await expect(page.locator(Selectors.gameOver.wait), 'The auto revive tells to wait').toHaveText(
            deathSnippets.wait
        );
        await expect(page.locator(Selectors.gameOver.reviveMessage)).toHaveText(deathSnippets.reviveInPlace);
        for(let buttonSelector of TestEnemyBattleEnd.DEATH_BOX_BUTTONS){
            await expect(page.locator(buttonSelector), 'The default death box has no buttons').toHaveCount(0);
        }
    }

    static async runHitKeepsLifeTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let lifeBefore = (await TestEnemyBattleEnd.fetchPlayer(context)).life;
        await EnemyAggressionSteps.startEnemyBattle(context);
        await expect.poll(
            async () => (await ForestEnemyKill.fetchClientLife(page)).value,
            {message: 'The HUD life decreases', timeout: context.timeout}
        ).toBeLessThan(lifeBefore);
        let firstHitLife = (await ForestEnemyKill.fetchClientLife(page)).value;
        expect(firstHitLife, 'The player keeps life').toBeGreaterThan(0);
        await expect.poll(
            async () => await ForestEnemyKill.fetchStoredLife(context.gameConfig, context.playerName),
            {message: 'The stored life decreases', timeout: context.timeout}
        ).toBeLessThan(lifeBefore);
        await expect.poll(
            async () => (await ForestEnemyKill.fetchClientLife(page)).value,
            {message: 'The enemy keeps hitting the player', timeout: context.timeout}
        ).toBeLessThan(firstHitLife);
        expect(await CombatSkillCasting.fetchEnemyInBattle(context), 'The battle goes on').toBe(1);
        await screenshots.capture(page, 'enemy-hit-keeps-life');
    }

    static async runKilledPlayerTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let chase = await EnemyAggressionSteps.prepareChase(page, gameConfig, longRun);
        let context = chase.context;
        await RoomMessagesRecorder.start(page);
        await TestEnemyBattleEnd.killPlayer(page, context);
        expect(
            EnemyAggressionSteps.isAtOrigin(await CombatSkillCasting.fetchEnemySnapshot(context)),
            'The enemy chased the player away from its origin'
        ).toBe(false);
        let hitAct = chase.enemySkill.key+ActionsConst.ACTIONS.SUFFIX.HIT;
        let hitsOnDeath = (await RoomMessagesRecorder.fetchMessages(page, hitAct)).length;
        expect(hitsOnDeath, 'The enemy hit killed the player').toBeGreaterThan(0);
        await EnemyAggressionSteps.expectBackToOrigin(context, 'The enemy left the battle of the dead player');
        await EnemyAggressionSteps.expectNoBattle(page, context, 'The enemy stays out of the battle');
        expect((await RoomMessagesRecorder.fetchMessages(page, hitAct)).length, 'No hits on the dead player').toBe(
            hitsOnDeath
        );
        await screenshots.capture(page, 'enemy-killed-player');
    }

    static async runReviveNextToEnemyTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        await GameplayE2eStateApi.changeEnemyBattle(gameConfig, e2eGroup, context.roomName, context.bodyKey, {
            interactionRadio: TestEnemyBattleEnd.NO_AGGRESSION_RADIO
        }, false);
        let gameOverTimeOut = Number(
            await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, TestEnemyBattleEnd.GAME_OVER_TIME_OUT_PATH)
        );
        test.setTimeout(gameOverTimeOut + context.timeout * 6);
        await TestEnemyBattleEnd.killPlayer(page, context);
        let deadPlayer = await TestEnemyBattleEnd.fetchPlayer(context);
        await TestEnemyBattleEnd.expectDefaultDeathBox(page);
        let isRevived = await TestCombatDeath.waitForPlayerHpCondition(page, 'alive', gameOverTimeOut + context.timeout);
        expect(isRevived, 'The player must be revived').toBe(true);
        let revivedPlayer = await TestEnemyBattleEnd.fetchPlayer(context);
        expect(revivedPlayer.life, 'Revived with exactly its base life').toBe(revivedPlayer.totalLife);
        expect([revivedPlayer.x, revivedPlayer.y], 'Revived where it died').toEqual([deadPlayer.x, deadPlayer.y]);
        await EnemyAggressionSteps.expectNoBattle(page, context, 'The enemy waits until the revived player hits it');
        expect((await TestEnemyBattleEnd.fetchPlayer(context)).life, 'No hit on the revived player').toBe(
            revivedPlayer.totalLife
        );
        let directAttack = TestEnemyBattleEnd.DIRECT_ATTACK;
        await CombatSkillCasting.changeSkill(context, e2eGroup, TestEnemyBattleEnd.ATTACK_SHORT, directAttack);
        await CombatSkillCasting.targetEnemy(page, context);
        await CombatSkillCasting.castSkill(page, context, TestEnemyBattleEnd.ATTACK_SHORT, 1);
        await expect.poll(
            async () => await CombatSkillCasting.fetchEnemyInBattle(context),
            {message: 'The hit starts the battle again', timeout: context.timeout}
        ).toBe(1);
        await screenshots.capture(page, 'revived-next-to-enemy');
    }

    static async runDisconnectTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await EnemyAggressionSteps.startChase(page, gameConfig, longRun);
        await screenshots.capture(page, 'enemy-chasing-before-disconnect');
        await page.goto('about:blank');
        await EnemyAggressionSteps.expectBackToOrigin(context, 'The enemy leaves the battle of the disconnected player');
    }

    static async runUnreachablePlayerTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let enemySkill = await EnemyAggressionSteps.loadEnemySkill(gameConfig, gameConfig.e2eEnemyKey);
        await EnemyAggressionSteps.startEnemyBattle(context);
        let placed = await EnemyAggressionSteps.placeOutOfRange(page, context, enemySkill, false);
        expect(placed.isRespawnTile, 'The player stands out of the enemy respawn layer').toBe(false);
        let lifeOutOfRange = (await TestEnemyBattleEnd.fetchPlayer(context)).life;
        await EnemyAggressionSteps.expectNoBattle(page, context, 'The enemy without a path leaves the battle');
        expect((await TestEnemyBattleEnd.fetchPlayer(context)).life, 'No more hits').toBe(lifeOutOfRange);
        await screenshots.capture(page, 'enemy-unreachable-player');
    }

    static async runEnemyWithoutActionsTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        await GameplayE2eStateApi.changeEnemyBattle(gameConfig, e2eGroup, context.roomName, context.bodyKey, {
            actionsKeys: []
        }, false);
        let directAttack = TestEnemyBattleEnd.DIRECT_ATTACK;
        await CombatSkillCasting.changeSkill(context, e2eGroup, TestEnemyBattleEnd.ATTACK_SHORT, directAttack);
        let lifeBefore = (await TestEnemyBattleEnd.fetchPlayer(context)).life;
        let hit = await CombatSkillCasting.castSkill(page, context, TestEnemyBattleEnd.ATTACK_SHORT, 1);
        expect(await CombatSkillCasting.fetchEnemyLife(context), 'The attack is applied').toBe(hit.newValue);
        await EnemyAggressionSteps.expectNoBattle(page, context, 'The enemy without actions leaves the battle');
        expect((await TestEnemyBattleEnd.fetchPlayer(context)).life, 'It never hits').toBe(lifeBefore);
        await screenshots.capture(page, 'enemy-without-actions');
    }

    static async runZeroLifeEnemyTest(page, screenshots, gameConfig, e2eGroup, longRun)
    {
        let context = await CombatSkillCasting.prepareEnemyTarget(page, gameConfig, longRun);
        let directAttack = TestEnemyBattleEnd.DIRECT_ATTACK;
        await CombatSkillCasting.changeSkill(context, e2eGroup, TestEnemyBattleEnd.ATTACK_SHORT, directAttack);
        let affectedProperty = await E2eSeedAndRestoreApi.fetchConfigValue(
            gameConfig,
            TestEnemyBattleEnd.AFFECTED_PROPERTY_PATH
        );
        await CombatSkillCasting.setEnemyStats(context, {[affectedProperty]: 0});
        let experienceBefore = (await TestEnemyBattleEnd.fetchPlayer(context)).experience;
        await RoomMessagesRecorder.start(page);
        await CombatSkillCasting.clickWhenReady(page, context, TestEnemyBattleEnd.ATTACK_SHORT);
        await RoomMessagesRecorder.waitForMessage(page, ActionsConst.BATTLE_ENDED, context.timeout);
        let battleEnds = (await RoomMessagesRecorder.fetchMessages(page, ActionsConst.BATTLE_ENDED)).filter(
            message => context.enemyKey === message[ActionsConst.DATA_OBJECT_KEY_TARGET]
        );
        expect(battleEnds.length, 'The battle of the enemy at zero life ends').toBeGreaterThan(0);
        expect((await CombatSkillCasting.fetchRecorded(context)).damages, 'No extra damage').toHaveLength(0);
        await expect.poll(
            async () => (await TestEnemyBattleEnd.fetchPlayer(context)).experience,
            {message: 'The ended battle gives its reward', timeout: context.timeout}
        ).toBe(experienceBefore + context.enemyExperience);
        await screenshots.capture(page, 'zero-life-enemy-battle-end');
    }

    static run()
    {
        test.describe('Enemy Battle End', () => {
            test('enemy hit on a player that keeps life lowers its HUD and stored life and the battle goes on', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyBattleEnd.runHitKeepsLifeTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('enemy that kills the player leaves the battle, walks back to its origin and hits no more', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyBattleEnd.runKilledPlayerTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('player revived next to its killer gets its base life and the enemy waits until it is hit', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyBattleEnd.runReviveNextToEnemyTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('enemy leaves the battle and walks back to its origin when its player disconnects', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyBattleEnd.runDisconnectTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('enemy leaves the battle when the player stands out of its respawn layer', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyBattleEnd.runUnreachablePlayerTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('enemy without actions leaves the battle it was attacked in', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyBattleEnd.runEnemyWithoutActionsTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
            test('attack on an enemy at zero life ends its battle without damage', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestEnemyBattleEnd.runZeroLifeEnemyTest(page, screenshots, gameConfig, e2eGroup, longRun);
            });
        });
    }

}

TestEnemyBattleEnd.run();
