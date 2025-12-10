/**
 *
 * Reldens - ActivePlayer
 *
 * Represents an active player session in memory.
 * Stores the user, player, and session identifiers for quick lookup and access.
 * Determines the guest status based on email domain matching.
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {import('@colyseus/core').Client} Client
 *
 * @typedef {Object} UserModel
 * @property {number} id
 * @property {string} username
 * @property {string} email
 * @property {number} role_id
 * @property {Object} [player]
 * @property {number} [player.id]
 * @property {string} [player.name]
 *
 * @typedef {Object} ActivePlayerProps
 * @property {string} guestsEmailDomain
 * @property {UserModel} userModel
 * @property {Client} client
 * @property {string} roomId
 */
class ActivePlayer
{

    /**
     * @param {ActivePlayerProps} props
     */
    constructor(props)
    {
        /** @type {string} */
        this.guestsEmailDomain = sc.get(props, 'guestsEmailDomain', '');
        /** @type {UserModel} */
        this.userModel = sc.get(props, 'userModel', {});
        /** @type {Client} */
        this.client = sc.get(props, 'client', {});
        /** @type {string} */
        this.roomId = sc.get(props, 'roomId', '');
        /** @type {boolean} */
        this.isGuest = '' !== this.guestsEmailDomain && -1 !== this.userModel.email.indexOf(this.guestsEmailDomain);
        /** @type {number} */
        this.userId = this.userModel.id;
        /** @type {string} */
        this.username = this.userModel.username;
        /** @type {number|undefined} */
        this.playerId = this.userModel.player?.id;
        /** @type {string|undefined} */
        this.playerName = this.userModel.player?.name;
        /** @type {number} */
        this.roleId = this.userModel.role_id;
        /** @type {Object|undefined} */
        this.playerData = this.userModel.player;
        /** @type {string} */
        this.sessionId = this.client.sessionId;
    }

}

module.exports.ActivePlayer = ActivePlayer;
