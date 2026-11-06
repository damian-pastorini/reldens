/**
 *
 * Reldens - Scene Interpolation Probe
 *
 * Calls the interpolation methods of the live client scene with the entries the real movements never create, inside a
 * single page evaluation (so no game frame runs in the middle) and returns what each call did: an entry without state,
 * an entry without sprite, the update with the client interpolation disabled, the players interpolation without the
 * player engine, a bullet entry without bullet sprite, an object entry without animation, the entries already on the
 * sprite position, a moving entry and a stopped entry (the real state, so the sprites end where they started). It also
 * reads the depth of every map layer the scene created, so the depths are compared with the layer name and index rules.
 *
 */

class SceneInterpolationProbe
{

    static CRAFTED_STEP_X = 96;
    static CRAFTED_STEP_Y = 64;
    static CRAFTED_BULLET_START = 100;
    static CRAFTED_BULLET_STEP_X = 51;
    static CRAFTED_BULLET_STEP_Y = -50;

    static async runPlayersBranches(page)
    {
        return await page.evaluate((craftedStep) => {
            let scene = window.reldens.getActiveScene();
            let room = window.reldens.activeRoomEvents.room;
            let playerEngine = scene.player;
            let sprite = playerEngine.players[room.sessionId];
            let entries = scene.interpolatePlayersPosition;
            let realState = room.state.players.get(room.sessionId).state;
            let readSprite = () => ({x: sprite.x, y: sprite.y});
            let craftState = (x, y, mov) => ({x, y, mov, dir: realState.dir, inState: realState.inState});
            let results = {
                start: readSprite(),
                leftOff: playerEngine.leftOff,
                topOff: playerEngine.topOff,
                interpolationSpeed: scene.interpolationSpeed,
                withoutEntries: scene.processPlayersPositionInterpolation()
            };
            entries['e2e-missing-state'] = false;
            entries['e2e-missing-sprite'] = craftState(1, 1, true);
            results.missing = {
                returned: scene.processPlayersPositionInterpolation(),
                keys: Object.keys(entries),
                sprite: readSprite()
            };
            delete entries['e2e-missing-state'];
            delete entries['e2e-missing-sprite'];
            entries[room.sessionId] = craftState(sprite.x, sprite.y, true);
            results.current = {
                returned: scene.processPlayersPositionInterpolation(),
                isEntryKept: Boolean(entries[room.sessionId]),
                sprite: readSprite()
            };
            let movingState = craftState(
                sprite.x + playerEngine.leftOff + craftedStep.x,
                sprite.y + playerEngine.topOff + craftedStep.y,
                true
            );
            entries[room.sessionId] = movingState;
            results.moving = {
                state: {x: movingState.x, y: movingState.y},
                returned: scene.processPlayersPositionInterpolation(),
                isEntryKept: Boolean(entries[room.sessionId]),
                sprite: readSprite()
            };
            scene.clientInterpolation = false;
            scene.update();
            results.disabled = {isEntryKept: Boolean(entries[room.sessionId]), sprite: readSprite()};
            scene.clientInterpolation = true;
            entries[room.sessionId] = realState;
            results.stopped = {
                state: {x: realState.x, y: realState.y, mov: realState.mov},
                returned: scene.processPlayersPositionInterpolation(),
                isEntryKept: Boolean(entries[room.sessionId]),
                sprite: readSprite()
            };
            scene.player = false;
            entries['e2e-without-engine'] = craftState(1, 1, true);
            results.withoutEngine = {
                returned: scene.processPlayersPositionInterpolation(),
                isEntryKept: Boolean(entries['e2e-without-engine'])
            };
            scene.player = playerEngine;
            delete entries['e2e-without-engine'];
            return results;
        }, {x: SceneInterpolationProbe.CRAFTED_STEP_X, y: SceneInterpolationProbe.CRAFTED_STEP_Y});
    }

