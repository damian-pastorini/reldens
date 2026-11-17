/**
 *
 * Reldens - Test Auto Recovery Events
 *
 * Tests the players auto recovery around other gameplay events with the fast cases of AutoRecoverySteps (1 second
 * tick, 3 seconds start delay, every enemy disabled): with a base life modifier seeded on the configured equipment
 * item for the group (the item modifiers are loaded on every login), equipping it at full life recovers the life up to
 * the new base, and unequipping it with the life on the raised base keeps that life with no recovery; with a clan level
 * stat modifier seeded for the player clan and persistEveryTicks 1, the stats stored by a recovery tick have the clan
 * modifier reverted; a player killed during the delay revives in place with its full life, the ticks send it nothing
 * and a new damage waits the full delay again; a stats save rejected on a persist tick keeps the ticks running; with
 * both players recovering, the second one keeps recovering after the first one leaves; and with the forest room set to
 * dispose when empty (the stored rooms keep it off), its recovery interval stops when its last player leaves and the
 * room is disposed, and a new forest room starts its own interval.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { DeathReviveSteps } = require('./helpers/death-revive-steps');
const { ClanSeed } = require('./helpers/clan-seed');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { TestCombatDeath } = require('./helpers/test-combat-death');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { ActionsConst } = require('../../lib/actions/constants');
const { GameConst } = require('../../lib/game/constants');
const { InventoryConst } = require('../../lib/inventory/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestAutoRecoveryEvents
{

    static PLAYERS_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS;
    static PERSIST_PATH = ActionsConst.AUTO_RECOVERY.CONFIG_PATHS.PLAYERS+'/persistEveryTicks';
    static INCREMENT_OPERATION = 1;
    static BASE_LIFE_BONUS = 10;
    static CLAN_STAT_KEY = 'atk';
    static CLAN_STAT_BONUS = 10;
    static LOW_LIFE = 1;
    static DELAY_LIFE = 10;
    static POLL_MS = 100;
    static RECOVERY_WAIT_MS = 8000;
    static DISPOSE_WAIT_MS = 15000;
    static BEFORE_DELAY_MS = 2000;
    static TELEPORT_OFF = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};

    static async startCase(context, configValues = {})
    {
        await AutoRecoverySteps.prepareFastRecovery(context, Object.assign(
            AutoRecoverySteps.fastRecoveryConfig(TestAutoRecoveryEvents.PLAYERS_PATH),
            configValues
        ));
    }

    static async fetchPlayer(gameConfig, roomName = Login.FOREST_ROOM_NAME)
    {
        return await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, gameConfig.e2ePlayerName);
    }

    static async fetchLifeKey(gameConfig)
    {
        return await E2eSeedAndRestoreApi.fetchConfigValue(gameConfig, ForestEnemyKill.AFFECTED_PROPERTY_PATH);
    }

    static async lowerLife(gameConfig, life)
    {
        return await AutoRecoverySteps.lowerPlayerLife(gameConfig, gameConfig.e2ePlayerName, life);
    }

    static async waitForRecovery(gameConfig, aboveLife, message)
    {
        await expect.poll(
            async () => (await TestAutoRecoveryEvents.fetchPlayer(gameConfig)).life,
            {message, timeout: TestAutoRecoveryEvents.RECOVERY_WAIT_MS, intervals: [TestAutoRecoveryEvents.POLL_MS]}
        ).toBeGreaterThan(aboveLife);
    }

    static async seedEquipmentBaseLife(context, isEquipped)
    {
        let equipmentKey = context.gameConfig.e2eEquipableItemId;
        await E2eSeedAndRestoreApi.createRow(context.gameConfig, context.e2eGroup, 'itemsItemModifiers', {
            item_id: await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'itemsItem', {key: equipmentKey}),
            key: 'e2e_'+equipmentKey+'_base_life',
            property_key: 'statsBase/'+await TestAutoRecoveryEvents.fetchLifeKey(context.gameConfig),
            operation: TestAutoRecoveryEvents.INCREMENT_OPERATION,
            value: String(TestAutoRecoveryEvents.BASE_LIFE_BONUS)
        });
        await E2eSeedAndRestoreApi.updateWithPreserve(
            context.gameConfig,
            context.e2eGroup,
            'itemsInventory',
            await E2eSeedAndRestoreApi.fetchInventoryFilters(context.gameConfig, context.gameConfig.e2ePlayerName, equipmentKey),
            {is_active: isEquipped ? 1 : 0}
        );
        return equipmentKey;
    }

    static async sendEquipAndWaitBase(context, equipmentKey, expectedBase, message)
    {
        await RoomMessagesRecorder.sendMessage(context.page, {act: InventoryConst.ACTIONS.EQUIP, 'idx': equipmentKey});
        await expect.poll(
            async () => (await TestAutoRecoveryEvents.fetchPlayer(context.gameConfig)).totalLife,
            {message, timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(expectedBase);
    }

    static async runEquipRaisesBaseTest(context)
    {
        await TestAutoRecoveryEvents.startCase(
            context,
            {[TestAutoRecoveryEvents.PLAYERS_PATH+'/properties/hp']: TestAutoRecoveryEvents.BASE_LIFE_BONUS}
        );
        let equipmentKey = await TestAutoRecoveryEvents.seedEquipmentBaseLife(context, false);
        await AutoRecoverySteps.enterForestWithFastTicks(context);
        let player = await TestAutoRecoveryEvents.fetchPlayer(context.gameConfig);
        expect(player.life, 'The player starts at its full life').toBe(player.totalLife);
        let newBase = player.totalLife + TestAutoRecoveryEvents.BASE_LIFE_BONUS;
        await TestAutoRecoveryEvents.sendEquipAndWaitBase(context, equipmentKey, newBase, 'The item raises the base life');
        await expect.poll(
            async () => (await TestAutoRecoveryEvents.fetchPlayer(context.gameConfig)).life,
            {message: 'The life recovers up to the new base', timeout: TestAutoRecoveryEvents.RECOVERY_WAIT_MS}
        ).toBe(newBase);
    }

    static async runUnequipLowersBaseTest(context)
    {
        await TestAutoRecoveryEvents.startCase(context);
        let equipmentKey = await TestAutoRecoveryEvents.seedEquipmentBaseLife(context, true);
        await AutoRecoverySteps.enterForestWithFastTicks(context);
        let raisedBase = (await TestAutoRecoveryEvents.fetchPlayer(context.gameConfig)).totalLife;
        await GameplayE2eStateApi.setPlayerStats(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            {[await TestAutoRecoveryEvents.fetchLifeKey(context.gameConfig)]: raisedBase}
        );
        await TestAutoRecoveryEvents.sendEquipAndWaitBase(
            context,
            equipmentKey,
            raisedBase - TestAutoRecoveryEvents.BASE_LIFE_BONUS,
            'The unequipped item lowers the base life'
        );
        await context.page.waitForTimeout(AutoRecoverySteps.FAST_START_DELAY_MS + 3 * AutoRecoverySteps.FAST_TICK_MS);
        expect(
            (await TestAutoRecoveryEvents.fetchPlayer(context.gameConfig)).life,
            'The life above the lowered base gets no recovery and is not raised'
        ).toBe(raisedBase);
    }

    static async runClanModifierRevertedTest(context)
    {
        await TestAutoRecoveryEvents.startCase(context, {[TestAutoRecoveryEvents.PERSIST_PATH]: 1});
        let playerId = await E2eSeedAndRestoreApi.fetchRowId(
            context.gameConfig,
            'players',
            {name: context.gameConfig.e2ePlayerName}
        );
        await ClanSeed.seedClanWithMembers(context.gameConfig, context.e2eGroup, playerId, [playerId]);
        await ClanSeed.seedLevelModifier(
            context.gameConfig,
            context.e2eGroup,
            TestAutoRecoveryEvents.CLAN_STAT_KEY,
            TestAutoRecoveryEvents.INCREMENT_OPERATION,
            TestAutoRecoveryEvents.CLAN_STAT_BONUS
        );
        let storedStat = await ClanSeed.fetchStoredStatValue(
            context.gameConfig,
            playerId,
            TestAutoRecoveryEvents.CLAN_STAT_KEY
        );
        await AutoRecoverySteps.enterForestWithFastTicks(context);
        expect(
            (await TestAutoRecoveryEvents.fetchPlayer(context.gameConfig)).stats[TestAutoRecoveryEvents.CLAN_STAT_KEY],
            'The clan level modifier is applied to the live stats'
        ).toBe(storedStat + TestAutoRecoveryEvents.CLAN_STAT_BONUS);
        await TestAutoRecoveryEvents.lowerLife(context.gameConfig, TestAutoRecoveryEvents.LOW_LIFE);
        await TestAutoRecoveryEvents.waitForRecovery(context.gameConfig, TestAutoRecoveryEvents.LOW_LIFE, 'Recovery');
        await expect.poll(
            async () => await ForestEnemyKill.fetchStoredLife(context.gameConfig, context.gameConfig.e2ePlayerName),
            {message: 'The persist tick stores the recovered life', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(TestAutoRecoveryEvents.LOW_LIFE);
        expect(
            await ClanSeed.fetchStoredStatValue(context.gameConfig, playerId, TestAutoRecoveryEvents.CLAN_STAT_KEY),
            'The stored stats have the clan modifier reverted'
        ).toBe(storedStat);
    }

    static async runDeathDuringDelayTest(context)
    {
        await TestAutoRecoveryEvents.startCase(context);
        await DeathReviveSteps.prepareDeath(context, TestAutoRecoveryEvents.TELEPORT_OFF);
        await AutoRecoverySteps.enterForestWithFastTicks(context);
        await TestAutoRecoveryEvents.lowerLife(context.gameConfig, TestAutoRecoveryEvents.DELAY_LIFE);
        await TestCombatDeath.killPlayerAgain(context.page, context.gameConfig, TimeConstants.ENEMY_KILL);
        let revivedPlayer = await DeathReviveSteps.expectAliveInForest(context);
        expect(revivedPlayer.life, 'The player revives with its full life').toBe(revivedPlayer.totalLife);
        await RoomMessagesRecorder.start(context.page);
        await context.page.waitForTimeout(3 * AutoRecoverySteps.FAST_TICK_MS);
        expect(
            await RoomMessagesRecorder.fetchMessages(context.page, GameConst.PLAYER_STATS),
            'The recovery ticks send nothing to the revived player at full life'
        ).toEqual([]);
        await TestAutoRecoveryEvents.lowerLife(context.gameConfig, TestAutoRecoveryEvents.LOW_LIFE);
        await context.page.waitForTimeout(TestAutoRecoveryEvents.BEFORE_DELAY_MS);
        expect(
            (await TestAutoRecoveryEvents.fetchPlayer(context.gameConfig)).life,
            'The new damage waits the full delay again'
        ).toBe(TestAutoRecoveryEvents.LOW_LIFE);
        await TestAutoRecoveryEvents.waitForRecovery(
            context.gameConfig,
            TestAutoRecoveryEvents.LOW_LIFE,
            'The life recovers after the delay'
        );
    }

    static async runRejectedSaveTest(context)
    {
        await TestAutoRecoveryEvents.startCase(context, {[TestAutoRecoveryEvents.PERSIST_PATH]: 1});
        await AutoRecoverySteps.enterForestWithFastTicks(context);
        await TestAutoRecoveryEvents.lowerLife(context.gameConfig, TestAutoRecoveryEvents.LOW_LIFE);
        let failure = await GameplayE2eStateApi.failRoomMethod(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            'savePlayerStats',
            1
        );
        expect(failure.methodKey, 'The stats save must fail once: '+failure.error).toBe('savePlayerStats');
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchRoomMethodFailures(
                context.gameConfig,
                Login.FOREST_ROOM_NAME,
                'savePlayerStats'
            )).done,
            {message: 'The persist tick save is rejected', timeout: TestAutoRecoveryEvents.RECOVERY_WAIT_MS}
        ).toBe(1);
        await TestAutoRecoveryEvents.waitForRecovery(
            context.gameConfig,
            (await TestAutoRecoveryEvents.fetchPlayer(context.gameConfig)).life,
            'The next tick still runs after the rejected save'
        );
    }

    static async runOtherPlayerLeavesTest(context)
    {
        await TestAutoRecoveryEvents.startCase(context);
        let secondContext = await DeathObserverSteps.loginBothInForest(context);
        await AutoRecoverySteps.restartFastTicks(context);
        await TestAutoRecoveryEvents.lowerLife(context.gameConfig, TestAutoRecoveryEvents.LOW_LIFE);
        await TestAutoRecoveryEvents.lowerLife(secondContext.gameConfig, TestAutoRecoveryEvents.LOW_LIFE);
        await context.page.goto('about:blank');
        await TestAutoRecoveryEvents.waitForRecovery(
            secondContext.gameConfig,
            TestAutoRecoveryEvents.LOW_LIFE,
            'The second player keeps recovering after the first one left'
        );
    }

    static async fetchForestTicks(gameConfig)
    {
        return (await GameplayE2eStateApi.fetchRecoveryTicks(gameConfig)).roomsNames.includes(Login.FOREST_ROOM_NAME);
    }

    static mapTicksState(recoveryTicks)
    {
        return {
            forestTicks: recoveryTicks.roomsNames.includes(Login.FOREST_ROOM_NAME),
            ticksWithoutRoom: recoveryTicks.ticksCount - recoveryTicks.roomsNames.length
        };
    }

    static async runDisposedRoomTicksTest(context)
    {
        await TestAutoRecoveryEvents.startCase(context);
        await AutoRecoverySteps.enterForestWithFastTicks(context);
        expect(await TestAutoRecoveryEvents.fetchForestTicks(context.gameConfig), 'The forest room ticks').toBe(true);
        let autoDispose = await GameplayE2eStateApi.changeRoomProperty(
            context.gameConfig,
            context.e2eGroup,
            Login.FOREST_ROOM_NAME,
            'autoDispose',
            true
        );
        expect(autoDispose.propertyKey, 'The forest room must dispose when empty: '+autoDispose.error).toBe('autoDispose');
        await AutoRecoverySteps.moveToTown(context.page, context.gameConfig);
        await expect.poll(
            async () => TestAutoRecoveryEvents.mapTicksState(
                await GameplayE2eStateApi.fetchRecoveryTicks(context.gameConfig)
            ),
            {message: 'The disposed forest room interval stops', timeout: TestAutoRecoveryEvents.DISPOSE_WAIT_MS}
        ).toEqual({forestTicks: false, ticksWithoutRoom: 0});
        await context.page.goto('about:blank');
        await AutoRecoverySteps.enterForestWithFastTicks(context);
        expect(
            await TestAutoRecoveryEvents.fetchForestTicks(context.gameConfig),
            'The new forest room starts its own ticks'
        ).toBe(true);
        await TestAutoRecoveryEvents.lowerLife(context.gameConfig, TestAutoRecoveryEvents.LOW_LIFE);
        await TestAutoRecoveryEvents.waitForRecovery(
            context.gameConfig,
            TestAutoRecoveryEvents.LOW_LIFE,
            'The new forest room recovers the player'
        );
    }

    static run()
    {
        test.describe('Auto Recovery Events', () => {
            test('item equipped that raises the base life at full life recovers up to the new base', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEvents.runEquipRaisesBaseTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('item unequipped that lowers the base below the life keeps the life with no recovery', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEvents.runUnequipLowersBaseTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('stats stored by a recovery tick have the clan modifier reverted', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEvents.runClanModifierRevertedTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player killed during the delay revives full, gets no tick stats and a new damage waits the delay', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEvents.runDeathDuringDelayTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('rejected stats save on a persist tick keeps the ticks running', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEvents.runRejectedSaveTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('second player keeps recovering after the first one leaves', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEvents.runOtherPlayerLeavesTest(
                    {page, secondPage, screenshots, gameConfig, e2eGroup, longRun}
                );
            });
            test('disposed forest room stops its ticks and the new forest room starts its own', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestAutoRecoveryEvents.runDisposedRoomTicksTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestAutoRecoveryEvents.run();
