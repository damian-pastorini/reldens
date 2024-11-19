/**
 *
 * Reldens - Translator
 *
 */

const { SnippetsConst } = require('./constants');
const { sc } = require('@reldens/utils');

class Translator
{

    constructor(props)
    {
        this.snippets = sc.get(props, 'snippets', {});
        this.dataValues = sc.get(props, 'dataValues', {});
        this.locale = sc.get(props, 'locale', SnippetsConst.DEFAULT_LOCALE);
        this.activeLocale = sc.get(props, 'activeLocale', SnippetsConst.DEFAULT_LOCALE);
    }

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

    snippetNameSpace(snippetKey)
    {
        let keys = snippetKey.split('.');
        if(1 === keys.length){
            return SnippetsConst.DATA_VALUES_DEFAULT_NAMESPACE;
        }
        return keys[0];
    }

    t(snippetKey, params = {}, activeLocale = false)
    {
        return this.translate(snippetKey, params, activeLocale);
    }

}

module.exports.Translator = Translator;
