/**
 *
 * Reldens - CollisionsManager
 *
 */

const { PhysicalBody } = require('./physical-body');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

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
        // @TODO - BETA - Refactor to extract p2js as driver.
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
        // @NOTE: pairs can be a lot more than 2, these are not related to collisions pairs.
        if(1 >= pairs.length){
            return;
        }
        let bulletA = false;
        let bulletB = false;
        let player = false;
        let roomObject = false;
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
                if(bulletA && !bulletB){
                    bulletB = body;
                }
                if(!bulletA){
                    bulletA = body;
                }
                body.removeInvalidStateBulletBody();
            }
            if(body.isRoomObject && !body.isBullet){
                roomObject = body;
            }
        }
        if(this.room.roomWorld.bulletsStopOnPlayer && player && bulletA){
            player.stopFull();
        }
        this.removeIdleBullets();
    }

    removeIdleBullets()
    {
        if(0 === this.room.roomWorld.removeBulletsStateIds.length){
            return;
        }
        for(let stateId of this.room.roomWorld.removeBulletsStateIds){
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

    /**
     * Collision cases:
     * - player hit a player
     * - player hit an object (any type, animations, NPC, etc.)
     * - player hit change point
     * - player hit wall
     * - object hit object (bullets will hit objects)
     * - object hit wall
     * @param evt
     * @returns {{continue: boolean, wall, objectBody}|boolean|void}
     */
    onCollisionsBegin(evt)
    {
        let bodyA = evt.bodyA,
            bodyB = evt.bodyB,
            playerBody = false,
            otherBody = false,
            roomObjectBody = false;
        if(bodyA.playerId && bodyB.playerId){
            return this.playerHitPlayerBegin(bodyA, bodyB);
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
            return this.playerHitObjectBegin(playerBody, otherBody);
        }
        if(playerBody && otherBody.changeScenePoint){
            return this.playerHitChangePointBegin(playerBody, otherBody);
        }
        if(playerBody && otherBody.isWall){
            return this.playerHitWallBegin(playerBody, otherBody);
        }
        if(bodyA.isRoomObject && bodyB.isRoomObject){
            return this.objectHitObjectBegin(bodyA, bodyB);
        }
        if(bodyA.isRoomObject){
            roomObjectBody = bodyA;
            otherBody = bodyB;
        }
        if(bodyB.isRoomObject){
            roomObjectBody = bodyB;
            otherBody = bodyA;
        }
        if(roomObjectBody && otherBody.isWall){
            this.objectHitWallBegin(roomObjectBody, otherBody);
        }
    }

    onCollisionsEnd(evt)
    {
        let bodyA = evt.bodyA,
            bodyB = evt.bodyB,
            playerBody = false,
            otherBody = false,
            roomObjectBody = false;
        if(evt.bodyA.playerId && evt.bodyB.playerId){
            this.playerHitPlayerEnd(evt.bodyA, evt.bodyB);
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
            return this.playerHitObjectEnd(playerBody, otherBody);
        }
        if(playerBody && otherBody.isWall){
            return this.playerHitWallEnd(playerBody, otherBody);
        }
        if(bodyA.isRoomObject && bodyB.isRoomObject){
            this.objectHitObjectEnd(bodyA, bodyB);
        }
        if(bodyA.isRoomObject){
            roomObjectBody = bodyA;
            otherBody = bodyB;
        }
        if(bodyB.isRoomObject){
            roomObjectBody = bodyB;
            otherBody = bodyA;
        }
        if(roomObjectBody && otherBody.isWall){
            return this.objectHitWallEnd(roomObjectBody, otherBody);
        }
    }

    playerHitPlayerBegin(bodyA, bodyB)
    {
        // @NOTE: we could run specific events when a player collides with another player.
        // Logger.debug('Player hit player begin.', bodyA.playerId, bodyB.playerId);
        this.room.events.emit('reldens.playerHitPlayer', {bodyA, bodyB});
    }

    playerHitPlayerEnd(bodyA, bodyB)
    {
        // Logger.debug('Player hit player end.', bodyA.playerId, bodyB.playerId);
        // player stops pushing a player:
        bodyA.stopFull();
        bodyB.stopFull();
        this.room.events.emit('reldens.playerHitPlayerEnd', {bodyA, bodyB});
    }

    playerHitObjectBegin(playerBody, otherBody)
    {
        // Logger.debug('Player hit object being.', playerBody.playerId, otherBody.bodyState?.key);
        this.room.events.emit('reldens.startPlayerHitObjectBegin', {playerBody, otherBody});
        // if the player collides with something we need to restart the pathfinder if it was active:
        this.findAlternativePath(playerBody);
        // now the collision manager only run the object hit action:
        if(otherBody.roomObject && sc.isFunction(otherBody.roomObject.onHit)){
            otherBody.roomObject.onHit({bodyA: playerBody, bodyB: otherBody, room: this.room});
        }
        this.room.events.emit('reldens.endPlayerHitObjectBegin', {playerBody, otherBody});
    }

    playerHitObjectEnd(playerBody, otherBody)
    {
        // Logger.debug('Player hit object end.', playerBody.playerId, otherBody.bodyState?.key);
        let result = {stopFull: true, continue: true};
        this.room.events.emit('reldens.playerHitObjectEnd', {playerBody, result});
        if(!result.continue){
            return false;
        }
        playerBody.stopFull(result.stopFull);
    }

    playerHitWallBegin(playerBody, wallBody)
    {
        // Logger.debug('Player hit wall being.', playerBody.playerId);
        this.room.events.emit('reldens.playerHitWallBegin', {playerBody, wallBody});
    }

    playerHitWallEnd(playerBody, wallBody)
    {
        // Logger.debug('Player hit wall end.', playerBody.playerId);
        this.room.events.emit('reldens.startPlayerHitWallEnd', {playerBody, wallBody});
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
        this.room.events.emit('reldens.endPlayerHitWallEnd', {playerBody, wallBody});
    }

    playerHitChangePointBegin(playerBody, changePoint)
    {
        // Logger.debug('Player hit change point begin.', playerBody.playerId, changePoint.changeScenePoint);
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
        // Logger.debug('Player "'+playerBody.playerId+'" hit change point.', changeData);
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

    objectHitObjectBegin(bodyA, bodyB)
    {
        // Logger.debug('Object hit object begin.', bodyA.bodyState?.key, bodyB.bodyState?.key);
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
        if(bodyA.isBullet){
            bodyA.roomObject.removeBullet(bodyA);
        }
        if(bodyB.isBullet){
            bodyB.roomObject.removeBullet(bodyB);
        }
        this.findAlternativePath(bodyA);
        this.findAlternativePath(bodyB);
        this.room.events.emit('reldens.endObjectHitObject', {bodyA, bodyB, priorityObject});
    }

    objectHitObjectEnd(bodyA, bodyB)
    {
        // Logger.debug('Object hit object end.', bodyA.bodyState?.key, bodyB.bodyState?.key);
        this.bodyFullStop(bodyA);
        this.bodyFullStop(bodyB);
        this.room.events.emit('reldens.objectHitObjectEnd', {bodyA, bodyB});
    }

    objectHitWallBegin(objectBody, wall)
    {
        // Logger.debug('Object hit wall begin.', objectBody.bodyState?.key);
        let event = {objectBody, wall, continue: true};
        this.room.events.emit('reldens.objectHitWallBegin', event);
        if(!event.continue){
            return event;
        }
        if(objectBody.isBullet){
            objectBody.roomObject.removeBullet(objectBody);
        }
        return event;
    }

    objectHitWallEnd(objectBody)
    {
        // Logger.debug('Object hit wall end.', objectBody.bodyState?.key);
        this.room.events.emit('reldens.startObjectHitWall', {objectBody});
        // @NOTE: we can use wall.material to trigger an action over the player, like:
        // wall.material = lava > reduce player.hp in every step
        // if the player collides with something we need to restart the pathfinder if it was active:
        this.resetObjectAutoMove(objectBody);
        this.room.events.emit('reldens.endObjectHitWall', {objectBody});
    }

    bodyFullStop(body)
    {
        if(!body){
            return false;
        }
        let isBodyAMoving = body.autoMoving && 0 < body.autoMoving.length;
        if(!isBodyAMoving && !body.isBullet && body.isRoomObject && (body instanceof PhysicalBody)){
            body.stopFull(true);
        }
        if(body.isBullet){
            body.roomObject.removeBullet(body);
        }
    }

    findAlternativePath(body)
    {
        if(!body.autoMoving || 0 === body.autoMoving.length){
            return false;
        }
        // Logger.debug('Find alternative path for body "'+body.bodyLogKey()+'".');
        let currentPoint = body.autoMoving.shift();
        let destPoint = body.autoMoving.pop();
        body.autoMoving = body.getPathFinder().findPath(currentPoint, destPoint);
    }

    resetObjectAutoMove(body)
    {
        if(!(body instanceof PhysicalBody)){
            return;
        }
        if(!body.world){
            return;
        }
        let lastPoint = false;
        if(sc.isArray(body.autoMoving) && 0 < body.autoMoving.length){
            lastPoint = body.autoMoving.pop();
        }
        if(!lastPoint){
            return;
        }
        body.world.applyGravity ? body.stopFull(true) : body.stopX(true);
        body.autoMovingResetRetries++;
        if(body.autoMovingResetMaxRetries === body.autoMovingResetRetries){
            body.autoMovingResetRetries = 0;
            // Logger.debug('Reset object auto-move, returning to original point.');
            return body.moveToOriginalPoint();
        }
        /*
        Logger.debug(
            'Body "'+body.bodyLogKey()+'" auto-move to points: '+lastPoint[0]+' / '+lastPoint[1]+'.'
            +' Retries: '+body.autoMovingResetRetries+' / '+body.autoMovingResetMaxRetries
        );
        */
        body.moveToPoint({column: lastPoint[0], row: lastPoint[1]});
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
