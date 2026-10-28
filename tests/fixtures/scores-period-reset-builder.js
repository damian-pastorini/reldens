/**
 *
 * Reldens - ScoresPeriodResetBuilder
 *
 * Builds the scores period reset under test with the stubs it uses: the config row repository with conditional
 * updates, the scores and details repositories (newest id first loads, deletes up to an id, failing reads), a scene room
 * with a connected and a disconnected player, a room still being created and a game room, plus the pending claim
 * values and the scores messages the scene room players receive.
 *
 */

const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { ScoresPeriodReset } = require('../../lib/scores/server/scores-period-reset');
const { ScoresConst } = require('../../lib/scores/constants');
const { RoomsConst } = require('../../lib/rooms/constants');
const { sc } = require('@reldens/utils');

class ScoresPeriodResetBuilder
{

    constructor()
    {
        this.storedPlayerScore = 30;
        this.storedScoreId = 1;
        this.storedDetailId = 4;
        this.lastPeriodRowId = 390;
    }

    buildPendingValue(periodKey, claimedAt, scoresMaxId, detailsMaxId)
    {
        return periodKey+ScoresConst.RESET.PENDING_MARK+sc.toJsonString({claimedAt, scoresMaxId, detailsMaxId});
    }

    createRowsRepository(rows)
    {
        let repository = {rows, deletes: [], failedReads: 0};
        repository.delete = async (filters) => {
            repository.deletes.push(filters.id.value);
            repository.rows = repository.rows.filter(row => row.id > filters.id.value);
            return true;
        };
        repository.load = async () => [...repository.rows].sort((first, second) => second.id - first.id);
        repository.loadOneBy = async (field, value) => repository.rows.find(row => value === row[field]) || false;
        repository.loadWithRelations = async () => {
            if(0 < repository.failedReads){
                repository.failedReads--;
                throw new TypeError('Scores storage not available.');
            }
            return repository.rows;
        };
        repository.preserveEntityState = () => ({});
        repository.restoreEntityState = () => true;
        return repository;
    }

    createRepositories(lastPeriodValue, scoresRows)
    {
        let repositories = {
            config: {lastPeriodRow: false, storedValues: []},
            scores: this.createRowsRepository(scoresRows),
            scoresDetail: this.createRowsRepository([{id: this.storedDetailId}])
        };
        if(false !== lastPeriodValue){
            repositories.config.lastPeriodRow = {id: this.lastPeriodRowId, value: lastPeriodValue};
        }
        repositories.config.loadOne = async () => {
            if(!repositories.config.lastPeriodRow){
                return false;
            }
            return Object.assign({}, repositories.config.lastPeriodRow);
        };
        repositories.config.update = async (filters, data) => {
            let lastPeriodRow = repositories.config.lastPeriodRow;
            if(filters.id !== lastPeriodRow.id || filters.value !== lastPeriodRow.value){
                return 0;
            }
            lastPeriodRow.value = data.value;
            repositories.config.storedValues.push(data.value);
            return 1;
        };
        return repositories;
    }

    createSceneRoom()
    {
        let playerSchema = GameplayPlayerBuilder.createPlayerSchema();
        let client = GameplayPlayerBuilder.createClient(playerSchema.sessionId);
        let room = {roomType: RoomsConst.ROOM_TYPE_SCENE, state: {}, broadcasts: [], client};
        room.broadcast = (messageKey, message) => room.broadcasts.push(message);
        room.playersKeysFromState = () => [playerSchema.sessionId, 'disconnected-session'];
        room.getClientById = (sessionId) => sessionId === client.sessionId ? client : false;
        room.playerBySessionIdFromState = () => playerSchema;
        return room;
    }

    createSetup(lastPeriodValue, configValues = {}, scoresRows = false)
    {
        let defaultRows = [{
            id: this.storedScoreId,
            player_id: 7,
            total_score: this.storedPlayerScore,
            related_players: {name: 'player-7'}
        }];
        let repositories = this.createRepositories(lastPeriodValue, false === scoresRows ? defaultRows : scoresRows);
        let createdInstances = {
            sceneRoom: this.createSceneRoom(),
            creatingRoom: this.createSceneRoom(),
            gameRoom: {roomType: RoomsConst.ROOM_TYPE_GAME, broadcasts: []}
        };
        createdInstances.creatingRoom.state = false;
        return Object.assign({
            repositories,
            scoresPeriodReset: new ScoresPeriodReset({
                config: GameplayPlayerBuilder.createConfig(Object.assign({
                    [ScoresConst.RESET.CONFIG_PATHS.ENABLED]: true,
                    [ScoresConst.RESET.CONFIG_PATHS.PERIOD]: ScoresConst.RESET.PERIODS.DAILY
                }, configValues)),
                dataServer: {getEntity: (entityName) => repositories[entityName]},
                roomsManager: {createdInstances}
            })
        }, createdInstances);
    }

    expectedScoresMessages(topScores, playerScore)
    {
        return {
            broadcasts: [{act: ScoresConst.ACTIONS.TOP_SCORES_UPDATE, scores: topScores, listener: ScoresConst.KEY}],
            playerMessages: [{act: ScoresConst.ACTIONS.UPDATE, newTotalScore: playerScore, listener: ScoresConst.KEY}]
        };
    }

}

module.exports.ScoresPeriodResetBuilder = ScoresPeriodResetBuilder;
