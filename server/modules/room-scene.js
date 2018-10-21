const RoomLogin = require('./room-login').roomlogin;
const State = require('./state').state;
const DataLink = require('./datalink');
const share = require('../../shared/constants');

class RoomScene extends RoomLogin
{

    onInit(options)
    {
        // @TODO: move scene data logic on server side to validate the user actions.
        // Note: in the future not all the scene information will be sent to the client.
        // This is because we could have hidden information to be discovered.
        this.setState(new State(options.scene));
    }

    onJoin(client, options, authResult)
    {
        // TODO: check client ID in room presence.
        // check if user is already logged and disconnect from the previous client:
        for(let i in this.state.players){
            let p = this.state.players[i];
            if(p.username == options.username){
                // @TODO: this should use a Promise.
                this.saveStateAndRemovePlayer(p.sessionId);
                break;
            }
        }
        // player creation:
        this.state.createPlayer(client.sessionId, authResult);
        // client creation:
        this.send(client, {
            act: share.CREATE_PLAYER,
            id: client.sessionId,
            player: this.state.players[client.sessionId],
        });
        this.broadcast({act: share.ADD_PLAYER, id: client.sessionId, player: this.state.players[client.sessionId]});
    }

    onLeave(client, consented)
    {
        if(this.state.players[client.sessionId]){
            this.saveStateAndRemovePlayer(client.sessionId);
        }
    }

    onMessage(client, data)
    {
        // player movement:
        if(data.act == share.KEY_PRESS){
            this.state.movePlayer(client.sessionId, data);
        }
        // player stop:
        if(data.act == share.STOP){
            this.state.stopPlayer(client.sessionId, data);
        }
        // player change scene:
        if(data.act == share.CLIENT_CHANGED_SCENE){
            let previousScene = this.state.players[client.sessionId].scene;
            this.state.players[client.sessionId].scene = data.next;
            // Here we need to calculate the initial position of the next scene, for that we will need to hit the DB.
            // In the mean time we can remove the user from the current scene.
            this.nextSceneInitialPosition(client, data);
        }
    }

    nextSceneInitialPosition(client, data)
    {
        var room = this;
        // prepare query:
        let queryString = 'SELECT return_positions FROM scenes WHERE name="'+data.next+'";';
        let prom = new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, {}, (err, rows) => {
                if(err){
                    console.log('Query error: ', err, data);
                    return reject(err);
                }
                if(rows){
                    var positions = '';
                    // there should be only 1 row always:
                    for(let i in rows) {
                        positions = JSON.parse(rows[i].return_positions);
                        break;
                    }
                    resolve({data: data, positions: positions});
                }
            });
        });
        prom.then(function(result){
            var currentPlayer = room.state.players[client.sessionId];
            for(let i in result.positions){
                let newPosition = result.positions[i];
                if(!newPosition.hasOwnProperty('P') || newPosition.P == result.data.prev){
                    currentPlayer.scene = result.data.next;
                    currentPlayer.x = parseFloat(newPosition.X);
                    currentPlayer.y = parseFloat(newPosition.Y);
                    currentPlayer.dir = newPosition.D;
                    let stateSaved = room.savePlayerState(client.sessionId);
                    stateSaved.then(function(stateResult) {
                        // @NOTE: we need to broadcast the current player scene change to be removed or added in other players:
                        room.broadcast({
                            act: share.CHANGED_SCENE,
                            id: client.sessionId,
                            scene: currentPlayer.scene,
                            prev: result.data.prev,
                            x: currentPlayer.x,
                            y: currentPlayer.y,
                            dir: currentPlayer.dir,
                        });
                        // reconnect is to create the player in the new scene:
                        room.send(client, {act: share.RECONNET, player: currentPlayer, prev: result.data.prev});
                    }).catch(function(err){
                        console.log('Save state error. ', client.sessionId, err);
                    });
                    break;
                }
            }
        }).catch(function(err){
            console.log('Player scene change error! ', err);
        });
    }

    saveStateAndRemovePlayer(sessionId)
    {
        var room = this;
        // save the last state on the database:
        let prom = this.savePlayerState(sessionId);
        prom.then(function(result){
            // remove player:
            room.state.removePlayer(sessionId);
        }).catch(function(err){
            console.log('Player save error! ', err);
        });
    }

    savePlayerState(sessionId)
    {
        // console.log('Saved player: ', sessionId);
        // when user disconnects save the last state on the database:
        let currentUser = this.state.players[sessionId];
        // prepare json:
        let currentStateJson = '{'
            +'"scene":"'+currentUser.scene+'",'
            +'"x":"'+parseFloat(currentUser.x).toFixed(2)+'",'
            +'"y":"'+parseFloat(currentUser.y).toFixed(2)+'",'
            +'"dir":"'+currentUser.dir+'"'
            +'}';
        let args = {sessionId: sessionId};
        // prepare query:
        let queryString = 'UPDATE users SET state=\''+currentStateJson+'\' WHERE username="'+currentUser.username+'";';
        // run query:
        return new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, args, (err, rows) => {
                if(err){
                    console.log('Query error: ', err, args);
                    return reject(args);
                }
                if(rows){
                    resolve(rows);
                }
            });
        });
    }

}

exports.roomscene = RoomScene;
