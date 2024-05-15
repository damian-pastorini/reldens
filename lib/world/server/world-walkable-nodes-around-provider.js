/**
 *
 * Reldens - WorldWalkableNodesAroundProvider
 *
 */

const { Logger } = require('@reldens/utils');

class WorldWalkableNodesAroundProvider
{

    static generateWalkableNodesAround(worldBody)
    {
        if(!worldBody){
            Logger.critical('Undefined target object body.');
            return [];
        }
        let { currentCol, currentRow } = worldBody;
        if(!currentCol || !currentRow){
            return [];
        }
        let pathfinder = worldBody.getPathFinder();
        let nodes = [];
        let firstWorldPosition = this.fetchFirstWorldPosition(pathfinder, currentCol, currentRow);
        if(firstWorldPosition){
            nodes.push(firstWorldPosition);
        }
        for(let i = -1; i <= 1; i++){
            for(let j = -1; j <= 1; j++){
                let node = pathfinder.grid.getNodeAt(currentCol + i, currentRow + j);
                if(node && node.walkable){
                    nodes.push(this.worldPositionForNode(node, pathfinder.world.mapJson));
                }
            }
        }
        return nodes;
    }

    static fetchFirstWorldPosition(pathfinder, currentCol, currentRow)
    {
        let firstNode = pathfinder.grid.getNodeAt(currentCol, currentRow);
        if(!firstNode){
            return false;
        }
        return this.worldPositionForNode(firstNode, pathfinder.world.mapJson);
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
