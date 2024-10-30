/**
 *
 * Reldens - ActivePlayers
 *
 */

const { ActivePlayer } = require('./active-player');

class ActivePlayers
{

    constructor()
    {
        this.guestsEmailDomain = '';
        this.gameRoomInstanceId = '';
        this.playersByPlayerId = {};
        this.playersByPlayerName = {};
        this.playersBySessionId = {};
        this.playersByUserId = {};
        this.playersByRoomAndId = {};
    }

    add(userModel, client, room)
    {
        let activePlayer = new ActivePlayer({guestsEmailDomain: this.guestsEmailDomain});
        activePlayer.setUserModelAndClientData(userModel, client, room);
        if(!this.playersByUserId[userModel.id]){
            this.playersByUserId[userModel.id] = {};
        }
        if(!this.playersByRoomAndId[activePlayer.roomId]){
            this.playersByRoomAndId[activePlayer.roomId] = {};
        }
        this.playersByPlayerId[activePlayer.playerId] = activePlayer;
        this.playersByPlayerName[activePlayer.playerName]
            = this.playersBySessionId[activePlayer.sessionId]
            = this.playersByUserId[userModel.id][activePlayer.playerId]
            = this.playersByRoomAndId[activePlayer.roomId][activePlayer.playerId]
            = activePlayer.playerId;
        return this.playersByPlayerId[activePlayer.playerId];
    }

    fetchBySessionId(sessionId)
    {
        let playerId = this.playersBySessionId[sessionId];
        if(!playerId){
            return false;
        }
        return this.playersByPlayerId[playerId];
    }

    fetchByName(playerName)
    {
        let playerId = this.playersByPlayerName[playerName];
        if(!playerId){
            return false;
        }
        return this.playersByPlayerId[playerId];
    }

    fetchByRoomAndId(roomId, playerId)
    {
        let room = this.playersByRoomAndId[roomId];
        if(!room){
            return false;
        }
        let playerByRoomAndId = room[playerId];
        if(!playerByRoomAndId){
            return false;
        }
        return this.playersByPlayerId[playerByRoomAndId];
    }

    removeByPlayerId(playerId)
    {
        let activePlayer = this.playersByPlayerId[playerId];
        if(activePlayer){
            if(this.playersByUserId[activePlayer.userId]){
                delete this.playersByUserId[activePlayer.userId][playerId];
                if(0 === Object.keys(this.playersByUserId[activePlayer.userId]).length){
                    delete this.playersByUserId[activePlayer.userId];
                }
            }
            if(this.playersByRoomAndId[activePlayer.roomId]){
                delete this.playersByRoomAndId[activePlayer.roomId][playerId];
                if(0 === Object.keys(this.playersByRoomAndId[activePlayer.roomId]).length){
                    delete this.playersByRoomAndId[activePlayer.userId];
                }
            }
            delete this.playersByPlayerName[activePlayer.playerName];
            delete this.playersBySessionId[activePlayer.sessionId];
        }
        delete this.playersByPlayerId[playerId];
    }

    removeByPlayerName(playerName)
    {
        let activePlayer = this.playersByPlayerName[playerName];
        if(activePlayer){
            this.removeByPlayerId(activePlayer.playerId);
        }
    }

    removeBySessionId(sessionId)
    {
        let activePlayer = this.playersBySessionId[sessionId];
        if(activePlayer){
            this.removeByPlayerId(activePlayer.playerId);
        }
    }

    removeByRoomAndId(roomId, playerId)
    {
        let playersByRoomId = this.playersByRoomAndId[roomId];
        if(!playersByRoomId){
            return;
        }
        let activePlayer = playersByRoomId[playerId];
        if(activePlayer){
            this.removeByPlayerId(activePlayer.playerId);
        }
    }

    removeByUserAndId(userId, playerId)
    {
        let playersByUserId = this.playersByUserId[userId];
        if(!playersByUserId){
            return;
        }
        let activePlayer = playersByUserId[playerId];
        if(activePlayer){
            this.removeByPlayerId(activePlayer.playerId);
        }
    }

}

module.exports.ActivePlayers = new ActivePlayers();
