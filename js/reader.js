(() => {
    'use strict';

    const tr = (key, fallback) => window.SunBookI18n ? window.SunBookI18n.t(key) : fallback;
    const token = localStorage.getItem('sunbook_token');
    const params = new URLSearchParams(window.location.search);
    const bookParam = params.get('book') || '';
    const entryParam = params.get('entry') || '';
    const validLogin = token && token !== 'social_dummy_token';
    if (!validLogin) {
        localStorage.setItem('sunbook_redirect_after_login', `reader.html${window.location.search}`);
        window.location.replace('login.html');
        return;
    }
    if (!bookParam && !entryParam) {
        window.location.replace('profile.html?tab=digital');
        return;
    }

    const pageImage = document.getElementById('readerPage');
    const viewport = document.getElementById('readerViewport');
    const skeleton = document.getElementById('readerSkeleton');
    const status = document.getElementById('readerStatus');
    const counter = document.getElementById('pageCounter');
    const pageInput = document.getElementById('pageNumber');
    const previous = document.getElementById('previousPage');
    const next = document.getElementById('nextPage');
    const titleEl = document.getElementById('readerTitle');
    const tabsNav = document.getElementById('readerTabs');

    // الكتب عربية (RTL): الصفحة التالية بتبقى ناحية الشمال (سهم شمال / سحب من الشمال لليمين)
    const BOOK_IS_RTL = true;
    // بنحتفظ بآخر كام صفحة لكل كتاب في الذاكرة (blob URLs) عشان الرجوع للصفحة السابقة ميتحسبش طلب جديد على السيرفر
    const MAX_CACHED_PAGES = 6;

    // كل كتاب في العرض ليه حالته الخاصة (صفحته الحالية، الزووم، جلسة القراءة، الصفحات المتخزنة)،
    // فالتنقل بين التابات بيرجّعك لنفس المكان اللي كنت واقف فيه في كل كتاب.
    let books = [];
    let active = null;
    let entryKey = '';
    let requestSerial = 0;

    const makeBook = (info) => ({
        productId: info.productId,
        title: info.title || '',
        pageCount: info.pageCount || 0,
        currentPage: info.lastPage || 1,
        zoom: 1,
        readToken: '',
        cache: new Map(),
        inflight: new Map(),
        wantedPage: 1,
        tabButton: null,
    });

    const setStatus = (message, isError = false) => {
        status.textContent = message;
        status.classList.toggle('reader-status-error', isError);
    };

    const updateControls = () => {
        if (!active) return;
        if (!active.pageCount) {
            counter.textContent = tr('reader.loading', 'Loading page...');
            previous.disabled = true;
            next.disabled = true;
            return;
        }
        counter.textContent = tr('reader.pageOf', 'Page {page} of {total}')
            .replace('{page}', active.currentPage).replace('{total}', active.pageCount);
        pageInput.value = active.currentPage;
        pageInput.max = active.pageCount;
        previous.disabled = active.currentPage <= 1;
        next.disabled = active.currentPage >= active.pageCount;
    };

    const showError = (error) => {
        if (error.status === 401) setStatus(tr('reader.sessionExpired', error.message), true);
        else if (error.status === 403) setStatus(tr('reader.notOwned', error.message), true);
        else if (error.status === 429) setStatus(tr('reader.rateLimited', error.message), true);
        else if (error.status === 409) setStatus(tr('reader.bookNotReady', error.message), true);
        else if (!navigator.onLine) setStatus(tr('reader.offline', 'Reading requires an internet connection.'), true);
        else setStatus(error.message || tr('reader.loadFailed', 'Could not load this page.'), true);
    };

    const trimCache = (book) => {
        while (book.cache.size > MAX_CACHED_PAGES) {
            let farthest = null;
            for (const page of book.cache.keys()) {
                if (farthest === null || Math.abs(page - book.wantedPage) > Math.abs(farthest - book.wantedPage)) farthest = page;
            }
            if (farthest === null || farthest === book.wantedPage) break;
            URL.revokeObjectURL(book.cache.get(farthest));
            book.cache.delete(farthest);
        }
    };

    // لما نسيب تاب، بنفضي صفحاته المتخزنة ما عدا الصفحة اللي كان واقف عندها (عشان الذاكرة)
    const trimToCurrent = (book) => {
        for (const [page, url] of book.cache) {
            if (page !== book.currentPage) {
                URL.revokeObjectURL(url);
                book.cache.delete(page);
            }
        }
    };

    const getPageUrl = (book, page) => {
        if (book.cache.has(page)) return Promise.resolve(book.cache.get(page));
        if (book.inflight.has(page)) return book.inflight.get(page);
        const request = api.fetchPage(book.productId, page, book.readToken)
            .then((blob) => {
                const url = URL.createObjectURL(blob);
                book.cache.set(page, url);
                trimCache(book);
                return url;
            })
            .finally(() => book.inflight.delete(page));
        book.inflight.set(page, request);
        return request;
    };

    const showPage = async (page, save = true) => {
        const book = active;
        if (!book || !Number.isInteger(page) || page < 1 || page > book.pageCount) return;
        const serial = ++requestSerial;
        book.wantedPage = page;
        skeleton.hidden = false;
        pageImage.hidden = true;
        setStatus(tr('reader.loading', 'Loading page...'));
        try {
            const url = await getPageUrl(book, page);
            if (serial !== requestSerial || active !== book) return;
            pageImage.onload = () => {
                if (serial !== requestSerial || active !== book) return;
                pageImage.hidden = false;
                skeleton.hidden = true;
                pageImage.style.transform = `scale(${book.zoom})`;
                setStatus('');
                if (save) {
                    api.saveProgress(book.productId, page).catch((error) => {
                        console.error('Could not save reader progress:', error);
                    });
                }
                preloadNearbyPages(book);
            };
            pageImage.onerror = () => {
                if (serial !== requestSerial || active !== book) return;
                // الصفحة المتخزنة ممكن تكون بايظة: نشيلها من الكاش عشان المحاولة الجاية تجيبها من جديد
                if (book.cache.get(page) === url) {
                    URL.revokeObjectURL(url);
                    book.cache.delete(page);
                }
                skeleton.hidden = true;
                setStatus(tr('reader.loadFailed', 'Could not load this page. Please try again.'), true);
            };
            pageImage.src = url;
            book.currentPage = page;
            updateControls();
            viewport.scrollTo({ top: 0, behavior: 'auto' });
        } catch (error) {
            if (serial !== requestSerial || active !== book) return;
            skeleton.hidden = true;
            pageImage.hidden = true;
            showError(error);
        }
    };

    // بنحمّل الصفحتين الجايين والسابقة مقدمًا (كل طلب بيتحسب في حد الطلبات، فالعدد قليل عمدًا)
    function preloadNearbyPages(book) {
        [book.currentPage + 1, book.currentPage + 2, book.currentPage - 1].forEach((page) => {
            if (page < 1 || page > book.pageCount || book.cache.has(page) || book.inflight.has(page)) return;
            getPageUrl(book, page).catch((error) => {
                if (active === book && (error.status === 401 || error.status === 429)) setStatus(error.message, true);
            });
        });
    }

    const getDeviceId = () => {
        let id = localStorage.getItem('sunbook_reader_device');
        if (!id) {
            id = window.crypto?.randomUUID
                ? window.crypto.randomUUID()
                : Array.from(window.crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, '0')).join('');
            localStorage.setItem('sunbook_reader_device', id);
        }
        return id;
    };

    const startBookSession = async (book) => {
        const { data } = await api.startReadSession(book.productId, getDeviceId());
        if (!data.pageCount || !data.readToken) throw new Error(tr('reader.loadFailed', 'Could not open this book.'));
        book.readToken = data.readToken;
        book.pageCount = data.pageCount;
        book.currentPage = Math.min(Math.max(1, data.lastPage || 1), data.pageCount);
        if (data.title && !book.title) {
            book.title = data.title;
            if (book.tabButton) book.tabButton.textContent = data.title;
        }
    };

    const rememberTab = (book) => {
        if (!entryKey) return;
        try { localStorage.setItem(`sunbook_reader_tab_${entryKey}`, book.productId); } catch (error) { /* مش مهم */ }
    };
    const recalledTab = () => {
        if (!entryKey) return '';
        try { return localStorage.getItem(`sunbook_reader_tab_${entryKey}`) || ''; } catch (error) { return ''; }
    };

    const renderTabs = () => {
        if (books.length < 2) {
            tabsNav.hidden = true;
            return;
        }
        tabsNav.hidden = false;
        tabsNav.replaceChildren();
        books.forEach((book, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'reader-tab';
            button.setAttribute('role', 'tab');
            button.textContent = book.title || `${tr('reader.bookN', 'Book')} ${index + 1}`;
            button.addEventListener('click', () => activate(book));
            book.tabButton = button;
            tabsNav.appendChild(button);
        });
        syncTabs();
    };

    const syncTabs = () => {
        books.forEach((book) => {
            if (!book.tabButton) return;
            const isActive = book === active;
            book.tabButton.classList.toggle('reader-tab-active', isActive);
            book.tabButton.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
    };

    const activate = async (book) => {
        if (active === book && book.readToken) return;
        if (active && active !== book) trimToCurrent(active);
        active = book;
        const serial = ++requestSerial;
        syncTabs();
        rememberTab(book);
        if (!book.readToken) {
            skeleton.hidden = false;
            pageImage.hidden = true;
            setStatus(tr('reader.loading', 'Loading page...'));
            updateControls();
            try {
                await startBookSession(book);
            } catch (error) {
                if (active !== book || serial !== requestSerial) return;
                skeleton.hidden = true;
                pageImage.hidden = true;
                showError(error);
                return;
            }
            if (active !== book || serial !== requestSerial) return;
        }
        updateControls();
        showPage(book.currentPage, false);
    };

    // اتجاه التقليب: forward = الصفحة التالية في الكتاب
    const goForward = () => active && showPage(active.currentPage + 1);
    const goBackward = () => active && showPage(active.currentPage - 1);

    document.getElementById('goToPage').addEventListener('click', () => {
        const page = Number(pageInput.value);
        if (Number.isInteger(page)) showPage(page);
    });
    pageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') document.getElementById('goToPage').click();
    });
    previous.addEventListener('click', goBackward);
    next.addEventListener('click', goForward);
    const setZoom = (delta) => {
        if (!active) return;
        active.zoom = Math.min(2, Math.max(0.75, active.zoom + delta));
        pageImage.style.transform = `scale(${active.zoom})`;
    };
    document.getElementById('zoomIn').addEventListener('click', () => setZoom(0.15));
    document.getElementById('zoomOut').addEventListener('click', () => setZoom(-0.15));
    document.addEventListener('keydown', (event) => {
        if (event.target === pageInput) return;
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        // السهم اليمين = الصفحة اللي بعدها، السهم الشمال = اللي قبلها
        const movesForward = event.key === 'ArrowRight';
        if (movesForward) goForward();
        else goBackward();
    });
    let touchStartX = 0;
    viewport.addEventListener('touchstart', (event) => {
        touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    viewport.addEventListener('touchend', (event) => {
        // لو الصفحة متكبّرة، السحب معناه تحريك الصفحة مش تقليبها
        if (!active || active.zoom > 1) return;
        const distance = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(distance) <= 55) return;
        const swipedRight = distance > 0;
        const movesForward = BOOK_IS_RTL ? swipedRight : !swipedRight;
        if (movesForward) goForward();
        else goBackward();
    }, { passive: true });
    ['contextmenu', 'selectstart', 'dragstart'].forEach((eventName) => {
        document.addEventListener(eventName, (event) => event.preventDefault());
    });
    document.addEventListener('visibilitychange', () => {
        document.body.classList.toggle('reader-blurred', document.visibilityState === 'hidden');
    });
    window.addEventListener('online', () => {
        if (!pageImage.hidden || !active || !active.readToken) return;
        showPage(active.currentPage, false);
    });
    window.addEventListener('beforeunload', () => {
        books.forEach((book) => {
            for (const url of book.cache.values()) URL.revokeObjectURL(url);
        });
    });

    const init = async () => {
        if (!navigator.onLine) {
            skeleton.hidden = true;
            setStatus(tr('reader.offline', 'Reading requires an internet connection.'), true);
            return;
        }

        // بنجيب كارت المكتبة اللي الكتاب ده تبعه: لو عرض (Bundle) بنعمل تاب لكل كتاب فيه
        let entry = null;
        try {
            const { data: library } = await api.getLibrary();
            entry = library.find((item) => (entryParam && item.productId === entryParam)
                || (bookParam && item.books.some((book) => book.productId === bookParam))) || null;
        } catch (error) {
            console.error('Could not load the library for the reader:', error);
        }

        let startId = bookParam;
        if (entry) {
            books = entry.books.map(makeBook);
            entryKey = entry.productId;
            if (entry.title) titleEl.textContent = entry.title;
            if (!startId) startId = recalledTab();
        } else {
            // الأدمن بيفتح كتاب من غير ما يكون اشتراه، أو المكتبة مفتحتش: بنفتح الكتاب لوحده
            books = [makeBook({ productId: bookParam || entryParam })];
        }
        const first = books.find((book) => book.productId === startId) || books[0];
        renderTabs();
        await activate(first);
        if (books.length === 1 && active && active.title) {
            titleEl.textContent = active.title;
            document.title = `${active.title} | The Sun Book`;
        } else if (entry && entry.title) {
            document.title = `${entry.title} | The Sun Book`;
        }
    };

    init();
})();
