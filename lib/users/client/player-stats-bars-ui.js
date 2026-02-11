/**
 *
 * Reldens - PlayerStatsBarsUi
 *
 * Manages player stats bars in the player box UI.
 *
 */

const { BarProperties } = require('./bar-properties');
const { sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class PlayerStatsBarsUi
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {EventsManager} */
        this.events = props.events;
        /** @type {GameManager} */
        this.gameManager = props.gameManager;
        /** @type {Object<string, BarProperties>} */
        this.barPropertiesModels = {};
    }

    setupListeners()
    {
        this.loadBarPropertiesModels();
        this.events.on('reldens.beforePreloadUiScene', (uiScene) => {
            this.preloadBarTemplate(uiScene);
        });
        this.events.on('reldens.playerStatsUpdateAfter', (message, roomEvents) => {
            this.updatePlayerStatsBars(message, roomEvents);
        });
    }

    loadBarPropertiesModels()
    {
        let barsConfig = this.gameManager.config.get('client/players/barsProperties');
        if(!sc.isObject(barsConfig)){
            return false;
        }
        let configKeys = Object.keys(barsConfig);
        if(0 === configKeys.length){
            return false;
        }
        for(let statKey of configKeys){
            this.barPropertiesModels[statKey] = new BarProperties(statKey, barsConfig[statKey]);
        }
        return true;
    }

    preloadBarTemplate(uiScene)
    {
        if(0 === Object.keys(this.barPropertiesModels).length){
            return false;
        }
        uiScene.load.html('playerStatsBar', '/assets/html/player-stats-bar.html');
        return true;
    }

    updatePlayerStatsBars(message, roomEvents)
    {
        if(0 === Object.keys(this.barPropertiesModels).length){
            return false;
        }
        let playerBox = this.gameManager.getUiElement('playerBox');
        if(!playerBox){
            return false;
        }
        let barsContainer = playerBox.getChildByProperty('id', 'ui-player-extras');
        if(!barsContainer){
            return false;
        }
        let barTemplate = roomEvents.gameEngine.uiScene.cache.html.get('playerStatsBar');
        if(!barTemplate){
            return false;
        }
        let barsWrapper = this.gameManager.gameDom.getElement('#player-stats-bars-wrapper', barsContainer);
        if(!barsWrapper){
            this.gameManager.gameDom.appendToElement('#ui-player-extras', '<div id="player-stats-bars-wrapper"></div>');
        }
        let barsHtml = '';
        for(let statKey of Object.keys(this.barPropertiesModels)){
            let barProperties = this.barPropertiesModels[statKey];
            if(!barProperties.ready){
                continue;
            }
            if(!sc.hasOwn(message.stats, statKey)){
                continue;
            }
            let currentValue = message.stats[statKey];
            let maxValue = message.statsBase[statKey];
            let percentage = 0 < maxValue ? (currentValue / maxValue) * 100 : 0;
            let parsedBarTemplate = roomEvents.gameManager.gameEngine.parseTemplate(barTemplate, {
                statKey: statKey,
                statLabel: barProperties.label,
                currentValue: currentValue,
                maxValue: maxValue,
                percentage: percentage,
                activeColor: barProperties.activeColor,
                inactiveColor: barProperties.inactiveColor
            });
            barsHtml = barsHtml+parsedBarTemplate;
        }
        this.gameManager.gameDom.updateContent('#player-stats-bars-wrapper', barsHtml);
        return true;
    }

}

module.exports.PlayerStatsBarsUi = PlayerStatsBarsUi;
