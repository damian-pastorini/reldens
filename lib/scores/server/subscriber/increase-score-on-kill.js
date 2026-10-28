/**
 *
 * Reldens - IncreaseScoreOnKill
 *
 * Handles score increases when players kill other players or NPCs.
 * Calculates obtained scores, updates player totals, and broadcasts changes. The score updates of a player run one
 * after the other, so overlapping kills share one row, and a row deleted by a scores reset or changed by another server
 * after it was read is read again and the update retried. While a scores period reset is pending, the score row of the
 * previous period (created up to the claimed scores id) is replaced by a new row with the new points, so the reset
 * delete never removes the points earned in the new period.
 *
 */

const { ScoresProvider } = require('../scores-provider');
const { ScoresUpdater } = require('../scores-updater');
const { ScoresSender } = require('../scores-sender');
const { ScoresResetClaim } = require('../scores-reset-claim');
const { ScoresConst } = require('../../constants');
const { GameConst } = require('../../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../game/server/config-manager').ConfigManager} ConfigManager
 * @typedef {import('../scores-provider').ScoresProvider} ScoresProvider
 * @typedef {import('../scores-updater').ScoresUpdater} ScoresUpdater
 * @typedef {import('../scores-sender').ScoresSender} ScoresSender
 */
class IncreaseScoreOnKill
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {ConfigManager|boolean} */
        this.config = sc.get(props, 'config', false);
        /** @type {Object|boolean} */
        this.scoresConfig = this.config?.getWithoutLogs('server/scores', false);
        /** @type {number} */
        this.obtainedScorePerPlayer = sc.get(this.scoresConfig, 'obtainedScorePerPlayer', 0);
        /** @type {number} */
        this.obtainedScorePerPlayerLevelMultiplier = Number(
            sc.get(this.scoresConfig, 'obtainedScorePerPlayerLevelMultiplier', 0)
        );
        /** @type {number} */
        this.obtainedScorePerNpc = sc.get(this.scoresConfig, 'obtainedScorePerNpc', 0);
        /** @type {boolean} */
        this.useNpcCustomScore = sc.get(this.scoresConfig, 'useNpcCustomScore', false);
        this.checkScoresConfiguration();
        /** @type {ScoresProvider} */
        this.scoresProvider = new ScoresProvider(props);
        /** @type {ScoresUpdater} */
        this.scoresUpdater = new ScoresUpdater(props);
        /** @type {ScoresSender} */
        this.scoresSender = new ScoresSender();
        /** @type {Object<string, Promise<Object|boolean>>} */
        this.playersUpdates = {};
    }

    /**
     * @returns {boolean}
     */
    checkScoresConfiguration()
    {
        if(!this.config){
            Logger.error('Undefined config on "IncreaseKillCountOnPlayerDeath" class.');
            return false;
        }
        if(!this.scoresConfig){
            Logger.error('Undefined server scores configuration.');
            return false;
        }
    }

    /**
     * @param {Object} props
     * @param {string} killType
     * @returns {Promise<Object|boolean>}
     */
    async execute(props, killType)
    {
        let attacker = props.attackerPlayer;
        if(!attacker){
            // expected when a player has been killed:
            // Logger.debug('Undefined attacker to increase score on kill.', killType, props?.killPlayerId);
            return false;
        }
        if(!attacker.player_id){
            // Logger.debug('Attacker is not a player.', attacker.constructor.name, attacker.uid, attacker.key);
            return false;
        }
        if(attacker.player_id === props.killPlayerId){
            // Logger.debug('Player death does not count as kill for the same player.');
            return false;
        }
        if(!props.killPlayerId && !props.killNpcId){
            Logger.error('Missing target ID for score counts.', props);
            return false;
        }
        return await this.queuePlayerUpdate(
            attacker.player_id,
            async () => await this.updateAttackerScore(props, killType, attacker, 1)
        );
    }

    /**
     * @param {number} playerId
     * @param {function(): Promise<Object|boolean>} runUpdate
     * @returns {Promise<Object|boolean>}
     */
    async queuePlayerUpdate(playerId, runUpdate)
    {
        let queuedUpdate = sc.get(this.playersUpdates, playerId, Promise.resolve(false))
            .then(runUpdate)
            .catch((error) => {
                Logger.error('Score update error.', playerId, error.message);
                return false;
            });
        this.playersUpdates[playerId] = queuedUpdate;
        let updateResult = await queuedUpdate;
        if(queuedUpdate === this.playersUpdates[playerId]){
            delete this.playersUpdates[playerId];
        }
        return updateResult;
    }

    /**
     * @param {Object} props
     * @param {string} killType
     * @param {Object} attacker
     * @param {number} attempt
     * @returns {Promise<Object|boolean>}
     */
    async updateAttackerScore(props, killType, attacker, attempt)
    {
        let currentScore = await this.releasePreviousPeriodScore(
            await this.scoresProvider.fetchPlayerScore(attacker.player_id)
        );
        let isPlayerKill = killType === GameConst.TYPE_PLAYER;
        let obtainedScore = this.determineObtainedScore(props, isPlayerKill);
        let newTotalScore = (currentScore?.total_score || 0) + obtainedScore;
        let scoreData = {
            player_id: attacker.player_id,
            total_score: newTotalScore,
            players_kills_count: (currentScore?.players_kills_count || 0) + (isPlayerKill ? 1 : 0),
            npcs_kills_count: (currentScore?.npcs_kills_count || 0) + (isPlayerKill ? 0 : 1)
        };
        scoreData[isPlayerKill ? 'last_player_kill_time' : 'last_npc_kill_time'] = sc.formatDate(new Date());
        let scoreSaveResult = await this.scoresUpdater.updatePlayerScores(
            scoreData,
            currentScore,
            attacker,
            obtainedScore,
            props
        );
        if(scoreSaveResult){
            return {
                scoreSaveResult,
                sendUpdatesResult: await this.scoresSender.sendUpdates(
                    props.room,
                    attacker,
                    newTotalScore,
                    await this.scoresProvider.fetchTopScoresMappedData(ScoresConst.TOP_SCORES_PAGE_SIZE)
                )
            };
        }
        if(attempt < ScoresConst.SCORE_UPDATE_ATTEMPTS){
            return await this.updateAttackerScore(props, killType, attacker, attempt + 1);
        }
        Logger.error('Score could not be saved.', scoreData);
        return false;
    }

    /**
     * @param {Object|boolean} currentScore
     * @returns {Promise<Object|boolean>}
     */
    async releasePreviousPeriodScore(currentScore)
    {
        if(!currentScore){
            return currentScore;
        }
        if(!this.scoresUpdater.isReady){
            return currentScore;
        }
        if(!this.config?.getWithoutLogs(ScoresConst.RESET.CONFIG_PATHS.ENABLED, false)){
            return currentScore;
        }
        let pendingClaim = await ScoresResetClaim.loadPending(this.scoresUpdater.dataServer.getEntity('config'));
        if(!Number.isInteger(pendingClaim.scoresMaxId)){
            return currentScore;
        }
        if(Number(currentScore.id) > pendingClaim.scoresMaxId){
            return currentScore;
        }
        await this.scoresUpdater.scoresRepository.deleteById(currentScore.id);
        return false;
    }

    /**
     * @param {Object} props
     * @param {boolean} isPlayerKill
     * @returns {number}
     */
    determineObtainedScore(props, isPlayerKill)
    {
        if(isPlayerKill){
            return this.obtainedScorePerPlayer
                + Number(sc.get(props, 'killedPlayerLevel', 0)) * this.obtainedScorePerPlayerLevelMultiplier;
        }
        if(!this.useNpcCustomScore){
            return this.obtainedScorePerNpc;
        }
        let npcCustomScore = sc.get(props, 'obtainedNpcCustomScore', null);
        if(null === npcCustomScore){
            return this.obtainedScorePerNpc;
        }
        if(!Number.isFinite(Number(npcCustomScore))){
            return this.obtainedScorePerNpc;
        }
        return Number(npcCustomScore);
    }

}

module.exports.IncreaseScoreOnKill = IncreaseScoreOnKill;
