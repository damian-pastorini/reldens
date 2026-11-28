/**
 *
 * Reldens - PlayerDeathEvent
 *
 * Event emitted when a player dies, or joins a room again with the death it left the game with, and its revive delay.
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
 * @property {number} reviveDelayMs
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
        this.targetClient = props.targetClient;
        /** @type {string} */
        this.affectedProperty = props.affectedProperty;
        /** @type {Player|undefined} */
        this.attackerPlayer = props.attackerPlayer;
        /** @type {function(): Promise<boolean>|undefined} */
        this.revivePlayerCallback = props.revivePlayerCallback;
        /** @type {number} */
        this.reviveDelayMs = props.reviveDelayMs;
    }

}

module.exports.PlayerDeathEvent = PlayerDeathEvent;
