
const { Logger, sc } = require('@reldens/utils');

class LifebarUi
{

    setup(props)
    {
        if(!sc.hasOwn(props, ['gameManager', 'player'])){
            Logger.error('Required properties not found for LifeBar.');
            return false;
        }
        this.gameManager = props.gameManager;
        this.player = props.player;
        return this;
    }

    createHealthBar()
    {
        if(!this.gameManager.config.get('client/ui/lifeBar/enabled')){
            return false;
        }
        // if the position is fixed then the bar has to go on the ui scene:
        let lifeBarScene = this.gameManager.getActiveScenePreloader();
        let useFixedPosition = this.gameManager.config.get('client/ui/lifeBar/fixedPosition');
        if(!useFixedPosition){
            // otherwise the bar will be added in the current scene:
            lifeBarScene = this.gameManager.getActiveScene();
        }
        if(!lifeBarScene.lifeBar){
            this.lifeBar = lifeBarScene.add.graphics();
            if(useFixedPosition){
                this.gameManager.gameEngine.uiScene.elementsUi['lifeBar'] = this.lifeBar;
            }
        }
        return this;
    }

    redrawLifeBar()
    {
        if(!this.lifeBar || !this.gameManager.config.get('client/ui/lifeBar/enabled')){
            return false;
        }
        if(this.player.playerId !== this.gameManager.getCurrentPlayer().playerId){
            this.player = this.gameManager.getCurrentPlayer();
        }
        if(!this.lifeBar.scene){
            this.lifeBar.destroy();
            this.createHealthBar();
        }
        let barHeight = this.gameManager.config.get('client/ui/lifeBar/height');
        let barTop = this.gameManager.config.get('client/ui/lifeBar/top');
        let fullBarWidth = this.gameManager.config.get('client/ui/lifeBar/width');
        let affectedProperty = this.gameManager.config.get('client/actions/skills/affectedProperty');
        let fullValue = this.gameManager.playerData.statsBase[affectedProperty];
        let filledBarWidth = (this.gameManager.playerData.stats[affectedProperty] * fullBarWidth) / fullValue;
        let {uiX, uiY} = this.gameManager.gameEngine.uiScene.getUiConfig('lifeBar');
        if(!this.gameManager.config.get('client/ui/lifeBar/fixedPosition')){
            let currentPlayerState = this.player.state;
            uiX = currentPlayerState.x - (fullBarWidth / 2);
            let playerHeight = this.gameManager.config.get('client/players/size/height');
            uiY = currentPlayerState.y - barHeight - barTop - playerHeight + sc.getDef(this.player, 'topOff', 0);
        }
        let fillColor = (0xff0000);
        this.lifeBar.clear();
        this.lifeBar.fillStyle(fillColor, 1);
        this.lifeBar.fillRect(
            uiX,
            uiY,
            filledBarWidth,
            barHeight
        );
        let lineColor = (0xffffff);
        this.lifeBar.lineStyle(1, lineColor);
        this.lifeBar.strokeRect(uiX, uiY, fullBarWidth, barHeight);
        this.lifeBar.alpha = 0.6;
        this.lifeBar.setDepth(100000);
    }

}

module.exports.LifebarUi = LifebarUi;
