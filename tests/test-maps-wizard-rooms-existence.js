/**
 *
 * Reldens - Test Maps Wizard Rooms Existence
 *
 * Tests the maps wizard check of the generated rooms before the import: the admin rooms exist endpoint
 * (MapsRoomsExistenceSubscriber) answers only the requested map names that already have a room, and the wizard page
 * generate guard (theme/admin/js/maps-wizard/maps-wizard-generate-guard.js) stops the form submit, asks the endpoint
 * for the map names of the generator data and shows the override confirmation for the existing ones (the plain
 * generate confirmation when none exists), submitting the form only once confirmed.
 *
 */

const { BaseTest } = require('./base-test');
const { AdminBrowserScriptLoader } = require('./fixtures/admin-browser-script-loader');
const { MapsRoomsExistenceSubscriber } = require('../lib/admin/server/subscribers/maps-rooms-existence-subscriber');
const { sc } = require('@reldens/utils');

class TestMapsWizardRoomsExistence extends BaseTest
{

    createRoomsRepository(existingRooms, requestedNames)
    {
        return {loadOneBy: async (field, name) => {
            requestedNames.push(name);
            return -1 !== existingRooms.indexOf(name) ? {name} : null;
        }};
    }

    createSubscriber(existingRooms, requestedNames)
    {
        return new MapsRoomsExistenceSubscriber({
            events: {on: () => true},
            dataServer: {getEntity: () => this.createRoomsRepository(existingRooms, requestedNames)},
            router: {isAuthenticated: () => true}
        });
    }

    async testTheEndpointAnswersOnlyTheExistingRooms()
    {
        await this.test('the rooms exist endpoint answers only the requested map names that have a room', async () => {
            let requestedNames = [];
            let subscriber = this.createSubscriber(['town', 'forest'], requestedNames);
            let answers = [];
            let response = {json: (data) => answers.push(data)};
            await subscriber.handleRoomsExist({query: {names: ' town , ,missing,forest '}}, response);
            await subscriber.handleRoomsExist({query: {}}, response);
            this.assert.deepStrictEqual(answers, [{existing: ['town', 'forest']}, {existing: []}]);
            this.assert.deepStrictEqual(requestedNames, ['town', 'missing', 'forest']);
        });
    }

    async submitWizardForm(generatorData, existingAnswer)
    {
        let page = {listeners: {}, fetchedUrls: [], confirmations: [], submits: 0, prevented: false};
        let GuardClass = AdminBrowserScriptLoader.loadClass('maps-wizard/maps-wizard-generate-guard.js', 'MapsWizardGenerateGuard', {
            document: {addEventListener: (eventType, callback) => page.listeners[eventType] = callback},
            window: {mapsWizardUtils: {readGeneratorDataValue: () => sc.toJsonString(generatorData)}},
            fetch: async (url) => {
                page.fetchedUrls.push(url);
                return {json: async () => existingAnswer};
            },
            adminFunctions: {showConfirmDialog: (callback, options) => {
                page.confirmations.push(options.title);
                callback(true);
            }}
        });
        new GuardClass();
        page.listeners.submit({
            target: {id: 'maps-wizard-form', getAttribute: () => '/reldens-admin/maps-wizard', submit: () => page.submits++},
            preventDefault: () => page.prevented = true,
            stopImmediatePropagation: () => true
        });
        for(let microtask = 0; microtask < 5; microtask++){
            await Promise.resolve();
        }
        return page;
    }

    async testTheGuardAsksForTheExistingRoomsBeforeTheSubmit()
    {
        await this.test('the wizard guard asks for the existing rooms and confirms the override before the submit', async () => {
            let page = await this.submitWizardForm({mapName: 'town', mapNames: 'forest, town'}, {existing: ['town']});
            this.assert.deepStrictEqual(
                [page.prevented, page.fetchedUrls, page.confirmations, page.submits],
                [
                    true,
                    ['/reldens-admin/maps-wizard/api/rooms-exist?names='+encodeURIComponent('town,forest')],
                    ['Map name already exists'],
                    1
                ]
            );
            let newPage = await this.submitWizardForm({mapName: 'new-map'}, {existing: []});
            this.assert.deepStrictEqual([newPage.confirmations, newPage.submits], [['Generate Maps'], 1]);
        });
    }

}

module.exports.TestMapsWizardRoomsExistence = TestMapsWizardRoomsExistence;
