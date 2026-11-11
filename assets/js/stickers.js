(() => {
    const root = document.documentElement;
    const journal = document.querySelector('.journal');
    const toggle = document.querySelector('.sticker-toggle');
    const sheet = document.getElementById('sticker-sheet');
    const status = document.querySelector('.mode-status');
    if (!journal || !toggle || !sheet) return;

    const STICKERS = [
        { id: 'gold-star', shape: 'star', foil: 'gold', label: 'Gold star' },
        { id: 'holo-heart', shape: 'heart', foil: 'holo', label: 'Holographic heart' },
        { id: 'silver-bolt', shape: 'bolt', foil: 'silver', label: 'Silver lightning bolt' },
        { id: 'rose-sparkle', shape: 'sparkle', foil: 'rose', label: 'Rose gold sparkle' },
        { id: 'lime-flower', shape: 'flower', foil: 'lime', label: 'Lime foil flower' },
        { id: 'silver-moon', shape: 'moon', foil: 'silver', label: 'Silver moon' },
        { id: 'holo-star', shape: 'star', foil: 'holo', label: 'Holographic star' },
        { id: 'gold-heart', shape: 'heart', foil: 'gold', label: 'Gold heart' }
    ];
    const byId = Object.fromEntries(STICKERS.map(sticker => [sticker.id, sticker]));
    const KEY = 'ems-stickers';
    const MAX_PER_PAGE = 30;
    let canSave = true;
    let saved = {};
    try {
        saved = JSON.parse(localStorage.getItem(KEY)) || {};
    } catch {
        saved = {};
    }

    const art = sticker => `<svg viewBox="0 0 100 100" aria-hidden="true" focusable="false"><use href="#shape-${sticker.shape}" fill="url(#foil-${sticker.foil})"/><use href="#shape-${sticker.shape}" fill="url(#foil-glare)"/></svg>`;
    const clamp = (value, min = 0.02, max = 0.98) => Math.min(max, Math.max(min, value));
    const announce = message => { status.textContent = ''; requestAnimationFrame(() => { status.textContent = message; }); };

    const layer = document.createElement('div');
    layer.className = 'sticker-layer';
    layer.setAttribute('role', 'group');
    layer.setAttribute('aria-label', 'Your stickers');
    journal.append(layer);

    function pageKey() {
        const visible = document.querySelector('[data-journal-page]:not([hidden])');
        return location.pathname + (visible ? `#${visible.id}` : '');
    }
    const current = () => (saved[pageKey()] ||= []);

    function persist() {
        if (!canSave) return;
        try {
            localStorage.setItem(KEY, JSON.stringify(saved));
        } catch {
            canSave = false;
            announce('Your browser cannot save stickers. They stay put until you leave this page.');
        }
    }

    function place(element, data) {
        element.style.left = `${data.x * 100}%`;
        element.style.top = `${data.y * 100}%`;
        element.style.setProperty('--r', `${data.r}deg`);
    }

    function makeSticker(data) {
        const sticker = byId[data.type];
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'placed-sticker';
        button.dataset.sticker = data.type;
        button.setAttribute('aria-label', `${sticker.label} sticker`);
        button.setAttribute('aria-describedby', 'sticker-help');
        button.innerHTML = art(sticker);
        place(button, data);

        button.addEventListener('keydown', event => {
            const step = event.shiftKey ? 0.05 : 0.01;
            const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
            if (moves[event.key]) {
                data.x = clamp(data.x + moves[event.key][0]);
                data.y = clamp(data.y + moves[event.key][1]);
            } else if (event.key.toLowerCase() === 'r') {
                data.r = (data.r + (event.shiftKey ? -15 : 15)) % 360;
            } else if (event.key === 'Delete' || event.key === 'Backspace') {
                peel(data, button);
            } else {
                return;
            }
            event.preventDefault();
            if (button.isConnected) { place(button, data); persist(); }
        });

        button.addEventListener('pointerdown', event => {
            if (event.button !== 0) return;
            const rect = layer.getBoundingClientRect();
            const offsetX = event.clientX - (rect.left + data.x * rect.width);
            const offsetY = event.clientY - (rect.top + data.y * rect.height);
            button.setPointerCapture(event.pointerId);
            button.classList.add('is-dragging');
            const move = moveEvent => {
                const box = layer.getBoundingClientRect();
                data.x = clamp((moveEvent.clientX - offsetX - box.left) / box.width);
                data.y = clamp((moveEvent.clientY - offsetY - box.top) / box.height);
                place(button, data);
            };
            const stop = () => {
                button.classList.remove('is-dragging');
                button.removeEventListener('pointermove', move);
                persist();
            };
            button.addEventListener('pointermove', move);
            button.addEventListener('pointerup', stop, { once: true });
            button.addEventListener('pointercancel', stop, { once: true });
        });
        return button;
    }

    function peel(data, button) {
        const list = current();
        const index = list.indexOf(data);
        list.splice(index, 1);
        const next = button.nextElementSibling || button.previousElementSibling;
        button.remove();
        persist();
        (next || toggle).focus();
        announce(`${byId[data.type].label} peeled off.`);
    }

    function render() {
        layer.replaceChildren(...current().filter(data => byId[data.type]).map(makeSticker));
    }

    function add(type, point) {
        const list = current();
        if (list.length >= MAX_PER_PAGE) {
            announce(`This page is full. Peel a sticker off to make room for more.`);
            return;
        }
        const rect = layer.getBoundingClientRect();
        const visibleMiddle = (Math.min(innerHeight, rect.bottom) + Math.max(0, rect.top)) / 2;
        const data = {
            type,
            x: clamp(point ? (point.x - rect.left) / rect.width : 0.5 + (Math.random() - 0.5) * 0.3),
            y: clamp(point ? (point.y - rect.top) / rect.height : (visibleMiddle - rect.top) / rect.height + (Math.random() - 0.5) * 0.05),
            r: Math.round((Math.random() - 0.5) * 30)
        };
        list.push(data);
        persist();
        const button = makeSticker(data);
        button.classList.add('is-new');
        layer.append(button);
        button.focus({ preventScroll: true });
        announce(`${byId[type].label} stuck on. Drag it, or use the arrow keys to move it.`);
    }

    function dragFromSheet(event, button, sticker) {
        if (event.button !== 0) return;
        const start = { x: event.clientX, y: event.clientY };
        let ghost = null;
        button.setPointerCapture(event.pointerId);

        const move = moveEvent => {
            if (!ghost) {
                if (Math.hypot(moveEvent.clientX - start.x, moveEvent.clientY - start.y) < 6) return;
                ghost = document.createElement('div');
                ghost.className = 'sticker-ghost';
                ghost.setAttribute('aria-hidden', 'true');
                ghost.innerHTML = art(sticker);
                document.body.append(ghost);
                button.classList.add('is-peeled');
            }
            ghost.style.left = `${moveEvent.clientX}px`;
            ghost.style.top = `${moveEvent.clientY}px`;
        };
        const stop = stopEvent => {
            button.removeEventListener('pointermove', move);
            button.removeEventListener('pointerup', stop);
            button.removeEventListener('pointercancel', stop);
            if (!ghost) return;
            ghost.remove();
            button.classList.remove('is-peeled');
            button.dataset.dragged = 'true';
            setTimeout(() => delete button.dataset.dragged, 0);
            const rect = layer.getBoundingClientRect();
            const point = { x: stopEvent.clientX, y: stopEvent.clientY };
            const over = document.elementFromPoint(point.x, point.y);
            const onJournal = stopEvent.type === 'pointerup' && point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom && !sheet.contains(over);
            if (onJournal) add(sticker.id, point);
            else announce('Drop stickers on the journal to stick them.');
        };
        button.addEventListener('pointermove', move);
        button.addEventListener('pointerup', stop);
        button.addEventListener('pointercancel', stop);
    }

    const choices = sheet.querySelector('.sticker-choices');
    STICKERS.forEach(sticker => {
        const item = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'sticker-choice';
        button.innerHTML = `${art(sticker)}<span class="sr-only">Add ${sticker.label.toLowerCase()}</span>`;
        button.addEventListener('click', event => {
            if (button.dataset.dragged) { delete button.dataset.dragged; event.preventDefault(); return; }
            add(sticker.id);
        });
        button.addEventListener('pointerdown', event => dragFromSheet(event, button, sticker));
        item.append(button);
        choices.append(item);
    });

    function setOpen(open, { returnFocus = false } = {}) {
        sheet.hidden = !open;
        toggle.setAttribute('aria-expanded', String(open));
        if (open) sheet.querySelector('.sticker-choice').focus();
        else if (returnFocus) toggle.focus();
    }

    toggle.hidden = false;
    toggle.addEventListener('click', () => setOpen(sheet.hidden));
    sheet.querySelector('.sticker-close').addEventListener('click', () => setOpen(false, { returnFocus: true }));
    sheet.addEventListener('keydown', event => {
        if (event.key === 'Escape') setOpen(false, { returnFocus: true });
    });
    sheet.querySelector('.sticker-clear').addEventListener('click', () => {
        saved[pageKey()] = [];
        persist();
        render();
        announce('Every sticker on this page peeled off.');
    });

    new MutationObserver(() => {
        if (root.dataset.mode === 'plain') setOpen(false);
        render();
    }).observe(root, { attributes: true, attributeFilter: ['data-mode'] });
    window.addEventListener('hashchange', render);
    render();
})();
