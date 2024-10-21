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
        this.always = room.joinInRandomPlaceAlways;
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

    randomizeLocation(currentPlayer)
    {
        if(0 === this.walkableNodes.length){
            return false;
        }
        if(!this.always && this.playerPositionIsRoomStartingPoint(currentPlayer)){
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
        return currentPlayer.state.x === this.roomInitialPoint.x && currentPlayer.state.y === this.roomInitialPoint.y;
    }
}

module.exports.RandomPlayerState = RandomPlayerState;
