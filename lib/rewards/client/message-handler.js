/**
 *
 * Reldens - MessageHandler
 *
 */

const { UserInterface } = require('../../game/client/user-interface');
const { RewardsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class MessageHandler
{

    constructor(props)
    {
        this.roomEvents = sc.get(props, 'roomEvents', false);
        this.message = sc.get(props, 'message', false);
        this.gameManager = this.roomEvents?.gameManager;
        this.gameDom = this.gameManager?.gameDom;
        this.config = this.gameManager?.config;
        /** @type {?Translator} */
        this.translator = this.gameManager?.services?.translator;
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
        let title = this.translator.t(
            this.config.getWithoutLogs('client/rewards/labels/title', RewardsConst.SNIPPETS.TITLE)
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
        this.enrichForDisplay(rewards);
        this.uiScene.rewards = rewards;
        this.roomEvents.uiSetContent(
            this.uiScene.elementsUi[RewardsConst.KEY],
            {content: this.createContentsUpdate()},
            this.uiScene
        );
        this.showRewardsNotificationBalloon();
        this.activateRewardsAction();
    }

    showAcceptedReward()
    {
        this.createRewardsUi(RewardsConst.KEY);
        let acceptedReward = sc.get(this.message, 'acceptedReward', false);
        if(!acceptedReward){
            Logger.debug('Missing rewards on update message.');
            return;
        }
        this.uiScene.acceptedReward = acceptedReward;
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
            acceptedReward: this.uiScene.acceptedReward
        };
        return this.gameManager.gameEngine.parseTemplate(templateContent, templateParams);
    }

    enrichForDisplay(rewards)
    {
        for(let reward of rewards){
            let description = this.translator.t(reward[RewardsConst.MESSAGE.DATA.DESCRIPTION] || '');
            if(this.config.getWithoutLogs('client/rewards/labels/includeItemsDescription', true)){
                description += this.mapItemsText(reward);
            }
            reward.translated = {label: this.translator.t(reward[RewardsConst.MESSAGE.DATA.LABEL]), description};
            let rewardStateData = reward[RewardsConst.MESSAGE.DATA.STATE_DATA];
            reward.activeClass = rewardStateData?.ready && !rewardStateData?.complete ? 'active' : 'inactive';
            reward.showRewardImage = reward[RewardsConst.MESSAGE.DATA.SHOW_REWARD_IMAGE] || '';
            reward.rewardImage = reward[RewardsConst.MESSAGE.DATA.REWARD_IMAGE] || '';
            reward.rewardImagePath = reward[RewardsConst.MESSAGE.DATA.REWARD_IMAGE_PATH] || '';
        }
        return rewards;
    }

    mapItemsText(reward)
    {
        // @TODO - BETA - Add items template to show icons and description.
        let itemsSeparator = this.config.getWithoutLogs('client/rewards/labels/itemsSeparator', '<br/>');
        let itemsTemplate = this.config.getWithoutLogs('client/rewards/labels/itemsTemplate', '%label (%quantity)');
        return itemsSeparator + reward[RewardsConst.MESSAGE.DATA.ITEMS_DATA]?.map(
            (item) => {
                itemsTemplate = itemsTemplate.replace('%label', item[RewardsConst.MESSAGE.DATA.ITEM_LABEL]);
                itemsTemplate = itemsTemplate.replace('%quantity', item[RewardsConst.MESSAGE.DATA.ITEM_QUANTITY]);
                return itemsTemplate;
            }
        ).join(itemsSeparator);
    }

    showRewardsNotificationBalloon()
    {
        let balloon = this.gameDom.getElement('#rewards-notification-balloon');
        let activeRewards = this.gameDom.getElements('.reward-active');
        if(balloon && activeRewards && 0 < activeRewards.label){
            balloon.classList.remove('hidden');
            return;
        }
        balloon.classList.add('hidden');
    }

    activateRewardsAction()
    {
        let rewardsElements = this.gameDom.getElements('.reward-active');
        for(let rewardElement of rewardsElements){
            rewardElement.addEventListener('click', () => {
                this.gameManager.activeRoomEvents.send({
                    [GameConst.ACTION_KEY]: RewardsConst.ACTIONS.ACCEPT_REWARD,
                    id: rewardElement.dataset.rewardId
                });
            });
        }
    }

}

module.exports.MessageHandler = MessageHandler;
