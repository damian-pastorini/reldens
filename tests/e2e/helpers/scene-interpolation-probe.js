/**
 *
 * Reldens - Scene Interpolation Probe
 *
 * Calls the interpolation methods of the live client scene with the entries the real movements never create, inside a
 * single page evaluation (so no game frame runs in the middle) and returns what each call did: an entry without state,
 * an entry without sprite, the update with the client interpolation disabled, the players interpolation without the
 * player engine, a bullet entry without bullet sprite, an object entry without animation, the entries already on the
 * sprite position, a moving entry and a stopped entry (the real state, so the sprites end where they started). The real
 * entries waiting for the next frame (a state update of any player or object received after the last frame) are set
 * aside during the evaluation and put back after it, so every branch runs only with the crafted entries. It also
 * reads the depth of every map layer the scene created, so the depths are compared with the layer name and index rules.
 * For the long run videos (SceneInterpolationShowcase) it reads the client interpolation values, the player depths, the
 * walkable tiles covered by the over player layers and the layer covering a tile, and it sets an entry that the real
 * frames process, so a moving entry and the stopped entry with the real state are visible on the screen.
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
            let pendingEntries = {...entries};
            for(let pendingKey of Object.keys(pendingEntries)){
                delete entries[pendingKey];
            }
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
            Object.assign(entries, pendingEntries);
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
            let pendingEntries = {...entries};
            for(let pendingKey of Object.keys(pendingEntries)){
                delete entries[pendingKey];
            }
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
            Object.assign(entries, pendingEntries);
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

    static async readPlayerDepths(page)
    {
        return await page.evaluate(() => {
            let room = window.reldens.activeRoomEvents.room;
            let playerSprite = window.reldens.getActiveScene().player.players[room.sessionId];
            if(!playerSprite){
                return false;
            }
            return {player: playerSprite.depth, name: playerSprite.nameSprite?.depth};
        });
    }

    static async findCoveredTiles(page, walkableTiles, coverOffsets, coverLayerName)
    {
        return await page.evaluate((args) => {
            let layers = window.reldens.getActiveScene().layers;
            return args.walkableTiles.filter(tile => !args.coverOffsets.some(offset => !Object.keys(layers).some(
                layerIndex => -1 !== layers[layerIndex].layer.name.indexOf(args.coverLayerName)
                    && layers[layerIndex].hasTileAt(tile[0] + offset[0], tile[1] + offset[1])
            )));
        }, {walkableTiles, coverOffsets, coverLayerName});
    }

    static async readCoveringLayer(page, tile, coverLayerName)
    {
        return await page.evaluate((args) => {
            let layers = window.reldens.getActiveScene().layers;
            let layerIndex = Object.keys(layers).find(
                index => -1 !== layers[index].layer.name.indexOf(args.coverLayerName)
                    && layers[index].hasTileAt(args.tile[0], args.tile[1])
            );
            if(!layerIndex){
                return false;
            }
            return {
                layerIndex: Number(layerIndex),
                name: layers[layerIndex].layer.name,
                depth: layers[layerIndex].depth
            };
        }, {tile, coverLayerName});
    }

    static async setVisibleEntry(page, objectKey, interpolationSpeed, movingTo = false, isInterpolationEnabled = true)
    {
        await page.evaluate((args) => {
            let scene = window.reldens.getActiveScene();
            let room = window.reldens.activeRoomEvents.room;
            let target = args.objectKey
                ? {
                    key: args.objectKey,
                    realState: room.state.bodies.get(args.objectKey),
                    entries: scene.interpolateObjectsPositions
                }
                : {
                    key: room.sessionId,
                    realState: room.state.players.get(room.sessionId).state,
                    entries: scene.interpolatePlayersPosition
                };
            scene.interpolationSpeed = args.interpolationSpeed;
            scene.clientInterpolation = args.isInterpolationEnabled;
            target.entries[target.key] = args.movingTo
                ? {
                    x: args.movingTo.x,
                    y: args.movingTo.y,
                    mov: true,
                    dir: target.realState.dir,
                    inState: target.realState.inState
                }
                : target.realState;
        }, {objectKey, interpolationSpeed, movingTo, isInterpolationEnabled});
    }

}

module.exports.SceneInterpolationProbe = SceneInterpolationProbe;
