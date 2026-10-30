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

    async testPlayerWithoutStatsIsNotRecoverable()
    {
        await this.test('a missing player or a player without stats is not recoverable', async () => {
            let playersAutoRecovery = this.createRecovery();
            this.assert.strictEqual(playersAutoRecovery.isRecoverablePlayer(false), false);
            let playerSchema = GameplayPlayerBuilder.createPlayerSchema({stats: false});
            this.assert.strictEqual(playersAutoRecovery.isRecoverablePlayer(playerSchema), false);
        });
    }

}

module.exports.TestPlayersAutoRecovery = TestPlayersAutoRecovery;
