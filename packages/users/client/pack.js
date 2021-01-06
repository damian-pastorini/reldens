/**
 *
 * Reldens - Users Client Package.
 *
 */

const { EventsManagerSingleton } = require('@reldens/utils');
const { LifebarUi } = require('./lifebar-ui');

class UsersPack
{

    constructor()
    {
        EventsManagerSingleton.on('reldens.playerStatsUpdateAfter', (message, roomEvents) => {
            // @TODO - BETA.17: make optional display other players lifeBar.
            if(this.lifeBarUi){
                return;
            }
            this.lifeBarUi = (new LifebarUi()).setup({
                gameManager: roomEvents.gameManager,
                player: roomEvents.gameManager.getCurrentPlayer()
            });
            if(this.lifeBarUi && roomEvents.gameManager.config.get('client/ui/lifeBar/enabled')){
                if(!this.lifeBarUi.lifeBar){
                    if(!this.lifeBarUi.createHealthBar()){
                        return;
                    }
                }
                this.lifeBarUi.redrawLifeBar();
            }
        });
        // eslint-disable-next-line no-unused-vars
        EventsManagerSingleton.on('reldens.runPlayerAnimation', (playerEngine) => {
            this.lifeBarUi.redrawLifeBar();
        });
    }

}

module.exports.UsersPack = UsersPack;
