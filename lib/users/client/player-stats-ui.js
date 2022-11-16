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
        this.PLAYER_STATS_KEY = 'playerStats';
    }

    createPlayerStatsUi()
    {
        this.events.on('reldens.beforePreloadUiScene', (uiSceneManager) => {
            if (!uiSceneManager.configManager.get('client/ui/playerStats/enabled')) {
                return false;
            }
            uiSceneManager.uiSceneDriver.loadHTML(this.PLAYER_STATS_KEY, 'assets/html/ui-player-stats.html');
            uiSceneManager.uiSceneDriver.loadHTML('playerStat', 'assets/html/player-stat.html');
        });

        this.events.on('reldens.beforeCreateUiScene', (uiSceneManager) => {
            let statsUi = uiSceneManager.getUiConfig(this.PLAYER_STATS_KEY);
            if (!statsUi.enabled) {
                return false;
            }
            const uiSceneDriver = uiSceneManager.uiSceneDriver;
            uiSceneDriver.usingElementUi().setupElement(this.PLAYER_STATS_KEY, statsUi.uiX, statsUi.uiY);
            let closeButton = uiSceneDriver.usingElementUi().getElementChildByProperty(this.PLAYER_STATS_KEY, 'id', 'player-stats-close');
            let openButton = uiSceneDriver.usingElementUi().getElementChildByProperty(this.PLAYER_STATS_KEY, 'id', 'player-stats-open');
            closeButton?.addEventListener('click', () => {
                let box = uiSceneDriver.usingElementUi().getElementChildByProperty(this.PLAYER_STATS_KEY, 'id', 'player-stats-ui');
                box.style.display = 'none';
                if (openButton) {
                    openButton.style.display = 'block';
                }
                uiSceneDriver.usingElementUi().setElementDepth(1);
            });
            openButton?.addEventListener('click', () => {
                let box = uiSceneDriver.usingElementUi().getElementChildByProperty(this.PLAYER_STATS_KEY, 'id', 'player-stats-ui');
                box.style.display = 'block';
                openButton.style.display = 'none';
                uiSceneDriver.usingElementUi().setElementDepth(4);
            });
        });
    }

}

module.exports.PlayerStatsUi = PlayerStatsUi;
