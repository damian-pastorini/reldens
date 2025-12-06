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
        this.config = props.config;
        if(!this.rewardsProvider){
            Logger.warning('RewardsProvider undefined in LoginStateHandler.');
        }
        if(!this.rewardsEventsUpdater){
            Logger.warning('RewardsEventsUpdater undefined in LoginStateHandler.');
        }
        if(!this.config){
            Logger.warning('Configuration undefined in LoginStateHandler.');
        }
        this.rewardsEventsDataSender = new RewardsEventsDataSender();
        this.avoidGuestRewardsOnLogin = this.config.getWithoutLogs('server/rewards/avoidGuestRewardsOnLogin', true);
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
        if(this.avoidGuestRewardsOnLogin && event.isGuest){
            //Logger.debug('Guests rewards on login are disabled by configuration.');
            return false;
        }
        let rewardState = await this.rewardsProvider.fetchPlayerRewardsStateByIdWithMappedData(
            event.loggedPlayer?.player_id,
            reward.id
        );
        let today = sc.formatDate(new Date(), 'Y-m-d');
        let lastClaimedDate = rewardState?.mappedState?.date;
        if(true === rewardState?.mappedState?.complete && lastClaimedDate === today){
            //Logger.debug('Reward already claimed.', {playerId: event.loggedPlayer?.player_id, rewardId: reward.id});
            return true;
        }
        if('dailyLogin' === rewardAction){
            await this.processDailyLogin(reward, rewardState, event, today);
        }
        if('straightDaysLogin' === rewardAction){
            await this.processStraightDaysLogin(reward, rewardState, event, today, lastClaimedDate);
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
     *
     * @param reward
     * @param rewardState
     * @param {JoinedSceneRoomEvent} event
     * @param today
     */
    async processDailyLogin(reward, rewardState, event, today)
    {
        let logins = this.byLatestPerDay(sc.arraySort(event.userModel.related_users_login, 'login_date', 'desc'));
        if(!logins || 0 === logins.length){
            //Logger.debug('No login present on user.', event.userModel, rewardState);
            return false;
        }
        let lastLoginDate = sc.formatDate(new Date(logins.shift().login_date), 'Y-m-d');
        //Logger.debug('Process daily login: ', logins, lastLoginDate, today);
        if(lastLoginDate !== today){
            return false;
        }
        return await this.resetRewardState(rewardState, true, today, reward, event);
    }

    async processStraightDaysLogin(reward, rewardState, event, today, lastClaimedDate)
    {
        let requiredLogins = reward.eventData.days;
        let logins = this.byLatestPerDay(sc.arraySort(event.userModel.related_users_login, 'login_date', 'desc'))
            .slice(0, requiredLogins);
        if(lastClaimedDate){
            let lastDate = new Date(lastClaimedDate);
            lastDate.setDate(lastDate.getDate() + 1);
            logins = logins.filter((item) => {
                return item.login_date > lastDate;
            });
        }
        //Logger.debug('Process straight days login: ', logins, requiredLogins, lastClaimedDate);
        if(!logins || requiredLogins > logins.length){
            //Logger.debug('Not enough login records.', {userEmail: event.userModel.email, rewardState});
            await this.resetRewardState(rewardState, false, false, reward, event);
            return false;
        }
        let consecutiveDays = 0;
        let todayDate = new Date();
        for(let i = 0; i < requiredLogins; i++){
            let expectedDate = new Date(todayDate);
            expectedDate.setDate(todayDate.getDate() - i);
            let expectedDateString = sc.formatDate(expectedDate, 'Y-m-d');
            let login = logins.find(login => sc.formatDate(new Date(login.login_date), 'Y-m-d') === expectedDateString);
            if(!login){
                break;
            }
            consecutiveDays++;
        }
        if(requiredLogins > consecutiveDays){
            //Logger.debug('Logged '+consecutiveDays+'/'+requiredLogins+' ('+rewardState.id+') '+event.userModel.id);
            return false;
        }
        return await this.resetRewardState(rewardState, true, today, reward, event);
    }

    async resetRewardState(rewardState, isReady, today, reward, event)
    {
        let currentState = sc.toJson(rewardState?.state, {});
        currentState.ready = isReady;
        if(today){
            currentState.date = today;
        }
        currentState.complete = false;
        //Logger.debug('Update reward state', reward.id, currentState);
        return await this.rewardsEventsUpdater.updateStateById(
            rewardState?.id,
            JSON.stringify(currentState),
            reward.id,
            event.loggedPlayer?.player_id
        );
    }

    byLatestPerDay(datesList)
    {
        let indexMap = {};
        let result = [];
        let count = 0;
        for(let item of datesList){
            let dateObj = item.login_date;
            if(!dateObj){
                continue;
            }
            let month = String(dateObj.getMonth() + 1).padStart(2, '0');
            let day = String(dateObj.getDate()).padStart(2, '0');
            let dayKey = dateObj.getFullYear()+'-'+month+'-'+day;
            if(!sc.hasOwn(indexMap, dayKey)){
                indexMap[dayKey] = count;
                result.push(item);
                count++;
                continue;
            }
            let index = indexMap[dayKey];
            let existing = result[index];
            let existingDate = existing.login_date;
            if(dateObj > existingDate){
                result[index] = item;
            }
        }
        return result;
    }

}

module.exports.LoginStateHandler = LoginStateHandler;
