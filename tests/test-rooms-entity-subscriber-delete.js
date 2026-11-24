/**
 *
 * Reldens - Test Rooms Entity Subscriber Delete
 *
 * Tests the RoomsEntitySubscriber listener of reldens.adminAfterEntityDelete with a real EventsManager: the deleted
 * rooms are closed on the running server only when the admin delete succeeded, never when the storage delete failed
 * (a false or zero result) or the event carries no delete result, and the delete of another entity closes nothing.
 *
 */

const { BaseTest } = require('./base-test');
const { GameplayPlayerBuilder } = require('./fixtures/gameplay-player-builder');
const { RoomsEntitySubscriber } = require('../lib/admin/server/subscribers/rooms-entity-subscriber');
const { EventsManager } = require('@reldens/utils');

class TestRoomsEntitySubscriberDelete extends BaseTest
{

    createSubscriberSetup()
    {
        let subscriberSetup = {events: new EventsManager(), closedRooms: []};
        subscriberSetup.subscriber = new RoomsEntitySubscriber(
            {
                dataServer: {getEntity: () => ({})},
                events: subscriberSetup.events,
                router: {isAuthenticated: () => true},
                routerContents: {generateViewRouteContent: async () => ''}
            },
            GameplayPlayerBuilder.createConfigManager({}),
            {}
        );
        subscriberSetup.subscriber.deletedRoomCloser.closeRooms = async (roomIds) => {
            subscriberSetup.closedRooms.push(roomIds);
            return true;
        };
        return subscriberSetup;
    }

    async testTheDeletedRoomsAreClosedOnlyWhenTheDeleteDidNotFail()
    {
        await this.test('the deleted rooms are closed only when the delete succeeded, never when it failed or sent no result', async () => {
            let deleteCases = [
                {event: {deleteResult: 1}, closedRooms: [['5']]},
                {event: {deleteResult: true}, closedRooms: [['5']]},
                {event: {}, closedRooms: []},
                {event: {deleteResult: false}, closedRooms: []},
                {event: {deleteResult: 0}, closedRooms: []},
                {event: {deleteResult: 1, entityId: 'objects'}, closedRooms: []}
            ];
            let results = [];
            for(let deleteCase of deleteCases){
                let subscriberSetup = this.createSubscriberSetup();
                let entityId = deleteCase.event.entityId || 'rooms';
                await subscriberSetup.events.emit('reldens.adminAfterEntityDelete', Object.assign(
                    {driverResource: {id: () => entityId}, ids: ['5']},
                    deleteCase.event
                ));
                results.push(subscriberSetup.closedRooms);
            }
            this.assert.deepStrictEqual(results, deleteCases.map(deleteCase => deleteCase.closedRooms));
        });
    }

}

module.exports.TestRoomsEntitySubscriberDelete = TestRoomsEntitySubscriberDelete;
