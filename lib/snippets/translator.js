/**
 *
 * Reldens - Translator
 *
 */

const { sc } = require('@reldens/utils');

class Translator
{

    constructor(props)
    {
        this.snippets = sc.get(props, 'snippets', {});
        this.locale = sc.get(props, 'locale', 'en_US');
        this.activeLocale = sc.get(props, 'activeLocale', 'en_US');
    }

    translate(snippetKey, params, activeLocale = false)
    {
        if(!activeLocale){
            activeLocale = this.activeLocale;
        }
        let currentSnippet = sc.get(this.snippets[activeLocale], snippetKey, '');
        if('' === currentSnippet){
            return '';
        }
        if(params){
            let paramsKeys = Object.keys(params);
            if(0 < paramsKeys.length){
                for(let i of paramsKeys){
                    let param = params[i];
                    while(-1 !== currentSnippet.indexOf(param)){
                        currentSnippet = currentSnippet.replace(i, param);
                    }
                }
            }
        }
        return currentSnippet;
    }

}

module.exports.Translator = new Translator();