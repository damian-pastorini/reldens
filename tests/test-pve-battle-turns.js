/**
 *
 * Reldens - Test Pve Battle Turns
 *
 * Tests the pending battle turn of a PvE battle (ISSUE #461) over the PveBattleBuilder enemy, with the world timers
 * recorded instead of scheduled: a battle started again while the action waits and a turn is already pending neither
 * chases nor leaves and keeps that one pending turn; an action that can not activate yet or whose owner is casting with
 * no pending turn schedules one after the longest of the skill delay (only when it can not activate) and the longest
 * cast time of the enemy actions (only while its owner casts), and that turn frees its entry and continues the battle;
 * an action failing its validation for another reason still chases the player; a left battle clears the pending turn
 * of the player; a new turn replaces the pending one, a turn is never added while one is pending and a failed turn is
 * logged and frees its entry.
 *
 */

const { BaseTest } = require('./base-test');
const { PveBattleBuilder } = require('./fixtures/pve-battle-builder');

class TestPveBattleTurns extends BaseTest
{

    createWaitingSetup(actionProps)
    {
        return PveBattleBuilder.setEnemyAction(
            PveBattleBuilder.createChaseSetup(0),
            Object.assign({canActivate: false}, actionProps)
        );
    }

    async recordTimers(run)
    {
        let originals = {setTimeout: global.setTimeout, clearTimeout: global.clearTimeout};
        let timers = {scheduled: [], cleared: []};
        global.setTimeout = (callback, delay) => timers.scheduled.push({callback, delay});
        global.clearTimeout = (timerId) => timers.cleared.push(timerId);
        let failure = null;
        try {
            await run();
        } catch(error) {
            failure = error;
        }
        Object.assign(global, originals);
        if(failure){
            throw failure;
        }
        return timers;
    }

    async testABattleStartedAgainDuringTheSkillDelayKeepsItsPendingTurn()
    {
        await this.test('a battle started again while the action waits its delay and a turn is pending neither chases nor leaves', async () => {
            let setup = this.createWaitingSetup({});
            let playerId = setup.playerSchema.player_id;
            let timers = await this.recordTimers(async () => {
                setup.pve.battleTurnTimers.timers[playerId] = 'running-turn';
                await setup.pve.startBattleWith(setup.playerSchema, setup.room);
            });
            this.assert.deepStrictEqual(
                [
                    setup.chasedBodies,
                    setup.originMoves,
                    setup.pve.inBattleWithPlayers[playerId],
                    setup.pve.battleTurnTimers.timers,
                    timers
                ],
                [[], 0, true, {[playerId]: 'running-turn'}, {scheduled: [], cleared: []}]
            );
        });
    }

    async testAWaitingActionWithNoPendingTurnSchedulesOne()
    {
        await this.test('an action that can not activate or whose owner casts schedules one turn after the longest wait', async () => {
            let waitingCases = [
                {actionProps: {canActivate: false, skillDelay: 1000, castTime: 2500}, clawCastTime: 0, delay: 1000},
                {
                    actionProps: {canActivate: true, owner: {isCasting: true}, skillDelay: 3000, castTime: 2000},
                    clawCastTime: 0,
                    delay: 2000
                },
                {
                    actionProps: {canActivate: false, owner: {isCasting: true}, skillDelay: 1000, castTime: 2500},
                    clawCastTime: 0,
                    delay: 2500
                },
                {
                    actionProps: {canActivate: true, owner: {isCasting: true}, skillDelay: 1000, castTime: 2000},
                    clawCastTime: 4000,
                    delay: 4000
                }
            ];
            for(let waitingCase of waitingCases){
                let setup = this.createWaitingSetup(waitingCase.actionProps);
                let playerId = setup.playerSchema.player_id;
                setup.pve.targetObject.actionsKeys.push('claw');
                setup.pve.targetObject.actions.claw = PveBattleBuilder.createEnemyAction(
                    Object.assign({}, waitingCase.actionProps, {key: 'claw', castTime: waitingCase.clawCastTime})
                );
                let timers = await this.recordTimers(async () => setup.pve.continueBattleWith(setup.playerSchema, setup.room));
                let pendingTurns = Object.keys(setup.pve.battleTurnTimers.timers);
                let continuedPlayers = [];
                setup.pve.continueBattleWith = async (playerSchema) => continuedPlayers.push(playerSchema.player_id);
                await timers.scheduled[0].callback();
                this.assert.deepStrictEqual(
                    [
                        timers.scheduled.map((timer) => timer.delay),
                        pendingTurns,
                        setup.chasedBodies,
                        continuedPlayers,
                        setup.pve.battleTurnTimers.timers,
                        setup.pve.inBattleWithPlayers[playerId]
                    ],
                    [[waitingCase.delay], [String(playerId)], [], [playerId], {}, true],
                    'Expected wait: '+waitingCase.delay
                );
            }
        });
    }

