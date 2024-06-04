/**
 *
 * Reldens - WorldWalkableNodesAroundProvider
 *
 */

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
        for(let i = -1; i <= 1; i++){
            for(let j = -1; j <= 1; j++){
                let node = pathFinder.grid.getNodeAt(currentCol + i, currentRow + j);
                if(node && node.walkable){
                    nodes.push(this.worldPositionForNode(node, pathFinder.world.mapJson));
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
        return this.worldPositionForNode(firstNode, pathFinder.world.mapJson);
    }

    static worldPositionForNode(node, mapJson)
    {
        let tileW = mapJson.tilewidth,
            tileH = mapJson.tileheight,
            halfTileW = tileW / 2,
            halfTileH = tileH / 2;
        return {
            x: node.x * tileW + halfTileW,
            y: node.y * tileH + halfTileH
        };
    }

}

module.exports.WorldWalkableNodesAroundProvider = WorldWalkableNodesAroundProvider;
