/**
 *
 * Reldens - Character E2E State
 *
 * Server side e2e endpoints for the characters creation and selection: makes the next players creation fail in the
 * storage (the player is stored with a user ID that does not exist, so the foreign key rejects it), sets the banned
 * names, empties the classes sent to the client, leaves a single login room and broadcasts a room removal to the game
 * rooms. The reset restores every value before every test.
 *
 */

const { sc } = require('@reldens/utils');
const { DeletedRoomCloser } = require('../../../lib/rooms/server/deleted-room-closer');

class CharacterE2eState
{

    static MISSING_USER_ID = 0;
    static isCreationFailing = false;
    static defaults = {};

    static fetchActionsPlugin(serverManager)
    {
        return serverManager.featuresManager.featuresList.actions.package;
    }

    static captureDefaults(serverManager)
    {
        CharacterE2eState.defaults = {
            bannedNames: serverManager.loginManager.usersManager.bannedNames,
            classesData: CharacterE2eState.fetchActionsPlugin(serverManager).initialGameDataEnricher.classesData,
            loginAvailableRooms: serverManager.roomsManager.loginAvailableRooms,
            registrationAvailableRoomsGuest: serverManager.roomsManager.registrationAvailableRoomsGuest
        };
    }

    static resetAll(serverManager)
    {
        CharacterE2eState.isCreationFailing = false;
        serverManager.loginManager.usersManager.bannedNames = CharacterE2eState.defaults.bannedNames;
        CharacterE2eState.fetchActionsPlugin(serverManager).initialGameDataEnricher.classesData = CharacterE2eState
            .defaults.classesData;
        serverManager.roomsManager.loginAvailableRooms = CharacterE2eState.defaults.loginAvailableRooms;
        serverManager.roomsManager.registrationAvailableRoomsGuest = CharacterE2eState.defaults.registrationAvailableRoomsGuest;
    }

    static registerEndpoints(serverManager)
    {
        CharacterE2eState.captureDefaults(serverManager);
        serverManager.events.on('reldens.createNewPlayerBefore', (loginData, playerData) => {
            if(CharacterE2eState.isCreationFailing){
                playerData.user_id = CharacterE2eState.MISSING_USER_ID;
            }
        });
        let app = serverManager.app;
        app.post('/api/e2e/characters/fail-creation', (request, response) => {
            CharacterE2eState.isCreationFailing = true;
            response.json({ok: true});
        });
        app.post('/api/e2e/characters/banned-names', (request, response) => {
            let usersManager = serverManager.loginManager.usersManager;
            usersManager.bannedNames = usersManager.mapBannedNames(sc.get(request.body, 'bannedNames', ''));
            response.json({ok: true});
        });
        app.post('/api/e2e/characters/empty-classes', (request, response) => {
            CharacterE2eState.fetchActionsPlugin(serverManager).initialGameDataEnricher.classesData = {};
            response.json({ok: true});
        });
        app.post('/api/e2e/characters/single-login-room', (request, response) => {
            serverManager.roomsManager.loginAvailableRooms = [...CharacterE2eState.defaults.loginAvailableRooms].slice(0, 1);
            response.json({rooms: serverManager.roomsManager.loginAvailableRooms});
        });
        app.post('/api/e2e/characters/room-removed', (request, response) => {
            let deletedRoomCloser = new DeletedRoomCloser({
                roomsManager: serverManager.roomsManager,
                config: serverManager.configManager
            });
            response.json({broadcast: deletedRoomCloser.broadcastRoomRemoved(sc.get(request.body, 'roomName', ''))});
        });
        app.post('/api/e2e/characters/single-guest-registration-room', (request, response) => {
            serverManager.roomsManager.registrationAvailableRoomsGuest = [
                ...CharacterE2eState.defaults.registrationAvailableRoomsGuest
            ].slice(0, 1);
            response.json({rooms: serverManager.roomsManager.registrationAvailableRoomsGuest});
        });
    }

}

module.exports.CharacterE2eState = CharacterE2eState;
