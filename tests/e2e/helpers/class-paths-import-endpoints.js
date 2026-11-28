/**
 *
 * Reldens - Class Paths Import Endpoints
 *
 * Server side e2e endpoint that imports class paths (each with its own levels set, the experience per level and the
 * level labels) and the attributes per level of the player class paths with the same importers the reldens-import
 * class-paths and attributes-per-level commands run, on the database of the running server. Like the commands, the
 * import only writes the stored rows: the spec reloads the stored skills like a restart (/api/e2e/data/reload-skills)
 * and preserves the written tables, so the group reset removes the imported rows.
 *
 */

const { ClassPathsImporter } = require('../../../lib/import/server/class-paths-importer');
const { AttributesPerLevelImporter } = require('../../../lib/import/server/attributes-per-level-importer');
const { sc } = require('@reldens/utils');

class ClassPathsImportEndpoints
{

    static registerEndpoints(serverManager)
    {
        serverManager.app.post('/api/e2e/data/import-class-paths', async (request, response) => {
            response.json({
                classPathsImported: await new ClassPathsImporter(serverManager).import(
                    sc.get(request.body, 'classPaths', false)
                ),
                attributesImported: await new AttributesPerLevelImporter(serverManager).import(
                    sc.get(request.body, 'attributes', false)
                )
            });
        });
    }

}

module.exports.ClassPathsImportEndpoints = ClassPathsImportEndpoints;
