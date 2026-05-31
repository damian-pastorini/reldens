class MapsElementsEditorContextMenu
{
    constructor(editor)
    {
        this.editor = editor;
        this.element = null;
        this.targetInstanceId = null;
    }

    show(instanceId, x, y)
    {
        this.targetInstanceId = instanceId;
        if(!this.element){
            this.element = this.buildMenu();
            document.body.appendChild(this.element);
        }
        this.element.style.left = x+'px';
        this.element.style.top = y+'px';
        this.element.classList.remove('hidden');
    }

    hide()
    {
        if(!this.element){
            return;
        }
        this.element.classList.add('hidden');
        this.targetInstanceId = null;
    }

    isOpen()
    {
        return this.element && !this.element.classList.contains('hidden');
    }

    buildMenu()
    {
        let menu = document.createElement('div');
        menu.className = 'element-context-menu hidden';
        menu.appendChild(this.buildButton('Duplicate', 'button-primary', () => this.onDuplicate()));
        menu.appendChild(this.buildButton('Delete', 'button-danger', () => this.onDelete()));
        return menu;
    }

    buildButton(label, extraClass, handler)
    {
        let button = document.createElement('button');
        button.type = 'button';
        button.className = 'button button-sm '+extraClass;
        button.textContent = label;
        button.addEventListener('click', handler);
        return button;
    }

    onDuplicate()
    {
        let target = this.targetInstanceId;
        this.hide();
        this.editor.requestDuplicate(target);
    }

    onDelete()
    {
        let target = this.targetInstanceId;
        this.hide();
        this.editor.confirmDeleteElement(target);
    }
}
window.MapsElementsEditorContextMenu = MapsElementsEditorContextMenu;
