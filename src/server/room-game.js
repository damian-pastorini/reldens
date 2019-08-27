/**
 *
 * RoomLogin
 *
 * This object room is just for send the player data to the client.
 * The client will automatically disconnect from this room once it received the data.
 * If the client was hacked then the user will be disconnected when it joins the next RoomScene.
 * See RoomScene.onJoin method.
 *
 */

const RoomLogin = require('./room-login');
const Player = require('./client-player');
const DataLink = require('./datalink');
const share = require('../../shared/constants');

class RoomGame extends RoomLogin
{

    onJoin(client, options, authResult)
    {
        this.updateLastLogin(authResult.username);
        // player object:
        let newPlayer = new Player(authResult);
        newPlayer.sessionId = client.sessionId;
        // client start:
        this.send(client, {act: share.START_GAME, sessionId: client.sessionId, player: newPlayer});
    }

    updateLastLogin(userName)
    {
        let queryString = `UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE username='${userName}'`;
        let lastLoginProm = DataLink.query(queryString);
        lastLoginProm.catch((err) => {
            console.log('ERROR - Update last login query fail.', err, queryString);
        });
    }

}

module.exports = RoomGame;
