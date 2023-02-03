/**
 *
 * Reldens - TeamMessageHandler
 *
 */

const { ErrorManager, Logger, sc } = require('@reldens/utils');
const { TeamsConst } = require('../constants');
const { ObjectsConst } = require('../../objects/constants');
const { UserInterface } = require('../../game/client/user-interface');

class TeamMessageHandler
{

    constructor(props)
    {
        this.roomEvents = sc.get(props, 'roomEvents', false);
        this.message = sc.get(props, 'message', false);
        this.gameManager = this.roomEvents?.gameManager;
        this.gameDom = this.gameManager?.gameDom;
        this.uiScene = this.gameManager?.gameEngine?.uiScene;
        this.validate();
    }

    validate()
    {
        if(!this.roomEvents){
            ErrorManager.error('Missing RoomEvents.');
        }
        if(!this.message){
            ErrorManager.error('Missing message.');
        }
        if(!this.gameManager){
            ErrorManager.error('Missing GameManager.');
        }
        if(!this.uiScene){
            ErrorManager.error('Missing UiScene.');
        }
    }

    updateContents()
    {
        if(TeamsConst.ACTIONS.TEAM_INVITE === this.message.act){
            return this.showTeamRequest();
        }
        if(
            TeamsConst.ACTIONS.TEAM_ACCEPTED === this.message.act
            || TeamsConst.ACTIONS.TEAM_UPDATE === this.message.act
        ){
            return this.showTeamBox();
        }
    }

    showTeamRequest()
    {
        let teamUiKey = TeamsConst.KEY+this.message.id;
        let teamsUi = this.createTeamUi(teamUiKey);
        this.roomEvents.initUi({
            id: teamUiKey,
            title: this.gameManager.config.getWithoutLogs(
                'client/teams/labels/requestFromTitle',
                TeamsConst.LABELS.TEAM_REQUEST_FROM
            ),
            content: this.message.from,
            options: this.gameManager.config.getWithoutLogs('client/ui/options/acceptOrDecline'),
            overrideSendOptions: {
                act: TeamsConst.ACTIONS.TEAM_ACCEPTED,
                id: this.message.id
            }
        });
        if(teamsUi){
            this.gameDom.getElement('#opt-2-'+teamUiKey)?.addEventListener('click', () => {
                this.gameDom.getElement('#box-close-'+teamUiKey)?.click();
            });
        }
    }

    showTeamBox()
    {
        let teamUiKey = TeamsConst.KEY+this.message.id;
        this.createTeamUi(teamUiKey);
        let title = this.gameManager.config.getWithoutLogs(
            'client/team/labels/leaderNameTitle',
            TeamsConst.LABELS.LEADER_NAME_TITLE
            ).replace('%leaderName', this.message.leaderName);
        this.roomEvents.initUi({
            id: teamUiKey,
            title,
            content: '',
            options: {}
        });
        let container = this.gameManager.gameDom.getElement('#box-'+teamUiKey+' .box-content');
        if(!container){
            Logger.error('Missing container: "#box-'+teamUiKey+' .box-content".');
            return false;
        }
        let players = sc.get(this.message, 'players', false);
        console.log({message: this.message});
        this.updateTeamBox(players, container);
    }

    createTeamUi(teamUiKey)
    {
        let teamsUi = sc.hasOwn(this.roomEvents.teamUi, teamUiKey);
        if(!teamsUi){
            this.roomEvents.teamUi[teamUiKey] = new UserInterface(
                this.gameManager,
                {id: teamUiKey, type: TeamsConst.KEY},
                'assets/html/dialog-box.html',
                TeamsConst.KEY
            );
            this.roomEvents.teamUi[teamUiKey].createUiElement(this.uiScene, TeamsConst.KEY);
        }
        return teamsUi;
    }

    updateTeamBox(players, container)
    {
        if(!players){
            Logger.error('Players not defined.', players);
            return;
        }
        let teamMembers = '';
        for(let i of Object.keys(players)){
            teamMembers += this.createTeamMemberBox(players[i]);
        }
        container.innerHTML = this.createTeamContainer(teamMembers);
        this.activateTeamTargetActions(players);
        this.activateTeamLeaveButtonAction();
    }

