/**
 *
 * Reldens - Users Client Plugin.
 *
 * Handles user-related client features including lifebars, player stats UI, and player selection.
 *
 */

const { LifebarUi } = require('./lifebar-ui');
const { PlayerStatsUi } = require('./player-stats-ui');
const { ActionsConst } = require('../../actions/constants');
const { GameConst } = require('../../game/constants');
const Translations = require('./snippets/en_US');
const { TranslationsMapper } = require('../../snippets/client/translations-mapper');
const { UsersConst } = require('../constants');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class UsersPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     * @return {Promise<void>}
     */
    async setup(props)
    {
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        this.initialGameData = {};
        if(this.validateProperties()){
            this.setTranslations();
            this.listenEvents();
            this.setupPlayerStatsUi();
        }
    }

    /**
     * @returns {boolean}
     */
    validateProperties()
    {
        if(!this.gameManager){
            Logger.error('Game Manager undefined in UsersPlugin.');
            return false;
        }
        if(!this.events){
            Logger.error('EventsManager undefined in UsersPlugin.');
            return false;
        }
        return true;
    }

    /**
     * @returns {void}
     */
    setupPlayerStatsUi()
    {
        this.playerStatsUi = new PlayerStatsUi({events: this.events});
        this.playerStatsUi.createPlayerStatsUi();
    }

    listenEvents()
    {
        this.events.on('reldens.beforeCreateEngine', (initialGameData, gameManager) => {
            this.initialGameData = initialGameData;
            this.onBeforeCreateEngine(initialGameData, gameManager);
            if(!this.lifeBarUi){
                this.lifeBarUi = new LifebarUi({events: this.events});
                this.lifeBarUi.createLifeBarUi(gameManager);
            }
        });
    }

    /**
     * @returns {boolean}
     */
    setTranslations()
    {
        if(!this.events || !this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, UsersConst.MESSAGE.DATA_VALUES);
    }

    /**
     * @param {Object} initialGameData
     * @param {Object} gameManager
     * @returns {void}
     */
    onBeforeCreateEngine(initialGameData, gameManager)
    {
        let isMultiplayerEnabled = gameManager.config.get('client/players/multiplePlayers/enabled', false);
        let isRoomSelectionDisabled = gameManager.config.get('client/rooms/selection/allowOnLogin', false);
        // @TODO - BETA - If the player selection container doesn't exist we should create one.
        let playersCount = sc.isTrue(initialGameData, 'players') ? Object.keys(initialGameData.players).length : 0;
        // if multiplayer is disabled and the user already has a player then just allow the engine to be executed:
        if(0 < playersCount && !isMultiplayerEnabled && !isRoomSelectionDisabled){
            // before return set the only player available:
            initialGameData.player = initialGameData.players[0];
            return;
        }
        // for every other case we will stop the normal execution of the engine and show the selection/creation block:
        gameManager.canInitEngine = false;
        let playerSelection = gameManager.gameDom.getElement(GameConst.SELECTORS.PLAYER_SELECTION);
        playerSelection.classList.remove('hidden');
        // if multiplayer is enabled, the user already has a player it can only select the room:
        if(!isMultiplayerEnabled && 1 === playersCount){
            this.prepareSinglePlayerInput(playerSelection, initialGameData, gameManager);
            return;
        }
        // if multiplayer is enabled and the user already has a player then set up the selector form:
        if(isMultiplayerEnabled && 0 < playersCount){
            this.preparePlayerSelector(playerSelection, initialGameData, gameManager);
        }
        this.preparePlayerCreator(playerSelection, initialGameData, gameManager);
    }

    /**
     * @param {HTMLElement} playerSelection
     * @param {Object} initialGameData
     * @param {Object} gameManager
     * @returns {boolean|void}
     */
    prepareSinglePlayerInput(playerSelection, initialGameData, gameManager)
    {
        // @TODO - BETA - Extract all this.
        let form = gameManager.gameDom.getElement(GameConst.SELECTORS.PLAYER_SELECTION_FORM);
        let player = initialGameData.player;
        if(!form || !player){
            Logger.error('Form or player not defined in prepareSinglePlayerInput.');
            return false;
        }
        gameManager.gameDom.getElement(GameConst.SELECTORS.PLAYER_SELECT_ELEMENT)?.remove();
        let playerLabel = this.gameManager.services.translator.t(
            UsersConst.SNIPPETS.OPTION_LABEL,
            {
                playerName: player.name,
                currentLevel: player.currentLevel,
                classPathLabel: player.currentClassPathLabel
            }
        );
        let selectedPlayerHiddenInput = gameManager.gameDom.createElement('input');
        selectedPlayerHiddenInput.type = 'hidden';
        selectedPlayerHiddenInput.id = GameConst.SELECTORS.PLAYER_SELECT_ELEMENT;
        selectedPlayerHiddenInput.value = player.id;
        let playerLabelElement = gameManager.gameDom.createElement('div');
        playerLabelElement.innerText = playerLabel;
        form.append(selectedPlayerHiddenInput);
        let playerSelectBox = gameManager.gameDom.getElement('.player-select-box');
        playerSelectBox?.append(playerLabelElement);
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            playerSelection.classList.add('hidden');
            this.submitSelectedPlayer(gameManager, form, selectedPlayerHiddenInput, player);
            return false;
        });
        this.showAvatarContainer(gameManager, initialGameData, selectedPlayerHiddenInput);
        form.classList.remove('hidden');
    }

    /**
     * @param {Object} gameManager
     * @param {HTMLFormElement} form
     * @param {HTMLInputElement} selectElement
     * @param {Object} player
     * @returns {void}
     */
    submitSelectedPlayer(gameManager, form, selectElement, player)
    {
        // @TODO - BETA - Extract all this.
        gameManager.events.emitSync('reldens.onPrepareSinglePlayerSelectorFormSubmit', {
            usersPlugin: this,
            form,
            selectElement,
            player,
            gameManager
        });
        gameManager.initEngine().catch((error) => {
            Logger.error(error);
            // @TODO - BETA - Add error handling here.
        });
    }

    /**
     * @param {Object} gameManager
     * @param {Object} initialGameData
     * @param {HTMLElement} selectElement
     * @returns {void}
     */
    showAvatarContainer(gameManager, initialGameData, selectElement)
    {
        // @TODO - BETA - Extract all this.
        let additionalInfoContainer = gameManager.gameDom.getElement(
            GameConst.SELECTORS.PLAYER_SELECTION_ADDITIONAL_INFO
        );
        if(!additionalInfoContainer){
            return;
        }
        if(!this.gameManager.config.getWithoutLogs('client/players/multiplePlayers/showAvatar', true)){
            return;
        }
        let avatarContainer = gameManager.gameDom.createElement('div');
        avatarContainer.className = 'avatar-container';
        // @TODO - BETA - Refactor, extract all the styles and replace the avatar background by an element.
        let avatar = gameManager.gameDom.createElement('div');
        let avatarKey = initialGameData.player.avatarKey;
        avatar.classList.add('class-path-select-avatar');
        avatar.style.backgroundImage = `url('/assets/custom/sprites/${avatarKey}${GameConst.FILES.EXTENSIONS.PNG}')`;
        let widthInPx = this.gameManager.config.getWithoutLogs('client/players/size/width', '0')+'px';
        avatar.style.backgroundPositionX = '-'+widthInPx;
        avatar.style.width = widthInPx;
        avatar.style.height = this.gameManager.config.getWithoutLogs('client/players/size/height', '0')+'px';
        avatarContainer.append(avatar);
        additionalInfoContainer.append(avatarContainer);
    }

    /**
     * @param {HTMLElement} playerSelection
     * @param {Object} initialGameData
     * @param {Object} gameManager
     * @returns {boolean}
     */
    preparePlayerSelector(playerSelection, initialGameData, gameManager)
    {
        let form = gameManager.gameDom.getElement(GameConst.SELECTORS.PLAYER_SELECTION_FORM);
        let select = gameManager.gameDom.getElement(GameConst.SELECTORS.PLAYER_SELECT_ELEMENT);
        if(!form || !select){
            return false;
        }
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let selectedOption = select.options[select.selectedIndex].value;
            let selectedPlayer = this.getPlayerById(initialGameData.players, Number(selectedOption));
            if(selectedPlayer){
                let loadingContainer = form.querySelector(GameConst.SELECTORS.LOADING_CONTAINER);
                if(loadingContainer){
                    loadingContainer?.classList.remove(GameConst.CLASSES.HIDDEN);
                }
                gameManager.initialGameData.player = selectedPlayer;
                gameManager.events.emitSync('reldens.onPreparePlayerSelectorFormSubmit', {
                    usersPlugin: this,
                    form,
                    select,
                    selectedPlayer,
                    gameManager
                });
                gameManager.initEngine().catch((error) => {
                    Logger.error(error);
                });
            }
            return false;
        });
        for(let i of Object.keys(initialGameData.players)){
            let player = initialGameData.players[i];
            let option = new Option(
                this.gameManager.services.translator.t(
                    UsersConst.SNIPPETS.OPTION_LABEL,
                    {
                        playerName: player.name,
                        currentLevel: player.currentLevel,
                        classPathLabel: player.currentClassPathLabel
                    }
                ),
                player.id
            );
            option.dataset.key = player.avatarKey;
            select.append(option);
        }
        this.showAvatarContainer(gameManager, initialGameData, select);
        form.classList.remove('hidden');
    }

    /**
     * @param {HTMLElement} playerSelection
     * @param {Object} initialGameData
     * @param {Object} gameManager
     * @returns {void}
     */
    preparePlayerCreator(playerSelection, initialGameData, gameManager)
    {
        let form = gameManager.gameDom.getElement(ActionsConst.SELECTORS.PLAYER_CREATE_FORM);
        if(!form){
            return;
        }
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            // @TODO - BETA - Change classes by constants and make the .response-error toggle the hidden class.
            let errorElement = gameManager.gameDom.getElement('#player-create-form .response-error');
            errorElement.innerHTML = '';
            let formData = new FormData(form);
            let serializedForm = sc.serializeFormData(formData);
            // @TODO - BETA - Make player name length configurable.
            if(3 > serializedForm['new-player-name'].toString().length){
                return false;
            }
            gameManager.submitedForm = true;
            gameManager.events.emitSync('reldens.onPreparePlayerCreationFormSubmit', {
                usersPlugin: this,
                form,
                gameManager
            });
            try {
                gameManager.gameRoom.send('*', {act: GameConst.CREATE_PLAYER, formData: serializedForm});
            } catch (error) {
                Logger.critical('Create player error.', error);
                gameManager.gameDom.alertReload(gameManager.services.translator.t('game.errors.connectionLost'));
            }
            return false;
        });
    }

    /**
     * @param {Array<Object>} players
     * @param {number} playerId
     * @returns {Object|boolean}
     */
    getPlayerById(players, playerId)
    {
        if(0 === players.length){
            return false;
        }
        for(let player of players){
            if(player.id === playerId){
                return player;
            }
        }
        return false;
    }

}

module.exports.UsersPlugin = UsersPlugin;
