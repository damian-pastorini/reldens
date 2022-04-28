/**
 *
 * Reldens - CollisionsManager
 *
 */

const { Logger, ErrorManager, sc } = require('@reldens/utils');

class CollisionsManager
{

    constructor(room = false)
    {
        if(room){
            this.activateCollisions(room);
        }
    }

    activateCollisions(room)
    {
        this.room = room;
        if(!sc.hasOwn(this.room, 'roomWorld')){
            ErrorManager.error('Room world not found.');
        }
        // @TODO - BETA - Make dynamic, for now we will use fixed collisions types for each event.
        this.room.roomWorld.on('beginContact', this.assignBeginCollisions.bind(this));
        this.room.roomWorld.on('endContact', this.assignEndCollisions.bind(this));
        // @NOTE: postBroadphase will be used to check pairs and test overlap instead of collision, for example, a spell
        // will overlap the player but not collide with it, if the spell collides with the player it will push it in
        // the opposite direction because the physics engine.
        this.room.roomWorld.on('postBroadphase', this.assignPostBroadPhase.bind(this));
        this.room.roomWorld.on('preSolve', this.assignPreSolve.bind(this));
    }

    assignPostBroadPhase(evt)
    {
        let { pairs } = evt;
        if(1 >= pairs.length){
            return;
        }
        let bullet = false;
        let player = false;
        for(let body of pairs){
            if(body.playerId && body.pStop){
                body.velocity = [0, 0];
                body.pStop = false;
            }
            if(body.playerId){
                player = body;
            }
            if(body.isBullet){
                bullet = body;
            }
        }
        if(this.room.roomWorld.bulletsStopOnPlayer && player && bullet){
            player.velocity = [0, 0];
            player.pStop = false;
            bullet.velocity = [0, 0];
            bullet.pStop = false;
        }
    }

    assignPreSolve(evt)
    {
        if(!this.room.roomWorld.allowPassWallsFromBelow){
            return;
        }
        for(let contact of evt.contactEquations){
            let playerBody = this.getPlayerBody(contact);
            let wallBody = this.getWallBody(contact);
            if(!playerBody || !wallBody || wallBody.isWorldWall){
                return;
            }
            if(playerBody.position[1] > wallBody.position[1]){
                contact.enabled = false;
            }
        }
    }

    assignBeginCollisions(evt)
    {
        let bodyA = evt.bodyA,
            bodyB = evt.bodyB,
            playerBody = false,
            otherBody = false;
        // cases:
        // - player hit a player
        // - player hit an object (any type, animations, NPC, etc.)
        // - object hit object (bullets will hit objects)
        if(bodyA.playerId && bodyB.playerId){
            return this.playerHitPlayer(bodyA, bodyB);
        }
        if(!bodyA.playerId && !bodyB.playerId){
            return this.objectHitObject(bodyA, bodyB);
        }
        playerBody = bodyA.playerId ? bodyA : bodyB;
        otherBody = bodyA.playerId ? bodyB : bodyA;
        if(otherBody.isRoomObject){
            this.playerHitObject(playerBody, otherBody);
        }
        if(otherBody.changeScenePoint){
            this.playerHitChangePoint(playerBody, otherBody);
        }
        if(otherBody.isWall){
            this.playerHitWallBegin(playerBody, otherBody);
        }
    }

    assignEndCollisions(evt)
    {
        let bodyA = evt.bodyA,
            bodyB = evt.bodyB,
            playerBody = false,
            otherBody = false;
        if(!bodyA.playerId || !bodyB.playerId){
            playerBody = bodyA.playerId ? bodyA : bodyB;
            otherBody = bodyA.playerId ? bodyB : bodyA;
            if(otherBody.isWall){
                this.playerHitWall(playerBody, otherBody);
            }
            if(otherBody.isRoomObject){
                this.playerHitObjectEnd(playerBody, otherBody);
            }
        }
        // - player stops pushing a player:
        if(bodyA.playerId && bodyB.playerId){
            bodyA.velocity = [0, 0];
            bodyB.velocity = [0, 0];
        }
    }