    createTeamContainer(teamMembers)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('teamContainer');
        if(!messageTemplate){
            Logger.error('Missing template "teamContainer".');
            return '';
        }
        let templateParams = {
            teamActionKey: this.message.id,
            disbandActionLabel: this.gameManager.config.getWithoutLogs(
                'client/team/titles/disbandLabel',
                TeamsConst.LABELS.DISBAND
            ),
            teamMembers
        };
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, templateParams);
    }

    activateTeamLeaveButtonAction()
    {
        let confirmButton = this.gameManager.gameDom.getElement('.confirm-'+this.message.id);
        confirmButton?.addEventListener('click', () => {
            this.gameManager.activeRoomEvents.room.send('*', {
                act: TeamsConst.ACTIONS.TEAM_ACCEPTED,
                id: this.message.id,
                value: this.message.id
            });
        });
        let disconfirmButton = this.gameManager.gameDom.getElement('.disconfirm-'+this.message.id);
        disconfirmButton?.addEventListener('click', () => {
            this.gameDom.getElement('#box-close-'+TeamsConst.KEY+this.message.id)?.click();
        });
        let cancelButton = this.gameManager.gameDom.getElement('.cancel-'+this.message.id);
        cancelButton?.addEventListener('click', () => {
            this.gameDom.getElement('#box-close-'+TeamsConst.KEY+this.message.id)?.click();
        });
    }

    createTeamMemberBox(playerData)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let messageTemplate = this.uiScene.cache.html.get('teamPlayerData');
        if(!messageTemplate){
            Logger.error('Missing template "teamPlayerData".');
            return '';
        }
        return this.gameManager.gameEngine.parseTemplate(messageTemplate, {
            playerId: playerData.id,
            playerName: playerData.name,
            playerProperties: this.createSharedPropertiesContent(playerData.sharedProperties)
        });
    }

    createSharedPropertiesContent(playerSharedProperties)
    {
        let messageTemplate = this.uiScene.cache.html.get('teamsSharedProperty');
        if(!messageTemplate){
            Logger.error('Missing template "teamsSharedProperty".');
            return '';
        }
        let sharedPropertiesContent = '';
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        for(let i of Object.keys(playerSharedProperties)) {
            messageTemplate = this.uiScene.cache.html.get('teamsSharedProperty');
            let propertyData = playerSharedProperties[i];
            let propertyMaxValue = sc.get(propertyData, 'max', '');
            if('' !== propertyMaxValue){
                propertyMaxValue = this.gameManager.config.getWithoutLogs(
                    'client/team/labels/propertyMaxValue',
                    TeamsConst.LABELS.PROPERTY_MAX_VALUE
                    ).replace('%propertyMaxValue', propertyMaxValue);
            }
            sharedPropertiesContent += this.gameManager.gameEngine.parseTemplate(messageTemplate, {
                key: i,
                label: propertyData.label,
                value: propertyData.value,
                max: propertyMaxValue
            });
        }
        return sharedPropertiesContent;
    }

    activateTeamTargetActions(playersData)
    {
        for(let i of Object.keys(playersData)){
            let player = playersData[i];
            /*
            let itemContainerSelector = '.team-item-to-be-'+item.teamAction+'.team-item-'+item.uid
                +' .team-action-'+item.teamAction;
            let itemButtonSelector = itemContainerSelector+' button';
            let itemActionButton = this.gameDom.getElement(itemButtonSelector);
            if(!itemActionButton){
                Logger.error('Activate team item "'+item.uid+'" action button not found.');
                continue;
            }
            itemActionButton.addEventListener('click', () => {
                // @TODO - HEREEEEEEEEEEEEEEEEEE! Send TARGET ACTION.
                // this.gameManager.activeRoomEvents.room.send('*', dataSend);
            });
            */
        }
    }

}

module.exports.TeamMessageHandler = TeamMessageHandler;