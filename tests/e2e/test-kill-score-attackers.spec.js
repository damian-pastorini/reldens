/**
 *
 * Reldens - Test Kill Score Attackers
 *
 * Tests who is scored by a kill (KillScoreRulesSteps, the attack range check off for every attacker, so a player that
 * logs in on the shared return point and pushes the target never puts it out of reach): an enemy and a player killed with the physical attack bullet skill are scored (the target is on the left
 * of the attacker, the only direction the bullet hit resolves, see real-issues.md); two players that hit the same enemy
 * and the same player at the same time give a single kill score; an attacker that kills an enemy in the forest (the
 * forest observer logs in first and is moved next to the chest, so nobody stands on the return point), changes
 * to the town and kills a player there keeps both kills on its same score row and the town broadcast reaches the town
 * only, the forest player gets none; and a guest player that kills an enemy gets its score row and its score line.
 *
 */

const { BaseE2eTest } = require('./base-e2e-test');
const { KillScoreRulesSteps } = require('./helpers/kill-score-rules-steps');
const { KillScoreSteps } = require('./helpers/kill-score-steps');
const { CombatSkillCasting } = require('./helpers/combat-skill-casting');
const { CharacterCreation } = require('./helpers/character-creation');
const { AutoRecoverySteps } = require('./helpers/auto-recovery-steps');
const { DeathObserverSteps } = require('./helpers/death-observer-steps');
const { ForestEnemyKill } = require('./helpers/forest-enemy-kill');
const { GameplayE2eStateApi } = require('./helpers/gameplay-e2e-state-api');
const { E2eSeedAndRestoreApi } = require('./helpers/e2e-seed-and-restore-api');
const { RoomMessagesRecorder } = require('./helpers/room-messages-recorder');
const { RoomObjectsApi } = require('./helpers/room-objects-api');
const { TimingObjectSession } = require('./helpers/timing-object-session');
const { Login } = require('./helpers/login');
const { TimeConstants } = require('./helpers/time-constants');
const { Selectors } = require('./selectors');
const { GameConst } = require('../../lib/game/constants');
const { ScoresConst } = require('../../lib/scores/constants');
let test = BaseE2eTest.test;
let expect = BaseE2eTest.expect;

class TestKillScoreAttackers
{

    static BULLET_SKILL_KEY = 'attackBullet';
    static LINE_TILES_STEP = 2;
    static LEFT_DIRECTION = [-1, 0];

    static addRowsToSum(sum, rows, countKey)
    {
        for(let row of rows){
            sum.total += Number(row.total_score);
            sum.kills += Number(row[countKey]);
        }
        return sum;
    }

    static async fetchKillsSum(context, playerIds, countKey)
    {
        let sum = {total: 0, kills: 0};
        for(let playerId of playerIds){
            TestKillScoreAttackers.addRowsToSum(
                sum,
                await KillScoreSteps.fetchScoreRows(context.gameConfig, playerId),
                countKey
            );
        }
        return sum;
    }

    static async fetchPlayerKillScore(context, victimLevel)
    {
        return await KillScoreRulesSteps.fetchConfigNumber(context, 'obtainedScorePerPlayer')
            + victimLevel * await KillScoreRulesSteps.fetchConfigNumber(context, 'obtainedScorePerPlayerLevelMultiplier');
    }

    static async clickAttackTogether(context)
    {
        await Promise.all([
            context.page.click(Selectors.combat.skillButton(ForestEnemyKill.ATTACK_SKILL_KEY), {force: true}),
            context.secondPage.click(Selectors.combat.skillButton(ForestEnemyKill.ATTACK_SKILL_KEY), {force: true})
        ]);
    }

