/**
 *
 * Reldens - Object Animation Frame Ranges Reader
 *
 * Reads, from the active scene, the frames range stored for each object animation and the frames range of the
 * animation created on the client; the frames range created on the client for the given animations keys; the default
 * animation frames range of the scene objects with the given asset keys; and, from the stored rows, the frame start and
 * end of the objects with the given client keys and the animations frames of every enabled object of a room (its client
 * params animations and its objects animations rows), expected created on the client with those frames. The animations
 * without a numeric start or end are skipped, the object frames are used for them.
 *
 */

const { expect } = require('@playwright/test');
const { E2eSeedAndRestoreApi } = require('./e2e-seed-and-restore-api');
const { sc } = require('@reldens/utils');

class ObjectAnimationFrameRangesReader
{

    static mapRange = (key, animationData) => ({key, start: animationData.start, end: animationData.end});

    static filterNumericRanges = (ranges) => ranges.filter(
        range => 'number' === typeof range.start && 'number' === typeof range.end
    );

    static async pairCreatedRanges(page, entries, keyName, pairEntry)
    {
        return (await ObjectAnimationFrameRangesReader.fetchCreatedRanges(page, entries.map(entry => entry[keyName]))).map(
            (createdRange, entryIndex) => pairEntry(entries[entryIndex], createdRange)
        );
    }

    static async fetchSceneStoredRanges(page)
    {
        return page.evaluate(() => {
            let scene = window.reldens.getActiveScene();
            let storedAnimations = {};
            for(let objectKey of Object.keys(scene.objectsAnimationsData)){
                Object.assign(storedAnimations, scene.objectsAnimationsData[objectKey].animations || {});
            }
            let pageRanges = [];
            for(let animationKey of Object.keys(storedAnimations)){
                let storedAnimation = storedAnimations[animationKey];
                pageRanges.push({key: animationKey, start: storedAnimation.start, end: storedAnimation.end});
            }
            return pageRanges;
        });
    }

    static async fetchStoredAndCreated(page)
    {
        return ObjectAnimationFrameRangesReader.pairCreatedRanges(
            page,
            ObjectAnimationFrameRangesReader.filterNumericRanges(await ObjectAnimationFrameRangesReader.fetchSceneStoredRanges(page)),
            'key',
            (storedRange, createdRange) => ({stored: storedRange, created: createdRange})
        );
    }

    static async fetchCreatedRanges(page, animationsKeys)
    {
        return page.evaluate((keys) => {
            let anims = window.reldens.getActiveScene().anims;
            let createdRanges = [];
            for(let key of keys){
                let createdFrames = anims.get(key)?.frames || [];
                createdRanges.push({
                    key,
                    start: [...createdFrames].shift()?.textureFrame ?? null,
                    end: [...createdFrames].pop()?.textureFrame ?? null
                });
            }
            return createdRanges;
        }, animationsKeys);
    }

    static async fetchSceneDefaultAnimations(page, assetKeys)
    {
        return page.evaluate((keys) => {
            let objectsAnimations = window.reldens.getActiveScene().objectsAnimations;
            let animations = [];
            for(let objectKey of Object.keys(objectsAnimations)){
                let assetKey = objectsAnimations[objectKey].asset_key;
                if(-1 !== keys.indexOf(assetKey)){
                    animations.push({assetKey, animationKey: objectsAnimations[objectKey].key});
                }
            }
            return animations;
        }, assetKeys);
    }

    static async fetchDefaultRanges(page, assetKeys)
    {
        return ObjectAnimationFrameRangesReader.pairCreatedRanges(
            page,
            await ObjectAnimationFrameRangesReader.fetchSceneDefaultAnimations(page, assetKeys),
            'animationKey',
            (animation, createdRange) => Object.assign({}, createdRange, {key: animation.assetKey})
        );
    }

    static async fetchStoredDefaultRanges(gameConfig, clientKeys)
    {
        let storedRanges = {};
        for(let clientKey of clientKeys){
            let objectRow = [...await E2eSeedAndRestoreApi.loadRows(gameConfig, 'objects', {client_key: clientKey})].shift();
            let clientParams = sc.toJson(objectRow?.client_params, {});
            storedRanges[clientKey] = {key: clientKey, start: clientParams.frameStart, end: clientParams.frameEnd};
        }
        return storedRanges;
    }

    static async fetchStoredRoomAnimations(gameConfig, roomName)
    {
        let roomId = await E2eSeedAndRestoreApi.fetchRowId(gameConfig, 'rooms', {name: roomName});
        let storedRanges = [];
        for(let objectRow of await E2eSeedAndRestoreApi.loadRows(gameConfig, 'objects', {room_id: roomId, enabled: 1})){
            let clientAnimations = sc.get(sc.toJson(objectRow.client_params, {}), 'animations', {});
            for(let animationKey of Object.keys(clientAnimations)){
                storedRanges.push(ObjectAnimationFrameRangesReader.mapRange(animationKey, clientAnimations[animationKey]));
            }
            let animationsRows = await E2eSeedAndRestoreApi.loadRows(gameConfig, 'objectsAnimations', {object_id: objectRow.id});
            for(let animationRow of animationsRows){
                storedRanges.push(
                    ObjectAnimationFrameRangesReader.mapRange(animationRow.animationKey, sc.toJson(animationRow.animationData, {}))
                );
            }
        }
        return ObjectAnimationFrameRangesReader.filterNumericRanges(storedRanges);
    }

    static async expectRoomFramesCreated(page, gameConfig, roomName, timeout)
    {
        let storedRanges = await ObjectAnimationFrameRangesReader.fetchStoredRoomAnimations(gameConfig, roomName);
        expect(storedRanges.length, 'The '+roomName+' objects have stored animations frames').toBeGreaterThan(0);
        await expect.poll(
            async () => ObjectAnimationFrameRangesReader.fetchCreatedRanges(page, storedRanges.map(range => range.key)),
            {message: 'The '+roomName+' objects animations are created with their stored frames', timeout}
        ).toEqual(storedRanges);
    }

}

module.exports.ObjectAnimationFrameRangesReader = ObjectAnimationFrameRangesReader;
