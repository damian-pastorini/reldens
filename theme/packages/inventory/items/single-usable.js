const { ItemUsable } = require('@reldens/items-system');

class SingleUsable extends ItemUsable
{

    constructor(props)
    {
        super(props);
        this.singleInstance = true;
    }

}

module.exports.SingleUsable = SingleUsable;
