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
            // expected on client disconnection:
            //Logger.debug('Undefined target object body.');
            return [];
        }
        let { currentCol, currentRow } = worldBody;
        if(!currentCol || !currentRow){
            worldBody.updateCurrentPoints();
            currentCol = worldBody.currentCol;
            currentRow = worldBody.currentRow;
            if(!currentCol || !currentRow){
                //Logger.debug('Missing currentCol and currentCol.', worldBody.currentCol, worldBody.currentRow);
                return [];
            }
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
                let x = currentCol + i;
                let y = currentRow + j;
                if(!pathFinder.grid.isInside(x, y)){
                    Logger.warning('Node outside grid.', {x, y});
                    continue;
                }
                let node = pathFinder.grid.getNodeAt(x, y);
                if(node && node.walkable){
                    nodes.push(WorldPositionCalculator.forNode(node, mapJson.tilewidth, mapJson.tileheight));
                }
            }
        }
        return nodes;
    }

    static fetchFirstWorldPosition(pathFinder, currentCol, currentRow)
    {
        if(!pathFinder.grid.isInside(currentCol, currentRow)){
            Logger.warning('Fetch first position, node outside grid.', {currentCol, currentRow});
            return false;
        }
        let firstNode = pathFinder.grid.getNodeAt(currentCol, currentRow);
        if(!firstNode){
            return false;
        }
        let mapJson = pathFinder.world.mapJson;
        return WorldPositionCalculator.forNode(firstNode, mapJson.tilewidth, mapJson.tileheight);
    }

}

module.exports.WorldWalkableNodesAroundProvider = WorldWalkableNodesAroundProvider;
