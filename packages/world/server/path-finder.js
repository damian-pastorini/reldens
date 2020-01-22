
const PF = require('pathfinding');
const { Grid, AStarFinder } = PF;

class PathFinder
{

    constructor()
    {
        this.finder = new AStarFinder();
        this.grid = false;
    }

    createGridFromMap(mapJson)
    {
        this.grid = new Grid(mapJson.width, mapJson.height);
    }

    findPath(from, to)
    {
        let grid = this.grid.clone();
        return this.finder.findPath(from[0], from[1], to[0], to[1], grid);
    }

}

module.exports.PathFinder = PathFinder;