const RoomLogin = require('./room-login').roomlogin;
const State = require('./state').state;
const DataLink = require('./datalink');
const share = require('../../shared/constants');
const P2 = require('p2');
const P2world = require('./p2world').p2world;

class RoomScene extends RoomLogin
{

    onInit(options)
    {
        console.log('NOTIFICATION - INIT ROOM:', this.roomName);
        // @NOTE: in the future not all the scene information will be sent to the client. This is because we could have
        // hidden information to be discovered.
        let roomState = new State(options.scene);
        this.setState(roomState);
        // create world:
        this.createWorld(options.scene);
    }

    onJoin(client, options, authResult)
    {
        // @TODO: check client ID in room presence.
        // check if user is already logged and disconnect from the previous client:
        if(this.state.players.length > 0){
            for(let player of this.state.players){
                if(player.username === options.username){
                    // @TODO: this should use a Promise.
                    this.saveStateAndRemovePlayer(player.sessionId);
                    break;
                }
            }
        }
        // player creation:
        let currentPlayer = this.state.createPlayer(client.sessionId, authResult);
        // create body for server physics and assign the body to the player:
        currentPlayer.p2body = this.createPlayerBody(currentPlayer, client.sessionId);
        // client creation:
        this.broadcast({act: share.ADD_PLAYER, id: client.sessionId, player: currentPlayer});
    }

    onLeave(client, consented)
    {
        let currentPlayer = this.getPlayer(client.sessionId);
        if(currentPlayer){
            this.saveStateAndRemovePlayer(client.sessionId);
        }
    }

    onMessage(client, data)
    {
        // get player:
        let currentPlayer = this.getPlayer(client.sessionId);
        if(currentPlayer){
            // get player body:
            let bodyToMove = currentPlayer.p2body;
            // if player is moving:
            if(data.hasOwnProperty('dir')){
                if(bodyToMove){
                    if(data.dir === share.RIGHT){
                        bodyToMove.velocity[0] = share.SPEED_SERVER;
                    }
                    if(data.dir === share.LEFT){
                        bodyToMove.velocity[0] = -share.SPEED_SERVER;
                    }
                    if(data.dir === share.UP){
                        bodyToMove.velocity[1] = -share.SPEED_SERVER;
                    }
                    if(data.dir === share.DOWN){
                        bodyToMove.velocity[1] = share.SPEED_SERVER;
                    }
                    data.x = bodyToMove.position[0];
                    data.y = bodyToMove.position[1];
                    this.state.movePlayer(client.sessionId, data);
                }
            }
            // if player stopped:
            if(data.act === share.STOP){
                if(currentPlayer.isBusy){
                    return false;
                }
                // get player body:
                let bodyToMove = currentPlayer.p2body;
                if(bodyToMove){
                    // stop by setting speed to zero:
                    bodyToMove.velocity[0] = 0;
                    bodyToMove.velocity[1] = 0;
                    data.x = bodyToMove.position[0];
                    data.y = bodyToMove.position[1];
                    this.state.stopPlayer(client.sessionId, data);
                }
            }
        }
    }

    createWorld(sceneData)
    {
        let roomWorld = new P2world({
            gravity:[0, 0],
            sceneName: this.roomName,
            sceneTiledMapFile: sceneData.sceneMap
        });
        // @TODO: this should be part of the game configuration.
        roomWorld.applyGravity = false;
        // create world limits:
        roomWorld.createLimits();
        // add collisions:
        roomWorld.setMapCollisions(sceneData);
        // assign world to room:
        this.p2world = roomWorld;
        // activate world collisions:
        this.assignCollisions();
        // start world movement:
        // @TODO: in the future we need to improve the timeStep to perfectly match client movement for predictions.
        this.timeStep = 0.04; // 1/60; // 0.0116 // 0.112;
        this.worldTimer = this.clock.setInterval(() => {
            this.p2world.step(this.timeStep);
        }, 1000 * this.timeStep);
        console.log('NOTIFICATION - P2 WORLD CREATED IN ROOM:', this.roomName);
    }

    assignCollisions()
    {
        if(this.p2world){
            // assign actions on end contact:
            this.p2world.on('endContact', (evt) => {
                let bodyA = evt.bodyA,
                    bodyB = evt.bodyB,
                    currentPlayerBody = false,
                    wallBody = false;
                if(bodyA.playerId){
                    currentPlayerBody = bodyA;
                    wallBody = bodyB;
                    bodyA.velocity = [0,0];
                } else {
                    if(bodyB.playerId){
                        currentPlayerBody = bodyB;
                        wallBody = bodyA;
                        bodyB.velocity = [0,0];
                    } else {
                        // @TODO: refactor this with the NPC's implementation.
                        // @NOTE: in the current implementation we should never hit this since we do not have any other
                        // moving bodies beside the players.
                        console.log('WHO IS MOVING???', bodyA.velocity, bodyA.position, bodyB.velocity, bodyB.position);
                    }
                }
                let contactPlayer = this.getPlayer(currentPlayerBody.playerId);
                if(contactPlayer.isBusy || currentPlayerBody.isChangingScene){
                    // @NOTE: if the player is been saved or if is changing scene: do nothing.
                } else {
                    let playerPosition = {x: currentPlayerBody.position[0], y: currentPlayerBody.position[1]};
                    this.state.stopPlayer(currentPlayerBody.playerId, playerPosition);
                }
                // check for scene change points:
                if(wallBody.changeScenePoint){
                    // scene change data:
                    let changeScene = wallBody.changeScenePoint;
                    let previousScene = contactPlayer.scene;
                    let changeData = {prev: previousScene, next: changeScene};
                    // check if the player is not changing scenes already:
                    if(currentPlayerBody.isChangingScene === false){
                        currentPlayerBody.isChangingScene = true;
                        let contactClient = this.getClientById(currentPlayerBody.playerId);
                        this.nextSceneInitialPosition(contactClient, changeData);
                        // @NOTE: we do not need to change back the isChangingScene property back to false since in the new
                        // scene a new body will be created with the value set to false by default.
                    }
                }
            });
        }
    }

