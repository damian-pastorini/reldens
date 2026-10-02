/**
 *
 * Reldens - Test Stored Object Animation Frame Ranges
 *
 */

const { BaseTest } = require('./base-test');
const { Utils } = require('./utils');
const { ObjectAnimationsBuilder } = require('./fixtures/object-animations-builder');
const { ObjectsManager } = require('../lib/objects/server/manager');
const { sc } = require('@reldens/utils');

class TestStoredObjectAnimationFrameRanges extends BaseTest
{

    async testStoredAnimationsKeepTheirFramesWhenTheObjectFramesStartLater()
    {
        await this.test('the stored object animations keep their frames when the object frames start after them', async () => {
            let animationRows = await this.loadStoredAnimationRows();
            let firstFrameRows = animationRows.filter(row => 0 === sc.toJson(row.animationData, {}).start);
            this.assert.notStrictEqual(0, firstFrameRows.length, 'The test data has no animation starting on frame 0.');
            let indexedRows = this.indexAnimationRows(animationRows);
            let createdRanges = {};
            for(let objectId of Object.keys(indexedRows.rowsByObject)){
                Object.assign(createdRanges, this.buildCreatedRanges(objectId, indexedRows.rowsByObject[objectId]));
            }
            this.assert.deepStrictEqual(createdRanges, indexedRows.storedRanges);
        });
    }

    async loadStoredAnimationRows()
    {
        let dataServer = Utils.createDataServer(this.config);
        await dataServer.connect();
        dataServer.generateEntities();
        let animationRows = await dataServer.getEntity('objectsAnimations').loadAll();
        await dataServer.disconnect();
        return animationRows;
    }

    indexAnimationRows(animationRows)
    {
        let indexedRows = {rowsByObject: {}, storedRanges: {}};
        for(let row of animationRows){
            if(!indexedRows.rowsByObject[row.object_id]){
                indexedRows.rowsByObject[row.object_id] = [];
            }
            indexedRows.rowsByObject[row.object_id].push(row);
            let animationData = sc.toJson(row.animationData, {});
            indexedRows.storedRanges[row.animationKey] = {start: animationData.start, end: animationData.end};
        }
        return indexedRows;
    }

    buildCreatedRanges(objectId, objectRows)
    {
        let objectInstance = {};
        let objectsManager = new ObjectsManager({config: {}, events: {}, dataServer: {}});
        objectsManager.enrichWithMultipleAnimationsData({related_objects_animations: objectRows}, objectInstance);
        let laterFrame = Math.max(...objectRows.map(row => sc.toJson(row.animationData, {}).end)) + 1;
        let createdAnimations = ObjectAnimationsBuilder.build(
            {key: 'object_'+objectId, id: objectId, frameStart: laterFrame, frameEnd: laterFrame},
            objectInstance.multipleAnimations
        );
        let createdRanges = {};
        for(let animationKey of Object.keys(createdAnimations)){
            createdRanges[animationKey] = createdAnimations[animationKey].frames;
        }
        return createdRanges;
    }

}

module.exports.TestStoredObjectAnimationFrameRanges = TestStoredObjectAnimationFrameRanges;
