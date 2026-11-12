/**
 *
 * Reldens - Interpolation Frames Recorder
 *
 * Records, on every frame of the active scene, the sprites of the tracked players, objects animations and bullets
 * before the scene update (with the interpolation entry the update reads: the state x, y and mov) and after it, so the
 * client interpolation is verified frame by frame against the real Phaser Linear function: a moving entry moves the
 * sprite by the configured interpolation speed from its last position and keeps the entry, a stopped entry places the
 * sprite on the state position and ends the entry, an entry already on the sprite position ends without moving it and
 * a sprite without entry is never moved by the update. The players positions are rounded to 2 decimals and use the
 * players size offsets, the objects and bullets positions are rounded to integers. Every frame also keeps the texture
 * its sprite renders while it is visible, so a bullet flying with a missing texture or hidden fails the spec, and for
 * the objects whether the sprite depth is the object Y plus the sprite height (counted in the summary). The page
 * errors are collected, so a failing client update (like a missing import) fails the spec.
 *
 */

const Linear = require('../../../node_modules/phaser/src/math/Linear');
const { sc } = require('@reldens/utils');

class InterpolationFramesRecorder
{

    static PLAYER_KIND = 'player';
    static PLAYER_PRECISION = 2;
    static OBJECT_PRECISION = 0;

    static trackPageErrors(page)
    {
        let pageErrors = [];
        page.on('pageerror', error => pageErrors.push(error.message));
        return pageErrors;
    }

    static async start(page, trackedKeys)
    {
        await page.evaluate((tracked) => {
            let scene = window.reldens.getActiveScene();
            let objectsPlugin = window.reldens.getFeature('objects');
            let recorder = {scene, frames: [], pendingFrames: []};
            let readPosition = (sprite) => sprite ? {x: sprite.x, y: sprite.y} : false;
            let readEntry = (entry) => entry ? {x: entry.x, y: entry.y, mov: Boolean(entry.mov)} : false;
            let readRenderedTexture = (sprite) => sprite?.visible && 0 < sprite.alpha ? sprite.texture?.key : false;
            let isObjectDepthByY = (target) => 'object' !== target.kind || !target.sprite?.sceneSprite
                || target.sprite.sceneSprite.depth === target.sprite.y + target.sprite.sceneSprite.height;
            let fetchTargets = () => [
                ...tracked.players.map(key => ({
                    kind: 'player',
                    key,
                    sprite: scene.player.players[key],
                    entries: scene.interpolatePlayersPosition
                })),
                ...tracked.objects.map(key => ({
                    kind: 'object',
                    key,
                    sprite: scene.objectsAnimations[key],
                    entries: scene.interpolateObjectsPositions
                })),
                ...(tracked.bullets ? Object.keys(objectsPlugin.bullets) : []).map(key => ({
                    kind: 'bullet',
                    key,
                    sprite: objectsPlugin.bullets[key],
                    entries: scene.interpolateObjectsPositions
                }))
            ];
            recorder.onPreUpdate = () => {
                recorder.pendingFrames = fetchTargets().map(target => ({
                    target,
                    before: readPosition(target.sprite),
                    entry: readEntry(target.entries[target.key])
                }));
            };
            let recordFrame = (pendingFrame) => {
                let target = pendingFrame.target;
                let after = readPosition(target.sprite);
                let isMoved = after.x !== pendingFrame.before.x || after.y !== pendingFrame.before.y;
                if(!pendingFrame.entry && !isMoved){
                    return false;
                }
                recorder.frames.push({
                    kind: target.kind,
                    key: target.key,
                    before: pendingFrame.before,
                    entry: pendingFrame.entry,
                    after,
                    isEntryKept: Boolean(target.entries[target.key]),
                    renderedTexture: readRenderedTexture(target.sprite),
                    isObjectDepthByY: isObjectDepthByY(target)
                });
                return true;
            };
            recorder.onPostUpdate = () => {
                for(let pendingFrame of recorder.pendingFrames){
                    recordFrame(pendingFrame);
                }
                recorder.pendingFrames = [];
            };
            scene.events.on('preupdate', recorder.onPreUpdate);
            scene.events.on('postupdate', recorder.onPostUpdate);
            window.e2eInterpolationRecorder = recorder;
        }, {
            players: sc.get(trackedKeys, 'players', []),
            objects: sc.get(trackedKeys, 'objects', []),
            bullets: true === sc.get(trackedKeys, 'bullets', false)
        });
    }

    static async stop(page)
    {
        return await page.evaluate(() => {
            let recorder = window.e2eInterpolationRecorder;
            recorder.scene.events.off('preupdate', recorder.onPreUpdate);
            recorder.scene.events.off('postupdate', recorder.onPostUpdate);
            delete window.e2eInterpolationRecorder;
            return {
                frames: recorder.frames,
                interpolationSpeed: recorder.scene.interpolationSpeed,
                leftOff: recorder.scene.player.leftOff,
                topOff: recorder.scene.player.topOff
            };
        });
    }

    static async waitForBulletsFlightEnd(page, timeout)
    {
        return await (await page.waitForFunction(() => {
            return window.e2eInterpolationRecorder.frames.some(frame => 'bullet' === frame.kind)
                && 0 === Object.keys(window.reldens.getFeature('objects').bullets).length;
        }, null, {timeout})).jsonValue();
    }

