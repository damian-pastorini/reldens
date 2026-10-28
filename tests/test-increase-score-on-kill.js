/**
 *
 * Reldens - Test Increase Score On Kill
 *
 */

const { BaseTest } = require('./base-test');
const { IncreaseScoreOnKill } = require('../lib/scores/server/subscriber/increase-score-on-kill');
const { IncreaseScoreOnKillMapper } = require('../lib/scores/server/mapper/increase-score-on-kill-mapper');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { ScoresConst } = require('../lib/scores/constants');
const { ObjectsConst } = require('../lib/objects/constants');
const { sc } = require('@reldens/utils');

class TestIncreaseScoreOnKill extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.scoresConfig = {
            obtainedScorePerPlayer: 10,
            obtainedScorePerNpc: 5,
            useNpcCustomScore: true,
            obtainedScorePerPlayerLevelMultiplier: 3
        };
        this.pendingResetValue = '2026-10-18'+ScoresConst.RESET.PENDING_MARK+sc.toJsonString({
            claimedAt: 1,
            scoresMaxId: 1,
            detailsMaxId: 0
        });
    }

    createIncreaseScoreOnKill(scoresConfig)
    {
        return new IncreaseScoreOnKill({
            config: {getWithoutLogs: () => scoresConfig},
            dataServer: {getEntity: () => ({})}
        });
    }

    createPlayerDeathEvent(killedPlayerLevel)
    {
        return {
            room: {},
            attackerPlayer: {player_id: 1},
            targetSchema: {player_id: 2, skillsServer: {classPath: {currentLevel: killedPlayerLevel}}}
        };
    }

    createKillSetup(scoresRows, lastPeriodValue, resetEnabled)
    {
        let scores = {rows: scoresRows, deletedIds: [], nextId: 10, deletesOnUpdate: 0};
        scores.loadOneBy = async (field, value) => scores.rows.find(row => value === row[field]) || false;
        scores.deleteById = async (id) => {
            scores.deletedIds.push(id);
            scores.rows = scores.rows.filter(row => id !== row.id);
            return true;
        };
        scores.create = async (scoreData) => {
            let createdRow = Object.assign({id: scores.nextId++}, scoreData);
            scores.rows.push(createdRow);
            return createdRow;
        };
        scores.update = async (filters, scoreData) => {
            if(0 < scores.deletesOnUpdate){
                scores.deletesOnUpdate--;
                scores.rows = [];
                return 0;
            }
            let storedRow = scores.rows.find(row => Object.keys(filters).every(key => filters[key] === row[key]));
            if(!storedRow){
                return 0;
            }
            Object.assign(storedRow, scoreData);
            return 1;
        };
        scores.loadWithRelations = async () => [];
        scores.preserveEntityState = () => ({});
        scores.restoreEntityState = () => true;
        let dataServer = {
            scores,
            scoresDetail: {create: async () => true},
            config: {loadOne: async () => ({id: 390, value: lastPeriodValue})}
        };
        dataServer.getEntity = (entityName) => dataServer[entityName];
        return {
            scores,
            increaseScoreOnKill: new IncreaseScoreOnKill({
                config: GameplayPlayerBuilder.createConfig({
                    'server/scores': this.scoresConfig,
                    [ScoresConst.RESET.CONFIG_PATHS.ENABLED]: resetEnabled
                }),
                dataServer
            })
        };
    }

    async killTheNpc(setup)
    {
        return await setup.increaseScoreOnKill.execute(
            new IncreaseScoreOnKillMapper().fromBattleEndedEvent({
                room: {
                    roomId: 'room-1',
                    activePlayerByPlayerId: () => ({client: {send: () => true}}),
                    broadcast: () => true
                },
                playerSchema: {player_id: 1},
                pve: {targetObject: {id: 6}}
            }),
            ObjectsConst.TYPE_OBJECT
        );
    }

    async testKillDuringAPendingResetReplacesThePreviousPeriodRow()
    {
        await this.test('a kill during a pending reset replaces the previous period row', async () => {
            let previousRow = {id: 1, player_id: 1, total_score: 50, players_kills_count: 2, npcs_kills_count: 3};
            let setup = this.createKillSetup([previousRow], this.pendingResetValue, true);
            await this.killTheNpc(setup);
            this.assert.deepStrictEqual(setup.scores.deletedIds, [1]);
            this.assert.strictEqual(setup.scores.rows.length, 1);
            let newPeriodRow = [...setup.scores.rows].shift();
            this.assert.strictEqual(newPeriodRow.id, 10);
            this.assert.strictEqual(newPeriodRow.total_score, this.scoresConfig.obtainedScorePerNpc);
            this.assert.strictEqual(newPeriodRow.players_kills_count, 0);
            this.assert.strictEqual(newPeriodRow.npcs_kills_count, 1);
        });
    }

    async testOverlappingKillsDuringAPendingResetShareOneRow()
    {
        await this.test('overlapping kills during a pending reset share one new period row', async () => {
            let previousRow = {id: 1, player_id: 1, total_score: 50, players_kills_count: 2, npcs_kills_count: 3};
            let setup = this.createKillSetup([previousRow], this.pendingResetValue, true);
            await Promise.all([this.killTheNpc(setup), this.killTheNpc(setup)]);
            this.assert.deepStrictEqual(setup.scores.deletedIds, [1]);
            this.assert.strictEqual(setup.scores.rows.length, 1);
            let newPeriodRow = [...setup.scores.rows].shift();
            this.assert.strictEqual(newPeriodRow.total_score, 2 * this.scoresConfig.obtainedScorePerNpc);
            this.assert.strictEqual(newPeriodRow.npcs_kills_count, 2);
        });
    }

    async testOverlappingFirstKillsCreateOneRow()
    {
        await this.test('overlapping first kills of a player without score create one row', async () => {
            let setup = this.createKillSetup([], '2026-10-18', true);
            await Promise.all([this.killTheNpc(setup), this.killTheNpc(setup)]);
            this.assert.strictEqual(setup.scores.rows.length, 1);
            let createdRow = [...setup.scores.rows].shift();
            this.assert.strictEqual(createdRow.total_score, 2 * this.scoresConfig.obtainedScorePerNpc);
        });
    }

    async testRowDeletedAfterTheReadIsSavedAsANewRow()
    {
        await this.test('a score row deleted by a reset after the read is saved as a new row', async () => {
            let previousRow = {id: 1, player_id: 1, total_score: 50, players_kills_count: 0, npcs_kills_count: 3};
            let setup = this.createKillSetup([previousRow], '2026-10-18', true);
            setup.scores.deletesOnUpdate = 1;
            await this.killTheNpc(setup);
            this.assert.strictEqual(setup.scores.rows.length, 1);
            let newPeriodRow = [...setup.scores.rows].shift();
            this.assert.strictEqual(newPeriodRow.id, 10);
            this.assert.strictEqual(newPeriodRow.total_score, this.scoresConfig.obtainedScorePerNpc);
        });
    }

    async testKillDuringAPendingResetKeepsTheNewPeriodRow()
    {
        await this.test('a kill while a reset is pending adds to a row created after the claim', async () => {
            let newPeriodRow = {id: 2, player_id: 1, total_score: 50, players_kills_count: 0, npcs_kills_count: 3};
            let setup = this.createKillSetup([newPeriodRow], this.pendingResetValue, true);
            await this.killTheNpc(setup);
            this.assert.deepStrictEqual(setup.scores.deletedIds, []);
            this.assert.deepStrictEqual(setup.scores.rows.map(row => row.id), [2]);
            this.assert.strictEqual(newPeriodRow.total_score, 50 + this.scoresConfig.obtainedScorePerNpc);
            this.assert.strictEqual(newPeriodRow.npcs_kills_count, 4);
        });
    }

    async testKillWithoutAPendingResetAddsToTheStoredRow()
    {
        await this.test('a kill without a pending reset or a disabled reset adds to the row', async () => {
            let completedSetup = this.createKillSetup([{id: 1, player_id: 1, total_score: 50}], '2026-10-18', true);
            await this.killTheNpc(completedSetup);
            this.assert.deepStrictEqual(completedSetup.scores.deletedIds, []);
            let completedScore = [...completedSetup.scores.rows].shift();
            this.assert.strictEqual(completedScore.total_score, 50 + this.scoresConfig.obtainedScorePerNpc);
            let disabledSetup = this.createKillSetup(
                [{id: 1, player_id: 1, total_score: 50}],
                this.pendingResetValue,
                false
            );
            await this.killTheNpc(disabledSetup);
            this.assert.deepStrictEqual(disabledSetup.scores.deletedIds, []);
            let disabledScore = [...disabledSetup.scores.rows].shift();
            this.assert.strictEqual(disabledScore.total_score, 50 + this.scoresConfig.obtainedScorePerNpc);
        });
    }

    async testPlayerKillAddsTheKilledPlayerLevelScore()
    {
        await this.test('a player kill adds the killed player level times the level multiplier', async () => {
            let killedPlayerLevel = 4;
            let scoreProps = new IncreaseScoreOnKillMapper().fromPlayerDeathEvent(
                this.createPlayerDeathEvent(killedPlayerLevel)
            );
            this.assert.strictEqual(scoreProps.killedPlayerLevel, killedPlayerLevel);
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(this.scoresConfig).determineObtainedScore(scoreProps, true),
                this.scoresConfig.obtainedScorePerPlayer
                    + killedPlayerLevel * this.scoresConfig.obtainedScorePerPlayerLevelMultiplier
            );
        });
    }

    async testPlayerKillWithoutMultiplierKeepsTheFixedScore()
    {
        await this.test('a player kill without level multiplier gives the fixed player score', async () => {
            let scoresConfig = Object.assign({}, this.scoresConfig, {obtainedScorePerPlayerLevelMultiplier: 0});
            let scoreProps = new IncreaseScoreOnKillMapper().fromPlayerDeathEvent(this.createPlayerDeathEvent(9));
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(scoresConfig).determineObtainedScore(scoreProps, true),
                scoresConfig.obtainedScorePerPlayer
            );
        });
    }

    async testNpcKillScoreComesFromTheObject()
    {
        await this.test('an npc kill gives the object kill score', async () => {
            let killScore = 8;
            let scoreProps = new IncreaseScoreOnKillMapper().fromBattleEndedEvent({
                room: {},
                playerSchema: {player_id: 1},
                pve: {targetObject: {id: 6, killScore}}
            });
            this.assert.strictEqual(scoreProps.obtainedNpcCustomScore, killScore);
            this.assert.strictEqual(scoreProps.killedPlayerLevel, 0);
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(this.scoresConfig).determineObtainedScore(scoreProps, false),
                killScore
            );
        });
    }

    async testNpcWithoutKillScoreGivesTheDefaultNpcScore()
    {
        await this.test('an npc kill without kill score gives the configured npc score', async () => {
            let scoreProps = new IncreaseScoreOnKillMapper().fromBattleEndedEvent({
                room: {},
                playerSchema: {player_id: 1},
                pve: {targetObject: {id: 7}}
            });
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(this.scoresConfig).determineObtainedScore(scoreProps, false),
                this.scoresConfig.obtainedScorePerNpc
            );
        });
    }

    async testNpcWithZeroKillScoreGivesNoPoints()
    {
        await this.test('an npc kill with a zero kill score gives no points', async () => {
            let scoreProps = new IncreaseScoreOnKillMapper().fromBattleEndedEvent({
                room: {},
                playerSchema: {player_id: 1},
                pve: {targetObject: {id: 6, killScore: 0, useNpcCustomScore: 3}}
            });
            this.assert.strictEqual(scoreProps.obtainedNpcCustomScore, 0);
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(this.scoresConfig).determineObtainedScore(scoreProps, false),
                0
            );
        });
    }

    async testNpcWithInvalidKillScoreGivesTheDefaultNpcScore()
    {
        await this.test('an npc kill with an invalid kill score gives the configured npc score', async () => {
            let scoreProps = new IncreaseScoreOnKillMapper().fromBattleEndedEvent({
                room: {},
                playerSchema: {player_id: 1},
                pve: {targetObject: {id: 6, killScore: 'many'}}
            });
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(this.scoresConfig).determineObtainedScore(scoreProps, false),
                this.scoresConfig.obtainedScorePerNpc
            );
        });
    }

    async testNpcKillScoreIsIgnoredWithoutTheCustomScoreConfig()
    {
        await this.test('the npc kill score is ignored while the npc custom score is disabled', async () => {
            let scoresConfig = Object.assign({}, this.scoresConfig, {useNpcCustomScore: false});
            let scoreProps = new IncreaseScoreOnKillMapper().fromBattleEndedEvent({
                room: {},
                playerSchema: {player_id: 1},
                pve: {targetObject: {id: 6, killScore: 0}}
            });
            this.assert.strictEqual(
                this.createIncreaseScoreOnKill(scoresConfig).determineObtainedScore(scoreProps, false),
                scoresConfig.obtainedScorePerNpc
            );
        });
    }

    async testMapperResetsThePreviousEventData()
    {
        await this.test('the mapper resets the data of the previous event', async () => {
            let mapper = new IncreaseScoreOnKillMapper();
            mapper.fromPlayerDeathEvent(this.createPlayerDeathEvent(4));
            mapper.fromBattleEndedEvent({room: {}, playerSchema: {player_id: 1}, pve: {targetObject: {id: 7}}});
            this.assert.strictEqual(mapper.killPlayerId, null);
            this.assert.strictEqual(mapper.killedPlayerLevel, 0);
            this.assert.strictEqual(mapper.killNpcId, 7);
        });
    }

}

module.exports.TestIncreaseScoreOnKill = TestIncreaseScoreOnKill;
