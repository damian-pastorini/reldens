/**
 *
 * Reldens - ThemeManager
 *
 * This class will search for the project root required folders and give developers the option of create them.
 *
 */

const fs = require('fs');
const path = require('path');
const { Logger } = require('@reldens/utils');

class ThemeManager
{

    validateOrCreateTheme(config)
    {
        this.projectTheme = '/theme/default';
        // check for theme folder:
        if(config.projectTheme){
            this.projectTheme = '/theme/'+config.projectTheme;
        }
        // check if the dist folder exists:
        let themesFolderExists = fs.existsSync(config.projectRoot+'/theme');
        if(!themesFolderExists){
            fs.mkdirSync(config.projectRoot+'/theme');
        }
        // check if the folders exists:
        let distExists = fs.existsSync(config.projectRoot+'/dist');
        let themeExists = fs.existsSync(config.projectRoot + this.projectTheme);
        // we check the dist folder since it will be generated automatically on first run:
        if(!distExists || !themeExists){
            // if theme folder doesn't exists:
            if(!themeExists){
                // copy /default theme from node_modules/reldens into the project folder and into the dist folder:
                let nodeRoot = config.projectRoot+'/node_modules/reldens/';
                this.copyFolderSync(nodeRoot+'theme/default', config.projectRoot+this.projectTheme);
                this.copyFolderSync(nodeRoot+'theme/packages', config.projectRoot+'/theme/packages');
                this.copyFolderSync(nodeRoot+'theme/default', config.projectRoot+'/dist');
                Logger.error('Project theme folder was not found: '+config.projectTheme
                        +'\nA copy from default has been made.');
            } else {
                // if theme exists just copy it into the dist folder (assumed the packages folder was considered):
                this.copyFolderSync(config.projectRoot + this.projectTheme, config.projectRoot+'/dist');
            }
        }
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

}

module.exports.ThemeManager = new ThemeManager();
