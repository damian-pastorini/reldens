class AdminClientTheme
{
    constructor(forms)
    {
        this.forms = forms;
        this.commandDescriptions = {};
    }

    bindThemeCommandButton(button, themeSelector)
    {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            if(!themeSelector || !themeSelector.value){
                return;
            }
            let commandName = button.dataset.command;
            if(!commandName){
                return;
            }
            let form = button.closest('form');
            if(!form){
                return;
            }
            let formThemeInput = form.querySelector('input[name="selected-theme"]');
            let formCommandInput = form.querySelector('input[name="command"]');
            if(!formThemeInput || !formCommandInput){
                return;
            }
            formThemeInput.value = themeSelector.value;
            formCommandInput.value = commandName;
            let commandItem = button.closest('.command-item');
            let loadingImage = commandItem ? commandItem.querySelector('.command-loading') : null;
            adminFunctions.showConfirmDialog(
                (confirmed) => {
                    if(confirmed){
                        this.forms.showLoadingImage(loadingImage);
                        form.submit();
                    }
                },
                { title: 'Execute Theme Command', message: 'Are you sure you want to execute this command?', confirmText: 'Execute', confirmClass: 'button-primary' }
            );
        });
    }

    bindThemeManager()
    {
        let themeSelector = document.querySelector('#selected-theme');
        let executeCommandButtons = document.querySelectorAll('.execute-command');
        let commandDescriptionsData = document.querySelector('#command-descriptions-data');
        if(commandDescriptionsData){
            try {
                this.commandDescriptions = JSON.parse(commandDescriptionsData.textContent);
            } catch(error){
                this.commandDescriptions = {};
                commandDescriptionsData.dataset.parseError = error.message;
            }
        }
        if(!executeCommandButtons){
            return;
        }
        for(let button of executeCommandButtons){
            this.bindThemeCommandButton(button, themeSelector);
        }
    }

    bindCommandTooltips()
    {
        let commandTooltips = document.querySelectorAll('.command-item .tooltip-text[data-command]');
        for(let tooltip of commandTooltips){
            let commandName = tooltip.dataset.command;
            let commandInfo = this.commandDescriptions?.[commandName];
            if(!commandInfo){
                continue;
            }
            let descriptionElement = tooltip.querySelector('.tooltip-description');
            let detailsElement = tooltip.querySelector('.tooltip-details');
            if(descriptionElement){
                descriptionElement.textContent = commandInfo.description || '';
            }
            if(detailsElement){
                detailsElement.textContent = commandInfo.details || '';
            }
        }
    }

    bind()
    {
        this.bindThemeManager();
        this.bindCommandTooltips();
    }
}
window.AdminClientTheme = AdminClientTheme;
