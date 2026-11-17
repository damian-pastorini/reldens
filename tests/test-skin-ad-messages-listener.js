/**
 *
 * Reldens - Test Skin Ad Messages Listener
 *
 */

const { BaseTest } = require('./base-test');
const { SkinAdMessagesListener } = require('../lib/users/client/skin-ad-messages-listener');
const { UsersConst } = require('../lib/users/constants');

class TestSkinAdMessagesListener extends BaseTest
{

    createListener()
    {
        let emittedEvents = [];
        let listener = new SkinAdMessagesListener({
            events: {
                emit: async (eventName, message) => {
                    emittedEvents.push({eventName, message});
                    return true;
                }
            }
        });
        listener.emittedEvents = emittedEvents;
        return listener;
    }

    async testSkinAdMessageFiresTheSkinAdEvent()
    {
        await this.test('the skin ad message fires the skin ad event with the message', async () => {
            let listener = this.createListener();
            let message = {act: UsersConst.SKINS.ACTIONS.AD_START, adsId: 8};
            this.assert.strictEqual(await listener.onRoomMessage(message), true);
            let expectedEvent = {eventName: UsersConst.SKINS.EVENTS.AD_REQUESTED, message};
            this.assert.deepStrictEqual(listener.emittedEvents, [expectedEvent]);
        });
    }

    async testOtherMessagesFireNothing()
    {
        await this.test('the other room messages or an empty message fire nothing', async () => {
            let listener = this.createListener();
            this.assert.strictEqual(await listener.onRoomMessage({act: 'other'}), false);
            this.assert.strictEqual(await listener.onRoomMessage(false), false);
            this.assert.deepStrictEqual(listener.emittedEvents, []);
        });
    }

    async testRoomMessagesAreListened()
    {
        await this.test('the room messages are listened and handled', async () => {
            let listener = this.createListener();
            let roomHandlers = {};
            let room = {onMessage: (messageType, handler) => roomHandlers[messageType] = handler};
            this.assert.strictEqual(listener.listenRoomMessages(room), true);
            await roomHandlers['*']({act: UsersConst.SKINS.ACTIONS.AD_START, adsId: 8});
            this.assert.strictEqual(listener.emittedEvents.length, 1);
        });
    }

}

module.exports.TestSkinAdMessagesListener = TestSkinAdMessagesListener;
