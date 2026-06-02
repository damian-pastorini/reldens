class EditorButtonFactory
{
    static create(label, extraClass, handler)
    {
        let button = document.createElement('button');
        button.type = 'button';
        button.className = 'button button-sm '+extraClass;
        button.textContent = label;
        button.addEventListener('click', handler);
        return button;
    }
}

window.EditorButtonFactory = EditorButtonFactory;
