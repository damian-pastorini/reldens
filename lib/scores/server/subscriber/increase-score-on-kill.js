/**
 *
 * Reldens - IncreaseScoreOnKill
 *
 */

const { ScoresProvider } = require('../scores-provider');
const { ScoresUpdater } = require('../scores-updater');
const { ScoresSender } = require('../scores-sender');
const { GameConst } = require('../../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class IncreaseScoreOnKill
{

    constructor(props)
    {
        this.config = sc.get(props, 'config', false);
        this.scoresConfig = this.config?.getWithoutLogs('server/scores', false);
        this.obtainedScorePerPlayer = sc.get(this.scoresConfig, 'obtainedScorePerPlayer', 0);
        this.obtainedScorePerNpc = sc.get(this.scoresConfig, 'obtainedScorePerNpc', 0);
        this.useNpcCustomScore = sc.get(this.scoresConfig, 'useNpcCustomScore', false);
        this.checkScoresConfiguration();
        this.scoresProvider = new ScoresProvider(props);
        this.scoresUpdater = new ScoresUpdater(props);
        this.scoresSender = new ScoresSender();
    }

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

    async execute(props, killType)
    {
        let attacker = props.attackerPlayer;
        if(!attacker){
            // @NOTE: this will be the case when the player has been killed.
            Logger.debug('Undefined attacker to increase score on kill.', killType, props?.killPlayerId);
            return false;
        }
        if(attacker.player_id === props.killPlayerId){
            Logger.debug('Player death does not count as kill for the same player.');
            return false;
        }
        if(!props.killPlayerId && !props.killNpcId){
            Logger.error('Missing target ID for score counts.', props);
            return false;
        }
        let currentScore = await this.scoresProvider.fetchPlayerScore(attacker.player_id);
        let isPlayerKill = killType === GameConst.TYPE_PLAYER;
        let obtainedScore = this.determineObtainedScore(props, isPlayerKill);
        let newTotalScore = (currentScore?.total_score || 0) + obtainedScore;
        let scoreData = {
            player_id: attacker.player_id,
            total_score: newTotalScore,
            players_kills_count: (currentScore?.players_kills_count || 0) + (isPlayerKill ? 1 : 0),
            npcs_kills_count: (currentScore?.npcs_kills_count || 0) + (isPlayerKill ? 0 : 1)
        };
        let killTimeFor = isPlayerKill ? 'last_player_kill_time' : 'last_npc_kill_time';
        scoreData[killTimeFor] = sc.formatDate(new Date());
        if(currentScore){
            scoreData.id = currentScore.id;
        }
        let scoreSaveResult = await this.scoresUpdater.updatePlayerScores(scoreData, attacker, obtainedScore, props);
        if(!scoreSaveResult){
            Logger.error('Score could not be saved.', scoreData);
            return false;
        }
        let sendUpdatesResult = await this.scoresSender.sendUpdates(
            props.room,
            attacker,
            newTotalScore,
            await this.scoresProvider.fetchTopScoresMappedData(10)
        );
        return {scoreSaveResult, sendUpdatesResult};
    }

    determineObtainedScore(props, isPlayerKill)
    {
        if(isPlayerKill){
            return this.obtainedScorePerPlayer;
        }
        if(!this.useNpcCustomScore){
            return this.obtainedScorePerNpc;
        }
        return props.obtainedNpcCustomScore || this.obtainedScorePerNpc;
    }

}

module.exports.IncreaseScoreOnKill = IncreaseScoreOnKill;
