/**
 *
 * Reldens - IncreaseScoreOnKill
 *
 */

const { GameConst } = require('../../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class IncreaseScoreOnKill
{

    constructor(props)
    {
        this.dataServer = sc.get(props, 'dataServer', false);
        this.config = sc.get(props, 'config', false);
        this.scoresConfig = this.config?.getWithoutLogs('server/scores', false);
        this.obtainedScorePerPlayer = sc.get(this.scoresConfig, 'obtainedScorePerPlayer', 0);
        this.obtainedScorePerNpc = sc.get(this.scoresConfig, 'obtainedScorePerNpc', 0);
        this.useNpcCustomScore = sc.get(this.scoresConfig, 'useNpcCustomScore', false);
        this.checkScoresConfiguration();
        this.setupRepositories();
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

    setupRepositories()
    {
        if(!this.dataServer){
            Logger.error('Undefined DataServer on "IncreaseKillCountOnPlayerDeath" class.');
            return false;
        }
        this.scoresRepository = this.dataServer.getEntity('scores');
        if(!this.scoresRepository){
            Logger.error('Undefined "scoresRepository" in DataServer on "IncreaseKillCountOnPlayerDeath".');
            return false;
        }
        this.scoresDetailRepository = this.dataServer.getEntity('scoresDetail');
        if(!this.scoresDetailRepository){
            Logger.error('Undefined "scoresDetailRepository" in DataServer on "IncreaseKillCountOnPlayerDeath".');
            return false;
        }
        return true;
    }

    async execute(props, killType)
    {
        if(!this.dataServer || !this.scoresRepository || !this.scoresDetailRepository){
            return false;
        }
        let attacker = props.attackerPlayer;
        if(!attacker){
            return false;
        }
        if (!props.killPlayerId && !props.killNpcId){
            Logger.error('Missing target ID for score counts.', props);
            return false;
        }
        let currentScore = await this.scoresRepository.loadOneBy('player_id', attacker.player_id);
        let isPlayerKill = killType === GameConst.TYPE_PLAYER;
        let obtainedScore = this.determineObtainedScore(props, isPlayerKill);
        let scoreData = {
            player_id: attacker.player_id,
            total_score: (currentScore?.total_score || 0) + obtainedScore,
            players_kills_count: (currentScore?.players_kills_count || 0) + (isPlayerKill ? 1 : 0),
            npcs_kills_count: (currentScore?.npcs_kills_count || 0) + (isPlayerKill ? 0 : 1)
        };
        let killTimeFor = isPlayerKill ? 'last_player_kill_time' : 'last_npc_kill_time';
        scoreData[killTimeFor] = sc.formatDate(new Date());
        if(currentScore){
            scoreData.id = currentScore.id;
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
        let scoreDetailSaveResult = await this.scoresDetailRepository.create(scoreDetailData);
        return {scoreSaveResult, scoreDetailSaveResult};
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