    createPlayerBody(currentPlayer, sessionId)
    {
        let boxShape = new P2.Box({ width: 32, height: 32});
        boxShape.collisionGroup = share.COL_PLAYER;
        boxShape.collisionMask = share.COL_ENEMY | share.COL_GROUND;
        let boxBody = new P2.Body({
            mass:1,
            position:[currentPlayer.x, currentPlayer.y],
            type: P2.Body.DYNAMIC,
            fixedRotation: true
        });
        boxBody.addShape(boxShape);
        boxBody.playerId = sessionId;
        boxBody.isChangingScene = false;
        this.p2world.addBody(boxBody);
        // return body:
        return boxBody;
    }

    nextSceneInitialPosition(client, data)
    {
        // prepare query:
        let queryString = `SELECT return_positions FROM scenes WHERE name="${data.next}";`;
        let prom = new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, {}, (err, rows) => {
                if(err){
                    console.log('ERROR - Query:', err, data);
                    return reject(err);
                }
                if(rows){
                    // there should be only 1 row always:
                    let positions = JSON.parse(rows[0].return_positions);
                    resolve({data: data, positions: positions});
                }
            });
        });
        prom.then((result) => {
            let currentPlayer = this.state.players[client.sessionId];
            for(let newPosition of result.positions){
                if(!newPosition.hasOwnProperty('P') || newPosition.P === result.data.prev){
                    currentPlayer.scene = result.data.next;
                    currentPlayer.x = parseFloat(newPosition.X);
                    currentPlayer.y = parseFloat(newPosition.Y);
                    currentPlayer.dir = newPosition.D;
                    let stateSaved = this.savePlayerState(client.sessionId);
                    if(stateSaved !== false){
                        stateSaved.then((stateResult) => {
                            // @NOTE: we need to broadcast the current player scene change to be removed or added in other players:
                            this.broadcast({
                                act: share.CHANGED_SCENE,
                                id: client.sessionId,
                                scene: currentPlayer.scene,
                                prev: result.data.prev,
                                x: currentPlayer.x,
                                y: currentPlayer.y,
                                dir: currentPlayer.dir,
                            });
                            // remove body from server world:
                            let bodyToRemove = currentPlayer.p2body;
                            this.p2world.removeBody(bodyToRemove);
                            // reconnect is to create the player in the new scene:
                            this.send(client, {act: share.RECONNECT, player: currentPlayer, prev: result.data.prev});
                        }).catch((err) => {
                            console.log('ERROR - Save state error:', client.sessionId, err);
                        });
                    }
                    break;
                }
            }
        }).catch((err) => {
            console.log('ERROR - Player scene change error:', err);
        });
    }

    saveStateAndRemovePlayer(sessionId)
    {
        // save the last state on the database:
        let prom = this.savePlayerState(sessionId);
        prom.then((result) => {
            // first remove player body from current world:
            let playerToRemove = this.getPlayer(sessionId);
            if(playerToRemove){
                // get body:
                let bodyToRemove = playerToRemove.p2body;
                if(bodyToRemove){
                    // remove body:
                    this.p2world.removeBody(bodyToRemove);
                }
                // remove player:
                this.state.removePlayer(sessionId);
            }
        }).catch((err) => {
            console.log('ERROR - Player save error:', err);
        });
    }

    savePlayerState(sessionId)
    {
        // when user disconnects save the last state on the database:
        let currentUser = this.getPlayer(sessionId);
        if(currentUser.isBusy){
            return false;
        }
        currentUser.isBusy = true;
        // prepare json:
        let currentStateJson = '{'
            +'"scene":"'+currentUser.scene+'",'
            +'"x":"'+parseFloat(currentUser.x).toFixed(2)+'",'
            +'"y":"'+parseFloat(currentUser.y).toFixed(2)+'",'
            +'"dir":"'+currentUser.dir+'"'
            +'}';
        let args = {sessionId: sessionId};
        // prepare query:
        let queryString = `UPDATE users SET state='${currentStateJson}' WHERE username='${currentUser.username}';`;
        // run query:
        return new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, args, (err, rows) => {
                if(err){
                    console.log('ERROR - Query error:', err, args);
                    return reject(args);
                }
                if(rows){
                    resolve(rows);
                    currentUser.isBusy = false;
                }
            });
        });
    }

    getClientById(clientId)
    {
        let result;
        if(this.clients){
            for (let client of this.clients){
                if (client.sessionId === clientId){
                    result = client;
                    break;
                }
            }
        }
        return result;
    }

    getPlayer(playerIndex)
    {
        let result = false;
        if(this.state.players[playerIndex]){
            result = this.state.players[playerIndex];
        }
        return result;
    }

}

exports.roomscene = RoomScene;
