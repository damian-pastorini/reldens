/**
 *
 * Reldens - ObjectRandomMovement
 *
 * Moves an idle object body to a random walkable tile around its original tile, waiting a random delay between moves.
 * Only the targets reached with a path that never leaves the "maxTiles" area around the original tile are used, the
 * paths recalculated after a collision use the same area grid, and a body pushed outside that area walks back to its
 * original tile.
 * The body stays still while any player keeps a dialog with the object open.
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
        this.objectBody.movementAreaTiles = this.maxTiles;
        /** @type {number} */
        this.minDelay = sc.get(props, 'minDelay', 3000);
        /** @type {number} */
        this.maxDelay = sc.get(props, 'maxDelay', 8000);
        /** @type {number} */
        this.targetAttempts = sc.get(props, 'targetAttempts', 10);
        /** @type {Object<string, boolean>} */
        this.openDialogs = {};
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
        this.objectBody.autoMoving = targetTile.path;
        this.objectBody.autoMovingGrid = targetTile.grid;
        return this.objectBody.autoMoving;
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
        if(0 < Object.keys(this.openDialogs).length){
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
     * @returns {{column: number, row: number, path: Array<Array<number>>, grid: Object|false}|false}
     */
    findTargetTile()
    {
        let pathFinder = this.objectBody.getPathFinder();
        if(!pathFinder || !pathFinder.grid){
            return false;
        }
        this.objectBody.updateCurrentPoints();
        let currentTile = [this.objectBody.currentCol, this.objectBody.currentRow];
        if(!this.objectBody.isInsideMovementArea(currentTile)){
            return this.findPathToOriginalTile(pathFinder, currentTile);
        }
        let areaGrid = this.createMovementAreaGrid(pathFinder.grid);
        for(let attempt = 0; attempt < this.targetAttempts; attempt++){
            let column = this.objectBody.originalCol + sc.randomInteger(-this.maxTiles, this.maxTiles);
            let row = this.objectBody.originalRow + sc.randomInteger(-this.maxTiles, this.maxTiles);
            if(!this.isValidTarget(pathFinder.grid, column, row)){
                continue;
            }
            let path = pathFinder.finder.findPath(currentTile[0], currentTile[1], column, row, areaGrid.clone());
            if(0 < path.length){
                return {column, row, path, grid: areaGrid};
            }
        }
        return false;
    }

    /**
     * @param {Object} grid
     * @returns {Object}
     */
    createMovementAreaGrid(grid)
    {
        let areaGrid = grid.clone();
        let borderDistance = this.maxTiles + 1;
        for(let columnOffset = -borderDistance; columnOffset <= borderDistance; columnOffset++){
            this.blockBorderTilesInColumn(areaGrid, columnOffset, borderDistance);
        }
        return areaGrid;
    }

    /**
     * @param {Object} areaGrid
     * @param {number} columnOffset
     * @param {number} borderDistance
     */
    blockBorderTilesInColumn(areaGrid, columnOffset, borderDistance)
    {
        let column = this.objectBody.originalCol + columnOffset;
        let isBorderColumn = borderDistance === Math.abs(columnOffset);
        for(let rowOffset = -borderDistance; rowOffset <= borderDistance; rowOffset++){
            if(!isBorderColumn && borderDistance !== Math.abs(rowOffset)){
                continue;
            }
            let row = this.objectBody.originalRow + rowOffset;
            if(areaGrid.isInside(column, row)){
                areaGrid.setWalkableAt(column, row, false);
            }
        }
    }

    /**
     * @param {Object} pathFinder
     * @param {Array<number>} currentTile
     * @returns {{column: number, row: number, path: Array<Array<number>>, grid: Object|false}|false}
     */
    findPathToOriginalTile(pathFinder, currentTile)
    {
        let column = this.objectBody.originalCol;
        let row = this.objectBody.originalRow;
        let path = pathFinder.findPath(currentTile, [column, row]);
        if(!sc.isArray(path)){
            return false;
        }
        if(0 === path.length){
            return false;
        }
        return {column, row, path, grid: false};
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

    /**
     * @param {string} sessionId
     */
    pauseForInteraction(sessionId)
    {
        this.openDialogs[sessionId] = true;
        if(sc.isArray(this.objectBody.autoMoving) && 0 < this.objectBody.autoMoving.length){
            this.objectBody.stopAutoMoving();
        }
    }

    /**
     * @param {string} sessionId
     * @returns {boolean}
     */
    resumeAfterInteraction(sessionId)
    {
        if(!sc.hasOwn(this.openDialogs, sessionId)){
            return false;
        }
        delete this.openDialogs[sessionId];
        if(0 < Object.keys(this.openDialogs).length){
            return false;
        }
        if(this.movementTimer){
            this.scheduleNextMove();
        }
        return true;
    }

    stop()
    {
        clearTimeout(this.movementTimer);
        this.movementTimer = false;
    }

}

module.exports.ObjectRandomMovement = ObjectRandomMovement;
