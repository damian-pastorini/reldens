class MapsWizardSaveConfig
{
    constructor()
    {
        this.button = document.querySelector('#saveWizardConfigBtn');
        if(!this.button){
            return;
        }
        this.button.addEventListener('click', () => {
            this.saveWizardConfig();
        });
    }

    showButton()
    {
        if(this.button){
            this.button.classList.remove('hidden');
        }
    }

    collectStrategiesForSave()
    {
        let utils = window.mapsWizardUtils;
        utils.persistCurrentStrategyState();
        let strategies = {};
        let radios = document.querySelectorAll('input[name="mapsWizardAction"]');
        for(let radio of radios){
            let key = radio.value;
            if(utils.strategyStates[key]){
                strategies[key] = utils.strategyStates[key];
                continue;
            }
            strategies[key] = JSON.stringify(utils.buildGeneratorData(key), null, 2);
        }
        return strategies;
    }

    resolveSaveEndpoint()
    {
        let mapsWizardForm = document.querySelector('#maps-wizard-form');
        if(!mapsWizardForm){
            return '';
        }
        return mapsWizardForm.getAttribute('action')+'/api/save-config';
    }

    saveWizardConfig()
    {
        let sessionId = document.getElementById('tilesetSessionId')?.value || '';
        let currentStrategy = window.mapsWizardUtils.getSelectedOption();
        let endpoint = this.resolveSaveEndpoint();
        if(!sessionId || !currentStrategy || !endpoint){
            return;
        }
        fetch(endpoint, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                sessionId,
                currentStrategy,
                strategies: this.collectStrategiesForSave()
            })
        })
            .then((r) => {
                return r.json();
            })
            .then((result) => {
                this.showSaveConfigResult(result);
            })
            .catch((error) => {
                this.showSaveConfigResult({error: error.message});
            });
    }

    showSaveConfigResult(result)
    {
        if(!this.button){
            return;
        }
        let original = this.button.dataset.originalLabel || this.button.textContent;
        this.button.dataset.originalLabel = original;
        this.button.textContent = result && result.success ? 'Configuration saved' : 'Save failed';
        setTimeout(() => {
            this.button.textContent = original;
        }, 2000);
    }
}
window.mapsWizardSaveConfig = new MapsWizardSaveConfig();
