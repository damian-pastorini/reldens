/**
 *
 * Reldens - ScoresUpdater
 *
 * Updates player scores in the database including total score, kill counts, and kill details.
 *
 */

const { RepositoriesExtension } = require('./repositories-extension');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../users/server/player').Player} Player
 */
class ScoresUpdater extends RepositoriesExtension
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
     * @param {Object} scoreData
     * @param {Player} attacker
     * @param {number} obtainedScore
     * @param {Object} props
     * @returns {Promise<Object|boolean>}
     */
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
