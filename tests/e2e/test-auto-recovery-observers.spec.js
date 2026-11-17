/**
 *
 * Reldens - Test Auto Recovery Observers
 *
 * Tests the second client while the first player recovers, with the players recovery of the fast cases of
 * AutoRecoverySteps (1 second tick, 3 seconds start delay, every enemy disabled) and both players of the group in the
 * forest: in a team the second player panel shows the recovered life of the first one and its life bar on click shows
 * it too; in a clan (seeded for the group before the login, ClanSeed) the second player clan panel shows it; with the
 * quest NPC dialog open the second player keeps it while the recovery broadcasts arrive; in a battle (the second player
 * added to the battle players of a disabled enemy for the group) the second player keeps its life and its battle; and
 * with the first player dead behind its game over box (no automatic revive, the death teleport off) while the second
 * player and a passive enemy recover, the first player game over box stays open and the player stays dead.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { ObserverSteps } = require('./helpers/observer-steps');
const { ClanSeed } = require('./helpers/clan-seed');
const { LifeBarState } = require('./helpers/life-bar-state');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecoveryObservers
{

    static PLAYERS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS;
    static OBJECTS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.OBJECTS;
    static LIFE_PROPERTY_KEY = 'hp';
    static LOW_LIFE = 1;
    static OBSERVER_LIFE = 50;
    static POLL_MS = 100;
    static RECOVERY_WAIT_MS = 8000;
    static MANUAL_IN_PLACE = Object.assign(
        {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false},
        DeathReviveSteps.MANUAL_REVIVE_CONFIG
    );

    static async startCase(context)
    {
        await AutoRecoverySteps.prepareFastRecovery(
            context,
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryObservers.PLAYERS_PATH)
        );
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        await AutoRecoverySteps.restartFastTicks(context);
        return secondContext;
    }

    static async fetchPlayer(gameConfig)
    {
        return await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName);
    }

    static async lowerLife(gameConfig, life)
    {
        return await AutoRecoverySteps.lowerPlayerLife(gameConfig, gameConfig.e2ePlayerName, life);
    }

    static async waitForRecovery(gameConfig, aboveLife)
    {
        await expect.poll(
            async () => (await TestAutoRecoveryObservers.fetchPlayer(gameConfig)).life,
            {
                message: 'The life must recover',
                timeout: TestAutoRecoveryObservers.RECOVERY_WAIT_MS,
                intervals: [TestAutoRecoveryObservers.POLL_MS]
            }
        ).toBeGreaterThan(aboveLife);
        return (await TestAutoRecoveryObservers.fetchPlayer(gameConfig)).life;
    }

    static async fetchPlayerId(gameConfig, playerName)
    {
        return await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: playerName});
    }

    static async runTeamPanelAndBarTest(context)
    {
        await TestAutoRecoveryObservers.startCase(context);
        let firstSessionId = await DeathObserverSteps.fetchSessionId(context.page);
        await ObserverSteps.joinTeam(context, await DeathObserverSteps.fetchSessionId(context.secondPage));
        await context.secondPage.evaluate(
            (targetSessionId) => window.reldens.getCurrentPlayer().setTargetPlayerById(targetSessionId),
            firstSessionId
        );
        await TestAutoRecoveryObservers.lowerLife(context.gameConfig, TestAutoRecoveryObservers.LOW_LIFE);
        let recoveredLife = await TestAutoRecoveryObservers.waitForRecovery(
            context.gameConfig,
            TestAutoRecoveryObservers.LOW_LIFE
        );
        let firstPlayerId = await TestAutoRecoveryObservers.fetchPlayerId(
            context.gameConfig,
            context.gameConfig.e2ePlayerName
        );
        await expect.poll(
            async () => Number(await context.secondPage.locator(
                Selectors.teams.playerProperty(firstPlayerId, TestAutoRecoveryObservers.LIFE_PROPERTY_KEY)
            ).textContent()),
            {message: 'The team panel shows the recovered life', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThanOrEqual(recoveredLife);
        await expect.poll(
            async () => (await LifeBarState.fetchPlayerBar(context.secondPage, firstSessionId)).value,
            {message: 'The life bar of the targeted player shows the recovered life', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThanOrEqual(recoveredLife);
    }

    static async runClanPanelTest(context)
    {
        let firstPlayerId = await TestAutoRecoveryObservers.fetchPlayerId(
            context.gameConfig,
            context.gameConfig.e2ePlayerName
        );
        let secondPlayerId = await TestAutoRecoveryObservers.fetchPlayerId(
            context.gameConfig,
            context.gameConfig.e2ePlayerName2
        );
        await ClanSeed.seedClanWithMembers(
            context.gameConfig,
            context.e2eGroup,
            firstPlayerId,
            [firstPlayerId, secondPlayerId]
        );
        await TestAutoRecoveryObservers.startCase(context);
        await TestAutoRecoveryObservers.lowerLife(context.gameConfig, TestAutoRecoveryObservers.LOW_LIFE);
        let recoveredLife = await TestAutoRecoveryObservers.waitForRecovery(
            context.gameConfig,
            TestAutoRecoveryObservers.LOW_LIFE
        );
        await expect.poll(
            async () => Number(await context.secondPage.locator(
                Selectors.clans.playerProperty(firstPlayerId, TestAutoRecoveryObservers.LIFE_PROPERTY_KEY)
            ).textContent()),
            {message: 'The clan panel shows the recovered life', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThanOrEqual(recoveredLife);
    }

    static async runDialogKeptTest(context)
    {
        let secondContext = await TestAutoRecoveryObservers.startCase(context);
        await ObserverSteps.openQuestNpcDialog(context.secondPage, secondContext.gameConfig);
        await TestAutoRecoveryObservers.lowerLife(context.gameConfig, TestAutoRecoveryObservers.LOW_LIFE);
        await TestAutoRecoveryObservers.waitForRecovery(context.gameConfig, TestAutoRecoveryObservers.LOW_LIFE);
        await context.secondPage.waitForTimeout(AutoRecoverySteps.FAST_TICK_MS);
        await expect(
            context.secondPage.locator(Selectors.npc.dialogue).filter({visible: true}),
            'The second player keeps its NPC dialog open'
        ).not.toHaveCount(0);
    }

    static async runBattleKeptTest(context)
    {
        let secondContext = await TestAutoRecoveryObservers.startCase(context);
        let bodyKey = (await RoomObjectsApi.fetchRoomObjects(context.gameConfig, Login.FOREST_ROOM_NAME)).find(
            roomObject => ObjectsConst.TYPE_ENEMY === roomObject.type
        ).bodyKey;
        let secondPlayerId = await TestAutoRecoveryObservers.fetchPlayerId(
            context.gameConfig,
            context.gameConfig.e2ePlayerName2
        );
        await GameplayE2eStateApi.changeEnemyBattle(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            bodyKey,
            {inBattleWithPlayers: {[secondPlayerId]: true}}
        );
        await TestAutoRecoveryObservers.lowerLife(secondContext.gameConfig, TestAutoRecoveryObservers.OBSERVER_LIFE);
        await TestAutoRecoveryObservers.lowerLife(context.gameConfig, TestAutoRecoveryObservers.LOW_LIFE);
        await TestAutoRecoveryObservers.waitForRecovery(context.gameConfig, TestAutoRecoveryObservers.LOW_LIFE);
        await context.page.waitForTimeout(AutoRecoverySteps.FAST_TICK_MS);
        expect(
            (await TestAutoRecoveryObservers.fetchPlayer(secondContext.gameConfig)).life,
            'The second player in battle keeps its life'
        ).toBe(TestAutoRecoveryObservers.OBSERVER_LIFE);
        expect(
            (await RoomObjectsApi.fetchRoomObjects(context.gameConfig, Login.FOREST_ROOM_NAME)).find(
                roomObject => bodyKey === roomObject.bodyKey
            ).inBattle,
            'The second player keeps its battle'
        ).toBe(1);
    }

    static async runDeadBoxKeptTest(context)
    {
        await DeathReviveSteps.prepareDeath(context, TestAutoRecoveryObservers.MANUAL_IN_PLACE);
        await AutoRecoverySteps.prepareFastRecovery(context, Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryObservers.PLAYERS_PATH),
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryObservers.OBJECTS_PATH)
        ));
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        await TestCombatDeath.killPlayerAgain(context.page, context.gameConfig, TimeConstants.ENEMY_KILL);
        let [bodyKey] = await AutoRecoverySteps.keepPassiveEnemies(context.gameConfig, 1);
        await TestAutoRecoveryObservers.lowerLife(secondContext.gameConfig, TestAutoRecoveryObservers.LOW_LIFE);
        let lowered = await GameplayE2eStateApi.setEnemyBodyLife(context.gameConfig, Login.FOREST_ROOM_NAME, bodyKey, 1);
        expect(lowered.life, 'The enemy life must be lowered: '+lowered.error).toBe(1);
        await TestAutoRecoveryObservers.waitForRecovery(secondContext.gameConfig, TestAutoRecoveryObservers.LOW_LIFE);
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchEnemyLife(context.gameConfig, Login.FOREST_ROOM_NAME, bodyKey)).life,
            {message: 'The enemy recovers', timeout: TestAutoRecoveryObservers.RECOVERY_WAIT_MS}
        ).toBeGreaterThan(1);
        await expect(context.page.locator(Selectors.gameOver.box), 'The dead player box stays open').toBeVisible();
        let deadPlayer = await TestAutoRecoveryObservers.fetchPlayer(context.gameConfig);
        expect([deadPlayer.inState, deadPlayer.life], 'The first player stays dead').toEqual([GameConst.STATUS.DEATH, 0]);
    }

    static run()
    {
        test.describe('Auto Recovery Observers', () => {
            test('team member panel and life bar show the recovered life of the other member', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryObservers.runTeamPanelAndBarTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('clan member panel shows the recovered life of the other member', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryObservers.runClanPanelTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('NPC dialog of the other player stays open while the recovery broadcasts arrive', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryObservers.runDialogKeptTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('other player in battle keeps its life and its battle while a player recovers', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryObservers.runBattleKeptTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('dead player game over box stays open while a player and an enemy recover', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryObservers.runDeadBoxKeptTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestAutoRecoveryObservers.run();
