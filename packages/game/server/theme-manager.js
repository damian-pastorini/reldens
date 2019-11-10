/**
 *
 * Reldens - ThemeManager
 *
 * This class will search for the project root required folders and give developers the option of create them.
 *
 */

const fs = require('fs');
const path = require('path');
const { Logger } = require('../logger');

class ThemeManager
{

    projectTheme = '/theme/default';

    validateOrCreateTheme(config)
    {
        if(config.projectTheme){
            if(fs.existsSync(config.projectRoot + '/theme/' + config.projectTheme)){
                this.projectTheme = '/theme/'+config.projectTheme;
            } else {
                Logger.error('Project theme folder does not exists:' + config.projectTheme);
            }
        }
        // check if the dist folder exists and if not create it:
        let distExists = fs.existsSync(config.projectRoot+'/dist');
        if(!distExists){
            let themeExists = fs.existsSync(config.projectRoot + this.projectTheme);
            // if theme folder doesn't exists:
            if(!themeExists){
                // copy /default theme from node_modules/reldens into the project dist folder:
                let nodeRoot = config.projectRoot+'/node_modules/reldens/';
                this.copyFolderSync(nodeRoot+'theme/default', config.projectRoot+'/dist');
            } else {
                this.copyFolderSync(config.projectRoot + this.projectTheme, config.projectRoot+'/dist');
            }
        }
    }

    copyFolderSync(from, to)
    {
        fs.mkdirSync(to);
        fs.readdirSync(from).forEach(element => {
            if (fs.lstatSync(path.join(from, element)).isFile()) {
                fs.copyFileSync(path.join(from, element), path.join(to, element));
            } else {
                this.copyFolderSync(path.join(from, element), path.join(to, element));
            }
        });
    }

}

module.exports.ThemeManager = new ThemeManager();
