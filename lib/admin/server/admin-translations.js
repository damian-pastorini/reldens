/**
 *
 * Reldens - AdminTranslations
 *
 */

class AdminTranslations
{

    static appendTranslations(translations)
    {
        // @TODO - BETA - Fix translations, use snippets, include new snippets under the basic config script.
        let adminTranslations = {
            messages: {
                loginWelcome: 'Administration Panel - Login',
                reldensTitle: 'Reldens - Administration Panel',
                reldensSlogan: 'You can do it',
                reldensDiscordTitle: 'Join our Discord server!',
                reldensDiscordText: 'Talk with the creators and other Reldens users',
                reldensGithubTitle: 'Find us on GitHub!',
                reldensGithubText: 'Need a new feature?'
                    +' Would you like to contribute with code?'
                    +' Find the source code or create an issue in GitHub',
                reldensLoading: 'Loading...'
            },
            labels: {
                navigation: 'Reldens - Administration Panel',
                adminVersion: 'Admin: {{version}}',
                loginWelcome: 'Reldens',
                pages: 'Server Management',
                management: 'Management',
                mapsWizard: 'Maps Generation and Import',
                objectsImport: 'Objects Import',
                skillsImport: 'Skills Import',
                shuttingDown: 'Server is shutting down in:',
                submitShutdownLabel: 'Shutdown Server',
                submitCancelLabel: 'Cancel Server Shutdown',
            }
        };
        for(let i of Object.keys(translations)){
            if(!adminTranslations[i]){
                adminTranslations[i] = {};
            }
            Object.assign(adminTranslations[i], translations[i]);
        }
        return adminTranslations;
    }

}

module.exports.AdminTranslations = AdminTranslations;
