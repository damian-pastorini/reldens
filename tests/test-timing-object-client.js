/**
 *
 * Reldens - Test Timing Object Client
 *
 * Tests the client TimingObject with the object animations timing context: a locked timing start shows the cancel
 * button over the object and listens to the Esc key, the button click and the Esc key (not while writing in an input)
 * send the timing cancel request with the interaction id, and the timing cancel or complete removes both; an unlocked
 * start shows nothing, a second locked start replaces the button and messages of other objects are ignored. The
 * interaction id is the object key for a respawn instance and the object id for an object with its own asset key, for
 * the object click and the cancel request.
 *
 */

const { BaseTest } = require('./base-test');
const { ObjectAnimationsBuilder } = require('./fixtures/object-animations-builder');
const { TimingObject } = require('../lib/objects/client/object/type/timing-object');
const { ObjectsConst } = require('../lib/objects/constants');
const { GameConst } = require('../lib/game/constants');

class TestTimingObjectClient extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.instanceProps = {id: 16, key: 'mining_rocks_7_0', asset_key: 'rock_forest_1', timingDuration: 5000};
        this.ownAssetProps = {id: 7, key: 'chest', asset_key: 'chest', timingDuration: 5000};
        this.spritePosition = {x: 100, y: 200, height: 32};
    }

    createTimingSetup(objectProps = this.instanceProps)
    {
        let context = ObjectAnimationsBuilder.createTimingContext({});
        let timingObject = new TimingObject(context.gameManager, objectProps, context.preloader);
        timingObject.sceneSprite = Object.assign({}, this.spritePosition);
        return {context, timingObject};
    }

    pressEscape(context)
    {
        for(let listener of [...context.keyboardListeners]){
            listener.callback.call(listener.callbackContext);
        }
    }

    async testLockedStartShowsTheCancelButtonAndTheEscKey()
    {
        await this.test('a locked start shows the cancel button and the Esc key, both send the cancel request', async () => {
            let timingSetup = this.createTimingSetup();
            let timingObject = timingSetup.timingObject;
            let context = timingSetup.context;
            timingObject.onTimingMessage({act: 'timingStart', key: timingObject.key, locked: true});
            let cancelButton = timingObject.cancelButton;
            this.assert.deepStrictEqual(
                [cancelButton.x, cancelButton.y, cancelButton.text, cancelButton.style],
                [
                    this.spritePosition.x,
                    this.spritePosition.y - this.spritePosition.height / 2 - timingObject.cancelButtonOffsetY,
                    timingObject.cancelButtonText,
                    timingObject.cancelButtonStyle
                ]
            );
            this.assert.deepStrictEqual(
                [cancelButton.origin, cancelButton.depth, cancelButton.interactive],
                [[0.5, 1], timingObject.cancelButtonDepth, {useHandCursor: true}]
            );
            this.assert.deepStrictEqual(context.keyboardListeners.map(listener => listener.eventName), ['keydown-ESC']);
            cancelButton.listeners.pointerdown();
            this.pressEscape(context);
            context.isInsideInput = true;
            this.pressEscape(context);
            let cancelRequest = {act: ObjectsConst.TIMING_CANCEL_REQUEST, id: this.instanceProps.key};
            this.assert.deepStrictEqual(context.sentMessages, [cancelRequest, cancelRequest]);
            timingObject.onTimingMessage({act: 'timingCancel', key: timingObject.key});
            this.assert.deepStrictEqual(
                [cancelButton.destroyed, timingObject.cancelButton, context.keyboardListeners, timingObject.timingBarInterval],
                [true, null, [], null]
            );
        });
    }

    async testUnlockedStartShowsNoCancelButton()
    {
        await this.test('an unlocked start shows no cancel button nor Esc key and the complete ends the bar', async () => {
            let timingSetup = this.createTimingSetup();
            let timingObject = timingSetup.timingObject;
            let context = timingSetup.context;
            timingObject.onTimingMessage({act: 'timingStart', key: timingObject.key, locked: false});
            this.assert.deepStrictEqual([timingObject.cancelButton, context.texts, context.keyboardListeners], [null, [], []]);
            this.assert.notStrictEqual(timingObject.timingBarInterval, null);
            timingObject.onTimingMessage({act: 'timingComplete', key: timingObject.key});
            this.assert.deepStrictEqual([timingObject.cancelButton, timingObject.timingBarInterval], [null, null]);
        });
    }

    async testSecondLockedStartReplacesTheCancelButton()
    {
        await this.test('a second locked start replaces the button, the complete removes it, other objects are ignored', async () => {
            let timingSetup = this.createTimingSetup();
            let timingObject = timingSetup.timingObject;
            let context = timingSetup.context;
            timingObject.onTimingMessage({act: 'timingStart', key: 'other_object', locked: true});
            this.assert.deepStrictEqual([timingObject.cancelButton, context.texts], [null, []]);
            timingObject.onTimingMessage({act: 'timingStart', key: timingObject.key, locked: true});
            timingObject.onTimingMessage({act: 'timingStart', key: timingObject.key, locked: true});
            this.assert.deepStrictEqual(context.texts.map(text => text.destroyed), [true, false]);
            this.assert.strictEqual(context.keyboardListeners.length, 1);
            timingObject.onTimingMessage({act: 'timingComplete', key: timingObject.key});
            this.assert.deepStrictEqual(
                [context.texts.map(text => text.destroyed), timingObject.cancelButton, context.keyboardListeners],
                [[true, true], null, []]
            );
        });
    }

    async testInteractionIdForInstancesAndOwnAssetObjects()
    {
        await this.test('the click and the cancel request send the instance key or the own asset object id', async () => {
            let idCases = [
                {objectProps: this.instanceProps, expectedId: this.instanceProps.key},
                {objectProps: this.ownAssetProps, expectedId: this.ownAssetProps.id}
            ];
            for(let idCase of idCases){
                let timingSetup = this.createTimingSetup(
                    Object.assign({isInteractive: true, type: 'timing'}, idCase.objectProps)
                );
                let timingObject = timingSetup.timingObject;
                let sprite = ObjectAnimationsBuilder.createSprite(this.spritePosition.x, this.spritePosition.y, 'rock');
                timingObject.sceneSprite = sprite;
                timingObject.enableInteraction();
                sprite.listeners.pointerdown({downElement: {nodeName: GameConst.SELECTORS.CANVAS}});
                timingObject.sendCancelRequest();
                this.assert.deepStrictEqual(timingSetup.context.sentMessages, [
                    {act: ObjectsConst.OBJECT_INTERACTION, id: idCase.expectedId, type: 'timing'},
                    {act: ObjectsConst.TIMING_CANCEL_REQUEST, id: idCase.expectedId}
                ]);
            }
        });
    }

}

module.exports.TestTimingObjectClient = TestTimingObjectClient;
