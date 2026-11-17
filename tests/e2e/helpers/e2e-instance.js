/**
 *
 * Reldens - E2E Instance
 *
 * The isolated e2e run of a checkout: run-tests.js --instance=<name> (lower case letters, numbers and hyphens) sets
 * RELDENS_E2E_INSTANCE for the whole run, so the run uses its own database (the tests/config.json dbName with the
 * instance name appended), its own ports (from the tests/config.json port plus PORT_OFFSET) and writes every output
 * (playwright results, videos, screenshots, logs, game-data.json and server-events.jsonl) in
 * test-results/instances/<name>/ (the --clean-output of the default run keeps that folder). An "instances" entry in tests/config.json overrides any config value of one
 * instance, like {"instances": {"server-3": {"dbName": "reldens_other_tests", "port": 5060}}}. Two runs of the same
 * checkout, one of them with an instance, never reset the database or overwrite the outputs of the other one. Without
 * an instance every path and config value is the one of the default run.
 *
 */

const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class E2eInstance
{

    static INSTANCE_ENV = 'RELDENS_E2E_INSTANCE';
    static NAME_PATTERN = /^[a-z0-9][a-z0-9-]{0,30}$/;
    static DEFAULT_RESULTS_FOLDER = 'test-results';
    static INSTANCES_RESULTS_FOLDER = 'instances';
    static PORT_OFFSET = 20;
    static configPath = FileHandler.joinPaths(process.cwd(), 'tests', 'config.json');
    static instanceName = String(sc.get(process.env, E2eInstance.INSTANCE_ENV, ''));

    static resultsPath(...pathParts)
    {
        return FileHandler.joinPaths(
            process.cwd(),
            ...('' === E2eInstance.instanceName
                ? [E2eInstance.DEFAULT_RESULTS_FOLDER]
                : [E2eInstance.DEFAULT_RESULTS_FOLDER, E2eInstance.INSTANCES_RESULTS_FOLDER, E2eInstance.instanceName]),
            ...pathParts
        );
    }

    static generatedFilePath(fileName)
    {
        return '' === E2eInstance.instanceName
            ? FileHandler.joinPaths(process.cwd(), 'tests', 'e2e', fileName)
            : E2eInstance.resultsPath(fileName);
    }

    static loadConfig()
    {
        if(!FileHandler.exists(E2eInstance.configPath)){
            return null;
        }
        return E2eInstance.applyInstance(FileHandler.fetchFileJson(E2eInstance.configPath));
    }

    static applyInstance(config)
    {
        if(!config || '' === E2eInstance.instanceName){
            return config;
        }
        return Object.assign(
            {},
            config,
            {
                dbName: config.dbName+'_'+E2eInstance.instanceName.replace(/-/g, '_'),
                port: Number(sc.get(config, 'port', 8080))+E2eInstance.PORT_OFFSET
            },
            sc.get(sc.get(config, 'instances', {}), E2eInstance.instanceName, {}),
            {instanceName: E2eInstance.instanceName}
        );
    }

}

module.exports.E2eInstance = E2eInstance;
