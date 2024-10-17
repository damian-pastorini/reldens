/**
 *
 * Reldens - LoginStateHandler
 *
 */

const { EventHandler } = require('./event-handler');
const { JoinedSceneRoomEvent } = require('../../../rooms/server/events/joined-scene-room-event');
const { RewardsEventsDataSender } = require('../rewards-events-data-sender');
const { Logger, sc } = require('@reldens/utils');

class LoginStateHandler extends EventHandler
{

    constructor(props)
    {
        super();
        this.rewardsProvider = props.rewardsProvider;
        this.rewardsEventsUpdater = props.rewardsEventsUpdater;
        if(!this.rewardsProvider){
            Logger.warning('RewardsProvider undefined in LoginStateHandler.');
        }
        if(!this.rewardsEventsUpdater){
            Logger.warning('RewardsEventsUpdater undefined in LoginStateHandler.');
        }
        this.rewardsEventsDataSender = new RewardsEventsDataSender();
    }

    async updateEventState(reward, args)
    {
        if(!this.rewardsProvider || !this.rewardsEventsUpdater){
            return false;
        }
        let rewardAction = sc.get(reward?.eventData, 'action', '');
        if('' === rewardAction){
            Logger.warning('Missing reward action.', reward);
            return false;
        }
        let event = args[0] || {};
        if(!(event instanceof JoinedSceneRoomEvent)){
            Logger.warning('Event missed match, expected "JoinedSceneRoomEvent".');
            return false;
        }
        let rewardStateForPlayer = await this.rewardsProvider.fetchPlayerRewardsStateByIdWithMappedData(
            event.loggedPlayer?.player_id,
            reward.id
        );
        if(true === rewardStateForPlayer?.mappedState?.complete){
            Logger.debug('Reward already claimed.', {playerId: event.loggedPlayer?.player_id, rewardId: reward.id});
            return true;
        }
        if('dailyLogin' === rewardAction){
           await this.processDailyLogin(reward, rewardStateForPlayer, event);
        }
        if('straightDaysLogin' === rewardAction){
            await this.processStraightDaysLogin(reward, rewardStateForPlayer, event);
        }
        if(event.roomScene && event.loggedPlayer){
            this.rewardsEventsDataSender.sendUpdates(
                event.roomScene,
                event.loggedPlayer,
                await this.rewardsProvider.fetchPlayerActiveRewards(event.loggedPlayer.player_id)
            );
        }
    }

    /**
     * @param reward
     * @param rewardStateForPlayer
     * @param {JoinedSceneRoomEvent} event
     */
    async processDailyLogin(reward, rewardStateForPlayer, event)
    {
        let lastLogin = sc.arraySort(event.userModel.login, 'login_date', 'desc');
        if(!lastLogin){
            Logger.warning('No login present on user.', {userModel: event.userModel, rewardStateForPlayer});
            return false;
        }
        let loginDate = lastLogin.shift().login_date;
        if(sc.formatDate(new Date(loginDate), 'Y-m-d') === sc.formatDate(new Date(), 'Y-m-d')){
            let currentState = sc.toJson(rewardStateForPlayer?.state, {});
            currentState.ready = true;
            await this.rewardsEventsUpdater.updateStateById(
                rewardStateForPlayer?.id,
                JSON.stringify(currentState),
                reward.id,
                event.loggedPlayer?.player_id
            );
        }
    }

    async processStraightDaysLogin(reward, rewardStateForPlayer, event)
    {
        let logins = sc.arraySort(event.userModel.login, 'login_date', 'desc');
        let totalRequiredLogins = reward.eventData.days;
        if(!logins || totalRequiredLogins > logins.length){
            let logData = {userEmail: event.userModel.email};
            if(rewardStateForPlayer){
                logData['rewardStateForPlayer'] = rewardStateForPlayer;
            }
            Logger.debug('Not enough login records.', logData);
            return false;
        }
        let consecutiveDays = 0;
        let today = new Date();
        for(let i = 0; i < totalRequiredLogins; i++){
            let expectedDate = new Date(today);
            expectedDate.setDate(today.getDate() - i);
            let expectedDateString = sc.formatDate(expectedDate, 'Y-m-d');
            let login = logins.find(login => sc.formatDate(new Date(login.login_date), 'Y-m-d') === expectedDateString);
            if(!login){
                break;
            }
            consecutiveDays++;
        }
        if(totalRequiredLogins > consecutiveDays){
            Logger.debug(
                'User has not logged in consecutively for "'+totalRequiredLogins+'" days.',
                {userModel: event.userModel, rewardStateForPlayer}
            );
            return false;
        }
        let currentState = sc.toJson(rewardStateForPlayer?.state, {});
        currentState.ready = true;
        return await this.rewardsEventsUpdater.updateStateById(
            rewardStateForPlayer?.id,
            JSON.stringify(currentState),
            reward.id,
            event.loggedPlayer?.player_id
        );
    }

}

module.exports.LoginStateHandler = LoginStateHandler;
