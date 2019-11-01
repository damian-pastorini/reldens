/**
 *
 * Reldens - Installer
 *
 * This class will search for the project root required folders and give developers the option of create them.
 *
 */

// @TODO: - Seiyria - this sort of stuff should be taken care of by an npm script, or something such as
//   `npx create-reldens-app` (noted again for posterity)
const fs = require('fs');
const path = require('path');

class Installer
{

    validateOrCreateSkeleton(config)
    {
        let skeletonExists = fs.existsSync(config.projectRoot+'/pub')
            && fs.existsSync(config.projectRoot+'/config')
            && fs.existsSync(config.projectRoot+'/packages');
        if(!skeletonExists){
            if(!config['installSkeleton']){
                // alert and stop.
                let errorMessage = 'ERROR - Skeleton folders does not exists, please make sure you have the project'
                    +' root folders /pub and /config with all the required components on them.'
                    +"\n"+' Note: you can create the missing folder with the example structure if you include the'
                    +' "installSkeleton" parameter in the initial configuration, like:'
                    +"\n"+' new ReldensServer({projectRoot: __dirname, installSkeleton: true});'+"\n"+"\n";
                throw new Error(errorMessage);
            } else {
                // copy /pub, /config and /packages from node_modules/reldens into the project root:
                let nodeRoot = config.projectRoot+'/node_modules/reldens/';
                this.copyFolderSync(nodeRoot+'pub', config.projectRoot+'/pub');
                this.copyFolderSync(nodeRoot+'config', config.projectRoot+'/config');
                this.copyFolderSync(nodeRoot+'packages', config.projectRoot+'/packages');
                // then copy the "pub" into the "dist" folder so we can get all the assets:
                this.copyFolderSync(config.projectRoot+'/pub', config.projectRoot+'/dist');
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

module.exports = new Installer();
