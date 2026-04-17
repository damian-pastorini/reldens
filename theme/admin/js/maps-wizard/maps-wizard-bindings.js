let radioInputs = document.querySelectorAll('input[name="mapsWizardAction"]');
for(let radio of radioInputs){
    radio.addEventListener('change', function(){
        updateGeneratorDataFromInputs();
    });
}

let configInputs = document.querySelectorAll('.config-input');
for(let input of configInputs){
    input.addEventListener('change', function(){
        updateGeneratorDataFromInputs();
    });
}

let generatorDataEl = document.querySelector('#generatorData');
if(generatorDataEl){
    generatorDataEl.addEventListener('input', function(){
        updateInputsFromGeneratorData();
    });
}

function toggleClosestActive(element, selector)
{
    let container = element.closest(selector);
    if(container){
        container.classList.toggle('active');
    }
}

let exampleTitles = document.querySelectorAll('.example-container h4');
for(let title of exampleTitles){
    title.addEventListener('click', function(){
        toggleClosestActive(title, '.example-container');
    });
}

let commonTitle = document.querySelector('.common-config-container .clickable');
if(commonTitle){
    commonTitle.addEventListener('click', function(){
        toggleClosestActive(commonTitle, '.common-config-container');
    });
}

let configOpenBtns = document.querySelectorAll('.config-options-open-btn');
for(let btn of configOpenBtns){
    btn.addEventListener('click', function(){
        openModal(btn.dataset.configModal);
        updateGeneratorDataFromInputs();
    });
}

let configCloseBtns = document.querySelectorAll('.config-options-modal .button-close');
for(let btn of configCloseBtns){
    btn.addEventListener('click', function(){
        updateGeneratorDataFromInputs();
    });
}

let configModalBackdrops = document.querySelectorAll('.config-options-modal .modal-backdrop');
for(let backdrop of configModalBackdrops){
    backdrop.addEventListener('click', function(){
        let modal = backdrop.closest('.modal');
        closeModal(modal);
        updateGeneratorDataFromInputs();
    });
}

let infoOpenBtns = document.querySelectorAll('.option-info-btn');
for(let btn of infoOpenBtns){
    btn.addEventListener('click', function(){
        openModal(btn.dataset.infoModal);
    });
}

let infoModalBackdrops = document.querySelectorAll('.option-info-modal .modal-backdrop');
for(let backdrop of infoModalBackdrops){
    backdrop.addEventListener('click', function(){
        let modal = backdrop.closest('.modal');
        closeModal(modal);
    });
}

let pendingSampleDataOption = '';
let confirmModal = document.querySelector('.confirm-modal');
let confirmOkBtn = document.querySelector('.confirm-modal .confirm-modal-ok');
let confirmCancelBtn = document.querySelector('.confirm-modal .confirm-modal-cancel');
let confirmCloseBtn = document.querySelector('.confirm-modal .button-close');
let confirmBackdrop = document.querySelector('.confirm-modal .modal-backdrop');

let sampleDataBtns = document.querySelectorAll('.use-sample-data-btn');
for(let btn of sampleDataBtns){
    btn.addEventListener('click', function(){
        pendingSampleDataOption = btn.dataset.optionValue;
        if(confirmModal){
            confirmModal.classList.remove('hidden');
        }
    });
}

if(confirmOkBtn){
    confirmOkBtn.addEventListener('click', function(){
        closeModal(confirmModal);
        if(!pendingSampleDataOption){
            return;
        }
        let sampleJson = configurationsState[pendingSampleDataOption];
        if(!sampleJson){
            return;
        }
        let sampleData;
        try{
            sampleData = JSON.parse(sampleJson);
        } catch(e){
            return;
        }
        let strategyRadio = document.querySelector('[name="mapsWizardAction"][value="' + pendingSampleDataOption + '"]');
        if(strategyRadio){
            strategyRadio.click();
        }
        fillInputsFromData(sampleData, pendingSampleDataOption);
        updateGeneratorDataFromInputs();
        pendingSampleDataOption = '';
    });
}

if(confirmCancelBtn){
    confirmCancelBtn.addEventListener('click', function(){
        closeModal(confirmModal);
        pendingSampleDataOption = '';
    });
}

if(confirmCloseBtn){
    confirmCloseBtn.addEventListener('click', function(){
        pendingSampleDataOption = '';
    });
}

if(confirmBackdrop){
    confirmBackdrop.addEventListener('click', function(){
        closeModal(confirmModal);
        pendingSampleDataOption = '';
    });
}

let wizardLoadingImg = document.querySelector('.maps-wizard-form .loading');
let generatingOverlay = document.querySelector('.maps-wizard-generating-overlay');
if(wizardLoadingImg && generatingOverlay){
    let observer = new MutationObserver(function(){
        if(!wizardLoadingImg.classList.contains('hidden')){
            generatingOverlay.classList.remove('hidden');
        }
    });
    observer.observe(wizardLoadingImg, {attributes: true, attributeFilter: ['class']});
}

let urlParams = new URLSearchParams(window.location.search);
let prefillSessionId = urlParams.get('tilesetSessionId');
if(prefillSessionId){
    let tilesetSessionIdInput = document.getElementById('tilesetSessionId');
    if(tilesetSessionIdInput){
        tilesetSessionIdInput.value = prefillSessionId;
    }
    let mapsWizardActionPath = document.querySelector('#maps-wizard-form').getAttribute('action');
    let apiBase = mapsWizardActionPath.replace('/maps-wizard', '');
    fetch(apiBase + '/tileset-analyzer/api/session-wizard-config?sessionId=' + encodeURIComponent(prefillSessionId))
        .then(function(r){ return r.json(); })
        .then(function(wizardConfig){
            if(!wizardConfig || !wizardConfig.strategy){
                return;
            }
            let strategyRadio = document.querySelector('[name="mapsWizardAction"][value="' + wizardConfig.strategy + '"]');
            if(strategyRadio){
                strategyRadio.click();
            }
            if(wizardConfig.partialData){
                fillInputsFromData(wizardConfig.partialData, wizardConfig.strategy);
                updateGeneratorDataFromInputs();
            }
        });
}

updateGeneratorDataFromInputs();
