/**
 *
 * Reldens - AdminBrowserScriptLoader
 *
 * Loads a theme admin browser script in an isolated VM context with the given browser globals (window, document,
 * fetch, timers) and returns the class it declares, so the admin page scripts run in the unit tests with stubbed
 * browser objects. It also gives a detached copy of the skills import sample data of the admin skills import page.
 *
 */

const vm = require('node:vm');
const { FileHandler } = require('@reldens/server-utils');
const { sc } = require('@reldens/utils');

class AdminBrowserScriptLoader
{

    static loadClass = (fileName, className, contextValues) => vm.runInContext(
        FileHandler.readFile(FileHandler.joinPaths(process.cwd(), 'theme', 'admin', 'js', fileName))+'\n'+className+';',
        vm.createContext(contextValues)
    );

    static loadSkillsSampleData = () => sc.deepJsonClone(new (AdminBrowserScriptLoader.loadClass(
        'skills-sample-data-import.js',
        'SkillsSampleDataImport',
        {document: {querySelector: () => null}}
    ))().sampleData);

}

module.exports.AdminBrowserScriptLoader = AdminBrowserScriptLoader;
