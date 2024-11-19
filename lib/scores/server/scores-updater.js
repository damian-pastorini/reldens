/**
 *
 * Reldens - ScoresUpdater
 *
 */

const { RepositoriesExtension } = require('./repositories-extension');
const { Logger, sc } = require('@reldens/utils');

class ScoresUpdater extends RepositoriesExtension
{

    constructor(props)
    {
        super();
        this.isReady = this.assignRepositories(props);
    }

    async updatePlayerScores(scoreData, attacker, obtainedScore, props)
    {
        if(!this.scoresRepository || !this.scoresDetailRepository){
            return false;
        }
        let scoreSaveResult = await this.scoresRepository.upsert(scoreData);
        if(!scoreSaveResult){
            Logger.error('Score could not be saved.', scoreData);
            return false;
        }
        let scoreDetailData = {
            player_id: attacker.player_id,
            obtained_score: obtainedScore,
            kill_time: sc.formatDate(new Date()),
            kill_player_id: props.killPlayerId || null,
            kill_npc_id: props.killNpcId || null,
        };
        return this.scoresDetailRepository.create(scoreDetailData);
    }
}

module.exports.ScoresUpdater = ScoresUpdater;
