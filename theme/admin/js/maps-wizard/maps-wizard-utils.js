class MapsWizardUtils
{
    constructor()
    {
        this.extraProperties = {};
    }

    getSelectedOption()
    {
        let selected = document.querySelector('input[name="mapsWizardAction"]:checked');
        if(!selected){
            return '';
        }
        return selected.value;
    }

    processInputValue(input, propertyName, propertyValue)
    {
        if('SELECT' === input.tagName && ('true' === propertyValue || 'false' === propertyValue)){
            return 'true' === propertyValue;
        }
        if('number' === input.type){
            return Number(propertyValue);
        }
        if('TEXTAREA' === input.tagName){
            try{
                return JSON.parse(propertyValue);
            } catch(error){
                input.dataset.parseError = error.message;
                return propertyValue;
            }
        }
        if('collisionLayersForPaths' === propertyName || 'mapNames' === propertyName){
            if('string' === typeof propertyValue && '' !== propertyValue){
                let trimmed = [];
                for(let part of propertyValue.split(',')){
                    trimmed.push(part.trim());
                }
                return trimmed;
            }
            return [];
        }
        return propertyValue;
    }

    setInputValue(input, propertyName, propertyValue)
    {
        if('SELECT' === input.tagName){
            input.value = propertyValue.toString();
            return;
        }
        if('TEXTAREA' === input.tagName){
            input.value = 'object' === typeof propertyValue
                ? JSON.stringify(propertyValue, null, 2)
                : propertyValue;
            return;
        }
        if('number' === input.type){
            input.value = propertyValue;
            return;
        }
        if(Array.isArray(propertyValue) && ('collisionLayersForPaths' === propertyName || 'mapNames' === propertyName)){
            input.value = propertyValue.join(',');
            return;
        }
        input.value = propertyValue;
    }

    setExtraProperties(data, optionType)
    {
        this.extraProperties = {};
        for(let propertyName of Object.keys(data)){
            let commonInput = document.querySelector('.config-input[data-option="common"][data-property="'+propertyName+'"]');
            if(commonInput){
                continue;
            }
            let optionInput = document.querySelector('.config-input[data-option="'+optionType+'"][data-property="'+propertyName+'"]');
            if(optionInput){
                continue;
            }
            this.extraProperties[propertyName] = data[propertyName];
        }
    }

    fillGeneratorDataFromInputs(generatorData, selector)
    {
        let inputs = document.querySelectorAll(selector);
        for(let input of inputs){
            generatorData[input.dataset.property] = this.processInputValue(input, input.dataset.property, input.value);
        }
    }

    buildGeneratorData(optionType)
    {
        let generatorData = Object.assign({}, this.extraProperties);
        this.fillGeneratorDataFromInputs(generatorData, '.config-input[data-option="common"]');
        this.fillGeneratorDataFromInputs(generatorData, '.config-input[data-option="'+optionType+'"]');
        return generatorData;
    }

    updateGeneratorDataFromInputs()
    {
        let optionType = this.getSelectedOption();
        if(!optionType){
            return;
        }
        let generatorDataElement = document.querySelector('#generatorData');
        if(!generatorDataElement){
            return;
        }
        generatorDataElement.value = JSON.stringify(this.buildGeneratorData(optionType), null, 2);
    }

    fillInputsFromData(data, optionType)
    {
        for(let propertyName of Object.keys(data)){
            let propertyValue = data[propertyName];
            let commonInput = document.querySelector('.config-input[data-option="common"][data-property="'+propertyName+'"]');
            if(commonInput){
                this.setInputValue(commonInput, propertyName, propertyValue);
                continue;
            }
            let optionInput = document.querySelector('.config-input[data-option="'+optionType+'"][data-property="'+propertyName+'"]');
            if(optionInput){
                this.setInputValue(optionInput, propertyName, propertyValue);
            }
        }
    }

    updateInputsFromGeneratorData()
    {
        let generatorDataElement = document.querySelector('#generatorData');
        let optionType = this.getSelectedOption();
        if(!generatorDataElement || !optionType){
            return;
        }
        let jsonData;
        try{
            jsonData = JSON.parse(generatorDataElement.value);
        } catch(error){
            let errorContainer = document.querySelector('#generator-data-error');
            if(!errorContainer){
                errorContainer = document.createElement('p');
                errorContainer.id = 'generator-data-error';
                errorContainer.className = 'error-notice';
                generatorDataElement.parentNode.insertBefore(errorContainer, generatorDataElement.nextSibling);
            }
            errorContainer.textContent = 'Generator data parse error: '+error.message;
            return false;
        }
        let clearError = document.querySelector('#generator-data-error');
        if(clearError){
            clearError.textContent = '';
        }
        this.setExtraProperties(jsonData, optionType);
        this.fillInputsFromData(jsonData, optionType);
    }

    openModal(modalId)
    {
        let modal = document.getElementById(modalId);
        if(modal){
            modal.classList.remove('hidden');
        }
    }

    closeModal(modal)
    {
        if(modal){
            modal.classList.add('hidden');
        }
    }
}
window.mapsWizardUtils = new MapsWizardUtils();
