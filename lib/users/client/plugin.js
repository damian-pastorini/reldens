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
        if(!this.gameManager){
            Logger.error('Game Manager undefined in InventoryPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        this.setTranslations();
        this.initialGameData = {};
        this.events.on('reldens.beforeCreateEngine', (initialGameData, gameManager) => {
            this.initialGameData = initialGameData;
            this.onBeforeCreateEngine(initialGameData, gameManager);
            if(!this.lifeBarUi){
                this.lifeBarUi = new LifebarUi({events: this.events});
                this.lifeBarUi.createLifeBarUi(gameManager);
            }
        });
        this.playerStatsUi = new PlayerStatsUi({events: this.events});
        this.playerStatsUi.createPlayerStatsUi();
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
        let isMultiplayerEnabled = sc.isTrue(initialGameData.gameConfig.client.players.multiplePlayers, 'enabled');
        let playerSelection = gameManager.gameDom.getElement('#player-selection');
        // @TODO - BETA - If the player selection container doesn't exist we should create one.
        let playersCount = sc.isTrue(initialGameData, 'players') ? Object.keys(initialGameData.players).length : 0;
        // if multiplayer is disabled and the user already has a player then just allow the engine to be executed:
        if(0 < playersCount && !isMultiplayerEnabled){
            // before return set the only player available:
            initialGameData.player = initialGameData.players[0];
            return;
        }
        // for every other case we will stop the normal execution of the engine and show the selection/creation block:
        gameManager.canInitEngine = false;
        playerSelection.classList.remove('hidden');
        // if multiplayer is enabled and the user already has a player then set up the selector form:
        if(isMultiplayerEnabled && 0 < playersCount){
            this.preparePlayerSelector(playerSelection, initialGameData, gameManager);
        }
        this.preparePlayerCreator(playerSelection, initialGameData, gameManager);
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
                gameManager.events.emitSync('reldens.onPreparePlayerSelectorFormSubmit',
                    this,
                    form,
                    select,
                    selectedPlayer,
                    gameManager
                );
                gameManager.initEngine().catch((err) => {
                    Logger.error(err);
                });
            }
            return false;
        });
        for(let i of Object.keys(initialGameData.players)){
            let player = initialGameData.players[i];
            let option = new Option(
                this.gameManager.translator.t(
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
        let avatarContainer = gameManager.gameDom.getElement('.player-selection-additional-info');
        if(avatarContainer){
            let playersConfig = initialGameData.gameConfig.client.players;
            gameManager.getFeature('actions').playerSelector.appendAvatarOnSelector(
                select,
                avatarContainer,
                playersConfig
            );
        }
        form.classList.remove('hidden');
    }

    preparePlayerCreator(playerSelection, initialGameData, gameManager)
    {
        let formElement = gameManager.gameDom.getElement(ActionsConst.SELECTORS.PLAYER_CREATE_FORM);
        if(!formElement){
            return;
        }
        formElement.addEventListener('submit', (e) => {
            e.preventDefault();
            let errorElement = gameManager.gameDom.getElement('#player-create-form .response-error');
            errorElement.innerHTML = '';
            let formData = new FormData(formElement);
            let serializedForm = sc.serializeFormData(formData);
            // @TODO - BETA - Make player name length configurable.
            if(3 > serializedForm['new-player-name'].toString().length){
                return false;
            }
            gameManager.submitedForm = true;
            gameManager.gameRoom.send('*', {act: GameConst.CREATE_PLAYER, formData: serializedForm});
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
