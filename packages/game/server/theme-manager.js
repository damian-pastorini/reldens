/**
 *
 * Reldens - ThemeManager
 *
 * This class will search for the project root required folders and give developers the option of create them.
 *
 */

const fs = require('fs');
const path = require('path');
const del = require('del');
const TemplateEngine = require('mustache');
const { Logger } = require('@reldens/utils');

class ThemeManager
{

    validateOrCreateTheme(config)
    {
        this.projectTheme = path.join('theme', 'default');
        this.projectRoot = config.projectRoot;
        // check for theme folder:
        if(config.projectTheme){
            this.projectTheme = path.join('theme', config.projectTheme);
        }
        this.themeFullPath = path.join(this.projectRoot, this.projectTheme);
        // check if the dist folder exists:
        let themesFolderExists = fs.existsSync(path.join(this.projectRoot, 'theme'));
        if(!themesFolderExists){
            fs.mkdirSync(path.join(this.projectRoot, 'theme'));
        }
        // check if the folders exists:
        let rootDist = path.join(this.projectRoot, 'dist');
        let distExists = fs.existsSync(rootDist);
        let rootTheme = path.join(this.projectRoot, this.projectTheme);
        let themeExists = fs.existsSync(rootTheme);
        // we check the dist folder since it will be generated automatically on first run:
        if(!distExists || !themeExists){
            // if theme folder doesn't exists:
            if(!themeExists){
                // copy /default theme from node_modules/reldens into the project folder and into the dist folder:
                let nodeRoot = path.join(this.projectRoot, 'node_modules', 'reldens');
                let nodeTheme = path.join(nodeRoot, 'theme');
                let themeDefault = path.join(nodeTheme, 'default');
                let themePackages = path.join(nodeTheme, 'packages');
                this.copyFolderSync(themeDefault, rootTheme);
                this.copyFolderSync(themePackages, path.join(this.projectRoot, 'theme', 'packages'));
                this.copyFolderSync(themeDefault, path.join(this.projectRoot, 'dist'));
                Logger.error('Project theme folder was not found: '+config.projectTheme
                        +'\nA copy from default has been made.');
            } else {
                // if theme exists just copy it into the dist folder (assumed the packages folder was considered):
                this.copyFolderSync(rootTheme, rootDist);
            }
        }
    }

    async resetDist()
    {
        let distFolder = path.join(this.projectRoot, 'dist');
        if(fs.existsSync(distFolder)){
            await del(distFolder);
            fs.mkdirSync(distFolder);
        }
    }

    copyAssetsToDist()
    {
        let themeAssets = path.join(this.projectRoot, this.projectTheme, 'assets');
        let distAssets = path.join(this.projectRoot, 'dist', 'assets');
        this.copyFolderSync(themeAssets, distAssets);
    }

    copyFolderSync(from, to)
    {
        fs.mkdirSync(to);
        fs.readdirSync(from).forEach(element => {
            if(fs.lstatSync(path.join(from, element)).isFile()){
                fs.copyFileSync(path.join(from, element), path.join(to, element));
            } else {
                this.copyFolderSync(path.join(from, element), path.join(to, element));
            }
        });
    }

    async loadAndRenderTemplate(filePath, params)
    {
        let fullPath = path.join(this.projectRoot, this.projectTheme, filePath);
        if(!fs.existsSync(fullPath)){
            Logger.error(['Template not found.', fullPath]);
            return false;
        }
        let fileContent = fs.readFileSync(fullPath, {encoding:'utf8', flag:'r'});
        return TemplateEngine.render(fileContent, params);
    }

}

module.exports.ThemeManager = ThemeManager;
