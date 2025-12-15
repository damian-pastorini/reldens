/**
 *
 * Reldens - RandomPlayerState
 *
 * Handles random player spawn positioning within walkable room areas.
 *
 */

const { WorldPositionCalculator } = require('../../world/world-position-calculator');
const { RoomsConst } = require('../constants');

/**
 * @typedef {import('../../users/server/player').Player} Player
 * @typedef {import('pathfinding').Grid} Grid
 * @typedef {import('./scene').RoomScene} RoomScene
 */
class RandomPlayerState
{

    /**
     * @param {RoomScene} room
     */
    constructor(room)
    {
        /** @type {number} */
        this.tileWidth = room.roomWorld.mapJson.tilewidth;
        /** @type {number} */
        this.tileHeight = room.roomWorld.mapJson.tileheight;
        /** @type {Grid} */
        this.grid = room.roomWorld.pathFinder.grid;
        /** @type {boolean} */
        this.alwaysRandom = room.joinInRandomPlaceAlways;
        /** @type {boolean} */
        this.alwaysRandomGuest = room.joinInRandomPlaceGuestAlways;
        /** @type {number} */
        this.initialPositionThreshold = 50;
        /** @type {Object} */
        this.roomInitialPoint = {
            x: room.roomData.returnPointDefault[RoomsConst.RETURN_POINT_KEYS.X],
            y: room.roomData.returnPointDefault[RoomsConst.RETURN_POINT_KEYS.Y]
        };
        /** @type {Array<Object>} */
        this.walkableNodes = [];
        for(let y = 0; y < this.grid.nodes.length; y++){
            for(let x = 0; x < this.grid.nodes[y].length; x++){
                let node = this.grid.nodes[y][x];
                if(node.walkable){
                    this.walkableNodes.push(node);
                }
            }
        }
    }

    /**
     * @param {Player} currentPlayer
     * @param {boolean} isGuest
     * @returns {boolean|void}
     */
    randomizeLocation(currentPlayer, isGuest)
    {
        if(0 === this.walkableNodes.length){
            return false;
        }
        if(
            ((!this.alwaysRandom && !isGuest) || (!this.alwaysRandomGuest && isGuest))
            && this.playerPositionIsRoomStartingPoint(currentPlayer)
        ){
            return false;
        }
        let randomIndex = Math.floor(Math.random() * this.walkableNodes.length);
        let randomNode = this.walkableNodes[randomIndex];
        let position = WorldPositionCalculator.forNode(randomNode, this.tileWidth, this.tileHeight);
        if(!position){
            return false;
        }
        currentPlayer.state.x = position.x;
        currentPlayer.state.y = position.y;
    }

    /**
     * @param {Player} currentPlayer
     * @returns {boolean}
     */
    playerPositionIsRoomStartingPoint(currentPlayer)
    {
        let roomMaxX = this.roomInitialPoint.x + this.initialPositionThreshold;
        let roomMinX = this.roomInitialPoint.x - this.initialPositionThreshold;
        let roomMaxY = this.roomInitialPoint.y + this.initialPositionThreshold;
        let roomMinY = this.roomInitialPoint.y - this.initialPositionThreshold;
        return currentPlayer.state.x < roomMaxX
            && currentPlayer.state.y < roomMaxY
            && currentPlayer.state.x > roomMinX
            && currentPlayer.state.y > roomMinY;
    }
}

module.exports.RandomPlayerState = RandomPlayerState;
