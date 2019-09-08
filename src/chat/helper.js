/**
 *
 * Reldens - ChatHelper
 *
 * Chat helper will handle the message save process.
 *
 */

class ChatHelper
{

    /**
     * @param props
     */
    constructor(props)
    {
        if(!props.hasOwnProperty('dataServer')){
            throw new Error('Missing dataServer.');
        }
        this.dataServer = props.dataServer;
    }

    /**
     * @param message
     * @param currentPlayer
     * @param playerSceneId
     * @param clientTo
     * @param messageType
     */
    saveMessage(message, currentPlayer, playerSceneId, clientTo, messageType)
    {
        let toClientId = clientTo.hasOwnProperty('id') ? clientTo.id : 'NULL';
        let messageTypeSave = (messageType ? messageType : 'NULL');
        let messageScene = (playerSceneId ? playerSceneId : 'NULL');
        let queryString = `INSERT INTO chat VALUES(
            NULL, 
            ?,
            ${messageScene},
            ?,
            ${toClientId},
            '${messageTypeSave}',
            CURRENT_TIMESTAMP);`;
        let chatProm = this.dataServer.query(queryString, [currentPlayer.id, message]);
        chatProm.catch((err) => {
            console.log('ERROR - Chat message error.', err, queryString);
        });
    }

}

module.exports = ChatHelper;