    // eslint-disable-next-line no-unused-vars
    playerHitPlayer(bodyA, bodyB)
    {
        // @NOTE: we could run specific events when a player collides with another player.
        // Logger.info(['Hit player!', bodyA.playerId, bodyB.playerId]);
    }

    playerHitObject(playerBody, otherBody)
    {
        // if the player collides with something we need to restart the pathfinder if it was active:
        if(playerBody.autoMoving && playerBody.autoMoving.length > 1){
            let destPoint = playerBody.autoMoving.pop();
            playerBody.moveToPoint({column: destPoint[0], row: destPoint[1]});
        }
        // now the collision manager only run the object hit action:
        if(otherBody.roomObject){
            otherBody.roomObject.onHit({bodyA: playerBody, bodyB: otherBody, room: this.room});
        }
    }

    // eslint-disable-next-line no-unused-vars
    playerHitWallBegin(playerBody, wall)
    {
        // available to add specifics
    }

    // eslint-disable-next-line no-unused-vars
    playerHitWall(playerBody, wall)
    {
        // @NOTE: we can use wall.material to trigger an action over the player, like:
        // wall.material = lava > reduce player.hp in every step
        // if the player collides with something we need to restart the pathfinder if it was active:
        if(playerBody.autoMoving && 1 < playerBody.autoMoving.length){
            let destPoint = playerBody.autoMoving.pop();
            playerBody.moveToPoint({column: destPoint[0], row: destPoint[1]});
            return;
        }
        if(playerBody.world && !playerBody.world.applyGravity){
            playerBody.pStop = true;
            playerBody.velocity = [0, 0];
        }
    }

    // eslint-disable-next-line no-unused-vars
    playerHitObjectEnd(playerBody, object)
    {
        playerBody.pStop = true;
        playerBody.velocity = [0, 0];
    }

    playerHitChangePoint(playerBody, changePoint)
    {
        playerBody.resetAuto();
        // check if the player is not changing scenes already:
        let isChangingScene = sc.get(playerBody, 'isChangingScene', false);
        if(true === isChangingScene){
            // @NOTE: if the player is already changing scene do nothing.
            Logger.error('Player is busy for a change point: ' + playerBody.playerId);
            return false;
        }
        let playerPosition = {x: playerBody.position[0], y: playerBody.position[1]};
        this.room.state.positionPlayer(playerBody.playerId, playerPosition);
        let playerSchema = this.room.getPlayerFromState(playerBody.playerId);
        let changeScene = changePoint.changeScenePoint;
        let previousScene = playerSchema.state.scene;
        let changeData = {prev: previousScene, next: changeScene};
        playerBody.isChangingScene = true;
        let contactClient = this.room.getClientById(playerBody.playerId);
        // @NOTE: we do not need to change back the isChangingScene property back to false since in the new
        // scene a new body will be created with the value set to false by default.
        this.room.nextSceneInitialPosition(contactClient, changeData).catch((err) => {
            Logger.error('nextSceneInitialPosition error: '+err);
        });
    }

    objectHitObject(bodyA, bodyB)
    {
        // @TODO - BETA - Fix bullet hit bullet.
        let aPriority = sc.hasOwn(bodyA, 'hitPriority');
        let bPriority = sc.hasOwn(bodyB, 'hitPriority');
        let onHitData = {bodyA: bodyA, bodyB: bodyB, room: this.room};
        let priorityObject = (!aPriority && !bPriority) || (aPriority && (!bPriority || aPriority > bPriority))
            ? bodyA
            : bodyB;
        priorityObject.roomObject.onHit(onHitData);
    }

    getWallBody(evt)
    {
        let bodyA = evt.bodyA,
            bodyB = evt.bodyB;
        return bodyA && bodyA.isWall ? bodyA : (bodyB && bodyB.isWall ? bodyB : false);
    }

    getPlayerBody(evt)
    {
        let bodyA = evt.bodyA,
            bodyB = evt.bodyB;
        return bodyA && bodyA.playerId ? bodyA : (bodyB && bodyB.playerId ? bodyB : false);
    }

}

module.exports.CollisionsManager = CollisionsManager;
