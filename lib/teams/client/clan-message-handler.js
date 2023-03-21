/**
 *
 * Reldens - ClanMessageHandler
 *
 */

const { TeamMessageHandler } = require('./team-message-handler');
const { UserInterface } = require('../../game/client/user-interface');
const { TeamsConst } = require('../constants');
const { sc, Logger} = require('@reldens/utils');

class ClanMessageHandler extends TeamMessageHandler
{

    constructor(props)
    {
        super(props);
    }

    initializeClanUi()
    {
        let clanUi = this.createClanUi();
        let title = this.gameManager.config.getWithoutLogs(
            'client/clan/labels/createClanTitle',
            TeamsConst.LABELS.CLAN.CREATE_CLAN_TITLE
        );
        let container = this.gameManager.gameDom.getElement('.clan-dialog-box .box-content');
        if(!container){
            Logger.error('Missing container: "#box-clan .box-content".');
            return false;
        }
        let uiBox = this.uiScene.elementsUi['clan'];
        if(!uiBox){
            Logger.error('Clan UI box not found.', {clanUi, container, uiBox});
            return false;
        }
        this.roomEvents.uiSetTitle(uiBox, {title});
        this.roomEvents.uiSetContent(uiBox, {content: this.createClanContent()}, this.uiScene);
        this.activateCreateButton();
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
        if(clanUi){
            return clanUi;
        }
        if(!this.uiScene.userInterfaces){
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

    createClanContent()
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let templateContent = this.uiScene.cache.html.get('clanCreate');
        if(!templateContent){
            Logger.error('Missing template "clanCreate".');
            return '';
        }
        let templateParams = {
            playerId: this.gameManager.getCurrentPlayer().playerId,
            createLabel: this.gameManager.config.getWithoutLogs(
                'client/clan/labels/createLabel',
                TeamsConst.LABELS.CLAN.CREATE
            ),
            clanNamePlaceholder: this.gameManager.config.getWithoutLogs(
                'client/clan/labels/namePlaceholder',
                TeamsConst.LABELS.CLAN.NAME_PLACEHOLDER
            )
        };
        return this.gameManager.gameEngine.parseTemplate(templateContent, templateParams);
    }

    activateCreateButton()
    {
        let createButton = this.gameManager.gameDom.getElement('.clan-dialog-box .submit-clan-create');
        if(!createButton){
            Logger.warning('Clan create button not found by ".clan-dialog-box .clan-create".');
            return false;
        }
        let nameInput = this.gameManager.gameDom.getElement('.clan-dialog-box .clan-name-input');
        if(!nameInput){
            Logger.warning('Clan create button not found by ".clan-dialog-box .clan-name-input".');
            return false;
        }
        createButton.addEventListener('click', () => {
            if(0 === nameInput.value.length){
                return false;
            }
            this.gameManager.gameDom.updateContent(
                '.clan-dialog-box .box-content',
                this.uiScene.cache.html.get('uiLoading')
            );
            this.gameManager.activeRoomEvents.room.send('*', {
                act: TeamsConst.ACTIONS.CLAN_CREATE,
                [TeamsConst.ACTIONS.CLAN_NAME]: nameInput.value,
                id: this.message.id
            });
        });
    }

}

module.exports.ClanMessageHandler = ClanMessageHandler;
