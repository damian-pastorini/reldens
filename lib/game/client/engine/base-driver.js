const {ErrorManager, sc} = require('@reldens/utils');

class BaseDriver
{

    constructor()
    {
        this.driverName = 'Base Driver';
        this.config = {};
    }

    loadEngine()
    {
        ErrorManager.error(this.getMethodErrorMessage('loadEngine'));
    }

    setConfig(props)
    {
        this.config = sc.get(props, 'config', false);
        if (!this.config) {
            ErrorManager.error("Missing config definition");
        }
    }

    getScene(scene)
    {
        ErrorManager.error(this.getMethodErrorMessage('getScene'));
    }

    addScene(key, sceneConfig, autoStart)
    {
        ErrorManager.error(this.getMethodErrorMessage('addScene'));
    }

    startScene(scene)
    {
        ErrorManager.error(this.getMethodErrorMessage('startScene'));
    }

    stopScene(scene)
    {
        ErrorManager.error(this.getMethodErrorMessage('stop'));
    }

    setGameSize()
    {
        ErrorManager.error(this.getMethodErrorMessage('setGameSize'));
    }

    getTabKeyCode()
    {
        ErrorManager.error(this.getMethodErrorMessage('getTabKeyCode'));
    }

    createNewSceneDriver(config)
    {
        ErrorManager.error(this.getMethodErrorMessage('createNewSceneDriver'));
    }

    getMethodErrorMessage(method)
    {
        return 'Method "'+method+'" is not implemented in "'+this.driverName+'"';
    }

}

module.exports.BaseDriver = BaseDriver;