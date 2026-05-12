class MapsWizardBindings
{
    constructor()
    {
        this.pendingSampleDataOption = '';
        this.pendingParseError = '';
        this.bind();
    }

    bind()
    {
        this.bindInputChangeListeners();
        this.bindGeneratorData();
        this.bindExampleTitles();
        this.bindCommonTitle();
        this.bindConfigModals();
        this.bindInfoModals();
        this.bindSampleData();
        this.bindConfirmModal();
        this.bindFormSubmit();
        this.prefillFromUrlParams();
        window.mapsWizardUtils.updateGeneratorDataFromInputs();
        window.addEventListener('pageshow', () => {
            let overlay = document.querySelector('.maps-wizard-generating-overlay');
            if(overlay){
                overlay.classList.add('hidden');
            }
        });
    }

    bindInputChangeListeners()
    {
        let inputs = document.querySelectorAll('input[name="mapsWizardAction"], .config-input');
        for(let input of inputs){
            input.addEventListener('change', () => {
                window.mapsWizardUtils.updateGeneratorDataFromInputs();
            });
        }
    }

    bindGeneratorData()
    {
        let generatorDataEl = document.querySelector('#generatorData');
        if(!generatorDataEl){
            return;
        }
        generatorDataEl.addEventListener('input', () => {
            window.mapsWizardUtils.updateInputsFromGeneratorData();
        });
    }

    toggleClosestActive(element, selector)
    {
        let container = element.closest(selector);
        if(container){
            container.classList.toggle('active');
        }
    }

    bindExampleTitles()
    {
        let exampleTitles = document.querySelectorAll('.example-container h4');
        for(let title of exampleTitles){
            title.addEventListener('click', () => {
                this.toggleClosestActive(title, '.example-container');
            });
        }
    }

    bindCommonTitle()
    {
        let commonTitle = document.querySelector('.common-config-container .clickable');
        if(!commonTitle){
            return;
        }
        commonTitle.addEventListener('click', () => {
            this.toggleClosestActive(commonTitle, '.common-config-container');
        });
    }

    bindConfigModals()
    {
        let configOpenBtns = document.querySelectorAll('.config-options-open-btn');
        for(let openBtn of configOpenBtns){
            openBtn.addEventListener('click', () => {
                window.mapsWizardUtils.openModal(openBtn.dataset.configModal);
                window.mapsWizardUtils.updateGeneratorDataFromInputs();
            });
        }
        let configCloseBtns = document.querySelectorAll('.config-options-modal .button-close');
        for(let closeBtn of configCloseBtns){
            closeBtn.addEventListener('click', () => {
                window.mapsWizardUtils.updateGeneratorDataFromInputs();
            });
        }
        let configModalBackdrops = document.querySelectorAll('.config-options-modal .modal-backdrop');
        for(let backdrop of configModalBackdrops){
            backdrop.addEventListener('click', () => {
                let modal = backdrop.closest('.modal');
                window.mapsWizardUtils.closeModal(modal);
                window.mapsWizardUtils.updateGeneratorDataFromInputs();
            });
        }
    }

    bindInfoModals()
    {
        let infoOpenBtns = document.querySelectorAll('.option-info-btn');
        for(let infoBtn of infoOpenBtns){
            infoBtn.addEventListener('click', () => {
                window.mapsWizardUtils.openModal(infoBtn.dataset.infoModal);
            });
        }
        let infoModalBackdrops = document.querySelectorAll('.option-info-modal .modal-backdrop');
        for(let backdrop of infoModalBackdrops){
            backdrop.addEventListener('click', () => {
                let modal = backdrop.closest('.modal');
                window.mapsWizardUtils.closeModal(modal);
            });
        }
    }

    bindSampleData()
    {
        let sampleDataBtns = document.querySelectorAll('.use-sample-data-btn');
        let confirmModal = document.querySelector('.confirm-modal');
        for(let sampleBtn of sampleDataBtns){
            sampleBtn.addEventListener('click', () => {
                this.pendingSampleDataOption = sampleBtn.dataset.optionValue;
                if(confirmModal){
                    confirmModal.classList.remove('hidden');
                }
            });
        }
    }

    bindConfirmModal()
    {
        let confirmModal = document.querySelector('.confirm-modal');
        let confirmOkBtn = document.querySelector('.confirm-modal .confirm-modal-ok');
        let confirmCancelBtn = document.querySelector('.confirm-modal .confirm-modal-cancel');
        let confirmCloseBtn = document.querySelector('.confirm-modal .button-close');
        let confirmBackdrop = document.querySelector('.confirm-modal .modal-backdrop');
        if(confirmOkBtn){
            confirmOkBtn.addEventListener('click', () => {
                this.handleConfirmOk(confirmModal);
            });
        }
        if(confirmCancelBtn){
            confirmCancelBtn.addEventListener('click', () => {
                window.mapsWizardUtils.closeModal(confirmModal);
                this.pendingSampleDataOption = '';
            });
        }
        if(confirmCloseBtn){
            confirmCloseBtn.addEventListener('click', () => {
                this.pendingSampleDataOption = '';
            });
        }
        if(confirmBackdrop){
            confirmBackdrop.addEventListener('click', () => {
                window.mapsWizardUtils.closeModal(confirmModal);
                this.pendingSampleDataOption = '';
            });
        }
    }

    handleConfirmOk(confirmModal)
    {
        window.mapsWizardUtils.closeModal(confirmModal);
        if(!this.pendingSampleDataOption){
            return;
        }
        let sampleJson = configurationsState[this.pendingSampleDataOption];
        if(!sampleJson){
            return;
        }
        let sampleData;
        try{
            sampleData = JSON.parse(sampleJson);
        } catch(error){
            this.pendingSampleDataOption = '';
            this.pendingParseError = error.message;
            return false;
        }
        let strategyRadio = document.querySelector('[name="mapsWizardAction"][value="'+this.pendingSampleDataOption+'"]');
        if(strategyRadio){
            strategyRadio.click();
        }
        window.mapsWizardUtils.fillInputsFromData(sampleData, this.pendingSampleDataOption);
        window.mapsWizardUtils.updateGeneratorDataFromInputs();
        this.pendingSampleDataOption = '';
    }

    showGeneratingOverlay()
    {
        let overlay = document.querySelector('.maps-wizard-generating-overlay');
        if(overlay){
            overlay.classList.remove('hidden');
        }
    }

    bindFormSubmit()
    {
        let mapsWizardForm = document.querySelector('#maps-wizard-form');
        if(mapsWizardForm){
            mapsWizardForm.addEventListener('submit', () => {
                this.showGeneratingOverlay();
            });
        }
        let mapsImportForm = document.querySelector('.maps-import-form');
        if(mapsImportForm){
            let originalSubmit = mapsImportForm.submit.bind(mapsImportForm);
            mapsImportForm.submit = () => {
                this.showGeneratingOverlay();
                originalSubmit();
            };
        }
    }

    prefillFromUrlParams()
    {
        let urlParams = new URLSearchParams(window.location.search);
        let prefillSessionId = urlParams.get('tilesetSessionId');
        if(!prefillSessionId){
            return;
        }
        let tilesetSessionIdInput = document.getElementById('tilesetSessionId');
        if(tilesetSessionIdInput){
            tilesetSessionIdInput.value = prefillSessionId;
        }
        let mapsWizardForm = document.querySelector('#maps-wizard-form');
        if(!mapsWizardForm){
            return;
        }
        let apiBase = mapsWizardForm.getAttribute('action').replace('/maps-wizard', '');
        fetch(apiBase+'/tileset-analyzer/api/session-wizard-config?sessionId='+encodeURIComponent(prefillSessionId))
            .then((r) => {
                return r.json();
            })
            .then((wizardConfig) => {
                if(!wizardConfig || !wizardConfig.strategy){
                    return;
                }
                let strategyRadio = document.querySelector('[name="mapsWizardAction"][value="'+wizardConfig.strategy+'"]');
                if(strategyRadio){
                    strategyRadio.click();
                }
                if(wizardConfig.partialData){
                    window.mapsWizardUtils.setExtraProperties(wizardConfig.partialData, wizardConfig.strategy);
                    window.mapsWizardUtils.fillInputsFromData(wizardConfig.partialData, wizardConfig.strategy);
                    window.mapsWizardUtils.updateGeneratorDataFromInputs();
                }
            });
    }
}
new MapsWizardBindings();
