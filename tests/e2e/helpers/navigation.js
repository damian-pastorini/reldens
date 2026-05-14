/**
 *
 * Reldens - Navigation Helper
 *
 * Provides page actions for room transitions, waiting for room state, and keyboard movement.
 *
 */

const { Logger } = require('@reldens/utils');
const { Selectors } = require('../selectors');

class Navigation
{
    static async walkInDirection(page, arrowKey, durationMs)
    {
        let dirMap = { ArrowRight: 'right', ArrowLeft: 'left', ArrowUp: 'up', ArrowDown: 'down' };
        let direction = dirMap[arrowKey] || arrowKey.replace('Arrow', '').toLowerCase();
        await page.evaluate((d) => {
            window.reldens.getActiveScene().player[d]();
        }, direction);
        await page.waitForTimeout(durationMs);
        await page.evaluate(() => {
            window.reldens.getActiveScene().player.stop();
        });
    }

    static async focusGame(page)
    {
        await page.locator(Selectors.canvas).click({ position: { x: 10, y: 10 }, force: true });
    }

    static async navigateToWorldPoint(page, worldX, worldY)
    {
        let coords = await page.evaluate((args) => {
            if(!window.reldens || !window.reldens.activeRoomEvents) {
                return null;
            }
            let scene = window.reldens.getActiveScene();
            if(!scene || !scene.cameras || !scene.cameras.main) {
                return null;
            }
            return {
                x: (args.wx - scene.cameras.main.scrollX) * scene.cameras.main.zoom,
                y: (args.wy - scene.cameras.main.scrollY) * scene.cameras.main.zoom
            };
        }, { wx: worldX, wy: worldY });
        if(!coords) {
            return false;
        }
        let canvasBox = await page.locator(Selectors.canvas).boundingBox();
        let clickX = canvasBox.x + coords.x;
        let clickY = canvasBox.y + coords.y;
        if(clickX < canvasBox.x || clickX > canvasBox.x + canvasBox.width) {
            return false;
        }
        if(clickY < canvasBox.y || clickY > canvasBox.y + canvasBox.height) {
            return false;
        }
        await page.mouse.click(clickX, clickY);
        return true;
    }

    static async waitForRoom(page, roomName, timeout)
    {
        await page.waitForFunction((rn) => {
            if(!window.reldens || !window.reldens.activeRoomEvents) {
                return false;
            }
            return window.reldens.activeRoomEvents.roomName === rn;
        }, roomName, { timeout });
    }

    static async getCurrentRoomName(page)
    {
        return page.evaluate(() => {
            if(!window.reldens || !window.reldens.activeRoomEvents) {
                return null;
            }
            return window.reldens.activeRoomEvents.roomName;
        });
    }

    static async executeMovementStep(page, dirs, stepMs)
    {
        await Navigation.sendPlayerDirections(page, dirs);
        await page.waitForTimeout(stepMs);
        await page.evaluate(() => {
            window.reldens.getActiveScene().player.stop();
        });
    }

