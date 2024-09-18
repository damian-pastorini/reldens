/**
 *
 * Reldens - WorldWalkableNodesAroundProvider
 *
 */

const { WorldPositionCalculator } = require('../world-position-calculator');
const { Logger } = require('@reldens/utils');

class WorldWalkableNodesAroundProvider
{

    static generateWalkableNodesAround(worldBody, pathFinder)
    {
        if(!worldBody){
            Logger.critical('Undefined target object body.');
            return [];
        }
        let { currentCol, currentRow } = worldBody;
        if(!currentCol || !currentRow){
            return [];
        }
        if(!pathFinder){
            pathFinder = worldBody.getPathFinder();
        }
        if(!pathFinder){
            Logger.warning('Pathfinder not found.', worldBody);
            return [];
        }
        let nodes = [];
        let firstWorldPosition = this.fetchFirstWorldPosition(pathFinder, currentCol, currentRow);
        if(firstWorldPosition){
            nodes.push(firstWorldPosition);
        }
        // @TODO - BETA - Check pathFinder.grid.getNeighbors method.
        let mapJson = pathFinder.world.mapJson;
        for(let i = -1; i <= 1; i++){
            for(let j = -1; j <= 1; j++){
                let node = pathFinder.grid.getNodeAt(currentCol + i, currentRow + j);
                if(node && node.walkable){
                    nodes.push(WorldPositionCalculator.forNode(node, mapJson.tilewidth, mapJson.tileheight));
                }
            }
        }
        return nodes;
    }

    static fetchFirstWorldPosition(pathFinder, currentCol, currentRow)
    {
        let firstNode = pathFinder.grid.getNodeAt(currentCol, currentRow);
        if(!firstNode){
            return false;
        }
        let mapJson = pathFinder.world.mapJson;
        return WorldPositionCalculator.forNode(firstNode, mapJson.tilewidth, mapJson.tileheight);
    }

}

module.exports.WorldWalkableNodesAroundProvider = WorldWalkableNodesAroundProvider;
