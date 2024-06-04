/**
 *
 * Reldens - ClassPathKeyFactory
 *
 */

class ClassPathKeyFactory
{

    static fromLabel(label)
    {
        return label.toLowerCase().replace(/ /g, '-').replace('---', '-');
    }

}

module.exports.ClassPathKeyFactory = ClassPathKeyFactory;
