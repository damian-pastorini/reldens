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
            Logger.info('Missing RoomEvents on ClanMessageHandler.');
            return false;
        }
        if(!this.message){
            Logger.info('Missing message on ClanMessageHandler.');
            return false;
        }
        if(!this.gameManager){
            Logger.info('Missing GameManager on ClanMessageHandler.');
            return false;
        }
        if(!this.uiScene){
            // @NOTE: the message could arrive before the uiScene gets ready.
            // Logger.info('Missing UI Scene on ClanMessageHandler.');
            return false;
        }
        return this.gameManager.playerData?.id;

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
        this.addAndRemoveCaptureKeys();
    }

    showNewClan()
    {
        let clanUi = this.createClanUi();
        let title = this.gameManager.config.getWithoutLogs(
            'client/clan/labels/clanTitle',
            TeamsConst.LABELS.CLAN.CLAN_TITLE
        ).replace('%clanName', this.message.clanName)
        .replace('%leaderName', this.gameManager.currentPlayerName());
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
        this.updateClanBox(container);
        this.setClanFromMessage();
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
        this.setClanFromMessage();
        this.updateClanBox(container);
    }

    setClanFromMessage()
    {
        let players = sc.get(this.message, 'players', false);
        let members = sc.get(this.message, 'members', false);
        this.uiScene.currentClan = {
            id: this.message.id,
            name: this.message.clanName,
            leader: this.message.leaderName,
            ownerId: this.message.ownerId,
            players,
            members
        };
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
            playerId: this.gameManager.playerData.id,
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
                [TeamsConst.ACTIONS.CLAN_NAME]: nameInput.value
            });
        });
    }

    updateClanBox(container)
    {
        let players = sc.get(this.message, 'players', []);
        let connectedPlayersKeys = Object.keys(players);
        let clanPlayers = 0 === connectedPlayersKeys.length ? this.gameManager.config.getWithoutLogs(
            'client/clan/labels/noneConnected',
            TeamsConst.LABELS.CLAN.NONE_CONNECTED
        ) : '';
        for(let i of connectedPlayersKeys){
            clanPlayers += this.createClanPlayerBox(players[i]);
        }
        let members = sc.get(this.message, 'members', []);
        let clanMembers = '';
        for(let i of Object.keys(members)){
            clanMembers += this.createClanMemberBox(members[i]);
        }
        container.innerHTML = this.createClanContainer(clanPlayers, clanMembers);
        this.activateClanTargetActions(players);
        this.activateClanLeaveButtonAction();
    }

    addAndRemoveCaptureKeys()
    {
        let dynamicScene = this.gameManager.getActiveScene();
        let keys = dynamicScene.availableControllersKeyCodes();
        let inputElement = this.gameManager.gameDom.getElement('.clan-name-input');
        dynamicScene.addAndRemoveCapture(keys, inputElement);
    }

    createClanContainer(clanPlayers, clanMembers)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let templateContent = this.uiScene.cache.html.get('clanContainer');
        if(!templateContent){
            Logger.error('Missing template "clanContainer".');
            return '';
        }
        let isPlayerOwner = this.gameManager.playerData.id === this.message.ownerId;
        let leaveActionLabel = isPlayerOwner
            ? this.gameManager.config.getWithoutLogs('client/clan/labels/disbandLabel', TeamsConst.LABELS.CLAN.DISBAND)
            : this.gameManager.config.getWithoutLogs('client/clan/labels/leaveLabel', TeamsConst.LABELS.CLAN.LEAVE);
        let templateParams = {
            clanId: this.message.id,
            playerId: this.gameManager.playerData.id,
            leaveActionLabel: leaveActionLabel,
            clanPlayersTitle: this.gameManager.config.getWithoutLogs(
                'client/clan/labels/clanPlayersTitle',
                TeamsConst.LABELS.CLAN.PLAYERS_TITLE
            ),
            clanPlayers,
            clanMembersTitle: this.gameManager.config.getWithoutLogs(
                'client/clan/labels/clanMembersTitle',
                TeamsConst.LABELS.CLAN.MEMBERS_TITLE
            ),
            clanMembers
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

    createClanPlayerBox(playerData)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let templateContent = this.uiScene.cache.html.get('clanPlayerData');
        if(!templateContent){
            Logger.error('Missing template "clanPlayerData".');
            return '';
        }
        return this.gameManager.gameEngine.parseTemplate(templateContent, {
            playerId: playerData.player_id,
            playerName: playerData.name,
            playerProperties: this.createSharedPropertiesContent(playerData.sharedProperties),
        });
    }

    createClanMemberBox(playerData)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let templateContent = this.uiScene.cache.html.get('clanMemberData');
        if(!templateContent){
            Logger.error('Missing template "clanMemberData".');
            return '';
        }
        let isPlayerOwner = playerData.id.toString() === this.message.ownerId.toString();
        return this.gameManager.gameEngine.parseTemplate(templateContent, {
            playerId: playerData.id,
            playerName: playerData.name,
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
        for(let i of Object.keys(playerSharedProperties)){
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
            let playerNameElement = this.gameDom.getElement(selectorPlayerName);
            if(!playerNameElement){
                Logger.notice('Player name element not found.', selectorPlayerName);
            }
            playerNameElement?.addEventListener('click', () => {
                this.gameManager.getCurrentPlayer().setTargetPlayerById(playerData.sessionId);
            });
            let playerPropertiesElement = this.gameDom.getElement(selectorPlayerProperties);
            if(!playerNameElement){
                Logger.notice('Player properties element not found.', selectorPlayerProperties);
            }
            playerPropertiesElement?.addEventListener('click', () => {
                this.gameManager.getCurrentPlayer().setTargetPlayerById(playerData.sessionId);
            });
        }
    }

}

module.exports.ClanMessageHandler = ClanMessageHandler;
