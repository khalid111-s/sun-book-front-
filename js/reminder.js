/* =========================================
   SunBook — Membership Reminder
   1) Bottom Snackbar: تذكير سفلي يظهر بعد 15 ثانية أو أول إضافة للسلة
   2) Cart Nudge: كارت تذكير داخل ملخص السلة للزائر غير المسجل
   ========================================= */
(function () {
    'use strict';

    var SESSION_KEY = 'sunbook_reminder_shown';       // مرة واحدة في الجلسة
    var LATER_KEY = 'sunbook_reminder_later_until';   // لو داس "لاحقًا": 7 أيام
    var LATER_MS = 7 * 24 * 60 * 60 * 1000;
    var SHOW_AFTER_MS = 15000;
    var EXCLUDED = /(checkout|login|forgot-password|reset-password|admin|reader|booking-details|profile|404|cart)/i;

    var ICON_BELL = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>';
    var ICON_ARROW = '<svg class="rm-arrow" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>';
    var ICON_X = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

    var FALLBACK = {
        'reminder.title': 'Membership reminder',
        'reminder.snackText': 'Your 5% discount is still waiting on your first order',
        'reminder.snackSub': 'Sign up free and activate it in seconds',
        'reminder.activate': 'Activate discount',
        'reminder.later': 'Later',
        'reminder.nudgeTitle': 'One step left to save {amount}',
        'reminder.nudgeBtn': 'Activate 5% discount',
        'reminder.step1': 'Create an account',
        'reminder.step2': 'Discount applies',
        'reminder.badge': '5% OFF'
    };

    function t(key) {
        try {
            var v = window.SunBookI18n && window.SunBookI18n.t(key);
            if (v && v !== key) return v;
        } catch (e) { /* ignore */ }
        return FALLBACK[key] || key;
    }
    function store(kind) { try { return window[kind]; } catch (e) { return null; } }
    function get(kind, k) { try { return store(kind).getItem(k); } catch (e) { return null; } }
    function set(kind, k, v) { try { store(kind).setItem(k, v); } catch (e) { /* ignore */ } }

    function isGuest() {
        return !get('localStorage', 'sunbook_username') && !get('localStorage', 'sunbook_token');
    }
    function esc(s) {
        return String(s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    // الزرار بيودي لتسجيل حساب جديد وبعدها يرجّع المستخدم لنفس الصفحة
    function goRegister(ev) {
        var back = (location.pathname.split('/').pop() || 'index.html') + location.search;
        set('localStorage', 'sunbook_redirect_after_login', back);
        if (ev && ev.currentTarget && ev.currentTarget.tagName === 'A') return; // اللينك يكمّل لوحده
        location.href = 'login.html?tab=register';
    }

    /* ---------------- Bottom Snackbar ---------------- */
    var snack = null;
    var timer = null;

    function canShowSnack() {
        if (!isGuest()) return false;
        if (EXCLUDED.test(location.pathname)) return false;
        if (get('sessionStorage', SESSION_KEY)) return false;
        var until = parseInt(get('localStorage', LATER_KEY) || '0', 10);
        if (until && Date.now() < until) return false;
        return true;
    }

    function hideSnack(dismissed) {
        if (!snack) return;
        var el = snack;
        snack = null;
        if (dismissed) set('localStorage', LATER_KEY, String(Date.now() + LATER_MS));
        el.classList.remove('rm-in');
        document.removeEventListener('keydown', onKey);
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 350);
    }
    function onKey(e) { if (e.key === 'Escape') hideSnack(true); }

    function showSnack() {
        if (snack || !canShowSnack()) return;
        if (document.hidden) {
            document.addEventListener('visibilitychange', function once() {
                if (!document.hidden) { document.removeEventListener('visibilitychange', once); showSnack(); }
            });
            return;
        }
        set('sessionStorage', SESSION_KEY, '1');

        var el = document.createElement('div');
        el.className = 'rm-snack';
        el.setAttribute('role', 'status');
        el.setAttribute('aria-live', 'polite');
        el.innerHTML =
            '<div class="rm-snack-main">' +
                '<span class="rm-icon">' + ICON_BELL + '</span>' +
                '<div class="rm-body">' +
                    '<span class="rm-eyebrow" data-k="reminder.title">' + esc(t('reminder.title')) + '</span>' +
                    '<p class="rm-text" data-k="reminder.snackText">' + esc(t('reminder.snackText')) + '</p>' +
                    '<p class="rm-sub" data-k="reminder.snackSub">' + esc(t('reminder.snackSub')) + '</p>' +
                '</div>' +
            '</div>' +
            '<div class="rm-actions">' +
                '<a class="rm-cta" href="login.html?tab=register"><span data-k="reminder.activate">' + esc(t('reminder.activate')) + '</span>' + ICON_ARROW + '</a>' +
                '<button type="button" class="rm-later">' + ICON_X + '<span data-k="reminder.later">' + esc(t('reminder.later')) + '</span></button>' +
            '</div>' +
            '<span class="rm-progress" aria-hidden="true"><i></i></span>';

        el.querySelector('.rm-cta').addEventListener('click', goRegister);
        el.querySelector('.rm-later').addEventListener('click', function () { hideSnack(true); });
        // شريط التقدم هو اللي بيقفل الإشعار لوحده بعد 8 ثواني (وبيقف لما المستخدم يلمسه)
        el.querySelector('.rm-progress i').addEventListener('animationend', function () { hideSnack(false); });
        el.addEventListener('touchstart', function () { el.classList.add('rm-paused'); }, { passive: true });
        el.addEventListener('touchend', function () { el.classList.remove('rm-paused'); }, { passive: true });
        el.addEventListener('touchcancel', function () { el.classList.remove('rm-paused'); }, { passive: true });

        document.body.appendChild(el);
        snack = el;
        document.addEventListener('keydown', onKey);
        void el.offsetWidth;
        el.classList.add('rm-in');
    }

    function initSnack() {
        if (!canShowSnack()) return;
        timer = setTimeout(showSnack, SHOW_AFTER_MS);
        document.addEventListener('sunbook:cartAdded', function () {
            clearTimeout(timer);
            setTimeout(showSnack, 700);
        });
    }

    /* ---------------- Cart Nudge ---------------- */
    var lastNudge = null;

    function renderNudge(d) {
        var box = document.querySelector('.cart-summary');
        if (!box) return;
        var old = box.querySelector('.rm-nudge');
        if (old) old.remove();
        if (!d || !d.guest) return;
        lastNudge = d;

        var el = document.createElement('div');
        el.className = 'rm-nudge';
        el.innerHTML =
            '<div class="rm-nudge-head">' +
                '<span class="rm-icon">' + ICON_BELL + '</span>' +
                '<span class="rm-eyebrow">' + esc(t('reminder.title')) + '</span>' +
                '<span class="rm-badge">' + esc(t('reminder.badge')) + '</span>' +
            '</div>' +
            '<h4 class="rm-nudge-title">' + esc(t('reminder.nudgeTitle').replace('{amount}', d.saving)) + '</h4>' +
            '<div class="rm-nudge-total"><s>' + esc(d.before) + '</s>' + ICON_ARROW + '<strong>' + esc(d.after) + '</strong></div>' +
            '<a class="rm-cta rm-cta-block" href="login.html?tab=register"><span>' + esc(t('reminder.nudgeBtn')) + '</span>' + ICON_ARROW + '</a>' +
            '<ol class="rm-steps">' +
                '<li><b>1</b><span>' + esc(t('reminder.step1')) + '</span></li>' +
                '<li class="rm-steps-sep">' + ICON_ARROW + '</li>' +
                '<li><b>2</b><span>' + esc(t('reminder.step2')) + '</span></li>' +
            '</ol>';
        el.querySelector('.rm-cta').addEventListener('click', goRegister);
        box.insertBefore(el, box.firstChild);
    }

    document.addEventListener('sunbook:cartSummary', function (e) { renderNudge(e.detail); });

    // تحديث النصوص لو المستخدم بدّل اللغة
    document.addEventListener('sunbook:langChanged', function () {
        if (snack) {
            snack.querySelectorAll('[data-k]').forEach(function (n) { n.textContent = t(n.getAttribute('data-k')); });
        }
        if (lastNudge && document.querySelector('.rm-nudge')) renderNudge(lastNudge);
    });

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initSnack);
    else initSnack();
})();
