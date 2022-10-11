const {ErrorManager, sc} = require('@reldens/utils');

class BaseDriver
{

    loadEngine()
    {
        ErrorManager.error(`loadEngine function is not implemented`);
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
        ErrorManager.error(`getScene function is not implemented`);

    }

    addScene(key, sceneConfig, autoStart)
    {
        ErrorManager.error(`addScene function is not implemented`);
    }

    startScene(scene)
    {
        ErrorManager.error('start Function is not implemented');
    }

    stopScene(scene)
    {
        ErrorManager.error('stop Function is not implemented');
    }

    setGameSize()
    {
        ErrorManager.error('setGameSize Function is not implemented');
    }

    getTabKeyCode()
    {
        ErrorManager.error('getTabKeyCode Function is not implemented');
    }

    preLoadTemplate(props)
    {
        ErrorManager.error('')
    }

}

module.exports.BaseDriver = BaseDriver;