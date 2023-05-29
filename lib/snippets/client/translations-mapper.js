/**
 *
 * Reldens - TranslationsMapper
 *
 */

const { SnippetsConst } = require('../constants');
const { sc } = require('@reldens/utils');

class TranslationsMapper
{

    static forConfig(config, translations, locale = SnippetsConst.DEFAULT_LOCALE)
    {
        if(!config.snippets){
            config.snippets = {};
        }
        if(!config.snippets[locale]){
            config.snippets[locale] = {};
        }
        let mappedSnippets = this.fromObject(translations);
        config.snippets[locale] = sc.deepMergeProperties(mappedSnippets, config.snippets[locale]);
    }

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

    static recursiveMap(key, translation, mappedTranslations)
    {
        if(!sc.isObject(translation)) {
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
