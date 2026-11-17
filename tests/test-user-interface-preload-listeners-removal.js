/**
 *
 * Reldens - Test User Interface Preload Listeners Removal
 *
 * Tests the preload listeners of a user interface box: both listeners are removed even when the first one is not found
 * anymore, and a box without an events manager registers and removes nothing.
 *
 */

const { BaseTest } = require('./base-test');
const { UserInterface } = require('../lib/game/client/user-interface');

class TestUserInterfacePreloadListenersRemoval extends BaseTest
{

    createEvents()
    {
        let events = {registered: [], removed: []};
        events.on = (eventName, listener) => events.registered.push([eventName, listener]);
        events.off = (eventName, listener) => events.removed.push([eventName, listener]) && false;
        return events;
    }

    async testBothPreloadListenersAreRemoved()
    {
        await this.test('both preload listeners are removed even when the first one is not found', async () => {
            let events = this.createEvents();
            let userInterface = new UserInterface({events, gameDom: {}}, {id: 'teams'});
            this.assert.deepStrictEqual(
                [userInterface.removeEventsListeners(), events.removed],
                [true, events.registered]
            );
        });
    }

    async testABoxWithoutEventsRemovesNothing()
    {
        await this.test('a box without an events manager registers and removes no listeners', async () => {
            let userInterface = new UserInterface({gameDom: {}}, {id: 'teams'});
            this.assert.deepStrictEqual(
                [userInterface.removeEventsListeners(), userInterface.beforePreloadListener, userInterface.createPreloadListener],
                [false, null, null]
            );
        });
    }

}

module.exports.TestUserInterfacePreloadListenersRemoval = TestUserInterfacePreloadListenersRemoval;
