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
    }

    setUserModelAndClientData(userModel, client, room)
    {
        this.userId = userModel.id;
        this.username = userModel.username;
        this.sessionId = client.sessionId;
        this.playerId = userModel.player?.id;
        this.playerName = userModel.player?.name;
        this.roleId = userModel.role_id;
        this.playerData = userModel.player;
        this.roomId = room.roomId;
        this.isGuest = '' !== this.guestsEmailDomain && -1 !== userModel.email.indexOf(this.guestsEmailDomain);
        this.userModel = userModel;
        this.client = client;
    }

}

module.exports.ActivePlayer = ActivePlayer;
