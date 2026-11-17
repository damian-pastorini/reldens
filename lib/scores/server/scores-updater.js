/**
 *
 * Reldens - ScoresUpdater
 *
 * Updates player scores in the database including total score, kill counts, and kill details. An existing score row
 * is updated only while it still holds the read values (its id and counters), so a row deleted by a scores reset or
 * changed by another server is never written back with stale totals; the caller reads it again and retries.
 *
 */

const { RepositoriesExtension } = require('./repositories-extension');
const { sc } = require('@reldens/utils');

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
     * @param {Object|boolean} previousScore
     * @param {Player} attacker
     * @param {number} obtainedScore
     * @param {Object} props
     * @returns {Promise<Object|boolean>}
     */
    async updatePlayerScores(scoreData, previousScore, attacker, obtainedScore, props)
    {
        if(!this.scoresRepository || !this.scoresDetailRepository){
            return false;
        }
        if(!await this.saveScore(scoreData, previousScore)){
            return false;
        }
        return this.scoresDetailRepository.create({
            player_id: attacker.player_id,
            obtained_score: obtainedScore,
            kill_time: sc.formatDate(new Date()),
            kill_player_id: props.killPlayerId || null,
            kill_npc_id: props.killNpcId || null,
        });
    }

    /**
     * @param {Object} scoreData
     * @param {Object|boolean} previousScore
     * @returns {Promise<Object|boolean>}
     */
    async saveScore(scoreData, previousScore)
    {
        if(!previousScore){
            return await this.scoresRepository.create(scoreData);
        }
        return 0 < Number(await this.scoresRepository.update(
            {
                id: previousScore.id,
                total_score: previousScore.total_score,
                players_kills_count: previousScore.players_kills_count,
                npcs_kills_count: previousScore.npcs_kills_count
            },
            scoreData
        ));
    }
}

module.exports.ScoresUpdater = ScoresUpdater;
