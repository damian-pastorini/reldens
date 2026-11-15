/**
 *
 * Reldens - Test Admin Skills Sample Data Import
 *
 * Tests the admin Skills Import page script (theme/admin/js/skills-sample-data-import.js) with the elements of its
 * template (theme/admin/templates/skills-import.html) stubbed: the set sample data button fills the generator data field
 * of the import form with the sample data, and the check sample button shows the same sample data formatted in the
 * sample modal and opens it.
 *
 */

const { BaseTest } = require('./base-test');
const { AdminBrowserScriptLoader } = require('./fixtures/admin-browser-script-loader');
const { LoginFormStubsBuilder } = require('./fixtures/login-form-stubs-builder');
const { sc } = require('@reldens/utils');

class TestAdminSkillsSampleDataImport extends BaseTest
{

    loadPage()
    {
        let elements = {
            '.skills-import .set-sample-data': LoginFormStubsBuilder.createElement(),
            '.skills-import .generatorData': LoginFormStubsBuilder.createElement(),
            '.skills-import .check-sample-btn': LoginFormStubsBuilder.createElement(),
            '#skills-sample-modal': LoginFormStubsBuilder.createElement({classes: ['modal', 'hidden']}),
            '#skills-sample-modal .sample-data-display': LoginFormStubsBuilder.createElement()
        };
        AdminBrowserScriptLoader.loadClass('skills-sample-data-import.js', 'SkillsSampleDataImport', {
            document: {querySelector: (selector) => sc.get(elements, selector, null)}
        });
        return elements;
    }

    async testTheSampleButtonFillsTheImportForm()
    {
        await this.test('the set sample data button fills the generator data field with the sample data', async () => {
            let elements = this.loadPage();
            this.assert.strictEqual(elements['.skills-import .generatorData'].value, '');
            elements['.skills-import .set-sample-data'].listeners.click();
            this.assert.deepStrictEqual(
                sc.parseJson(elements['.skills-import .generatorData'].value),
                AdminBrowserScriptLoader.loadSkillsSampleData()
            );
        });
    }

    async testTheCheckSampleButtonShowsTheSampleInTheModal()
    {
        await this.test('the check sample button shows the formatted sample data in the opened sample modal', async () => {
            let elements = this.loadPage();
            elements['.skills-import .check-sample-btn'].listeners.click();
            let displayedSample = elements['#skills-sample-modal .sample-data-display'].value;
            this.assert.deepStrictEqual(
                [sc.parseJson(displayedSample), displayedSample.includes('\n'), elements['#skills-sample-modal'].classes],
                [AdminBrowserScriptLoader.loadSkillsSampleData(), true, ['modal']]
            );
        });
    }

}

module.exports.TestAdminSkillsSampleDataImport = TestAdminSkillsSampleDataImport;
