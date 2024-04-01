/**
 *
 * Reldens - FileHandler
 *
 */

const fs = require('fs');
const path = require('path');
const { Logger } = require('@reldens/utils');

class FileHandler
{

    constructor()
    {
        this.encoding = 'utf8';
    }

    joinPaths(...paths)
    {
        return path.join(...paths);
    }

    copyFile(from, to, folder)
    {
        if(!this.exists(from)){
            return false;
        }
        if(!this.exists(folder)){
            return false;
        }
        fs.copyFileSync(from, path.join(folder, to));
        return true;
    }

    createFolder(folderPath)
    {
        fs.mkdirSync(folderPath, { recursive: true });
    }

    readFile(filePath)
    {
        return fs.readFileSync(filePath);
    }

    async writeFile(fileName, content)
    {
        return fs.writeFile(fileName, content, this.encoding, (err) => {
            if(err){
                Logger.error('Error saving the file:', err);
                return false;
            }
            Logger.info('The file has been saved! New file name: '+fileName);
            return true;
        });
    }

    exists(fullPath)
    {
        if(!fs.existsSync(fullPath)){
            Logger.info(`File or folder "${fullPath}" does not exist.`);
            return false;
        }
        return true;
    }

    removeByPath(fullPath)
    {
        if(!this.exists(fullPath)){
            return false;
        }
        let stats = fs.statSync(fullPath);
        if(stats.isFile()){
            fs.unlinkSync(fullPath);
            Logger.info(`File "${fullPath}" has been removed.`);
            return true;
        }
        if(stats.isDirectory()){
            fs.rmdirSync(fullPath, { recursive: true }); // Remove folder recursively
            Logger.info(`Folder "${fullPath}" has been removed.`);
            return true;
        }
        Logger.warning(`"${fullPath}" is neither a file nor a folder.`);
        return false;
    }

}

module.exports.FileHandler = FileHandler;
