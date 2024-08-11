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

    /**
     * @param playerDeathEvent {PlayerDeathEvent}
     * @returns {IncreaseScoreOnKillMapper}
     */
    fromPlayerDeathEvent(playerDeathEvent)
    {
        this.reset();
        this.room = playerDeathEvent?.room;
        this.attackerPlayer = playerDeathEvent?.attackerPlayer;
        this.killPlayerId = playerDeathEvent?.targetSchema?.player_id;
        return this;
    }


    /**
     * @param battleEndedEvent {BattleEndedEvent}
     * @returns {IncreaseScoreOnKillMapper}
     */
    fromBattleEndedEvent(battleEndedEvent)
    {
        this.reset();
        this.room = battleEndedEvent?.room;
        this.attackerPlayer = battleEndedEvent?.playerSchema;
        this.killNpcId = battleEndedEvent?.pve.targetObject.id;
        this.obtainedNpcCustomScore = battleEndedEvent?.pve.targetObject.useNpcCustomScore;
        return this;
    }

    reset()
    {
        this.room = null;
        this.attackerPlayer = null;
        this.killPlayerId = null;
        this.killNpcId = null;
        this.obtainedNpcCustomScore = null;
    }

}

module.exports.IncreaseScoreOnKillMapper = IncreaseScoreOnKillMapper;
