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
        if(!classesData){
            Logger.error('Classes not defined, can not populate the classes selector.');
            return false;
        }
        let multiConfig = sc.get(playersConfig, 'multiplePlayers', false);
        if((!multiConfig || !multiConfig.enabled) && activePlayer){
            return false;
        }
        let playerAdditional = this.gameDom.getElement('.player_creation_additional_info');
        if(!playerAdditional){
            return false;
        }
        // @TODO - BETA - Make all texts configurable and implement snippets for translations.
        this.gameDom.getElement('#player_create_form').classList.remove('hidden');
        let div = this.gameDom.createElement('div');
        div.id = 'class-path-selector-box';
        div.classList.add('input-box');
        let label = this.gameDom.createElement('label');
        label.for = 'class-path-select';
        label.innerText = 'Select Your Class-Path';
        let select = this.gameDom.createElement('select');
        select.id = 'class-path-select';
        select.name = 'class_path_select';
        for(let id of Object.keys(classesData)){
            let option = new Option(classesData[id].label, id);
            option.dataset.key = classesData[id].key;
            select.append(option);
        }
        div.append(label);
        div.append(select);
        let avatarDiv = this.gameDom.createElement('div');
        avatarDiv.className = 'avatar-container';
        this.appendAvatarOnSelector(select, avatarDiv, playersConfig);
        div.append(avatarDiv);
        playerAdditional.append(div);
    }

    appendAvatarOnSelector(select, container, playersConfig)
    {
        let avatar = this.gameDom.createElement('div');
        let avatarKey = select.options[select.selectedIndex].dataset.key;
        avatar.classList.add('class-path-select-avatar');
        avatar.style.backgroundImage = `url('/assets/custom/sprites/${avatarKey}.png')`;
        avatar.style.backgroundPosition = 'top left';
        avatar.style.display = 'block';
        avatar.style.width = playersConfig.size.width+'px';
        avatar.style.height = playersConfig.size.height+'px';
        avatar.style.margin = '10px auto';
        select.addEventListener('change', () => {
            let avatarKey = select.options[select.selectedIndex].dataset.key;
            avatar.style.backgroundImage = `url('/assets/custom/sprites/${avatarKey}.png')`;
        });
        container.append(avatar);
    }

}

module.exports.PlayerSelector = PlayerSelector;