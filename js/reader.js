(() => {
    'use strict';

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

    const $ = (id) => document.getElementById(id);
    const shell = $('readerShell');
    const viewport = $('readerViewport');
    const stage = $('readerStage');
    const status = $('readerStatus');
    const counter = $('pageCounter');
    const pageInput = $('pageNumber');
    const previous = $('previousPage');
    const next = $('nextPage');
    const titleEl = $('readerTitle');
    const tabsNav = $('readerTabs');
    const viewBtn = $('viewBtn');
    const viewMenu = $('viewMenu');
    const fullscreenBtn = $('fullscreenBtn');
    const immersiveExit = $('immersiveExit');
    // مؤشر التحميل في الخلفية مبقاش بيظهر في الشريط العلوي (الحالة موجودة في قايمة العرض)
    const chip = document.createElement('span');
    const zoomLabel = $('zoomLabel');
    const progressFill = $('progressFill');
    const dock = $('readerDock');
    const libraryBtn = $('libraryBtn');
    const libraryLabel = $('libraryLabel');
    const installLabel = $('installLabel');
    const installBtn = $('installBtn');
    const panel = $('readerPanel');
    const panelTitle = $('panelTitle');
    const panelBody = $('panelBody');
    const panelClose = $('panelClose');
    // التطبيق مثبّت على الجهاز (مفتوح كتطبيق مش كصفحة في المتصفح)
    const standalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true;
    if (standalone) document.body.classList.add('is-standalone');

    // ---------- النصوص (عربي/إنجليزي) ----------
    const STR = {
        ar: {
            view: 'العرض ▾', fullscreen: 'ملء الشاشة', exit: 'خروج من ملء الشاشة',
            layout: 'شكل العرض', single: 'صفحة واحدة', spread: 'صفحتان', scroll: 'تمرير متواصل',
            fit: 'حجم الصفحة', fitPage: 'الصفحة كاملة', fitWidth: 'ملء العرض',
            bg: 'لون الخلفية', dark: 'داكن', gray: 'رمادي', light: 'فاتح',
            fast: 'قراءة سريعة', fastOn: 'تحميل الكتاب على جهازي', fastOff: 'إيقاف',
            fastNote: 'بيتحمّل الكتاب مرة واحدة في الخلفية، وبعدها بيفتح فورًا من جهازك.',
            clear: 'مسح الكتاب المحمّل من جهازي',
            preparing: 'جارٍ تجهيز الكتاب للقراءة السريعة {p}%', ready: '✓ الكتاب جاهز للقراءة السريعة',
            spreadOf: 'الصفحتان {a}–{b} من {total}', retry: 'إعادة المحاولة',
            appName: 'قارئ ذا صن بوك', library: 'مكتبتي', libraryTitle: 'مكتبتي الرقمية',
            addTab: 'فتح كتاب آخر', closeTab: 'إغلاق', tabsLabel: 'الكتب المفتوحة', close: 'إغلاق',
            emptyLibrary: 'مكتبتك الرقمية فاضية. الكتب الإلكترونية اللي هتشتريها هتظهر هنا.',
            opened: 'مفتوح', notReady: 'غير جاهز بعد', pagesInfo: '{n} صفحة', resumeInfo: 'وصلت لصفحة {p} من {n}',
            install: 'تثبيت', installTitle: 'تثبيت قارئ ذا صن بوك',
            iosSteps: 'اضغط زر المشاركة في متصفح Safari، ثم اختر «إضافة إلى الشاشة الرئيسية».',
            iosOpenSafari: 'افتح الصفحة دي من متصفح Safari الأول، وبعدها اضغط زر المشاركة واختر «إضافة إلى الشاشة الرئيسية».',
        },
        en: {
            view: 'View ▾', fullscreen: 'Fullscreen', exit: 'Exit fullscreen',
            layout: 'Layout', single: 'Single page', spread: 'Two pages', scroll: 'Continuous scroll',
            fit: 'Page size', fitPage: 'Whole page', fitWidth: 'Fit width',
            bg: 'Background', dark: 'Dark', gray: 'Gray', light: 'Light',
            fast: 'Fast reading', fastOn: 'Download book to this device', fastOff: 'Turn off',
            fastNote: 'The book downloads once in the background, then opens instantly from your device.',
            clear: 'Remove downloaded book from this device',
            preparing: 'Preparing book for fast reading {p}%', ready: '✓ Book ready for fast reading',
            spreadOf: 'Pages {a}–{b} of {total}', retry: 'Try again',
            appName: 'Sun Reader', library: 'My library', libraryTitle: 'My digital library',
            addTab: 'Open another book', closeTab: 'Close', tabsLabel: 'Open books', close: 'Close',
            emptyLibrary: 'Your digital library is empty. E-books you buy will show up here.',
            opened: 'Open', notReady: 'Not ready yet', pagesInfo: '{n} pages', resumeInfo: 'On page {p} of {n}',
            install: 'Install', installTitle: 'Install Sun Reader',
            iosSteps: 'In Safari, tap the Share button, then choose “Add to Home Screen”.',
            iosOpenSafari: 'Open this page in Safari first, then tap the Share button and choose “Add to Home Screen”.',
        },
    };
    const lang = () => {
        const current = (window.SunBookI18n && window.SunBookI18n.getLang && window.SunBookI18n.getLang())
            || document.documentElement.lang || 'en';
        return String(current).startsWith('ar') ? 'ar' : 'en';
    };
    const L = (key) => STR[lang()][key] || STR.en[key] || key;
    const tr = (key, fallback) => (window.SunBookI18n ? window.SunBookI18n.t(key) : fallback);

    // ---------- الإعدادات (بتتحفظ على الجهاز) ----------
    const PREFS_KEY = 'sunbook_reader_prefs';
    const prefs = { layout: 'single', fit: 'page', bg: 'dark', fastLoad: true };
    try { Object.assign(prefs, JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')); } catch (error) { /* مش مهم */ }
    const savePrefs = () => { try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (error) { /* مش مهم */ } };

    const MAX_MEMORY_PAGES = 8;
    const PREFETCH_DELAY_MS = 1500;
    const CACHE_NAME = 'sunbook-reader-pages-v1';
    const CACHE_ORIGIN = 'https://sunbook-reader.local/';
    const hasCacheApi = 'caches' in window;

    const OPEN_KEY = 'sunbook_reader_open_tabs';
    const ACTIVE_KEY = 'sunbook_reader_active';
    const SESSION_REFRESH_MS = 6 * 60 * 60 * 1000;

    let books = [];      // التابات المفتوحة
    let library = [];    // كل الكتب اللي المستخدم اشتراها (كل كتاب لوحده)
    let owned = true;    // false = أدمن بيفتح كتاب مش في مكتبته
    let installEvent = null;
    let active = null;
    let renderSerial = 0;
    let progressTimer = null;
    let sheets = [];
    let observer = null;

    const makeBook = (info) => ({
        productId: info.productId,
        title: info.title || '',
        pageCount: info.pageCount || 0,
        currentPage: info.lastPage || 1,
        zoom: 1,
        aspect: 0,
        readToken: '',
        cacheScope: '',
        urls: new Map(),
        blobFlight: new Map(),
        stored: new Set(),
        pinned: new Set(),
        prefetchToken: 0,
        sessionAt: 0,
        tabButton: null,
        tabLabel: null,
    });

    const effectiveLayout = () => (prefs.layout === 'spread' && viewport.clientWidth < 700 ? 'single' : prefs.layout);
    const setStatus = (message, isError = false) => {
        status.textContent = message || '';
        status.classList.toggle('reader-status-error', Boolean(isError));
    };
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const showError = (error) => {
        if (error.status === 401) setStatus(tr('reader.sessionExpired', error.message), true);
        else if (error.status === 403) setStatus(tr('reader.notOwned', error.message), true);
        else if (error.status === 429) setStatus(tr('reader.rateLimited', error.message), true);
        else if (error.status === 409) setStatus(tr('reader.bookNotReady', error.message), true);
        else if (!navigator.onLine) setStatus(tr('reader.offline', 'Reading requires an internet connection.'), true);
        else setStatus(error.message || tr('reader.loadFailed', 'Could not load this page.'), true);
    };

    // ---------- التخزين على جهاز المستخدم (Cache API) ----------
    const cachePromise = hasCacheApi ? caches.open(CACHE_NAME).catch(() => null) : Promise.resolve(null);
    const storedUrl = (book, page) => `${CACHE_ORIGIN}${book.cacheScope}/${book.productId}/${page}`;
    const canStore = (book) => hasCacheApi && Boolean(book.cacheScope);

    const readStored = async (book, page) => {
        if (!canStore(book) || !book.stored.has(page)) return null;
        try {
            const cache = await cachePromise;
            const response = cache && await cache.match(storedUrl(book, page));
            return response ? await response.blob() : null;
        } catch (error) { return null; }
    };
    const writeStored = async (book, page, blob) => {
        if (!canStore(book) || !prefs.fastLoad) return;
        try {
            const cache = await cachePromise;
            if (!cache) return;
            await cache.put(storedUrl(book, page), new Response(blob, { headers: { 'Content-Type': blob.type || 'image/webp' } }));
            book.stored.add(page);
            updateChip(book);
        } catch (error) { /* المساحة ممتلئة أو المتصفح رافض: نكمل عادي */ }
    };
    // بنعرف إيه المتخزن من الكتاب ده، ونمسح النسخ القديمة (لو الكتاب اتجدد أو مستخدم تاني)
    const scanStored = async (book) => {
        if (!canStore(book)) return;
        try {
            const cache = await cachePromise;
            if (!cache) return;
            const mine = `${CACHE_ORIGIN}${book.cacheScope}/${book.productId}/`;
            const sameBook = `/${book.productId}/`;
            for (const request of await cache.keys()) {
                if (request.url.startsWith(mine)) book.stored.add(Number(request.url.slice(mine.length)));
                else if (request.url.includes(sameBook)) await cache.delete(request);
            }
        } catch (error) { /* مش مهم */ }
    };
    const clearStored = async (book) => {
        book.prefetchToken += 1;
        try {
            const cache = await cachePromise;
            if (cache) {
                const prefix = `${CACHE_ORIGIN}${book.cacheScope}/${book.productId}/`;
                for (const request of await cache.keys()) if (request.url.startsWith(prefix)) await cache.delete(request);
            }
        } catch (error) { /* مش مهم */ }
        book.stored.clear();
        updateChip(book);
    };

    // ---------- جلب الصفحات ----------
    const getBlob = (book, page) => {
        if (book.blobFlight.has(page)) return book.blobFlight.get(page);
        const request = (async () => {
            const stored = await readStored(book, page);
            if (stored) return stored;
            const blob = await api.fetchPage(book.productId, page, book.readToken);
            writeStored(book, page, blob);
            return blob;
        })().finally(() => book.blobFlight.delete(page));
        book.blobFlight.set(page, request);
        return request;
    };

    const trimMemory = (book) => {
        for (const page of [...book.urls.keys()]) {
            if (book.urls.size <= MAX_MEMORY_PAGES) break;
            if (book.pinned.has(page)) continue;
            URL.revokeObjectURL(book.urls.get(page));
            book.urls.delete(page);
        }
    };
    const getPageUrl = async (book, page) => {
        if (book.urls.has(page)) return book.urls.get(page);
        const blob = await getBlob(book, page);
        if (!book.urls.has(page)) book.urls.set(page, URL.createObjectURL(blob));
        trimMemory(book);
        return book.urls.get(page);
    };
    const dropUrl = (book, page) => {
        if (book.urls.has(page)) { URL.revokeObjectURL(book.urls.get(page)); book.urls.delete(page); }
    };
    const releaseAll = (book) => {
        for (const url of book.urls.values()) URL.revokeObjectURL(url);
        book.urls.clear();
        book.pinned.clear();
    };

    // ---------- التحميل في الخلفية للقراءة السريعة ----------
    const updateChip = (book) => {
        if (book !== active) return;
        const total = book.pageCount || 1;
        const done = Math.min(book.stored.size, total);
        const percent = Math.floor((done / total) * 100);
        if (!prefs.fastLoad || !canStore(book) || !done) { chip.hidden = true; refreshMenuNote(); return; }
        chip.hidden = false;
        chip.textContent = done >= total ? L('ready') : L('preparing').replace('{p}', percent);
        refreshMenuNote();
    };

    const startPrefetch = async (book) => {
        if (!prefs.fastLoad || !canStore(book)) return;
        const token = ++book.prefetchToken;
        const order = [];
        for (let page = book.currentPage + 1; page <= book.pageCount; page += 1) order.push(page);
        for (let page = 1; page < book.currentPage; page += 1) order.push(page);
        let failures = 0;
        for (const page of order) {
            if (token !== book.prefetchToken || active !== book || !prefs.fastLoad) return;
            if (book.stored.has(page)) continue;
            try {
                await getBlob(book, page);
                failures = 0;
                await sleep(PREFETCH_DELAY_MS);
            } catch (error) {
                if (error.status === 401 || error.status === 403 || error.status === 409) return;
                failures += 1;
                if (failures >= 6) return;
                await sleep(error.status === 429 ? 30000 : 4000);
            }
        }
    };

    // ---------- الحجم والتخطيط ----------
    const applyLayout = (keepPosition = true) => {
        const book = active;
        const layout = effectiveLayout();
        stage.className = `reader-stage layout-${layout}`;
        document.body.classList.remove('bg-dark', 'bg-gray', 'bg-light');
        document.body.classList.add(`bg-${prefs.bg}`);
        if (!book) return;
        zoomLabel.textContent = `${Math.round(book.zoom * 100)}%`;
        const aspect = book.aspect || 0.707;
        const css = getComputedStyle(viewport);
        const availableW = Math.max(120, viewport.clientWidth - parseFloat(css.paddingLeft) - parseFloat(css.paddingRight));
        const availableH = Math.max(120, viewport.clientHeight - parseFloat(css.paddingTop) - parseFloat(css.paddingBottom));
        const columns = layout === 'spread' && stage.children.length > 1 ? 2 : 1;
        const columnW = (availableW - (columns - 1) * 3) / columns;
        let base;
        if (layout === 'scroll') base = prefs.fit === 'page' ? Math.min(columnW, availableH * aspect) : Math.min(columnW, 1500);
        else base = prefs.fit === 'page' ? Math.min(columnW, availableH * aspect) : columnW;
        const width = Math.max(80, base * book.zoom);
        stage.style.setProperty('--page-w', `${width}px`);
        stage.style.setProperty('--aspect', String(aspect));
        if (keepPosition && layout === 'scroll' && sheets.length) scrollToSheet(book.currentPage, false);
    };

    // ---------- الصفحات على الشاشة ----------
    const spreadStart = (page) => (page <= 1 ? 1 : (page % 2 === 0 ? page : page - 1));
    const visiblePages = (book) => {
        if (effectiveLayout() === 'spread') {
            const start = spreadStart(book.currentPage);
            return start === 1 || start + 1 > book.pageCount ? [start] : [start, start + 1];
        }
        return [book.currentPage];
    };

    const makeSheet = (book, page) => {
        const el = document.createElement('div');
        el.className = 'reader-sheet';
        el.dataset.page = String(page);
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        const skeleton = document.createElement('div');
        skeleton.className = 'reader-sheet-skeleton';
        const retryButton = document.createElement('button');
        retryButton.type = 'button';
        retryButton.className = 'reader-retry';
        retryButton.textContent = L('retry');
        const sheet = { page, el, img, serial: 0, book };
        retryButton.addEventListener('click', () => { setStatus(''); loadSheet(sheet); });
        el.append(img, skeleton, retryButton);
        return sheet;
    };

    const loadSheet = async (sheet) => {
        const { book, page } = sheet;
        const serial = ++sheet.serial;
        sheet.el.classList.remove('is-failed');
        book.pinned.add(page);
        try {
            const url = await getPageUrl(book, page);
            if (sheet.serial !== serial || active !== book || !sheet.el.isConnected) return;
            sheet.img.onload = () => {
                if (sheet.serial !== serial) return;
                sheet.el.classList.add('is-ready');
                if (!book.aspect && sheet.img.naturalWidth) {
                    book.aspect = sheet.img.naturalWidth / sheet.img.naturalHeight;
                    applyLayout();
                }
                if (page === book.currentPage) afterFirstPage(book);
            };
            sheet.img.onerror = () => {
                if (sheet.serial !== serial) return;
                dropUrl(book, page);
                book.stored.delete(page);
                sheet.el.classList.add('is-failed');
            };
            sheet.img.src = url;
        } catch (error) {
            if (sheet.serial !== serial || active !== book) return;
            sheet.el.classList.add('is-failed');
            showError(error);
        }
    };

    const unloadSheet = (sheet) => {
        sheet.serial += 1;
        sheet.img.removeAttribute('src');
        sheet.el.classList.remove('is-ready', 'is-failed');
        sheet.book.pinned.delete(sheet.page);
    };

    let prefetchStartedFor = null;
    const afterFirstPage = (book) => {
        if (prefetchStartedFor === book) return;
        prefetchStartedFor = book;
        saveProgressSoon(book);
        updateChip(book);
        startPrefetch(book);
    };

    const preloadNearby = (book) => {
        [book.currentPage + 1, book.currentPage + 2, book.currentPage - 1].forEach((page) => {
            if (page < 1 || page > book.pageCount) return;
            getBlob(book, page).catch(() => {});
        });
    };

    const teardownStage = () => {
        if (observer) { observer.disconnect(); observer = null; }
        sheets.forEach((sheet) => { sheet.serial += 1; sheet.book.pinned.delete(sheet.page); });
        sheets = [];
        stage.replaceChildren();
    };

    // صفحة واحدة أو صفحتان: بنبني الصفحات الظاهرة بس
    const renderPages = (book) => {
        teardownStage();
        const pages = visiblePages(book);
        sheets = pages.map((page) => makeSheet(book, page));
        stage.append(...sheets.map((sheet) => sheet.el));
        applyLayout(false);
        viewport.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        sheets.forEach(loadSheet);
        preloadNearby(book);
    };

    // تمرير متواصل: كل الصفحات أماكنها موجودة، والصور بتتحمّل لما تقرّب من الشاشة
    const renderScroll = (book) => {
        teardownStage();
        sheets = [];
        for (let page = 1; page <= book.pageCount; page += 1) sheets.push(makeSheet(book, page));
        stage.append(...sheets.map((sheet) => sheet.el));
        applyLayout(false);
        observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const sheet = sheets[Number(entry.target.dataset.page) - 1];
                if (!sheet) return;
                if (entry.isIntersecting) { if (!sheet.el.classList.contains('is-ready') && !sheet.el.classList.contains('is-failed')) loadSheet(sheet); }
                else unloadSheet(sheet);
            });
        }, { root: viewport, rootMargin: '150% 0px 150% 0px' });
        sheets.forEach((sheet) => observer.observe(sheet.el));
        scrollToSheet(book.currentPage, false);
    };

    const scrollToSheet = (page, smooth) => {
        const sheet = sheets[page - 1];
        if (!sheet) return;
        viewport.scrollTo({ top: Math.max(0, sheet.el.offsetTop - 10), behavior: smooth ? 'smooth' : 'auto' });
    };

    const render = () => {
        const book = active;
        if (!book || !book.pageCount) return;
        ++renderSerial;
        if (effectiveLayout() === 'scroll') renderScroll(book);
        else {
            book.currentPage = effectiveLayout() === 'spread' ? spreadStart(book.currentPage) : book.currentPage;
            renderPages(book);
        }
        updateControls();
    };

    const updateControls = () => {
        const book = active;
        if (!book || !book.pageCount) {
            counter.textContent = '';
            progressFill.style.width = '0';
            previous.disabled = true;
            next.disabled = true;
            return;
        }
        const pages = effectiveLayout() === 'spread' ? visiblePages(book) : [book.currentPage];
        counter.textContent = pages.length > 1 ? `– ${pages[1]} / ${book.pageCount}` : `/ ${book.pageCount}`;
        progressFill.style.width = `${Math.min(100, (pages[pages.length - 1] / book.pageCount) * 100)}%`;
        pageInput.value = book.currentPage;
        pageInput.max = book.pageCount;
        previous.disabled = book.currentPage <= 1;
        const lastShown = pages[pages.length - 1];
        next.disabled = lastShown >= book.pageCount;
    };

    const saveProgressSoon = (book) => {
        clearTimeout(progressTimer);
        progressTimer = setTimeout(() => {
            api.saveProgress(book.productId, book.currentPage).catch((error) => {
                console.error('Could not save reader progress:', error);
            });
        }, 1200);
    };

    // ---------- التنقل ----------
    const showPage = (page) => {
        const book = active;
        if (!book || !Number.isInteger(page) || page < 1 || page > book.pageCount) return;
        setStatus('');
        book.currentPage = page;
        if (effectiveLayout() === 'scroll') scrollToSheet(page, true);
        else renderPages(book);
        updateControls();
        saveProgressSoon(book);
    };
    const goForward = () => {
        const book = active;
        if (!book) return;
        if (effectiveLayout() === 'spread') {
            const step = visiblePages(book).length;
            showPage(Math.min(book.pageCount, spreadStart(book.currentPage) + step));
        } else showPage(book.currentPage + 1);
    };
    const goBackward = () => {
        const book = active;
        if (!book) return;
        if (effectiveLayout() === 'spread') {
            const start = spreadStart(book.currentPage);
            showPage(start <= 2 ? 1 : start - 2);
        } else showPage(book.currentPage - 1);
    };

    // ---------- الجلسة والتابات ----------
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
        book.sessionAt = Date.now();
        book.pageCount = data.pageCount;
        book.cacheScope = data.cacheScope || '';
        if (data.pageWidth && data.pageHeight) book.aspect = data.pageWidth / data.pageHeight;
        book.currentPage = Math.min(Math.max(1, data.lastPage || 1), data.pageCount);
        if (data.title && !book.title) {
            book.title = data.title;
            if (book.tabLabel) book.tabLabel.textContent = data.title;
        }
        await scanStored(book);
    };

    // ---------- التابات المفتوحة (بتتحفظ على الجهاز) ----------
    const readJson = (key, fallback) => {
        try { const value = JSON.parse(localStorage.getItem(key) || 'null'); return value == null ? fallback : value; } catch (error) { return fallback; }
    };
    const persistTabs = () => {
        if (!owned) return;
        try {
            localStorage.setItem(OPEN_KEY, JSON.stringify(books.map((book) => book.productId)));
            if (active) localStorage.setItem(ACTIVE_KEY, active.productId);
        } catch (error) { /* مش مهم */ }
    };

    const updateHeading = () => {
        titleEl.textContent = (active && active.title) || L('appName');
        document.title = active && active.title ? `${active.title} | ${L('appName')}` : L('appName');
    };

    const syncTabs = () => {
        books.forEach((book) => {
            if (!book.tabButton) return;
            const isActive = book === active;
            book.tabButton.classList.toggle('reader-tab-active', isActive);
            if (book.tabLabel) book.tabLabel.setAttribute('aria-selected', isActive ? 'true' : 'false');
            if (isActive && book.tabButton.scrollIntoView) book.tabButton.scrollIntoView({ inline: 'nearest', block: 'nearest' });
        });
    };

    const renderTabs = () => {
        tabsNav.replaceChildren();
        if (!owned || !books.length) { tabsNav.hidden = true; return; }
        tabsNav.hidden = false;
        tabsNav.setAttribute('aria-label', L('tabsLabel'));
        books.forEach((book, index) => {
            const tab = document.createElement('div');
            tab.className = 'reader-tab';
            const label = document.createElement('button');
            label.type = 'button';
            label.className = 'reader-tab-label';
            label.setAttribute('role', 'tab');
            label.textContent = book.title || `${tr('reader.bookN', 'Book')} ${index + 1}`;
            label.addEventListener('click', () => activate(book));
            tab.appendChild(label);
            if (books.length > 1) {
                const close = document.createElement('button');
                close.type = 'button';
                close.className = 'reader-tab-close';
                close.textContent = '×';
                close.setAttribute('aria-label', `${L('closeTab')}: ${label.textContent}`);
                close.addEventListener('click', (event) => { event.stopPropagation(); closeTab(book); });
                tab.appendChild(close);
            }
            book.tabButton = tab;
            book.tabLabel = label;
            tabsNav.appendChild(tab);
        });
        const hasClosedBooks = library.some((item) => item.pageCount > 0 && !books.some((book) => book.productId === item.productId));
        if (hasClosedBooks) {
            const add = document.createElement('button');
            add.type = 'button';
            add.className = 'reader-tab-add';
            add.textContent = '+';
            add.title = L('addTab');
            add.setAttribute('aria-label', L('addTab'));
            add.addEventListener('click', () => openLibrary());
            tabsNav.appendChild(add);
        }
        syncTabs();
    };

    const activate = async (book) => {
        if (active === book && book.readToken) return;
        if (active && active !== book) { active.prefetchToken += 1; releaseAll(active); }
        active = book;
        prefetchStartedFor = null;
        const serial = ++renderSerial;
        // الجلسة قديمة (التاب كان مفتوح من زمان): بنبدأ جلسة جديدة بدل ما الصفحات تفشل
        if (book.readToken && Date.now() - book.sessionAt > SESSION_REFRESH_MS) book.readToken = '';
        syncTabs();
        updateHeading();
        persistTabs();
        chip.hidden = true;
        setStatus('');
        if (!book.readToken) {
            teardownStage();
            const placeholder = makeSheet(book, 0);
            stage.appendChild(placeholder.el);
            applyLayout(false);
            updateControls();
            try {
                await startBookSession(book);
            } catch (error) {
                if (active !== book || serial !== renderSerial) return;
                placeholder.el.remove();
                showError(error);
                return;
            }
            if (active !== book || serial !== renderSerial) return;
            updateHeading();
        }
        render();
    };

    // فتح كتاب من المكتبة في تاب جديد (أو الانتقال له لو مفتوح)
    const openBook = (productId) => {
        let book = books.find((item) => item.productId === productId);
        if (!book) {
            const info = library.find((item) => item.productId === productId);
            if (!info || !(info.pageCount > 0)) return null;
            book = makeBook(info);
            books.push(book);
            renderTabs();
        }
        return activate(book);
    };

    const closeTab = (book) => {
        const index = books.indexOf(book);
        if (index < 0 || books.length < 2) return;
        books.splice(index, 1);
        book.prefetchToken += 1;
        releaseAll(book);
        const wasActive = active === book;
        if (wasActive) active = null;
        renderTabs();
        if (wasActive) activate(books[Math.min(index, books.length - 1)]);
        else persistTabs();
    };

    // ---------- قايمة العرض ----------
    let noteEl = null;
    const refreshMenuNote = () => {
        if (!noteEl || !active) return;
        const total = active.pageCount || 1;
        const done = Math.min(active.stored.size, total);
        noteEl.textContent = prefs.fastLoad && canStore(active) && done
            ? (done >= total ? L('ready') : L('preparing').replace('{p}', Math.floor((done / total) * 100)))
            : L('fastNote');
    };

    const buildMenu = () => {
        viewBtn.textContent = L('view');
        fullscreenBtn.textContent = '⛶';
        fullscreenBtn.title = L('fullscreen');
        fullscreenBtn.setAttribute('aria-label', L('fullscreen'));
        immersiveExit.textContent = `✕ ${L('exit')}`;
        viewMenu.replaceChildren();
        const group = (title, key, options) => {
            const wrap = document.createElement('div');
            const h = document.createElement('h3');
            h.textContent = title;
            const seg = document.createElement('div');
            seg.className = 'reader-seg';
            options.forEach(([value, label]) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = label;
                button.setAttribute('aria-pressed', String(prefs[key] === value));
                button.addEventListener('click', () => {
                    prefs[key] = value;
                    savePrefs();
                    buildMenu();
                    viewMenu.hidden = false;
                    if (key === 'bg') applyLayout(false);
                    else render();
                });
                seg.appendChild(button);
            });
            wrap.append(h, seg);
            viewMenu.appendChild(wrap);
        };
        const layouts = [['single', L('single')], ['scroll', L('scroll')]];
        if (viewport.clientWidth >= 700) layouts.splice(1, 0, ['spread', L('spread')]);
        group(L('layout'), 'layout', layouts);
        group(L('fit'), 'fit', [['page', L('fitPage')], ['width', L('fitWidth')]]);
        group(L('bg'), 'bg', [['dark', L('dark')], ['gray', L('gray')], ['light', L('light')]]);
        if (hasCacheApi) {
            const fastWrap = document.createElement('div');
            const h = document.createElement('h3');
            h.textContent = L('fast');
            const seg = document.createElement('div');
            seg.className = 'reader-seg';
            [[true, L('fastOn')], [false, L('fastOff')]].forEach(([value, label]) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = label;
                button.setAttribute('aria-pressed', String(prefs.fastLoad === value));
                button.addEventListener('click', () => {
                    prefs.fastLoad = value;
                    savePrefs();
                    buildMenu();
                    viewMenu.hidden = false;
                    if (active) { if (value) startPrefetch(active); else active.prefetchToken += 1; updateChip(active); }
                });
                seg.appendChild(button);
            });
            noteEl = document.createElement('p');
            noteEl.className = 'reader-menu-note';
            const clearButton = document.createElement('button');
            clearButton.type = 'button';
            clearButton.className = 'reader-link';
            clearButton.textContent = L('clear');
            clearButton.addEventListener('click', () => { if (active) clearStored(active); });
            fastWrap.append(h, seg, noteEl, clearButton);
            viewMenu.appendChild(fastWrap);
            refreshMenuNote();
        }
    };

    const toggleMenu = (open) => {
        const show = typeof open === 'boolean' ? open : viewMenu.hidden;
        viewMenu.hidden = !show;
        viewBtn.setAttribute('aria-expanded', String(show));
        wake();
        if (show) buildMenu();
    };
    viewBtn.addEventListener('click', (event) => { event.stopPropagation(); toggleMenu(); });
    viewMenu.addEventListener('click', (event) => event.stopPropagation());
    document.addEventListener('click', () => toggleMenu(false));

    // ---------- ملء الشاشة ----------
    // في ملء الشاشة: شريط التحكم بيختفي لوحده بعد 3 ثواني، ويرجع لما تحرّك الماوس أو تلمس الشاشة
    let idleTimer = null;
    const wake = () => {
        shell.classList.remove('ui-idle');
        clearTimeout(idleTimer);
        if (shell.classList.contains('reader-immersive') && viewMenu.hidden) {
            idleTimer = setTimeout(() => shell.classList.add('ui-idle'), 3000);
        }
    };
    ['pointermove', 'pointerdown', 'touchstart', 'keydown', 'wheel'].forEach((name) => {
        document.addEventListener(name, wake, { passive: true });
    });
    const enterImmersive = () => {
        shell.classList.add('reader-immersive');
        wake();
        immersiveExit.hidden = false;
        toggleMenu(false);
        const root = document.documentElement;
        if (root.requestFullscreen) root.requestFullscreen().catch(() => {});
    };
    const exitImmersive = () => {
        shell.classList.remove('reader-immersive', 'ui-idle');
        clearTimeout(idleTimer);
        immersiveExit.hidden = true;
        if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    };
    fullscreenBtn.addEventListener('click', () => (shell.classList.contains('reader-immersive') ? exitImmersive() : enterImmersive()));
    immersiveExit.addEventListener('click', exitImmersive);
    document.addEventListener('fullscreenchange', () => {
        if (!document.fullscreenElement && shell.classList.contains('reader-immersive')) exitImmersive();
    });

    // ---------- الأزرار والكيبورد واللمس ----------
    const jumpToInput = () => {
        const page = Number(pageInput.value);
        if (Number.isInteger(page)) showPage(Math.min(Math.max(1, page), active ? active.pageCount : 1));
    };
    pageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { jumpToInput(); pageInput.blur(); }
    });
    pageInput.addEventListener('change', jumpToInput);
    pageInput.addEventListener('focus', () => pageInput.select());
    previous.addEventListener('click', goBackward);
    next.addEventListener('click', goForward);
    const setZoomTo = (value, keepPosition = true) => {
        if (!active) return;
        active.zoom = Math.min(4, Math.max(0.5, Math.round(value * 100) / 100));
        applyLayout(keepPosition);
    };
    const setZoom = (delta) => active && setZoomTo(active.zoom + delta);
    $('zoomIn').addEventListener('click', () => setZoom(0.2));
    $('zoomOut').addEventListener('click', () => setZoom(-0.2));
    zoomLabel.addEventListener('click', () => setZoomTo(1));
    // Ctrl + عجلة الماوس = تكبير/تصغير الصفحة (من غير ما المتصفح يكبّر الموقع كله)
    viewport.addEventListener('wheel', (event) => {
        if (!event.ctrlKey || !active) return;
        event.preventDefault();
        setZoom(event.deltaY < 0 ? 0.1 : -0.1);
    }, { passive: false });
    // ضغطتين على الصفحة = تكبير، وضغطتين تاني = رجوع
    viewport.addEventListener('dblclick', () => active && setZoomTo(active.zoom > 1.05 ? 1 : 2));
    // الضغط بصباعين (Pinch) على الموبايل
    let pinch = null;
    viewport.addEventListener('touchstart', (event) => {
        if (event.touches.length === 2 && active) {
            const [a, b] = event.touches;
            pinch = { distance: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), zoom: active.zoom };
        }
    }, { passive: true });
    viewport.addEventListener('touchmove', (event) => {
        if (!pinch || event.touches.length !== 2 || !active) return;
        event.preventDefault();
        const [a, b] = event.touches;
        setZoomTo(pinch.zoom * (Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY) / pinch.distance), false);
    }, { passive: false });
    viewport.addEventListener('touchend', (event) => { if (event.touches.length < 2) setTimeout(() => { pinch = null; }, 80); }, { passive: true });
    document.addEventListener('keydown', (event) => {
        if (event.target === pageInput || event.ctrlKey || event.metaKey || event.altKey) return;
        if (!panel.hidden) { if (event.key === 'Escape') closePanel(); return; }
        if (event.key === 'Escape') { toggleMenu(false); return; }
        if (event.key === '+' || event.key === '=') { setZoom(0.2); event.preventDefault(); return; }
        if (event.key === '-' || event.key === '_') { setZoom(-0.2); event.preventDefault(); return; }
        if (event.key === '0') { setZoomTo(1); return; }
        if (event.key === 'f' || event.key === 'F') { fullscreenBtn.click(); return; }
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
        if (effectiveLayout() === 'scroll') return;
        // السهم اليمين = الصفحة اللي بعدها، السهم الشمال = اللي قبلها
        if (event.key === 'ArrowRight') goForward();
        else goBackward();
    });
    let touchStartX = 0;
    viewport.addEventListener('touchstart', (event) => { touchStartX = event.changedTouches[0].clientX; }, { passive: true });
    viewport.addEventListener('touchend', (event) => {
        if (!active || pinch || active.zoom > 1 || effectiveLayout() === 'scroll') return;
        const distance = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(distance) <= 55) return;
        // الكتب عربية: السحب لليمين = الصفحة اللي بعدها
        if (distance > 0) goForward();
        else goBackward();
    }, { passive: true });

    // رقم الصفحة الحالية أثناء التمرير المتواصل
    let scrollTick = false;
    viewport.addEventListener('scroll', () => {
        if (effectiveLayout() !== 'scroll' || !active || scrollTick || sheets.length < 2) return;
        scrollTick = true;
        requestAnimationFrame(() => {
            scrollTick = false;
            const stride = sheets[1].el.offsetTop - sheets[0].el.offsetTop;
            if (stride <= 0) return;
            const probe = viewport.scrollTop + viewport.clientHeight / 3 - sheets[0].el.offsetTop;
            const page = Math.min(active.pageCount, Math.max(1, Math.floor(probe / stride) + 1));
            if (page !== active.currentPage) {
                active.currentPage = page;
                updateControls();
                saveProgressSoon(active);
            }
        });
    }, { passive: true });

    ['contextmenu', 'selectstart', 'dragstart'].forEach((eventName) => {
        document.addEventListener(eventName, (event) => event.preventDefault());
    });
    document.addEventListener('visibilitychange', () => {
        document.body.classList.toggle('reader-blurred', document.visibilityState === 'hidden');
    });
    window.addEventListener('online', () => {
        if (active && active.readToken) sheets.filter((s) => s.el.classList.contains('is-failed')).forEach(loadSheet);
    });
    window.addEventListener('beforeunload', () => books.forEach(releaseAll));
    document.addEventListener('sunbook:langChanged', () => {
        buildMenu(); viewMenu.hidden = true; updateControls(); updateChip(active || { pageCount: 0, stored: new Set() });
        applyStaticLabels(); updateHeading(); renderTabs(); closePanel(); refreshInstall();
    });

    let resizeTimer = null;
    if ('ResizeObserver' in window) {
        new ResizeObserver(() => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => { if (active && active.pageCount) { applyLayout(); updateControls(); } }, 120);
        }).observe(viewport);
    }

    // ---------- النافذة السفلية (المكتبة / شرح التثبيت) ----------
    const applyStaticLabels = () => {
        libraryLabel.textContent = L('library');
        libraryBtn.setAttribute('aria-label', L('library'));
        libraryBtn.title = L('library');
        installLabel.textContent = L('install');
        installBtn.setAttribute('aria-label', L('installTitle'));
        panelClose.setAttribute('aria-label', L('close'));
        tabsNav.setAttribute('aria-label', L('tabsLabel'));
    };
    const openPanel = (title, node) => {
        panelTitle.textContent = title;
        panelBody.replaceChildren(node);
        panel.hidden = false;
        toggleMenu(false);
    };
    function closePanel() {
        panel.hidden = true;
        panelBody.replaceChildren();
    }
    panelClose.addEventListener('click', closePanel);
    panel.addEventListener('click', (event) => { if (event.target === panel) closePanel(); });

    function openLibrary() {
        const list = document.createElement('div');
        list.className = 'reader-library';
        if (!library.length) {
            const empty = document.createElement('p');
            empty.className = 'reader-menu-note';
            empty.textContent = L('emptyLibrary');
            list.appendChild(empty);
        }
        library.forEach((item) => {
            const open = books.find((book) => book.productId === item.productId);
            const ready = item.pageCount > 0;
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'reader-library-item';
            row.disabled = !ready;
            if (open && open === active) row.classList.add('is-current');
            const name = document.createElement('strong');
            name.textContent = item.title;
            const meta = document.createElement('span');
            const page = open ? open.currentPage : (item.lastPage || 1);
            if (!ready) meta.textContent = L('notReady');
            else {
                const base = page > 1
                    ? L('resumeInfo').replace('{p}', page).replace('{n}', item.pageCount)
                    : L('pagesInfo').replace('{n}', item.pageCount);
                meta.textContent = open ? `${base} • ${L('opened')}` : base;
            }
            row.append(name, meta);
            row.addEventListener('click', () => { closePanel(); openBook(item.productId); });
            list.appendChild(row);
        });
        openPanel(L('libraryTitle'), list);
    }
    libraryBtn.addEventListener('click', openLibrary);

    // ---------- تثبيت التطبيق ----------
    const ua = window.navigator.userAgent || '';
    const isIos = /iphone|ipad|ipod/i.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isIosOtherBrowser = isIos && /crios|fxios|edgios/i.test(ua);
    function refreshInstall() {
        installBtn.hidden = standalone || !(installEvent || isIos);
    }
    window.addEventListener('beforeinstallprompt', (event) => {
        event.preventDefault();
        installEvent = event;
        refreshInstall();
    });
    window.addEventListener('appinstalled', () => { installEvent = null; refreshInstall(); });
    installBtn.addEventListener('click', async () => {
        if (installEvent) {
            const promptEvent = installEvent;
            installEvent = null;
            refreshInstall();
            try { await promptEvent.prompt(); await promptEvent.userChoice; } catch (error) { /* مش مهم */ }
            return;
        }
        const note = document.createElement('p');
        note.className = 'reader-menu-note reader-install-note';
        note.textContent = isIosOtherBrowser ? L('iosOpenSafari') : L('iosSteps');
        openPanel(L('installTitle'), note);
    });

    const init = async () => {
        document.body.classList.add(`bg-${prefs.bg}`);
        buildMenu();
        viewMenu.hidden = true;
        applyStaticLabels();
        updateHeading();
        refreshInstall();
        if (!navigator.onLine) {
            setStatus(tr('reader.offline', 'Reading requires an internet connection.'), true);
            return;
        }

        // مكتبة المستخدم: كل كتاب اشتراه (حتى لو جه جوه عرض) بيبقى تاب لوحده
        let rawLibrary = null;
        try {
            const { data } = await api.getLibrary();
            rawLibrary = Array.isArray(data) ? data : [];
        } catch (error) {
            console.error('Could not load the library for the reader:', error);
        }
        const seen = new Set();
        (rawLibrary || []).forEach((entry) => (entry.books || []).forEach((item) => {
            if (!item || seen.has(item.productId)) return;
            seen.add(item.productId);
            library.push(item);
        }));
        const libraryById = new Map(library.map((item) => [item.productId, item]));
        const readyIds = library.filter((item) => item.pageCount > 0).map((item) => item.productId);

        if (bookParam && !libraryById.has(bookParam)) {
            // الأدمن بيفتح كتاب من غير ما يكون اشتراه، أو المكتبة مفتحتش: بنفتح الكتاب لوحده
            owned = false;
            libraryBtn.hidden = true;
            books = [makeBook({ productId: bookParam })];
            renderTabs();
            await activate(books[0]);
            return;
        }
        if (!rawLibrary) {
            setStatus(tr('reader.couldNotLoadLibrary', 'Could not load your digital library right now.'), true);
            return;
        }
        if (!readyIds.length) {
            setStatus(L('emptyLibrary'));
            return;
        }

        const entry = entryParam ? (rawLibrary.find((item) => item.productId === entryParam) || null) : null;
        const entryIds = entry ? (entry.books || []).filter((item) => item.pageCount > 0).map((item) => item.productId) : [];
        let ids = [...new Set(readJson(OPEN_KEY, []).filter((id) => readyIds.includes(id)))];
        if (!ids.length) ids = readyIds.slice();
        entryIds.forEach((id) => { if (!ids.includes(id)) ids.push(id); });
        if (bookParam && readyIds.includes(bookParam) && !ids.includes(bookParam)) ids.push(bookParam);
        books = ids.map((id) => makeBook(libraryById.get(id)));

        let savedActive = '';
        try { savedActive = localStorage.getItem(ACTIVE_KEY) || ''; } catch (error) { /* مش مهم */ }
        let startId = '';
        if (bookParam && ids.includes(bookParam)) startId = bookParam;
        else if (entryIds.length) startId = entryIds.includes(savedActive) ? savedActive : entryIds[0];
        else if (ids.includes(savedActive)) startId = savedActive;
        const first = books.find((book) => book.productId === startId) || books[0];
        renderTabs();
        await activate(first);
    };

    init();
})();
