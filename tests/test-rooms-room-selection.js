/**
 *
 * Reldens - Test Rooms Room Selection
 *
 */

const { BaseTest } = require('./base-test');
const { RoomsPlugin } = require('../lib/rooms/server/plugin');
const { SceneSelectorBuilder } = require('../lib/rooms/client/scene-selector-builder');
const { SelectedSceneAppender } = require('../lib/rooms/client/selected-scene-appender');
const { ActionsConst } = require('../lib/actions/constants');
const { RoomsConst } = require('../lib/rooms/constants');
const { sc } = require('@reldens/utils');

class TestRoomsRoomSelection extends BaseTest
{

    createRoomsPlugin(selectionConfig)
    {
        let roomsPlugin = new RoomsPlugin();
        roomsPlugin.roomsManager = {
            selectionConfig,
            registrationAvailableRooms: [{name: 'registration-room', title: 'Registration'}],
            registrationAvailableRoomsGuest: [{name: 'guest-registration-room', title: 'Guest Registration'}],
            loginAvailableRooms: [{name: 'login-room', title: 'Login'}],
            loginAvailableRoomsGuest: [{name: 'guest-login-room', title: 'Guest Login'}]
        };
        return roomsPlugin;
    }

    async fetchRoomSelection(selectionConfig, players, isGuest)
    {
        let superInitialGameData = {players};
        let roomGame = {loginManager: {isGuestUser: () => isGuest}};
        await this.createRoomsPlugin(selectionConfig).attachRoomSelectionAndInstancesRemoval(
            superInitialGameData,
            roomGame,
            {},
            {}
        );
        return sc.get(superInitialGameData, 'roomSelection', false);
    }

    createContainer()
    {
        let container = {appended: []};
        container.append = (element) => container.appended.push(element);
        return container;
    }

    createSelectorsGameManager()
    {
        let gameManager = {
            containers: {
                [ActionsConst.SELECTORS.PLAYER_CREATION_ADDITIONAL_INFO]: this.createContainer(),
                [ActionsConst.SELECTORS.PLAYER_SELECTION_ADDITIONAL_INFO]: this.createContainer()
            },
            initialGameData: {},
            services: {translator: {t: (snippet) => snippet}}
        };
        gameManager.gameDom = {
            getElement: (selector) => gameManager.containers[selector],
            createElement: (tagName) => ({tagName, classList: {add: () => true}, append: () => true})
        };
        return gameManager;
    }

    async testTheLoginSelectionOffSendsTheRegistrationRooms()
    {
        await this.test('with the login selection off a user with players gets the registration rooms', async () => {
            let selectionConfig = {allowOnLogin: false, allowOnRegistration: true, loginLastLocation: false};
            this.assert.deepStrictEqual(
                (await this.fetchRoomSelection(selectionConfig, [{id: 1}], false)).map(room => room.name),
                ['registration-room']
            );
            this.assert.deepStrictEqual(
                (await this.fetchRoomSelection(selectionConfig, [{id: 1}], true)).map(room => room.name),
                ['guest-registration-room']
            );
        });
    }

    async testTheLoginSelectionOnKeepsTheLoginRooms()
    {
        await this.test('with the login selection on a user with players gets the login rooms and a new one the registration ones', async () => {
            let selectionConfig = {allowOnLogin: true, allowOnRegistration: true, loginLastLocation: true};
            this.assert.deepStrictEqual(
                (await this.fetchRoomSelection(selectionConfig, [{id: 1}], false)).map(room => room.name),
                [RoomsConst.ROOM_LAST_LOCATION_KEY, 'login-room']
            );
            this.assert.deepStrictEqual(
                (await this.fetchRoomSelection(selectionConfig, [], false)).map(room => room.name),
                ['registration-room']
            );
        });
    }

    async testNoSelectionSendsNoRooms()
    {
        await this.test('with the login and registration selection off no rooms are sent', async () => {
            for(let players of [[], [{id: 1}]]){
                let roomSelection = await this.fetchRoomSelection(
                    {allowOnLogin: false, allowOnRegistration: false, loginLastLocation: true},
                    players,
                    false
                );
                this.assert.strictEqual(roomSelection, false, 'No rooms for '+players.length+' players');
            }
        });
    }

    async testTheLoginSelectorIsBuiltOnlyWithTheLoginSelection()
    {
        await this.test('the creation selector is always built and the selection one only with the login selection', async () => {
            let roomSelection = [{name: 'town', title: 'Town'}];
            for(let isLoginSelectionEnabled of [false, true]){
                let gameManager = this.createSelectorsGameManager();
                new SceneSelectorBuilder().populate(roomSelection, gameManager, isLoginSelectionEnabled);
                this.assert.deepStrictEqual(
                    [
                        gameManager.containers[ActionsConst.SELECTORS.PLAYER_CREATION_ADDITIONAL_INFO].appended.length,
                        gameManager.containers[ActionsConst.SELECTORS.PLAYER_SELECTION_ADDITIONAL_INFO].appended.length
                    ],
                    [1, isLoginSelectionEnabled ? 1 : 0]
                );
            }
        });
    }

    async testTheCreationSceneGoesInTheCreationData()
    {
        await this.test('the scene picked on the creation form goes in the create player data, none adds nothing', async () => {
            let appender = new SelectedSceneAppender();
            let creationData = {'new-player-name': 'player'};
            let gameManager = {initialGameData: {}, gameDom: {getElement: () => false}};
            appender.append(gameManager, {}, creationData);
            this.assert.deepStrictEqual([creationData, gameManager.initialGameData], [{'new-player-name': 'player'}, {}]);
            gameManager.gameDom.getElement = (selector) => '.scene-select-single' === selector && {value: 'forest'};
            appender.append(gameManager, {}, creationData);
            this.assert.deepStrictEqual(
                [creationData, gameManager.initialGameData],
                [{'new-player-name': 'player', selectedScene: 'forest'}, {selectedScene: 'forest'}]
            );
        });
    }

}

module.exports.TestRoomsRoomSelection = TestRoomsRoomSelection;
