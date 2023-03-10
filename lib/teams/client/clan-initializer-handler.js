/**
 *
 * Reldens - ClanInitializerHandler
 *
 */

const { sc } = require('@reldens/utils');

class ClanInitializerHandler
{

    static appendCreateUiListener(initialGameData, teamsPlugin)
    {
        let clanData = sc.get(initialGameData, 'clanData', {});
        if(0 === Object.keys(clanData).length){
            return false;
        }
        teamsPlugin.events.on('reldens.createUiScene', (preloadScene) => {
            // this.clanUi = new ClanUi(preloadScene);
            // this.clanUi.createUi();
        });

    }

}

module.exports.ClanInitializerHandler = ClanInitializerHandler;
