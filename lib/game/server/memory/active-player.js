/**
 *
 * Reldens - ActivePlayer
 *
 */

const { sc } = require('@reldens/utils');

class ActivePlayer
{

    constructor(props)
    {
        this.guestsEmailDomain = sc.get(props, 'guestsEmailDomain', '');
        this.userModel = sc.get(props, 'userModel', {});
        this.client = sc.get(props, 'client', {});
        this.roomId = sc.get(props, 'roomId', '');
        this.isGuest = '' !== this.guestsEmailDomain && -1 !== this.userModel.email.indexOf(this.guestsEmailDomain);
        this.userId = this.userModel.id;
        this.username = this.userModel.username;
        this.playerId = this.userModel.player?.id;
        this.playerName = this.userModel.player?.name;
        this.roleId = this.userModel.role_id;
        this.playerData = this.userModel.player;
        this.sessionId = this.client.sessionId;
    }

}

module.exports.ActivePlayer = ActivePlayer;
