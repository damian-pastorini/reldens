var Room = require('colyseus').Room;
var State = require('../modules/state').state;
var DataLink = require('../modules/datalink');
var share = require('../../shared/constants');

class SceneRoom extends Room
{

    onInit(options)
    {
        // this.setState(new State());
    }

    onAuth(options)
    {

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

exports.sceneroom = SceneRoom;
