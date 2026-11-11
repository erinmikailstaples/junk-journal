(() => {
    const root = document.documentElement;
    const toggle = document.querySelector('.mode-toggle');
    const status = document.querySelector('.mode-status');
    const pages = Array.from(document.querySelectorAll('[data-journal-page]'));
    const tabs = Array.from(document.querySelectorAll('[data-section]'));
    const note = document.querySelector('.secret-note');

    if (note) {
        let openedByHover = false;
        note.addEventListener('pointerenter', event => {
            if (event.pointerType === 'mouse' && root.dataset.mode !== 'plain' && !note.open) {
                note.open = true;
                openedByHover = true;
            }
        });
        note.addEventListener('pointerleave', event => {
            if (event.pointerType === 'mouse' && openedByHover) {
                note.open = false;
                openedByHover = false;
            }
        });
        note.querySelector('summary').addEventListener('click', event => {
            if (openedByHover) {
                event.preventDefault();
                openedByHover = false;
            }
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && note.open && (openedByHover || note.contains(document.activeElement))) {
                note.open = false;
                openedByHover = false;
            }
        });
    }

    function showPage({ focus = false } = {}) {
        const id = location.hash.slice(1) || 'home';
        const target = pages.find(page => page.id === id);
        const plain = root.dataset.mode === 'plain';
        // Preserve native fragment links into Ghost content, including heading anchors.
        const containingPage = document.getElementById(id)?.closest('[data-journal-page]');
        const active = target || containingPage || pages[0];
        pages.forEach(page => { page.hidden = !plain && page !== active; });
        tabs.forEach(tab => {
            if (active && tab.dataset.section === active.id && !plain) {
                tab.setAttribute('aria-current', 'location');
            } else {
                tab.removeAttribute('aria-current');
            }
        });
        if (focus && target) {
            const heading = target.querySelector('h1, h2');
            heading.setAttribute('tabindex', '-1');
            heading.focus({ preventScroll: true });
            target.scrollIntoView({ block: 'start' });
        } else if (containingPage && !target) {
            document.getElementById(id).scrollIntoView();
        }
    }

    function updateMode() {
        const plain = root.dataset.mode === 'plain';
        toggle.setAttribute('aria-pressed', String(plain));
        toggle.querySelector('[data-mode-label]').textContent = plain
            ? 'Fine. Bring back the glue sticks.'
            : 'Just the website, please.';
        showPage();
    }

    toggle.hidden = false;
    toggle.addEventListener('click', () => {
        const plain = root.dataset.mode !== 'plain';
        root.dataset.mode = plain ? 'plain' : 'journal';
        try {
            localStorage.setItem('ems-site-mode', plain ? 'plain' : 'journal');
        } catch {
            status.textContent = 'Your browser cannot save this preference. The mode still works for this page.';
            updateMode();
            return;
        }
        updateMode();
        status.textContent = plain ? 'Plain mode. Same content, less confetti.' : 'Journal mode. Glue sticks restored.';
    });

    window.addEventListener('hashchange', () => showPage({ focus: true }));
    document.addEventListener('click', event => {
        const link = event.target.closest('a[data-section], a[data-section-link]');
        if (!link || !pages.length || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button > 0) return;
        const url = new URL(link.href);
        if (url.origin !== location.origin || url.pathname !== location.pathname) return;
        if (!pages.some(page => `#${page.id}` === url.hash)) return;
        event.preventDefault();
        if (location.hash === url.hash) showPage({ focus: true });
        else location.hash = url.hash;
    });
    updateMode();
})();
