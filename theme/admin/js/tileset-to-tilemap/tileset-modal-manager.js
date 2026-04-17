class TilesetModalManager
{
    constructor(app)
    {
        this.app = app;
        this.onConfirmAction = null;
        this.onAlternativeAction = null;
    }

    showGenerate(msg)
    {
        this.app.getElement('.generate-modal-message').textContent = msg;
        this.app.getElement('.generate-modal').classList.remove('hidden');
    }

    hideGenerate()
    {
        this.app.getElement('.generate-modal').classList.add('hidden');
    }

    show(message, onConfirmAction, alternativeAction, okClass)
    {
        this.app.getElement('.confirm-modal-message').textContent = message;
        this.onConfirmAction = onConfirmAction;
        let extraBtn = this.app.getElement('.confirm-modal-extra');
        extraBtn.classList.toggle('hidden', !alternativeAction);
        this.onAlternativeAction = null;
        if(alternativeAction){
            extraBtn.textContent = alternativeAction.label;
            this.onAlternativeAction = alternativeAction.callback;
        }
        let okBtn = this.app.getElement('.confirm-modal-ok');
        okBtn.className = 'button confirm-modal-ok ' + (okClass || 'button-primary');
        this.app.getElement('.confirm-modal').classList.remove('hidden');
    }

    hide()
    {
        this.app.getElement('.confirm-modal').classList.add('hidden');
    }

    bind()
    {
        this.app.getElement('.confirm-modal-ok').addEventListener('click', () => {
            this.hide();
            if(this.onConfirmAction){
                this.onConfirmAction();
            }
        });
        this.app.getElement('.confirm-modal-extra').addEventListener('click', () => {
            this.hide();
            if(this.onAlternativeAction){
                this.onAlternativeAction();
            }
        });
        this.app.getElement('.confirm-modal-cancel').addEventListener('click', () => {
            this.hide();
        });
        this.app.getElement('.confirm-modal-close').addEventListener('click', () => {
            this.hide();
        });
        let confirmBackdrop = document.querySelector('.confirm-modal .modal-backdrop');
        if(confirmBackdrop){
            confirmBackdrop.addEventListener('click', () => {
                this.hide();
            });
        }
        for(let helpButton of document.querySelectorAll('.help-button')){
            helpButton.addEventListener('click', () => {
                this.app.getElement('.help-modal').classList.remove('hidden');
            });
        }
        this.app.getElement('.modal-close-btn').addEventListener('click', () => {
            this.app.getElement('.help-modal').classList.add('hidden');
        });
        this.app.getElement('.help-modal-backdrop').addEventListener('click', () => {
            this.app.getElement('.help-modal').classList.add('hidden');
        });
    }
}
