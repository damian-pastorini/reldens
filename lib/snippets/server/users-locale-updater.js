/**
 *
 * Reldens - UsersLocaleUpdater
 *
 * Saves the locale chosen in the settings language selector as the user locale, applied on the next login.
 *
 */

const { SnippetsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 * @typedef {import('@colyseus/core').Client} Client
 *
 * @typedef {Object} UsersLocaleUpdaterProps
 * @property {BaseDriver|boolean} localeRepository
 * @property {BaseDriver|boolean} usersLocaleRepository
 */
class UsersLocaleUpdater
{

    /**
     * @param {UsersLocaleUpdaterProps} props
     */
    constructor(props)
    {
        /** @type {BaseDriver|boolean} */
        this.localeRepository = sc.get(props, 'localeRepository', false);
        /** @type {BaseDriver|boolean} */
        this.usersLocaleRepository = sc.get(props, 'usersLocaleRepository', false);
        /** @type {Object<number, Promise<Object|boolean>>} */
        this.pendingSaves = {};
        /** @type {Object<number, number>} */
        this.lastChangesTimes = {};
    }

    /**
     * @param {Client} client
     * @param {Object} message
     * @param {Object} room
     * @param {Object} playerSchema
     * @returns {Promise<Object|boolean>}
     */
    async executeMessageActions(client, message, room, playerSchema)
    {
        if(SnippetsConst.ACTIONS.UPDATE !== message?.act){
            return false;
        }
        let changedAt = sc.get(message, 'changedAt', 0);
        let userId = Number(sc.get(playerSchema, 'userId', 0));
        if(!userId){
            Logger.warning('Missing user ID to update the user locale.');
            return this.sendSaveError(client, changedAt);
        }
        let localeId = sc.get(message, 'up', 0);
        if(!sc.isValidInteger(localeId, 1)){
            Logger.warning('Invalid locale ID to update the user locale.', {userId, localeId});
            return this.sendSaveError(client, changedAt);
        }
        if(!sc.isValidInteger(changedAt, 1)){
            Logger.warning('Invalid change time to update the user locale.', {userId, changedAt});
            return this.sendSaveError(client, changedAt);
        }
        return await this.queueUserLocaleSave(client, userId, localeId, changedAt);
    }

    /**
     * @param {Client} client
     * @param {number} userId
     * @param {number} localeId
     * @param {number} changedAt
     * @returns {Promise<Object|boolean>}
     */
    async queueUserLocaleSave(client, userId, localeId, changedAt)
    {
        if(changedAt <= sc.get(this.lastChangesTimes, userId, 0)){
            Logger.info('Ignored a user locale change older than the last one.', {userId, localeId, changedAt});
            return false;
        }
        this.lastChangesTimes[userId] = changedAt;
        let queuedSave = sc.get(this.pendingSaves, userId, Promise.resolve(false))
            .then(() => this.saveUserLocale(client, userId, localeId, changedAt))
            .catch((error) => {
                Logger.error('User locale could not be saved.', {userId, localeId, error: error.message});
                return this.sendSaveError(client, changedAt);
            });
        this.pendingSaves[userId] = queuedSave;
        let saveResult = await queuedSave;
        if(queuedSave === this.pendingSaves[userId]){
            delete this.pendingSaves[userId];
        }
        return saveResult;
    }

    /**
     * @param {Client} client
     * @param {number} userId
     * @param {number} localeId
     * @param {number} changedAt
     * @returns {Promise<Object|boolean>}
     */
    async saveUserLocale(client, userId, localeId, changedAt)
    {
        let locale = await this.localeRepository.loadOne({id: localeId, enabled: 1});
        if(!locale){
            Logger.warning('Locale not found or disabled to update the user locale.', {userId, localeId});
            return this.sendSaveError(client, changedAt);
        }
        let userLocale = await this.usersLocaleRepository.loadOneBy('user_id', userId);
        if(userLocale){
            return await this.usersLocaleRepository.updateById(userLocale.id, {locale_id: localeId});
        }
        return await this.usersLocaleRepository.create({user_id: userId, locale_id: localeId});
    }

    /**
     * @param {Client} client
     * @param {number} changedAt
     * @returns {boolean}
     */
    sendSaveError(client, changedAt)
    {
        client.send('*', {act: SnippetsConst.ACTIONS.UPDATE_ERROR, listener: SnippetsConst.KEY, changedAt});
        return false;
    }

}

module.exports.UsersLocaleUpdater = UsersLocaleUpdater;
