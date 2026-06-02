/**
 *
 * Reldens - TemplateEngine
 *
 * Static utility class for rendering Mustache templates. Provides methods for rendering template
 * strings directly or loading and rendering template files. Used for generating HTML emails,
 * dynamic pages, and other server-side rendered content with variable substitution.
 *
 */

const TemplateEngineRender = require('mustache');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class TemplateEngine
{

    static partials = null;
    static partialsDir = '';

    /**
     * @param {string} dir
     */
    static setPartialsDir(dir)
    {
        TemplateEngine.partialsDir = dir;
        TemplateEngine.partials = null;
    }

    /**
     * @returns {Object<string, string>}
     */
    static loadPartials()
    {
        if(null !== TemplateEngine.partials){
            return TemplateEngine.partials;
        }
        let partials = {};
        if(!TemplateEngine.partialsDir || !FileHandler.exists(TemplateEngine.partialsDir)){
            TemplateEngine.partials = partials;
            return partials;
        }
        let files = FileHandler.readFolder(TemplateEngine.partialsDir);
        for(let file of files){
            if(!file.endsWith('.html')){
                continue;
            }
            let name = file.replace(/\.html$/, '');
            partials[name] = FileHandler.fetchFileContents(
                FileHandler.joinPaths(TemplateEngine.partialsDir, file)
            );
        }
        TemplateEngine.partials = partials;
        return partials;
    }

    /**
     * @param {string} content
     * @param {Object} params
     * @returns {Promise<string>}
     */
    static async render(content, params)
    {
        return await TemplateEngineRender.render(content, params, TemplateEngine.loadPartials());
    }

    /**
     * @param {string} filePath
     * @param {Object} params
     * @returns {Promise<string>}
     */
    static async renderFile(filePath, params)
    {
        let fileContent = FileHandler.fetchFileContents(filePath);
        if(!fileContent){
            Logger.error('File to be rendered not found.', {filePath});
            return '';
        }
        return await this.render(fileContent, params);
    }

}

module.exports.TemplateEngine = TemplateEngine;
