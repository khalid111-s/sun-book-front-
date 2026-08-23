window.sunbookComponents = window.sunbookComponents || {};

function loadComponent(targetSelector, componentName) {
  const target = document.querySelector(targetSelector);
  if (!target) return;

  if (window.sunbookComponents[componentName]) {
    target.innerHTML = window.sunbookComponents[componentName];
    // بعد ما نحقن الهيدر/الفوتر، لازم نطبّق الترجمة عليهم فورًا لو نظام
    // اللغة (i18n.js) محمّل، لأنهم مش موجودين في الصفحة وقت التحميل الأول
    if (window.SunbookI18n) window.SunbookI18n.apply();
    return;
  }

  const script = document.createElement('script');
  script.src = `components/${componentName}.js`;
  script.onload = () => {
    if (window.sunbookComponents[componentName]) {
      target.innerHTML = window.sunbookComponents[componentName];
      if (window.SunbookI18n) window.SunbookI18n.apply();
    }
  };
  document.body.appendChild(script);
}

document.addEventListener('DOMContentLoaded', () => {
  loadComponent('[data-include="components/header.html"]', 'header');
  loadComponent('[data-include="components/footer.html"]', 'footer');
});
