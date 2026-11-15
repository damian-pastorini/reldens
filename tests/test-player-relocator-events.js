/**
 *
 * Reldens - Test Player Relocator Events
 *
 * Tests the event a relocation to another room emits so the features keep the player data a change point keeps (like
 * the team): the relocation to another room emits "reldens.playerRelocateToRoom" once, with the player and the change
 * data, after the state save and before the changing scene broadcast; a relocation in the same room, a state save error
 * and an unavailable destination room emit nothing.
 *
 */

const { BaseTest } = require('./base-test');
const { RelocationRoomBuilder } = require('./fixtures/relocation-room-builder');
const { PlayerRelocator } = require('../lib/rooms/server/player-relocator');

class TestPlayerRelocatorEvents extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.roomBuilder = new RelocationRoomBuilder();
    }

    async relocateFromTown(destinationRoomName, options)
    {
        let setup = this.roomBuilder.build(this.roomBuilder.townRoom.roomName, options);
        await new PlayerRelocator(setup.room).relocate(setup.client, setup.playerSchema, destinationRoomName);
        return setup;
    }

    async testAnotherRoomRelocationEmitsTheEventBeforeTheBroadcasts()
    {
        await this.test('another room relocation emits its event after the save, before the broadcasts', async () => {
            let townRoom = this.roomBuilder.townRoom;
            let forestRoom = this.roomBuilder.forestRoom;
            let setup = await this.relocateFromTown(forestRoom.roomName, {});
            this.assert.deepStrictEqual(
                setup.room.events.emittedEvents.map((emitted) => [
                    emitted.eventName,
                    emitted.event.playerSchema,
                    emitted.event.playerBody,
                    emitted.event.changeData,
                    emitted.broadcastsCount
                ]),
                [[
                    'reldens.playerRelocateToRoom',
                    setup.playerSchema,
                    setup.playerBody,
                    {prev: townRoom.roomName, next: forestRoom.roomName},
                    0
                ]]
            );
            this.assert.deepStrictEqual([setup.savedStates, setup.broadcasts.length], [1, 1]);
        });
    }

    async testNoSceneChangeEmitsNoEvent()
    {
        await this.test('a same room move, a save error or an unavailable room emit no event', async () => {
            let forestRoomName = this.roomBuilder.forestRoom.roomName;
            let setups = [
                await this.relocateFromTown(this.roomBuilder.townRoom.roomName, {}),
                await this.relocateFromTown(forestRoomName, {saveResult: false}),
                await this.relocateFromTown(forestRoomName, {isRoomAvailable: false})
            ];
            this.assert.deepStrictEqual(setups.map((setup) => setup.room.events.emittedEvents), [[], [], []]);
        });
    }

}

module.exports.TestPlayerRelocatorEvents = TestPlayerRelocatorEvents;
