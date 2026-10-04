/**
 *
 * Reldens - Object Chase
 *
 * Moves the player with the server path finder until it is within range of the closest matching object of the scene.
 * The closest object is locked and its position is read again on every step (the server body position for the objects
 * with state, so the moving NPCs and enemies are followed), the path is sent again when the target tile changes or the
 * player reached the last sent point, and when the player does not move for STUCK_MS it takes one walkable tile in a
 * different direction and the chase starts again. A target closer than CONTACT_DISTANCE is reached even for a smaller
 * range, the player and the target bodies touch at that distance and can not get any closer. A fixed world point is
 * reached the same way (moveToPointWithinRange): the path is sent again when the player stopped short of the point and
 * the same STUCK_MS side step applies.
 *
 */

const { Navigation } = require('./navigation');
const { Phaser } = require('./phaser');
const { PhaserRange } = require('./phaser-range');
const { RoomMovementApi } = require('./room-movement-api');
const { BaseE2eTest } = require('../base-e2e-test');
const { Logger, sc } = require('@reldens/utils');

class ObjectChase
{

    static STEP_MS = 500;
    static CONTACT_DISTANCE = 40;
    static STUCK_MS = 4000;
    static STUCK_DISTANCE = 4;
    static SIDESTEP_OFFSETS = [{column: 0, row: -1}, {column: 1, row: 0}, {column: 0, row: 1}, {column: -1, row: 0}];

