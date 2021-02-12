
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
        this.barConfig = this.gameManager.config.get('client/ui/lifeBar');
        this.affectedProperty = this.gameManager.config.get('client/actions/skills/affectedProperty');
        this.playerSize = this.gameManager.config.get('client/players/size');
        return this;
    }

    createHealthBar()
    {
        if(!this.barConfig.enabled){
            return false;
        }
        // if the position is fixed then the bar has to go on the ui scene:
        let lifeBarScene = this.gameManager.getActiveScenePreloader();
        let useFixedPosition = this.barConfig.fixedPosition;
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
        if(!this.lifeBar || !this.barConfig.enabled){
            return false;
        }
        if(this.player.playerId !== this.gameManager.getCurrentPlayer().playerId){
            this.player = this.gameManager.getCurrentPlayer();
        }
        if(!this.lifeBar.scene){
            this.lifeBar.destroy();
            this.createHealthBar();
        }
        let barHeight = this.barConfig.height;
        let barTop = this.barConfig.top;
        let fullBarWidth = this.barConfig.width;
        let fullValue = this.gameManager.playerData.statsBase[this.affectedProperty];
        let filledBarWidth = (this.gameManager.playerData.stats[this.affectedProperty] * fullBarWidth) / fullValue;
        let uiX = this.barConfig.x,
            uiY = this.barConfig.y;
        if(!this.barConfig.fixedPosition){
            uiX = this.player.state.x - (fullBarWidth / 2);
            uiY = this.player.state.y
                - barHeight
                - barTop
                - this.playerSize.height
                + sc.getDef(this.player, 'topOff', 0);
        }
        this.lifeBar.clear();
        this.lifeBar.fillStyle(parseInt(this.barConfig.fillStyle), 1);
        this.lifeBar.fillRect(uiX, uiY, filledBarWidth, barHeight);
        this.lifeBar.lineStyle(1, parseInt(this.barConfig.lineStyle));
        this.lifeBar.strokeRect(uiX, uiY, fullBarWidth, barHeight);
        this.lifeBar.alpha = 0.6;
        this.lifeBar.setDepth(300000);
    }

}

module.exports.LifebarUi = LifebarUi;
