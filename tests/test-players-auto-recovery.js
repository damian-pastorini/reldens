/**
 *
 * Reldens - Test Players Auto Recovery
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { PlayersAutoRecovery } = require('../lib/actions/server/players-auto-recovery');
const { ActionsConst } = require('../lib/actions/constants');
const { GameConst } = require('../lib/game/constants');

class TestPlayersAutoRecovery extends BaseTest
{

    createRoom(playersSchemas, clientsSessionsIds)
    {
        let room = {savedStats: [], clients: {}};
        for(let sessionId of clientsSessionsIds){
            room.clients[sessionId] = GameplayPlayerBuilder.createClient(sessionId);
        }
        room.playersKeysFromState = () => playersSchemas.map(playerSchema => playerSchema.sessionId);
        room.playerBySessionIdFromState = (sessionId) => playersSchemas.find(
            playerSchema => sessionId === playerSchema.sessionId
        );
        room.getClientById = (sessionId) => room.clients[sessionId];
        room.savePlayerStats = async (playerSchema) => {
            room.savedStats.push(playerSchema.sessionId);
            return true;
        };
        return room;
    }

    createRecovery()
    {
        let emittedEvents = [];
        let events = {
            emit: async (eventName, client, playerSchema) => {
                emittedEvents.push(eventName+':'+playerSchema.sessionId);
                return true;
            }
        };
        let playersAutoRecovery = new PlayersAutoRecovery({events});
        playersAutoRecovery.emittedEvents = emittedEvents;
        return playersAutoRecovery;
    }

    async testMissingOrDisabledConfigRecoversNobody()
    {
        await this.test('a missing or disabled players config recovers nobody', async () => {
            let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
            let room = this.createRoom([playerSchema], [playerSchema.sessionId]);
            let playersAutoRecovery = this.createRecovery();
            this.assert.strictEqual(await playersAutoRecovery.recoverRoomPlayers(room, false), 0);
            let disabledConfig = {enabled: false, properties: {hp: 5}};
            this.assert.strictEqual(await playersAutoRecovery.recoverRoomPlayers(room, disabledConfig), 0);
            this.assert.deepStrictEqual(playerSchema.stats, {hp: 50});
            this.assert.deepStrictEqual(room.clients[playerSchema.sessionId].sentMessages, []);
        });
    }

    async testAlivePlayerRecoversAndGetsTheStats()
    {
        await this.test('an alive player recovers the configured stats and gets the stats update', async () => {
            let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
            let room = this.createRoom([playerSchema], [playerSchema.sessionId]);
            let playersAutoRecovery = this.createRecovery();
            let recovered = await playersAutoRecovery.recoverRoomPlayers(room, {enabled: true, properties: {hp: 5}});
            this.assert.strictEqual(recovered, 1);
            this.assert.deepStrictEqual(playerSchema.stats, {hp: 55});
            this.assert.strictEqual(playerSchema.privateData[ActionsConst.AUTO_RECOVERY.PRIVATE_DATA.TICKS], 1);
            this.assert.deepStrictEqual(
                playersAutoRecovery.emittedEvents,
                ['reldens.savePlayerStatsUpdateClient:session-7']
            );
            this.assert.deepStrictEqual(room.clients[playerSchema.sessionId].sentMessages, [
                {act: GameConst.PLAYER_STATS, stats: {hp: 55}, statsBase: {hp: 100}}
            ]);
            this.assert.deepStrictEqual(room.savedStats, []);
        });
    }

    async testStatsAreSavedEveryPersistTicks()
    {
        await this.test('the stats are saved on every persist ticks recoveries and the count restarts', async () => {
            let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
            let room = this.createRoom([playerSchema], [playerSchema.sessionId]);
            let playersAutoRecovery = this.createRecovery();
            let playersConfig = {enabled: true, persistEveryTicks: 2, properties: {hp: 5}};
            await playersAutoRecovery.recoverRoomPlayers(room, playersConfig);
            this.assert.deepStrictEqual(room.savedStats, []);
            await playersAutoRecovery.recoverRoomPlayers(room, playersConfig);
            this.assert.deepStrictEqual(room.savedStats, ['session-7']);
            this.assert.strictEqual(playerSchema.privateData[ActionsConst.AUTO_RECOVERY.PRIVATE_DATA.TICKS], 0);
            this.assert.deepStrictEqual(playerSchema.stats, {hp: 60});
            this.assert.strictEqual(room.clients[playerSchema.sessionId].sentMessages.length, 1);
        });
    }

    async testNotRecoverablePlayersAreSkipped()
    {
        await this.test('the dead, disabled, changing scene, disconnected and full players are skipped', async () => {
            let deadPlayer = GameplayPlayerBuilder.createPlayerSchema({
                sessionId: 'dead',
                inState: GameConst.STATUS.DEATH
            });
            let disabledPlayer = GameplayPlayerBuilder.createPlayerSchema({
                sessionId: 'disabled',
                inState: GameConst.STATUS.DISABLED
            });
            let changingPlayer = GameplayPlayerBuilder.createPlayerSchema({
                sessionId: 'changing',
                physicalBody: {isChangingScene: true}
            });
            let disconnectedPlayer = GameplayPlayerBuilder.createPlayerSchema({sessionId: 'disconnected'});
            let fullPlayer = GameplayPlayerBuilder.createPlayerSchema({sessionId: 'full', stats: {hp: 100}});
            let playersSchemas = [deadPlayer, disabledPlayer, changingPlayer, disconnectedPlayer, fullPlayer];
            let room = this.createRoom(playersSchemas, ['dead', 'disabled', 'changing', 'full']);
            let recovered = await this.createRecovery().recoverRoomPlayers(room, {enabled: true, properties: {hp: 5}});
            this.assert.strictEqual(recovered, 0);
            let lifeValues = playersSchemas.map(playerSchema => playerSchema.stats.hp);
            this.assert.deepStrictEqual(lifeValues, [50, 50, 50, 50, 100]);
            this.assert.deepStrictEqual(room.savedStats, []);
        });
    }

    createDelayedRecoveryCase(playersSchemas)
    {
        let delayedCase = {
            room: this.createRoom(playersSchemas, playersSchemas.map(playerSchema => playerSchema.sessionId)),
            playersAutoRecovery: this.createRecovery()
        };
        delayedCase.recoverAt = async (now) => await delayedCase.playersAutoRecovery.recoverRoomPlayers(
            delayedCase.room,
            {enabled: true, startDelayMs: 1000, properties: {hp: 5}},
            now
        );
        return delayedCase;
    }

    async testPlayerRecoveryWaitsTheStartDelay()
    {
        await this.test('a player recovers only when the start delay passed since its life was lowered', async () => {
            let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
            let delayedCase = this.createDelayedRecoveryCase([playerSchema]);
            this.assert.strictEqual(await delayedCase.recoverAt(0), 0);
            this.assert.strictEqual(await delayedCase.recoverAt(999), 0);
            this.assert.deepStrictEqual(playerSchema.stats, {hp: 50});
            this.assert.deepStrictEqual(delayedCase.room.clients[playerSchema.sessionId].sentMessages, []);
            this.assert.deepStrictEqual(delayedCase.playersAutoRecovery.emittedEvents, []);
            this.assert.strictEqual(await delayedCase.recoverAt(1000), 1);
            this.assert.deepStrictEqual(playerSchema.stats, {hp: 55});
            this.assert.deepStrictEqual(delayedCase.room.clients[playerSchema.sessionId].sentMessages, [
                {act: GameConst.PLAYER_STATS, stats: {hp: 55}, statsBase: {hp: 100}}
            ]);
            this.assert.deepStrictEqual(
                playerSchema.privateData[ActionsConst.AUTO_RECOVERY.PRIVATE_DATA.STATE],
                {lastValues: {hp: 55}, loweredAt: {hp: 0}}
            );
        });
    }

    async testDamagedPlayerWaitsTheStartDelayAgain()
    {
        await this.test('a player damaged after recovering waits the whole start delay again', async () => {
            let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
            let delayedCase = this.createDelayedRecoveryCase([playerSchema]);
            await delayedCase.recoverAt(0);
            await delayedCase.recoverAt(1000);
            playerSchema.stats.hp = 20;
            this.assert.strictEqual(await delayedCase.recoverAt(1500), 0);
            this.assert.strictEqual(await delayedCase.recoverAt(2499), 0);
            this.assert.deepStrictEqual(playerSchema.stats, {hp: 20});
            this.assert.strictEqual(await delayedCase.recoverAt(2500), 1);
            this.assert.deepStrictEqual(playerSchema.stats, {hp: 25});
            this.assert.deepStrictEqual(delayedCase.room.clients[playerSchema.sessionId].sentMessages.length, 2);
        });
    }

    async testEveryPlayerKeepsItsOwnRecoveryState()
    {
        await this.test('every player waits the start delay of its own lowered life', async () => {
            let firstPlayer = GameplayPlayerBuilder.createPlayerSchema({sessionId: 'first'});
            let secondPlayer = GameplayPlayerBuilder.createPlayerSchema({sessionId: 'second'});
            let delayedCase = this.createDelayedRecoveryCase([firstPlayer, secondPlayer]);
            await delayedCase.recoverAt(0);
            secondPlayer.stats.hp = 30;
            this.assert.strictEqual(await delayedCase.recoverAt(1000), 1);
            this.assert.deepStrictEqual([firstPlayer.stats.hp, secondPlayer.stats.hp], [55, 30]);
        });
    }

    async testSkippedPlayerKeepsItsRecoveryState()
    {
        await this.test('a dead player is skipped without touching its recovery state', async () => {
            let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
            let delayedCase = this.createDelayedRecoveryCase([playerSchema]);
            await delayedCase.recoverAt(0);
            playerSchema.inState = GameConst.STATUS.DEATH;
            this.assert.strictEqual(await delayedCase.recoverAt(1000), 0);
            this.assert.deepStrictEqual(
                playerSchema.privateData[ActionsConst.AUTO_RECOVERY.PRIVATE_DATA.STATE],
                {lastValues: {hp: 50}, loweredAt: {hp: 0}}
            );
            this.assert.deepStrictEqual(playerSchema.stats, {hp: 50});
        });
    }

    async testPlayerWithoutStatsIsNotRecoverable()
    {
        await this.test('a missing player or a player without stats is not recoverable', async () => {
            let playersAutoRecovery = this.createRecovery();
            this.assert.strictEqual(playersAutoRecovery.isRecoverablePlayer(false), false);
            let playerSchema = GameplayPlayerBuilder.createPlayerSchema({stats: false});
            this.assert.strictEqual(playersAutoRecovery.isRecoverablePlayer(playerSchema), false);
        });
    }

    async testPlayerFoughtByAnEnemyRecoversAfterTheBattleDelay()
    {
        await this.test('a player fought by an enemy never recovers and waits the delay after the battle', async () => {
            let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
            let delayedCase = this.createDelayedRecoveryCase([playerSchema]);
            let enemyBattle = {inBattleWithPlayers: {[playerSchema.player_id]: true}};
            delayedCase.room.objectsManager = {roomObjects: {enemy1: {battle: enemyBattle}, npc1: {}}};
            this.assert.strictEqual(await delayedCase.recoverAt(0), 0);
            this.assert.strictEqual(await delayedCase.recoverAt(5000), 0);
            enemyBattle.inBattleWithPlayers = {};
            this.assert.strictEqual(await delayedCase.recoverAt(6000), 0);
            this.assert.strictEqual(await delayedCase.recoverAt(6999), 0);
            this.assert.deepStrictEqual(playerSchema.stats, {hp: 50});
            this.assert.strictEqual(await delayedCase.recoverAt(7000), 1);
            this.assert.deepStrictEqual(playerSchema.stats, {hp: 55});
        });
    }

    async testPlayersInPvpBattlesDoNotRecover()
    {
        await this.test('the attacker and the target of an open PvP battle never recover, the others do', async () => {
            let attacker = GameplayPlayerBuilder.createPlayerSchema({sessionId: 'attacker', playerId: 1});
            let target = GameplayPlayerBuilder.createPlayerSchema({sessionId: 'target', playerId: 2});
            let bystander = GameplayPlayerBuilder.createPlayerSchema({sessionId: 'bystander', playerId: 3});
            attacker.actions = {pvp: {inBattleWith: {targetKey: {target, time: 0}}}};
            let delayedCase = this.createDelayedRecoveryCase([attacker, target, bystander]);
            this.assert.strictEqual(await delayedCase.recoverAt(0), 0);
            this.assert.strictEqual(await delayedCase.recoverAt(1000), 1);
            this.assert.deepStrictEqual(
                [attacker.stats.hp, target.stats.hp, bystander.stats.hp],
                [50, 50, 55]
            );
            attacker.actions.pvp.inBattleWith = {};
            this.assert.strictEqual(await delayedCase.recoverAt(2000), 1);
            this.assert.strictEqual(await delayedCase.recoverAt(3000), 3);
            this.assert.deepStrictEqual([attacker.stats.hp, target.stats.hp, bystander.stats.hp], [55, 55, 65]);
        });
    }

    async testDisabledBattleRuleRecoversPlayersInBattle()
    {
        await this.test('with the out of battle rule disabled a player in battle recovers', async () => {
            let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
            playerSchema.actions = {pvp: {inBattleWith: {targetKey: {target: {sessionId: 'other'}}}}};
            let room = this.createRoom([playerSchema], [playerSchema.sessionId]);
            let playersConfig = {enabled: true, onlyOutOfBattle: false, properties: {hp: 5}};
            this.assert.strictEqual(await this.createRecovery().recoverRoomPlayers(room, playersConfig), 1);
            this.assert.deepStrictEqual(playerSchema.stats, {hp: 55});
        });
    }

}

module.exports.TestPlayersAutoRecovery = TestPlayersAutoRecovery;
