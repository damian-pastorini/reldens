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
        let userId = Number(sc.get(playerSchema, 'userId', 0));
        if(!userId){
            Logger.warning('Missing user ID to update the user locale.');
            return false;
        }
        let localeId = Number(sc.get(message, 'up', 0));
        if(!sc.isValidInteger(localeId, 1)){
            Logger.warning('Invalid locale ID to update the user locale.', {userId, localeId});
            return false;
        }
        return await this.queueUserLocaleSave(userId, localeId);
    }

    /**
     * @param {number} userId
     * @param {number} localeId
     * @returns {Promise<Object|boolean>}
     */
    async queueUserLocaleSave(userId, localeId)
    {
        let queuedSave = sc.get(this.pendingSaves, userId, Promise.resolve(false))
            .then(() => this.saveUserLocale(userId, localeId))
            .catch((error) => {
                Logger.error('User locale could not be saved.', {userId, localeId, error: error.message});
                return false;
            });
        this.pendingSaves[userId] = queuedSave;
        let saveResult = await queuedSave;
        if(queuedSave === this.pendingSaves[userId]){
            delete this.pendingSaves[userId];
        }
        return saveResult;
    }

    /**
     * @param {number} userId
     * @param {number} localeId
     * @returns {Promise<Object|boolean>}
     */
    async saveUserLocale(userId, localeId)
    {
        let locale = await this.localeRepository.loadOne({id: localeId, enabled: 1});
        if(!locale){
            Logger.warning('Locale not found or disabled to update the user locale.', {userId, localeId});
            return false;
        }
        let userLocale = await this.usersLocaleRepository.loadOneBy('user_id', userId);
        if(userLocale){
            return await this.usersLocaleRepository.updateById(userLocale.id, {locale_id: localeId});
        }
        return await this.usersLocaleRepository.create({user_id: userId, locale_id: localeId});
    }

}

module.exports.UsersLocaleUpdater = UsersLocaleUpdater;
