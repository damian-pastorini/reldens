const Room = require('colyseus').Room;
const bcrypt = require('bcrypt');
const saltRounds = 10;

class RoomLogin extends Room
{

    onCreate(options)
    {
        this.config = options.config;
        this.dataServer = options.dataServer;
    }

    onAuth(client, options, request)
    {
        if(!options){
            return false;
        }
        // first find if the email was used already:
        let queryString = `SELECT * FROM users WHERE username='${options.username}'`;
        return new Promise((resolve, reject) => {
            this.dataServer.query(queryString).then((rows) => {
                // generate the password hash:
                let salt = bcrypt.genSaltSync(saltRounds);
                let hash = bcrypt.hashSync(options.password, salt);
                // if the email exists:
                if(rows){
                    let currentPlayer = rows[0];
                    // check if player status is not active or if the password doesn't match then return an error:
                    if(currentPlayer.status !== 1 || !bcrypt.compareSync(options.password, currentPlayer.password)){
                        // if the password doesn't match return an error:
                        return reject({msj: 'User already exists.'});
                    } else {
                        let currentState = JSON.parse(currentPlayer.state);
                        // @TODO: valid rooms will be part of the configuration in the database.
                        let validRooms = ['room_game', 'chat_global'];
                        if(validRooms.indexOf(this.roomName) === -1 && currentState.scene !== this.roomName){
                            console.log('ERROR - Invalid player scene:', currentState.scene, this.roomName);
                            return reject({msj: 'ERROR - Invalid player scene.'});
                        }
                        // if everything is good then just return the user:
                        return resolve(currentPlayer);
                    }
                } else {
                    // if the email doesn't exists in the database and it's a registration request:
                    if(options.isNewUser){
                        // @TODO: default state will be part of the configuration in the database.
                        if(this.config.hasOwnProperty('initialScene') && this.config.initialScene.hasOwnProperty('scene')){
                            let initScene = this.config.initialScene;
                            let defaultState = `{"scene":"${initScene.scene}","x":"${initScene.x}","y":"${initScene.y}","dir":"${initScene.dir}"}`;
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
                            return this.dataServer.query(queryString).then((rows) => {
                                return resolve(options);
                            }).catch((err) => {
                                // if there's any error then reject:
                                // console.log('ERROR - Unable to register the user.', err);
                                return reject({msj: 'Unable to register the user.'});
                            });
                        } else {
                            return reject({msj: 'ERROR - Missing initial scene configuration.'});
                        }
                    } else {
                        return reject({msj: 'Unable to authenticate the user.'});
                    }
                }
            });
        });
    }

    onDispose()
    {
        console.log('INFO - ON-DISPOSE Room:', this.roomName);
    }

}

module.exports = RoomLogin;
