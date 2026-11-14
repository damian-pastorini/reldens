/**
 *
 * Reldens - Change Points Steps
 *
 * The steps of the change points specs: the rooms, change points and return points read from the stored rows; the
 * change point tiles of a room that lead to another room; the return point a player arrives on when it comes from a
 * room (the next room return point of that previous room, or the one without a previous room), also stored as the
 * player state of the spec group to start the next login in that room; a walk through a list of
 * rooms by the first change point tile of each room; the round trips between two rooms that use every change point
 * tile of both ways (a stored change point on a blocked tile gets no body from the server, it is checked as blocked and
 * the change uses another change point to the same room); a player placed on the return point below a change point (a
 * town house door) walking up into the next room with the up key held;
 * the change uses another change point to the same room); and a room change through one change point tile
 * (RoomObjectsApi places the player on the body of that tile), checked on the client room and on the stored state the
 * server saves for the change (the room, position and direction of the arrival, read before any later move). Every
 * change waits for the player to leave the previous room, whose leave saves the state again after the client joined the
 * next room, so the next change never races that save (see ISSUE #331).
 *
 */

const { expect } = require('@playwright/test');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { RoomObjectsApi } = require('./room-objects-api');
const { RoomMovementApi } = require('./room-movement-api');
const { Navigation } = require('./navigation');
const { GameplayE2eStateApi } = require('./gameplay-e2e-state-api');
const { TimeConstants } = require('./time-constants');

class ChangePointsSteps
{

    static async loadTopology(gameConfig)
    {
        let roomsIds = {};
        for(let room of await E2eSeedAndRestoreApi.loadRows(gameConfig, 'rooms', {})){
            roomsIds[room.name] = Number(room.id);
        }
        return {
            roomsIds,
            changePoints: await E2eSeedAndRestoreApi.loadRows(gameConfig, 'roomsChangePoints', {}),
            returnPoints: await E2eSeedAndRestoreApi.loadRows(gameConfig, 'roomsReturnPoints', {})
        };
    }

    static fetchTiles(topology, roomName, nextRoomName)
    {
        return topology.changePoints.filter(
            row => topology.roomsIds[roomName] === Number(row.room_id)
                && topology.roomsIds[nextRoomName] === Number(row.next_room_id)
        ).map(row => String(row.tile_index));
    }

    static mapPosition(positionRow)
    {
        return {
            roomId: Number(positionRow.room_id),
            x: Number(positionRow.x),
            y: Number(positionRow.y),
            dir: positionRow.dir || positionRow.direction
        };
    }

    static fetchArrival(topology, nextRoomName, previousRoomName)
    {
        return ChangePointsSteps.mapPosition(topology.returnPoints.filter(
            row => topology.roomsIds[nextRoomName] === Number(row.room_id)
                && (null === row.from_room_id || topology.roomsIds[previousRoomName] === Number(row.from_room_id))
        ).sort(
            (rowA, rowB) => Number(null === rowA.from_room_id) - Number(null === rowB.from_room_id)
        ).shift());
    }

    static async walkUpIntoRoom(context, player, topology, roomName, nextRoomName)
    {
        let arrival = ChangePointsSteps.fetchArrival(topology, roomName, nextRoomName);
        let placement = await RoomMovementApi.placePlayer(context.gameConfig, roomName, player.playerName, {
            x: arrival.x,
            y: arrival.y
        });
        expect(placement.position, 'The player stands below the '+nextRoomName+' change point: '+placement.error).toBeTruthy();
        await player.page.keyboard.down('ArrowUp');
        await Navigation.waitForRoom(
            player.page,
            nextRoomName,
            TimeConstants.forLongRun(TimeConstants.SCENE_LOAD, context.longRun)
        );
        await player.page.keyboard.up('ArrowUp');
    }

