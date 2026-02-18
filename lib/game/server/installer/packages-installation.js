/**
 *
 * Reldens - PackagesInstallation
 *
 * Manages npm package installation and linking during Reldens project setup.
 * Supports three installation types: normal install, link all packages, link main package only.
 * Handles unlinking, checking installation status, and Prisma client installation for the Prisma driver.
 *
 */

const { execSync } = require('child_process');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {Object} PackagesInstallationProps
 * @property {string} [projectRoot]
 * @property {string} [installationType]
 * @property {Array<string>} [linkablePackages]
 */
class PackagesInstallation
{

    /**
     * @param {PackagesInstallationProps} props
     */
    constructor(props)
    {
        /** @type {string} */
        this.projectRoot = sc.get(props, 'projectRoot', './');
        /** @type {string} */
        this.installationType = sc.get(props, 'installationType', 'normal');
        /** @type {string} */
        this.mainPackage = 'reldens';
        /** @type {Array<string>} */
        this.linkablePackages = sc.get(props, 'linkablePackages', [
            '@reldens/cms',
            '@reldens/game-data-generator',
            '@reldens/items-system',
            '@reldens/modifiers',
            '@reldens/server-utils',
            '@reldens/skills',
            '@reldens/storage',
            '@reldens/tile-map-generator',
            '@reldens/utils'
        ]);
        /** @type {string} */
        this.lockFilePath = FileHandler.joinPaths(
            this.projectRoot, 'node_modules', this.mainPackage, 'package-lock.json'
        );
    }

    /**
     * @returns {boolean}
     */
    unlinkAllPackages()
    {
        if('normal' === this.installationType){
            Logger.debug('Skipping package unlinking for normal installation.');
            return true;
        }
        let packagesToUnlink = [...this.linkablePackages, this.mainPackage];
        Logger.info('Unlinking all packages before installation...');
        for(let packageName of packagesToUnlink){
            try {
                execSync('npm unlink '+packageName, {stdio: 'ignore', cwd: this.projectRoot});
            } catch (error) {
                Logger.debug('Package not linked or unlink failed: '+packageName);
            }
        }
        Logger.info('All packages unlinked.');
        return true;
    }

    /**
     * @param {string} storageDriverKey
     * @returns {boolean}
     */
    checkAndInstallPackages(storageDriverKey)
    {
        let packagesToInstall = [];
        let packagesToLink = [];
        if('link' === this.installationType){
            packagesToLink = [...this.linkablePackages, this.mainPackage];
        }
        if('link-main' === this.installationType){
            packagesToInstall = [...this.linkablePackages];
            packagesToLink = [this.mainPackage];
        }
        if('normal' === this.installationType){
            packagesToInstall = [this.mainPackage];
        }
        if('prisma' === storageDriverKey){
            packagesToInstall.push('@prisma/client');
        }
        return this.processPackages(packagesToInstall, 'install') && this.processPackages(packagesToLink, 'link');
    }

    /**
     * @param {Object} lockData
     * @param {string} packageName
     * @returns {string}
     */
    findVersionInLockFile(lockData, packageName)
    {
        if(!lockData){
            return '';
        }
        if(sc.hasOwn(lockData, 'packages')){
            // @NOTE: 'node_modules/' is not a folder separator, it is the format npm uses for package-lock.json
            let packageKey = 'node_modules/'+packageName;
            let entry = sc.get(lockData.packages, packageKey, false);
            if(entry){
                return sc.get(entry, 'version', '');
            }
        }
        if(sc.hasOwn(lockData, 'dependencies')){
            let entry = sc.get(lockData.dependencies, packageName, false);
            if(entry){
                return sc.get(entry, 'version', '');
            }
        }
        return '';
    }

    /**
     * @param {Array<string>} packages
     * @param {string} command
     * @returns {boolean}
     */
    processPackages(packages, command)
    {
        if(0 === packages.length){
            return true;
        }
        Logger.info('Processing packages with command: npm '+command);
        let lockData = false;
        if('install' === command){
            lockData = FileHandler.fetchFileJson(this.lockFilePath);
            if(lockData){
                Logger.debug('Lock file loaded: '+this.lockFilePath);
            }
        }
        for(let packageName of packages){
            if(this.isPackageInstalled(packageName)){
                Logger.debug('Package already '+command+'ed: '+packageName);
                continue;
            }
            if(!lockData && 'install' === command){
                lockData = FileHandler.fetchFileJson(this.lockFilePath);
                if(lockData){
                    Logger.debug('Lock file loaded: '+this.lockFilePath);
                }
            }
            let version = '';
            if(lockData){
                version = this.findVersionInLockFile(lockData, packageName);
            }
            let installTarget = version ? packageName+'@'+version : packageName;
            Logger.info('Executing: npm '+command+' '+installTarget);
            try {
                execSync('npm '+command+' '+installTarget, {stdio: 'inherit', cwd: this.projectRoot});
            } catch (error) {
                Logger.error('Failed to '+command+' package ('+packageName+'): '+error.message);
                return false;
            }
        }
        Logger.info('Packages processed successfully.');
        return true;
    }

    /**
     * @param {string} packageName
     * @returns {boolean}
     */
    isPackageInstalled(packageName)
    {
        return FileHandler.exists(FileHandler.joinPaths(this.projectRoot, 'node_modules', packageName));
    }

}

module.exports.PackagesInstallation = PackagesInstallation;