    async testAnActionFailingForAnotherReasonStillChases()
    {
        await this.test('an action failing its validation while it can activate and its owner is not casting chases the player', async () => {
            let setup = this.createWaitingSetup({canActivate: true});
            let timers = await this.recordTimers(async () => setup.pve.continueBattleWith(setup.playerSchema, setup.room));
            this.assert.deepStrictEqual(
                [setup.chasedBodies, setup.delayedStarts, setup.pve.battleTurnTimers.timers, timers.scheduled],
                [[setup.playerSchema.physicalBody], 1, {}, []]
            );
        });
    }

    async testALeftBattleClearsThePendingTurn()
    {
        await this.test('a battle left with a pending turn clears that turn and never resumes it', async () => {
            let setup = this.createWaitingSetup({});
            let playerId = setup.playerSchema.player_id;
            let timers = await this.recordTimers(async () => {
                await setup.pve.continueBattleWith(setup.playerSchema, setup.room);
                setup.pve.leaveBattle(setup.playerSchema);
            });
            this.assert.deepStrictEqual(
                [
                    timers.scheduled.length,
                    timers.cleared.length,
                    timers.cleared.filter(Boolean),
                    setup.pve.battleTurnTimers.timers,
                    setup.pve.inBattleWithPlayers,
                    playerId in setup.pve.lastHitAt,
                    setup.originMoves
                ],
                [1, 2, [1], {}, {}, false, 1]
            );
        });
    }

    async testANewTurnReplacesThePendingOneAndAFailedTurnFreesIt()
    {
        await this.test('a new turn replaces the pending one, a free turn waits the pending one and a failed turn frees it', async () => {
            let setup = this.createWaitingSetup({});
            let playerId = setup.playerSchema.player_id;
            let turnTimers = setup.pve.battleTurnTimers;
            let turns = [];
            let isPendingFreeScheduled = true;
            let timers = await this.recordTimers(async () => {
                turnTimers.schedule(playerId, 1000, async () => turns.push('replaced'));
                turnTimers.schedule(playerId, 2000, () => Promise.reject({message: 'Turn.'}));
                isPendingFreeScheduled = turnTimers.scheduleWhenFree(playerId, 3000, async () => turns.push('waited'));
            });
            await timers.scheduled[1].callback();
            let failedTurnTimers = Object.assign({}, turnTimers.timers);
            let freeTimers = await this.recordTimers(async () => {
                turnTimers.scheduleWhenFree(playerId, 3000, async () => turns.push('free'));
            });
            await freeTimers.scheduled[0].callback();
            this.assert.deepStrictEqual(
                [
                    timers.scheduled.map((timer) => timer.delay),
                    timers.cleared.length,
                    timers.cleared.filter(Boolean),
                    isPendingFreeScheduled,
                    failedTurnTimers,
                    freeTimers.scheduled.map((timer) => timer.delay),
                    turns,
                    turnTimers.timers
                ],
                [[1000, 2000], 2, [1], false, {}, [3000], ['free'], {}]
            );
        });
    }

}

module.exports.TestPveBattleTurns = TestPveBattleTurns;
