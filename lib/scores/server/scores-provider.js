/**
 *
 * Reldens - ScoresProvider
 *
 * Provides access to player scores and top scores data from the database.
 * Supports pagination for the score leaderboard. The top scores are ordered by the total score and the scores with the
 * same total by their id, so the pages never list a player twice or skip one: the storage drivers sort by one column,
 * so the scores of the first and last total of a page, which can go on in the other pages, are loaded again by id.
 *
 */

const { RepositoriesExtension } = require('./repositories-extension');
const { Logger } = require('@reldens/utils');

class ScoresProvider extends RepositoriesExtension
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        super();
        /** @type {boolean} */
        this.isReady = this.assignRepositories(props);
    }

    /**
     * @param {number} playerId
     * @returns {Promise<Object|boolean>}
     */
    async fetchPlayerScore(playerId)
    {
        if(!this.scoresRepository){
            return false;
        }
        return await this.scoresRepository.loadOneBy('player_id', playerId);
    }

    /**
     * @param {number} pageSize
     * @param {number} page
     * @returns {Promise<Array<Object>|boolean>}
     */
    async fetchTopScoresMappedData(pageSize = 0, page = 0)
    {
        if(!this.scoresRepository){
            return false;
        }
        return (await this.loadOrderedScores(0 < pageSize ? pageSize : 0, page)).map((score) => {
            if(!score.related_players){
                Logger.warning('Score player not found.', score);
            }
            return {playerName: score.related_players?.name, score: score.total_score};
        });
    }

    /**
     * @param {Object} filters
     * @param {string} sortBy
     * @param {string} sortDirection
     * @param {number} limit
     * @param {number} offset
     * @returns {Promise<Array<Object>>}
     */
    loadSortedScores(filters, sortBy, sortDirection, limit, offset)
    {
        let originalState = this.scoresRepository.preserveEntityState();
        this.scoresRepository.limit = limit;
        this.scoresRepository.offset = offset;
        this.scoresRepository.sortBy = sortBy;
        this.scoresRepository.sortDirection = sortDirection;
        let scoresQuery = this.scoresRepository.loadWithRelations(filters, []);
        this.scoresRepository.restoreEntityState(originalState);
        return scoresQuery;
    }

    /**
     * @param {number} limit
     * @param {number} page
     * @returns {Promise<Array<Object>>}
     */
    async loadOrderedScores(limit, page)
    {
        let offset = 0 < limit && 1 < page ? (page - 1) * limit : 0;
        let sortedScores = (await this.loadSortedScores({}, 'total_score', 'DESC', limit, offset)).sort(
            (scoreA, scoreB) => scoreB.total_score - scoreA.total_score || scoreA.id - scoreB.id
        );
        if(0 === sortedScores.length){
            return sortedScores;
        }
        let firstTotal = [...sortedScores].shift().total_score;
        let lastTotal = [...sortedScores].pop().total_score;
        let firstTies = sortedScores.filter((score) => firstTotal === score.total_score);
        let lastTies = sortedScores.filter((score) => firstTotal !== lastTotal && lastTotal === score.total_score);
        let middleScores = sortedScores.filter((score) => {
            return firstTotal !== score.total_score && lastTotal !== score.total_score;
        });
        let isFullPage = 0 < limit && limit === sortedScores.length;
        let firstTiesOffset = 0;
        if(0 < offset){
            firstTiesOffset = Math.max(
                0,
                offset - await this.scoresRepository.count({total_score: {operator: 'GT', value: firstTotal}})
            );
        }
        if(0 < firstTiesOffset || (isFullPage && 0 === lastTies.length)){
            firstTies = await this.loadSortedScores(
                {total_score: firstTotal},
                'id',
                'ASC',
                firstTies.length,
                firstTiesOffset
            );
        }
        if(isFullPage && 0 < lastTies.length){
            lastTies = await this.loadSortedScores({total_score: lastTotal}, 'id', 'ASC', lastTies.length, 0);
        }
        return [...firstTies, ...middleScores, ...lastTies];
    }

}

module.exports.ScoresProvider = ScoresProvider;
