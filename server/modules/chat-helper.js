const DataLink = require('./datalink');

class ChatHelper
{

    saveMessage(message, currentPlayer, playerSceneId, clientTo, messageType)
    {
        let toClientId = clientTo.hasOwnProperty('id') ? clientTo.id : 'NULL';
        let messageTypeSave = (messageType ? '\''+messageType+'\'' : 'NULL');
        let queryString = `INSERT INTO chat VALUES(NULL,
            ${currentPlayer.id},
            ${(playerSceneId ? playerSceneId : 'NULL')}, 
            '${message}',
            ${toClientId},
            ${messageTypeSave},
            CURRENT_TIMESTAMP
        );`;
        let prom = new Promise((resolve, reject) => {
            DataLink.connection.query(queryString, {}, (err, rows) => {
                if(err){
                    console.log('ERROR - Query:', err, queryString);
                    return reject(err);
                }
                if(rows){
                    // for now we don't do nothing with this.
                    return resolve(rows);
                }
            });
        });
    }

}

module.exports = ChatHelper;
