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
const Player = require('./player');
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
        // @TODO: fix DataLink implementation.
        let prom = new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, {}, (err, rows) => {
                if(err){
                    console.log('ERROR - Query:', err, data);
                    return reject(err);
                }
                if(rows){
                    // for now we don't do nothing with this.
                    return true;
                }
            });
        });
    }

}

module.exports = RoomGame;
