/**
 *
 * Reldens - Room Anchored Placement
 *
 * Server side e2e placement of a body next to an anchor body (an enemy or a player next to a player): the placed body
 * goes on the first walkable attack position around the anchor where it does not overlap any colliding body (the
 * anchor included), tried in a fixed order (40px right, left, down and up, then the 40px diagonals, then 32px right,
 * left, down and up, rounded to whole pixels as the synced state), so a player surrounded by bodies on its sides (the
 * mining rocks cluster) still gets a position; when no position fits around the anchor where it stands, the anchor
 * itself is moved to the closest free walkable tile that has one (closest distance first, then the lowest row and
 * column), so the same room always gives the same pair and a placement never fails because of where an earlier step
 * left the anchor. The player placement next to another player (place-player endpoint) keeps them out of contact and
 * inside the short attack range, so a player versus player hit never pushes the target.
 *
 */

const { RoomObjectsState } = require('./room-objects-state');
const { Logger, sc } = require('@reldens/utils');

class RoomAnchoredPlacement
{

    static ATTACK_DISTANCE = 40;
    static MAX_ANCHOR_TILES_RADIUS = 12;
    static ATTACK_OFFSETS = [
        {x: 1, y: 0}, {x: -1, y: 0}, {x: 0, y: 1}, {x: 0, y: -1},
        {x: 0.71, y: 0.71}, {x: -0.71, y: 0.71}, {x: 0.71, y: -0.71}, {x: -0.71, y: -0.71},
        {x: 0.8, y: 0}, {x: -0.8, y: 0}, {x: 0, y: 0.8}, {x: 0, y: -0.8}
    ];

    static offsetBounds(bounds, offsetX, offsetY)
    {
        return {
            left: bounds.lowerBound[0] + offsetX,
            right: bounds.upperBound[0] + offsetX,
            top: bounds.lowerBound[1] + offsetY,
            bottom: bounds.upperBound[1] + offsetY
        };
    }

    static mapBodyRect(body, center)
    {
        return RoomAnchoredPlacement.offsetBounds(
            body.getAABB(),
            center.x - body.position[0],
            center.y - body.position[1]
        );
    }

    static fetchOtherBodiesBounds(room, ignoredBodies)
    {
        return room.roomWorld.bodies.filter(
            body => !ignoredBodies.includes(body) && false !== body.collisionResponse
        ).map(body => body.getAABB());
    }

    static isFreeAttackTile(room, anchorBody, placedBody, position, bodiesBounds)
    {
        let grid = room.roomWorld.pathFinder.grid;
        let tilePosition = anchorBody.positionToTiles(position.x, position.y);
        return grid.isInside(tilePosition.currentCol, tilePosition.currentRow)
            && grid.isWalkableAt(tilePosition.currentCol, tilePosition.currentRow)
            && !RoomObjectsState.isRectOverBodies(
                RoomAnchoredPlacement.mapBodyRect(placedBody, position),
                bodiesBounds
            );
    }

    static findAttackPosition(room, anchorBody, placedBody, anchorCenter)
    {
        let anchorRect = RoomAnchoredPlacement.mapBodyRect(anchorBody, anchorCenter);
        let bodiesBounds = [
            {lowerBound: [anchorRect.left, anchorRect.top], upperBound: [anchorRect.right, anchorRect.bottom]},
            ...RoomAnchoredPlacement.fetchOtherBodiesBounds(room, [anchorBody, placedBody])
        ];
        return [...RoomAnchoredPlacement.ATTACK_OFFSETS.map(offset => ({
            x: Math.round(anchorCenter.x + offset.x * RoomAnchoredPlacement.ATTACK_DISTANCE),
            y: Math.round(anchorCenter.y + offset.y * RoomAnchoredPlacement.ATTACK_DISTANCE)
        })).filter(
            position => RoomAnchoredPlacement.isFreeAttackTile(room, anchorBody, placedBody, position, bodiesBounds)
        ), false].shift();
    }

    static appendAnchorTiles(anchorTiles, anchorTile, column)
    {
        let radius = RoomAnchoredPlacement.MAX_ANCHOR_TILES_RADIUS;
        for(let row = anchorTile.currentRow - radius; row <= anchorTile.currentRow + radius; row++){
            anchorTiles.push({
                column,
                row,
                distance: Math.hypot(column - anchorTile.currentCol, row - anchorTile.currentRow)
            });
        }
    }