    static async fetchTargetState(page, criteria, lockedKey)
    {
        return page.evaluate((args) => {
            let scene = window.reldens.getActiveScene();
            let room = window.reldens && window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!scene || !scene.objectsAnimations || !room || !room.state || !room.state.players){
                return null;
            }
            let player = window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
            if(!player){
                return null;
            }
            let closest = null;
            for(let animationKey of Object.keys(scene.objectsAnimations)){
                let animation = scene.objectsAnimations[animationKey];
                let isMatch = args.useRespawnFind
                    ? animation.key !== animation.asset_key && animation.sceneSprite && animation.sceneSprite.visible
                    : animation[args.prop] === args.value && animation.sceneSprite && animation.sceneSprite[args.statusKey];
                if(!isMatch || (args.lockedKey && args.lockedKey !== animation.key)){
                    continue;
                }
                let body = room.state.bodies ? room.state.bodies.get(animation.key) : null;
                let targetX = body ? body.x : animation.sceneSprite.x;
                let targetY = body ? body.y : animation.sceneSprite.y;
                let dist = Math.hypot(player.state.x - targetX, player.state.y - targetY);
                if(!closest || dist < closest.dist){
                    closest = {key: animation.key, playerX: player.state.x, playerY: player.state.y, targetX, targetY, dist};
                }
            }
            return closest;
        }, {...criteria, lockedKey});
    }

    static async fetchLockedOrClosestState(page, criteria, lockedKey)
    {
        let lockedState = lockedKey ? await ObjectChase.fetchTargetState(page, criteria, lockedKey) : null;
        if(lockedState){
            return lockedState;
        }
        return await ObjectChase.fetchTargetState(page, criteria, null);
    }

    static offsetPoint(x, y, offset)
    {
        return {
            x: x + offset.column * Navigation.TILE_SIZE,
            y: y + offset.row * Navigation.TILE_SIZE
        };
    }

    static async findApproachPoint(page, state, range)
    {
        let walkableOffsets = await PhaserRange.filterWalkableOffsets(
            page,
            state.targetX,
            state.targetY,
            PhaserRange.approachOffsets(
                range,
                Navigation.TILE_SIZE,
                state.playerX - state.targetX,
                state.playerY - state.targetY
            ),
            Navigation.TILE_SIZE
        );
        if(0 === walkableOffsets.length){
            return {x: state.targetX, y: state.targetY};
        }
        return ObjectChase.offsetPoint(state.targetX, state.targetY, [...walkableOffsets].shift());
    }

    static isSameTile(pointA, pointB)
    {
        return Math.floor(pointA.x / Navigation.TILE_SIZE) === Math.floor(pointB.x / Navigation.TILE_SIZE)
            && Math.floor(pointA.y / Navigation.TILE_SIZE) === Math.floor(pointB.y / Navigation.TILE_SIZE);
    }

    static async sidestep(page, state, chase)
    {
        let rotation = chase.sidesteps % ObjectChase.SIDESTEP_OFFSETS.length;
        let sidestepOffsets = [
            ...ObjectChase.SIDESTEP_OFFSETS.slice(rotation),
            ...ObjectChase.SIDESTEP_OFFSETS.slice(0, rotation)
        ];
        let walkableOffsets = await PhaserRange.filterWalkableOffsets(
            page,
            state.playerX,
            state.playerY,
            sidestepOffsets,
            Navigation.TILE_SIZE
        );
        let sidestepPoint = ObjectChase.offsetPoint(
            state.playerX,
            state.playerY,
            0 < walkableOffsets.length ? [...walkableOffsets].shift() : [...sidestepOffsets].shift()
        );
        Logger.info(
            'Chase stuck at '+state.playerX+','+state.playerY+' for '+ObjectChase.STUCK_MS+'ms with the target '
            +state.key+' at '+state.targetX+','+state.targetY+', side step to '+sidestepPoint.x+','+sidestepPoint.y
            +', server body: '+sc.toJsonString(await ObjectChase.fetchServerPlayer(page))
        );
        await Navigation.moveToWorldPoint(page, sidestepPoint.x, sidestepPoint.y);
        await page.waitForTimeout(ObjectChase.STEP_MS * 2);
        chase.sidesteps++;
        chase.sentPoint = false;
        chase.lastPosition = false;
    }

    static async fetchServerPlayer(page)
    {
        return await RoomMovementApi.fetchPlayer(BaseE2eTest.gameConfig, ...await page.evaluate(() => {
            let room = window.reldens.activeRoomEvents.room;
            return [
                window.reldens.activeRoomEvents.roomName,
                window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId).playerName
            ];
        }));
    }

    static async recoverFromStuck(page, state, chase)
    {
        let playerPosition = {x: state.playerX, y: state.playerY};
        let hasMoved = !chase.lastPosition || ObjectChase.STUCK_DISTANCE < Math.hypot(
            playerPosition.x - chase.lastPosition.x,
            playerPosition.y - chase.lastPosition.y
        );
        if(hasMoved){
            chase.lastPosition = playerPosition;
            chase.stuckSince = Date.now();
            return false;
        }
        if(ObjectChase.STUCK_MS >= Date.now() - chase.stuckSince){
            return false;
        }
        await ObjectChase.sidestep(page, state, chase);
        return true;
    }

    static async walkToPoint(page, state, chase, point)
    {
        let isWalkingToPoint = chase.sentPoint
            && ObjectChase.isSameTile(chase.sentPoint, point)
            && Navigation.TILE_SIZE < Math.hypot(state.playerX - point.x, state.playerY - point.y);
        if(isWalkingToPoint){
            return;
        }
        await Navigation.moveToWorldPoint(page, point.x, point.y);
        chase.sentPoint = point;
    }

    static async moveToPointWithinRange(page, point, range, timeout)
    {
        let deadline = Date.now() + timeout;
        let chase = {lockedKey: null, sentPoint: false, lastPosition: false, stuckSince: Date.now(), sidesteps: 0};
        let lastPosition = null;
        for(let step = 0; step < Math.ceil(timeout / ObjectChase.STEP_MS) && Date.now() < deadline; step++){
            lastPosition = await Phaser.getPlayerServerPosition(page);
            if(lastPosition && range >= Math.hypot(lastPosition.x - point.x, lastPosition.y - point.y)){
                return true;
            }
            if(lastPosition){
                let state = {key: 'point', playerX: lastPosition.x, playerY: lastPosition.y};
                await ObjectChase.advanceToPoint(page, {...state, targetX: point.x, targetY: point.y}, chase, point);
            }
            await page.waitForTimeout(ObjectChase.STEP_MS);
        }
        Logger.error(
            'moveToPointWithinRange: failed to reach '+point.x+','+point.y+' within '+range+' in '+timeout+'ms, last'
            +' player position: '+sc.toJsonString(lastPosition)+', side steps: '+chase.sidesteps
        );
        return false;
    }

    static async advanceToPoint(page, state, chase, point)
    {
        if(await ObjectChase.recoverFromStuck(page, state, chase)){
            return;
        }
        await ObjectChase.walkToPoint(page, state, chase, point);
    }

    static async moveToObjectWithinRange(page, matchProp, matchValue, statusKey, range, timeout, useRespawnFind = false)
    {
        let criteria = {prop: matchProp, value: matchValue, statusKey, useRespawnFind};
        let deadline = Date.now() + timeout;
        let maxSteps = Math.ceil(timeout / ObjectChase.STEP_MS);
        let chase = {lockedKey: null, sentPoint: false, lastPosition: false, stuckSince: Date.now(), sidesteps: 0};
        let lastState = null;
        for(let step = 0; step < maxSteps && Date.now() < deadline; step++){
            let state = await ObjectChase.fetchLockedOrClosestState(page, criteria, chase.lockedKey);
            if(!state){
                Logger.error('moveToObjectWithinRange: no target '+matchValue+' or player found in the scene.');
                return false;
            }
            chase.lockedKey = state.key;
            lastState = state;
            if(state.dist <= Math.max(range, ObjectChase.CONTACT_DISTANCE)){
                await Navigation.moveToWorldPoint(page, state.playerX, state.playerY);
                await PhaserRange.waitForPlayerToStandStill(page, ObjectChase.STEP_MS * 2);
                return state.key;
            }
            await ObjectChase.advanceToPoint(
                page,
                state,
                chase,
                await ObjectChase.findApproachPoint(page, state, range)
            );
            await page.waitForTimeout(ObjectChase.STEP_MS);
        }
        Logger.error(
            'moveToObjectWithinRange: failed to reach range '+range+' in '+timeout+'ms, last state: '
            +sc.toJsonString(lastState)+', side steps: '+chase.sidesteps
        );
        return false;
    }

    static async moveToEnemyWithinRange(page, enemyKey, range, timeout)
    {
        return ObjectChase.moveToObjectWithinRange(
            page,
            enemyKey ? 'asset_key' : 'type',
            enemyKey || 'enemy',
            enemyKey ? 'active' : 'visible',
            range,
            timeout
        );
    }

}

module.exports.ObjectChase = ObjectChase;