    static async walkTowardWorldPoint(page, worldX, worldY, stepMs)
    {
        let position = await page.evaluate(() => {
            let room = window.reldens && window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!room || !room.state || !room.state.players) {
                return null;
            }
            let playerState = window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
            if(!playerState) {
                return null;
            }
            return { x: playerState.state.x, y: playerState.state.y };
        });
        if(!position) {
            return false;
        }
        let dx = worldX - position.x;
        let dy = worldY - position.y;
        let dirs = [];
        if(0 !== dx) {
            dirs.push(dx > 0 ? 'right' : 'left');
        }
        if(0 !== dy) {
            dirs.push(dy > 0 ? 'down' : 'up');
        }
        if(0 === dirs.length) {
            return true;
        }
        await Navigation.executeMovementStep(page, dirs, stepMs);
        return true;
    }

    static async walkSteps(page, worldX, worldY, stepMs, maxSteps, checkFn)
    {
        for(let i = 0; i < maxSteps; i++) {
            let done = await checkFn();
            if(done) {
                return true;
            }
            let stepped = await Navigation.walkTowardWorldPoint(page, worldX, worldY, stepMs);
            if(!stepped) {
                return false;
            }
        }
        return false;
    }

    static async walkUntilWithinRange(page, worldX, worldY, range, timeout)
    {
        let stepMs = 400;
        let maxSteps = Math.ceil(timeout / stepMs);
        await Navigation.focusGame(page);
        return Navigation.walkSteps(
            page,
            worldX,
            worldY,
            stepMs,
            maxSteps,
            async () => page.evaluate((args) => {
                let room = window.reldens && window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
                if(!room || !room.state || !room.state.players) {
                    return false;
                }
                let playerState = window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
                if(!playerState) {
                    return false;
                }
                return Math.hypot(playerState.state.x - args.wx, playerState.state.y - args.wy) <= args.range;
            }, { wx: worldX, wy: worldY, range })
        );
    }

    static async ensureInRoom(page, roomName, transitionX, transitionY, timeout)
    {
        let currentRoom = await Navigation.getCurrentRoomName(page);
        if(currentRoom === roomName) {
            return true;
        }
        let stepMs = 400;
        let maxSteps = Math.ceil(timeout / stepMs);
        await Navigation.focusGame(page);
        let reached = await Navigation.walkSteps(
            page,
            transitionX,
            transitionY,
            stepMs,
            maxSteps,
            async () => {
                return (await Navigation.getCurrentRoomName(page)) === roomName;
            }
        );
        if(!reached) {
            Logger.critical(
                'ensureInRoom: failed to reach "'+roomName+'" within '
                +timeout+'ms (last room: '+(await Navigation.getCurrentRoomName(page))+').'
            );
        }
        return reached;
    }

    static async moveToObjectWithinRange(page, matchProp, matchValue, statusKey, range, timeout, useRespawnFind = false)
    {
        let stepMs = 1200;
        let maxSteps = Math.ceil(timeout / stepMs);
        let lastPlayerX = null;
        let lastPlayerY = null;
        let stuckCount = 0;
        for(let i = 0; i < maxSteps; i++){
            let state = await page.evaluate((args) => {
                let scene = window.reldens.getActiveScene();
                if(!scene || !scene.objectsAnimations){
                    return null;
                }
                let found = args.useRespawnFind
                    ? Object.values(scene.objectsAnimations).find(
                        anim => anim.key !== anim.asset_key && anim.sceneSprite && anim.sceneSprite.visible
                    )
                    : Object.values(scene.objectsAnimations).find(
                        anim => anim[args.prop] === args.value && anim.sceneSprite && anim.sceneSprite[args.statusKey]
                    );
                if(!found || !found.sceneSprite){
                    return null;
                }
                let room = window.reldens && window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
                if(!room || !room.state || !room.state.players){
                    return null;
                }
                let player = window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
                if(!player){
                    return null;
                }
                let body = room.state.bodies ? room.state.bodies.get(found.key) : null;
                let targetX = body ? body.x : found.sceneSprite.x;
                let targetY = body ? body.y : found.sceneSprite.y;
                let dist = Math.hypot(player.state.x - targetX, player.state.y - targetY);
                if(dist <= args.range){
                    return { inRange: true, playerX: player.state.x, playerY: player.state.y, targetX, targetY, dist };
                }
                return { inRange: false, playerX: player.state.x, playerY: player.state.y, targetX, targetY, dist };
            }, { prop: matchProp, value: matchValue, statusKey, range, useRespawnFind });
            if(!state){
                Logger.error('moveToObjectWithinRange step '+i+': no enemy or player found in scene');
                return false;
            }
            if(state.inRange){
                Logger.debug('moveToObjectWithinRange: in range at step '+i+' player=('+state.playerX+','+state.playerY+') enemy=('+state.targetX+','+state.targetY+') dist='+state.dist);
                return true;
            }
            Logger.debug('moveToObjectWithinRange step '+i+': player=('+state.playerX+','+state.playerY+') enemy=('+state.targetX+','+state.targetY+') dist='+state.dist);
            let moved = null === lastPlayerX
                ? true
                : 10 < Math.hypot(state.playerX - lastPlayerX, state.playerY - lastPlayerY);
            stuckCount = moved ? 0 : stuckCount + 1;
            lastPlayerX = state.playerX;
            lastPlayerY = state.playerY;
            let dx = state.targetX - state.playerX;
            let dy = state.targetY - state.playerY;
            let dirs = [];
            if(1 <= stuckCount){
                let detourDirs = ['up', 'right', 'down', 'left'];
                dirs.push(detourDirs[stuckCount % detourDirs.length]);
            }
            if(0 === stuckCount && 0 !== dx){
                dirs.push(dx > 0 ? 'right' : 'left');
            }
            if(0 === stuckCount && 0 !== dy){
                dirs.push(dy > 0 ? 'down' : 'up');
            }
            if(0 === dirs.length){
                dirs.push('right');
            }
            await Navigation.executeMovementStep(page, dirs, stepMs);
        }
        Logger.error('moveToObjectWithinRange: failed to reach range '+range+' within '+maxSteps+' steps');
        return false;
    }

    static async sendPlayerDirections(page, dirs)
    {
        for(let direction of dirs){
            await page.evaluate((d) => {
                window.reldens.getActiveScene().player[d]();
            }, direction);
        }
    }

}

module.exports.Navigation = Navigation;
