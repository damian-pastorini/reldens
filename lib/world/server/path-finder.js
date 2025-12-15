/**
 *
 * Reldens - PathFinder
 *
 * Implements A* pathfinding algorithm for navigation on the game world grid.
 *
 */

const { sc } = require('@reldens/utils');
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
        this.grid = new Grid(this.world.mapJson.width+1, this.world.mapJson.height+1);
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
                // Logger.error('Node not found.');
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
            let testPointA = (to[0]+newTo[0] > worldW ? to[0]+newTo[0] : worldW);
            let testPointB = (to[1]+newTo[1] > worldH ? to[1]+newTo[1] : worldH);
            let testPointC = (to[0]-newTo[0] < 0 ? to[0]-newTo[0] : 0);
            let testPointD = (to[1]-newTo[1] < 0 ? to[1]-newTo[1] : 0);
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
