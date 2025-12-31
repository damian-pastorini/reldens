/**
 *
 * Reldens - ClassPathKeyFactory
 *
 * Generates standardized keys from class path labels.
 *
 */

class ClassPathKeyFactory
{

    /**
     * @param {string} label
     * @returns {string}
     */
    static fromLabel(label)
    {
        return label.toLowerCase().replace(/ /g, '-').replace('---', '-');
    }

}

module.exports.ClassPathKeyFactory = ClassPathKeyFactory;
