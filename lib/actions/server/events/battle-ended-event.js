/**
 *
 * Reldens - BattleEndedEvent
 *
 * Event emitted when a PvE battle ends.
 *
 */

/**
 * @typedef {import('../../users/server/player').Player} Player
 * @typedef {import('../../rooms/server/scene').RoomScene} RoomScene
 * @typedef {import('../pve').Pve} Pve
 *
 * @typedef {Object} BattleEndedEventProps
 * @property {Player} playerSchema
 * @property {Pve} pve
 * @property {Object} actionData
 * @property {RoomScene} room
 */
class BattleEndedEvent
{

    /**
     * @param {BattleEndedEventProps} props
     */
    constructor(props)
    {
        /** @type {Player} */
        this.playerSchema = props.playerSchema;
        /** @type {Pve} */
        this.pve = props.pve
        /** @type {Object} */
        this.actionData = props.actionData;
        /** @type {RoomScene} */
        this.room = props.room;
    }

}

module.exports.BattleEndedEvent = BattleEndedEvent;
