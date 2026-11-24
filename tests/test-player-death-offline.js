/**
 *
 * Reldens - Test Player Death Offline
 *
 * Tests the OfflinePlayerDeaths with the death relocation fixtures: every death is recorded by player ID with its
 * session, revive time, base life and town room default state (none with the death teleport disabled), replacing the
 * previous record, the recorded session of a dead player leaving the game keeps its death with its offline timer (an
 * alive player or a player with life drops it, a death never recorded or the leave of an older session keeps nothing,
 * the disabled auto revive keeps it without timer), once its game over time passes the auto revive stores the base life
 * and the town state when there is one, and a storage error drops the death answering false. Once the client of a dead player
 * tells it joined the scene it gets the game over and the revive message again (the ones sent while it was joining are
 * never shown), another message or an alive player gets nothing. The joins are tested in TestPlayerDeathOfflineJoins.
 *
 */

const { BaseTest } = require('./base-test');
const { DeathRelocationBuilder } = require('./fixtures/death-relocation-builder');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { ActionsConst } = require('../lib/actions/constants');
const { GameConst } = require('../lib/game/constants');
const { sc } = require('@reldens/utils');
const { setTimeout: waitMs } = require('timers/promises');

class TestPlayerDeathOffline extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.deathBuilder = new DeathRelocationBuilder();
        this.privateData = ActionsConst.DEATH.PRIVATE_DATA;
        this.teleportDisabled = {[ActionsConst.DEATH.CONFIG_PATHS.TELEPORT_ENABLED]: false};
        this.offlineReviveMs = 2;
    }

    async testEveryDeathIsRecordedWithItsSession()
    {
        await this.test('every death is recorded by player with its session and revive time, replacing the previous record', async () => {
            let setup = await this.deathBuilder.createOfflineDeathsSetup();
            let playerId = setup.playerSchema.player_id;
            let reviveAt = Date.now() + 60000;
            setup.playerSchema.setPrivate(this.privateData.REVIVE_AT, reviveAt);
            this.deathBuilder.keepOfflineDeathWithoutTimer(setup);
            let previousRecord = setup.offlineDeaths.deathsByPlayerId[playerId];
            setup.playerSchema.setPrivate(this.privateData.REVIVE_AT, reviveAt + 1000);
            let isRecorded = setup.offlineDeaths.recordDeath({room: setup.room, targetSchema: setup.playerSchema});
            let record = setup.offlineDeaths.deathsByPlayerId[playerId];
            this.assert.deepStrictEqual([isRecorded, previousRecord === record], [true, false]);
            this.assert.deepStrictEqual(record, {
                sessionId: setup.playerSchema.sessionId,
                reviveAt: reviveAt + 1000,
                baseValue: 100,
                townState: setup.room.loginManager.playerRoomState.getStateObjectFromRoom(setup.relocator.townRoom),
                timer: false
            });
            let noTeleportSetup = await this.deathBuilder.createOfflineDeathsSetup(this.teleportDisabled);
            noTeleportSetup.offlineDeaths.recordDeath({room: noTeleportSetup.room, targetSchema: noTeleportSetup.playerSchema});
            this.assert.strictEqual(noTeleportSetup.offlineDeaths.deathsByPlayerId[playerId].townState, false);
        });
    }

    async testOnlyTheRecordedSessionOfADeadPlayerWithNoLifeKeepsItsDeath()
    {
        await this.test('only the recorded session of a dead player with no life keeps its death and its offline timer when it leaves', async () => {
            let setup = await this.deathBuilder.createOfflineDeathsSetup();
            let playerId = setup.playerSchema.player_id;
            let reviveAt = Date.now() + 60000;
            setup.playerSchema.setPrivate(this.privateData.REVIVE_AT, reviveAt);
            let keptCases = [
                setup.offlineDeaths.keepDeath({room: setup.room, playerSchema: setup.playerSchema}),
                this.deathBuilder.keepOfflineDeathWithoutTimer(setup)
            ];
            let keptDeath = setup.offlineDeaths.dropDeath(playerId);
            setup.playerSchema.stats.hp = 30;
            keptCases.push(this.deathBuilder.keepOfflineDeathWithoutTimer(setup));
            let lifeRecord = sc.get(setup.offlineDeaths.deathsByPlayerId, playerId, false);
            setup.playerSchema.stats.hp = 0;
            setup.playerSchema.inState = GameConst.STATUS.ACTIVE;
            keptCases.push(this.deathBuilder.keepOfflineDeathWithoutTimer(setup));
            this.assert.deepStrictEqual(keptCases, [false, true, false, false]);
            this.assert.deepStrictEqual(
                [keptDeath.sessionId, keptDeath.reviveAt, Boolean(keptDeath.timer), lifeRecord],
                [setup.playerSchema.sessionId, reviveAt, true, false]
            );
            this.assert.deepStrictEqual(setup.offlineDeaths.deathsByPlayerId, {});
        });
    }

    async testAnOlderSessionLeaveKeepsNothing()
    {
        await this.test('the leave of an older session than the recorded death keeps nothing and keeps the record', async () => {
            let setup = await this.deathBuilder.createOfflineDeathsSetup();
            setup.offlineDeaths.recordDeath({room: setup.room, targetSchema: setup.playerSchema});
            let olderSession = GameplayPlayerBuilder.createPlayerSchema({
                sessionId: 'session-older',
                inState: GameConst.STATUS.DEATH,
                stats: {hp: 0}
            });
            let isKept = setup.offlineDeaths.keepDeath({room: setup.room, playerSchema: olderSession});
            let record = setup.offlineDeaths.deathsByPlayerId[setup.playerSchema.player_id];
            this.assert.deepStrictEqual(
                [olderSession.player_id, isKept, record.sessionId, record.timer],
                [setup.playerSchema.player_id, false, setup.playerSchema.sessionId, false]
            );
        });
    }

    async testTheAutoReviveStoresTheBaseLifeAndTheTownState()
    {
        await this.test('the offline auto revive stores the base life and the town room default state', async () => {
            let setup = await this.deathBuilder.createOfflineDeathsSetup();
            let playerId = setup.playerSchema.player_id;
            this.deathBuilder.keepOfflineDeathWithoutTimer(setup);
            let townState = setup.room.loginManager.playerRoomState.getStateObjectFromRoom(setup.relocator.townRoom);
            this.assert.strictEqual(await setup.offlineDeaths.resolveDeath(playerId), true);
            this.assert.deepStrictEqual(setup.storedUpdates, [
                ['stat', playerId, this.deathBuilder.hpStatId, {value: 100}],
                ['state', playerId, townState]
            ]);
            this.assert.deepStrictEqual(
                [setup.offlineDeaths.deathsByPlayerId, await setup.offlineDeaths.resolveDeath(playerId)],
                [{}, false]
            );
            let noTeleportSetup = await this.deathBuilder.createOfflineDeathsSetup(this.teleportDisabled);
            this.deathBuilder.keepOfflineDeathWithoutTimer(noTeleportSetup);
            this.assert.strictEqual(await noTeleportSetup.offlineDeaths.resolveDeath(playerId), true);
            this.assert.deepStrictEqual(
                noTeleportSetup.storedUpdates,
                [['stat', playerId, this.deathBuilder.hpStatId, {value: 100}]]
            );
        });
    }

    async testAFailedOfflineReviveDropsTheDeath()
    {
        await this.test('a storage error in the offline revive is answered false and drops the kept death', async () => {
            let setup = await this.deathBuilder.createOfflineDeathsSetup();
            let playerId = setup.playerSchema.player_id;
            this.deathBuilder.keepOfflineDeathWithoutTimer(setup);
            setup.usersManager.updatePlayerStatByIds = () => Promise.reject({message: 'Storage.'});
            this.assert.deepStrictEqual(
                [await setup.offlineDeaths.resolveDeath(playerId), setup.offlineDeaths.deathsByPlayerId, setup.storedUpdates],
                [false, {}, []]
            );
        });
    }

    async testTheDisabledAutoReviveKeepsTheDeathWithoutOfflineTimer()
    {
        await this.test('with the auto revive disabled the kept death has no offline revive timer and stores nothing', async () => {
            let setup = await this.deathBuilder.createOfflineDeathsSetup(this.deathBuilder.manualReviveConfig);
            let playerId = setup.playerSchema.player_id;
            setup.playerSchema.setPrivate(this.privateData.REVIVE_AT, Date.now() + this.offlineReviveMs);
            setup.offlineDeaths.recordDeath({room: setup.room, targetSchema: setup.playerSchema});
            let isKept = setup.offlineDeaths.keepDeath({room: setup.room, playerSchema: setup.playerSchema});
            await waitMs(this.offlineReviveMs * 10);
            this.assert.deepStrictEqual(
                [isKept, setup.offlineDeaths.deathsByPlayerId[playerId].timer, setup.storedUpdates],
                [true, false, []]
            );
        });
    }

    async testJoinedClientOfADeadPlayerGetsTheGameOverAgain()
    {
        await this.test('the joined client of a dead player gets the game over and the revive message again', async () => {
            let notifiedCases = [
                {inState: GameConst.STATUS.DEATH, act: GameConst.PLAYER_STATS, isNotified: false, sentMessages: []},
                {inState: GameConst.STATUS.ACTIVE, act: GameConst.CLIENT_JOINED, isNotified: false, sentMessages: []},
                {
                    inState: GameConst.STATUS.DEATH,
                    act: GameConst.CLIENT_JOINED,
                    isNotified: true,
                    sentMessages: [{act: GameConst.GAME_OVER}, this.deathBuilder.townMessage]
                }
            ];
            for(let notifiedCase of notifiedCases){
                let setup = await this.deathBuilder.createNotifierSetup({}, {restorationQty: 0, inState: notifiedCase.inState});
                let isNotified = setup.notifier.notifyJoinedClient({
                    room: setup.room,
                    client: setup.client,
                    playerSchema: setup.playerSchema,
                    messageData: {act: notifiedCase.act}
                });
                this.assert.deepStrictEqual(
                    [isNotified, setup.client.sentMessages],
                    [notifiedCase.isNotified, notifiedCase.sentMessages]
                );
            }
        });
    }

}

module.exports.TestPlayerDeathOffline = TestPlayerDeathOffline;
