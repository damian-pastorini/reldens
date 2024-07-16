/**
 *
 * Reldens - FileHandler
 *
 */

const path = require('path');
const fs = require('fs');
const { Logger, sc} = require('@reldens/utils');

class FileHandler
{

    constructor()
    {
        this.encoding = (process.env.RELDENS_DEFAULT_ENCODING || 'utf8');
        this.sep = path.sep;
    }

    joinPaths(...args)
    {
        return path.join(...args);
    }

    exists(fullPath)
    {
        return fs.existsSync(fullPath);
    }

    async deleteFile(filePath)
    {
        try {
            let deleteFile = sc.isArray(filePath) ? this.joinPath(...filePath) : filePath
            await fs.promises.unlink(deleteFile);
        } catch (err) {
            // Logger.error(err);
        }
    }

    removeFolder(folderPath)
    {
        try {
            if(fs.existsSync(folderPath)){
                fs.rmSync(folderPath, {recursive: true, force: true});
                return true;
            }
        } catch (error) {
            Logger.debug('Failed to remove folder.', error);
        }
        return false;
    }

    createFolder(folderPath)
    {
        try {
            if(fs.existsSync(folderPath)){
                return true;
            }
            fs.mkdirSync(folderPath, {recursive: true});
            Logger.info('Folder does not exists, creating: '+folderPath);
            return true;
        } catch (error) {
            Logger.debug('Failed to create folder.', error);
        }
        return false;
    }

    copyFolderSync(from, to)
    {
        try {
            fs.mkdirSync(to, {recursive: true});
            let folders = fs.readdirSync(from);
            for(let element of folders){
                let elementPath = path.join(from, element);
                if(!fs.existsSync(elementPath)){
                    Logger.debug('Copy folder does not exist.', elementPath);
                    continue;
                }
                if(fs.lstatSync(elementPath).isFile()){
                    fs.copyFileSync(elementPath, path.join(to, element));
                    continue;
                }
                this.copyFolderSync(elementPath, path.join(to, element));
            }
            return true;
        } catch (error) {
            Logger.debug('Failed to copy folder.', error);
        }
        return false;
    }

    copyFileSyncIfDoesNotExist(from, to)
    {
        if(!fs.existsSync(to)){
            return fs.copyFileSync(from, to);
        }
    }

    async copyFile(from, to)
    {
        let origin = sc.isArray(from) ? this.joinPaths(...from) : from;
        let dest = sc.isArray(to) ? this.joinPaths(...to) : to;
        try {
            return await fs.promises.copyFile(origin, dest);
        } catch (error) {
            Logger.error(error.message);
            return false;
        }
    }

    extension(filePath)
    {
        return path.extname(filePath);
    }

    readFolder(folder, options)
    {
        return fs.readdirSync(folder, options);
    }

    fetchSubFoldersList(folder, options)
    {
        let files = fs.readdirSync(folder, options);
        let subFolders = [];
        for(let file of files){
            let filePath = path.join(folder, file);
            if(fs.lstatSync(filePath).isDirectory()){
                subFolders.push(file);
            }
        }
        return subFolders;
    }

    isFile(filePath)
    {
        return fs.lstatSync(filePath).isFile();
    }

    permissionsCheck(systemPath)
    {
        try {
            let crudTestPath = path.join(systemPath, 'crud-test');
            fs.mkdirSync(crudTestPath, {recursive: true});
            fs.rmSync(crudTestPath);
            return true;
        } catch (error) {
            return false;
        }
    }

    fetchFileJson(filePath)
    {
        let fileContents = this.fetchFileContents(filePath);
        if(!fileContents){
            return false;
        }
        let importedJson = JSON.parse(fileContents);
        if(!importedJson){
            Logger.error('Can not parse data file.');
            return false;
        }
        return importedJson;
    }

    fetchFileContents(filePath)
    {
        let fileContent = this.readFile(filePath);
        if(!fileContent){
            Logger.error('Can not read data file or file empty.', filePath);
            return false;
        }
        return fileContent;
    }

    readFile(filePath)
    {
        if(!filePath){
            Logger.error('Missing data file.', filePath);
            return false;
        }
        return fs.readFileSync(filePath, {encoding: this.encoding, flag: 'r'});
    }

    async updateFileContents(filePath, contents)
    {
        return fs.writeFileSync(fs.openSync(filePath, 'w+'), contents);
    }

}

module.exports.FileHandler = new FileHandler();
