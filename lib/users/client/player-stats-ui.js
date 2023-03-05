/**
 *
 * Reldens - PlayerStatsUi
 *
 */

class PlayerStatsUi
{

    constructor(props)
    {
        this.events = props.events;
    }

    createPlayerStatsUi()
    {
        this.events.on('reldens.beforePreloadUiScene', (scenePreloader) => {
            if(!scenePreloader.gameManager.config.get('client/ui/playerStats/enabled')){
                return false;
            }
            scenePreloader.load.html('playerStats', 'assets/html/ui-player-stats.html');
            scenePreloader.load.html('playerStat', 'assets/html/player-stat.html');
        });
        this.events.on('reldens.beforeCreateUiScene', (scenePreloader) => {
            // @TODO - BETA - Replace by UserInterface.
            let statsUi = scenePreloader.getUiConfig('playerStats');
            if(!statsUi.enabled){
                return false;
            }
            let uiPlayerStats = scenePreloader.add.dom(statsUi.uiX, statsUi.uiY)
                .createFromCache('playerStats');
            let closeButton = uiPlayerStats.getChildByProperty('id', 'player-stats-close');
            let openButton = uiPlayerStats.getChildByProperty('id', 'player-stats-open');
            closeButton?.addEventListener('click', () => {
                let box = uiPlayerStats.getChildByProperty('id', 'player-stats-ui');
                box.style.display = 'none';
                if(openButton){
                    openButton.style.display = 'block';
                }
                uiPlayerStats.setDepth(1);
            });
            openButton?.addEventListener('click', () => {
                let box = uiPlayerStats.getChildByProperty('id', 'player-stats-ui');
                box.style.display = 'block';
                openButton.style.display = 'none';
                uiPlayerStats.setDepth(4);
            });
            scenePreloader.elementsUi['playerStats'] = uiPlayerStats;
        });
    }

}

module.exports.PlayerStatsUi = PlayerStatsUi;
