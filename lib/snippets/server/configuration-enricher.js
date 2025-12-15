/**
 *
 * Reldens - ConfigurationEnricher
 *
 * Enriches the server configuration with locales and snippets from the database.
 *
 */

const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/storage').BaseDriver} BaseDriver
 * @typedef {import('../../game/server/manager').ServerManager} ServerManager
 *
 * @typedef {Object} ConfigurationEnricherProps
 * @property {BaseDriver|boolean} localeRepository
 * @property {BaseDriver|boolean} snippetRepository
 *
 * @typedef {Object} WithLocalesAndSnippetsProps
 * @property {ServerManager} serverManager
 */
class ConfigurationEnricher
{

    /**
     * @param {ConfigurationEnricherProps} props
     */
    constructor(props)
    {
        /** @type {BaseDriver|boolean} */
        this.localeRepository = sc.get(props, 'localeRepository', false);
        /** @type {BaseDriver|boolean} */
        this.snippetRepository = sc.get(props, 'snippetRepository', false);
    }

    /**
     * @param {WithLocalesAndSnippetsProps} props
     * @returns {Promise<boolean|void>}
     */
    async withLocalesAndSnippets(props)
    {
        if(!this.localeRepository){
            Logger.error('Locale repository undefined on ConfigurationEnricher.');
            return false;
        }
        if(!this.snippetRepository){
            Logger.error('Snippet repository undefined on ConfigurationEnricher.');
            return false;
        }
        let serverManager = props.serverManager;
        if(!serverManager){
            Logger.error('ServerManager undefined on ConfigurationEnricher.');
            return false;
        }
        let locales = await this.localeRepository.loadAll();
        let snippets = {};
        for(let locale of locales){
            snippets[locale.locale] = {};
            let snippetsModels = await this.snippetRepository.loadBy('locale_id', locale.id);
            for(let snippet of snippetsModels){
                snippets[locale.locale][snippet.key] = snippet.value;
            }
        }
        // these will be automatically be sent to the client config:
        serverManager.configManager.configList.client['locales'] = locales;
        serverManager.configManager.configList.client['snippets'] = snippets;
    }

}

module.exports.ConfigurationEnricher = ConfigurationEnricher;
