class TilesetKeyboardShortcuts
{
    constructor(app)
    {
        this.app = app;
    }

    bind()
    {
        document.addEventListener('keydown', (e) => {
            if('Delete' !== e.key){
                return;
            }
            let tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
            if('input' === tag || 'textarea' === tag || 'select' === tag){
                return;
            }
            if(null === this.app.selectedElement){
                return;
            }
            if(null === this.app.selectedTileset){
                return;
            }
            this.app.editor.removeElement(this.app.selectedTileset, this.app.selectedElement);
        });
    }
}
