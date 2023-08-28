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
        this.events.on('reldens.beforePreloadUiScene', (uiScene) => {
            if(!uiScene.gameManager.config.get('client/ui/playerStats/enabled')){
                return false;
            }
            uiScene.load.html('playerStats', '/assets/html/ui-player-stats.html');
            uiScene.load.html('playerStat', '/assets/html/player-stat.html');
        });
        this.events.on('reldens.beforeCreateUiScene', (uiScene) => {
            // @TODO - BETA - Replace by UserInterface.
            let statsUi = uiScene.getUiConfig('playerStats');
            if(!statsUi.enabled){
                return false;
            }
            let dialogBox = uiScene.add.dom(statsUi.uiX, statsUi.uiY).createFromCache('playerStats');
            // @TODO - BETA - Replace all "getChildByProperty" by gameDom.getElement() method.
            let closeButton = dialogBox.getChildByProperty('id', 'player-stats-close');
            let openButton = dialogBox.getChildByProperty('id', 'player-stats-open');
            openButton?.addEventListener('click', () => {
                let dialogContainer = dialogBox.getChildByProperty('id', 'player-stats-ui');
                // @TODO - BETA - Replace styles by classes.
                dialogContainer.style.display = 'block';
                openButton.style.display = 'none';
                dialogBox.setDepth(4);
                this.events.emit('reldens.openUI', {ui: this, openButton, dialogBox, dialogContainer, uiScene});
            });
            closeButton?.addEventListener('click', () => {
                let dialogContainer = dialogBox.getChildByProperty('id', 'player-stats-ui');
                // @TODO - BETA - Replace styles by classes.
                dialogContainer.style.display = 'none';
                if(openButton){
                    openButton.style.display = 'block';
                }
                dialogBox.setDepth(1);
                this.events.emit(
                    'reldens.closeUI',
                    {ui: this, closeButton, openButton, dialogBox, dialogContainer, uiScene}
                );
            });
            uiScene.elementsUi['playerStats'] = dialogBox;
        });
    }

}

module.exports.PlayerStatsUi = PlayerStatsUi;
