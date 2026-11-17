/**
 *
 * Reldens - Test Sample Data Spanish Snippets
 *
 */

const { BaseTest } = require('./base-test');
const ActionsTranslations = require('../lib/actions/client/snippets/en_US');
const InventoryTranslations = require('../lib/inventory/client/snippets/en_US');
const UsersTranslations = require('../lib/users/client/snippets/en_US');
const { FileHandler } = require('@reldens/server-utils');

class TestSampleDataSpanishSnippets extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.spanishLocaleId = 2;
        this.sampleDataPaths = [
            FileHandler.joinPaths(process.cwd(), 'migrations', 'production', 'reldens-sample-data-v4.0.0.sql'),
            FileHandler.joinPaths(process.cwd(), 'migrations', 'development', 'reldens-test-sample-data-v4.0.0.sql')
        ];
        this.englishSnippets = Object.assign(
            this.flattenSnippets('actions.death.', ActionsTranslations.actions.death),
            this.flattenSnippets('items.growth.', InventoryTranslations.items.growth),
            {'users.skinAdFailed': UsersTranslations.users.skinAdFailed}
        );
    }

    flattenSnippets(prefix, snippets)
    {
        let flattenedSnippets = {};
        for(let snippetKey of Object.keys(snippets)){
            flattenedSnippets[prefix+snippetKey] = snippets[snippetKey];
        }
        return flattenedSnippets;
    }

    loadSpanishSnippets(sampleDataPath)
    {
        let sampleData = FileHandler.readFile(sampleDataPath);
        let snippetsStart = sampleData.indexOf('REPLACE INTO `snippets`');
        let snippetsRows = sampleData.substring(snippetsStart, sampleData.indexOf(');', snippetsStart) + 2);
        let rowPattern = new RegExp('\\((\\d+), '+this.spanishLocaleId+', \'([^\']+)\', \'((?:[^\']|\'\')*)\'\\)', 'g');
        let spanishSnippets = {};
        for(let rowMatch of snippetsRows.matchAll(rowPattern)){
            spanishSnippets[rowMatch[2]] = {id: Number(rowMatch[1]), value: rowMatch[3]};
        }
        return {sampleData, spanishSnippets};
    }

    assertSpanishTranslations(spanishSnippets)
    {
        for(let snippetKey of Object.keys(this.englishSnippets)){
            let spanishValue = spanishSnippets[snippetKey].value;
            let englishValue = this.englishSnippets[snippetKey];
            this.assert.notStrictEqual(spanishValue, englishValue);
            this.assert.deepStrictEqual(
                (spanishValue.match(/%[a-zA-Z]+/g) || []).sort(),
                (englishValue.match(/%[a-zA-Z]+/g) || []).sort()
            );
        }
    }

    async testBothSampleDataFilesHaveTheSameSpanishLocale()
    {
        await this.test('both sample data files enable the same Spanish locale', async () => {
            for(let sampleDataPath of this.sampleDataPaths){
                let sampleData = this.loadSpanishSnippets(sampleDataPath).sampleData;
                this.assert.ok(sampleData.includes('('+this.spanishLocaleId+', \'es_ES\', \'es\', \'ES\', 1)'));
            }
        });
    }

    async testEveryEnglishSnippetHasItsSpanishTranslation()
    {
        await this.test('every translated English snippet has a Spanish row with the same placeholders', async () => {
            let loadedFiles = this.sampleDataPaths.map(sampleDataPath => this.loadSpanishSnippets(sampleDataPath));
            for(let loadedFile of loadedFiles){
                this.assert.deepStrictEqual(
                    Object.keys(loadedFile.spanishSnippets).sort(),
                    Object.keys(this.englishSnippets).sort()
                );
                this.assertSpanishTranslations(loadedFile.spanishSnippets);
            }
            this.assert.deepStrictEqual([...loadedFiles].shift().spanishSnippets, loadedFiles.pop().spanishSnippets);
        });
    }

}

module.exports.TestSampleDataSpanishSnippets = TestSampleDataSpanishSnippets;
