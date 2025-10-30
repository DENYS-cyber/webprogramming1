/* script.js
   Основний файл JS для проекту "Креативний щоденник".
   Містить:
    - AppModule (Module pattern) — ініціалізація сторінок
    - NotesModule (IIFE returning API) — робота з нотатками (LocalStorage)
    - ValidatorModule — Constraint API + додаткові перевірки (custom)
    - Observer (pub/sub)
    - Behavior (датa-атрибути) прості
    - Search implementations: indexOf, RegExp, jQuery example
*/

/* ========== Observer (простіший Pub/Sub) ========== */
const Observer = (function(){
  const ev = {};
  return {
    subscribe: (name, fn) => { (ev[name] = ev[name] || []).push(fn); },
    publish: (name, data) => { (ev[name] || []).forEach(fn => { try{ fn(data); }catch(e){console.error(e)} }); }
  };
})();

/* ========== NotesModule (IIFE, повертає API) ========== */
const NotesModule = (function(){
  const STORAGE_KEY = 'cj_notes_v1';
  function _read(){
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch(e){ return []; }
  }
  function _write(arr){ localStorage.setItem(STORAGE_KEY, JSON.stringify(arr)); }

  function list(){ return _read(); }
  function add(note){
    const arr = _read();
    arr.unshift(Object.assign({}, note, { id: Date.now() }));
    _write(arr);
    Observer.publish('notes:changed', arr);
  }
  function remove(id){
    let arr = _read();
    arr = arr.filter(n => n.id !== id);
    _write(arr);
    Observer.publish('notes:changed', arr);
  }
  function clear(){ _write([]); Observer.publish('notes:changed', []); }

  return { list, add, remove, clear };
})();

/* ========== ValidatorModule (Module) ========== */
const ValidatorModule = (function(){
  // Перевірка через HTML5 Constraint API + додаткові правила
  function validateForm(form){
    if(!form) return { ok:false, message: 'Форма не знайдена' };
    if(!form.checkValidity()){
      const firstInvalid = form.querySelector(':invalid');
      return { ok:false, message: firstInvalid.validationMessage || 'Перевірте поля форми' };
    }
    // custom checks: content не має бути лише пробілами, no banned words
    const title = form.querySelector('[name="title"]').value.trim();
    const content = form.querySelector('[name="content"]').value.trim();
    const mood = form.querySelector('[name="mood"]').value;

    if(title.length < 2) return { ok:false, message: 'Заголовок занадто короткий' };
    if(content.length < 5) return { ok:false, message: 'Текст нотатки занадто короткий' };
    if(!mood) return { ok:false, message: 'Оберіть настрій' };

    const banned = ['spam','testtest'];
    for(const b of banned){
      if(title.toLowerCase().includes(b) || content.toLowerCase().includes(b)) return { ok:false, message: 'Неможливий вміст у нотатці' };
    }

    return { ok:true };
  }

  return { validateForm };
})();

/* ========== Behavior pattern: делегування для data-behavior (маленький корисний патерн) ========== */
(function Behavior(){
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-behavior="copy-text"]');
    if(!btn) return;
    const selector = btn.dataset.target;
    if(!selector) return;
    const el = document.querySelector(selector);
    if(!el) return;
    navigator.clipboard?.writeText(el.textContent.trim()).then(()=> {
      btn.textContent = 'Скопійовано ✓';
      setTimeout(()=> btn.textContent = 'Копіювати', 1200);
    }).catch(()=> { alert('Не вдалось скопіювати'); });
  });
})();

