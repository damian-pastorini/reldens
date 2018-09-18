var Room = require('colyseus').Room;
var State = require('../modules/state').state;
var DbLink = require('../modules/datalink');

class GameRoom extends Room
{

    onInit(options)
    {
        this.setState(new State());
    }

    onAuth(options)
    {
        if(options.isNewUser){
            // registration (default role_id = 1, status = 1, state = 1):
            var queryString = 'INSERT INTO users VALUES(NULL, "'+options.email+'", "'+options.username+'", "'+options.password+'", 1, 1, 1);';
        } else {
            // login:
            var queryString = 'SELECT * FROM users WHERE username="'+options.username+'" AND password="'+options.password+'";';
        }
        return new Promise((resolve, reject) => {
            DbLink.connection.query(queryString, options, (err, rows) => {
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
                        // temporal fix to get row data values as object:
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
        // console.log(this.hasReachedMaxClients());
        // console.log('session / options / auth: ', client.sessionId, options, auth);
        this.state.createPlayer(client.sessionId, auth);
    }

    onLeave(client)
    {
        this.state.removePlayer(client.sessionId);
    }

    onMessage(client, data)
    {
        // console.log('onMessage:', client.sessionId, ':', data);
        if(data.act == 'keyPress'){
            this.state.movePlayer(client.sessionId, data);
        }
        if(data.act == 'stop') {
            this.state.stopPlayer(client.sessionId, data);
        }
        // @TODO: fix scene change sync.
        if(data.act == 'scene'){
            this.state.players[client.sessionId].scene = data.next;
            console.log('change scene', data);
            // broadcast the current player scene change to be removed or added from other players:
            this.broadcast({act: 'change-scene', id: client.sessionId, scene: data.next});
        }
        if(data.act == 'get-players') {
            // console.log(this.state.players);
            let playersInScene = [];
            for(let i in this.state.players){
                let ps = this.state.players[i];
                console.log(ps, (client.sessionId != ps.sessionId), (ps.scene == data.next));
                if(client.sessionId != ps.sessionId && ps.scene == data.next){
                    playersInScene.push({id: ps.sessionId, x: ps.x, y: ps.y, dir: ps.dir});
                }
            }
            console.log('playersInScene: ', playersInScene);
            if(playersInScene.length){
                // players in current scene just sent to the current client:
                console.log({act: 'add-from-scene', scene: data.next, p: playersInScene});
                this.send(client, {act: 'add-from-scene', scene: data.next, p: playersInScene});
            }
        }
    }

    onDispose()
    {
        console.log('Dispose GameRoom');
    }

}

exports.gameroom = GameRoom;
