/**
 *
 * Reldens - PlayerSelector.
 *
 * Manages the class path selector for player creation.
 *
 */

const { ActionsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-dom').GameDom} GameDom
 *
 * @typedef {Object} PlayerSelectorProps
 * @property {GameManager} [gameManager]
 * @property {EventsManager} [events]
 */
class PlayerSelector
{

    /**
     * @param {PlayerSelectorProps} props
     */
    constructor(props)
    {
        /** @type {GameManager|false} */
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ActionsPlugin PlayerSelector.');
        }
        /** @type {EventsManager|false} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ActionsPlugin PlayerSelector.');
        }
        /** @type {GameDom} */
        this.gameDom = this.gameManager.gameDom;
    }

    /**
     * @param {Object<string, any>} classesData
     * @param {Object} playersConfig
     * @param {Object} activePlayer
     * @returns {boolean}
     */
    populateClassesSelector(classesData, playersConfig, activePlayer)
    {
        if(!sc.isObject(classesData) || 0 === Object.keys(classesData).length){
            Logger.error('Classes not defined, can not populate the classes selector.');
            this.gameDom.getElement('.player-selection-form-errors')?.append(
                this.gameManager.services?.translator.t('game.errors.missingClasses')
            );
            return false;
        }
        let multiConfig = sc.get(playersConfig, 'multiplePlayers', false);
        if((!multiConfig || !multiConfig.enabled) && activePlayer){
            return false;
        }
        let playerAdditional = this.gameDom.getElement(ActionsConst.SELECTORS.PLAYER_CREATION_ADDITIONAL_INFO);
        if(!playerAdditional){
            return false;
        }
        // @TODO - BETA - Extract all the DOM objects creation, move into the gameDom.
        this.gameDom.getElement(ActionsConst.SELECTORS.PLAYER_CREATE_FORM)?.classList.remove('hidden');
        let div = this.gameDom.createElement('div');
        div.id = 'class-path-selector-box';
        div.classList.add('input-box');
        let label = this.gameDom.createElement('label');
        let classPathSelectId = 'class-path-select';
        label.htmlFor = classPathSelectId;
        label.innerText = this.gameManager.services.translator.t(ActionsConst.SNIPPETS.SELECT_CLASS_PATH);
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
        return true;
    }

    /**
     * @param {HTMLSelectElement} select
     * @param {HTMLElement} container
     * @param {Object} playersConfig
     */
    appendAvatarOnSelector(select, container, playersConfig)
    {
        // @TODO - BETA - Refactor, extract all the styles and replace the avatar background by an element.
        let avatar = this.gameDom.createElement('div');
        let avatarKey = select.options[select.selectedIndex].dataset.key;
        avatar.classList.add('class-path-select-avatar');
        avatar.style.backgroundImage = `url('/assets/custom/sprites/${avatarKey}${GameConst.FILES.EXTENSIONS.PNG}')`;
        let widthInPx = playersConfig.size.width+'px';
        avatar.style.backgroundPositionX = '-'+widthInPx;
        avatar.style.width = widthInPx;
        avatar.style.height = playersConfig.size.height+'px';
        select.addEventListener('change', () => {
            let avatarKey = select.options[select.selectedIndex].dataset.key;
            avatar.style.backgroundImage = `url('/assets/custom/sprites/${avatarKey}${GameConst.FILES.EXTENSIONS.PNG}')`;
        });
        container.append(avatar);
    }

}

module.exports.PlayerSelector = PlayerSelector;
