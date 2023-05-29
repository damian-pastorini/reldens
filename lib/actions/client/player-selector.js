/**
 *
 * Reldens - PlayerSelector.
 *
 */

const { Logger, sc } = require('@reldens/utils');

class PlayerSelector
{

    constructor(props)
    {
        // @TODO - BETA - Refactor use DI or something to avoid all props assigned and validations.
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ActionsPlugin PlayerSelector.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ActionsPlugin PlayerSelector.');
        }
        this.gameDom = this.gameManager.gameDom;
    }

    populateClassesSelector(classesData, playersConfig, activePlayer)
    {
        if(!sc.isObject(classesData) || 0 === Object.keys(classesData).length){
            Logger.error('Classes not defined, can not populate the classes selector.');
            return false;
        }
        let multiConfig = sc.get(playersConfig, 'multiplePlayers', false);
        if((!multiConfig || !multiConfig.enabled) && activePlayer){
            return false;
        }
        let playerAdditional = this.gameDom.getElement('.player-creation-additional-info');
        if(!playerAdditional){
            return false;
        }
        // @TODO - BETA - Extract all the DOM objects creation, move into the gameDom.
        this.gameDom.getElement('#player-create-form').classList.remove('hidden');
        let div = this.gameDom.createElement('div');
        div.id = 'class-path-selector-box';
        div.classList.add('input-box');
        let label = this.gameDom.createElement('label');
        let classPathSelectId = 'class-path-select';
        label.for = classPathSelectId;
        label.innerText = this.gameManager.translator.t('actions.selectClassPath');
        let select = this.gameDom.createElement('select');
        select.id = classPathSelectId;
        select.name = 'class_path_select';
        for(let id of Object.keys(classesData)){
            let option = new Option(classesData[id].label, id);
            option.dataset.key = classesData[id].key;
            select.append(option);
        }
        div.append(label);
        div.append(select);
        if(this.gameManager.config.getWithoutLogs('client/players/multiplePlayers/showAvatar', true)){
            let avatarDiv = this.gameDom.createElement('div');
            avatarDiv.className = 'avatar-container';
            this.appendAvatarOnSelector(select, avatarDiv, playersConfig);
            div.append(avatarDiv);
        }
        playerAdditional.append(div);
    }

    appendAvatarOnSelector(select, container, playersConfig)
    {
        // @TODO - BETA - Refactor, extract all the styles and replace the avatar background by an element.
        let avatar = this.gameDom.createElement('div');
        let avatarKey = select.options[select.selectedIndex].dataset.key;
        avatar.classList.add('class-path-select-avatar');
        avatar.style.backgroundImage = `url('/assets/custom/sprites/${avatarKey}.png')`;
        avatar.style.width = playersConfig.size.width+'px';
        avatar.style.height = playersConfig.size.height+'px';
        select.addEventListener('change', () => {
            let avatarKey = select.options[select.selectedIndex].dataset.key;
            avatar.style.backgroundImage = `url('/assets/custom/sprites/${avatarKey}.png')`;
        });
        container.append(avatar);
    }

}

module.exports.PlayerSelector = PlayerSelector;