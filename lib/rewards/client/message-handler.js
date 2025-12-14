/**
 *
 * Reldens - MessageHandler
 *
 * Handles client-side reward messages by creating UI elements, updating display, and managing user interactions.
 *
 */

const { UserInterface } = require('../../game/client/user-interface');
const { RewardsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/room-events').RoomEvents} RoomEvents
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('../../game/client/game-dom').GameDom} GameDom
 * @typedef {import('../../config/client/config-manager').ConfigManager} ConfigManager
 * @typedef {import('../../snippets/translator').Translator} Translator
 * @typedef {import('phaser').Scene} Scene
 */
class MessageHandler
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        // @TODO - BETA - Fix every single undefined case.
        /** @type {RoomEvents|false} */
        this.roomEvents = sc.get(props, 'roomEvents', false);
        /** @type {object|false} */
        this.message = sc.get(props, 'message', false);
        /** @type {GameManager|undefined} */
        this.gameManager = this.roomEvents?.gameManager;
        /** @type {GameDom|undefined} */
        this.gameDom = this.gameManager?.gameDom;
        /** @type {ConfigManager|undefined} */
        this.config = this.gameManager?.config;
        /** @type {Translator|undefined} */
        this.translator = this.gameManager?.services?.translator;
        /** @type {Scene|undefined} */
        this.uiScene = this.gameManager?.gameEngine?.uiScene;
    }

    /**
     * @returns {boolean|Scene}
     */
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

    /**
     * @param {string} createUiWithKey
     * @returns {Object|boolean}
     */
    createRewardsUi(createUiWithKey)
    {
        let rewardsUi = sc.get(this.uiScene.userInterfaces, createUiWithKey);
        if(rewardsUi){
            return rewardsUi;
        }
        if(!this.uiScene.userInterfaces){
            this.uiScene.userInterfaces = {};
        }
        let uiRewards = new UserInterface(
            this.gameManager,
            {id: createUiWithKey, type: createUiWithKey, defaultOpen: true, defaultClose: true},
            '/assets/features/rewards/templates/ui-rewards.html',
            createUiWithKey
        );
        uiRewards.createUiElement(this.uiScene, createUiWithKey);
        uiRewards.closeButton.addEventListener('click', () => {
            this.gameDom.emptyElement('.accepted-reward');
        });
        // @TODO - BETA - Check if this can be moved inside the createUiElement.
        let uiBox = this.uiScene.elementsUi[createUiWithKey];
        if(!uiBox){
            Logger.error('Scores UI box not found.', {uiRewards, uiBox});
            return false;
        }
        let title = this.translator.t(
            this.config.getWithoutLogs('client/rewards/labels/title', RewardsConst.SNIPPETS.TITLE)
        );
        this.roomEvents.uiSetTitleAndContent(uiBox, {title}, this.uiScene);
        this.uiScene.userInterfaces[createUiWithKey] = uiRewards;
        return this.uiScene.userInterfaces[createUiWithKey];
    }

    updateRewardsBox()
    {
        this.createRewardsUi(RewardsConst.KEY);
        let rewards = sc.get(this.message, 'rewards', false);
        if(!rewards){
            Logger.debug('Missing rewards data on message.');
            return false;
        }
        this.enrichForDisplay(rewards);
        this.uiScene.rewards = rewards;
        this.roomEvents.uiSetContent(
            this.uiScene.elementsUi[RewardsConst.KEY],
            {content: this.createUpdateContent()},
            this.uiScene
        );
        this.showRewardsNotificationBalloon();
        this.activateRewardsAction();
        return false;
    }

    showAcceptedReward()
    {
        this.createRewardsUi(RewardsConst.KEY);
        let acceptedReward = sc.get(this.message, 'acceptedReward', false);
        if(!acceptedReward){
            Logger.debug('Missing rewards on update message.');
            return false;
        }
        this.enrichForDisplay([acceptedReward]);
        this.uiScene.acceptedReward = acceptedReward;
        this.roomEvents.uiSetContent(
            this.uiScene.elementsUi[RewardsConst.KEY],
            {content: this.createUpdateContent()},
            this.uiScene
        );
        return true;
    }

    /**
     * @returns {string}
     */
    createUpdateContent()
    {
        // @TODO - BETA - Move the template load from cache as part of the engine driver.
        let templateContent = this.uiScene.cache.html.get(RewardsConst.TEMPLATES.REWARDS_LIST);
        if(!templateContent){
            Logger.error('Missing template "' + RewardsConst.TEMPLATES.REWARDS_LIST + '".');
            return '';
        }
        let acceptedReward = this.uiScene.acceptedReward;
        let acceptedRewardMessage = acceptedReward
            ? this.translator.t(
                this.config.getWithoutLogs(
                    'client/rewards/labels/acceptedReward',
                    RewardsConst.SNIPPETS.ACCEPTED_REWARD
                ),
                {rewardLabel: acceptedReward.translated.label}
            )
            : '';
        let templateParams = {rewards: this.uiScene.rewards, acceptedReward, acceptedRewardMessage};
        return this.gameManager.gameEngine.parseTemplate(templateContent, templateParams);
    }

    /**
     * @param {Array<Object>} rewards
     * @returns {Array<Object>}
     */
    enrichForDisplay(rewards)
    {
        for(let reward of rewards){
            let description = this.translator.t(
                reward[RewardsConst.MESSAGE.DATA.DESCRIPTION] || '',
                {loginCount: (reward[RewardsConst.MESSAGE.DATA.EVENT_DATA]?.days || '')}
            );
            if(this.config.getWithoutLogs('client/rewards/labels/includeItemsDescription', true)){
                description += this.mapItemsText(reward);
            }
            let label = this.translator.t(
                reward[RewardsConst.MESSAGE.DATA.LABEL] || '',
                {loginCount: (reward[RewardsConst.MESSAGE.DATA.EVENT_DATA]?.days || '')}
            );
            reward.translated = {label, description};
            let rewardStateData = reward[RewardsConst.MESSAGE.DATA.STATE_DATA];
            reward.activeClass = rewardStateData?.ready && !rewardStateData?.complete ? 'active' : 'inactive';
            reward.showRewardImage = reward[RewardsConst.MESSAGE.DATA.SHOW_REWARD_IMAGE] || '';
            reward.rewardImage = reward[RewardsConst.MESSAGE.DATA.REWARD_IMAGE] || '';
            reward.rewardImagePath = reward[RewardsConst.MESSAGE.DATA.REWARD_IMAGE_PATH] || '';
        }
        return rewards;
    }

    /**
     * @param {Object} reward
     * @returns {string}
     */
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
