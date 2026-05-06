/**
 *
 * Reldens - Phaser Helper
 *
 * Queries and interacts with in-scene Phaser objects (NPCs, enemies, players) via browser evaluate.
 *
 */

const { Selectors } = require('../selectors');

class Phaser
{
    static async _getObjectCoordsByMatch(page, matchProp, matchValue, statusKey)
    {
        return page.evaluate((args) => {
            let scene = window.reldens.getActiveScene();
            let camera = scene.cameras.main;
            let found = Object.values(scene.objectsAnimations).find(
                anim => anim[args.prop] === args.value && anim.sceneSprite && anim.sceneSprite[args.statusKey]
            );
            if(!found) {
                return null;
            }
            return {
                x: (found.sceneSprite.x - camera.scrollX) * camera.zoom,
                y: (found.sceneSprite.y - camera.scrollY) * camera.zoom
            };
        }, { prop: matchProp, value: matchValue, statusKey });
    }

    static async _waitForObjectMatching(page, matchProp, matchValue, statusKey, timeout)
    {
        await page.waitForFunction((args) => {
            if(!window.reldens || !window.reldens.activeRoomEvents) {
                return false;
            }
            let scene = window.reldens.getActiveScene();
            if(!scene || !scene.objectsAnimations) {
                return false;
            }
            if('__direct__' === args.prop) {
                return !!(scene.objectsAnimations[args.value] && scene.objectsAnimations[args.value].sceneSprite);
            }
            return Object.values(scene.objectsAnimations).some((anim) => {
                return anim[args.prop] === args.value && anim.sceneSprite && anim.sceneSprite[args.statusKey];
            });
        }, { prop: matchProp, value: matchValue, statusKey }, { timeout });
    }

    static async getObjectScreenCoords(page, objKey)
    {
        return page.evaluate((key) => {
            let scene = window.reldens.getActiveScene();
            let anim = scene.objectsAnimations[key];
            if(!anim || !anim.sceneSprite) {
                return null;
            }
            return {
                x: (anim.sceneSprite.x - scene.cameras.main.scrollX) * scene.cameras.main.zoom,
                y: (anim.sceneSprite.y - scene.cameras.main.scrollY) * scene.cameras.main.zoom
            };
        }, objKey);
    }

    static async getObjectScreenCoordsByType(page, type)
    {
        return Phaser._getObjectCoordsByMatch(page, 'type', type, 'visible');
    }

    static async getObjectScreenCoordsByAssetKey(page, assetKey)
    {
        return Phaser._getObjectCoordsByMatch(page, 'asset_key', assetKey, 'active');
    }

    static async clickObject(page, objKey)
    {
        let coords = await Phaser.getObjectScreenCoords(page, objKey);
        await page.locator(Selectors.canvas).click({ position: { x: coords.x, y: coords.y }, force: true });
    }

    static async clickObjectByType(page, type)
    {
        let coords = await Phaser.getObjectScreenCoordsByType(page, type);
        await page.locator(Selectors.canvas).click({ position: { x: coords.x, y: coords.y }, force: true });
    }

    static async clickObjectByAssetKey(page, assetKey)
    {
        let coords = await Phaser.getObjectScreenCoordsByAssetKey(page, assetKey);
        await page.locator(Selectors.canvas).click({ position: { x: coords.x, y: coords.y }, force: true });
    }

    static async waitForObject(page, objKey, timeout)
    {
        await Phaser._waitForObjectMatching(page, '__direct__', objKey, null, timeout);
    }

    static async waitForObjectByAssetKey(page, assetKey, timeout)
    {
        await Phaser._waitForObjectMatching(page, 'asset_key', assetKey, 'visible', timeout);
    }

    static async waitForObjectByType(page, type, timeout)
    {
        await Phaser._waitForObjectMatching(page, 'type', type, 'visible', timeout);
    }

    static async waitForPlayerBySessionId(page, sessionId, timeout)
    {
        await page.waitForFunction((sid) => {
            if(!window.reldens || !window.reldens.activeRoomEvents) {
                return false;
            }
            let scene = window.reldens.getActiveScene();
            if(!scene || !scene.player || !scene.player.players) {
                return false;
            }
            return !!(scene.player.players[sid] && scene.player.players[sid].active && scene.player.players[sid].visible);
        }, sessionId, { timeout });
    }

    static async getOtherPlayerScreenCoords(page, sessionId)
    {
        return page.evaluate((sid) => {
            let scene = window.reldens.getActiveScene();
            let camera = scene.cameras.main;
            let p = scene.player && scene.player.players && scene.player.players[sid];
            if(!p) {
                return null;
            }
            return {
                x: (p.x - camera.scrollX) * camera.zoom,
                y: (p.y - camera.scrollY) * camera.zoom
            };
        }, sessionId);
    }

    static async clickPlayerBySessionId(page, sessionId)
    {
        let coords = await Phaser.getOtherPlayerScreenCoords(page, sessionId);
        let canvasBox = await page.locator(Selectors.canvas).boundingBox();
        await page.mouse.click(canvasBox.x + coords.x, canvasBox.y + coords.y);
    }

    static async getPlayerServerPosition(page)
    {
        return page.evaluate(() => {
            let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!room || !room.state || !room.state.players) {
                return null;
            }
            let playerState = window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
            if(!playerState) {
                return null;
            }
            return { x: playerState.state.x, y: playerState.state.y };
        });
    }

    static async getPlayerScreenCoords(page)
    {
        return page.evaluate(() => {
            let scene = window.reldens.getActiveScene();
            let camera = scene.cameras.main;
            let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!room || !scene) {
                return null;
            }
            let playerSprite = scene.player && scene.player.players && scene.player.players[room.sessionId];
            if(!playerSprite) {
                return null;
            }
            return {
                x: (playerSprite.x - camera.scrollX) * camera.zoom,
                y: (playerSprite.y - camera.scrollY) * camera.zoom
            };
        });
    }

    static async getCanvasPixelHash(page)
    {
        let buffer = await page.screenshot();
        let hash = 0;
        for(let i = 0; i < buffer.length; i++){
            hash = (hash * 31 + buffer[i]) & 0xffffffff;
        }
        return hash;
    }

    static async waitForTargetWithinRange(page, range, timeout)
    {
        await page.waitForFunction((skillRange) => {
            let scene = window.reldens.getActiveScene();
            let room = window.reldens && window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!scene || !room || !room.state || !room.state.players){
                return false;
            }
            let player = window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
            if(!player){
                return false;
            }
            if(!scene.player || !scene.player.currentTarget || !scene.player.currentTarget.id){
                return false;
            }
            let target = scene.objectsAnimations[scene.player.currentTarget.id];
            if(!target || !target.sceneSprite){
                return false;
            }
            return Math.hypot(player.state.x - target.sceneSprite.x, player.state.y - target.sceneSprite.y) <= skillRange;
        }, range, { timeout });
    }

    static async waitForPlayerInRoomState(page, timeout)
    {
        await page.waitForFunction(() => {
            let room = window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!room || !room.state || !room.state.players) {
                return false;
            }
            return !!(window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId));
        }, null, { timeout });
    }

    static async getPlayerAvailableActionKeys(page)
    {
        return page.evaluate(() => {
            let buttons = document.querySelectorAll('.action-buttons img, .skills-container img');
            let ids = [];
            for(let btn of buttons) {
                if(btn.id) {
                    ids.push(btn.id);
                }
            }
            return ids;
        });
    }

}

module.exports.Phaser = Phaser;
