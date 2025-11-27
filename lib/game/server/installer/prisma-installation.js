/**
 *
 * Reldens - PrismaInstallation
 *
 */

const { fork } = require('child_process');
const { PrismaSchemaGenerator } = require('@reldens/storage');
const { FileHandler } = require('@reldens/server-utils');
const { Logger, sc } = require('@reldens/utils');

class PrismaInstallation
{

    constructor(props)
    {
        this.projectRoot = sc.get(props, 'projectRoot', './');
        this.reldensModulePath = sc.get(props, 'reldensModulePath', './');
        this.subprocessMaxAttempts = sc.get(props, 'subprocessMaxAttempts', 1800);
        this.prismaClient = sc.get(props, 'prismaClient', false);
    }

    requireClient(clientPath)
    {
        return require(clientPath);
    }

    async executeInstallation(selectedDriver, dbConfig, templateVariables, migrationsPath)
    {
        let subprocessResult = await this.runSubprocessInstallation(dbConfig, templateVariables, migrationsPath);
        if(!subprocessResult){
            return {success: false, error: 'prisma-subprocess-failed'};
        }
        let dbDriver = new selectedDriver(dbConfig);
        return {success: true, dbDriver: dbDriver};
    }

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

    async runSubprocessInstallation(dbConfig, templateVariables, migrationsPath)
    {
        Logger.info('Subprocess Prisma installation - Starting...');
        let workerPath = FileHandler.joinPaths(__dirname, '..', 'prisma-subprocess-worker.js');
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

    async waitMilliseconds(ms)
    {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

}

module.exports.PrismaInstallation = PrismaInstallation;
