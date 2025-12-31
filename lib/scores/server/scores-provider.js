/**
 *
 * Reldens - ScoresProvider
 *
 * Provides access to player scores and top scores data from the database.
 * Supports pagination for the score leaderboard.
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
        if(0 < pageSize){
            this.scoresRepository.limit = pageSize;
            if(1 < page){
                this.scoresRepository.offset = (page - 1) * pageSize;
            }
        }
        this.scoresRepository.sortBy = 'total_score';
        let scores = await this.scoresRepository.loadWithRelations({}, []);
        this.scoresRepository.limit = 0;
        this.scoresRepository.offset = 0;
        this.scoresRepository.sortBy = false;
        return scores.map((score) => {
            if(!score.related_players){
                Logger.warning('Score player not found.', score);
            }
            return {playerName: score.related_players?.name, score: score.total_score};
        });
    }

}

module.exports.ScoresProvider = ScoresProvider;
