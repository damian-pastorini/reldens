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
        await page.keyboard.down(arrowKey);
        await page.waitForTimeout(durationMs);
        await page.keyboard.up(arrowKey);
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

    static async walkTowardWorldPoint(page, worldX, worldY, stepMs)
    {
        let pos = await page.evaluate(() => {
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
        if(!pos) {
            return false;
        }
        let dx = worldX - pos.x;
        let dy = worldY - pos.y;
        if(Math.abs(dx) > Math.abs(dy)) {
            await Navigation.walkInDirection(page, dx > 0 ? 'ArrowRight' : 'ArrowLeft', stepMs);
            return true;
        }
        await Navigation.walkInDirection(page, dy > 0 ? 'ArrowDown' : 'ArrowUp', stepMs);
        return true;
    }

    static async _walkSteps(page, worldX, worldY, stepMs, maxSteps, checkFn)
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
        return Navigation._walkSteps(
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
        let reached = await Navigation._walkSteps(
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
}

module.exports.Navigation = Navigation;
