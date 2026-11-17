/**
 *
 * Reldens - IncreaseScoreOnKillBuilder
 *
 * Builds the score on kill subscriber under test with the stubs it uses: the scores repository (rows created with
 * incremental ids, deleted by id, updates that find the row removed by a reset after the read), the scores details
 * repository recording the created rows and the config repository returning the last period row, and runs an npc kill
 * or a player kill (the player 1 kills the player 2 of the given level) on that subscriber.
 *
 */

const { IncreaseScoreOnKill } = require('../../lib/scores/server/subscriber/increase-score-on-kill');
const { IncreaseScoreOnKillMapper } = require('../../lib/scores/server/mapper/increase-score-on-kill-mapper');
const { GameplayPlayerBuilder } = require('./gameplay-player-builder');
const { ScoresConst } = require('../../lib/scores/constants');
const { ObjectsConst } = require('../../lib/objects/constants');
const { GameConst } = require('../../lib/game/constants');

class IncreaseScoreOnKillBuilder
{

    /**
     * @param {Object|boolean} [scoresConfig]
     */
    constructor(scoresConfig = false)
    {
        this.scoresConfig = scoresConfig ? scoresConfig : {
            obtainedScorePerPlayer: 10,
            obtainedScorePerNpc: 5,
            useNpcCustomScore: true,
            obtainedScorePerPlayerLevelMultiplier: 3
        };
    }

    /**
     * @param {Object} scoresConfig
     * @returns {IncreaseScoreOnKill}
     */
    createIncreaseScoreOnKill(scoresConfig)
    {
        return new IncreaseScoreOnKill({
            config: {getWithoutLogs: () => scoresConfig},
            dataServer: {getEntity: () => ({})}
        });
    }

    /**
     * @param {Array<Object>} scoresRows
     * @returns {Object}
     */
    createScoresRepository(scoresRows)
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
        return scores;
    }

    /**
     * @param {Array<Object>} scoresRows
     * @param {string} lastPeriodValue
     * @param {boolean} resetEnabled
     * @returns {Object}
     */
    createKillSetup(scoresRows, lastPeriodValue, resetEnabled)
    {
        let scoresDetail = {createdRows: []};
        scoresDetail.create = async (detailData) => {
            scoresDetail.createdRows.push(detailData);
            return detailData;
        };
        let dataServer = {
            scores: this.createScoresRepository(scoresRows),
            scoresDetail,
            config: {loadOne: async () => ({id: 390, value: lastPeriodValue})}
        };
        dataServer.getEntity = (entityName) => dataServer[entityName];
        return {
            scores: dataServer.scores,
            scoresDetail,
            increaseScoreOnKill: new IncreaseScoreOnKill({
                config: GameplayPlayerBuilder.createConfig({
                    'server/scores': this.scoresConfig,
                    [ScoresConst.RESET.CONFIG_PATHS.ENABLED]: resetEnabled
                }),
                dataServer
            })
        };
    }

    /**
     * @param {number} killedPlayerLevel
     * @param {Object} [room]
     * @returns {Object}
     */
    createPlayerDeathEvent(killedPlayerLevel, room = {})
    {
        return {
            room,
            attackerPlayer: {player_id: 1},
            targetSchema: {player_id: 2, skillsServer: {classPath: {currentLevel: killedPlayerLevel}}}
        };
    }

    /**
     * @returns {Object}
     */
    createKillRoom()
    {
        return {
            roomId: 'room-1',
            activePlayerByPlayerId: () => ({client: {send: () => true}}),
            broadcast: () => true
        };
    }

    /**
     * @param {Object} setup
     * @param {IncreaseScoreOnKillMapper|boolean} [mapper]
     * @param {Object} [targetObject]
     * @returns {Promise<Object|boolean>}
     */
    async killTheNpc(setup, mapper = false, targetObject = {id: 6})
    {
        return await setup.increaseScoreOnKill.execute(
            (mapper || new IncreaseScoreOnKillMapper()).fromBattleEndedEvent({
                room: this.createKillRoom(),
                playerSchema: {player_id: 1},
                pve: {targetObject}
            }),
            ObjectsConst.TYPE_OBJECT
        );
    }

    /**
     * @param {Object} setup
     * @param {number} killedPlayerLevel
     * @returns {Promise<Object|boolean>}
     */
    async killThePlayer(setup, killedPlayerLevel)
    {
        return await setup.increaseScoreOnKill.execute(
            new IncreaseScoreOnKillMapper().fromPlayerDeathEvent(
                this.createPlayerDeathEvent(killedPlayerLevel, this.createKillRoom())
            ),
            GameConst.TYPE_PLAYER
        );
    }

}

module.exports.IncreaseScoreOnKillBuilder = IncreaseScoreOnKillBuilder;
