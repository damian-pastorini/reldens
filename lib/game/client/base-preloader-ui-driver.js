const {ErrorManager} = require('@reldens/utils');

class BasePreloaderUiDriver
{
    constructor(config)
    {
        this.driverName = 'Base Preloader Ui Driver';
    }

    createUi()
    {
        ErrorManager.error(this.getMethodErrorMessage('createUi'));
    }

    onFileProgress()
    {
        ErrorManager.error(this.getMethodErrorMessage('onFileProgress'));
    }

    onLoadProgress()
    {
        ErrorManager.error(this.getMethodErrorMessage('onLoadProgress'));
    }

    onLoadComplete()
    {
        ErrorManager.error(this.getMethodErrorMessage('onLoadComplete'));
    }

    getMethodErrorMessage(method)
    {
        return 'Method "'+method+'" is not implemented in "'+this.driverName+'"';
    }
}

module.exports.BasePreloaderUiDriver = BasePreloaderUiDriver;