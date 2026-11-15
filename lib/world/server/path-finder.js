/**
 *
 * Reldens - PathFinder
 *
 * Implements A* pathfinding algorithm for navigation on the game world grid. The grid keeps one column and one row past
 * the map border, both marked as not walkable, so no path, random join or random move ends outside the map. With
 * tryClosestPath on, an unreachable target is replaced by the first walkable tile around it (the tiles next to the
 * target, clamped to the map), starting with the one on the player side.
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { Grid, AStarFinder } = require('pathfinding');

class PathFinder
{

    constructor()
    {
        /** @type {AStarFinder} */
        this.finder = new AStarFinder();
        /** @type {Object|boolean} */
        this.world = false;
        /** @type {Grid|boolean} */
        this.grid = false;
        /** @type {Object<number, Object>} */
        this.bodies = {};
    }

    createGridFromMap()
    {
        // @NOTE: here we create an empty grid with the size of the current scene +1 (because the index starts at zero).
        // We mark the collisions on this grid when the layers and world contents are created.
        // See "P2world", line 83, method "setWalkableAt".
        let mapWidth = this.world.mapJson.width;
        let mapHeight = this.world.mapJson.height;
        this.grid = new Grid(mapWidth+1, mapHeight+1);
        for(let index = 0; index <= Math.max(mapWidth, mapHeight); index++){
            if(index <= mapHeight){
                this.grid.setWalkableAt(mapWidth, index, false);
            }
            if(index <= mapWidth){
                this.grid.setWalkableAt(index, mapHeight, false);
            }
        }
    }

    /**
     * @param {Object} body
     * @returns {void}
     */
    addBodyToProcess(body)
    {
        this.bodies[body.id] = body;
    }

    /**
     * @param {Array<number>} from
     * @param {Array<number>} to
     * @returns {Array<Array<number>>|boolean}
     */
    findPath(from, to)
    {
        if(this.world.onlyWalkable){
            let nodeTo = false;
            try {
                nodeTo = sc.hasOwn(this.grid, 'nodes') ? this.grid.getNodeAt(to[0], to[1]) : false;
            } catch (error) {
                Logger.debug('Node not found.', to, error.message);
            }
            if(!nodeTo || !nodeTo.walkable){
                return false;
            }
        }
        // we need a new grid clone for every path find.
        let grid = this.grid.clone();
        let path = this.finder.findPath(from[0], from[1], to[0], to[1], grid);
        if(!path.length && this.world.tryClosestPath){
            let newTo = [1, 1];
            if(from[0] < to[0]){
                newTo[0] = -1;
            }
            if(from[1] < to[1]){
                newTo[1] = -1;
            }
            // @TODO - BETA - Improve how to check the closest nodes.
            // check all closest nodes:
            let worldW = this.world.mapJson.width;
            let worldH = this.world.mapJson.height;
            let testPointA = Math.min(Math.max(to[0]+newTo[0], 0), worldW - 1);
            let testPointB = Math.min(Math.max(to[1]+newTo[1], 0), worldH - 1);
            let testPointC = Math.min(Math.max(to[0]-newTo[0], 0), worldW - 1);
            let testPointD = Math.min(Math.max(to[1]-newTo[1], 0), worldH - 1);
            let nodeTo = this.grid.getNodeAt(testPointA, to[1]);
            let candidates = [
                [to[0], testPointB],
                [testPointA, testPointB],
                [testPointC, to[1]],
                [to[0], testPointD],
                [testPointC, testPointD],
                [testPointC, testPointB],
                [testPointA, testPointD]
            ];
            if(nodeTo && !nodeTo.walkable){
                for(let [x, y] of candidates){
                    nodeTo = this.grid.getNodeAt(x, y);
                    if(nodeTo && nodeTo.walkable){
                        break;
                    }
                }
            }
            if(nodeTo && nodeTo.walkable){
                grid = this.grid.clone();
                path = this.finder.findPath(from[0], from[1], nodeTo.x, nodeTo.y, grid);
            }
        }
        return path;
    }

}

module.exports.PathFinder = PathFinder;
