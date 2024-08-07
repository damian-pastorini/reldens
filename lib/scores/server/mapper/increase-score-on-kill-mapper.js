/**
 *
 * Reldens - IncreaseScoreOnKillMapper
 *
 */

class IncreaseScoreOnKillMapper
{

    constructor()
    {
        this.reset();
    }

    fromPlayerDeathEvent(playerDeathEvent)
    {
        this.reset();
        this.attackerPlayer = playerDeathEvent?.attackerPlayer;
        this.killPlayerId = playerDeathEvent?.targetSchema?.player_id;
        return this;
    }


    fromBattleEndedEvent(battleEndedEvent)
    {
        this.reset();
        this.attackerPlayer = battleEndedEvent?.playerSchema;
        this.killNpcId = battleEndedEvent?.pve.targetObject.id;
        this.obtainedNpcCustomScore = battleEndedEvent?.pve.targetObject.useNpcCustomScore;
        return this;
    }

    reset()
    {
        this.attackerPlayer = null;
        this.killPlayerId = null;
        this.killNpcId = null;
        this.obtainedNpcCustomScore = null;
    }

}

module.exports.IncreaseScoreOnKillMapper = IncreaseScoreOnKillMapper;
