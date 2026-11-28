/**
 *
 * Reldens - Test Snippets Translator
 *
 * Tests the Translator parameters replacement (ISSUE #454): every placeholder of a parameter is replaced in one pass,
 * a value that holds its own placeholder ends with no loop and keeps that text, a value with a replacement pattern
 * ("$&") is inserted literally, a parameter mapped by the snippet namespace data values replaces its mapped
 * placeholder, and a text that is not a snippet key gets its parameters replaced too. A missing or a null value is
 * inserted as its text, never as the default join separator (ISSUE #478).
 *
 */

const { BaseTest } = require('./base-test');
const { Translator } = require('../lib/snippets/translator');
const { SnippetsConst } = require('../lib/snippets/constants');

class TestSnippetsTranslator extends BaseTest
{

    constructor(config)
    {
        super(config);
        this.snippetKey = 'chat.e2eGreeting';
        this.snippetText = 'Hi %playerName, bye %playerName';
    }

    createTranslator()
    {
        return new Translator({
            snippets: {[SnippetsConst.DEFAULT_LOCALE]: {[this.snippetKey]: this.snippetText}},
            dataValues: {chat: {pn: 'playerName'}},
            locale: SnippetsConst.DEFAULT_LOCALE,
            activeLocale: SnippetsConst.DEFAULT_LOCALE
        });
    }

    async testAValueHoldingItsOwnPlaceholderIsInsertedOnce()
    {
        await this.test('a value holding its own placeholder replaces every placeholder once and ends', async () => {
            this.assert.strictEqual(
                this.createTranslator().t(this.snippetKey, {playerName: '%playerName'}),
                'Hi %playerName, bye %playerName'
            );
        });
    }

    async testAReplacementPatternValueIsInsertedLiterally()
    {
        await this.test('a value with replacement patterns is inserted literally', async () => {
            this.assert.strictEqual(this.createTranslator().t(this.snippetKey, {playerName: '$&'}), 'Hi $&, bye $&');
            this.assert.strictEqual(this.createTranslator().t(this.snippetKey, {playerName: "$'$`"}), "Hi $'$`, bye $'$`");
        });
    }

    async testAMappedParamAndAPlainTextAreReplaced()
    {
        await this.test('a parameter mapped by the namespace data values and a plain text get their placeholders replaced', async () => {
            let translator = this.createTranslator();
            this.assert.strictEqual(translator.t(this.snippetKey, {pn: 'Hero'}), 'Hi Hero, bye Hero');
            this.assert.strictEqual(translator.t('Level %level of %level', {level: 3}), 'Level 3 of 3');
        });
    }

    async testAMissingAndANullValueAreInsertedAsText()
    {
        await this.test('a missing and a null parameter value are inserted as their text, never as the join separator', async () => {
            let translator = this.createTranslator();
            let playerData = {};
            let missingValueText = String(playerData.name);
            this.assert.deepStrictEqual(
                [
                    translator.t(this.snippetKey, {playerName: playerData.name}),
                    translator.t(this.snippetKey, {playerName: null})
                ],
                ['Hi '+missingValueText+', bye '+missingValueText, 'Hi null, bye null']
            );
        });
    }

}

module.exports.TestSnippetsTranslator = TestSnippetsTranslator;
