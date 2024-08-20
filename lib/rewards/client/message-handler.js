/**
 *
 * Reldens - MessageHandler
 *
 */

const { UserInterface } = require('../../game/client/user-interface');
const { RewardsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class MessageHandler
{

    constructor(props)
    {
        this.roomEvents = sc.get(props, 'roomEvents', false);
        this.message = sc.get(props, 'message', false);
        this.gameManager = this.roomEvents?.gameManager;
        this.gameDom = this.gameManager?.gameDom;
        this.uiScene = this.gameManager?.gameEngine?.uiScene;
    }

    validate()
    {
        if(!this.roomEvents){
            Logger.info('Missing RoomEvents on RewardsMessageHandler.');
            return false;
        }
        if(!this.message){
            Logger.info('Missing message on RewardsMessageHandler.');
            return false;
        }
        if(!this.gameManager){
            Logger.info('Missing GameManager on RewardsMessageHandler.');
            return false;
        }
        // @NOTE: the message could arrive before the uiScene gets ready.
        // if(!this.uiScene){
        //     Logger.info('Missing UI Scene on MessageHandler.');
        // }
        return this.uiScene;
    }

    createRewardsUi()
    {
        let rewardsUi = sc.get(this.uiScene.userInterfaces, RewardsConst.KEY);
        if(rewardsUi){
            return rewardsUi;
        }
        if(!this.uiScene.userInterfaces){
            this.uiScene.userInterfaces = {};
        }
        let uiRewards = new UserInterface(
            this.gameManager,
            {id: RewardsConst.KEY, type: RewardsConst.KEY, defaultOpen: true, defaultClose: true},
            '/assets/features/rewards/templates/ui-rewards.html',
            RewardsConst.KEY
        );
        uiRewards.createUiElement(this.uiScene, RewardsConst.KEY);
        // @TODO - BETA - Check if this can be moved inside the createUiElement.
        let uiBox = this.uiScene.elementsUi[RewardsConst.KEY];
        if(!uiBox){
            Logger.error('Scores UI box not found.', {uiRewards, uiBox});
            return false;
        }
        let title = this.gameManager.services.translator.t(
            this.gameManager.config.getWithoutLogs('client/rewards/labels/title', RewardsConst.SNIPPETS.TITLE)
        );
        this.roomEvents.uiSetTitleAndContent(uiBox, {title}, this.uiScene);
        this.uiScene.userInterfaces[RewardsConst.KEY] = uiRewards;
        return this.uiScene.userInterfaces[RewardsConst.KEY];
    }

    updateRewardsBox()
    {
        this.createRewardsUi(RewardsConst.KEY);
        let rewards = sc.get(this.message, 'rewards', false);
        if(!rewards){
            Logger.debug('Missing rewards data on message.');
            return;
        }
        this.uiScene.rewards = rewards;
        this.roomEvents.uiSetContent(
            this.uiScene.elementsUi[RewardsConst.KEY],
            {content: this.createContentsUpdate()},
            this.uiScene
        );
    }

    showAcceptedReward()
    {
        console.log('showAcceptedReward', this.message);
        this.createRewardsUi(RewardsConst.KEY);
        let currentPlayerScore = sc.get(this.message, 'rewards', false);
        if(!currentPlayerScore){
            Logger.debug('Missing rewards on update message.');
            return;
        }
        this.uiScene.currentPlayerScore = currentPlayerScore;
        this.roomEvents.uiSetContent(
            this.uiScene.elementsUi[RewardsConst.KEY],
            {content: this.createContentsUpdate()},
            this.uiScene
        );
    }

    createContentsUpdate()
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let templateContent = this.uiScene.cache.html.get(RewardsConst.TEMPLATES.REWARDS_LIST);
        if(!templateContent){
            Logger.error('Missing template "' + RewardsConst.TEMPLATES.REWARDS_LIST + '".');
            return '';
        }
        let templateParams = {
            rewards: this.uiScene.rewards,
            showRewardsTitle: true,
            rewardsTitle: this.gameManager.services.translator.t(
                this.gameManager.config.getWithoutLogs(
                    'client/rewards/labels/obtainedTitle',
                    RewardsConst.SNIPPETS.TITLE
                )
            )
        };
        return this.gameManager.gameEngine.parseTemplate(templateContent, templateParams);
    }
}

module.exports.MessageHandler = MessageHandler;
