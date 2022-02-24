const { Logger } = require('@reldens/utils');

class GameCustomClasses
{

    static definitionErrorLog()
    {
        Logger.error('\nMissing customClasses definition!'
            +'\nYou can pass an empty object to avoid this or copy into your theme the default file from:'
            +'\nnode_modules/reldens/theme/packages/server.js'
            +'\nNormally a default copy is been made automatically on the first time you run the project.'
            +'\nThen you need to require the module and pass it as property in your ServerManager initialization.'
            +'\nFor reference check the theme/index.js.dist file, you probably just need to uncomment'
            +' the customClasses related lines.\n');
    }

}

module.exports.GameCustomClasses = GameCustomClasses;
