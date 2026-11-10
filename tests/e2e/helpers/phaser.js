/**
 *
 * Reldens - Phaser Helper
 *
 * Queries and interacts with in-scene Phaser objects (NPCs, enemies, players) via browser evaluate. A real click on an
 * object waits until the camera stopped with the object in view (the camera follows the player with a small lerp, so
 * after a server placement it needs a few seconds to reach it) and clicks the object bounds center moved away from the
 * own player, so the player sprite drawn over the object never takes the click.
 *
 */

const { Selectors } = require('../selectors');

class Phaser
{
    static CAMERA_SETTLE_TIMEOUT = 15000;
    static CAMERA_SETTLE_POLL_MS = 200;
    static OVERLAY_CLASS = 'e2e-canvas-overlay';
    static OVERLAY_HALF_SIZE = 10;

    static async getObjectScreenCoordsByProp(page, matchProp, matchValue, statusKey)
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
                x: camera.x + (found.sceneSprite.x - camera.worldView.x) * camera.zoom,
                y: camera.y + (found.sceneSprite.y - camera.worldView.y) * camera.zoom
            };
        }, { prop: matchProp, value: matchValue, statusKey });
    }

    static async waitForObjectWithProp(page, matchProp, matchValue, statusKey, timeout)
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
                x: scene.cameras.main.x + (anim.sceneSprite.x - scene.cameras.main.worldView.x) * scene.cameras.main.zoom,
                y: scene.cameras.main.y + (anim.sceneSprite.y - scene.cameras.main.worldView.y) * scene.cameras.main.zoom
            };
        }, objKey);
    }

    static async getObjectScreenCoordsByType(page, type)
    {
        return Phaser.getObjectScreenCoordsByProp(page, 'type', type, 'visible');
    }

    static async getObjectScreenCoordsByAssetKey(page, assetKey)
    {
        return Phaser.getObjectScreenCoordsByProp(page, 'asset_key', assetKey, 'active');
    }

    static async clickObject(page, objKey)
    {
        let coords = await Phaser.getObjectScreenCoords(page, objKey);
        await page.locator(Selectors.canvas).click({ position: { x: coords.x, y: coords.y }, force: true });
    }

    static async getObjectBoundsCenterScreenCoords(page, objKey)
    {
        return page.evaluate((key) => {
            let scene = window.reldens.getActiveScene();
            let anim = scene.objectsAnimations[key];
            if(!anim || !anim.sceneSprite) {
                return null;
            }
            let bounds = anim.sceneSprite.getBounds();
            let camera = scene.cameras.main;
            return {
                x: camera.x + (bounds.centerX - camera.worldView.x) * camera.zoom,
                y: camera.y + (bounds.centerY - camera.worldView.y) * camera.zoom
            };
        }, objKey);
    }

    static async waitForCameraOnObject(page, objKey, timeout = Phaser.CAMERA_SETTLE_TIMEOUT)
    {
        await page.waitForFunction((key) => {
            let scene = window.reldens.getActiveScene();
            let camera = scene.cameras.main;
            let sprite = scene.objectsAnimations[key]?.sceneSprite;
            let scroll = Math.round(camera.scrollX)+','+Math.round(camera.scrollY);
            let isSettled = window.e2eCameraScroll === scroll;
            window.e2eCameraScroll = scroll;
            return isSettled && Boolean(sprite) && camera.worldView.contains(sprite.x, sprite.y);
        }, objKey, {timeout, polling: Phaser.CAMERA_SETTLE_POLL_MS});
    }

    static async fetchObjectPointClearOfPlayers(page, objKey, offsetPixels)
    {
        return page.evaluate((args) => {
            let scene = window.reldens.getActiveScene();
            let camera = scene.cameras.main;
            let bounds = scene.objectsAnimations[args.key].sceneSprite.getBounds();
            let playersBounds = Object.values(scene.player.players).map(player => player.getBounds());
            let offsets = [[0, 0], [0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
            let worldPoint = offsets.map(offset => ({
                x: bounds.centerX + offset[0] * args.offset,
                y: bounds.centerY + offset[1] * args.offset
            })).find(point => !playersBounds.some(playerBounds => playerBounds.contains(point.x, point.y)));
            if(!worldPoint){
                return null;
            }
            let canvas = window.reldens.gameEngine.canvas;
            let canvasRect = canvas.getBoundingClientRect();
            return {
                x: (camera.x + (worldPoint.x - camera.worldView.x) * camera.zoom) * canvasRect.width / canvas.width,
                y: (camera.y + (worldPoint.y - camera.worldView.y) * camera.zoom) * canvasRect.height / canvas.height
            };
        }, {key: objKey, offset: offsetPixels});
    }

    static async clickObjectAwayFromOwnPlayer(page, objKey, offsetPixels, isDoubleClick = false)
    {
        await Phaser.waitForCameraOnObject(page, objKey);
        let clickPoint = await Phaser.fetchObjectPointClearOfPlayers(page, objKey, offsetPixels);
        if(!clickPoint){
            return false;
        }
        let canvasBox = await page.locator(Selectors.canvas).boundingBox();
        await page.mouse[isDoubleClick ? 'dblclick' : 'click'](canvasBox.x + clickPoint.x, canvasBox.y + clickPoint.y);
        return true;
    }

    static async clickPageElementOverObject(page, objKey, offsetPixels)
    {
        await Phaser.waitForCameraOnObject(page, objKey);
        let clickPoint = await Phaser.fetchObjectPointClearOfPlayers(page, objKey, offsetPixels);
        if(!clickPoint){
            return false;
        }
        let canvasBox = await page.locator(Selectors.canvas).boundingBox();
        let halfSize = Phaser.OVERLAY_HALF_SIZE;
        await page.addStyleTag({content: '.'+Phaser.OVERLAY_CLASS+'{position:fixed;z-index:99999;'
            +'width:'+(halfSize * 2)+'px;height:'+(halfSize * 2)+'px;'
            +'left:'+(canvasBox.x + clickPoint.x - halfSize)+'px;top:'+(canvasBox.y + clickPoint.y - halfSize)+'px;}'});
        await page.evaluate((className) => {
            let overlay = document.createElement('div');
            overlay.classList.add(className);
            document.body.appendChild(overlay);
        }, Phaser.OVERLAY_CLASS);
        await page.locator('.'+Phaser.OVERLAY_CLASS).click({force: true});
        return true;
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
        await Phaser.waitForObjectWithProp(page, '__direct__', objKey, null, timeout);
    }

    static async waitForObjectByAssetKey(page, assetKey, timeout)
    {
        await Phaser.waitForObjectWithProp(page, 'asset_key', assetKey, 'visible', timeout);
    }

    static async waitForObjectByType(page, type, timeout)
    {
        await Phaser.waitForObjectWithProp(page, 'type', type, 'visible', timeout);
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
                x: camera.x + (p.x - camera.worldView.x) * camera.zoom,
                y: camera.y + (p.y - camera.worldView.y) * camera.zoom
            };
        }, sessionId);
    }

    static async clickPlayerBySessionId(page, sessionId)
    {
        let coords = await Phaser.getOtherPlayerScreenCoords(page, sessionId);
        let canvasBox = await page.locator(Selectors.canvas).boundingBox();
        await page.mouse.click(canvasBox.x + coords.x, canvasBox.y + coords.y);
    }

    static async clickPlayerAwayFromOwnPlayer(page, sessionId, offsetPixels)
    {
        let targetCoords = await Phaser.getOtherPlayerScreenCoords(page, sessionId);
        let ownCoords = await Phaser.getPlayerScreenCoords(page);
        let distance = Math.hypot(targetCoords.x - ownCoords.x, targetCoords.y - ownCoords.y) || 1;
        let canvasBox = await page.locator(Selectors.canvas).boundingBox();
        await page.mouse.click(
            canvasBox.x + targetCoords.x + (targetCoords.x - ownCoords.x) / distance * offsetPixels,
            canvasBox.y + targetCoords.y + (targetCoords.y - ownCoords.y) / distance * offsetPixels
        );
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
                x: camera.x + (playerSprite.x - camera.worldView.x) * camera.zoom,
                y: camera.y + (playerSprite.y - camera.worldView.y) * camera.zoom
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

    static async triggerObjectInteraction(page, objectKey)
    {
        return page.evaluate((key) => {
            let scene = window.reldens && window.reldens.getActiveScene && window.reldens.getActiveScene();
            if(!scene || !scene.objectsAnimations) {
                return false;
            }
            let anim = scene.objectsAnimations[key]
                || Object.values(scene.objectsAnimations).find(a => a.asset_key === key);
            if(!anim) {
                return false;
            }
            if(!window.reldens.activeRoomEvents) {
                return false;
            }
            let tempId = (anim.key === anim.asset_key) ? anim.id : anim.key;
            window.reldens.activeRoomEvents.send({act: 'oi', id: tempId, type: anim.type});
            return true;
        }, objectKey);
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
            for(let button of buttons) {
                if(button.id) {
                    ids.push(button.id);
                }
            }
            return ids;
        });
    }

    static async targetEnemy(page, enemyKey)
    {
        return page.evaluate((eKey) => {
            let scene = window.reldens.getActiveScene();
            let room = window.reldens && window.reldens.activeRoomEvents && window.reldens.activeRoomEvents.room;
            if(!scene){
                return 'no-scene';
            }
            if(!room){
                return 'no-room';
            }
            let player = room.state && room.state.players
                && window.reldens.activeRoomEvents.playerBySessionIdFromState(room, room.sessionId);
            let found = null;
            let minDist = Infinity;
            let animDiag = '';
            for(let anim of Object.values(scene.objectsAnimations)){
                animDiag += 'key:'+anim.key+'|asset:'+anim.asset_key+'|type:'+anim.type
                    +'|vis:'+(anim.sceneSprite ? anim.sceneSprite.visible : 'no-sprite')+'|name:'+anim.targetName+',';
                if(!anim.sceneSprite || !anim.sceneSprite.visible){
                    continue;
                }
                if(eKey && anim.asset_key !== eKey){
                    continue;
                }
                if(!eKey && anim.key === anim.asset_key){
                    continue;
                }
                let dist = player
                    ? Math.hypot(player.state.x - anim.sceneSprite.x, player.state.y - anim.sceneSprite.y)
                    : 0;
                if(dist < minDist){
                    minDist = dist;
                    found = anim;
                }
            }
            if(!found){
                return 'no-enemy-found eKey:'+eKey+'|anims:'+animDiag;
            }
            let tempId = (found.key === found.asset_key) ? found.id : found.key;
            scene.player.currentTarget = {id: tempId, type: 'obj'};
            window.reldens.gameEngine.showTarget(found.targetName || found.key, scene.player.currentTarget, false);
            return true;
        }, enemyKey || null);
    }

}

module.exports.Phaser = Phaser;
