/**
 *
 * Reldens - ClanMessageHandler
 *
 */

const { TeamMessageHandler } = require('./team-message-handler');
const { UserInterface } = require('../../game/client/user-interface');
const { TeamsConst } = require('../constants');
const { sc } = require('@reldens/utils');

class ClanMessageHandler extends TeamMessageHandler
{

    constructor(props)
    {
        super(props);
    }

    initializeClanUi()
    {
        let clanUi = this.createClanUi();
    }

    showClanRequest()
    {

    }

    showClanBox()
    {
        let clanUi = this.createClanUi();
    }

    removeClanUi()
    {

    }

    createClanUi()
    {
        let clanUi = sc.get(this.uiScene.userInterfaces, TeamsConst.CLAN_KEY);
        if (clanUi) {
            return clanUi;
        }
        if (!this.uiScene.userInterfaces) {
            this.uiScene.userInterfaces = {};
        }
        this.uiScene.userInterfaces[TeamsConst.CLAN_KEY] = new UserInterface(
            this.gameManager,
            {id: TeamsConst.CLAN_KEY, type: TeamsConst.CLAN_KEY, defaultOpen: true, defaultClose: true},
            'assets/features/teams/templates/ui-clan.html',
            TeamsConst.CLAN_KEY
        );
        this.uiScene.userInterfaces[TeamsConst.CLAN_KEY].createUiElement(this.uiScene, TeamsConst.CLAN_KEY);
        return this.uiScene.userInterfaces[TeamsConst.CLAN_KEY];
    }

}

module.exports.ClanMessageHandler = ClanMessageHandler;
