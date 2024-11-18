/**
 *
 * Reldens - ActivePlayers
 *
 */

const { ActivePlayer } = require('./active-player');
const { Logger, sc } = require('@reldens/utils');

class ActivePlayers
{

    constructor()
    {
        this.guestsEmailDomain = '';
        this.gameRoomInstanceId = '';
        this.playersByRoomId = {};
        this.playersSessionsByUserId = {};
    }

    add(userModel, client, room)
    {
        let activePlayer = new ActivePlayer({
            guestsEmailDomain: this.guestsEmailDomain,
            userModel,
            client,
            roomId: room.roomId,
        });
        if(!this.playersByRoomId[activePlayer.roomId]){
            this.playersByRoomId[activePlayer.roomId] = {
                bySessionId: {},
                byUserId: {},
                byUserName: {},
                byPlayerId: {},
                byPlayerName: {},
            };
        }
        if(!this.playersByRoomId[activePlayer.roomId].byUserId[userModel.id]){
            this.playersByRoomId[activePlayer.roomId].byUserId[userModel.id] = {};
        }
        if(!this.playersByRoomId[activePlayer.roomId].byUserName[userModel.username]){
            this.playersByRoomId[activePlayer.roomId].byUserName[userModel.username] = {};
        }
        if(activePlayer.playerId){
            this.playersByRoomId[activePlayer.roomId].byPlayerId[activePlayer.playerId]
                = this.playersByRoomId[activePlayer.roomId].byPlayerName[activePlayer.playerName]
                = activePlayer.sessionId;
        }
        this.playersByRoomId[activePlayer.roomId].byUserId[userModel.id]
            = this.playersByRoomId[activePlayer.roomId].byUserName[userModel.username]
            = activePlayer.sessionId;
        this.playersByRoomId[activePlayer.roomId].bySessionId[activePlayer.sessionId] = activePlayer;
        if(!this.playersSessionsByUserId[userModel.id]){
            this.playersSessionsByUserId[userModel.id] = {};
        }
        this.playersSessionsByUserId[userModel.id][activePlayer.sessionId] = room.roomId;
        return activePlayer;
    }

    /**
     * @returns {ActivePlayer|boolean}
     */
    fetchByRoomAndSessionId(sessionId, roomId, withPlayer = false)
    {
        if(!sessionId){
            //Logger.debug('Missing sessionId on "fetchByRoomAndSessionId".');
            return false;
        }
        if(!roomId){
            //Logger.debug('Missing roomId on "fetchByRoomAndSessionId".');
            return false;
        }
        // @NOTE: GameRoom instance won't have a player on the user model, this only happens in the RoomScene.onJoin().
        if(withPlayer && this.gameRoomInstanceId === roomId){
            Logger.warning('Fetching active user withPlayer on gameRoomInstance.');
            return false;
        }
        let roomPlayersBySessionId = sc.get(this.playersByRoomId[roomId], 'bySessionId');
        if(!roomPlayersBySessionId){
            Logger.warning('Missing bySessionId on "fetchByRoomAndSessionId".');
            return false;
        }
        return roomPlayersBySessionId[sessionId];
    }

    fetchByRoomAndUserName(userName, roomId, withPlayer = false)
    {
        if(!userName){
            return false;
        }
        if(!roomId){
            return false;
        }
        // @NOTE: GameRoom instance won't have a player on the user model, this only happens in the RoomScene.onJoin().
        if(withPlayer && this.gameRoomInstanceId === roomId){
            return false;
        }
        let playersByRoomId = this.playersByRoomId[roomId];
        let roomPlayersByUserName = sc.get(playersByRoomId, 'byUserName');
        if(!roomPlayersByUserName){
            return false;
        }
        let playerSessionIdInRoom = sc.get(roomPlayersByUserName, userName);
        if(!playerSessionIdInRoom){
            return false;
        }
        return this.fetchByRoomAndSessionId(playerSessionIdInRoom, roomId, withPlayer);
    }

    fetchByRoomAndPlayerId(playerId, roomId, withPlayer = false)
    {
        // @NOTE: GameRoom instance won't have a player on the user model, this only happens in the RoomScene.onJoin().
        if(withPlayer && this.gameRoomInstanceId === roomId){
            return false;
        }
        let roomPlayersByPlayerId = sc.get(this.playersByRoomId[roomId], 'byPlayerId');
        if(!roomPlayersByPlayerId){
            return false;
        }
        let playerSessionIdInRoom = sc.get(roomPlayersByPlayerId, playerId);
        if(!playerSessionIdInRoom){
            return false;
        }
        return this.fetchByRoomAndSessionId(playerSessionIdInRoom, roomId, withPlayer);
    }

    fetchByRoomAndPlayerName(playerName, roomId, withPlayer = false)
    {
        // @NOTE: GameRoom instance won't have a player on the user model, this only happens in the RoomScene.onJoin().
        if(withPlayer && this.gameRoomInstanceId === roomId){
            return false;
        }
        let roomPlayersByPlayerName = sc.get(this.playersByRoomId[roomId], 'byPlayerName');

        if(!roomPlayersByPlayerName){
            return false;
        }
        let playerSessionIdInRoom = sc.get(roomPlayersByPlayerName, playerName);
        if(!playerSessionIdInRoom){
            return false;
        }
        return this.fetchByRoomAndSessionId(playerSessionIdInRoom, roomId, withPlayer);
    }

    removeAllByUserId(userId)
    {
        let userRoomsSessions = this.playersSessionsByUserId[userId];
        if(!userRoomsSessions){
            return false;
        }
        let sessionsIds = Object.keys(userRoomsSessions);
        for(let sessionId in sessionsIds){
            this.removeByRoomAndSessionId(sessionId, sessionsIds[sessionId]);
        }
        this.playersSessionsByUserId[userId] = {};
        return true;
    }

    removeByRoomAndSessionId(sessionId, roomId)
    {
        let room = this.playersByRoomId[roomId];
        if(!room){
            return false;
        }
        let activePlayer = this.fetchByRoomAndSessionId(sessionId, roomId, false);
        if(activePlayer){
            delete this.playersSessionsByUserId[activePlayer.userId][sessionId];
            delete room.byUserId[activePlayer.userId];
            delete room.byUserName[activePlayer.username];
            delete room.byPlayerId[activePlayer.playerId];
            delete room.byPlayerName[activePlayer.playerName];
        }
        delete room.bySessionId[sessionId];
        return true;
    }

}

module.exports.ActivePlayers = new ActivePlayers();
