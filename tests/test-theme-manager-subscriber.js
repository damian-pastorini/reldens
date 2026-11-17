/**
 *
 * Reldens - Test Theme Manager Subscriber
 *
 */

const { BaseTest } = require('./base-test');
const { ThemeManagerSubscriber } = require('../lib/admin/server/subscribers/theme-manager-subscriber');
const { FileHandler } = require('@reldens/server-utils');

class TestThemeManagerSubscriber extends BaseTest
{

    createAdminManager(capturedRoutes)
    {
        return {
            events: {on: () => true},
            rootPath: '/reldens-admin',
            contentsBuilder: {render: async () => '', renderRoute: async () => ''},
            router: {
                isAuthenticated: (req, res, next) => next(),
                adminRouter: {post: (path, isAuthenticated, callback) => capturedRoutes.push(callback)}
            }
        };
    }

    createThemeManager(executedCommands, commandError)
    {
        return {
            themePath: FileHandler.joinPaths(process.cwd(), 'theme'),
            setupPaths: (props) => executedCommands.push('setupPaths:'+props.projectThemeName),
            resetDist: async () => {
                executedCommands.push('resetDist');
                if(commandError){
                    throw commandError;
                }
            }
        };
    }

    async postThemeCommand(selectedTheme, executedCommands, commandError = false)
    {
        let capturedRoutes = [];
        let adminManager = this.createAdminManager(capturedRoutes);
        let subscriber = new ThemeManagerSubscriber(adminManager, {}, this.createThemeManager(executedCommands, commandError));
        subscriber.setupRoutes(adminManager);
        let redirects = [];
        let routeCallback = [...capturedRoutes].shift();
        await routeCallback(
            {body: {'selected-theme': selectedTheme, command: 'resetDist'}},
            {redirect: (redirectPath) => redirects.push(redirectPath)}
        );
        return [...redirects].shift();
    }

    async testTheExistingThemeRunsTheCommand()
    {
        await this.test('an existing theme folder runs the theme manager command', async () => {
            let executedCommands = [];
            let redirectPath = await this.postThemeCommand('default', executedCommands);
            this.assert.strictEqual(redirectPath, '/reldens-admin/management?result=success');
            this.assert.deepStrictEqual(executedCommands, ['setupPaths:default', 'resetDist']);
        });
    }

    async testAFailedCommandRedirectsWithTheExecutionError()
    {
        await this.test('a theme manager command that throws redirects with the execution error', async () => {
            let executedCommands = [];
            let redirectPath = await this.postThemeCommand('default', executedCommands, new Error('Dist reset failed.'));
            this.assert.deepStrictEqual(
                [redirectPath, executedCommands],
                ['/reldens-admin/management?result=themeManagerExecutionError', ['setupPaths:default', 'resetDist']]
            );
        });
    }

    async testThePathTraversalThemeIsRejected()
    {
        await this.test('a theme name outside the theme folders is rejected', async () => {
            let executedCommands = [];
            let redirectPath = await this.postThemeCommand(
                FileHandler.joinPaths('..', 'outside-project'),
                executedCommands
            );
            this.assert.strictEqual(redirectPath, '/reldens-admin/management?result=themeManagerMissingTheme');
            this.assert.strictEqual(executedCommands.length, 0);
        });
    }

}

module.exports.TestThemeManagerSubscriber = TestThemeManagerSubscriber;
