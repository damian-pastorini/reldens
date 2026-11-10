/**
 *
 * Reldens - Test Auto Recovery Ticks
 *
 * Tests the players auto recovery ticks with the fast cases of AutoRecoverySteps (1 second tick, 3 seconds start delay,
 * every enemy disabled) and both players of the group in the forest: a player whose client is hidden from the room (its
 * schema still in the state, like a socket gone before the leave) is skipped while the other player keeps recovering;
 * with the stats save delayed beyond the tick time (persistEveryTicks 1) the next intervals find the tick still running
 * and skip it, so two recoveries are never a tick apart; an open PvP battle (the first player hits the second one with
 * the attack skill, its range check off for the group) blocks the recovery of the attacker and the target until the
 * stored battleTimeOff passed, then both recover a full delay later; and with the forest room "pvpEnabled" off before
 * the second login (the first player keeps the room alive) the player gets no PvP action and still recovers.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecoveryTicks
{

    static PLAYERS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS;
    static PVP_BATTLE_TIME_OFF_PATH = 'server/actions/pvp/battleTimeOff';
    static LOW_LIFE = 1;
    static POLL_MS = 100;
    static RECOVERY_WAIT_MS = 8000;
    static SAVE_DELAY_MS = 2500;
    static ATTACK_SHORT = 'attackShort';
    static DIRECT_ATTACK = {criticalChance: 0, range: 0};
    static PVP_TARGET_LIFE = 100;

    static async startCase(context, configValues = {})
    {
        await AutoRecoverySteps.prepareFastRecovery(context, Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryTicks.PLAYERS_PATH),
            configValues
        ));
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        await AutoRecoverySteps.restartFastTicks(context);
        return secondContext;
    }

    static async fetchLife(gameConfig)
    {
        return (await GameplayE2eStateApi.fetchPlayer(gameConfig, Login.FOREST_ROOM_NAME, gameConfig.e2ePlayerName)).life;
    }

    static async lowerLife(gameConfig, life)
    {
        return await AutoRecoverySteps.lowerPlayerLife(gameConfig, gameConfig.e2ePlayerName, life);
    }

    static async waitForLifeChange(page, gameConfig, fromLife, timeout, message)
    {
        let deadline = Date.now() + timeout;
        while(Date.now() < deadline){
            let life = await TestAutoRecoveryTicks.fetchLife(gameConfig);
            if(fromLife !== life){
                return {life, changedAt: Date.now()};
            }
            await page.waitForTimeout(TestAutoRecoveryTicks.POLL_MS);
        }
        let lastLife = await TestAutoRecoveryTicks.fetchLife(gameConfig);
        expect(lastLife, message).not.toBe(fromLife);
        return {life: lastLife, changedAt: Date.now()};
    }

    static async runHiddenClientTest(context)
    {
        let secondContext = await TestAutoRecoveryTicks.startCase(context);
        await TestAutoRecoveryTicks.lowerLife(context.gameConfig, TestAutoRecoveryTicks.LOW_LIFE);
        await TestAutoRecoveryTicks.lowerLife(secondContext.gameConfig, TestAutoRecoveryTicks.LOW_LIFE);
        let hidden = await GameplayE2eStateApi.hideRoomClient(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName
        );
        expect(hidden.hiddenSessionId, 'The first player client must be hidden: '+hidden.error).toBeTruthy();
        await TestAutoRecoveryTicks.waitForLifeChange(
            context.page,
            secondContext.gameConfig,
            TestAutoRecoveryTicks.LOW_LIFE,
            TestAutoRecoveryTicks.RECOVERY_WAIT_MS,
            'The other player keeps recovering'
        );
        expect(
            await TestAutoRecoveryTicks.fetchLife(context.gameConfig),
            'The player with no client is skipped'
        ).toBe(TestAutoRecoveryTicks.LOW_LIFE);
    }

    static async runOverlappingTickTest(context)
    {
        await TestAutoRecoveryTicks.startCase(context, {[TestAutoRecoveryTicks.PLAYERS_PATH+'/persistEveryTicks']: 1});
        let delayed = await GameplayE2eStateApi.delayRoomMethod(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            'savePlayerStats',
            TestAutoRecoveryTicks.SAVE_DELAY_MS
        );
        expect(delayed.methodKey, 'The stats save must be delayed: '+delayed.error).toBe('savePlayerStats');
        await TestAutoRecoveryTicks.lowerLife(context.gameConfig, TestAutoRecoveryTicks.LOW_LIFE);
        let first = await TestAutoRecoveryTicks.waitForLifeChange(
            context.page,
            context.gameConfig,
            TestAutoRecoveryTicks.LOW_LIFE,
            TestAutoRecoveryTicks.RECOVERY_WAIT_MS + TestAutoRecoveryTicks.SAVE_DELAY_MS,
            'The first recovery'
        );
        let second = await TestAutoRecoveryTicks.waitForLifeChange(
            context.page,
            context.gameConfig,
            first.life,
            TestAutoRecoveryTicks.RECOVERY_WAIT_MS + TestAutoRecoveryTicks.SAVE_DELAY_MS,
            'The second recovery'
        );
        expect(
            second.changedAt - first.changedAt,
            'The ticks that find the previous tick still running are skipped'
        ).toBeGreaterThanOrEqual(TestAutoRecoveryTicks.SAVE_DELAY_MS - AutoRecoverySteps.FAST_TICK_MS);
    }

    static async runPvpBattleTest(context)
    {
        let secondContext = await TestAutoRecoveryTicks.startCase(context);
        let battleTimeOff = Number(await E2eSeedAndRestoreApi.fetchConfigValue(
            context.gameConfig,
            TestAutoRecoveryTicks.PVP_BATTLE_TIME_OFF_PATH
        ));
        test.setTimeout(test.info().timeout + battleTimeOff + TestAutoRecoveryTicks.RECOVERY_WAIT_MS);
        let attacker = {
            gameConfig: context.gameConfig,
            roomName: Login.FOREST_ROOM_NAME,
            playerName: context.gameConfig.e2ePlayerName,
            timeout: TimeConstants.SCENE_LOAD
        };
        await GameplayE2eStateApi.recordPlayerSkills(context.gameConfig, attacker.roomName, attacker.playerName);
        await CombatSkillCasting.changeSkill(
            attacker,
            context.e2eGroup,
            TestAutoRecoveryTicks.ATTACK_SHORT,
            TestAutoRecoveryTicks.DIRECT_ATTACK
        );
        let placed = await RoomObjectsApi.placePlayerNearPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName2,
            context.gameConfig.e2ePlayerName
        );
        expect(placed.position, 'The second player must be placed next to the first one: '+placed.error).toBeTruthy();
        await TestAutoRecoveryTicks.lowerLife(secondContext.gameConfig, TestAutoRecoveryTicks.PVP_TARGET_LIFE);
        await TestAutoRecoveryTicks.lowerLife(context.gameConfig, TestAutoRecoveryTicks.LOW_LIFE);
        await CombatSkillCasting.targetPlayer(context.page, await DeathObserverSteps.fetchSessionId(context.secondPage));
        let hit = await CombatSkillCasting.castSkill(context.page, attacker, TestAutoRecoveryTicks.ATTACK_SHORT, 1);
        let hitAt = Date.now();
        await context.page.waitForTimeout(AutoRecoverySteps.FAST_START_DELAY_MS + 3 * AutoRecoverySteps.FAST_TICK_MS);
        expect(
            [
                await TestAutoRecoveryTicks.fetchLife(context.gameConfig),
                await TestAutoRecoveryTicks.fetchLife(secondContext.gameConfig)
            ],
            'The open PvP battle blocks the recovery of the attacker and the target'
        ).toEqual([TestAutoRecoveryTicks.LOW_LIFE, hit.newValue]);
        await context.page.waitForTimeout(Math.max(0, hitAt + battleTimeOff - Date.now()));
        let closedAt = Date.now();
        let recovered = await TestAutoRecoveryTicks.waitForLifeChange(
            context.page,
            context.gameConfig,
            TestAutoRecoveryTicks.LOW_LIFE,
            TestAutoRecoveryTicks.RECOVERY_WAIT_MS,
            'The attacker recovers once the battle closed'
        );
        expect(
            recovered.changedAt - closedAt,
            'The recovery starts a full delay after the battle closed'
        ).toBeGreaterThanOrEqual(AutoRecoverySteps.FAST_START_DELAY_MS - AutoRecoverySteps.FAST_TICK_MS);
        await TestAutoRecoveryTicks.waitForLifeChange(
            context.page,
            secondContext.gameConfig,
            hit.newValue,
            TestAutoRecoveryTicks.RECOVERY_WAIT_MS,
            'The target recovers once the battle closed'
        );
    }

    static async runPvpDisabledRoomTest(context)
    {
        await AutoRecoverySteps.prepareFastRecovery(
            context,
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryTicks.PLAYERS_PATH)
        );
        await AutoRecoverySteps.enterForestWithFastTicks(context);
        await GameplayE2eStateApi.changeRoomCustomData(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            {pvpEnabled: false}
        );
        test.setTimeout(test.info().timeout + TimeConstants.forLongRun(TimeConstants.GAME_START, context.longRun));
        let secondConfig = Login.fetchSecondPlayerConfig(context.gameConfig);
        await Login.loginAndEnterForest(context.secondPage, secondConfig, context.longRun);
        expect(
            (await GameplayE2eStateApi.fetchPlayer(secondConfig, Login.FOREST_ROOM_NAME, secondConfig.e2ePlayerName))
                .hasPvpAction,
            'The player that joins the room with pvpEnabled off gets no PvP action'
        ).toBe(false);
        await TestAutoRecoveryTicks.lowerLife(secondConfig, TestAutoRecoveryTicks.LOW_LIFE);
        await TestAutoRecoveryTicks.waitForLifeChange(
            context.page,
            secondConfig,
            TestAutoRecoveryTicks.LOW_LIFE,
            TestAutoRecoveryTicks.RECOVERY_WAIT_MS,
            'The player with no PvP action recovers'
        );
    }

    static run()
    {
        test.describe('Auto Recovery Ticks', () => {
            test('player whose client is gone from the room is skipped while the other recovers', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryTicks.runHiddenClientTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('tick still running when the next interval fires skips the overlapping tick', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryTicks.runOverlappingTickTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('open PvP battle blocks the recovery until its time off passed and then a full delay', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryTicks.runPvpBattleTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player with no PvP action in a room with pvpEnabled off still recovers', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryTicks.runPvpDisabledRoomTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
        });
    }

}

TestAutoRecoveryTicks.run();