    static async runBulletEnemyKillTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let placement = await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        let line = await RoomObjectsApi.placeEnemiesOnLine(
            context.page,
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            [placement.bodyKey],
            TestKillScoreAttackers.LINE_TILES_STEP,
            TestKillScoreAttackers.LEFT_DIRECTION,
            TimeConstants.SCENE_LOAD
        );
        expect(line.positions, 'The enemy must be placed on the left of the player: '+line.error).toHaveLength(1);
        expect(line.reached, 'The client must show the player on the line start').toBe(true);
        await CombatSkillCasting.targetEnemy(context.page, {bodyKey: placement.bodyKey});
        let totalBefore = await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId);
        await KillScoreSteps.attackUntil(
            context.page,
            async () => totalBefore < await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId),
            'The enemy killed with the physical attack bullet must be scored',
            TestKillScoreAttackers.BULLET_SKILL_KEY
        );
        expect(await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId)).toBe(
            totalBefore + placement.killScore
        );
    }

    static async runBulletPlayerKillTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let victimLevel = await KillScoreRulesSteps.placeVictim(context);
        let moved = await RoomObjectsApi.placePlayerNearPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            context.gameConfig.e2ePlayerName,
            context.gameConfig.e2ePlayerName2
        );
        expect(moved.position, 'The attacker must be placed on the right of the victim: '+moved.error).toBeTruthy();
        let totalBefore = await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId);
        await KillScoreSteps.attackUntil(
            context.page,
            async () => GameConst.STATUS.DEATH === (await KillScoreRulesSteps.fetchVictim(context)).inState,
            'The player killed with the physical attack bullet must die',
            TestKillScoreAttackers.BULLET_SKILL_KEY
        );
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        expect(await KillScoreSteps.fetchTotalScore(context.gameConfig, scoreData.playerId)).toBe(
            totalBefore + await TestKillScoreAttackers.fetchPlayerKillScore(context, victimLevel)
        );
    }

    static async runSimultaneousEnemyKillTest(context)
    {
        let {scoreData, secondScoreData} = await KillScoreRulesSteps.prepareTwoPlayers(context);
        let placement = await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        await Login.loginAndEnterForest(context.secondPage, Login.fetchSecondPlayerConfig(context.gameConfig), context.longRun);
        await KillScoreRulesSteps.prepareSecondPlayerKill(context, placement.bodyKey);
        await KillScoreRulesSteps.useDirectAttack(context, Login.FOREST_ROOM_NAME, context.gameConfig.e2ePlayerName);
        let playerIds = [scoreData.playerId, secondScoreData.playerId];
        let before = await TestKillScoreAttackers.fetchKillsSum(context, playerIds, 'npcs_kills_count');
        await TestKillScoreAttackers.clickAttackTogether(context);
        await expect.poll(
            async () => (await TestKillScoreAttackers.fetchKillsSum(context, playerIds, 'npcs_kills_count')).kills,
            {message: 'The enemy hit by both players is killed', timeout: TimeConstants.ENEMY_KILL}
        ).toBeGreaterThan(before.kills);
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        expect(
            await TestKillScoreAttackers.fetchKillsSum(context, playerIds, 'npcs_kills_count'),
            'The enemy killed by both players at once gives a single kill score'
        ).toEqual({total: before.total + placement.killScore, kills: before.kills + 1});
    }

    static async runSimultaneousPlayerKillTest(context)
    {
        let {scoreData, secondScoreData} = await KillScoreRulesSteps.prepareTwoPlayers(context);
        await Login.loginAndEnterForest(context.page, context.gameConfig, context.longRun);
        await Login.loginAndEnterForest(context.secondPage, Login.fetchSecondPlayerConfig(context.gameConfig), context.longRun);
        let victimPage = (await Login.startThirdPlayer(context, Login.FOREST_ROOM_NAME)).clientPage;
        let victimName = context.gameConfig.e2ePlayerName3;
        let placed = await RoomObjectsApi.placePlayerNearPlayer(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            victimName,
            context.gameConfig.e2ePlayerName
        );
        expect(placed.position, 'The victim must be placed next to the first attacker: '+placed.error).toBeTruthy();
        await RoomObjectsApi.setPlayerAffectedProperty(
            context.gameConfig,
            Login.FOREST_ROOM_NAME,
            victimName,
            ForestEnemyKill.ONE_HIT_LIFE
        );
        let victimSessionId = await DeathObserverSteps.fetchSessionId(victimPage);
        let attackers = [
            {page: context.page, playerName: context.gameConfig.e2ePlayerName},
            {page: context.secondPage, playerName: context.gameConfig.e2ePlayerName2}
        ];
        for(let attacker of attackers){
            await KillScoreRulesSteps.useDirectAttack(context, Login.FOREST_ROOM_NAME, attacker.playerName);
            await CombatSkillCasting.targetPlayer(attacker.page, victimSessionId);
        }
        let playerIds = [scoreData.playerId, secondScoreData.playerId];
        let before = await TestKillScoreAttackers.fetchKillsSum(context, playerIds, 'players_kills_count');
        await TestKillScoreAttackers.clickAttackTogether(context);
        await expect.poll(
            async () => (await GameplayE2eStateApi.fetchPlayer(context.gameConfig, Login.FOREST_ROOM_NAME, victimName)).inState,
            {message: 'The player hit by both attackers dies', timeout: TimeConstants.ENEMY_KILL}
        ).toBe(GameConst.STATUS.DEATH);
        await KillScoreSteps.waitForLateScore(context.page, context.longRun);
        expect(
            (await TestKillScoreAttackers.fetchKillsSum(context, playerIds, 'players_kills_count')).kills,
            'The player killed by both attackers at once gives a single kill'
        ).toBe(before.kills + 1);
    }

    static async runRoomChangeKillsTest(context)
    {
        let scoreData = await KillScoreRulesSteps.prepare(context);
        let forestPage = (await Login.startThirdPlayer(context, Login.FOREST_ROOM_NAME)).clientPage;
        await TimingObjectSession.placeNextToObject(
            forestPage,
            context.gameConfig,
            context.gameConfig.e2eChestKey,
            TimeConstants.SCENE_LOAD,
            'chest, away from the return point the attacker logs in on'
        );
        await KillScoreSteps.placeEnemyWithKillScore(context.page, context.gameConfig, context.longRun);
        await KillScoreRulesSteps.useDirectAttack(context, Login.FOREST_ROOM_NAME, context.gameConfig.e2ePlayerName);
        await RoomMessagesRecorder.start(forestPage);
        await KillScoreSteps.attackUntilKill(context.page, context.gameConfig);
        await expect.poll(
            async () => (await RoomMessagesRecorder.fetchMessages(forestPage, ScoresConst.ACTIONS.TOP_SCORES_UPDATE)).length,
            {message: 'The forest kill reaches the forest player', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(0);
        let firstRow = [...await KillScoreSteps.fetchScoreRows(context.gameConfig, scoreData.playerId)].shift();
        await Login.loginRootPlayer(context.secondPage, context.gameConfig, context.longRun, '2');
        await AutoRecoverySteps.moveToTown(context.page, context.gameConfig);
        await expect(
            context.page.locator(Selectors.combat.skillButton(ForestEnemyKill.ATTACK_SKILL_KEY)),
            'The attack skill button is shown again in the town'
        ).toBeVisible({timeout: TimeConstants.SCENE_LOAD});
        let victimName = context.gameConfig.e2ePlayerName2;
        let placed = await RoomObjectsApi.placePlayerNearPlayer(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            victimName,
            context.gameConfig.e2ePlayerName
        );
        expect(placed.position, 'The town victim must be placed next to the attacker: '+placed.error).toBeTruthy();
        await RoomObjectsApi.setPlayerAffectedProperty(
            context.gameConfig,
            Login.TOWN_ROOM_NAME,
            victimName,
            ForestEnemyKill.ONE_HIT_LIFE
        );
        await KillScoreRulesSteps.useDirectAttack(context, Login.TOWN_ROOM_NAME, context.gameConfig.e2ePlayerName);
        await CombatSkillCasting.targetPlayer(context.page, await DeathObserverSteps.fetchSessionId(context.secondPage));
        await RoomMessagesRecorder.start(forestPage);
        await RoomMessagesRecorder.start(context.secondPage);
        await KillScoreSteps.attackUntil(
            context.page,
            async () => Number(firstRow.total_score) < await KillScoreSteps.fetchTotalScore(
                context.gameConfig,
                scoreData.playerId
            ),
            'The kill in the town must be scored'
        );
        expect(
            (await KillScoreSteps.fetchScoreRows(context.gameConfig, scoreData.playerId)).map(row => [
                row.id,
                Number(row.npcs_kills_count),
                Number(row.players_kills_count)
            ]),
            'Both kills accumulate on the same row'
        ).toEqual([[firstRow.id, Number(firstRow.npcs_kills_count), Number(firstRow.players_kills_count) + 1]]);
        await expect.poll(
            async () => (await RoomMessagesRecorder.fetchMessages(context.secondPage, ScoresConst.ACTIONS.TOP_SCORES_UPDATE)).length,
            {message: 'The town kill broadcast reaches the town', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBeGreaterThan(0);
        expect(
            await RoomMessagesRecorder.fetchMessages(forestPage, ScoresConst.ACTIONS.TOP_SCORES_UPDATE),
            'The town kill broadcast never reaches the forest'
        ).toEqual([]);
    }

    static async runGuestKillTest(context)
    {
        let guest = await CharacterCreation.enterGuestInGame(context.page, context.longRun, Login.FOREST_ROOM_NAME);
        let guestConfig = Object.assign({}, context.gameConfig, {e2ePlayerName: guest.playerName});
        let placement = await KillScoreSteps.placeNextEnemy(context.page, guestConfig, context.longRun);
        await KillScoreSteps.attackUntilKill(context.page, guestConfig);
        let guestPlayerId = await E2eSeedAndRestoreApi.fetchRowId(context.gameConfig, 'players', {name: guest.playerName});
        await expect.poll(
            async () => await KillScoreSteps.fetchTotalScore(context.gameConfig, guestPlayerId),
            {message: 'The guest score row is created', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(placement.killScore);
        await expect.poll(
            async () => (await KillScoreSteps.fetchPanelContent(context.page)).myScore,
            {message: 'The guest score line shows its score', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(placement.killScore);
    }

    static run()
    {
        test.describe('Kill Score Attackers', () => {
            test('enemy killed with the physical attack bullet is scored', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreAttackers.runBulletEnemyKillTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('player killed with the physical attack bullet is scored', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreAttackers.runBulletPlayerKillTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two players hitting the same enemy at once give a single kill score', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreAttackers.runSimultaneousEnemyKillTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('two players hitting the same player at once give a single kill', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreAttackers.runSimultaneousPlayerKillTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('attacker that changes room keeps both kills on its row and only the new room gets the broadcast', async ({ page, secondPage, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreAttackers.runRoomChangeKillsTest({page, secondPage, screenshots, gameConfig, e2eGroup, longRun});
            });
            test('guest player that kills an enemy gets its score row and score line', async ({ page, screenshots, gameConfig, e2eGroup, longRun }) => {
                await TestKillScoreAttackers.runGuestKillTest({page, screenshots, gameConfig, e2eGroup, longRun});
            });
        });
    }

}

TestKillScoreAttackers.run();
