var Room = require('colyseus').Room;
var State = require('./state').state;
var DataLink = require('./datalink');
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
                        // if is a new user status is always active by default:
                        resolve(options);
                    } else {
                        // @TODO: refactor to get row data values as object.
                        var currentPlayer = '';
                        for(let i=0; i<rows.length; i++){
                            currentPlayer = rows[i];
                            break;
                        }
                        // if player status is not active then return an error:
                        if(currentPlayer.status !== 1){
                            reject(options);
                        } else {
                            resolve(currentPlayer);
                        }
                    }
                }
            });
        });
    }

    onJoin(client, options, auth)
    {
        // check if user is already logged and disconnect from the previous client:
        for(let i in this.state.players){
            let p = this.state.players[i];
            if(p.username == options.username){
                this.saveStateAndRemovePlayer(p.sessionId);
                break;
            }
        }
        // player creation:
        this.state.createPlayer(client.sessionId, auth);
        // client creation:
        this.send(client, {act: share.CREATE_PLAYER, id: client.sessionId, player: this.state.players[client.sessionId], players: this.state.players});
        this.broadcast({act: share.ADD_PLAYER, id: client.sessionId, player: this.state.players[client.sessionId]});
    }

    onLeave(client)
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
        if(data.act == share.CHANGE_SCENE){
            let previousScene = this.state.players[client.sessionId].scene;
            this.state.players[client.sessionId].scene = data.next;
            // @NOTE: we need to broadcast the current player scene change to be removed or added in other players:
            this.broadcast({act: share.CHANGE_SCENE, id: client.sessionId, scene: data.next, prev: previousScene});
        }
        // players in the same scene:
        if(data.act == share.GET_PLAYERS){
            // @TODO: this will be this.state.players when we use different server rooms to match client scenes.
            let playersInScene = [];
            for(let i in this.state.players){
                let ps = this.state.players[i];
                if(client.sessionId != ps.sessionId && ps.scene == data.next){
                    playersInScene.push({id: ps.sessionId, x: parseFloat(ps.x), y: parseFloat(ps.y), dir: ps.dir});
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
        console.log('Dispose GameRoom > ', this.state.players);
    }

    saveStateAndRemovePlayer(sessionId)
    {
        var room = this;
        // when user disconnects save the last state on the database:
        let currentUser = this.state.players[sessionId];
        // prepare json:
        let currentStateJson = '{'
            +'"scene":"'+currentUser.scene+'",'
            +'"x":"'+currentUser.x+'",'
            +'"y":"'+currentUser.y+'",'
            +'"dir":"'+currentUser.dir+'"'
            +'}';
        let args = {sessionId: sessionId};
        // prepare query:
        let queryString = 'UPDATE users SET state=\''+currentStateJson+'\' WHERE username="'+currentUser.username+'";';
        // run query:
        let prom = new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, args, (err, rows) => {
                if(err){
                    return reject(args);
                }
                if(rows){
                    resolve(rows);
                }
            });
        });
        prom.then(function(result){
            // remove player:
            room.state.removePlayer(sessionId);
        }).catch(function(err){
            console.log('Player save error! ', err);
        });
    }

}

exports.gameroom = GameRoom;
