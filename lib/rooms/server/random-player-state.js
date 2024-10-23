/**
 *
 * Reldens - RandomPlayerState
 *
 */

const { WorldPositionCalculator } = require('../../world/world-position-calculator');
const { RoomsConst } = require('../constants');

class RandomPlayerState
{

    constructor(room)
    {
        this.tileWidth = room.roomWorld.mapJson.tilewidth;
        this.tileHeight = room.roomWorld.mapJson.tileheight;
        this.grid = room.roomWorld.pathFinder.grid;
        this.alwaysRandom = room.joinInRandomPlaceAlways;
        this.alwaysRandomGuest = room.joinInRandomPlaceGuestAlways;
        this.initialPositionThreshold = 50;
        this.roomInitialPoint = {
            x: room.roomData.returnPointDefault[RoomsConst.RETURN_POINT_KEYS.X],
            y: room.roomData.returnPointDefault[RoomsConst.RETURN_POINT_KEYS.Y]
        };
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
