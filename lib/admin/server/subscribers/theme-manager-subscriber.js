/**
 *
 * Reldens - ThemeManagerSubscriber
 *
 * Subscriber that provides theme management functionality through the admin panel.
 * Allows administrators to execute ThemeManager commands on selected themes.
 *
 */

const { Logger, sc } = require('@reldens/utils');
const { FileHandler } = require('@reldens/server-utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('@reldens/cms/lib/admin-manager').AdminManager} AdminManager
 * @typedef {import('../../../config/server/manager').ConfigManager} ConfigManager
 * @typedef {import('../../../game/server/theme-manager').ThemeManager} ThemeManager
 */

class ThemeManagerSubscriber
{

    /**
     * @param {AdminManager} adminManager
     * @param {ConfigManager} configManager
     * @param {ThemeManager} themeManager
     */
    constructor(adminManager, configManager, themeManager)
    {
        /** @type {string} */
        this.themeManagerPath = '/theme-manager';
        /** @type {string} */
        this.managementPath = '/management';
        /** @type {string} */
        this.serverManagerLabel = 'Server Manager';
        /** @type {number} */
        this.defaultShutdownTime = 180;
        /** @type {string} */
        this.rootPath = '';
        /** @type {ThemeManager} */
        this.themeManager = themeManager;
        /** @type {ConfigManager} */
        this.config = configManager;
        /** @type {Object|null} */
        this.translations = null;
        /** @type {EventsManager} */
        this.events = adminManager.events;
        /** @type {Function} */
        this.render = adminManager.contentsBuilder.render.bind(adminManager.contentsBuilder);
        /** @type {Function} */
        this.renderRoute = adminManager.contentsBuilder.renderRoute.bind(adminManager.contentsBuilder);
        /** @type {Function} */
        this.isAuthenticated = adminManager.router.isAuthenticated.bind(adminManager.router);
        /** @type {Object} */
        this.commands = this.getCommandsMetadata();
        this.listenEvents();
    }

    /**
     * @returns {Object}
     */
    getCommandsMetadata()
    {
        return {
            buildCss: {
                category: 'build',
                label: 'Build CSS',
                async: true,
                description: 'Compile SCSS to CSS using Parcel bundler',
                details: 'Enabled by default. Set RELDENS_ALLOW_BUILD_CSS=0 to disable. Creates optimized CSS in dist/css/.'
            },
            buildClient: {
                category: 'build',
                label: 'Build Client',
                async: true,
                description: 'Bundle client JavaScript using Parcel',
                details: 'Enabled by default. Set RELDENS_ALLOW_BUILD_CLIENT=0 to disable. Processes all .html files in theme folder.'
            },
            buildSkeleton: {
                category: 'build',
                label: 'Build Skeleton',
                async: true,
                description: 'Build both CSS and client',
                details: 'Combined build operation for complete theme compilation.'
            },
            resetDist: {
                category: 'clientDist',
                label: 'Reset Dist',
                async: false,
                description: 'Remove and recreate dist folder',
                details: 'Deletes dist/ completely and creates fresh empty structure.'
            },
            removeDist: {
                category: 'clientDist',
                label: 'Remove Dist',
                async: false,
                description: 'Delete dist folder',
                details: 'Permanently removes dist/ folder.'
            },
            copyAssetsToDist: {
                category: 'clientDist',
                label: 'Copy Assets to Dist',
                async: false,
                description: 'Copy theme assets folder to dist/assets',
                details: 'Copies images, audio, and other assets from theme to dist.'
            },
            copyDefaultAssets: {
                category: 'clientDist',
                label: 'Copy Default Assets',
                async: false,
                description: 'Copy default theme assets to dist',
                details: 'Copies assets from default theme.'
            },
            copyDefaultTheme: {
                category: 'copy',
                label: 'Copy Default Theme',
                async: false,
                description: 'Copy default theme files to project theme',
                details: 'Overwrites current theme with default theme files.'
            },
            copyPackage: {
                category: 'copy',
                label: 'Copy Plugins',
                async: false,
                description: 'Copy theme plugins folder',
                details: 'Copies plugin files from default theme.'
            },
            copyAdmin: {
                category: 'copy',
                label: 'Copy Admin',
                async: false,
                description: 'Copy admin panel files',
                details: 'Copies admin templates and assets.'
            },
            copyAdminFiles: {
                category: 'clientDist',
                label: 'Copy Admin Files to Dist',
                async: false,
                description: 'Copy admin JS/CSS to dist',
                details: 'Copies functions.js and reldens-functions.js to dist/js/, admin.js to dist/, admin.css to dist/css/.'
            },
            copyNew: {
                category: 'copy',
                label: 'Copy New (All)',
                async: false,
                description: 'Copy all theme files',
                details: 'Runs: copyDefaultAssets, copyDefaultTheme, copyPackage, copyAdmin.'
            },
            copyIndex: {
                category: 'install',
                label: 'Copy Index',
                async: true,
                description: 'Generate index.js from template',
                details: 'Creates project index.js with theme configuration. Skips if index.js already exists.'
            },
            copyServerFiles: {
                category: 'install',
                label: 'Copy Server Files',
                async: true,
                description: 'Copy server configuration files',
                details: 'Runs: copyEnvFile, copyKnexFile, copyGitignoreFile, copyIndex.'
            },
            installSkeleton: {
                category: 'install',
                label: 'Install Skeleton',
                async: true,
                description: 'Complete skeleton installation',
                details: 'Runs: copyIndex, copyServerFiles, resetDist, fullRebuild.'
            },
            fullRebuild: {
                category: 'install',
                label: 'Full Rebuild',
                async: true,
                description: 'Complete rebuild of theme',
                details: 'Runs: copyNew, buildSkeleton, copyAdminFiles. Takes 30-60 seconds.'
            },
        };
    }

    /**
     * @returns {boolean|void}
     */
    listenEvents()
    {
        if(!this.events){
            Logger.error('EventsManager not found on ThemeManagerSubscriber.');
            return false;
        }
        this.events.on('reldens.setupAdminManagers', async (event) => {
            this.setupRoutes(event.adminManager);
        });
        this.events.on('reldens.adminSideBarBeforeSubItems', async (event) => {
            event.navigationContents['Server'] = await this.render(
                event.adminManager.adminFilesContents.sideBarItem,
                {
                    name: this.serverManagerLabel,
                    path: event.adminManager.rootPath+this.managementPath
                }
            );
        });
        this.events.on('reldens.buildAdminContentsAfter', async (event) => {
            let rootPath = event.adminManager.rootPath;
            let managementBody = await this.render(
                event.adminManager.adminFilesContents.management,
                {
                    actionPath: rootPath+this.managementPath,
                    shutdownTime: this.config.getWithoutLogs(
                        'server/shutdownTime',
                        this.defaultShutdownTime
                    ),
                    shuttingDownLabel: '{{&shuttingDownLabel}}',
                    shuttingDownTime: '{{&shuttingDownTime}}',
                    submitLabel: '{{&submitLabel}}',
                    submitType: '{{&submitType}}'
                }
            );
            let themeBody = await this.render(
                event.adminManager.adminFilesContents.themeManager,
                this.getTemplateData(event.adminManager)
            );
            event.adminManager.contentsBuilder.adminContents.management = await this.renderRoute(
                managementBody+themeBody,
                event.adminManager.contentsBuilder.adminContents.sideBar
            );
        });
    }

    /**
     * @param {AdminManager} adminManager
     * @returns {boolean|void}
     */
    setupRoutes(adminManager)
    {
        if('' === this.rootPath){
            this.rootPath = adminManager.rootPath;
        }
        if(!this.translations){
            this.translations = adminManager.translations;
        }
        if(!adminManager.router.adminRouter){
            Logger.error('AdminRouter is not available in ThemeManagerSubscriber.setupRoutes.');
            return false;
        }
        adminManager.router.adminRouter.post(
            this.themeManagerPath,
            this.isAuthenticated,
            async (req, res) => {
                let selectedTheme = req.body['selected-theme'];
                let command = req.body['command'];
                let redirectPath = this.rootPath+this.managementPath;
                if(!selectedTheme){
                    return res.redirect(redirectPath+'?result=themeManagerMissingTheme');
                }
                if(!command || !this.commands[command]){
                    return res.redirect(redirectPath+'?result=themeManagerMissingCommand');
                }
                try {
                    await this.executeCommand(command, selectedTheme);
                    return res.redirect(redirectPath+'?result=success');
                } catch(error){
                    Logger.error('Theme manager command failed', {command, theme: selectedTheme, error});
                    return res.redirect(redirectPath+'?result=themeManagerExecutionError');
                }
            }
        );
    }

    /**
     * @param {string} commandName
     * @param {string} themeName
     * @returns {Promise<void>}
     */
    async executeCommand(commandName, themeName)
    {
        Logger.info('Executing theme manager command: '+commandName+' on theme: '+themeName);
        this.themeManager.setupPaths({
            projectRoot: this.themeManager.projectRoot,
            projectThemeName: themeName
        });
        if(!sc.isFunction(this.themeManager[commandName])){
            throw new Error('Invalid command: '+commandName);
        }
        await this.themeManager[commandName]();
        Logger.info('Theme manager command completed: '+commandName);
    }

    /**
     * @returns {Array}
     */
    getAvailableThemes()
    {
        try {
            let themePath = this.themeManager.themePath;
            let folders = FileHandler.fetchSubFoldersList(themePath);
            let excludeFolders = ['admin', 'plugins'];
            let themes = [];
            for(let folder of folders){
                if(excludeFolders.includes(folder)){
                    continue;
                }
                themes.push({
                    name: folder,
                    selected: folder === this.themeManager.projectThemeName
                });
            }
            return themes;
        } catch(error){
            Logger.error('Failed to get available themes', error);
            return [{name: 'default', selected: true}];
        }
    }

    /**
     * @param {AdminManager} adminManager
     * @returns {Object}
     */
    getTemplateData(adminManager)
    {
        let rootPath = adminManager ? adminManager.rootPath : this.rootPath;
        let themes = this.getAvailableThemes();
        let buildCommands = [];
        let clientDistCommands = [];
        let copyCommands = [];
        let installCommands = [];
        let commandDescriptions = {};
        for(let commandName of Object.keys(this.commands)){
            let meta = this.commands[commandName];
            let commandData = {
                name: commandName,
                label: meta.label,
                async: meta.async
            };
            commandDescriptions[commandName] = {
                description: meta.description,
                details: meta.details
            };
            if('build' === meta.category){
                buildCommands.push(commandData);
                continue;
            }
            if('clientDist' === meta.category){
                clientDistCommands.push(commandData);
                continue;
            }
            if('copy' === meta.category){
                copyCommands.push(commandData);
                continue;
            }
            if('install' === meta.category){
                installCommands.push(commandData);
            }
        }
        return {
            actionPath: rootPath+this.themeManagerPath,
            currentTheme: this.themeManager.projectThemeName,
            themes,
            buildCommands,
            clientDistCommands,
            copyCommands,
            installCommands,
            commandDescriptionsJson: sc.toJsonString(commandDescriptions)
        };
    }

}

module.exports.ThemeManagerSubscriber = ThemeManagerSubscriber;
