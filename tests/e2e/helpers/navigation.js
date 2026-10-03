/**
 *
 * Reldens - Navigation Helper
 *
 * Provides page actions for the page load (with the pending requests reported when the network never gets idle), room
 * transitions, waiting for room state, and keyboard movement.
 *
 */

const { Phaser } = require('./phaser');
const { Logger } = require('@reldens/utils');
const { Selectors } = require('../selectors');

class Navigation
{
    static TILE_SIZE = 32;

    static async openPageAndWaitForNetworkIdle(page, url)
    {
        let pendingUrls = new Set();
        let addPendingUrl = request => pendingUrls.add(request.url());
        let removePendingUrl = request => pendingUrls.delete(request.url());
        page.on('request', addPendingUrl);
        page.on('requestfinished', removePendingUrl);
        page.on('requestfailed', removePendingUrl);
        await page.goto(url);
        let isIdle = await page.waitForLoadState('networkidle').then(() => true).catch((error) => {
            Logger.critical('Network not idle on '+url+': '+error.message+' Pending: '+[...pendingUrls].join(', '));
            return false;
        });
        page.off('request', addPendingUrl);
        page.off('requestfinished', removePendingUrl);
        page.off('requestfailed', removePendingUrl);
        return isIdle ? [] : [...pendingUrls];
    }

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

    static async moveToWorldPoint(page, worldX, worldY)
    {
        await page.evaluate((args) => {
            window.reldens.activeRoomEvents.send({
                'act': 'mp',
                'column': Math.floor(args.x / args.tileSize),
                'row': Math.floor(args.y / args.tileSize),
                'x': args.x,
                'y': args.y
            });
        }, { x: worldX, y: worldY, tileSize: Navigation.TILE_SIZE });
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
        let position = await Phaser.getPlayerServerPosition(page);
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
            async () => {
                let position = await Phaser.getPlayerServerPosition(page);
                if(!position){
                    return false;
                }
                return range >= Math.hypot(position.x - worldX, position.y - worldY);
            }
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
