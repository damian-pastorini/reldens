/**
 *
 * Reldens - TeamMessageHandler
 *
 */

const { UserInterface } = require('../../game/client/user-interface');
const { TeamsConst } = require('../constants');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

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
            ErrorManager.error('Missing UI Scene.');
        }
    }

    updateContents()
    {
        if(TeamsConst.ACTIONS.TEAM_INVITE === this.message.act){
            return this.showTeamRequest();
        }
        if(TeamsConst.ACTIONS.TEAM_UPDATE === this.message.act){
            if(!this.gameManager.gameDom.getElement('#box-'+this.teamUiKey()+' .box-content')){
                this.gameManager.gameEngine.clearTarget();
            }
            return this.showTeamBox();
        }
    }

    showTeamRequest()
    {
        let teamsUi = this.createTeamUi(this.teamUiKey());
        this.roomEvents.initUi({
            id: this.teamUiKey(),
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
            this.gameDom.getElement('#opt-2-'+this.teamUiKey())?.addEventListener('click', () => {
                this.gameDom.getElement('#box-close-'+this.teamUiKey())?.click();
            });
        }
    }

    teamUiKey()
    {
        return TeamsConst.KEY + this.message.id;
    }

    showTeamBox()
    {
        let teamUiKey = this.teamUiKey();
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
                'assets/features/teams/templates/ui-teams.html',
                TeamsConst.KEY
            );
            this.roomEvents.teamUi[teamUiKey].createUiElement(this.uiScene, TeamsConst.KEY);
        }
        return this.roomEvents.teamUi[teamUiKey];
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
        let templateContent = this.uiScene.cache.html.get('teamContainer');
        if(!templateContent){
            Logger.error('Missing template "teamContainer".');
            return '';
        }
        let playerId = this.gameManager.getCurrentPlayer().playerId;
        let isPlayerOwner = playerId === this.message.id;
        let leaveActionLabel = isPlayerOwner
            ? this.gameManager.config.getWithoutLogs('client/team/titles/disbandLabel', TeamsConst.LABELS.DISBAND)
            : this.gameManager.config.getWithoutLogs('client/team/titles/leaveLabel', TeamsConst.LABELS.LEAVE);
        let templateParams = {
            teamId: this.message.id,
            playerId,
            leaveActionLabel: leaveActionLabel,
            teamMembers
        };
        return this.gameManager.gameEngine.parseTemplate(templateContent, templateParams);
    }

    activateTeamLeaveButtonAction()
    {
        let leaveButton = this.gameManager.gameDom.getElement('.leave-'+this.message.id);
        leaveButton?.addEventListener('click', () => {
            this.gameManager.activeRoomEvents.room.send('*', {
                act: TeamsConst.ACTIONS.TEAM_LEAVE,
                id: this.message.id
            });
        });
    }

    createTeamMemberBox(playerData)
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let templateContent = this.uiScene.cache.html.get('teamPlayerData');
        if(!templateContent){
            Logger.error('Missing template "teamPlayerData".');
            return '';
        }
        let isPlayerOwner = this.gameManager.getCurrentPlayer().playerId === this.message.id;
        return this.gameManager.gameEngine.parseTemplate(templateContent, {
            playerId: playerData.id,
            playerName: playerData.name,
            playerProperties: this.createSharedPropertiesContent(playerData.sharedProperties),
            playerRemove: isPlayerOwner ? this.createDismissPlayerButton(playerData) : ''
        });
    }

    createDismissPlayerButton(playerData)
    {
        let templateContent = this.uiScene.cache.html.get('teamRemove');
        if(!templateContent){
            Logger.error('Missing template "teamRemove".');
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
                    'client/team/labels/propertyMaxValue',
                    TeamsConst.LABELS.PROPERTY_MAX_VALUE
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

    activateTeamTargetActions(playersData)
    {
        for(let i of Object.keys(playersData)){
            let playerData = playersData[i];
            let selectorPlayerName = '.team-player-'+i+' .player-name';
            let selectorPlayerProperties = '.team-player-'+i+' .properties-list-container';
            console.log({i, selectorPlayerName, selectorPlayerProperties, playerData});
            this.gameDom.getElement(selectorPlayerName).addEventListener('click', () => {
                this.gameManager.getCurrentPlayer().setTargetPlayerById(playerData.sessionId);
            });
            this.gameDom.getElement(selectorPlayerProperties).addEventListener('click', () => {
                this.gameManager.getCurrentPlayer().setTargetPlayerById(playerData.sessionId);
            });
        }
    }

}

module.exports.TeamMessageHandler = TeamMessageHandler;
