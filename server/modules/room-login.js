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
        // first find if the email was used already:
        let queryString = `SELECT * FROM users WHERE username='${options.username}'`;
        return new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, options, (err, rows) => {
                if(err){
                    // if there's any error then reject:
                    return reject(options);
                }
                // generate the password hash:
                let salt = bcrypt.genSaltSync(saltRounds);
                let hash = bcrypt.hashSync(options.password, salt);
                // if the email exists:
                if(rows.length > 0){
                    let currentPlayer = rows[0];
                    // check if player status is not active or if the password doesn't match then return an error:
                    if(currentPlayer.status !== 1 || !bcrypt.compareSync(options.password, currentPlayer.password)){
                        // if the password doesn't match return an error:
                        return reject(false);
                    } else {
                        // if everything is good then just return the user:
                        // @TODO: analyze if we need to check the user is joining a "valid" room.
                        // A "valid" room means the user reached room using the previous room change point (if is not
                        // the first room visited), and the position is the correct.
                        // This is probably not needed since we are saving the user status and reloading it in the next
                        // room.
                        return resolve(currentPlayer);
                    }
                } else {
                    // if the email doesn't exists in the database and it's a registration request:
                    if(options.isNewUser){
                        // @TODO: default state will be part of the configuration in the database.
                        let defaultState = `{"scene":"${share.TOWN}","x":"225","y":"280","dir":"${share.DOWN}"}`;
                        // the last 3 values are for the default role_id = 1, status = 1 and state = 1:
                        queryString = `INSERT INTO users VALUES(
                            NULL, 
                            '${options.email}',
                            '${options.username}',
                            '${hash}',
                            1,
                            1,
                            '${defaultState}',
                            CURRENT_TIMESTAMP,
                            CURRENT_TIMESTAMP);`;
                        // if is a new user status is always active by default:
                        options.isNewUser = false;
                        options.role_id = 1;
                        options.status = 1;
                        options.state = defaultState;
                        return DataLink.connection.query(queryString, options, (err, rows) => {
                            if(err){
                                // if there's any error then reject:
                                return reject(options);
                            }
                            return resolve(options);
                        });
                    } else {
                        return reject(false);
                    }
                }
            });
        });
    }

    onDispose()
    {
        console.log('NOTIFICATION - ON-DISPOSE Room:', this.roomName);
    }

}

module.exports = RoomLogin;
