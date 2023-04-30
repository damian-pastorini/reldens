/**
 *
 * Reldens - TeamMessageHandler
 *
 */

const { UserInterface } = require('../../game/client/user-interface');
const { TeamsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class TeamMessageHandler
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
            Logger.info('Missing RoomEvents on TeamMessageHandler.');
            return false;
        }
        if(!this.message){
            Logger.info('Missing message on TeamMessageHandler.');
            return false;
        }
        if(!this.gameManager){
            Logger.info('Missing GameManager on TeamMessageHandler.');
            return false;
        }
        // @NOTE: the message could arrive before the uiScene gets ready.
        // if(!this.uiScene){
        //     Logger.info('Missing UI Scene on TeamMessageHandler.');
        // }
        return this.uiScene;

    }

    showTeamRequest()
    {
        this.createTeamUi(this.teamUiKey());
        this.roomEvents.initUi({
            id: this.teamUiKey(),
            title: this.gameManager.config.getWithoutLogs(
                'client/team/labels/requestFromTitle',
                TeamsConst.LABELS.TEAM.REQUEST_FROM
            ),
            content: this.message.from,
            options: this.gameManager.config.get('client/ui/options/acceptOrDecline'),
            overrideSendOptions: {act: TeamsConst.ACTIONS.TEAM_ACCEPTED, id: this.message.id}
        });
        this.gameDom.getElement('#opt-2-'+this.teamUiKey())?.addEventListener('click', () => {
            this.removeTeamUi();
        });
    }

    removeTeamUi()
    {
        let uiElement = this.gameManager.getUiElement(this.teamUiKey());
        if(!uiElement){
            Logger.error('UI Element not found by team UI key "'+this.teamUiKey()+'".');
            return false;
        }
        uiElement.removeElement();
        delete this.uiScene.userInterfaces[this.teamUiKey()];
        delete this.uiScene.elementsUi[this.teamUiKey()];
        this.uiScene.currentTeam = false;
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
            TeamsConst.LABELS.TEAM.LEADER_NAME_TITLE
            ).replace('%leaderName', this.message.leaderName);
        let container = this.gameManager.gameDom.getElement('#box-'+teamUiKey+' .box-content');
        if(!container){
            Logger.error('Missing container: "#box-'+teamUiKey+' .box-content".');
            return false;
        }
        let uiBox = this.uiScene.elementsUi[teamUiKey];
        this.roomEvents.uiSetTitle(uiBox, {title});
        this.roomEvents.uiSetContent(uiBox, {content: ''}, this.uiScene);
        let players = sc.get(this.message, 'players', false);
        this.uiScene.currentTeam = players;
        this.updateTeamBox(players, container);
    }

    createTeamUi(teamUiKey)
    {
        let teamsUi = sc.get(this.uiScene.userInterfaces, teamUiKey);
        if(teamsUi){
            return teamsUi;
        }
        if(!this.uiScene.userInterfaces){
            this.uiScene.userInterfaces = {};
        }
        this.uiScene.userInterfaces[teamUiKey] = new UserInterface(
            this.gameManager,
            {id: teamUiKey, type: TeamsConst.KEY, defaultOpen: true, defaultClose: true},
            'assets/features/teams/templates/ui-teams.html',
            TeamsConst.KEY
        );
        this.uiScene.userInterfaces[teamUiKey].createUiElement(this.uiScene, TeamsConst.KEY);
        return this.uiScene.userInterfaces[teamUiKey];
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
        this.activateTeamPlayerActions(players);
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
        let playerId = this.gameManager.playerData.id
        let isPlayerOwner = playerId === this.message.id;
        let leaveActionLabel = isPlayerOwner
            ? this.gameManager.config.getWithoutLogs('client/team/labels/disbandLabel', TeamsConst.LABELS.TEAM.DISBAND)
            : this.gameManager.config.getWithoutLogs('client/team/labels/leaveLabel', TeamsConst.LABELS.TEAM.LEAVE);
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
        for(let i of Object.keys(playerSharedProperties)){
            templateContent = this.uiScene.cache.html.get('teamsSharedProperty');
            let propertyData = playerSharedProperties[i];
            let propertyMaxValue = sc.get(propertyData, 'max', '');
            if('' !== propertyMaxValue){
                propertyMaxValue = this.gameManager.config.getWithoutLogs(
                    'client/team/labels/propertyMaxValue',
                    TeamsConst.LABELS.TEAM.PROPERTY_MAX_VALUE
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

    activateTeamPlayerActions(playersData)
    {
        for(let i of Object.keys(playersData)){
            let playerData = playersData[i];
            let selectorPlayerName = '.team-player-'+i+' .player-name';
            this.gameDom.getElement(selectorPlayerName)?.addEventListener('click', () => {
                this.gameManager.getCurrentPlayer().setTargetPlayerById(playerData.sessionId);
            });
            let selectorPlayerProperties = '.team-player-'+i+' .properties-list-container';
            this.gameDom.getElement(selectorPlayerProperties)?.addEventListener('click', () => {
                this.gameManager.getCurrentPlayer().setTargetPlayerById(playerData.sessionId);
            });
            let selectorPlayerRemove = '.team-player-'+i+' .team-remove-button';
            this.gameDom.getElement(selectorPlayerRemove)?.addEventListener('click', () => {
                this.gameManager.activeRoomEvents.room.send('*', {
                    act: TeamsConst.ACTIONS.TEAM_REMOVE,
                    id: this.message.id,
                    remove: playerData.id
                });
            });
        }
    }

}

module.exports.TeamMessageHandler = TeamMessageHandler;
