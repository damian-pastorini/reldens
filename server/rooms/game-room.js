var Room = require('colyseus').Room;
var State = require('../modules/state').state;
var DbLink = require('../modules/datalink');

class GameRoom extends Room
{

    onInit(options)
    {
        console.log('GameRoom created!', options);
        this.setState(new State());
    }

    onAuth(options)
    {
        // console.log('onAuth: ', options);
        if(options.isNewUser){
            // registration (default role_id = 1, status = 1, state = 1):
            var queryString = 'INSERT INTO users VALUES(NULL, "'+options.email+'", "'+options.username+'", "'+options.password+'", 1, 1, 1);';
        } else {
            // login:
            var queryString = 'SELECT * FROM users WHERE username="'+options.username+'" AND password="'+options.password+'";';
        }
        // console.log(queryString);
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
                        for(var i=0; i<rows.length; i++){
                            currentPlayer = rows[i];
                            break;
                        }
                        // console.log(currentPlayer);
                        resolve(currentPlayer);
                    }
                }
            });
        });
    }

    onJoin(client, options, auth)
    {
        // console.log(this.hasReachedMaxClients());
        console.log('session / options / auth: ', client.sessionId, options, auth);
        this.state.createPlayer(client.sessionId, auth);
    }

    onLeave(client)
    {
        // console.log('Leave session: '+client.sessionId);
        this.state.removePlayer(client.sessionId);
    }

    onMessage(client, data)
    {
        // console.log('onMessage:', client.sessionId, ':', data);
        this.state.movePlayer(client.sessionId, data);
    }

    onDispose()
    {
        console.log('Dispose GameRoom');
    }

}

exports.gameroom = GameRoom;