    static async storeRoomArrival(context, topology, roomName)
    {
        let gameConfig = context.gameConfig;
        let arrival = ChangePointsSteps.fetchArrival(topology, roomName, '');
        await E2eSeedAndRestoreApi.updateWithPreserve(gameConfig, context.e2eGroup, 'playersState', {
            player_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'players', {name: gameConfig.e2ePlayerName})
        }, {room_id: arrival.roomId, x: arrival.x, y: arrival.y, dir: arrival.dir});
        return arrival;
    }

    static async expectOnDefaultReturnPoint(context, roomName)
    {
        let gameConfig = context.gameConfig;
        let defaultReturnPoint = (await E2eSeedAndRestoreApi.loadRows(gameConfig, 'roomsReturnPoints', {
            room_id: await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'rooms', {name: roomName}),
            is_default: 1
        })).shift();
        let expectedPosition = [Number(defaultReturnPoint.x), Number(defaultReturnPoint.y)];
        let placed = await GameplayE2eStateApi.fetchPlayer(gameConfig, roomName, gameConfig.e2ePlayerName);
        expect(
            [placed.x, placed.y, placed.dir],
            'The player stands on the default return point of the room'
        ).toEqual([...expectedPosition, defaultReturnPoint.direction]);
        await expect.poll(
            async () => context.page.evaluate(() => {
                let playerEngine = window.reldens.getCurrentPlayer();
                let ownSprite = playerEngine?.players?.[window.reldens.activeRoomEvents?.room?.sessionId];
                if(!ownSprite){
                    return false;
                }
                return [Math.round(ownSprite.x + playerEngine.leftOff), Math.round(ownSprite.y + playerEngine.topOff)];
            }),
            {message: 'The own sprite stands on the default return point', timeout: TimeConstants.SERVER_RESPONSE}
        ).toEqual(expectedPosition);
    }

    static buildWalk(topology, roomsNames)
    {
        let changes = [];
        for(let roomIndex = 1; roomIndex < roomsNames.length; roomIndex++){
            changes.push({
                roomName: roomsNames[roomIndex - 1],
                nextRoomName: roomsNames[roomIndex],
                tileIndex: ChangePointsSteps.fetchTiles(topology, roomsNames[roomIndex - 1], roomsNames[roomIndex])[0]
            });
        }
        return changes;
    }

    static buildRoundTrips(topology, roomName, nextRoomName)
    {
        let forwardTiles = ChangePointsSteps.fetchTiles(topology, roomName, nextRoomName);
        let backTiles = ChangePointsSteps.fetchTiles(topology, nextRoomName, roomName);
        expect(forwardTiles.length * backTiles.length, 'Change points between '+roomName+' and '+nextRoomName).toBeGreaterThan(0);
        return Array.from({length: Math.max(forwardTiles.length, backTiles.length)}).flatMap((value, tripIndex) => [
            {roomName, nextRoomName, tileIndex: forwardTiles[tripIndex % forwardTiles.length]},
            {roomName: nextRoomName, nextRoomName: roomName, tileIndex: backTiles[tripIndex % backTiles.length]}
        ]);
    }

    static async resolveTile(context, change)
    {
        let changePoints = (await RoomObjectsApi.fetchChangePoints(context.gameConfig, change.roomName)).changePoints;
        let storedPoint = changePoints.find(changePoint => change.tileIndex === changePoint.tileIndex);
        expect(storedPoint, 'The tile '+change.tileIndex+' is a stored change point of '+change.roomName).toBeTruthy();
        let tileIndex = change.tileIndex;
        if(!storedPoint.created){
            expect(storedPoint.walkable, 'The stored change point '+tileIndex+' without body is on a blocked tile').toBe(false);
            tileIndex = changePoints.find(
                changePoint => changePoint.created && change.nextRoomName === changePoint.nextRoomName
            ).tileIndex;
        }
        return tileIndex;
    }

    static async changeRoom(context, player, topology, change)
    {
        let placed = await RoomObjectsApi.placePlayerOnChangePoint(
            player.page,
            context.gameConfig,
            change.roomName,
            change.nextRoomName,
            await ChangePointsSteps.resolveTile(context, change)
        );
        expect(placed.position, 'The player is placed on the change point tile '+change.tileIndex+': '+placed.error)
            .toBeTruthy();
        await Navigation.waitForRoom(player.page, change.nextRoomName, TimeConstants.ROOM_TRANSITION);
        await expect.poll(
            async () => Boolean((await GameplayE2eStateApi.fetchPlayer(
                context.gameConfig,
                change.roomName,
                player.playerName
            )).error),
            {message: 'The player left '+change.roomName+' and its leave saved the state', timeout: TimeConstants.SERVER_RESPONSE}
        ).toBe(true);
        await expect.poll(
            async () => ChangePointsSteps.mapPosition(
                await E2eSeedAndRestoreApi.fetchPlayerState(context.gameConfig, player.playerName)
            ),
            {
                message: 'The tile '+change.tileIndex+' of '+change.roomName+' leads to the '+change.nextRoomName
                    +' return point of the previous room',
                timeout: TimeConstants.SERVER_RESPONSE
            }
        ).toEqual(ChangePointsSteps.fetchArrival(topology, change.nextRoomName, change.roomName));
    }

    static async runChanges(context, player, topology, changes)
    {
        for(let change of changes){
            await ChangePointsSteps.changeRoom(context, player, topology, change);
        }
    }

}

module.exports.ChangePointsSteps = ChangePointsSteps;
