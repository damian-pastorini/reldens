/**
 *
 * Reldens - ClanMessageHandler
 *
 */

const { UserInterface } = require('../../game/client/user-interface');
const { TeamsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class ClanMessageHandler
{

    constructor(props)
    {
        this.roomEvents = sc.get(props, 'roomEvents', false);
        this.message = sc.get(props, 'message', false);
        this.gameManager = this.roomEvents?.gameManager;
        this.gameDom = this.gameManager?.gameDom;
        this.uiScene = this.gameManager?.gameEngine?.uiScene;
    }

    validate()
    {
        if(!this.roomEvents){
            Logger.notice('Missing RoomEvents on TeamMessageHandler.');
            return false;
        }
        if(!this.message){
            Logger.notice('Missing message on TeamMessageHandler.');
            return false;
        }
        if(!this.gameManager){
            Logger.notice('Missing GameManager on TeamMessageHandler.');
            return false;
        }
        if(!this.uiScene){
            Logger.notice('Missing UI Scene on TeamMessageHandler.');
            return false;
        }
        return this.gameManager.getCurrentPlayer().playerId;

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
        let uiBox = this.uiScene.elementsUi[TeamsConst.CLAN_KEY];
        if(!uiBox){
            Logger.error('Clan UI box not found.', {clanUi, container, uiBox});
            return false;
        }
        this.roomEvents.uiSetTitle(uiBox, {title});
        this.roomEvents.uiSetContent(uiBox, {content: this.createClanContent()}, this.uiScene);
        this.activateCreateButton();
    }

    showNewClan()
    {
        let clanUi = this.createClanUi();
        let title = this.gameManager.config.getWithoutLogs(
            'client/clan/labels/clanTitle',
            TeamsConst.LABELS.CLAN.CLAN_TITLE
        ).replace('%clanName', this.message.clanName)
        .replace('%leaderName', this.gameManager.getCurrentPlayer().playerName);
        let container = this.gameManager.gameDom.getElement('.clan-dialog-box .box-content');
        if(!container){
            Logger.error('Missing container: ".clan-dialog-box .box-content".');
            return false;
        }
        let uiBox = this.uiScene.elementsUi[TeamsConst.CLAN_KEY];
        if(!uiBox){
            Logger.error('Clan UI box not found.', {clanUi, container, uiBox});
            return false;
        }
        this.roomEvents.uiSetTitle(uiBox, {title});
        this.roomEvents.uiSetContent(uiBox, {content: ''}, this.uiScene);
        this.updateClanBox({}, container);
    }

    showClanRequest()
    {
        this.createClanUi();
        this.roomEvents.initUi({
            id: TeamsConst.CLAN_KEY,
            title: this.gameManager.config.getWithoutLogs(
                'client/clan/labels/requestFromTitle',
                TeamsConst.LABELS.CLAN.REQUEST_FROM
            ),
            content: this.message.from,
            options: this.gameManager.config.get('client/ui/options/acceptOrDecline'),
            overrideSendOptions: {act: TeamsConst.ACTIONS.CLAN_ACCEPTED, id: this.message.id}
        });
        this.gameDom.getElement('#opt-2-clan')?.addEventListener('click', () => {
            this.removeClanUi();
        });
    }

    showClanBox()
    {
        this.createClanUi();
        let title = this.gameManager.config.getWithoutLogs(
            'client/clan/labels/clanTitle',
            TeamsConst.LABELS.CLAN.CLAN_TITLE
        )
            .replace('%clanName', this.message.clanName)
            .replace('%leaderName', this.message.leaderName);
        let container = this.gameManager.gameDom.getElement('#box-clan .box-content');
        if(!container){
            Logger.error('Missing container: "#box-clan .box-content".');
            return false;
        }
        let uiBox = this.uiScene.elementsUi[TeamsConst.CLAN_KEY];
        this.roomEvents.uiSetTitle(uiBox, {title});
        this.roomEvents.uiSetContent(uiBox, {content: ''}, this.uiScene);
        let players = sc.get(this.message, 'players', false);
        this.uiScene.currentClan = {
            id: this.message.id,
            name: this.message.clanName,
            leader: this.message.leaderName,
            players
        };
        this.updateClanBox(players, container);
    }

    removeClanUi()
    {
        let uiElement = this.gameManager.getUiElement(TeamsConst.CLAN_KEY);
        if(!uiElement){
            Logger.error('Clan UI Element not found for remove.');
            return false;
        }
        uiElement.removeElement();
        delete this.uiScene.userInterfaces[TeamsConst.CLAN_KEY];
        delete this.uiScene.elementsUi[TeamsConst.CLAN_KEY];
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

    updateClanBox(players, container)
    {
        if(!players){
            Logger.error('Players not defined for clan box update.');
            return;
        }
        let teamMembers = '';
        for(let i of Object.keys(players)){
            teamMembers += this.createClanMemberBox(players[i]);
        }
        container.innerHTML = this.createClanContainer(teamMembers);
        this.activateClanTargetActions(players);
        this.activateClanLeaveButtonAction();
    }

    createClanContainer(teamMembers)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let templateContent = this.uiScene.cache.html.get('clanContainer');
        if(!templateContent){
            Logger.error('Missing template "clanContainer".');
            return '';
        }
        let isPlayerOwner = this.gameManager.getCurrentPlayer().playerId === this.message.id;
        let leaveActionLabel = isPlayerOwner
            ? this.gameManager.config.getWithoutLogs('client/clan/labels/disbandLabel', TeamsConst.LABELS.CLAN.DISBAND)
            : this.gameManager.config.getWithoutLogs('client/clan/labels/leaveLabel', TeamsConst.LABELS.CLAN.LEAVE);
        let templateParams = {
            clanId: this.message.id,
            playerId: this.gameManager.getCurrentPlayer().playerId,
            leaveActionLabel: leaveActionLabel,
            teamMembers
        };
        return this.gameManager.gameEngine.parseTemplate(templateContent, templateParams);
    }

    activateClanLeaveButtonAction()
    {
        let leaveButton = this.gameManager.gameDom.getElement('.leave-'+this.message.id);
        leaveButton?.addEventListener('click', () => {
            let sendData = {
                act: TeamsConst.ACTIONS.CLAN_LEAVE,
                id: this.message.id
            };
            this.gameManager.activeRoomEvents.room.send('*', sendData);
        });
    }

    createClanMemberBox(playerData)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let templateContent = this.uiScene.cache.html.get('clanPlayerData');
        if(!templateContent){
            Logger.error('Missing template "clanPlayerData".');
            return '';
        }
        let isPlayerOwner = playerData.id === this.message.id;
        return this.gameManager.gameEngine.parseTemplate(templateContent, {
            playerId: playerData.id,
            playerName: playerData.name,
            playerProperties: this.createSharedPropertiesContent(playerData.sharedProperties),
            playerRemove: isPlayerOwner ? this.createDismissPlayerButton(playerData) : ''
        });
    }

    createDismissPlayerButton(playerData)
    {
        let templateContent = this.uiScene.cache.html.get('clanRemove');
        if(!templateContent){
            Logger.error('Missing template "clanRemove".');
            return '';
        }
        return this.gameManager.gameEngine.parseTemplate(templateContent, {playerId: playerData.id});
    }

    createSharedPropertiesContent(playerSharedProperties)
    {
        let templateContent = this.uiScene.cache.html.get('teamsSharedProperty');
        if(!templateContent){
            Logger.error('Missing template "teamsSharedProperty".');
            return '';
        }
        let sharedPropertiesContent = '';
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        for(let i of Object.keys(playerSharedProperties)) {
            templateContent = this.uiScene.cache.html.get('teamsSharedProperty');
            let propertyData = playerSharedProperties[i];
            let propertyMaxValue = sc.get(propertyData, 'max', '');
            if('' !== propertyMaxValue){
                propertyMaxValue = this.gameManager.config.getWithoutLogs(
                    'client/clan/labels/propertyMaxValue',
                    TeamsConst.LABELS.CLAN.PROPERTY_MAX_VALUE
                ).replace('%propertyMaxValue', propertyMaxValue);
            }
            sharedPropertiesContent += this.gameManager.gameEngine.parseTemplate(templateContent, {
                key: i,
                label: propertyData.label,
                value: propertyData.value,
                max: propertyMaxValue
            });
        }
        return sharedPropertiesContent;
    }

    activateClanTargetActions(playersData)
    {
        for(let i of Object.keys(playersData)){
            let playerData = playersData[i];
            let selectorPlayerName = '.clan-player-'+i+' .player-name';
            let selectorPlayerProperties = '.clan-player-'+i+' .properties-list-container';
            this.gameDom.getElement(selectorPlayerName).addEventListener('click', () => {
                this.gameManager.getCurrentPlayer().setTargetPlayerById(playerData.sessionId);
            });
            this.gameDom.getElement(selectorPlayerProperties).addEventListener('click', () => {
                this.gameManager.getCurrentPlayer().setTargetPlayerById(playerData.sessionId);
            });
        }
    }

}

module.exports.ClanMessageHandler = ClanMessageHandler;