/* ========== AppModule (ініціалізація, модуль) ========== */
const AppModule = (function(){
  const page = document.body.dataset.page || 'home';

  function init(){
    _bindThemeToggles();
    _initCommon();
    switch(page){
      case 'home': _initHome(); break;
      case 'inspiration': _initInspiration(); break;
      case 'notes': _initNotes(); break;
      case 'search': _initSearch(); break;
      default: break;
    }
  }

  /* Загальні для всіх сторінок */
  function _initCommon(){
    // Підписка на зміни нотаток, щоб синхронно оновлювати інтерфейс
    Observer.subscribe('notes:changed', (arr) => {
      // якщо на notes page - перемальовуємо
      if(page === 'notes') renderSavedNotes(arr);
    });

    // Ініціалізація теми зі сховища
    const theme = localStorage.getItem('cj_theme');
    if(theme === 'dark'){ document.body.classList.add('theme--dark'); _setThemeInputs(true); }
    else { document.body.classList.remove('theme--dark'); _setThemeInputs(false); }
  }

  function _bindThemeToggles(){
    // Є 4 перемикача на різних сторінках; слухаємо всі
    document.querySelectorAll('#themeToggle, #themeToggle2, #themeToggle3, #themeToggle4').forEach(inp => {
      inp?.addEventListener('change', (e) => {
        const checked = e.target.checked;
        document.body.classList.toggle('theme--dark', checked);
        localStorage.setItem('cj_theme', checked ? 'dark' : 'light');
        // синхронізуємо усі інпути
        _setThemeInputs(checked);
      });
    });
  }

  function _setThemeInputs(val){
    document.querySelectorAll('#themeToggle, #themeToggle2, #themeToggle3, #themeToggle4').forEach(i => { if(i) i.checked = !!val; });
  }

  /* Home page minimal actions (if any) */
  function _initHome(){ /* currently no dynamic for home */ }

  /* Inspiration page */
  function _initInspiration(){
    // цитати та prompts
    const quotes = [
      "Творчість — це інтелект, який розважається. — Альберт Ейнштейн",
      "Натхнення існує, але воно приходить під час роботи. — Пабло Пікассо",
      "Кожний день — нова ідея.",
      "Малюй першим, думай потім."
    ];
    const prompts = [
      { title: "Експеримент", text: "Змішай 2 несумісні речі і намалюй їх." },
      { title: "Слухай", text: "Опиши звук, який чуєш зараз, у кольорах." },
      { title: "Памʼять", text: "Намалюй місце з дитинства — без людей." },
      { title: "Коротко", text: "Напиши 6 слів, що описують сьогоднішній день." },
      { title: "Колаж", text: "Зроби міні-колаж з 3 предметів поблизу." }
    ];

    const qEl = document.getElementById('inspQuote');
    const btn = document.getElementById('inspNew');
    const copyBtn = document.getElementById('copyQuote');
    const cardsWrap = document.getElementById('promptCards');
    if(!qEl || !cardsWrap) return;

    function renderQuote(){
      qEl.textContent = quotes[Math.floor(Math.random()*quotes.length)];
    }
    renderQuote();
    btn.addEventListener('click', () => { renderQuote(); qEl.classList.add('flash'); setTimeout(()=>qEl.classList.remove('flash'),700); });

    copyBtn.addEventListener('click', () => {
      navigator.clipboard?.writeText(qEl.textContent || '').then(()=> {
        copyBtn.textContent = 'Скопійовано ✓';
        setTimeout(()=> copyBtn.textContent = 'Копіювати', 1200);
      });
    });

    function renderPrompts(){
      cardsWrap.innerHTML = '';
      // перемішуємо та беремо 3
      const arr = prompts.sort(()=>0.5 - Math.random()).slice(0,3);
      arr.forEach(p => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `<div class="card__title">${escapeHtml(p.title)}</div><div class="card__text">${escapeHtml(p.text)}</div>`;
        cardsWrap.appendChild(div);
      });
    }
    renderPrompts();
    document.getElementById('shufflePrompts')?.addEventListener('click', renderPrompts);
  }

  /* Notes page (форма + валідація + LocalStorage) */
  function _initNotes(){
    const form = document.getElementById('noteForm');
    const savedList = document.getElementById('savedList');
    const errEl = document.getElementById('formErrors');

    // Початкове рендерення
    renderSavedNotes(NotesModule.list());

    // Обробник submit: HTML5 + JS валідація (ValidatorModule)
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      errEl.textContent = '';
      const res = ValidatorModule.validateForm(form);
      if(!res.ok){
        errEl.textContent = res.message;
        return;
      }
      const note = {
        title: form.title.value.trim(),
        content: form.content.value.trim(),
        mood: form.mood.value,
        created: new Date().toISOString()
      };
      NotesModule.add(note);
      form.reset();
    });

    // Подія видалення (делегування)
    savedList?.addEventListener('click', (e) => {
      const btn = e.target.closest('.saved-notes__del');
      if(!btn) return;
      const id = Number(btn.dataset.id);
      if(!id) return;
      if(confirm('Видалити нотатку?')) NotesModule.remove(id);
    });
  }

  /* Search page initialization: indexOf, RegExp, jQuery example */
  function _initSearch(){
    // Зразкові документи / контент для пошуку (можна розширити)
    const docs = [
      { id:'home', title:'Головна', text: 'Креативний щоденник — місце для ідей, натхнення й нотаток.' },
      { id:'inspiration', title:'Натхнення', text: 'Цитати, творчі завдання та виклики для художників та письменників.' },
      // беремо нотатки з блоку (локальні збережені нотатки)
      ...NotesModule.list().map(n => ({ id: 'note:'+n.id, title: n.title, text: n.content }))
    ];

    const input = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    const btn = document.getElementById('searchBtn');
    const clear = document.getElementById('clearBtn');

    function renderResults(list){
      results.innerHTML = '';
      if(!list.length){ results.innerHTML = '<div class="card">Нічого не знайдено</div>'; return; }
      list.forEach(item => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `<div class="card__title">${escapeHtml(item.title)}</div>
                         <div class="card__text">${escapeHtml(truncate(item.text, 240))}</div>
                         <div class="card__meta">Джерело: ${escapeHtml(item.id)}</div>`;
        results.appendChild(div);
      });
    }

    btn?.addEventListener('click', () => {
      const q = (input.value || '').trim();
      const mode = document.querySelector('input[name="mode"]:checked')?.value || 'indexOf';
      if(!q){ renderResults([]); return; }

      if(mode === 'indexOf'){
        const found = docs.filter(d => d.text.toLowerCase().indexOf(q.toLowerCase()) !== -1 || d.title.toLowerCase().indexOf(q.toLowerCase()) !== -1);
        renderResults(found);
      } else if(mode === 'regex'){
        try{
          const re = new RegExp(q, 'i');
          const found = docs.filter(d => re.test(d.text) || re.test(d.title));
          renderResults(found);
        }catch(e){
          results.innerHTML = `<div class="card">Помилка регулярного виразу: ${escapeHtml(String(e.message))}</div>`;
        }
      } else if(mode === 'jquery'){
        // демонстрація: шукати по DOM (в даному випадку — по cached docs) за допомогою jQuery
        // Тут використаємо jQuery щоб показати приклад: знаходимо елементи в results через jQuery
        const found = docs.filter(d => d.text.toLowerCase().includes(q.toLowerCase()) || d.title.toLowerCase().includes(q.toLowerCase()));
        renderResults(found);
        // підсвічуємо знайдені слова в results за допомогою jQuery
        setTimeout(() => {
          const re = new RegExp('('+escapeRegExp(q)+')','ig');
          // знаходимо всі елементи .card__text і підсвічуємо
          $('.card__text').each(function(){
            const t = $(this).text();
            const newHtml = t.replace(re, '<mark>$1</mark>');
            $(this).html(newHtml);
          });
        }, 10);
      }
    });

    clear?.addEventListener('click', ()=>{ input.value=''; results.innerHTML=''; });
  }

  /* ========================= Utilities ========================= */
  function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }
  function truncate(s, n){ if(!s) return ''; return s.length>n? s.slice(0,n)+'...': s; }
  function escapeRegExp(s){ return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'); }

  /* Render saved notes list (for notes page) */
  function renderSavedNotes(arr){
    const list = document.getElementById('savedList');
    if(!list) return;
    const data = arr || NotesModule.list();
    list.innerHTML = '';
    if(!data.length){ list.innerHTML = '<li>Поки що немає нотаток</li>'; return; }
    data.forEach(n => {
      const li = document.createElement('li');
      li.innerHTML = `<div class="saved-notes__meta">${new Date(n.created).toLocaleString()} · <strong>${escapeHtml(n.mood)}</strong></div>
                      <div class="saved-notes__title">${escapeHtml(n.title)}</div>
                      <div class="saved-notes__content">${escapeHtml(truncate(n.content, 600))}</div>
                      <button class="saved-notes__del" data-id="${n.id}">✖</button>`;
      list.appendChild(li);
    });
  }

  /* Public */
  return { init };
})();

/* Ініціація після завантаження DOM */
document.addEventListener('DOMContentLoaded', () => {
  AppModule.init();
});
