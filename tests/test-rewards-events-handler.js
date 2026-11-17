/**
 *
 * Reldens - Test Rewards Events Handler
 *
 */

const { BaseTest } = require('./base-test');
const { RewardsEventsHandler } = require('../lib/rewards/server/rewards-events-handler');

class TestRewardsEventsHandler extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.eventKey = 'reldens.joinRoomEnd';
        this.eventData = '{"action":"dailyLogin","items":{"coins":1}}';
        this.pastDate = '2000-01-01 00:00:00';
        this.futureDate = '2999-01-01 00:00:00';
    }

    createEventsHandler(rewardsEvents)
    {
        let setup = {boundEvents: [], handledRewards: []};
        let repositories = {
            rewardsEvents: {load: async () => rewardsEvents.map(row => Object.assign({}, row))},
            rewardsEventsState: {},
            itemsItem: {load: async () => []}
        };
        setup.eventsHandler = new RewardsEventsHandler({
            events: {on: (eventKey, callback) => setup.boundEvents.push({eventKey, callback})},
            config: {getWithoutLogs: (path, defaultValue) => defaultValue},
            dataServer: {getEntity: (entityName) => repositories[entityName]}
        });
        setup.eventsHandler.handlers.login = {
            updateEventState: async (reward) => {
                setup.handledRewards.push(reward.id);
                return true;
            }
        };
        return setup;
    }

    createLoginEvents()
    {
        return [
            {id: 1, handler_key: 'login', event_key: this.eventKey, event_data: this.eventData},
            {id: 2, handler_key: 'login', event_key: this.eventKey, event_data: this.eventData, active_from: this.futureDate},
            {id: 3, handler_key: 'login', event_key: this.eventKey, event_data: this.eventData, active_to: this.pastDate}
        ];
    }

    async fireBoundEvents(setup)
    {
        for(let boundEvent of setup.boundEvents){
            await boundEvent.callback({});
        }
    }

    async testEveryEnabledEventGetsItsListener()
    {
        await this.test('every enabled event gets its listener, the ended and not started ones too', async () => {
            let setup = this.createEventsHandler(this.createLoginEvents());
            await setup.eventsHandler.activateRewardsEvents();
            this.assert.deepStrictEqual(setup.boundEvents.map(boundEvent => boundEvent.eventKey), [
                this.eventKey,
                this.eventKey,
                this.eventKey
            ]);
        });
    }

    async testHandlerRunsOnlyInsideTheEventDates()
    {
        await this.test('the handler runs only for the events inside their dates, an event that starts later runs then', async () => {
            let setup = this.createEventsHandler(this.createLoginEvents());
            await setup.eventsHandler.activateRewardsEvents();
            await this.fireBoundEvents(setup);
            this.assert.deepStrictEqual(setup.handledRewards, [1]);
            setup.eventsHandler.activeRewards[1].active_from = this.pastDate;
            await this.fireBoundEvents(setup);
            this.assert.deepStrictEqual(setup.handledRewards, [1, 1, 2]);
        });
    }

}

module.exports.TestRewardsEventsHandler = TestRewardsEventsHandler;
