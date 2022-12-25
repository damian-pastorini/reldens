/**
 *
 * Reldens - DataLoader
 *
 */

class PlayerEnricher
{

    static async withClassPath(roomGame, superInitialGameData, dataServer)
    {
        if(!roomGame.config.get('client/players/multiplePlayers/enabled') || !superInitialGameData.players){
            return;
        }
        for(let i of Object.keys(superInitialGameData.players)){
            let player = superInitialGameData.players[i];
            let classPath = await dataServer.entityManager.get('ownersClassPath').loadOneByWithRelations(
                'owner_id',
                player.id,
                'owner_full_class_path'
            );
            if(!classPath){
                continue;
            }
            player.additionalLabel = ' - LvL '+classPath.currentLevel+' - '+classPath.owner_full_class_path.label;
            player.currentClassPathLabel = player.avatarKey = classPath.owner_full_class_path.key;
        }
    }

}

module.exports.PlayerEnricher = PlayerEnricher;