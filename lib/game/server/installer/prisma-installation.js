/**
 *
 * Reldens - PrismaInstallation
 *
 * Handles Prisma-specific database installation and setup tasks.
 * Generates the Prisma schema via introspection, creates the Prisma client, and runs installation in a subprocess.
 * Uses child process fork to isolate Prisma client generation and avoid module caching issues.
 *
 */

const { fork } = require('child_process');
const { PrismaSchemaGenerator } = require('@reldens/storage');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('child_process').ChildProcess} ChildProcess
 *
 * @typedef {Object} PrismaInstallationProps
 * @property {string} [projectRoot]
 * @property {string} [reldensModulePath]
 * @property {number} [subprocessMaxAttempts]
 * @property {Object|false} [prismaClient]
 *
 * @typedef {Object} InstallationResult
 * @property {boolean} success
 * @property {string} [error]
 * @property {Object} [dbDriver]
 *
 * @typedef {Object} DbConfig
 * @property {string} client
 * @property {Object} config
 *
 * @typedef {Object} ConnectionData
 * @property {string} client
 * @property {Object} config
 */
class PrismaInstallation
{

    /**
     * @param {PrismaInstallationProps} props
     */
    constructor(props)
    {
        /** @type {string} */
        this.projectRoot = sc.get(props, 'projectRoot', './');
        /** @type {string} */
        this.reldensModulePath = sc.get(props, 'reldensModulePath', './');
        /** @type {number} */
        this.subprocessMaxAttempts = sc.get(props, 'subprocessMaxAttempts', 1800);
        /** @type {Object|false} */
        this.prismaClient = sc.get(props, 'prismaClient', false);
    }

    /**
     * @param {string} clientPath
     * @returns {Object} Prisma client module exports
     */
    requireClient(clientPath)
    {
        return require(clientPath);
    }

    /**
     * @param {Function} selectedDriver
     * @param {DbConfig} dbConfig
     * @param {Object} templateVariables
     * @param {string} migrationsPath
     * @returns {Promise<InstallationResult>} Result with success flag, optional error, and driver instance
     */
    async executeInstallation(selectedDriver, dbConfig, templateVariables, migrationsPath)
    {
        let subprocessResult = await this.runSubprocessInstallation(dbConfig, templateVariables, migrationsPath);
        if(!subprocessResult){
            return {success: false, error: 'prisma-subprocess-failed'};
        }
        let dbDriver = new selectedDriver(dbConfig);
        return {success: true, dbDriver: dbDriver};
    }

    /**
     * @param {ConnectionData} connectionData
     * @param {boolean} [useDataProxy]
     * @returns {Promise<boolean>} Returns true if the schema generation succeeded, false on error
     */
    async generatePrismaSchema(connectionData, useDataProxy)
    {
        if(!connectionData){
            Logger.error('Missing "connectionData" to generate Prisma Schema.');
            return false;
        }
        let generator = new PrismaSchemaGenerator({
            ...connectionData,
            dataProxy: useDataProxy,
            clientOutputPath: FileHandler.joinPaths(this.projectRoot, 'prisma', 'client'),
            prismaSchemaPath: FileHandler.joinPaths(this.projectRoot, 'prisma')
        });
        let success = await generator.generate();
        if(!success){
            Logger.error('Prisma schema generation failed.');
        }
        return success;
    }

    /**
     * @param {string} projectRoot
     * @returns {Promise<Object|false>} Prisma client instance or false on error
     */
    async createPrismaClient(projectRoot)
    {
        try {
            let clientPath = FileHandler.joinPaths(projectRoot, 'prisma', 'client');
            if(!FileHandler.exists(clientPath)){
                Logger.error('Prisma client path does not exist: '+clientPath);
                return false;
            }
            let prismaClientModule = this.requireClient(clientPath);
            let prismaClient = prismaClientModule.PrismaClient;
            if(!prismaClient){
                Logger.error('PrismaClient not found in module.');
                return false;
            }
            return new prismaClient();
        } catch (error) {
            Logger.error('Failed to create Prisma client: '+error.message);
            return false;
        }
    }

    /**
     * @param {DbConfig} dbConfig
     * @param {Object} templateVariables
     * @param {string} migrationsPath
     * @returns {Promise<boolean>} Returns true if the subprocess installation succeeded, false on error or timeout
     */
    async runSubprocessInstallation(dbConfig, templateVariables, migrationsPath)
    {
        Logger.info('Subprocess Prisma installation - Starting...');
        let workerPath = FileHandler.joinPaths(__dirname, 'prisma-subprocess-worker.js');
        if(!FileHandler.exists(workerPath)){
            Logger.error('Prisma subprocess worker not found: '+workerPath);
            return false;
        }
        let worker = fork(workerPath, [], {
            cwd: this.projectRoot,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            env: {...process.env}
        });
        let message = {
            dbConfig: dbConfig,
            templateVariables: templateVariables,
            migrationsPath: migrationsPath,
            projectRoot: this.projectRoot
        };
        worker.stdout.on('data', (data) => {
            Logger.info('Subprocess: '+data.toString().trim());
        });
        worker.stderr.on('data', (data) => {
            Logger.error('Subprocess error: '+data.toString().trim());
        });
        worker.send(message);
        let subprocessCompleted = false;
        let subprocessSuccess = false;
        let workerExited = false;
        worker.on('message', (message) => {
            subprocessCompleted = true;
            subprocessSuccess = sc.get(message, 'success', false);
            if(!subprocessSuccess){
                Logger.error('Subprocess failed: '+sc.get(message, 'error', 'Unknown'));
            }
        });
        worker.on('error', (error) => {
            subprocessCompleted = true;
            subprocessSuccess = false;
            Logger.error('Subprocess error: '+error.message);
        });
        worker.on('exit', (code, signal) => {
            workerExited = true;
            if(!subprocessCompleted){
                subprocessCompleted = true;
                subprocessSuccess = false;
            }
        });
        let attempts = 0;
        while(!subprocessCompleted && attempts < this.subprocessMaxAttempts){
            attempts++;
            await this.waitMilliseconds(100);
        }
        if(!workerExited){
            worker.kill('SIGTERM');
            await this.waitMilliseconds(1000);
            if(!workerExited){
                worker.kill('SIGKILL');
            }
        }
        Logger.info('Subprocess Prisma installation - Ended.');
        return subprocessSuccess;
    }

    /**
     * @param {number} ms
     * @returns {Promise<void>}
     */
    async waitMilliseconds(ms)
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

module.exports.PrismaInstallation = PrismaInstallation;
