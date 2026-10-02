/**
 *
 * Reldens - ObjectRandomMovement
 *
 * Moves an idle object body to a random walkable tile around its original tile, waiting a random delay between moves.
 * A path that kept the body on the same tile between two moves is dropped, so a body blocked by a wall or by another
 * body gets a new random target instead of pushing against it forever.
 * Enabled per object with the "randomMovement" private param, for example: {"randomMovement":{"maxTiles":3}}.
 *
 */

const { GameConst } = require('../../../game/constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../../world/server/physical-body').PhysicalBody} PhysicalBody
 *
 * @typedef {Object} ObjectRandomMovementProps
 * @property {PhysicalBody} objectBody
 * @property {function(): Object} getInBattlePlayers
 * @property {number} [maxTiles]
 * @property {number} [minDelay]
 * @property {number} [maxDelay]
 * @property {number} [targetAttempts]
 * @property {number} [interactionPause]
 */
class ObjectRandomMovement
{

    /**
     * @param {ObjectRandomMovementProps} props
     */
    constructor(props)
    {
        /** @type {PhysicalBody} */
        this.objectBody = props.objectBody;
        /** @type {function(): Object} */
        this.getInBattlePlayers = props.getInBattlePlayers;
        /** @type {number} */
        this.maxTiles = sc.get(props, 'maxTiles', 3);
        /** @type {number} */
        this.minDelay = sc.get(props, 'minDelay', 3000);
        /** @type {number} */
        this.maxDelay = sc.get(props, 'maxDelay', 8000);
        /** @type {number} */
        this.targetAttempts = sc.get(props, 'targetAttempts', 10);
        /** @type {number} */
        this.interactionPause = sc.get(props, 'interactionPause', 15000);
        /** @type {number} */
        this.pausedUntil = 0;
        /** @type {ReturnType<typeof setTimeout>|false} */
        this.movementTimer = false;
        /** @type {string|false} */
        this.pendingPathTile = false;
    }

    scheduleNextMove()
    {
        this.stop();
        this.movementTimer = setTimeout(() => {
            this.moveAndScheduleNext();
        }, sc.randomInteger(this.minDelay, this.maxDelay));
    }

    moveAndScheduleNext()
    {
        if(!this.objectBody.world){
            this.movementTimer = false;
            return;
        }
        this.moveToRandomTile();
        this.scheduleNextMove();
    }

    /**
     * @returns {Array<Array<number>>|boolean}
     */
    moveToRandomTile()
    {
        this.stopBlockedPath();
        if(!this.canMove()){
            return false;
        }
        let targetTile = this.findTargetTile();
        if(!targetTile){
            return false;
        }
        return this.objectBody.moveToPoint(targetTile);
    }

    /**
     * @returns {boolean}
     */
    stopBlockedPath()
    {
        if(!sc.isArray(this.objectBody.autoMoving) || 0 === this.objectBody.autoMoving.length){
            this.pendingPathTile = false;
            return false;
        }
        if(0 < Object.keys(this.getInBattlePlayers()).length){
            this.pendingPathTile = false;
            return false;
        }
        this.objectBody.updateCurrentPoints();
        let currentTile = this.objectBody.currentCol+'/'+this.objectBody.currentRow;
        if(currentTile !== this.pendingPathTile){
            this.pendingPathTile = currentTile;
            return false;
        }
        this.pendingPathTile = false;
        this.objectBody.stopAutoMoving();
        return true;
    }

    /**
     * @returns {boolean}
     */
    canMove()
    {
        if(Date.now() < this.pausedUntil){
            return false;
        }
        if(sc.isArray(this.objectBody.autoMoving) && 0 < this.objectBody.autoMoving.length){
            return false;
        }
        if(GameConst.STATUS.ACTIVE !== this.objectBody.bodyState.inState){
            return false;
        }
        return 0 === Object.keys(this.getInBattlePlayers()).length;
    }

    /**
     * @returns {{column: number, row: number}|false}
     */
    findTargetTile()
    {
        let pathFinder = this.objectBody.getPathFinder();
        if(!pathFinder || !pathFinder.grid){
            return false;
        }
        this.objectBody.updateCurrentPoints();
        for(let attempt = 0; attempt < this.targetAttempts; attempt++){
            let column = this.objectBody.originalCol + sc.randomInteger(-this.maxTiles, this.maxTiles);
            let row = this.objectBody.originalRow + sc.randomInteger(-this.maxTiles, this.maxTiles);
            if(this.isValidTarget(pathFinder.grid, column, row)){
                return {column, row};
            }
        }
        return false;
    }

    /**
     * @param {Object} grid
     * @param {number} column
     * @param {number} row
     * @returns {boolean}
     */
    isValidTarget(grid, column, row)
    {
        if(column === this.objectBody.currentCol && row === this.objectBody.currentRow){
            return false;
        }
        return grid.isWalkableAt(column, row);
    }

    pauseForInteraction()
    {
        this.pausedUntil = Date.now() + this.interactionPause;
        if(sc.isArray(this.objectBody.autoMoving) && 0 < this.objectBody.autoMoving.length){
            this.objectBody.stopAutoMoving();
        }
    }

    stop()
    {
        clearTimeout(this.movementTimer);
        this.movementTimer = false;
    }

}

module.exports.ObjectRandomMovement = ObjectRandomMovement;
