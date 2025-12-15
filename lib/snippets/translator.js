/**
 *
 * Reldens - Translator
 *
 * Handles translation of snippet keys into localized strings with parameter replacement.
 *
 */

const { SnippetsConst } = require('./constants');
const { sc } = require('@reldens/utils');

/**
 * @typedef {Object} TranslatorProps
 * @property {Object<string, Object<string, string>>} snippets
 * @property {Object<string, Object<string, string>>} dataValues
 * @property {string} locale
 * @property {string} activeLocale
 */
class Translator
{

    /**
     * @param {TranslatorProps} props
     */
    constructor(props)
    {
        /** @type {Object<string, Object<string, string>>} */
        this.snippets = sc.get(props, 'snippets', {});
        /** @type {Object<string, Object<string, string>>} */
        this.dataValues = sc.get(props, 'dataValues', {});
        /** @type {string} */
        this.locale = sc.get(props, 'locale', SnippetsConst.DEFAULT_LOCALE);
        /** @type {string} */
        this.activeLocale = sc.get(props, 'activeLocale', SnippetsConst.DEFAULT_LOCALE);
    }

    /**
     * @param {string} snippetKey
     * @param {Object<string, any>} params
     * @param {string|boolean} activeLocale
     * @returns {string}
     */
    translate(snippetKey, params = {}, activeLocale = false)
    {
        if(!activeLocale){
            activeLocale = this.activeLocale;
        }
        let currentSnippet = sc.get(this.snippets[activeLocale], snippetKey, snippetKey);
        if(snippetKey === currentSnippet){
            return snippetKey;
        }
        if(!sc.isObject(params)){
            return currentSnippet;
        }
        let paramsKeys = Object.keys(params);
        if(0 === paramsKeys.length){
            return currentSnippet;
        }
        let nameSpace = this.snippetNameSpace(snippetKey);
        for(let i of paramsKeys){
            let param = params[i];
            let replaceKey = '%'+((this.dataValues[nameSpace] || {})[i] || i);
            while(-1 !== currentSnippet.indexOf(replaceKey)){
                currentSnippet = currentSnippet.replace(replaceKey, param);
            }
        }
        return currentSnippet;
    }

    /**
     * @param {string} snippetKey
     * @returns {string}
     */
    snippetNameSpace(snippetKey)
    {
        let keys = snippetKey.split('.');
        if(1 === keys.length){
            return SnippetsConst.DATA_VALUES_DEFAULT_NAMESPACE;
        }
        return keys[0];
    }

    /**
     * @param {string} snippetKey
     * @param {Object<string, any>} params
     * @param {string|boolean} activeLocale
     * @returns {string}
     */
    t(snippetKey, params = {}, activeLocale = false)
    {
        return this.translate(snippetKey, params, activeLocale);
    }

}

module.exports.Translator = Translator;
