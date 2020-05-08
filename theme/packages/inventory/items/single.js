const { ItemBase } = require('@reldens/items-system');

class Single extends ItemBase
{

    constructor(props)
    {
        super(props);
        this.singleInstance = true;
    }

}

module.exports.Single = Single;
