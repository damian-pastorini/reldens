/**
 *
 * Reldens - TemplateEngine
 *
 */

const TemplateEngineRender = require('mustache');
const { FileHandler } = require('./file-handler');
const { Logger } = require('@reldens/utils');

class TemplateEngine
{

    static async render(content, params)
    {
        return await TemplateEngineRender.render(content, params);
    }

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
