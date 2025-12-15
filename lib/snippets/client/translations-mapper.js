/**
 *
 * Reldens - TranslationsMapper
 *
 * Maps nested translation objects into flat key-value pairs with dot notation.
 *
 */

const { SnippetsConst } = require('../constants');
const { sc } = require('@reldens/utils');

class TranslationsMapper
{

    /**
     * @param {Object} config
     * @param {Object} translations
     * @param {Object|boolean} dataValues
     * @param {string} locale
     */
    static forConfig(config, translations, dataValues = false, locale = SnippetsConst.DEFAULT_LOCALE)
    {
        if(!config.snippets){
            config.snippets = {};
        }
        if(!config.snippets[locale]){
            config.snippets[locale] = {};
        }
        let mappedSnippets = this.fromObject(translations);
        config.snippets[locale] = sc.deepMergeProperties(mappedSnippets, config.snippets[locale]);
        if(!dataValues){
            return;
        }
        if(!config.snippetsDataValues){
            config.snippetsDataValues = {};
        }
        let nameSpace = dataValues.NAMESPACE || SnippetsConst.DATA_VALUES_DEFAULT_NAMESPACE;
        sc.deepMergeProperties(config.snippetsDataValues, {[nameSpace]: dataValues});
    }

    /**
     * @param {Object} translations
     * @returns {Object}
     */
    static fromObject(translations)
    {
        let keys = Object.keys(translations);
        if(0 === keys.length){
            return {};
        }
        let mappedTranslations = {};
        for(let i of keys){
            this.recursiveMap(i, translations[i], mappedTranslations);
        }
        return mappedTranslations;
    }

    /**
     * @param {string} key
     * @param {any} translation
     * @param {Object} mappedTranslations
     */
    static recursiveMap(key, translation, mappedTranslations)
    {
        if(!sc.isObject(translation)){
            mappedTranslations[key] = translation;
            return;
        }
        let nextKeys = Object.keys(translation);
        if(0 === nextKeys.length){
            return;
        }
        for(let i of nextKeys){
            this.recursiveMap(key+SnippetsConst.CONCAT_CHARACTER+i, translation[i], mappedTranslations);
        }
    }

}

module.exports.TranslationsMapper = TranslationsMapper;
