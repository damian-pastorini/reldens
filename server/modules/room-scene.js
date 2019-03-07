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
        // Note: in the future not all the scene information will be sent to the client.
        // This is because we could have hidden information to be discovered.
        this.setState(new State(options.scene));
        // create world:
        let roomWorld = new P2world();
        roomWorld.applyGravity = false;
        // add collisions:
        roomWorld.setMapCollisions(this.state.sceneData);
        // assign world to room:
        this.p2world = roomWorld;
        // start world movement:
        var self = this;
        // @TODO: improve the timeStep to perfectly match client frames and movement.
        this.timeStep = 0.0386; // 1/60; // 0.112;
        this.worldTimer = this.clock.setInterval(function(){
            self.p2world.step(self.timeStep);
        }, 1000 * self.timeStep);
    }

    onJoin(client, options, authResult)
    {
        var fatherEvent = this;
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
        this.state.createPlayer(client.sessionId, authResult);
        let currentPlayer = this.state.players[client.sessionId];
        // server physics:
        let boxShape = new P2.Box({ width: 32, height: 32});
        boxShape.collisionGroup = share.COL_PLAYER;
        boxShape.collisionMask = share.COL_ENEMY | share.COL_GROUND;
        let boxBody = new P2.Body({
            mass:1,
            position:[currentPlayer.x, currentPlayer.y],
            type: P2.Body.DYNAMIC
        });
        boxBody.addShape(boxShape);
        boxBody.playerId = client.sessionId;
        this.p2world.addBody(boxBody);
        let bodyIndex = this.p2world.bodies.length -1;
        currentPlayer.bodyIndex = bodyIndex;
        // on impact:
        this.p2world.on('impact', function(evt){
            var bodyA = evt.bodyA,
                bodyB = evt.bodyB;
            if(bodyA.hasOwnProperty('playerId')){
                var currentPlayer = fatherEvent.state.players[client.sessionId];
                var cPlayerBody = bodyA;
                bodyA.velocity = [0,0];
            } else {
                if(bodyB.hasOwnProperty('playerId')){
                    var currentPlayer = fatherEvent.state.players[bodyA.playerId];
                    var cPlayerBody = bodyB;
                    bodyB.velocity = [0,0];
                } else {
                    // @TODO: refactor this with the NPC's implementation.
                    // Note: in the current implementation we should never hit this since we do not have any other
                    // moving bodies beside the players.
                    console.log('Who is moving?', bodyA, bodyB);
                }
            }
            fatherEvent.state.stopPlayer(cPlayerBody.playerId, {x: cPlayerBody.position[0], y: cPlayerBody.position[1]});
        });
        // client creation:
        this.send(client, {
            act: share.CREATE_PLAYER,
            id: client.sessionId,
            player: currentPlayer,
        });
        this.broadcast({act: share.ADD_PLAYER, id: client.sessionId, player: currentPlayer});
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
        if(data.hasOwnProperty('dir')){
            var currentPlayer = this.state.players[client.sessionId];
            var bodyToMoveIndex = currentPlayer.bodyIndex;
            var bodyToMove = this.p2world.bodies[bodyToMoveIndex];
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
        // player stop:
        if(data.act == share.STOP){
            var currentPlayer = this.state.players[client.sessionId];
            var bodyToMoveIndex = currentPlayer.bodyIndex;
            var bodyToMove = this.p2world.bodies[bodyToMoveIndex];
            bodyToMove.velocity[0] = 0;
            bodyToMove.velocity[1] = 0;
            data.x = bodyToMove.position[0];
            data.y = bodyToMove.position[1];
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
