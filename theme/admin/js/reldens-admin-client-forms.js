class AdminClientForms
{
    buildFormConfirmOptions(form)
    {
        let options = {};
        if(form.classList.contains('form-delete')){
            options.title = 'Confirm Delete';
            options.message = 'Are you sure you want to delete?';
            options.confirmText = 'Delete';
            options.confirmClass = 'button-danger';
        }
        let submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
        if(!submitButton){
            return options;
        }
        if(submitButton.dataset.modalConfirmLabel){
            options.confirmText = submitButton.dataset.modalConfirmLabel;
        }
        if(submitButton.dataset.modalConfirmClass){
            options.confirmClass = 'button-' + submitButton.dataset.modalConfirmClass;
        }
        if(submitButton.dataset.modalCancelLabel){
            options.cancelText = submitButton.dataset.modalCancelLabel;
        }
        if(submitButton.dataset.modalCancelClass){
            options.cancelClass = 'button-' + submitButton.dataset.modalCancelClass;
        }
        return options;
    }

    showLoadingImage(loadingImage)
    {
        if(loadingImage){
            loadingImage.classList.remove('hidden');
        }
    }

    showMapsImportDialog()
    {
        let importDialog = document.querySelector('.confirm-dialog');
        if(!importDialog){
            return;
        }
        let titleEl = importDialog.querySelector('.dialog-title');
        let messageEl = importDialog.querySelector('.dialog-message');
        let confirmBtn = importDialog.querySelector('.dialog-confirm');
        let cancelBtn = importDialog.querySelector('.dialog-cancel');
        let closeBtn = importDialog.querySelector('.dialog-close');
        if(titleEl){
            titleEl.textContent = 'Importing...';
        }
        if(messageEl){
            messageEl.textContent = 'Importing maps, please wait...';
        }
        if(confirmBtn){
            confirmBtn.classList.add('hidden');
        }
        if(cancelBtn){
            cancelBtn.classList.add('hidden');
        }
        if(closeBtn){
            closeBtn.classList.add('hidden');
        }
        importDialog.classList.remove('hidden');
    }

    handleFormConfirm(confirmed, form, loadingImage, submitButton)
    {
        if(!confirmed){
            submitButton.disabled = false;
            return;
        }
        if(form.classList.contains('maps-import-form')){
            this.showMapsImportDialog();
        }
        this.showLoadingImage(loadingImage);
        form.submit();
    }

    handleFormSubmit(event, form)
    {
        let submitButton = form.querySelector('input[type="submit"], button[type="submit"]');
        submitButton.disabled = true;
        let loadingImage = form.querySelector('.loading');
        if(!form.classList.contains('form-delete') && !form.classList.contains('confirmation-required')){
            this.showLoadingImage(loadingImage);
            return;
        }
        event.preventDefault();
        adminFunctions.showConfirmDialog(
            (confirmed) => this.handleFormConfirm(confirmed, form, loadingImage, submitButton),
            this.buildFormConfirmOptions(form)
        );
    }

    bindForms()
    {
        let forms = document.querySelectorAll('form');
        if(!forms){
            return;
        }
        for(let form of forms){
            if(form.classList.contains('no-auto-disable')){
                continue;
            }
            form.addEventListener('submit', (event) => this.handleFormSubmit(event, form));
        }
    }

    bindSidebarHeaders()
    {
        let sideBarHeaders = document.querySelectorAll('.with-sub-items .side-bar-item-header');
        if(!sideBarHeaders){
            return;
        }
        for(let header of sideBarHeaders){
            header.addEventListener('click', (event) => {
                event.currentTarget.parentNode.classList.toggle('active');
            });
        }
    }

    bindLogout()
    {
        let logoutLink = document.querySelector('a[href*="/logout"]');
        if(!logoutLink){
            return;
        }
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            let logoutHref = logoutLink.href;
            adminFunctions.showConfirmDialog((confirmed) => {
                if(confirmed){
                    window.location.href = logoutHref;
                }
            }, 'Are you sure you want to log out?');
        });
    }

    bindListSelect()
    {
        let listSelect = document.querySelector('.list-select');
        if(!listSelect){
            return;
        }
        listSelect.addEventListener('click', (event) => {
            let isChecked = 1 === Number(event.currentTarget.dataset.checked);
            let checkboxes = document.querySelectorAll('.ids-checkbox');
            for(let checkbox of checkboxes){
                checkbox.checked = isChecked;
            }
            let selectAllCheckbox = event.currentTarget.querySelector('input[type="checkbox"]');
            if(selectAllCheckbox){
                selectAllCheckbox.checked = isChecked;
            }
            event.currentTarget.dataset.checked = isChecked ? 0 : 1;
        });
    }

    buildDeleteSelectionForm(deleteSelectionForm)
    {
        let checkedBoxes = document.querySelectorAll('.ids-checkbox:checked');
        if(0 === checkedBoxes.length){
            return;
        }
        deleteSelectionForm.innerHTML = '';
        for(let checkbox of checkedBoxes){
            let input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'ids[]';
            input.value = checkbox.value;
            deleteSelectionForm.appendChild(input);
        }
        deleteSelectionForm.submit();
    }

    bindListDelete()
    {
        let listDeleteSelection = document.querySelector('.list-delete-selection');
        let deleteSelectionForm = document.getElementById('delete-selection-form');
        let hiddenInput = document.querySelector('.hidden-ids-input');
        if(!listDeleteSelection || !deleteSelectionForm || !hiddenInput){
            return;
        }
        listDeleteSelection.addEventListener('click', (event) => {
            event.preventDefault();
            if(!document.querySelectorAll('.ids-checkbox:checked').length){
                return;
            }
            adminFunctions.showConfirmDialog(
                (confirmed) => {
                    if(confirmed){
                        this.buildDeleteSelectionForm(deleteSelectionForm);
                    }
                },
                { title: 'Confirm Delete', message: 'Are you sure you want to delete the selected items?', confirmText: 'Delete', confirmClass: 'button-danger' }
            );
        });
    }

    submitCacheClearForm(cacheClearForm)
    {
        let submitButton = cacheClearForm.querySelector('button[type="submit"]');
        if(submitButton){
            submitButton.disabled = true;
        }
        cacheClearForm.submit();
    }

    bindCacheClear()
    {
        let cacheClearAllButton = document.querySelector('.cache-clear-all-button');
        let cacheClearForm = document.querySelector('.cache-clear-form');
        if(!cacheClearAllButton){
            return;
        }
        cacheClearAllButton.addEventListener('click', () => {
            adminFunctions.showConfirmDialog((confirmed) => {
                if(confirmed && cacheClearForm){
                    this.submitCacheClearForm(cacheClearForm);
                }
            });
        });
    }

    bindModalClose()
    {
        document.addEventListener('click', function(event) {
            let closeBtn = event.target.closest('.button-close');
            if(!closeBtn){
                return;
            }
            let modal = closeBtn.closest('.modal');
            if(modal){
                modal.classList.add('hidden');
            }
        });
    }

    bind()
    {
        this.bindForms();
        this.bindSidebarHeaders();
        this.bindLogout();
        this.bindListSelect();
        this.bindListDelete();
        this.bindCacheClear();
        this.bindModalClose();
    }
}
window.AdminClientForms = AdminClientForms;
