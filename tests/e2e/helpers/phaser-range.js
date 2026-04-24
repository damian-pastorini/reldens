/**
 *
 * Reldens - Phaser Range Helper
 *
 * Resolves world positions and waits for the player to be within attack range of a target.
 *
 */

class PhaserRange
{

    static async _getObjectWorldPos(page, matchProp, matchValue, statusKey)
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
        return PhaserRange._getObjectWorldPos(page, 'asset_key', assetKey, 'active');
    }

    static async getObjectWorldPosByType(page, type)
    {
        return PhaserRange._getObjectWorldPos(page, 'type', type, 'visible');
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