    static expectFrame(frame, recording)
    {
        if(!frame.entry){
            return {step: 'none', after: frame.before, isEntryKept: false};
        }
        let isCurrentPosition = Math.round(frame.before.x) === Math.round(frame.entry.x)
            && Math.round(frame.before.y) === Math.round(frame.entry.y);
        if(isCurrentPosition){
            return {step: 'current', after: frame.before, isEntryKept: false};
        }
        let isPlayer = InterpolationFramesRecorder.PLAYER_KIND === frame.kind;
        let precision = isPlayer ? InterpolationFramesRecorder.PLAYER_PRECISION : InterpolationFramesRecorder.OBJECT_PRECISION;
        let target = {
            x: frame.entry.x - (isPlayer ? recording.leftOff : 0),
            y: frame.entry.y - (isPlayer ? recording.topOff : 0)
        };
        let placedPosition = InterpolationFramesRecorder.placedPosition(target, precision);
        if(!frame.entry.mov){
            return {step: 'placed', after: placedPosition, isEntryKept: false};
        }
        return {
            step: 'moving',
            after: InterpolationFramesRecorder.interpolatedPosition(
                frame.before,
                target,
                recording.interpolationSpeed,
                precision
            ),
            isEntryKept: true,
            isPartial: placedPosition.x !== frame.after.x || placedPosition.y !== frame.after.y
        };
    }

    static interpolatedPosition(currentPosition, targetPosition, interpolationSpeed, precision)
    {
        return {
            x: sc.roundToPrecision(Linear(currentPosition.x, targetPosition.x, interpolationSpeed), precision),
            y: sc.roundToPrecision(Linear(currentPosition.y, targetPosition.y, interpolationSpeed), precision)
        };
    }

    static placedPosition(targetPosition, precision)
    {
        return {
            x: sc.roundToPrecision(targetPosition.x, precision),
            y: sc.roundToPrecision(targetPosition.y, precision)
        };
    }

    static summarize(recording, kind)
    {
        let summary = {
            frames: 0,
            mismatches: [],
            moving: 0,
            partialMoving: 0,
            placed: 0,
            current: 0,
            longestPlacedJump: 0,
            renderedTextures: [],
            objectDepthMismatches: 0
        };
        for(let frame of recording.frames.filter(recordedFrame => kind === recordedFrame.kind)){
            summary.frames++;
            summary.objectDepthMismatches += frame.isObjectDepthByY ? 0 : 1;
            if(frame.renderedTexture && !summary.renderedTextures.includes(frame.renderedTexture)){
                summary.renderedTextures.push(frame.renderedTexture);
            }
            let expected = InterpolationFramesRecorder.expectFrame(frame, recording);
            let isExpected = expected.after.x === frame.after.x
                && expected.after.y === frame.after.y
                && expected.isEntryKept === frame.isEntryKept;
            if(!isExpected){
                summary.mismatches.push({frame, expected});
                continue;
            }
            if('moving' === expected.step){
                summary.moving++;
                summary.partialMoving += expected.isPartial ? 1 : 0;
            }
            if('placed' === expected.step){
                summary.placed++;
                summary.longestPlacedJump = Math.max(
                    summary.longestPlacedJump,
                    Math.hypot(frame.after.x - frame.before.x, frame.after.y - frame.before.y)
                );
            }
            if('current' === expected.step){
                summary.current++;
            }
        }
        return summary;
    }

    static async waitForPlayerSpriteOnState(page, sessionId, position, timeout)
    {
        return await (await page.waitForFunction((args) => {
            let room = window.reldens.activeRoomEvents.room;
            let playerSchema = room?.state?.players?.get(args.sessionId);
            let playerEngine = window.reldens.getActiveScene()?.player;
            let playerSprite = playerEngine?.players?.[args.sessionId];
            if(!playerSchema || !playerSprite || playerSchema.state.mov){
                return false;
            }
            if(args.position && (args.position.x !== playerSchema.state.x || args.position.y !== playerSchema.state.y)){
                return false;
            }
            return playerSchema.state.x - playerEngine.leftOff === playerSprite.x
                && playerSchema.state.y - playerEngine.topOff === playerSprite.y;
        }, {sessionId, position}, {timeout}).then((result) => result.jsonValue()).catch(() => false));
    }

    static async readPlayerPositions(page, sessionId)
    {
        return await page.evaluate((playerKey) => {
            let scene = window.reldens.getActiveScene();
            let playerSprite = scene?.player?.players?.[playerKey];
            let playerSchema = window.reldens.activeRoomEvents.room?.state?.players?.get(playerKey);
            if(!playerSprite || !playerSchema){
                return false;
            }
            return {
                state: {
                    x: playerSchema.state.x,
                    y: playerSchema.state.y,
                    mov: playerSchema.state.mov,
                    inState: playerSchema.state.inState
                },
                sprite: {x: playerSprite.x, y: playerSprite.y},
                hasEntry: Boolean(scene.interpolatePlayersPosition[playerKey])
            };
        }, sessionId);
    }

    static async stopOnPlayerState(page, sessionId, position, timeout)
    {
        return {
            isOnState: await InterpolationFramesRecorder.waitForPlayerSpriteOnState(page, sessionId, position, timeout),
            summary: InterpolationFramesRecorder.summarize(
                await InterpolationFramesRecorder.stop(page),
                InterpolationFramesRecorder.PLAYER_KIND
            )
        };
    }

    static async waitForObjectOnBody(page, objectKey, position, timeout)
    {
        return await (await page.waitForFunction((args) => {
            let bodyState = window.reldens.activeRoomEvents.room?.state?.bodies?.get(args.objectKey);
            let animation = window.reldens.getActiveScene()?.objectsAnimations?.[args.objectKey];
            if(!bodyState || !animation || bodyState.mov){
                return false;
            }
            if(args.position && (args.position.x !== bodyState.x || args.position.y !== bodyState.y)){
                return false;
            }
            return bodyState.x === animation.x && bodyState.y === animation.y;
        }, {objectKey, position}, {timeout}).then((result) => result.jsonValue()).catch(() => false));
    }

}

module.exports.InterpolationFramesRecorder = InterpolationFramesRecorder;
