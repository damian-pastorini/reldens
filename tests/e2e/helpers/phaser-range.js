/**
 *
 * Reldens - Phaser Range Helper
 *
 * Resolves world positions and waits for the player to be within attack range of a target.
 *
 */

const { Phaser } = require('./phaser');

class PhaserRange
{
    static STAND_STILL_CHECK_MS = 300;

    static async getObjectWorldPos(page, matchProp, matchValue, statusKey)
    {
        return page.evaluate((args) => {
            let scene = window.reldens.getActiveScene();
            if(!scene || !scene.objectsAnimations) {
                return null;
            }
            let found = Object.values(scene.objectsAnimations).find(
                anim => anim[args.prop] === args.value && anim.sceneSprite && anim.sceneSprite[args.statusKey]
            );
            if(!found) {
                return null;
            }
            return { x: found.sceneSprite.x, y: found.sceneSprite.y };
        }, { prop: matchProp, value: matchValue, statusKey });
    }

    static async getObjectWorldPosByAssetKey(page, assetKey)
    {
        return PhaserRange.getObjectWorldPos(page, 'asset_key', assetKey, 'active');
    }

    static async getObjectWorldPosByType(page, type)
    {
        return PhaserRange.getObjectWorldPos(page, 'type', type, 'visible');
    }

    static async getStateBodiesPositions(page, bodiesKeys)
    {
        return page.evaluate((keys) => {
            let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            let positions = {};
            for(let key of keys) {
                let body = room && room.state && room.state.bodies ? room.state.bodies.get(key) : null;
                positions[key] = body ? { x: body.x, y: body.y } : null;
            }
            return positions;
        }, bodiesKeys);
    }

    static async getObjectsSpritePositions(page, objectsKeys)
    {
        return page.evaluate((keys) => {
            let objectsAnimations = window.reldens.getActiveScene().objectsAnimations;
            let positions = {};
            for(let key of keys) {
                let sprite = objectsAnimations[key] ? objectsAnimations[key].sceneSprite : null;
                positions[key] = sprite ? { x: sprite.x, y: sprite.y } : null;
            }
            return positions;
        }, objectsKeys);
    }

    static async collectPositionRanges(page, keys, samples, intervalMs, positionsReader)
    {
        let ranges = {};
        for(let sample = 0; sample < samples; sample++){
            PhaserRange.addPositionsToRanges(ranges, await positionsReader(page, keys));
            await page.waitForTimeout(intervalMs);
        }
        return ranges;
    }

    static addPositionsToRanges(ranges, positions)
    {
        for(let key of Object.keys(positions)){
            let position = positions[key];
            if(!position){
                continue;
            }
            if(!ranges[key]){
                ranges[key] = {minX: position.x, maxX: position.x, minY: position.y, maxY: position.y};
                continue;
            }
            ranges[key].minX = Math.min(ranges[key].minX, position.x);
            ranges[key].maxX = Math.max(ranges[key].maxX, position.x);
            ranges[key].minY = Math.min(ranges[key].minY, position.y);
            ranges[key].maxY = Math.max(ranges[key].maxY, position.y);
        }
    }

    static summarizeMovement(ranges, maxTilesByKey, tileSize)
    {
        let keys = Object.keys(maxTilesByKey);
        let spreads = {};
        for(let key of keys.filter(key => ranges[key])){
            spreads[key] = Math.max(ranges[key].maxX - ranges[key].minX, ranges[key].maxY - ranges[key].minY);
        }
        return {
            notSynced: keys.filter(key => !ranges[key]),
            wandered: Object.keys(spreads).filter(key => 0 < spreads[key]),
            outOfArea: Object.keys(spreads).filter(key => (2 * maxTilesByKey[key] + 1) * tileSize < spreads[key])
        };
    }

    static approachOffsets(range, tileSize, playerOffsetX, playerOffsetY)
    {
        let maxDistance = Math.max(0, range - tileSize);
        let maxTiles = Math.floor(maxDistance / tileSize);
        let surroundingOffsets = [];
        for(let column = -maxTiles; column <= maxTiles; column++){
            PhaserRange.appendColumnOffsets(surroundingOffsets, column, maxTiles, maxDistance, tileSize);
        }
        let distanceToPlayer = (offset) => Math.hypot(
            offset.column * tileSize - playerOffsetX,
            offset.row * tileSize - playerOffsetY
        );
        surroundingOffsets.sort((offsetA, offsetB) => distanceToPlayer(offsetA) - distanceToPlayer(offsetB));
        return [{column: 0, row: 0}, ...surroundingOffsets];
    }

    static async filterWalkableOffsets(page, targetX, targetY, offsets, tileSize)
    {
        return page.evaluate((args) => {
            let map = window.reldens.getActiveScene().map;
            return args.offsets.filter((offset) => !map.layers.some((layer) => {
                let tile = map.getTileAt(args.column + offset.column, args.row + offset.row, true, layer.name);
                if(!tile){
                    return true;
                }
                if(-1 !== layer.name.indexOf('collisions') || -1 !== layer.name.indexOf('change-points')){
                    return -1 < tile.index;
                }
                return -1 !== layer.name.indexOf('pathfinder') && -1 === tile.index;
            }));
        }, {column: Math.floor(targetX / tileSize), row: Math.floor(targetY / tileSize), offsets});
    }

    static appendColumnOffsets(surroundingOffsets, column, maxTiles, maxDistance, tileSize)
    {
        for(let row = -maxTiles; row <= maxTiles; row++){
            let isTargetTile = 0 === column && 0 === row;
            if(!isTargetTile && Math.hypot(column, row) * tileSize <= maxDistance){
                surroundingOffsets.push({column, row});
            }
        }
    }

    static async waitForPlayerToStandStill(page, timeout)
    {
        let maxChecks = Math.ceil(timeout / PhaserRange.STAND_STILL_CHECK_MS);
        let lastPosition = await Phaser.getPlayerServerPosition(page);
        for(let check = 0; check < maxChecks; check++){
            await page.waitForTimeout(PhaserRange.STAND_STILL_CHECK_MS);
            let position = await Phaser.getPlayerServerPosition(page);
            let stoodStill = null !== position
                && null !== lastPosition
                && position.x === lastPosition.x
                && position.y === lastPosition.y;
            if(stoodStill){
                return true;
            }
            lastPosition = position;
        }
        return false;
    }

    static async waitForPlayerWithinRange(page, targetWorldPos, range, timeout)
    {
        await page.waitForFunction((args) => {
            let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!room || !room.state || !room.state.players) {
                return false;
            }
            let playerState = window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
            if(!playerState) {
                return false;
            }
            return Math.hypot(playerState.state.x - args.targetX, playerState.state.y - args.targetY) <= args.range;
        }, { targetX: targetWorldPos.x, targetY: targetWorldPos.y, range: range }, { timeout: timeout || 30000 });
    }
}

module.exports.PhaserRange = PhaserRange;