    static fetchAnchorPositions(room, anchorBody, placedBody)
    {
        let mapJson = room.roomWorld.mapJson;
        let grid = room.roomWorld.pathFinder.grid;
        let anchorTile = anchorBody.positionToTiles(anchorBody.position[0], anchorBody.position[1]);
        let radius = RoomAnchoredPlacement.MAX_ANCHOR_TILES_RADIUS;
        let anchorTiles = [];
        for(let column = anchorTile.currentCol - radius; column <= anchorTile.currentCol + radius; column++){
            RoomAnchoredPlacement.appendAnchorTiles(anchorTiles, anchorTile, column);
        }
        let otherBodiesBounds = RoomAnchoredPlacement.fetchOtherBodiesBounds(room, [anchorBody, placedBody]);
        return anchorTiles.sort(
            (tileA, tileB) => tileA.distance - tileB.distance || tileA.row - tileB.row || tileA.column - tileB.column
        ).filter(
            tile => grid.isInside(tile.column, tile.row) && grid.isWalkableAt(tile.column, tile.row)
        ).map(tile => ({
            x: tile.column * mapJson.tilewidth + mapJson.tilewidth / 2,
            y: tile.row * mapJson.tileheight + mapJson.tileheight / 2
        })).filter(
            anchorPosition => !RoomObjectsState.isRectOverBodies(
                RoomAnchoredPlacement.mapBodyRect(anchorBody, anchorPosition),
                otherBodiesBounds
            )
        );
    }

    static findAnchoredPlacement(room, anchorBody, placedBody)
    {
        let currentCenter = {x: anchorBody.position[0], y: anchorBody.position[1]};
        let currentPosition = RoomAnchoredPlacement.findAttackPosition(room, anchorBody, placedBody, currentCenter);
        let placement = currentPosition ? {position: currentPosition, anchorPosition: false} : false;
        let anchorPositions = placement ? [] : RoomAnchoredPlacement.fetchAnchorPositions(room, anchorBody, placedBody);
        for(let anchorPosition of anchorPositions){
            let position = RoomAnchoredPlacement.findAttackPosition(room, anchorBody, placedBody, anchorPosition);
            if(position){
                placement = {position, anchorPosition};
                break;
            }
        }
        return placement;
    }

    static placePlayerBody(playerBody, position)
    {
        playerBody.resetAuto();
        playerBody.stopFull();
        RoomObjectsState.placeObjectBody(playerBody, position);
    }

    static placePlayerNearPlayer(room, playerName, nearPlayerName)
    {
        let playerSchema = RoomObjectsState.findPlayerByName(room, playerName);
        let nearPlayerSchema = RoomObjectsState.findPlayerByName(room, nearPlayerName);
        if(!playerSchema || !nearPlayerSchema){
            return {error: 'Player '+playerName+' or '+nearPlayerName+' not found in room '+room.roomName+'.'};
        }
        let placement = RoomAnchoredPlacement.findAnchoredPlacement(
            room,
            nearPlayerSchema.physicalBody,
            playerSchema.physicalBody
        );
        if(!placement){
            return {error: 'No free tile pair around the player '+nearPlayerName+' in '+room.roomName+'.'};
        }
        if(placement.anchorPosition){
            RoomAnchoredPlacement.placePlayerBody(nearPlayerSchema.physicalBody, placement.anchorPosition);
        }
        RoomAnchoredPlacement.placePlayerBody(playerSchema.physicalBody, placement.position);
        return {position: placement.position, nearPosition: placement.anchorPosition};
    }

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/room-objects/place-player', async (request, response) => {
            await RoomObjectsState.respondForRoom(
                serverManager,
                sc.get(request.body, 'roomName', ''),
                response,
                async (room) => RoomAnchoredPlacement.placePlayerNearPlayer(
                    room,
                    sc.get(request.body, 'playerName', ''),
                    sc.get(request.body, 'nearPlayerName', '')
                )
            );
        });
        Logger.info('[room-anchored-placement] Anchored placement endpoints registered.');
    }

}

module.exports.RoomAnchoredPlacement = RoomAnchoredPlacement;
