/**
 *
 * Reldens - Test Player Death Offline Joins
 *
 * Tests the joins of the OfflinePlayerDeaths with the death relocation fixtures: a created player with no life is held
 * dead until its join loads the death (a held player whose loaded stats have life is activated again), the next join
 * of a player with no life stored loads the death again with the game over time left (the whole game over time without
 * a recorded death) through "reldens.playerDeathRestored", never a new "reldens.playerDeath" (so the death drops and the
 * other new death listeners never run again), also when that join runs before the leave of the dead session (that later leave keeps nothing),
 * replacing the state and the pending timer the scene players state handler gave that player (its timer never runs),
 * while a join with life only drops the kept death; holding any join stops the offline revive timer of its kept death.
 *
 */

const { BaseTest } = require('./base-test');
const { DeathRelocationBuilder } = require('./fixtures/death-relocation-builder');
const { ActionsConst } = require('../lib/actions/constants');
const { GameConst } = require('../lib/game/constants');
const { setTimeout: waitMs } = require('timers/promises');

class TestPlayerDeathOfflineJoins extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.deathBuilder = new DeathRelocationBuilder();
        this.privateData = ActionsConst.DEATH.PRIVATE_DATA;
        this.handlerTimerMs = 2;
    }

    async testTheNextJoinLoadsTheDeathWithTheTimeLeft()
    {
        await this.test('the next join with no life loads the death with the game over time left, a join with life only drops it', async () => {
            let setup = await this.deathBuilder.createOfflineDeathsSetup();
            setup.playerSchema.setPrivate(this.privateData.REVIVE_AT, Date.now() + 5000);
            this.deathBuilder.keepOfflineDeathWithoutTimer(setup);
            let deadJoin = await this.deathBuilder.joinOfflineDeathAgain(setup, 0);
            this.assert.deepStrictEqual(
                [
                    deadJoin.isRestored,
                    deadJoin.joinedPlayer.inState,
                    4000 < deadJoin.reviveDelayMs && 5000 >= deadJoin.reviveDelayMs,
                    deadJoin.isNewDeathEmitted
                ],
                [true, GameConst.STATUS.DEATH, true, false]
            );
            this.assert.deepStrictEqual(setup.client.sentMessages, [{act: GameConst.GAME_OVER}]);
            let freshSetup = await this.deathBuilder.createOfflineDeathsSetup();
            let notKeptJoin = await this.deathBuilder.joinOfflineDeathAgain(freshSetup, 0);
            this.assert.deepStrictEqual([notKeptJoin.isRestored, notKeptJoin.reviveDelayMs], [true, 60000]);
            let aliveSetup = await this.deathBuilder.createOfflineDeathsSetup();
            this.deathBuilder.keepOfflineDeathWithoutTimer(aliveSetup);
            let aliveJoin = await this.deathBuilder.joinOfflineDeathAgain(aliveSetup, 50);
            this.assert.deepStrictEqual(
                [
                    aliveJoin.isRestored,
                    aliveJoin.joinedPlayer.inState,
                    aliveSetup.offlineDeaths.deathsByPlayerId,
                    aliveSetup.activatedStates
                ],
                [false, GameConst.STATUS.ACTIVE, {}, []]
            );
        });
    }

    async testAJoinBeforeTheDeadSessionLeaveLoadsTheRecordedDeath()
    {
        await this.test('a join that runs before the leave of the dead session loads the recorded death, that later leave keeps nothing', async () => {
            let setup = await this.deathBuilder.createOfflineDeathsSetup();
            setup.playerSchema.setPrivate(this.privateData.REVIVE_AT, Date.now() + 5000);
            setup.offlineDeaths.recordDeath({room: setup.room, targetSchema: setup.playerSchema});
            let raceJoin = await this.deathBuilder.joinOfflineDeathAgain(setup, 0, GameConst.STATUS.ACTIVE, 'session-8');
            setup.offlineDeaths.recordDeath({room: setup.room, targetSchema: raceJoin.joinedPlayer});
            let isOldLeaveKept = setup.offlineDeaths.keepDeath({room: setup.room, playerSchema: setup.playerSchema});
            let record = setup.offlineDeaths.deathsByPlayerId[setup.playerSchema.player_id];
            this.assert.deepStrictEqual(
                [
                    raceJoin.isRestored,
                    raceJoin.joinedPlayer.inState,
                    4000 < raceJoin.reviveDelayMs && 5000 >= raceJoin.reviveDelayMs,
                    isOldLeaveKept,
                    record.sessionId,
                    record.timer
                ],
                [true, GameConst.STATUS.DEATH, true, false, 'session-8', false]
            );
        });
    }

    async testACreatedPlayerWithNoLifeIsHeldDead()
    {
        await this.test('a created player with no life is held dead until its join loads the death, a held player with life is activated', async () => {
            let setup = await this.deathBuilder.createOfflineDeathsSetup();
            let noLifePlayer = {stats: {hp: 0}, state: {inState: GameConst.STATUS.ACTIVE}};
            let lifePlayer = {stats: {hp: 50}, state: {inState: GameConst.STATUS.ACTIVE}};
            let holdResults = [setup.offlineDeaths.holdDeath(noLifePlayer), setup.offlineDeaths.holdDeath(lifePlayer)];
            let heldWithLifeJoin = await this.deathBuilder.joinOfflineDeathAgain(setup, 50, GameConst.STATUS.DEATH);
            this.assert.deepStrictEqual(
                [
                    holdResults,
                    noLifePlayer.state.inState,
                    lifePlayer.state.inState,
                    heldWithLifeJoin.isRestored,
                    heldWithLifeJoin.joinedPlayer.inState,
                    setup.activatedStates
                ],
                [
                    [true, false],
                    GameConst.STATUS.DEATH,
                    GameConst.STATUS.ACTIVE,
                    false,
                    GameConst.STATUS.ACTIVE,
                    [GameConst.STATUS.ACTIVE]
                ]
            );
        });
    }

    async testTheHeldJoinStopsTheKeptDeathOfflineRevive()
    {
        await this.test('a join held with or without life stops the offline revive timer of its kept death, so it never runs during the join', async () => {
            for(let joinedLife of [0, 50]){
                let setup = await this.deathBuilder.createOfflineDeathsSetup();
                let playerId = setup.playerSchema.player_id;
                setup.playerSchema.setPrivate(this.privateData.REVIVE_AT, Date.now() + this.handlerTimerMs);
                setup.offlineDeaths.recordDeath({room: setup.room, targetSchema: setup.playerSchema});
                setup.offlineDeaths.keepDeath({room: setup.room, playerSchema: setup.playerSchema});
                let joiningPlayer = {player_id: playerId, stats: {hp: joinedLife}, state: {inState: GameConst.STATUS.ACTIVE}};
                let isHeld = setup.offlineDeaths.holdDeath(joiningPlayer);
                await waitMs(this.handlerTimerMs * 10);
                this.assert.deepStrictEqual(
                    [isHeld, setup.offlineDeaths.deathsByPlayerId[playerId].timer, setup.storedUpdates],
                    [0 === joinedLife, false, []],
                    'Joined life: '+joinedLife
                );
            }
        });
    }

    async testTheJoinReplacesTheStateHandlerStateWithTheLoadedDeath()
    {
        await this.test('the next join with no life replaces the scene state handler state and timer with the loaded death', async () => {
            let setup = await this.deathBuilder.createOfflineDeathsSetup();
            let playerId = setup.playerSchema.player_id;
            setup.playerSchema.setPrivate(this.privateData.REVIVE_AT, Date.now() + 5000);
            this.deathBuilder.keepOfflineDeathWithoutTimer(setup);
            let handlerTimerRuns = 0;
            setup.room.playersLastStateTimers[playerId] = setTimeout(() => handlerTimerRuns++, this.handlerTimerMs);
            let handledJoin = await this.deathBuilder.joinOfflineDeathAgain(setup, 0, GameConst.STATUS.DEATH);
            await waitMs(this.handlerTimerMs * 10);
            this.assert.deepStrictEqual(
                [
                    handledJoin.isRestored,
                    handledJoin.joinedPlayer.inState,
                    4000 < handledJoin.reviveDelayMs && 5000 >= handledJoin.reviveDelayMs,
                    setup.activatedStates,
                    handlerTimerRuns
                ],
                [true, GameConst.STATUS.DEATH, true, [], 0]
            );
            this.assert.deepStrictEqual(setup.client.sentMessages, [{act: GameConst.GAME_OVER}]);
        });
    }

}

module.exports.TestPlayerDeathOfflineJoins = TestPlayerDeathOfflineJoins;
