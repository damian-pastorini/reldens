/**
 *
 * Reldens - IncreaseScoreOnKillMapper
 *
 * Maps player death and battle ended events to score increase data.
 * Extracts relevant information from events for score processing.
 *
 */

/**
 * @typedef {import('../../../rooms/server/scene').RoomScene} RoomScene
 * @typedef {import('../../../actions/server/events/player-death-event').PlayerDeathEvent} PlayerDeathEvent
 * @typedef {import('../../../actions/server/events/battle-ended-event').BattleEndedEvent} BattleEndedEvent
 * @typedef {import('../../../users/server/player').Player} Player
 */
class IncreaseScoreOnKillMapper
{

    constructor()
    {
        /** @type {RoomScene|null} */
        this.room = null;
        /** @type {Player|null} */
        this.attackerPlayer = null;
        /** @type {number|null} */
        this.killPlayerId = null;
        /** @type {number|null} */
        this.killNpcId = null;
        /** @type {number|null} */
        this.obtainedNpcCustomScore = null;
        this.reset();
    }

    /**
     * @param {PlayerDeathEvent} playerDeathEvent
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
     * @param {BattleEndedEvent} battleEndedEvent
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
