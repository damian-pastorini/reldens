const Room = require('colyseus').Room;
const DataLink = require('./datalink');
const share = require('../../shared/constants');
const bcrypt = require('bcrypt');
const saltRounds = 10;

class RoomLogin extends Room
{

    onAuth(options)
    {
        if(!options){
            return false;
        }
        var salt = bcrypt.genSaltSync(saltRounds);
        var hash = bcrypt.hashSync(options.password, salt);
        // @TODO: this should be in the game configuration.
        var defaultState = '{"scene":"'+share.TOWN+'","x":"225","y":"280","dir":"'+share.DOWN+'"}';
        if(options.isNewUser){
            // the last 3 values are for the default role_id = 1, status = 1 and state = 1:
            var queryString = 'INSERT INTO users VALUES(NULL, "'+options.email+'", "'+options.username+'", "'+hash+'", 1, 1, \''+defaultState+'\');';
        } else {
            // login:
            var queryString = 'SELECT * FROM users WHERE username="'+options.username+'"';
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
                        options.state = defaultState;
                        // if is a new user status is always active by default:
                        return resolve(options);
                    } else {
                        // @TODO: refactor loop.
                        var currentPlayer = '';
                        for(let i=0; i<rows.length; i++){
                            currentPlayer = rows[i];
                            break;
                        }
                        // if player status is not active then return an error:
                        if(currentPlayer.status !== 1 || !bcrypt.compareSync(options.password, currentPlayer.password)){
                            return reject(false);
                        } else {
                            return resolve(currentPlayer);
                        }
                    }
                }
            });
        });
    }

}

exports.roomlogin = RoomLogin;
