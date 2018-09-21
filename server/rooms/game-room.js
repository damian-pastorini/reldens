var Room = require('colyseus').Room;
var State = require('../modules/state').state;
var DataLink = require('../modules/datalink');
var share = require('../../shared/constants');

class GameRoom extends Room
{

    onInit(options)
    {
        this.setState(new State());
    }

    onAuth(options)
    {
        if(options.isNewUser){
            // the last 3 values are for the default role_id = 1, status = 1 and state = 1:
            var queryString = 'INSERT INTO users VALUES(NULL, "'+options.email+'", "'+options.username+'", "'+options.password+'", 1, 1, 1);';
        } else {
            // @TODO: check if user is already logged and disconnect from the previous client.
            // login:
            var queryString = 'SELECT * FROM users WHERE username="'+options.username+'" AND password="'+options.password+'";';
        }
        return new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, options, (err, rows) => {
                if(err){
                    return reject(options);
                }
                if(rows){
                    if(options.isNewUser){
                        options.isNewUser = false;
                        options.role_id = 1;
                        options.status = 1;
                        options.state = 1;
                        resolve(options);
                    } else {
                        // @TODO: refactor to get row data values as object.
                        var currentPlayer = '';
                        for(let i=0; i<rows.length; i++){
                            currentPlayer = rows[i];
                            break;
                        }
                        resolve(currentPlayer);
                    }
                }
            });
        });
    }

    onJoin(client, options, auth)
    {
        // player creation:
        this.state.createPlayer(client.sessionId, auth);
    }

    onLeave(client)
    {
        // remove player on logout:
        this.state.removePlayer(client.sessionId);
    }

    onMessage(client, data)
    {
        // player movement:
        if(data.act == share.KEY_PRESS){
            this.state.movePlayer(client.sessionId, data);
        }
        // player stop:
        if(data.act == share.STOP) {
            this.state.stopPlayer(client.sessionId, data);
        }
        // player change scene:
        if(data.act == share.CHANGE_SCENE){
            let previousScene = this.state.players[client.sessionId].scene;
            this.state.players[client.sessionId].scene = data.next;
            // broadcast the current player scene change to be removed or added in other players:
            // @TODO: instead of broadcast the scene change we need to listen the player.scene attribute change.
            this.broadcast({act: share.CHANGE_SCENE, id: client.sessionId, scene: data.next, prev: previousScene});
        }
        // players in the same scene:
        if(data.act == share.GET_PLAYERS){
            // @TODO: this will be this.state.players when we use different server rooms to match client scenes.
            let playersInScene = [];
            for(let i in this.state.players){
                let ps = this.state.players[i];
                if(client.sessionId != ps.sessionId && ps.scene == data.next){
                    playersInScene.push({id: ps.sessionId, x: ps.x, y: ps.y, dir: ps.dir});
                }
            }
            if(playersInScene.length){
                // players in current scene sent only to the current client:
                this.send(client, {act: share.ADD_FROM_SCENE, scene: data.next, p: playersInScene});
            }
        }
    }

    onDispose()
    {
        console.log('Dispose GameRoom');
    }

}

exports.gameroom = GameRoom;
