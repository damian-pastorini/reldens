/**
 *
 * Reldens - ScoresProvider
 *
 */

const { RepositoriesExtension } = require('./repositories-extension');

class ScoresProvider extends RepositoriesExtension
{

    constructor(props)
    {
        super();
        this.isReady = this.assignRepositories(props);
    }

    async fetchPlayerScore(playerId)
    {
        if(!this.scoresRepository){
            return false;
        }
        return await this.scoresRepository.loadOneBy('player_id', playerId);
    }

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
            return {playerName: score.parent_player.name, score: score.total_score};
        });
    }

}

module.exports.ScoresProvider = ScoresProvider;
