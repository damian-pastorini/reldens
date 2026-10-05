/**
 *
 * Reldens - ServerPathResolver
 *
 * Resolves the tests/config.json serverPath, a relative path (like the default "../app") is resolved from the folder
 * the tests run in.
 *
 */

const { FileHandler } = require('@reldens/server-utils');

class ServerPathResolver
{

    /**
     * @param {string} serverPath
     * @returns {string}
     */
    static resolve(serverPath)
    {
        if(!serverPath || FileHandler.isAbsolutePath(serverPath)){
            return serverPath;
        }
        return FileHandler.joinPaths(process.cwd(), serverPath);
    }

}

module.exports.ServerPathResolver = ServerPathResolver;
