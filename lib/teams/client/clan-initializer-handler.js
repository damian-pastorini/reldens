/**
 *
 * Reldens - ClanInitializerHandler
 *
 */

const { UserInterface } = require('../../game/client/user-interface');
const { TeamsConst } = require('../constants');
const { sc } = require('@reldens/utils');

class ClanInitializerHandler
{

    static appendCreateUiListener(initialGameData, teamsPlugin)
    {
        let clanData = sc.get(initialGameData, 'clanData', {});
        if(0 === Object.keys(clanData).length){
            return false;
        }
        let currentPlayer = teamsPlugin.gameManager.getCurrentPlayer();
        currentPlayer.clan = clanData;
        teamsPlugin.events.on('reldens.createUiScene', (preloadScene) => {
            this.createClanUi(clanData, teamsPlugin.gameManager, preloadScene);
        });
    }

    static createClanUi(clanData, gameManager, preloadScene)
    {
        let clanUi = sc.get(preloadScene.userInterfaces, clanData.ownerId);
        if(clanUi){
            return clanUi;
        }
        if(!preloadScene.userInterfaces){
            preloadScene.userInterfaces = {};
        }
        preloadScene.userInterfaces[clanData.ownerId] = new UserInterface(
            gameManager,
            {id: clanData.ownerId, type: TeamsConst.KEY, defaultOpen: true, defaultClose: true},
            'assets/features/teams/templates/ui-clan.html',
            TeamsConst.KEY
        );
        preloadScene.userInterfaces[clanData.ownerId].createUiElement(preloadScene, TeamsConst.KEY);
        return preloadScene.userInterfaces[clanData.ownerId];
    }

}

module.exports.ClanInitializerHandler = ClanInitializerHandler;
