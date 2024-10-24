/**
 *
 * Reldens - Users Client Plugin.
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

class UsersPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        this.events = sc.get(props, 'events', false);
        this.initialGameData = {};
        if(this.validateProperties()){
            this.setTranslations();
            this.listenEvents();
            this.setupPlayerStatsUi();
        }
    }

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

    setTranslations()
    {
        if(!this.events || !this.gameManager){
            return false;
        }
        TranslationsMapper.forConfig(this.gameManager.config.client, Translations, UsersConst.MESSAGE.DATA_VALUES);
    }

    onBeforeCreateEngine(initialGameData, gameManager)
    {
        let isMultiplayerEnabled = gameManager.config.get('client/players/multiplePlayers/enabled', false);
        let isRoomSelectionDisabled = gameManager.config.get('client/rooms/selection/allowOnLogin', false);
        let playerSelection = gameManager.gameDom.getElement('#player-selection');
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

    prepareSinglePlayerInput(playerSelection, initialGameData, gameManager)
    {
        // @TODO - BETA - Extract all this.
        let form = gameManager.gameDom.getElement('#player-selector-form');
        let player = initialGameData.player;
        if(!form || !player){
            Logger.error('Form or player not defined in prepareSinglePlayerInput.');
            return false;
        }
        gameManager.gameDom.getElement('#player-select-element')?.remove();
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
        selectedPlayerHiddenInput.id = '#player-select-element';
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

    showAvatarContainer(gameManager, initialGameData, selectElement)
    {
        // @TODO - BETA - Extract all this.
        let additionalInfoContainer = gameManager.gameDom.getElement('.player-selection-additional-info');
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

    preparePlayerSelector(playerSelection, initialGameData, gameManager)
    {
        let form = gameManager.gameDom.getElement('#player-selector-form');
        let select = gameManager.gameDom.getElement('#player-select-element');
        if(!form || !select){
            return false;
        }
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            let selectedOption = select.options[select.selectedIndex].value;
            let selectedPlayer = this.getPlayerById(initialGameData.players, Number(selectedOption));
            if(selectedPlayer){
                playerSelection.classList.add('hidden');
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

    preparePlayerCreator(playerSelection, initialGameData, gameManager)
    {
        let form = gameManager.gameDom.getElement(ActionsConst.SELECTORS.PLAYER_CREATE_FORM);
        if(!form){
            return;
        }
        form.addEventListener('submit', (e) => {
            e.preventDefault();
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
