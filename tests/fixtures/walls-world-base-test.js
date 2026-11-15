/**
 *
 * Reldens - WallsWorldBaseTest
 *
 * Base of the world bodies tests: builds a real P2world on a 6x6 map of 32 pixels tiles with a "collisions" layer
 * holding a wall of 3 tiles on the column 2 and a wall of 2 tiles on the row 5, and a "pathfinder" layer with one empty
 * tile, with the given walls grouping options; and walks player bodies on it (keyboard directions or a pointer path)
 * for 50 fixed world steps, answering their rounded positions and velocities.
 *
 */

const { BaseTest } = require('../base-test');
const { P2world } = require('../../lib/world/server/p2world');
const { WorldConfig } = require('../../lib/rooms/server/world-config');
const { ConfigProcessor } = require('../../lib/config/processor');
const { GameConst } = require('../../lib/game/constants');

class WallsWorldBaseTest extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.mapTilesIndexes = [...Array(36).keys()];
        this.wallTiles = [8, 14, 20, 33, 34];
        this.emptyPathFinderTile = 30;
        this.walkerSize = 20;
        this.walkerRow = 80;
        this.columnWallEdges = [64, 96];
        this.worldWallInnerEdge = 1.5;
    }

    async createWorld(groupingConfig)
    {
        let config = Object.assign(new ConfigProcessor(), {
            avoidLog: true,
            server: {rooms: {world: groupingConfig}, players: {physicsBody: {}}},
            client: {players: {animations: {}}}
        });
        let room = {customData: {}};
        WorldConfig.mapWorldConfigValues(room, config);
        let world = new P2world({
            events: {emit: async () => true},
            roomId: 1,
            sceneName: 'walls-test',
            roomMap: 'walls-test',
            mapJson: {width: 6, height: 6, tilewidth: 32, tileheight: 32, layers: [
                {name: 'walls-collisions', data: this.mapTilesIndexes.map(i => -1 !== this.wallTiles.indexOf(i) ? 1 : 0)},
                {name: 'ground-pathfinder', data: this.mapTilesIndexes.map(i => this.emptyPathFinderTile === i ? 0 : 1)}
            ]},
            config,
            worldConfig: room.worldConfig
        });
        clearInterval(world.worldDateTimeInterval);
        world.createLimits();
        await world.createWorldContent({});
        return world;
    }

    walk(world, walkers)
    {
        let bodies = walkers.map((walker, walkerIndex) => this.createWalker(world, walker, walkerIndex));
        this.stepWorld(world);
        return bodies.map(body => this.removeWalker(world, body));
    }

    stepWorld(world)
    {
        for(let stepIndex = 0; stepIndex < 50; stepIndex++){
            world.step(world.timeStep);
        }
    }

    createWalker(world, walker, walkerIndex)
    {
        let body = world.createPlayerBody({
            id: 'walker-'+walkerIndex,
            width: this.walkerSize,
            height: this.walkerSize,
            speed: 0,
            bodyState: {x: walker.start[0], y: walker.start[1], dir: GameConst.DOWN}
        });
        for(let direction of walker.directions){
            body.initMove(direction);
        }
        if(walker.pointTo){
            body.moveToPoint(walker.pointTo);
        }
        return body;
    }

    removeWalker(world, body)
    {
        world.removeBody(body);
        return {
            position: [Math.round(body.position[0]), Math.round(body.position[1])],
            velocity: [body.velocity[0], body.velocity[1]]
        };
    }

}

module.exports.WallsWorldBaseTest = WallsWorldBaseTest;
