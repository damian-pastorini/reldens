/**
 *
 * Reldens - PlayerDeathEvent
 *
 * Event emitted when a player dies in combat.
 *
 */

/**
 * @typedef {import('../../users/server/player').Player} Player
 * @typedef {import('../../rooms/server/scene').RoomScene} RoomScene
 *
 * @typedef {Object} PlayerDeathEventProps
 * @property {Player} targetSchema
 * @property {RoomScene} room
 * @property {Object} targetClient
 * @property {string} affectedProperty
 * @property {Player} [attackerPlayer]
 * @property {function(): Promise<boolean>} [revivePlayerCallback]
 */
class PlayerDeathEvent
{

    /**
     * @param {PlayerDeathEventProps} props
     */
    constructor(props)
    {
        /** @type {Player} */
        this.targetSchema = props.targetSchema;
        /** @type {RoomScene} */
        this.room = props.room;
        /** @type {Object} */
        this.targetClient = props.targetClient
        /** @type {string} */
        this.affectedProperty = props.affectedProperty;
        /** @type {Player|undefined} */
        this.attackerPlayer = props.attackerPlayer;
        /** @type {function(): Promise<boolean>|undefined} */
        this.revivePlayerCallback = props.revivePlayerCallback;
    }

}

module.exports.PlayerDeathEvent = PlayerDeathEvent;
