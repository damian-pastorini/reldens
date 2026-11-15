/**
 *
 * Reldens - InstallationBaseTest
 *
 * Base of the installer integration tests: a real Installer on a new project folder in test-results (with the module
 * of this checkout as the Reldens module) that records the start callback props, the install form request of a
 * storage driver with the test database values of tests/config.json, and a response that records the redirect.
 *
 */

const { BaseTest } = require('../base-test');
const { Installer } = require('../../lib/game/server/installer');
const { ThemeManager } = require('../../lib/game/server/theme-manager');
const { FileHandler } = require('@reldens/server-utils');

class InstallationBaseTest extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.isIntegration = true;
        this.projectRoot = process.cwd();
        this.installProjectRoot = FileHandler.joinPaths(this.projectRoot, 'test-results', 'installer-project');
        this.startCallbackProps = false;
    }

    createInstaller()
    {
        FileHandler.remove(this.installProjectRoot);
        FileHandler.createFolder(this.installProjectRoot);
        return new Installer({
            themeManager: new ThemeManager({projectRoot: this.installProjectRoot, reldensModulePath: this.projectRoot}),
            startCallback: async (props) => {
                this.startCallbackProps = props;
            }
        });
    }

    createInstallRequest(storageDriver)
    {
        return {
            session: {},
            body: {
                'app-host': 'http://localhost',
                'app-port': '8080',
                'app-public-url': 'http://localhost:8080',
                'app-trusted-proxy': '',
                'app-admin-path': '/reldens-admin',
                'app-admin-secret': 'installer-test-secret',
                'app-signed-tokens-secret': 'installer-test-signed-tokens-secret',
                'db-storage-driver': storageDriver,
                'db-client': 'mysql2',
                'db-host': this.config.dbHost,
                'db-port': this.config.dbPort,
                'db-name': this.config.dbName,
                'db-username': this.config.dbUser,
                'db-password': this.config.dbPassword,
                'mailer-service': 'nodemailer'
            }
        };
    }

    createInstallResponse()
    {
        let response = {redirectUrl: ''};
        response.redirect = (url) => {
            response.redirectUrl = url;
            return response;
        };
        return response;
    }

}

module.exports.InstallationBaseTest = InstallationBaseTest;
