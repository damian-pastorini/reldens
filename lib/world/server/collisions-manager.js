/**
 *
 * Reldens - CollisionsManager
 *
 */

const { Logger, ErrorManager, sc } = require('@reldens/utils');
const {PhysicalBody} = require("./physical-body");

class CollisionsManager
{

    constructor(room)
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
        // @NOTE: postBroadphase will be used to check pairs and test overlap instead of collision, for example, a spell
        // will overlap the player but not collide with it, if the spell collides with the player it will push it in
        // the opposite direction because the physics engine.
        this.room.roomWorld.on('postBroadphase', this.onWorldStepStart.bind(this));
        this.room.roomWorld.on('preSolve', this.beforeResolveCollision.bind(this));
        this.room.roomWorld.on('beginContact', this.onCollisionsBegin.bind(this));
        // @NOTE: "endContact"  will trigger when the contact ends and not when the collision step ends.
        this.room.roomWorld.on('endContact', this.onCollisionsEnd.bind(this));
    }

    onWorldStepStart(evt)
    {
        let { pairs } = evt;
        if(1 >= pairs.length){
            return;
        }
        let bulletAny = false;
        let bulletA = false;
        let bulletB = false;
        let player = false;
        let roomWall = false;
        for(let body of pairs){
            if(body.playerId && body.pStop){
                body.stopFull();
            }
            if(body.roomObject && body.pStop){
                body.stopFull();
            }
            if(body.playerId){
                player = body;
            }
            if(body.isWall){
                roomWall = body;
            }
            if(body.isBullet){
                bulletAny = body;
                if(bulletA && !bulletB){
                    bulletB = body;
                }
                if(bulletB && !bulletA){
                    bulletA = body;
                }
            }
        }
        if(this.room.roomWorld.bulletsStopOnPlayer && player && bulletAny){
            player.stopFull();
            this.stopAndRemoveBullet(bulletAny);
        }
        if(bulletAny && roomWall){
            this.stopAndRemoveBullet(bulletAny);
        }
        if(bulletA && bulletB){
            this.stopAndRemoveBullet(bulletA);
            this.stopAndRemoveBullet(bulletB);
        }
        this.removeIdleBullets();
    }

    stopAndRemoveBullet(bulletBody)
    {
        bulletBody.stopFull();
        this.room.roomWorld.removeBodies.push(bulletBody);
        if(bulletBody.bodyStateId){
            this.room.roomWorld.removeBulletsStateIds.push(bulletBody.bodyStateId);
        }
    }

    removeIdleBullets()
    {
        if(0 === this.room.roomWorld.removeBulletsStateIds.length){
            return;
        }
        for(let stateId of this.room.roomWorld.removeBulletsStateIds){
            // @TODO - BETA - Refactor and extract Colyseus into a driver.
            this.room.state.removeBody(stateId);
            this.room.roomWorld.removeBulletsStateIds.splice(
                this.room.roomWorld.removeBulletsStateIds.indexOf(stateId),
                1
            );
        }
    }

    beforeResolveCollision(evt)
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

    onCollisionsBegin(evt)
    {
        let bodyA = evt.bodyA,
            bodyB = evt.bodyB,
            playerBody = false,
            otherBody = false,
            roomObjectBody = false;
        // cases:
        // - player hit a player
        // - player hit an object (any type, animations, NPC, etc.)
        // - object hit object (bullets will hit objects)
        if(bodyA.playerId && bodyB.playerId){
            return this.playerHitPlayer(bodyA, bodyB);
        }
        if(bodyA.playerId){
            playerBody = bodyA;
            otherBody = bodyB;
        }
        if(bodyB.playerId){
            playerBody = bodyB;
            otherBody = bodyA;
        }
        if(playerBody && otherBody.isRoomObject){
            return this.playerHitObject(playerBody, otherBody);
        }
        if(playerBody && otherBody.changeScenePoint){
            return this.playerHitChangePoint(playerBody, otherBody);
        }
        if(playerBody && otherBody.isWall){
            return this.playerHitWallBegin(playerBody, otherBody);
        }
        if(bodyA.isRoomObject && bodyB.isRoomObject){
            return this.objectHitObject(bodyA, bodyB);
        }
        if(bodyA.isRoomObject){
            roomObjectBody = bodyA;
            otherBody = bodyB;
        }
        if(bodyB.isRoomObject){
            roomObjectBody = bodyB;
            otherBody = bodyA;
        }
        if(roomObjectBody){
            return this.objectHitWallBegin(roomObjectBody, otherBody);
        }
    }

    onCollisionsEnd(evt)
    {
        let playerBody = this.getPlayerBody(evt);
        let wallBody = this.getWallBody(evt);
        let objectBody = this.getObjectBody(evt);
        if(playerBody && wallBody){
            this.playerHitWall(playerBody, wallBody);
            return;
        }
        if(objectBody && wallBody){
            this.objectHitWall(objectBody, wallBody);
            return;
        }
        if(playerBody && objectBody){
            this.playerHitObjectEnd(playerBody, objectBody);
            return;
        }
        // - player stops pushing a player:
        if(evt.bodyA.playerId && evt.bodyB.playerId){
            evt.bodyA.stopFull();
            evt.bodyB.stopFull();
        }
    }

    playerHitPlayer(bodyA, bodyB)
    {
        // @NOTE: we could run specific events when a player collides with another player.
        // Logger.info(['Hit player!', bodyA.playerId, bodyB.playerId]);
        this.room.events.emit('reldens.playerHitPlayer', {bodyA, bodyB});
    }

    playerHitObject(playerBody, otherBody)
    {
        this.room.events.emit('reldens.startPlayerHitObject', {playerBody, otherBody});
        // if the player collides with something we need to restart the pathfinder if it was active:
        if(playerBody.autoMoving && 1 < playerBody.autoMoving.length){
            let destPoint = playerBody.autoMoving.pop();
            playerBody.moveToPoint({column: destPoint[0], row: destPoint[1]});
        }
        // now the collision manager only run the object hit action:
        if(otherBody.roomObject && sc.isFunction(otherBody.roomObject.onHit)){
            otherBody.roomObject.onHit({bodyA: playerBody, bodyB: otherBody, room: this.room});
        }
        this.room.events.emit('reldens.endPlayerHitObject', {playerBody, otherBody});
    }

    playerHitWallBegin(playerBody, wall)
    {
        // available to add specifics
        this.room.events.emit('reldens.playerHitWallBegin', {playerBody, wall});
    }

    playerHitWall(playerBody)
    {
        this.room.events.emit('reldens.startPlayerHitWall', {playerBody});
        // @NOTE: we can use wall.material to trigger an action over the player, like:
        // wall.material = lava > reduce player.hp in every step
        // if the player collides with something we need to restart the pathfinder if it was active:
        if(playerBody.autoMoving && 1 < playerBody.autoMoving.length){
            let destPoint = playerBody.autoMoving.pop();
            playerBody.moveToPoint({column: destPoint[0], row: destPoint[1]});
            return;
        }
        if(playerBody.world && !playerBody.world.applyGravity){
            playerBody.stopFull(true);
        }
        this.room.events.emit('reldens.endPlayerHitWall', {playerBody});
    }

    playerHitObjectEnd(playerBody)
    {
        let result = {resultValue: true};
        this.room.events.emit('reldens.playerHitObjectEnd', {playerBody, result});
        playerBody.stopFull(result.resultValue);
    }

    playerHitChangePoint(playerBody, changePoint)
    {
        this.room.events.emit('reldens.startPlayerHitChangePoint', {collisionsManager: this, playerBody, changePoint});
        playerBody.resetAuto();
        // check if the player is not changing scenes already:
        let isChangingScene = sc.get(playerBody, 'isChangingScene', false);
        if(isChangingScene){
            // @NOTE: if the player is already changing scene do nothing.
            Logger.info('Player is busy for a change point: '+playerBody.playerId);
            return false;
        }
        let playerSchema = this.room.playerBySessionIdFromState(playerBody.playerId);
        let contactClient = this.room.getClientById(playerBody.playerId);
        let isGuest = -1 !== contactClient.auth.email?.indexOf('@guest-reldens.com');
        if(!this.room.validateRoom(changePoint.changeScenePoint, isGuest, true)){
            Logger.info('Guest Player hit change point but is not allowed to the room: '+playerSchema.state.scene);
            this.room.events.emit('reldens.guestInvalidChangePoint', {
                collisionsManager: this,
                playerBody,
                changePoint,
                playerSchema,
                contactClient,
                isGuest
            });
            return false;
        }
        let playerPosition = {x: playerBody.position[0], y: playerBody.position[1]};
        this.room.state.positionPlayer(playerBody.playerId, playerPosition);
        let changeData = {prev: playerSchema.state.scene, next: changePoint.changeScenePoint};
        Logger.debug('Player "'+playerBody.playerId+'" hit change point.', changeData);
        playerBody.isChangingScene = true;
        // @NOTE: we do not need to change back the isChangingScene property back to false since in the new
        // scene a new body will be created with the value set to false by default.
        this.room.nextSceneInitialPosition(contactClient, changeData, playerBody).catch((error) => {
            Logger.error('There was an error while setting the next scene initial position.', error);
        });
        this.room.events.emit('reldens.endPlayerHitChangePoint', {
            collisionsManager: this,
            playerSchema,
            playerBody,
            changePoint,
            changeData
        });
    }

    objectHitObject(bodyA, bodyB)
    {
        this.room.events.emit('reldens.startObjectHitObject', {bodyA, bodyB});
        let aPriority = sc.hasOwn(bodyA, 'hitPriority');
        let bPriority = sc.hasOwn(bodyB, 'hitPriority');
        let onHitData = {bodyA: bodyA, bodyB: bodyB, room: this.room};
        let priorityObject = (!aPriority && !bPriority) || (aPriority && (!bPriority || aPriority > bPriority))
            ? bodyA
            : bodyB;
        if(priorityObject.roomObject && sc.isFunction(priorityObject.roomObject?.onHit)){
            priorityObject.roomObject.onHit(onHitData);
        }
        if(bodyA.isBullet && bodyA.roomObject){
            bodyA.roomObject.removeBullet(bodyA);
        }
        if(bodyB.isBullet && bodyB.roomObject){
            bodyB.roomObject.removeBullet(bodyB);
        }
        if(bodyA.isWall && bodyB.roomObject){
            this.resetObjectAutoMove(bodyB);
        }
        if(bodyB.isWall && bodyA.roomObject){
            this.resetObjectAutoMove(bodyA);
        }
        this.room.events.emit('reldens.endObjectHitObject', {bodyA, bodyB, priorityObject});
    }

    objectHitWallBegin(objectBody, wall)
    {
        // available to add specifics
        let event = {objectBody, wall, continue: true};
        this.room.events.emit('reldens.objectHitWallBegin', event);
        return event;
    }

    objectHitWall(objectBody)
    {
        this.room.events.emit('reldens.startObjectHitWall', {objectBody});
        // @NOTE: we can use wall.material to trigger an action over the player, like:
        // wall.material = lava > reduce player.hp in every step
        // if the player collides with something we need to restart the pathfinder if it was active:
        this.resetObjectAutoMove(objectBody);
        this.room.events.emit('reldens.endObjectHitWall', {objectBody});
    }

    resetObjectAutoMove(body)
    {
        if(!(body instanceof PhysicalBody)){
            return;
        }
        let lastPoint = false;
        if(sc.isArray(body.autoMoving) && 0 < body.autoMoving.length){
            lastPoint = body.autoMoving.pop();
        }
        if(body.world && !body.world.applyGravity){
            body.stopFull(true);
        }
        if(lastPoint){
            body.moveToPoint({column: lastPoint[0], row: lastPoint[1]});
        }
    }

    getWallBody(evt)
    {
        let {bodyA, bodyB} = evt;
        return bodyA && bodyA.isWall ? bodyA : (bodyB && bodyB.isWall ? bodyB : false);
    }

    getObjectBody(evt)
    {
        let {bodyA, bodyB} = evt;
        return bodyA && bodyA.isRoomObject ? bodyA : (bodyB && bodyB.isRoomObject ? bodyB : false);
    }

    getPlayerBody(evt)
    {
        let {bodyA, bodyB} = evt;
        return bodyA && bodyA.playerId ? bodyA : (bodyB && bodyB.playerId ? bodyB : false);
    }

}

module.exports.CollisionsManager = CollisionsManager;
