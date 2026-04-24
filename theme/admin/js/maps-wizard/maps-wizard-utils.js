function getSelectedOption()
{
    let selected = document.querySelector('input[name="mapsWizardAction"]:checked');
    if(!selected){
        return '';
    }
    return selected.value;
}

function processInputValue(input, propertyName, propertyValue)
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
        } catch(e){
            return propertyValue;
        }
    }
    if('collisionLayersForPaths' === propertyName || 'mapNames' === propertyName){
        if('string' === typeof propertyValue && '' !== propertyValue){
            let parts = propertyValue.split(',');
            let trimmed = [];
            for(let part of parts){
                trimmed.push(part.trim());
            }
            return trimmed;
        }
        return [];
    }
    return propertyValue;
}

function setInputValue(input, propertyName, propertyValue)
{
    if('SELECT' === input.tagName){
        input.value = propertyValue.toString();
        return;
    }
    if('TEXTAREA' === input.tagName){
        if('object' === typeof propertyValue){
            input.value = JSON.stringify(propertyValue, null, 2);
            return;
        }
        input.value = propertyValue;
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

function buildGeneratorData(optionType)
{
    let generatorData = {};
    let commonInputs = document.querySelectorAll('.config-input[data-option="common"]');
    for(let input of commonInputs){
        generatorData[input.dataset.property] = processInputValue(input, input.dataset.property, input.value);
    }
    let optionInputs = document.querySelectorAll('.config-input[data-option="' + optionType + '"]');
    for(let input of optionInputs){
        generatorData[input.dataset.property] = processInputValue(input, input.dataset.property, input.value);
    }
    return generatorData;
}

function updateGeneratorDataFromInputs()
{
    let optionType = getSelectedOption();
    if(!optionType){
        return;
    }
    let generatorDataElement = document.querySelector('#generatorData');
    if(!generatorDataElement){
        return;
    }
    generatorDataElement.value = JSON.stringify(buildGeneratorData(optionType), null, 2);
}

function fillInputsFromData(data, optionType)
{
    let keys = Object.keys(data);
    for(let propertyName of keys){
        let propertyValue = data[propertyName];
        let commonInput = document.querySelector('.config-input[data-option="common"][data-property="' + propertyName + '"]');
        if(commonInput){
            setInputValue(commonInput, propertyName, propertyValue);
            continue;
        }
        let optionInput = document.querySelector('.config-input[data-option="' + optionType + '"][data-property="' + propertyName + '"]');
        if(optionInput){
            setInputValue(optionInput, propertyName, propertyValue);
        }
    }
}

function updateInputsFromGeneratorData()
{
    let generatorDataElement = document.querySelector('#generatorData');
    let optionType = getSelectedOption();
    if(!generatorDataElement || !optionType){
        return;
    }
    let jsonData;
    try{
        jsonData = JSON.parse(generatorDataElement.value);
    } catch(e){
        return;
    }
    fillInputsFromData(jsonData, optionType);
}

function openModal(modalId)
{
    let modal = document.getElementById(modalId);
    if(modal){
        modal.classList.remove('hidden');
    }
}

function closeModal(modal)
{
    if(modal){
        modal.classList.add('hidden');
    }
}
