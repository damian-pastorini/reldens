const DataLink = require('../storage/data-server');

class ChatHelper
{

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
        let chatProm = DataLink.query(queryString, [currentPlayer.id, message]);
        chatProm.catch((err) => {
            console.log('ERROR - Chat message error.', err, queryString);
        });
    }

}

module.exports = ChatHelper;
