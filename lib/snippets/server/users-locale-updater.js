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
        if(0 >= userId){
            Logger.warning('Missing user ID to update the user locale.');
            return false;
        }
        let localeId = Number(sc.get(message, 'up', 0));
        if(!Number.isInteger(localeId)){
            return false;
        }
        let locale = await this.localeRepository.loadOne({id: localeId, enabled: 1});
        if(!locale){
            Logger.warning('Invalid locale ID "'+localeId+'" for the user ID "'+userId+'".');
            return false;
        }
        let userLocale = await this.usersLocaleRepository.loadOneBy('user_id', userId);
        if(userLocale){
            return await this.usersLocaleRepository.updateById(userLocale.id, {locale_id: locale.id});
        }
        return await this.usersLocaleRepository.create({user_id: userId, locale_id: locale.id});
    }

}

module.exports.UsersLocaleUpdater = UsersLocaleUpdater;
