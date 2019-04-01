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
        // @NOTE: in the future not all the scene information will be sent to the client. This is because we could have
        // hidden information to be discovered.
        this.setState(new State(options.scene));
        // create world:
        this.createWorld(this.state.sceneData);
    }

    onJoin(client, options, authResult)
    {
        var self = this;
        // @TODO: check client ID in room presence.
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
        let currentPlayer = this.state.createPlayer(client.sessionId, authResult);
        // server physics:
        let bodyIndex = this.createPlayerBody(currentPlayer, client.sessionId);
        currentPlayer.bodyIndex = bodyIndex;
        // client creation:
        this.send(client, {act: share.CREATE_PLAYER, id: client.sessionId, player: currentPlayer});
        this.broadcast({act: share.ADD_PLAYER, id: client.sessionId, player: currentPlayer});
        // assign actions on end contact:
        this.p2world.on('endContact', function(evt){
            // self.runWorldEndContactActions(evt);
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
            let contactPlayer = self.getPlayer(currentPlayerBody.playerId);
            if(contactPlayer.isBussy || currentPlayerBody.isChangingScene) {
                // @NOTE: if the player is been saved or if is changing scene: do nothing.
            } else {
                self.state.stopPlayer(currentPlayerBody.playerId, {x: currentPlayerBody.position[0], y: currentPlayerBody.position[1]});
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
                    let contactClient = self.getClientById(currentPlayerBody.playerId);
                    self.nextSceneInitialPosition(contactClient, changeData);
                    // @NOTE: we do not need to change back the isChangingScene property back to false since in the new
                    // scene a new body will be created with the value set to false by default.
                }
            }
        });
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
            let bodyToMoveIndex = currentPlayer.bodyIndex;
            let bodyToMove = this.p2world.bodies[bodyToMoveIndex];
            // if is player movement:
            if(data.hasOwnProperty('dir')){
                if(bodyToMove) {
                    if(data.dir == share.RIGHT){
                        bodyToMove.velocity[0] = share.SPEED_SERVER;
                    }
                    if(data.dir == share.LEFT){
                        bodyToMove.velocity[0] = -share.SPEED_SERVER;
                    }
                    if(data.dir == share.UP){
                        bodyToMove.velocity[1] = -share.SPEED_SERVER;
                    }
                    if(data.dir == share.DOWN){
                        bodyToMove.velocity[1] = share.SPEED_SERVER;
                    }
                    data.x = bodyToMove.position[0];
                    data.y = bodyToMove.position[1];
                    this.state.movePlayer(client.sessionId, data);
                }
            }
            // if is player stop:
            if(data.act == share.STOP){
                if(currentPlayer.isDoinIt) {
                    return false;
                }
                let bodyToMoveIndex = currentPlayer.bodyIndex;
                let bodyToMove = this.p2world.bodies[bodyToMoveIndex];
                if(bodyToMove){
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
        // start world movement:
        var self = this;
        // @TODO: in the future we need to improve the timeStep to perfectly match client movement for predictions.
        this.timeStep = 0.04; // 1/60; // 0.0116 // 0.112;
        this.worldTimer = this.clock.setInterval(function(){
            self.p2world.step(self.timeStep);
        }, 1000 * self.timeStep);
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
        let bodyIndex = this.p2world.bodies.length -1;
        return bodyIndex;
    }

    nextSceneInitialPosition(client, data)
    {
        var self = this;
        // prepare query:
        let queryString = 'SELECT return_positions FROM scenes WHERE name="'+data.next+'";';
        let prom = new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, {}, (err, rows) => {
                if(err){
                    console.log('ERROR - Query:', err, data);
                    return reject(err);
                }
                if(rows){
                    let positions = '';
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
            let currentPlayer = self.state.players[client.sessionId];
            for(let i in result.positions){
                let newPosition = result.positions[i];
                if(!newPosition.hasOwnProperty('P') || newPosition.P == result.data.prev){
                    currentPlayer.scene = result.data.next;
                    currentPlayer.x = parseFloat(newPosition.X);
                    currentPlayer.y = parseFloat(newPosition.Y);
                    currentPlayer.dir = newPosition.D;
                    let stateSaved = self.savePlayerState(client.sessionId);
                    if(stateSaved !== false){
                        stateSaved.then(function(stateResult) {
                            // @NOTE: we need to broadcast the current player scene change to be removed or added in other players:
                            self.broadcast({
                                act: share.CHANGED_SCENE,
                                id: client.sessionId,
                                scene: currentPlayer.scene,
                                prev: result.data.prev,
                                x: currentPlayer.x,
                                y: currentPlayer.y,
                                dir: currentPlayer.dir,
                            });
                            // reconnect is to create the player in the new scene:
                            self.send(client, {act: share.RECONNET, player: currentPlayer, prev: result.data.prev});
                        }).catch(function(err){
                            console.log('ERROR - Save state error:', client.sessionId, err);
                        });
                    }
                    break;
                }
            }
        }).catch(function(err){
            console.log('ERROR - Player scene change error:', err);
        });
    }

    saveStateAndRemovePlayer(sessionId)
    {
        var self = this;
        // save the last state on the database:
        let prom = this.savePlayerState(sessionId);
        prom.then(function(result){
            // first remove player body from current world:
            let playerToRemove = self.getPlayer(sessionId);
            if(playerToRemove){
                let bodyToRemove = self.p2world.bodies[playerToRemove.bodyIndex];
                if(bodyToRemove){
                    self.p2world.removeBody(bodyToRemove);
                }
                // remove player:
                self.state.removePlayer(sessionId);
            }
        }).catch(function(err){
            console.log('ERROR - Player save error:', err);
        });
    }

    savePlayerState(sessionId)
    {
        // when user disconnects save the last state on the database:
        let currentUser = this.getPlayer(sessionId);
        if(currentUser.isBussy) {
            return false;
        }
        currentUser.isBussy = true;
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
                    console.log('ERROR - Query error:', err, args);
                    return reject(args);
                }
                if(rows){
                    resolve(rows);
                    currentUser.isBussy = false;
                }
            });
        });
    }

    getClientById(clientId)
    {
        let result = false;
        if(this.clients){
            for (let i=0; i < this.clients.length; i++) {
                let client = this.clients[i];
                if (client.sessionId == clientId) {
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
        if(this.state.players[playerIndex]) {
            result = this.state.players[playerIndex];
        }
        return result;
    }

    getBody(playerIndex)
    {
        let result = false;
        let player = this.getPlayer(playerIndex);
        if(player) {
            let bodyIndex = player.bodyIndex;
            if(this.p2world.bodies[bodyIndex]){
                result = this.p2world.bodies[bodyIndex];
            }
        }
        return result;
    }

}

exports.roomscene = RoomScene;
