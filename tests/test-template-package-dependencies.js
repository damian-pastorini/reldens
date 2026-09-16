/**
 *
 * Reldens - Test Template Package Dependencies
 *
 */

const { BaseTest } = require('./base-test');
const { TemplatePackageDependencies } = require('../lib/game/server/installer/template-package-dependencies');

class TestTemplatePackageDependencies extends BaseTest
{

    createTemplateData()
    {
        return {
            name: 'reldens-new-project',
            dependencies: {reldens: ''},
            devDependencies: {'@reldens/utils': '', '@colyseus/loadtest': '', 'unknown-package': '1.0.0'}
        };
    }

    createReldensPackageData()
    {
        return {
            name: 'reldens',
            version: '4.0.0-beta.40',
            dependencies: {'@reldens/utils': '^0.59.0'},
            devDependencies: {'@colyseus/loadtest': '0.18.3'}
        };
    }

    async testResolveTakesTheVersionsFromTheReldensPackage()
    {
        await this.test('resolve fills the template versions from the Reldens package.json', async () => {
            let resolved = TemplatePackageDependencies.resolve(
                this.createTemplateData(),
                this.createReldensPackageData()
            );
            this.assert.strictEqual(resolved.dependencies.reldens, '^4.0.0-beta.40');
            this.assert.strictEqual(resolved.devDependencies['@reldens/utils'], '^0.59.0');
            this.assert.strictEqual(resolved.devDependencies['@colyseus/loadtest'], '0.18.3');
        });
    }

    async testResolveKeepsTheTemplateVersionForUnknownPackages()
    {
        await this.test('resolve keeps the template version when the Reldens package does not list it', async () => {
            let resolved = TemplatePackageDependencies.resolve(
                this.createTemplateData(),
                this.createReldensPackageData()
            );
            this.assert.strictEqual(resolved.devDependencies['unknown-package'], '1.0.0');
        });
    }

    async testResolveReturnsTheTemplateWithoutReldensPackageData()
    {
        await this.test('resolve returns the template untouched when the Reldens package data is missing', async () => {
            let templateData = this.createTemplateData();
            let resolved = TemplatePackageDependencies.resolve(templateData, false);
            this.assert.strictEqual(resolved, templateData);
            this.assert.strictEqual(resolved.dependencies.reldens, '');
        });
    }

}

module.exports.TestTemplatePackageDependencies = TestTemplatePackageDependencies;
