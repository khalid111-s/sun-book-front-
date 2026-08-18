// =========================================
// إدارة أكتر من حساب admin محفوظين في نفس المتصفح، والتبديل بينهم من غير ما تعمل logout
// مستخدم في admin-login.html (شاشة الدخول) و admin.html (لوحة التحكم)
// =========================================

const ADMIN_ACCOUNTS_KEY = 'sunbook_admin_accounts';

// بيرجع كل الحسابات المحفوظة (array فاضية لو مفيش حاجة)
function getSavedAdminAccounts() {
    try {
        const raw = localStorage.getItem(ADMIN_ACCOUNTS_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

// بيحفظ/يحدّث حساب (بالإيميل كمفتاح فريد) في القايمة المحفوظة
function saveAdminAccount({ _id, name, email, token }) {
    if (!email || !token) return;
    const accounts = getSavedAdminAccounts().filter((a) => a.email !== email);
    accounts.push({ _id, name, email, token });
    localStorage.setItem(ADMIN_ACCOUNTS_KEY, JSON.stringify(accounts));
}

// بيشيل حساب من القايمة المحفوظة (لما تعمل "Sign out" منه تحديدًا)
function removeAdminAccount(email) {
    const accounts = getSavedAdminAccounts().filter((a) => a.email !== email);
    localStorage.setItem(ADMIN_ACCOUNTS_KEY, JSON.stringify(accounts));
    return accounts;
}

// بيخلي الحساب ده هو الـ session النشط دلوقتي (من غير ما يلمس القايمة المحفوظة)
function activateAdminAccount(account) {
    localStorage.setItem('sunbook_token', account.token);
    localStorage.setItem('sunbook_username', account.name || account.email);
    localStorage.setItem('sunbook_user_id', account._id || '');
}

function getActiveAdminEmail() {
    const accounts = getSavedAdminAccounts();
    const activeToken = localStorage.getItem('sunbook_token');
    const match = accounts.find((a) => a.token === activeToken);
    return match ? match.email : null;
}
