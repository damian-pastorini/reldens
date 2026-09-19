/**
 *
 * Reldens - EnemyAggression
 *
 * Manages the aggressive auto-aggro behavior: listens for players entering the respawn area and starts battle.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class EnemyAggression
{

    constructor(props)
    {
        this.isAggressive = props.isAggressive;
        this.events = props.events;
        this.uid = props.uid;
        this.eventUniqueKeyFn = props.eventUniqueKeyFn;
        this.getInBattlePlayers = props.getInBattlePlayers;
        this.getRespawnLayer = props.getRespawnLayer;
        this.getInteractionRadio = props.getInteractionRadio;
        this.getObjectBody = props.getObjectBody;
        this.startBattle = props.startBattle;
        this.postBroadPhaseListeners = [];
    }

    setup()
    {
        if(!this.isAggressive){
            return;
        }
        this.events.onWithKey(
            'reldens.sceneRoomOnCreate',
            this.attachBehaviorEvent.bind(this),
            this.eventUniqueKeyFn('attachAggressiveBehavior'),
            this.uid
        );
    }

    /**
     * @param {Object} room
     */
    attachBehaviorEvent(room)
    {
        let newListener = (event) => {
            if(0 === Object.keys(this.getInBattlePlayers()).length){
                this.waitForPlayers(event, room);
            }
        };
        this.postBroadPhaseListeners.push(newListener);
        room.roomWorld.on('postBroadphase', newListener);
    }

    /**
     * @param {Object} event
     * @param {Object} room
     */
    waitForPlayers(event, room)
    {
        if(0 === event.target.bodies.length){
            return;
        }
        for(let body of event.target.bodies){
            if(!body.playerId){
                continue;
            }
            if(!body.world){
                Logger.error('Body world is null.', body.id);
                continue;
            }
            if(!body.world.respawnAreas){
                continue;
            }
            let respawnArea = sc.get(body.world.respawnAreas, this.getRespawnLayer());
            if(!respawnArea){
                continue;
            }
            let tilePosition = body.positionToTiles(body.position[0], body.position[1]);
            let tileIndex = tilePosition.currentRow * body.worldWidth + tilePosition.currentCol;
            if(!sc.hasOwn(respawnArea.respawnTilesData, tileIndex)){
                continue;
            }
            if(!this.isPlayerOnInteractionArea(body.position)){
                continue;
            }
            this.startBattle({bodyA: body, room});
        }
    }

    /**
     * @param {Array<number>} playerPosition
     * @returns {boolean}
     */
    isPlayerOnInteractionArea(playerPosition)
    {
        if(!playerPosition[0] || !playerPosition[1]){
            return false;
        }
        if(0 === this.getInteractionRadio()){
            return true;
        }
        let objectBody = this.getObjectBody();
        if(!objectBody || !objectBody.position){
            return true;
        }
        return Math.sqrt(
            Math.pow(playerPosition[0] - objectBody.position[0], 2)
            + Math.pow(playerPosition[1] - objectBody.position[1], 2)
        ) <= this.getInteractionRadio();
    }

}

module.exports.EnemyAggression = EnemyAggression;
