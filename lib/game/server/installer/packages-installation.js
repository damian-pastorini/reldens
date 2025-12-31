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
    }

    /**
     * @returns {Promise<boolean>}
     */
    async unlinkAllPackages()
    {
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
     * @returns {Promise<boolean>}
     */
    async checkAndInstallPackages(storageDriverKey)
    {
        if('link' === this.installationType){
            return this.linkAllPackages();
        }
        if('link-main' === this.installationType){
            return this.installAndLinkMain(storageDriverKey);
        }
        return this.installPackages(storageDriverKey);
    }

    /**
     * @returns {boolean}
     */
    linkAllPackages()
    {
        let packagesToLink = [...this.linkablePackages, this.mainPackage];
        Logger.info('Checking packages to link...');
        let packagesLinkedCount = 0;
        for(let packageName of packagesToLink){
            if(this.isPackageLinked(packageName)){
                Logger.debug('Package already linked: '+packageName);
                packagesLinkedCount++;
                continue;
            }
            Logger.info('Linking package: npm link '+packageName);
            try {
                execSync('npm link '+packageName, {stdio: 'inherit', cwd: this.projectRoot});
                packagesLinkedCount++;
            } catch (error) {
                Logger.error('Failed to link package ('+packageName+'): '+error.message);
                return false;
            }
        }
        Logger.info('Dependencies linked successfully ('+packagesLinkedCount+'/'+packagesToLink.length+').');
        return true;
    }

    /**
     * @param {string} storageDriverKey
     * @returns {boolean}
     */
    installAndLinkMain(storageDriverKey)
    {
        for(let linkablePackage of this.linkablePackages){
            if(this.isPackageInstalled(linkablePackage)){
                continue;
            }
            Logger.info('Installing package: npm install '+linkablePackage);
            if(!this.executeInstall([linkablePackage])){
                return false;
            }
        }
        if(!this.installPrismaClientIfNeeded(storageDriverKey)){
            return false;
        }
        if(this.isPackageLinked(this.mainPackage)){
            Logger.debug('Main package already linked: '+this.mainPackage);
            return true;
        }
        Logger.info('Linking main package: npm link '+this.mainPackage);
        try {
            execSync('npm link '+this.mainPackage, {stdio: 'inherit', cwd: this.projectRoot});
            Logger.info('Main package linked successfully.');
            return true;
        } catch (error) {
            Logger.error('Failed to link main package ('+this.mainPackage+'): '+error.message);
            return false;
        }
    }

    /**
     * @param {string} storageDriverKey
     * @returns {boolean}
     */
    installPackages(storageDriverKey)
    {
        if(this.isPackageInstalled(this.mainPackage)){
            return this.installPrismaClientIfNeeded(storageDriverKey);
        }
        Logger.info('Installing main package: npm install '+this.mainPackage);
        if(!this.executeInstall([this.mainPackage])){
            return false;
        }
        return this.installPrismaClientIfNeeded(storageDriverKey);
    }

    /**
     * @param {string} storageDriverKey
     * @returns {boolean}
     */
    installPrismaClientIfNeeded(storageDriverKey)
    {
        if('prisma' !== storageDriverKey){
            return true;
        }
        if(this.isPackageInstalled('@prisma/client')){
            return true;
        }
        Logger.info('Installing package: npm install @prisma/client');
        return this.executeInstall(['@prisma/client']);
    }

    /**
     * @param {Array<string>} packages
     * @returns {boolean}
     */
    executeInstall(packages)
    {
        try {
            let installCommand = 'npm install '+packages.join(' ');
            execSync(installCommand, {stdio: 'inherit', cwd: this.projectRoot});
            Logger.info('Dependencies installed successfully.');
            return true;
        } catch (error) {
            Logger.error('Failed to install dependencies ('+packages.join(' ')+'): '+error.message);
            return false;
        }
    }

    /**
     * @param {string} packageName
     * @returns {boolean}
     */
    isPackageInstalled(packageName)
    {
        return FileHandler.exists(FileHandler.joinPaths(this.projectRoot, 'node_modules', packageName));
    }

    /**
     * @param {string} packageName
     * @returns {boolean}
     */
    isPackageLinked(packageName)
    {
        let packagePath = FileHandler.joinPaths(this.projectRoot, 'node_modules', packageName);
        if(!FileHandler.exists(packagePath)){
            return false;
        }
        try {
            return FileHandler.nativeHandler.lstatSync(packagePath).isSymbolicLink();
        } catch (error) {
            return false;
        }
    }

}

module.exports.PackagesInstallation = PackagesInstallation;
