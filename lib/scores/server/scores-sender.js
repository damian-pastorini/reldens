/**
 *
 * Reldens - ScoresSender
 *
 */

const { ScoresConst } = require('../constants');
const { Logger } = require('@reldens/utils');

class ScoresSender
{

    async sendUpdates(room, attacker, newTotalScore, scores)
    {
        let client = room?.activePlayerByPlayerId(attacker?.player_id, room?.roomId)?.client;
        if(!client){
            Logger.error('Player missing client.', {playerId: attacker?.player_id, roomId: room?.roomId});
            return false;
        }
        let updatePlayerResult = this.updatePlayerScore(client, attacker, newTotalScore);
        let broadcastTopScoresResult = this.broadcastTopScores(room, scores);
        return {updatePlayerResult, broadcastTopScoresResult};
    }

    updatePlayerScore(client, attacker, newTotalScore)
    {
        if(!newTotalScore){
            Logger.warning('Missing new total score data.');
            return false;
        }
        client.send('*', {act: ScoresConst.ACTIONS.UPDATE, newTotalScore, listener: ScoresConst.KEY});
        return true;
    }

    broadcastTopScores(room, scores)
    {
        if(!room){
            Logger.error('Room undefined to send scores update.', room);
            return false;
        }
        if(!scores){
            Logger.warning('Missing scores data.');
            return false;
        }
        room.broadcast('*', {act: ScoresConst.ACTIONS.TOP_SCORES_UPDATE, scores, listener: ScoresConst.KEY});
        return true;
    }

}

module.exports.ScoresSender = ScoresSender;
