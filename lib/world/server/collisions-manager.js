/**
 *
 * Reldens - CollisionsManager
 *
 */

const { Logger, ErrorManager, sc } = require('@reldens/utils');

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
        let bullet = false;
        let player = false;
        for(let body of pairs){
            if(body.playerId && body.pStop){
                body.stopFull();
            }
            if(body.playerId){
                player = body;
            }
            if(body.isBullet){
                bullet = body;
            }
        }
        if(this.room.roomWorld.bulletsStopOnPlayer && player && bullet){
            player.stopFull();
            bullet.stopFull();
        }
        this.removeIdleBullets();
    }

    removeIdleBullets()
    {
        if(0 === this.room.roomWorld.removeBulletsStateIds.length){
            return;
        }
        let fixedStateIds = [...this.room.roomWorld.removeBulletsStateIds];
        for(let stateId of fixedStateIds){
            this.room.roomWorld.removeBulletsStateIds.splice(
                this.room.roomWorld.removeBulletsStateIds.indexOf(stateId),
                1
            );
            if(!this.room.state.bodies[stateId]){
                continue;
            }
            // @TODO - BETA - Refactor and extract Colyseus into a driver.
            this.room.state.bodies.delete(stateId);
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

    onCollisionsEnd(evt)
    {
        let playerBody = this.getPlayerBody(evt);
        let wallBody = this.getWallBody(evt);
        let objectBody = this.getObjectBody(evt);
        if(playerBody && wallBody){
            this.playerHitWall(playerBody, wallBody);
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
            Logger.info('Player is busy for a change point: ' + playerBody.playerId);
            return false;
        }
        let playerPosition = {x: playerBody.position[0], y: playerBody.position[1]};
        this.room.state.positionPlayer(playerBody.playerId, playerPosition);
        let playerSchema = this.room.playerBySessionIdFromState(playerBody.playerId);
        let changeData = {prev: playerSchema.state.scene, next: changePoint.changeScenePoint};
        playerBody.isChangingScene = true;
        let contactClient = this.room.getClientById(playerBody.playerId);
        // @NOTE: we do not need to change back the isChangingScene property back to false since in the new
        // scene a new body will be created with the value set to false by default.
        this.room.nextSceneInitialPosition(contactClient, changeData, playerBody).catch((err) => {
            Logger.error('There was an error while setting the next scene initial position.', err);
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
        if(!priorityObject.roomObject){
            return;
        }
        if(sc.isFunction(priorityObject.roomObject?.onHit)){
            priorityObject.roomObject.onHit(onHitData);
        }
        if(bodyA.isBullet){
            bodyA.roomObject.removeBullet(bodyA);
        }
        if(bodyB.isBullet){
            bodyB.roomObject.removeBullet(bodyB);
        }
        this.room.events.emit('reldens.endObjectHitObject', {bodyA, bodyB, priorityObject});
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
