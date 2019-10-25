/**
 *
 * Reldens - CollisionsManager
 *
 * This module handle the collisions and the related actions.
 *
 */

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
        if(!this.room.hasOwnProperty('roomWorld')){
            throw new Error('ERROR - Room world not found.');
        }
        this.room.roomWorld.on('endContact', this.assignCollisions.bind(this));
    }

    assignCollisions(evt)
    {
        let bodyA = evt.bodyA,
            bodyB = evt.bodyB,
            currentPlayerBody = false,
            otherBody = false;
        // cases:
        // - player hit a player
        // - player hit a wall
        // - player hit a NPC
        // - player hit an enemy
        if(bodyA.playerId && bodyB.playerId){
            this.playerHitPlayer(bodyA, bodyB);
        } else {
            currentPlayerBody = bodyA.playerId ? bodyA : bodyB;
            otherBody = bodyA.playerId ? bodyB : bodyA;
            if(otherBody.isWall){
                this.playerHitWall(currentPlayerBody, otherBody);
            }
            if(otherBody.isRoomObject){
                this.playerHitObject(currentPlayerBody, otherBody);
            }
            if(otherBody.isNpc){
                this.playerHitNpc(currentPlayerBody, otherBody);
            }
            if(otherBody.changeScenePoint){
                this.playerHitChangePoint(currentPlayerBody, otherBody);
            }
        }
    }

    playerHitPlayer(bodyA, bodyB)
    {
        console.log('hit player!', bodyA.playerId, bodyB.playerId);
    }

    playerHitNpc(currentPlayerBody, otherBody)
    {
        console.log('hit NPC', currentPlayerBody.playerId, otherBody.isNpc);
    }

    playerHitObject(currentPlayerBody, otherBody)
    {
        // console.log('hit Object', currentPlayerBody.playerId, otherBody);
        // now the collisions manager only run the object hit action:
        if(otherBody.roomObject){
            otherBody.roomObject.onHit({playerBody: currentPlayerBody, objectBody: otherBody, room: this.room});
        }
    }

    playerHitWall(player, wall)
    {
        // @NOTE: we can use wall.material to trigger an action over the player, like:
        // wall.material = lava > reduce player.hp in every step
        player.velocity = [0, 0];
    }

    playerHitChangePoint(player, changePoint)
    {
        let playerSchema = this.room.getPlayerFromState(player.playerId);
        if(player.hasOwnProperty('isChangingScene') && player.isChangingScene){
            // @NOTE: if the player is already changing scene do nothing.
            console.log('ERROR - Player is busy for a change point');
            return false;
        } else {
            let playerPosition = {x: player.position[0], y: player.position[1]};
            this.room.state.stopPlayer(player.playerId, playerPosition);
        }
        // scene change data:
        let changeScene = changePoint.changeScenePoint;
        let previousScene = playerSchema.state.scene;
        let changeData = {prev: previousScene, next: changeScene};
        // check if the player is not changing scenes already:
        if(player.isChangingScene === false){
            player.isChangingScene = true;
            let contactClient = this.room.getClientById(player.playerId);
            // @NOTE: we do not need to change back the isChangingScene property back to false since in the new
            // scene a new body will be created with the value set to false by default.
            this.room.nextSceneInitialPosition(contactClient, changeData).catch((err) => {
                console.log('ERROR - nextSceneInitialPosition error:', err);
            });
        }
    }

}

module.exports = CollisionsManager;
