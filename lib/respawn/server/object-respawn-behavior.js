/**
 *
 * Reldens - ObjectRespawnBehavior
 *
 * Handles the generic respawn lifecycle for any respawnable object: timer, tile repositioning, and state restoration.
 * Instantiated by RoomRespawn for every child instance created through the respawn system.
 *
 */

const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class ObjectRespawnBehavior
{

    /**
     * @param {Object} objInstance
     */
    constructor(objInstance)
    {
        this.objInstance = objInstance;
        this.respawnTimer = false;
        this.respawnStateTimer = false;
    }

    /**
     * @param {Function} callback
     * @param {number|false} delay
     * @returns {Promise<*>|number}
     */
    async scheduleWithTimer(callback, delay)
    {
        if(!delay){
            return callback();
        }
        return setTimeout(callback, delay);
    }

    /**
     * @param {Object} room
     * @returns {Promise<void>}
     */
    async execute(room)
    {
        this.respawnTimer = await this.scheduleWithTimer(async () => {
            await this.restore(room);
        }, this.objInstance.respawnTime);
        this.objInstance.respawnTimer = this.respawnTimer;
    }

    /**
     * @param {Object} room
     * @returns {Promise<boolean|void>}
     */
    async restore(room)
    {
        if(!this.objInstance.objectBody.world){
            Logger.warning('Object world is null on restore.', this.objInstance.uid);
            return;
        }
        if(sc.isObjectFunction(this.objInstance, 'onBeforeRestore')){
            await this.objInstance.onBeforeRestore(room);
        }
        let respawnArea = this.objInstance.objectBody.world.respawnAreas[this.objInstance.respawnLayer];
        delete respawnArea.usedTiles[this.objInstance.randomTileIndex];
        let randomTileResult = respawnArea.getRandomTile(this.objInstance.objectIndex);
        this.objInstance.randomTileIndex = randomTileResult.randomTileIndex;
        Object.assign(this.objInstance, randomTileResult.tileData);
        if(sc.isObjectFunction(this.objInstance, 'setupInteractionArea')){
            this.objInstance.setupInteractionArea();
        }
        this.objInstance.objectBody.position = [randomTileResult.tileData.x, randomTileResult.tileData.y];
        this.objInstance.objectBody.aabbNeedsUpdate = true;
        this.objInstance.objectBody.bodyState.x = randomTileResult.tileData.x;
        this.objInstance.objectBody.bodyState.y = randomTileResult.tileData.y;
        this.updateBodyPositionInitialData(room, randomTileResult.tileData.x, randomTileResult.tileData.y);
        let tilePosition = this.objInstance.objectBody.positionToTiles(
            randomTileResult.tileData.x,
            randomTileResult.tileData.y
        );
        this.objInstance.objectBody.originalCol = tilePosition.currentCol;
        this.objInstance.objectBody.originalRow = tilePosition.currentRow;
        if(sc.isObjectFunction(this.objInstance, 'onAfterRestore')){
            await this.objInstance.onAfterRestore(room);
        }
        this.respawnStateTimer = await this.scheduleWithTimer(() => {
            this.setActive(room);
        }, sc.get(this.objInstance, 'respawnStateTime', 0));
        this.objInstance.respawnStateTimer = this.respawnStateTimer;
    }

    /**
     * @param {Object} room
     */
    setActive(room)
    {
        try {
            this.objInstance.isActive = false;
            this.objInstance.objectBody.bodyState.inState = GameConst.STATUS.ACTIVE;
            if(sc.isObjectFunction(this.objInstance, 'onSetActive')){
                this.objInstance.onSetActive(room);
            }
        } catch {
            Logger.debug('Expected if user disconnects during respawn.');
        }
    }

    /**
     * @param {Object} room
     * @param {number} x
     * @param {number} y
     */
    updateBodyPositionInitialData(room, x, y)
    {
        if(!this.objInstance.updateInitialPosition){
            return;
        }
        if(!room.state.roomData || !room.state.roomData.objectsAnimationsData){
            return;
        }
        if(!room.state.roomData.objectsAnimationsData[this.objInstance.objectIndex]){
            return;
        }
        room.state.roomData.objectsAnimationsData[this.objInstance.objectIndex].x = x;
        room.state.roomData.objectsAnimationsData[this.objInstance.objectIndex].y = y;
        room.state.mapRoomData();
    }

}

module.exports.ObjectRespawnBehavior = ObjectRespawnBehavior;