    static async runObjectsBranches(page, objectKey)
    {
        return await page.evaluate((args) => {
            let scene = window.reldens.getActiveScene();
            let objectsPlugin = window.reldens.getFeature('objects');
            let entries = scene.interpolateObjectsPositions;
            let animation = scene.objectsAnimations[args.objectKey];
            let bodyState = window.reldens.activeRoomEvents.room.state.bodies.get(args.objectKey);
            let bulletKey = 'e2e-interpolation-bullet';
            let bulletSprite = {x: args.bulletStart, y: args.bulletStart};
            let probedKeys = [bulletKey, args.objectKey];
            let readPosition = (target) => ({x: target.x, y: target.y});
            let readProbedKeys = () => Object.keys(entries).filter(key => probedKeys.includes(key));
            let craftBody = (x, y, mov) => ({x, y, mov, inState: bodyState.inState, dir: bodyState.dir});
            let runObjectsInterpolation = () => ({
                returned: scene.processObjectsPositionInterpolation(),
                keys: readProbedKeys(),
                bullet: readPosition(bulletSprite),
                object: readPosition(animation),
                objectSprite: readPosition(animation.sceneSprite)
            });
            objectsPlugin.bullets[bulletKey] = bulletSprite;
            let results = {
                start: readPosition(animation),
                bulletStart: readPosition(bulletSprite),
                interpolationSpeed: scene.interpolationSpeed,
                withoutEntries: scene.processObjectsPositionInterpolation(),
                notBullet: scene.interpolateBulletPosition(args.objectKey, objectsPlugin),
                bulletWithoutEntry: scene.interpolateBulletPosition(bulletKey, objectsPlugin),
                objectWithoutEntry: scene.interpolateObjectAnimationPosition(args.objectKey, objectsPlugin)
            };
            entries['e2e-missing-bullet'] = craftBody(1, 1, true);
            entries['e2e-missing-object'] = craftBody(1, 1, true);
            results.missing = {
                bullet: scene.interpolateBulletPosition('e2e-missing-bullet', objectsPlugin),
                object: scene.interpolateObjectAnimationPosition('e2e-missing-object', objectsPlugin),
                isBulletEntryKept: Boolean(entries['e2e-missing-bullet']),
                isObjectEntryKept: Boolean(entries['e2e-missing-object'])
            };
            delete entries['e2e-missing-bullet'];
            delete entries['e2e-missing-object'];
            entries[bulletKey] = craftBody(bulletSprite.x, bulletSprite.y, true);
            entries[args.objectKey] = craftBody(animation.x, animation.y, true);
            results.current = runObjectsInterpolation();
            let bulletMoving = craftBody(bulletSprite.x + args.bulletStep.x, bulletSprite.y + args.bulletStep.y, true);
            let objectMoving = craftBody(animation.x + args.objectStep.x, animation.y + args.objectStep.y, true);
            entries[bulletKey] = bulletMoving;
            entries[args.objectKey] = objectMoving;
            results.moving = {
                bulletState: readPosition(bulletMoving),
                objectState: readPosition(objectMoving),
                ...runObjectsInterpolation()
            };
            entries[bulletKey] = craftBody(bulletMoving.x, bulletMoving.y, false);
            entries[args.objectKey] = bodyState;
            results.stopped = {
                body: {x: bodyState.x, y: bodyState.y, mov: bodyState.mov},
                ...runObjectsInterpolation()
            };
            delete objectsPlugin.bullets[bulletKey];
            return results;
        }, {
            objectKey,
            bulletStart: SceneInterpolationProbe.CRAFTED_BULLET_START,
            bulletStep: {x: SceneInterpolationProbe.CRAFTED_BULLET_STEP_X, y: SceneInterpolationProbe.CRAFTED_BULLET_STEP_Y},
            objectStep: {x: SceneInterpolationProbe.CRAFTED_STEP_X, y: SceneInterpolationProbe.CRAFTED_STEP_Y}
        });
    }

    static async readLayersDepths(page)
    {
        return await page.evaluate(() => {
            let scene = window.reldens.getActiveScene();
            if(!scene?.map){
                return false;
            }
            let layersData = {
                mapLayersCount: scene.map.layers.length,
                mapHeight: scene.map.height,
                tileHeight: scene.map.tileHeight,
                belowPlayerDepth: window.reldens.config.get('client/map/layersDepth/belowPlayer'),
                changePointsDepth: window.reldens.config.get('client/map/layersDepth/changePoints'),
                layers: []
            };
            for(let layerIndex of Object.keys(scene.layers)){
                layersData.layers.push({
                    layerIndex: Number(layerIndex),
                    name: scene.layers[layerIndex].layer.name,
                    depth: scene.layers[layerIndex].depth
                });
            }
            return layersData;
        });
    }

    static expectedLayerDepth(layer, layersData)
    {
        let depth = 0;
        if(-1 !== layer.name.indexOf('below-player')){
            depth = layersData.belowPlayerDepth;
        }
        if(-1 !== layer.name.indexOf('over-player')){
            depth = layer.layerIndex * layersData.mapHeight * layersData.tileHeight;
        }
        if(-1 !== layer.name.indexOf('change-points')){
            depth = layersData.changePointsDepth;
        }
        return depth;
    }

}

module.exports.SceneInterpolationProbe = SceneInterpolationProbe;
