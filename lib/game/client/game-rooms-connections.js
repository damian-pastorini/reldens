/**
 *
 * Reldens - GameRoomsConnections
 *
 * Handles the client connections to the rooms around the scenes of the game manager: joins the rooms of the loaded
 * features once per selected player, leaving first the ones joined for another player (a failed join is always
 * originated in the server, so it alerts the user to reload), and ends the session when the server closes the lobby
 * (game room) as consented, which happens when the same account logs in somewhere else, so the player selection and
 * creation screens that have no scene yet show the session ended message too. A tab already showing the game over
 * message (a tab in a scene gets it when its player is removed) is left as it is.
 *
 */

const { SyncClientDriver } = require('../../sync/client/colyseus/sync-client-driver');
const { sc } = require('@reldens/utils');

class GameRoomsConnections
{

    /**
     * @param {GameManager} gameManager
     */
    constructor(gameManager)
    {
        /** @type {GameManager} */
        this.gameManager = gameManager;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async joinFeaturesRooms()
    {
        let featuresList = this.gameManager.features.featuresList;
        let featuresListKeys = Object.keys(featuresList);
        if(0 === featuresListKeys.length){
            return false;
        }
        await this.leaveFeaturesRoomsOfAnotherPlayer();
        let featuresRoomsNames = [];
        for(let featureKey of featuresListKeys){
            let feature = featuresList[featureKey];
            if(!sc.hasOwn(feature, 'joinRooms')){
                continue;
            }
            if(!await this.joinFeatureRooms(feature.joinRooms, featuresRoomsNames)){
                return false;
            }
        }
        this.gameManager.featuresRoomsPlayerId = this.gameManager.userData.selectedPlayer;
        sc.deepMergeProperties(this.gameManager.config, {client: {rooms: {featuresRoomsNames}}});
        return true;
    }

    /**
     * @param {Array<string>} joinRoomsNames
     * @param {Array<string>} featuresRoomsNames
     * @returns {Promise<boolean>}
     */
    async joinFeatureRooms(joinRoomsNames, featuresRoomsNames)
    {
        for(let joinRoomName of joinRoomsNames){
            if(this.gameManager.joinedRooms[joinRoomName]){
                featuresRoomsNames.push(joinRoomName);
                continue;
            }
            let joinedRoom = await this.gameManager.gameClient.joinOrCreate(joinRoomName, this.gameManager.userData);
            if(!joinedRoom){
                return this.gameManager.gameDom.alertReload(
                    this.gameManager.services.translator.t('game.errors.joiningFeatureRoom', {joinRoomName})
                );
            }
            this.gameManager.joinedRooms[joinRoomName] = joinedRoom;
            await this.gameManager.emitJoinedRoom(joinedRoom, joinRoomName);
            featuresRoomsNames.push(joinRoomName);
        }
        return true;
    }

    /**
     * @returns {Promise<boolean>}
     */
    async leaveFeaturesRoomsOfAnotherPlayer()
    {
        let featuresRoomsPlayerId = this.gameManager.featuresRoomsPlayerId;
        if(!featuresRoomsPlayerId || featuresRoomsPlayerId === this.gameManager.userData.selectedPlayer){
            return false;
        }
        for(let joinedRoomName of Object.keys(this.gameManager.joinedRooms)){
            await this.gameManager.joinedRooms[joinedRoomName].leave();
            delete this.gameManager.joinedRooms[joinedRoomName];
        }
        await this.gameManager.gameClient.leaveServersRooms();
        this.gameManager.featuresRoomsPlayerId = false;
        return true;
    }

    /**
     * @param {number} code
     * @returns {boolean}
     */
    endSessionOnGameRoomLeave(code)
    {
        if(SyncClientDriver.CloseCode.CONSENTED !== code || this.gameManager.gameOver){
            return false;
        }
        this.gameManager.gameOver = true;
        this.gameManager.gameDom.alertReload(this.gameManager.services.translator.t('game.errors.sessionEnded'));
        return true;
    }

}

module.exports.GameRoomsConnections = GameRoomsConnections;
