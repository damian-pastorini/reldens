/**
 *
 * Reldens - WallsWorldBaseTest
 *
 * Base of the world bodies tests: builds a real P2world on a 6x6 map of 32 pixels tiles with a "collisions" layer
 * holding a wall of 3 tiles on the column 2 and a wall of 2 tiles on the row 5, and a "pathfinder" layer with one empty
 * tile (or the given wall tiles instead), with the given walls grouping options (createWorldOptions gives the same world options for a world created by
 * the code under test); and walks player bodies on it (keyboard directions or a pointer path)
 * for 50 fixed world steps, answering their rounded positions and velocities; a tracked walk runs the given steps with
 * its keyboard directions held (moved again on every step, like the scene movement interval of a held key) and also
 * answers the tile the walker ended on, the row and the rounded position of every step, the rounded position of the
 * tracked body on every step and the steps where the walker crossed that body: its center passed to the other side of
 * the body center on one axis while it was inside the body band on the other axis (a contact penetration that keeps
 * the sides, or a slide along a body face, is not a cross).
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
        this.aroundPathSteps = 250;
    }

    async createWorld(groupingConfig, wallTiles = this.wallTiles)
    {
        let world = new P2world(this.createWorldOptions(groupingConfig, wallTiles));
        clearInterval(world.worldDateTimeInterval);
        world.createLimits();
        await world.createWorldContent({});
        return world;
    }

    createWorldOptions(groupingConfig, wallTiles = this.wallTiles)
    {
        let config = Object.assign(new ConfigProcessor(), {
            avoidLog: true,
            server: {rooms: {world: groupingConfig}, players: {physicsBody: {}}},
            client: {players: {animations: {}}}
        });
        let room = {customData: {}};
        WorldConfig.mapWorldConfigValues(room, config);
        return {
            events: {emit: async () => true},
            roomId: 1,
            sceneName: 'walls-test',
            roomMap: 'walls-test',
            mapJson: {width: 6, height: 6, tilewidth: 32, tileheight: 32, layers: [
                {name: 'walls-collisions', data: this.mapTilesIndexes.map(i => -1 !== wallTiles.indexOf(i) ? 1 : 0)},
                {name: 'ground-pathfinder', data: this.mapTilesIndexes.map(i => this.emptyPathFinderTile === i ? 0 : 1)}
            ]},
            config,
            worldConfig: room.worldConfig
        };
    }

    walk(world, walkers)
    {
        let bodies = walkers.map((walker, walkerIndex) => this.createWalker(world, walker, walkerIndex));
        this.stepWorld(world);
        return bodies.map(body => this.removeWalker(world, body));
    }

    stepWorld(world, onStep = false, stepsCount = 50)
    {
        for(let stepIndex = 0; stepIndex < stepsCount; stepIndex++){
            world.step(world.timeStep);
            if(onStep){
                onStep(stepIndex);
            }
        }
    }

    walkTracked(world, walker, trackedBody, stepsCount)
    {
        let body = this.createWalker(world, walker, 0);
        let crossedSteps = [];
        let rows = [];
        let positions = [];
        let trackedPositions = [];
        let previousDelta = [body.position[0] - trackedBody.position[0], body.position[1] - trackedBody.position[1]];
        this.stepWorld(world, (stepIndex) => {
            this.moveDirections(body, walker.directions);
            rows.push(body.currentRow);
            positions.push([Math.round(body.position[0]), Math.round(body.position[1])]);
            trackedPositions.push([Math.round(trackedBody.position[0]), Math.round(trackedBody.position[1])]);
            let delta = [body.position[0] - trackedBody.position[0], body.position[1] - trackedBody.position[1]];
            if(this.isSideSwappedWhileOverlapping(previousDelta, delta, trackedBody)){
                crossedSteps.push(stepIndex);
            }
            previousDelta = delta;
        }, stepsCount);
        return Object.assign(
            {arrivedTile: [body.currentCol, body.currentRow], crossedSteps, rows, positions, trackedPositions},
            this.removeWalker(world, body)
        );
    }

    isSideSwappedWhileOverlapping(previousDelta, delta, trackedBody)
    {
        return (
            Math.abs(delta[1]) < trackedBody.shapes[0].height / 2
            && 0 > Math.sign(previousDelta[0]) * Math.sign(delta[0])
        ) || (
            Math.abs(delta[0]) < trackedBody.shapes[0].width / 2
            && 0 > Math.sign(previousDelta[1]) * Math.sign(delta[1])
        );
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
        this.moveDirections(body, walker.directions);
        if(walker.pointTo){
            body.moveToPoint(walker.pointTo);
        }
        return body;
    }

    moveDirections(body, directions)
    {
        for(let direction of directions){
            body.initMove(direction);
        }
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
