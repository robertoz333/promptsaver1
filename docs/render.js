(function() {
  'use strict';

  // Selezione degli elementi del DOM
  const languageSelect = document.getElementById('languageSelect');
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  const searchInput = document.getElementById('searchInput');
  const searchBtn = document.getElementById('searchBtn');
  const newCategoryInput = document.getElementById('newCategoryInput');
  const addCategoryBtn = document.getElementById('addCategoryBtn');
  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  const backupBtn = document.getElementById('backupBtn');
  const importFile = document.getElementById('importFile');
  const importBtn = document.getElementById('importBtn');
  const clearAllBtn = document.getElementById('clearAllBtn');
  const categoriesDropdown = document.getElementById('categories');
  const categoryBoxesContainer = document.getElementById('category-boxes-container');
  const promptsDisplayContainer = document.getElementById('prompts-display-container');

  let currentEdit = { categoryId: null, promptId: null };
  let currentLanguage = 'it';
  let currentTheme = 'dark';
  let historyStack = [];
  let futureStack = [];

  const translations = {
    en: {
      promptSaver: "Prompt Saver",
      favorites: "Favorites",
      newPrompt: "New Prompt",
      editPrompt: "Edit Prompt",
      title: "Title",
      purpose: "What is it for",
      description: "Description",
      tags: "Tags",
      add: "Add",
      save: "Save",
      backupImported: "Backup imported successfully!",
      backupImportError: "Error importing backup: ",
      promptTitlePurposeRequired: "Title, purpose, and description are required.",
      deletePromptConfirmation: "Are you sure you want to delete this prompt?",
      deleteCategoryConfirmation: "Are you sure you want to delete this category?",
      copySuccess: "Text copied to clipboard!",
      shareError: "Error during sharing: ",
      promptCopied: "Text copied to clipboard!",
      noFavoritesFound: "No favorites found.",
      searchResults: "Search Results",
      favoritesHeading: "Favorites",
      darkMode: "Dark Mode",
      lightMode: "Light Mode",
      addTag: "Add tag...",
      removeFromFavoritesConfirmation: "Remove this prompt from favorites?",
      searchPromptCategoryTag: "Search prompt, category or tag...",
      noResultsFound: "No results found.",
      addToFavorites: "Add to Favorites",
      increaseFont: "Increase Font"
    },
    it: {
      promptSaver: "Prompt Saver",
      favorites: "Preferiti",
      newPrompt: "Nuovo Prompt",
      editPrompt: "Modifica Prompt",
      title: "Titolo",
      purpose: "A cosa serve",
      description: "Descrizione",
      tags: "Tag",
      add: "Aggiungi",
      save: "Salva",
      backupImported: "Backup importato con successo!",
      backupImportError: "Errore durante l'importazione del backup: ",
      promptTitlePurposeRequired: "Il titolo, A cosa serve, e la descrizione sono obbligatori.",
      deletePromptConfirmation: "Sei sicuro di voler eliminare questo prompt?",
      deleteCategoryConfirmation: "Sei sicuro di voler eliminare questa categoria?",
      copySuccess: "Testo copiato negli appunti!",
      shareError: "Errore durante la condivisione: ",
      promptCopied: "Testo copiato negli appunti!",
      noFavoritesFound: "Nessun preferito trovato.",
      searchResults: "Risultati della ricerca",
      favoritesHeading: "Preferiti",
      darkMode: "Tema Scuro",
      lightMode: "Tema Chiaro",
      addTag: "Aggiungi tag...",
      removeFromFavoritesConfirmation: "Rimuovere questo prompt dai preferiti?",
      searchPromptCategoryTag: "Cerca prompt, categoria o tag...",
      noResultsFound: "Nessun risultato trovato.",
      addToFavorites: "Aggiungi ai Preferiti",
      increaseFont: "Aumenta Font"
    }
  };

  const quillToolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'align': [] }],
    ['blockquote', 'code-block'],
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    ['link', 'image', 'video'],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'font': [] }],
    ['clean']
  ];

  const quillNewPrompt = new Quill('#newPromptTextEditor', { theme: 'snow', modules: { toolbar: quillToolbarOptions } });
  const quillEditPrompt = new Quill('#editPromptTextEditor', { theme: 'snow', modules: { toolbar: quillToolbarOptions } });

  const categories = [];

  function translatePage() {
    document.querySelectorAll('[data-translate]').forEach(el => {
      const key = el.getAttribute('data-translate');
      el.textContent = translations[currentLanguage][key];
    });
    document.querySelectorAll('[data-placeholder]').forEach(el => {
      const key = el.getAttribute('data-placeholder');
      el.setAttribute('placeholder', translations[currentLanguage][key]);
    });
  }

  function sanitizeHTML(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    return tempDiv.textContent || tempDiv.innerText || '';
  }

  function generateUniqueId() {
    return '_' + Math.random().toString(36).substr(2, 9);
  }

  function saveToLocalStorage() {
    localStorage.setItem('categories', JSON.stringify(categories));
  }

  function sortAndSave() {
    categories.sort((a, b) => a.name.localeCompare(b.name, currentLanguage));
    categories.forEach(c => c.prompts.sort((x, y) => x.title.localeCompare(y.title, currentLanguage)));
    saveToLocalStorage();
  }

  function pushToHistory() {
    historyStack.push(JSON.stringify(categories));
    futureStack = [];
  }

  function applyTheme() {
    if (currentTheme === 'dark') {
      document.body.classList.remove('light-theme');
      themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> <span class="d-none d-sm-inline">Chiaro</span>';
      themeToggleBtn.setAttribute('title', translations[currentLanguage]['lightMode']);
    } else {
      document.body.classList.add('light-theme');
      themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i> <span class="d-none d-sm-inline">Scuro</span>';
      themeToggleBtn.setAttribute('title', translations[currentLanguage]['darkMode']);
    }
  }

  function loadFromLocalStorage() {
    const saved = localStorage.getItem('categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      parsed.forEach(cat => {
        cat.id = cat.id || generateUniqueId();
        cat.name = sanitizeHTML(cat.name);
        cat.prompts.forEach(p => {
          p.id = p.id || generateUniqueId();
          p.title = sanitizeHTML(p.title);
          p.purpose = sanitizeHTML(p.purpose || '');
          p.description = p.description || '';
          p.tags = p.tags || [];
          p.favorite = p.favorite || false;
        });
      });
      categories.push(...parsed);
      sortAndSave();
      renderCategories();
    }
  }

  function renderCategories() {
    sortAndSave();
    categoriesDropdown.innerHTML = '';
    categoryBoxesContainer.innerHTML = '';

    const favBtn = document.createElement('a');
    favBtn.className = 'dropdown-item text-danger font-weight-bold';
    favBtn.href = '#';
    favBtn.textContent = translations[currentLanguage]['favorites'];
    favBtn.onclick = e => { e.preventDefault(); toggleFavoritesView(); };
    categoriesDropdown.appendChild(favBtn);

    categories.forEach(cat => {
      const link = document.createElement('a');
      link.className = 'dropdown-item';
      link.href = '#';
      link.textContent = cat.name;
      link.onclick = e => { e.preventDefault(); toggleCategoryBox(cat.id); };
      categoriesDropdown.appendChild(link);

      const box = createCategoryBox(cat);
      box.style.display = 'none';
      categoryBoxesContainer.appendChild(box);
    });
  }

  function createCategoryBox(category) {
    const box = document.createElement('div');
    box.className = 'category-box';
    box.dataset.categoryId = category.id;

    const header = document.createElement('div');
    header.className = 'category-header d-flex flex-wrap align-items-center';

    const input = document.createElement('input');
    input.type = 'text';
    input.value = category.name;
    input.className = 'form-control mr-2 mb-2';
    input.readOnly = true;
    header.appendChild(input);

    const editBtn = createIconButton('info', 'edit', translations[currentLanguage]['editPrompt']);
    const saveBtn = createIconButton('success', 'save', translations[currentLanguage]['save'], true);
    const newBtn = createIconButton('success', 'plus', translations[currentLanguage]['newPrompt']);
    const delBtn = createIconButton('danger', 'trash', translations[currentLanguage]['deleteCategoryConfirmation']);

    newBtn.classList.add('btn-new');
    [editBtn, saveBtn, newBtn, delBtn].forEach(b => header.appendChild(b));
    box.appendChild(header);

    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'category-actions mt-3';
    actionsDiv.style.display = 'none';

    const btnEdit = createIconButton('info', 'edit', translations[currentLanguage]['edit']);
    const btnCopy = createIconButton('warning', 'copy', translations[currentLanguage]['copy']);
    const btnShare = createIconButton('primary', 'share-alt', translations[currentLanguage]['share']);
    const btnFavorite = createIconButton('favorite', 'star', translations[currentLanguage]['addToFavorites']);
    const btnDelete = createIconButton('danger', 'trash', translations[currentLanguage]['deletePromptConfirmation']);
    const btnFont = createIconButton('secondary', 'text-height', translations[currentLanguage]['increaseFont']);

    btnFavorite.classList.add('btn-favorite');
    actionsDiv.append(btnEdit, btnCopy, btnShare, btnFavorite, btnDelete, btnFont);
    box.appendChild(actionsDiv);
    box.actionsDiv = actionsDiv;

    newBtn.onclick = () => showNewPromptForm(category.id);
    editBtn.onclick = () => {
      input.readOnly = false;
      toggleButtons(editBtn, saveBtn);
    };
    saveBtn.onclick = () => {
      input.readOnly = true;
      toggleButtons(editBtn, saveBtn);
      category.name = sanitizeHTML(input.value);
      pushToHistory();
      sortAndSave();
      renderCategories();
    };
    delBtn.onclick = () => {
      if (confirm(translations[currentLanguage]['deleteCategoryConfirmation'])) {
        pushToHistory();
        const idx = categories.findIndex(c => c.id === category.id);
        if (idx !== -1) {
          categories.splice(idx, 1);
          sortAndSave();
          renderCategories();
        }
      }
    };

    const promptContainer = document.createElement('div');
    promptContainer.className = 'prompt-titles-container d-flex flex-wrap';
    const selectedPrompt = document.createElement('div');
    selectedPrompt.className = 'selected-prompt-container';

    category.prompts.forEach(prompt => {
      const pBtn = document.createElement('button');
      pBtn.className = 'btn btn-secondary mr-2 mb-2';
      pBtn.textContent = prompt.title;
      pBtn.onclick = () => {
        clearSearchResults();
        displaySelectedPrompt(pBtn, prompt, category.id);
      };
      promptContainer.appendChild(pBtn);
    });

    box.appendChild(promptContainer);
    box.appendChild(selectedPrompt);

    btnEdit.onclick = e => {
      e.stopPropagation();
      if (box.selectedPrompt) openEditModal(category.id, box.selectedPrompt.id);
    };
    btnCopy.onclick = e => {
      e.stopPropagation();
      if (box.selectedPrompt) copyPromptText(box.selectedPrompt);
    };
    btnShare.onclick = e => {
      e.stopPropagation();
      if (box.selectedPrompt) sharePrompt(box.selectedPrompt);
    };
    btnDelete.onclick = e => {
      e.stopPropagation();
      if (box.selectedPrompt && confirm(translations[currentLanguage]['deletePromptConfirmation'])) {
        deletePrompt(category.id, box.selectedPrompt.id);
      }
    };
    btnFont.onclick = e => {
      e.stopPropagation();
      if (box.selectedPrompt) {
        const txtDiv = box.querySelector('.display-prompt-text');
        increaseFontSize(txtDiv);
      }
    };
    btnFavorite.onclick = e => {
      e.stopPropagation();
      if (box.selectedPrompt) toggleFavorite(box.selectedPrompt, btnFavorite);
    };

    return box;
  }

  function createIconButton(color, icon, title, hidden = false) {
    const b = document.createElement('button');
    b.className = `btn btn-${color} btn-custom mb-2`;
    b.innerHTML = `<i class="fas fa-${icon}"></i>`;
    b.title = title;
    if (hidden) b.style.display = 'none';
    return b;
  }

  function toggleButtons(btn1, btn2) {
    if (btn1.style.display === 'none') {
      btn1.style.display = 'inline';
      btn2.style.display = 'none';
    } else {
      btn1.style.display = 'none';
      btn2.style.display = 'inline';
    }
  }

  function displaySelectedPrompt(btn, prompt, catId) {
    const box = btn.closest('.category-box');
    const selContainer = box.querySelector('.selected-prompt-container');
    selContainer.innerHTML = '';
    const pDiv = createPromptContent(prompt, catId);
    selContainer.appendChild(pDiv);
    box.selectedPrompt = prompt;
    btn.parentElement.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    box.actionsDiv.style.display = 'block';
    const favBtn = box.actionsDiv.querySelector('.btn-favorite');
    favBtn.innerHTML = prompt.favorite ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
    favBtn.title = prompt.favorite
      ? translations[currentLanguage]['removeFromFavoritesConfirmation']
      : translations[currentLanguage]['addToFavorites'];
  }

  function createPromptContent(prompt, catId) {
    const div = document.createElement('div');
    div.className = 'prompt-content';

    const h4 = document.createElement('h4');
    h4.innerHTML = prompt.title;
    div.appendChild(h4);

    const pPurpose = document.createElement('p');
    pPurpose.innerHTML = `<strong>${translations[currentLanguage]['purpose']}:</strong> ${prompt.purpose}`;
    div.appendChild(pPurpose);

    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'tags-container mb-2';
    prompt.tags.forEach(t => {
      const s = document.createElement('span');
      s.className = 'tag';
      s.textContent = t;
      tagsContainer.appendChild(s);
    });
    div.appendChild(tagsContainer);

    const desc = document.createElement('div');
    desc.className = 'display-prompt-text';
    desc.innerHTML = prompt.description;
    div.appendChild(desc);
    return div;
  }

  function copyPromptText(prompt) {
    const tmp = document.createElement('div');
    tmp.innerHTML = prompt.description;
    const txt = tmp.textContent || tmp.innerText || '';
    navigator.clipboard.writeText(txt).then(() => alert(translations[currentLanguage]['copySuccess']));
  }

  function toggleCategoryBox(id) {
    clearSearchResults();
    const allBoxes = document.querySelectorAll('.category-box');
    allBoxes.forEach(b => {
      if (b.dataset.categoryId === id) {
        const show = b.style.display !== 'block';
        b.style.display = show ? 'block' : 'none';
        if (show) {
          allBoxes.forEach(other => {
            if (other !== b) {
              other.style.display = 'none';
              other.selectedPrompt = null;
              if (other.actionsDiv) other.actionsDiv.style.display = 'none';
            }
          });
        } else {
          b.selectedPrompt = null;
          if (b.actionsDiv) b.actionsDiv.style.display = 'none';
        }
      } else {
        b.style.display = 'none';
        b.selectedPrompt = null;
        if (b.actionsDiv) b.actionsDiv.style.display = 'none';
      }
    });
  }

  function showNewPromptForm(id) {
    quillNewPrompt.setContents([]);
    initTagsInput('newPromptTags');
    $('#newPromptModal').modal('show');
    $('#newPromptForm').off('submit').on('submit', e => {
      e.preventDefault();
      const title = document.getElementById('promptTitle').value.trim();
      const purpose = document.getElementById('promptPurpose').value.trim();
      const desc = quillNewPrompt.root.innerHTML.trim();
      const tags = getTags('newPromptTags');
      if (title && purpose && desc) {
        const c = categories.find(x => x.id === id);
        c.prompts.push({
          id: generateUniqueId(),
          title: sanitizeHTML(title),
          purpose: sanitizeHTML(purpose),
          description: desc,
          tags: tags.map(sanitizeHTML),
          favorite: false
        });
        pushToHistory();
        sortAndSave();
        renderCategories();
        toggleCategoryBox(id);
        const box = document.querySelector(`.category-box[data-category-id="${id}"]`);
        const pTitles = box.querySelectorAll('.prompt-titles-container .btn');
        pTitles.forEach(bt => { if (bt.textContent === title) bt.click(); });
        $('#newPromptModal').modal('hide');
        document.getElementById('promptTitle').value = '';
        document.getElementById('promptPurpose').value = '';
        quillNewPrompt.setContents([]);
        resetTags('newPromptTags');
      } else {
        alert(translations[currentLanguage]['promptTitlePurposeRequired']);
      }
    });
  }

  function deletePrompt(catId, promptId) {
    const c = categories.find(cc => cc.id === catId);
    if (!c) return;
    const idx = c.prompts.findIndex(p => p.id === promptId);
    if (idx !== -1) {
      pushToHistory();
      c.prompts.splice(idx, 1);
      sortAndSave();
      renderCategories();
    }
  }

  function clearSearchResults() { promptsDisplayContainer.innerHTML = ''; }

  function searchPrompts() {
    const q = searchInput.value.toLowerCase().trim();
    promptsDisplayContainer.innerHTML = '';
    const h2 = document.createElement('h2');
    h2.textContent = translations[currentLanguage]['searchResults'];
    promptsDisplayContainer.appendChild(h2);

    let found = false;
    categories.forEach(c => {
      c.prompts.forEach(p => {
        const t = (p.description || '').toLowerCase();
        const cat = c.name.toLowerCase();
        const tg = p.tags.map(x => x.toLowerCase());
        if (p.title.toLowerCase().includes(q) || t.includes(q) || cat.includes(q) || tg.includes(q)) {
          found = true;
          promptsDisplayContainer.appendChild(createPromptContent(p, c.id));
        }
      });
    });
    if (!found) {
      const msg = document.createElement('p');
      msg.textContent = translations[currentLanguage]['noResultsFound'];
      promptsDisplayContainer.appendChild(msg);
    }
    document.querySelectorAll('.category-box').forEach(b => b.style.display = 'none');
  }

  function initTagsInput(id, initial = []) {
    const container = document.getElementById(id);
    container.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = translations[currentLanguage]['addTag'] || 'Aggiungi tag...';
    container.appendChild(input);
    const tags = [...initial];
    function addTag(t) {
      if (t && !tags.includes(t)) {
        tags.push(t);
        const sp = document.createElement('span');
        sp.className = 'tag';
        sp.textContent = t;
        const rm = document.createElement('i');
        rm.className = 'fas fa-times';
        rm.onclick = () => {
          tags.splice(tags.indexOf(t), 1);
          container.removeChild(sp);
        };
        sp.appendChild(rm);
        container.insertBefore(sp, input);
        input.value = '';
      }
    }
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        addTag(input.value.trim());
      }
    });
  }

  function getTags(id) {
    return Array.from(document.getElementById(id).querySelectorAll('.tag'))
      .map(t => t.childNodes[0].nodeValue.trim());
  }

  function resetTags(id) { document.getElementById(id).innerHTML = ''; }

  function sharePrompt(prompt) {
    if (navigator.share) {
      navigator.share({ title: prompt.title, text: prompt.description })
        .catch(err => console.error(translations[currentLanguage]['shareError'], err));
    } else {
      const tmp = document.createElement('div');
      tmp.innerHTML = prompt.description;
      const plain = tmp.textContent || tmp.innerText || '';
      navigator.clipboard.writeText(`${prompt.title}\n\n${plain}`)
        .then(() => alert(translations[currentLanguage]['promptCopied']));
    }
  }

  function toggleFavorite(prompt, btn) {
    pushToHistory();
    prompt.favorite = !prompt.favorite;
    saveToLocalStorage();
    btn.innerHTML = prompt.favorite ? '<i class="fas fa-star"></i>' : '<i class="far fa-star"></i>';
  }

  function toggleFavoritesView() {
    clearSearchResults();
    document.querySelectorAll('.category-box').forEach(b => b.style.display = 'none');
    renderFavorites();
  }

  function renderFavorites() {
    promptsDisplayContainer.innerHTML = '';
    const h2 = document.createElement('h2');
    h2.textContent = translations[currentLanguage]['favoritesHeading'];
    promptsDisplayContainer.appendChild(h2);

    const favs = [];
    categories.forEach(c => c.prompts.forEach(p => { if (p.favorite) favs.push({ p, catId: c.id }); }));
    favs.sort((a, b) => a.p.title.localeCompare(b.p.title, currentLanguage));
    if (favs.length === 0) {
      const msg = document.createElement('p');
      msg.textContent = translations[currentLanguage]['noFavoritesFound'];
      promptsDisplayContainer.appendChild(msg);
      return;
    }
    const favTitles = document.createElement('div');
    favTitles.className = 'favorite-titles-container d-flex flex-wrap';
    const favSelected = document.createElement('div');
    favSelected.className = 'selected-favorite-container';

    favs.forEach(item => {
      const btn = document.createElement('button');
      btn.className = 'btn btn-secondary mr-2 mb-2';
      btn.textContent = item.p.title;
      btn.onclick = () => displayFavoritePrompt(item.p, item.catId, favSelected);
      favTitles.appendChild(btn);
    });
    promptsDisplayContainer.appendChild(favTitles);
    promptsDisplayContainer.appendChild(favSelected);
  }

  function displayFavoritePrompt(prompt, catId, container) {
    container.innerHTML = '';
    container.appendChild(createPromptContent(prompt, catId));
    const actions = document.createElement('div');
    actions.className = 'favorite-actions mt-3';
    const eBtn = createIconButton('info', 'edit', translations[currentLanguage]['edit']);
    const cBtn = createIconButton('warning', 'copy', translations[currentLanguage]['copy']);
    const sBtn = createIconButton('primary', 'share-alt', translations[currentLanguage]['share']);
    const fBtn = createIconButton('secondary', 'text-height', translations[currentLanguage]['increaseFont']);
    const rmBtn = createIconButton('danger', 'trash', translations[currentLanguage]['removeFromFavoritesConfirmation']);
    actions.append(eBtn, cBtn, sBtn, fBtn, rmBtn);
    container.appendChild(actions);

    eBtn.onclick = e => {
      e.stopPropagation();
      openEditModal(catId, prompt.id);
    };
    cBtn.onclick = e => {
      e.stopPropagation();
      copyPromptText(prompt);
    };
    sBtn.onclick = e => {
      e.stopPropagation();
      sharePrompt(prompt);
    };
    fBtn.onclick = e => {
      e.stopPropagation();
      const d = container.querySelector('.display-prompt-text');
      increaseFontSize(d);
    };
    rmBtn.onclick = e => {
      e.stopPropagation();
      if (confirm(translations[currentLanguage]['removeFromFavoritesConfirmation'])) {
        pushToHistory();
        prompt.favorite = false;
        sortAndSave();
        renderFavorites();
      }
    };
  }

  function increaseFontSize(el) {
    const size = parseInt(window.getComputedStyle(el).fontSize);
    el.style.fontSize = (size + 1) + 'px';
  }

  function undoAction() {
    if (historyStack.length > 0) {
      futureStack.push(JSON.stringify(categories));
      const prev = historyStack.pop();
      categories.length = 0;
      categories.push(...JSON.parse(prev));
      saveToLocalStorage();
      renderCategories();
    }
  }

  function redoAction() {
    if (futureStack.length > 0) {
      historyStack.push(JSON.stringify(categories));
      const nxt = futureStack.pop();
      categories.length = 0;
      categories.push(...JSON.parse(nxt));
      saveToLocalStorage();
      renderCategories();
    }
  }

  function openEditModal(catId, pId) {
    currentEdit.categoryId = catId;
    currentEdit.promptId = pId;
    const c = categories.find(cc => cc.id === catId);
    const p = c.prompts.find(pp => pp.id === pId);
    document.getElementById('editPromptTitle').value = p.title;
    document.getElementById('editPromptPurpose').value = p.purpose || '';
    quillEditPrompt.root.innerHTML = p.description;
    initTagsInput('editPromptTags', p.tags);
    $('#editPromptModal').modal('show');
  }

  $('#editPromptForm').on('submit', e => {
    e.preventDefault();
    const title = document.getElementById('editPromptTitle').value.trim();
    const purpose = document.getElementById('editPromptPurpose').value.trim();
    const desc = quillEditPrompt.root.innerHTML.trim();
    const tags = getTags('editPromptTags');
    if (title && purpose && desc) {
      const c = categories.find(cc => cc.id === currentEdit.categoryId);
      const p = c.prompts.find(pp => pp.id === currentEdit.promptId);
      pushToHistory();
      p.title = sanitizeHTML(title);
      p.purpose = sanitizeHTML(purpose);
      p.description = desc;
      p.tags = tags.map(sanitizeHTML);
      sortAndSave();
      renderCategories();
      toggleCategoryBox(c.id);
      const box = document.querySelector(`.category-box[data-category-id="${c.id}"]`);
      const allBtns = box.querySelectorAll('.prompt-titles-container .btn');
      allBtns.forEach(b => { if (b.textContent === p.title) b.click(); });
      $('#editPromptModal').modal('hide');
    } else {
      alert(translations[currentLanguage]['promptTitlePurposeRequired']);
    }
  });

  languageSelect.addEventListener('change', function() {
    currentLanguage = this.value;
    translatePage();
    renderCategories();
  });

  themeToggleBtn.addEventListener('click', function() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('theme', currentTheme);
    applyTheme();
  });

  searchBtn.onclick = searchPrompts;
  searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') searchPrompts(); });

  addCategoryBtn.onclick = () => {
    const name = newCategoryInput.value.trim();
    if (name) {
      pushToHistory();
      categories.push({ id: generateUniqueId(), name: sanitizeHTML(name), prompts: [] });
      sortAndSave();
      renderCategories();
      toggleCategoryBox(categories[categories.length - 1].id);
      newCategoryInput.value = '';
    }
  };

  // Funzione di backup corretta
  backupBtn.addEventListener('click', () => {
    if (categories.length === 0) {
      alert('Nessun dato disponibile per il backup.');
      return;
    }

    try {
      const data = JSON.stringify(categories, null, 2); // Formattazione leggibile
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      alert('Backup eseguito con successo!');
    } catch (error) {
      console.error('Errore durante il backup:', error);
      alert('Si è verificato un errore durante il backup.');
    }
  });

  importBtn.onclick = () => importFile.click();
  importFile.addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const data = JSON.parse(evt.target.result);
          data.forEach(cat => {
            cat.id = cat.id || generateUniqueId();
            cat.prompts.forEach(p => { p.id = p.id || generateUniqueId(); });
          });
          categories.length = 0;
          categories.push(...data);
          pushToHistory();
          sortAndSave();
          renderCategories();
          alert(translations[currentLanguage]['backupImported']);
        } catch (err) {
          alert(translations[currentLanguage]['backupImportError'] + err.message);
        }
      };
      reader.readAsText(file);
    }
  });

  clearAllBtn.onclick = () => {
    if (confirm("Sei sicuro di voler cancellare tutte le categorie e i prompt?")) {
      pushToHistory();
      categories.length = 0;
      sortAndSave();
      renderCategories();
    }
  };

  undoBtn.onclick = undoAction;
  redoBtn.onclick = redoAction;

  let savedTheme = localStorage.getItem('theme');
  if (savedTheme) currentTheme = savedTheme;
  applyTheme();
  loadFromLocalStorage();
  pushToHistory();
  translatePage();

})();





// pwa code

if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("service-worker.js")
    .then(() => console.log("Service Worker registrato!"))
    .catch((error) => console.error("Errore Service Worker:", error));
}
