/**
 *
 * Reldens - Test Admin Rooms View Actions
 *
 * Tests the actions posted from the admin room view: the room set as default updates the config, enables the room and
 * changes the runtime default room, a failed save or enable answers errorSaveDefault, the rooms link creates the change
 * point and return point rows, a missing link field answers its own error, the change points layer is written to the
 * map or answers errorWriteMapLayer keeping the link rows, and the default return point is created or its missing
 * position answered.
 *
 */

const { BaseTest } = require('./base-test');
const { RoomsEntitySubscriber } = require('../lib/admin/server/subscribers/rooms-entity-subscriber');
const { RoomsConst } = require('../lib/rooms/constants');

class TestAdminRoomsViewActions extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.roomId = '41';
        this.nextRoomId = '114';
        this.viewRedirect = '/reldens-admin/rooms/view?id=41&result=';
        this.linkBody = {
            createRoomsLink: '1',
            currentRoomChangePointTileIndex: '2078',
            nextRoomSelector: this.nextRoomId,
            nextRoomPositionX: '640',
            nextRoomPositionY: '400'
        };
    }

    createViewSetup(results)
    {
        let setup = Object.assign({updates: [], enabled: [], changePoints: [], returnPoints: [], layers: [], routes: []}, results);
        setup.initialState = {room_id: 4};
        let subscriber = Object.create(RoomsEntitySubscriber.prototype);
        Object.assign(subscriber, {
            dataServer: {},
            isAuthenticated: (req, res, next) => next(),
            generateViewRouteContent: async () => 'view-contents',
            config: {getWithoutLogs: () => setup.initialState},
            configRepository: {update: async (filters, data) => setup.updates.push([filters, data]) && setup.updateResult},
            roomEnabler: {enableById: async (roomId) => setup.enabled.push(roomId) && setup.enableResult},
            roomsChangePointsRepository: {create: async (row) => setup.changePoints.push(row) && setup.changePointResult},
            roomsReturnPointsRepository: {create: async (row) => setup.returnPoints.push(row) && setup.returnPointResult},
            roomsMapDataProvider: {loadRoomsMapList: async () => [
                {id: 41, name: 'reldens-new-age-town', mapFile: 'reldens-new-age-town.json'},
                {id: 114, name: 'reldens-forest', mapFile: 'reldens-forest.json'}
            ]},
            changePointsLayerWriter: {write: async (mapFile, tileIndex, nextRoomName) => setup.layers.push([mapFile, tileIndex, nextRoomName]) && setup.layerResult}
        });
        subscriber.setupRoomsSpecificRoutes(
            {post: (path, isAuthenticated, callback) => setup.routes.push(callback)},
            '/reldens-admin',
            '/view',
            '/rooms',
            {}
        );
        return setup;
    }

    async postView(setup, body)
    {
        let redirects = [];
        await setup.routes[0]({query: {id: this.roomId}, body}, {redirect: (path) => redirects.push(path), send: () => true});
        return redirects.shift().replace(this.viewRedirect, '');
    }

    async testTheRoomSetAsDefaultChangesTheRuntimeDefault()
    {
        await this.test('a room set as default updates the config, enables the room and changes the runtime default room', async () => {
            let setup = this.createViewSetup({updateResult: true, enableResult: true});
            this.assert.deepStrictEqual(
                [await this.postView(setup, {setAsDefault: '1'}), setup.updates, setup.enabled, setup.initialState.room_id],
                ['success', [[{path: RoomsConst.DEFAULT_ROOM_CONFIG_PATH}, {value: this.roomId}]], [this.roomId], 41]
            );
        });
    }

    async testAFailedDefaultSaveKeepsTheRuntimeDefault()
    {
        await this.test('a failed default save or room enable answers errorSaveDefault and keeps the runtime default room', async () => {
            let results = [];
            for(let saveResults of [{updateResult: false, enableResult: true}, {updateResult: true, enableResult: false}]){
                let setup = this.createViewSetup(saveResults);
                results.push([await this.postView(setup, {setAsDefault: '1'}), setup.initialState.room_id]);
            }
            this.assert.deepStrictEqual(results, [['errorSaveDefault', 4], ['errorSaveDefault', 4]]);
        });
    }

    async testTheRoomsLinkCreatesItsRowsOrAnswersTheMissingField()
    {
        await this.test('the rooms link creates the change point and return point rows and a missing field answers its error', async () => {
            let setup = this.createViewSetup({changePointResult: true, returnPointResult: true});
            let linkResult = await this.postView(setup, this.linkBody);
            let missingResults = [];
            for(let missingField of ['currentRoomChangePointTileIndex', 'nextRoomSelector', 'nextRoomPositionX', 'nextRoomPositionY']){
                missingResults.push(await this.postView(this.createViewSetup({}), Object.assign({}, this.linkBody, {[missingField]: ''})));
            }
            this.assert.deepStrictEqual(
                [linkResult, setup.changePoints, setup.returnPoints, missingResults],
                [
                    'success',
                    [{room_id: this.roomId, tile_index: '2078', next_room_id: this.nextRoomId}],
                    [{room_id: this.nextRoomId, direction: 'down', x: '640', y: '400', is_default: false, from_room_id: this.roomId}],
                    ['errorMissingTileIndex', 'errorMissingNextRoom', 'errorMissingRoomX', 'errorMissingRoomY']
                ]
            );
        });
    }

    async testTheChangePointsLayerIsWrittenOrAnswersItsError()
    {
        await this.test('the change points layer is written to the map or answers errorWriteMapLayer keeping the link rows', async () => {
            let layerBody = Object.assign({createChangePointsLayer: '1'}, this.linkBody);
            let written = this.createViewSetup({changePointResult: true, returnPointResult: true, layerResult: true});
            let failed = this.createViewSetup({changePointResult: true, returnPointResult: true, layerResult: false});
            this.assert.deepStrictEqual(
                [
                    await this.postView(written, layerBody),
                    written.layers,
                    await this.postView(failed, layerBody),
                    [failed.changePoints.length, failed.returnPoints.length]
                ],
                ['success', [['reldens-new-age-town.json', '2078', 'reldens-forest']], 'errorWriteMapLayer', [1, 1]]
            );
        });
    }

    async testTheDefaultReturnPointIsCreatedFromTheRoomView()
    {
        await this.test('the default return point is created from the room view and a missing position answers its error', async () => {
            let setup = this.createViewSetup({returnPointResult: true});
            let created = await this.postView(setup, {createDefaultReturnPoint: '1', roomStartingPointX: '400', roomStartingPointY: '345'});
            let missing = await this.postView(this.createViewSetup({}), {createDefaultReturnPoint: '1', roomStartingPointX: '400'});
            this.assert.deepStrictEqual(
                [created, setup.returnPoints, missing],
                ['success', [{room_id: this.roomId, direction: 'down', x: '400', y: '345', is_default: true}], 'errorMissingStartingPoint']
            );
        });
    }

}

module.exports.TestAdminRoomsViewActions = TestAdminRoomsViewActions;
