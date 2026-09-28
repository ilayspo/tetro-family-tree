(async () => {
  const data = await window.loadFamilyData();
  if (!data || !Array.isArray(data.people) || !data.people.length) { document.getElementById('person-count').textContent = '—'; document.getElementById('focus-name').textContent = 'הנתונים אינם זמינים כרגע. נסו לרענן את העמוד.'; return; }

  const people = new Map(data.people.map(person => [person.id, person]));
  let language = 'he';
  const labels = {
    he: { brand:'משפחת טטרו', treeTitle:'עץ המשפחה של משפחת טטרו', story:'הסיפור שלנו, בין הדורות', intro:'מכירים את המשפחה, אדם אחרי אדם.', count:'בני משפחה בעץ', search:'מחפשים מישהו במשפחה?', placeholder:'הקלידו שם פרטי או משפחה', reset:'חזרה לראש העץ', card:'כרטיס משפחתי', branches:'ענפי המשפחה', diagram:'תרשים העץ', viewing:'מסתכלים על', hint:'לחצו על שם כדי לעבור לענף שלו. אפשר לגלול או להגדיל בתוך התרשים.', footer:'מכירים קשר שצריך לתקן? ספרו לעילאי כדי שנעדכן את העץ.', admin:'ניהול', grandparents:'דור הסבים והסבתות', parentsGeneration:'דור ההורים', central:'במרכז המשפחה · קשרים ואחים', childrenGeneration:'דור הילדים', grandchildren:'דור הנכדים', focus:'במרכז העץ', memory:'לזכרו/ה', partner:'קשר הורי/זוגי', explore:'למעבר לענף', viewFamily:'לצפייה במשפחה', familyOf:'המשפחה של', parents:'הורים', partners:'זוגיות והורות משותפת', siblings:'אחים ואחיות', children:'ילדים', noRelations:'אין עדיין קשרים נוספים לאדם הזה בעץ.', back:'→ חזרה אל ', fromFamily:'יוצאים מהמשפחה של', chooseBranch:'בחרו ענף, ואז אדם להמשך המסע.', branchOf:'הענף של ', previous:'הדור הקודם והמשפחה שלו', familyWith:'המשפחה עם ', shared:'בן/בת זוג והילדים המשותפים', next:'הדור הבא', nextDescription:'ילדים והמשך המשפחה', siblingsDescription:'המשפחות שצמחו מאותו דור', noBranches:'אין עדיין ענפים נוספים לאדם הזה בעץ. אפשר לחפש מישהו אחר למעלה.', notFound:'לא מצאנו שם כזה בעץ', zoomIn:'הגדלה', zoomOut:'הקטנה', zoomReset:'איפוס תצוגה', relation:'קשר משפחתי', birth:'נולד/ה', death:'נפטר/ה', notKnown:'לא צוין', current:'קשר נוכחי', past:'קשר קודם', married:'נשואים', partnered:'בני זוג', divorced:'גרושים', separated:'פרודים', former:'קשר קודם', unknown:'סוג קשר לא ידוע', viewsLabel:'איך להציג את המשפחה?' }
  };
  const t = key => labels[language][key];
  const nameOf = id => people.get(id)?.['name_' + language] || people.get(id)?.name_he || '';
  const photo = (id, size='small') => {
    const person = people.get(id);
    const node = document.createElement('span'); node.className = 'avatar avatar-' + size;
    if (person.photo_url) { const image = document.createElement('img'); image.src = person.photo_url; image.alt = ''; image.loading = 'lazy'; node.append(image); }
    else { node.textContent = nameOf(id).trim().charAt(0) || '•'; node.setAttribute('aria-hidden','true'); }
    return node;
  };
  const families = data.families;
  const icons = {
    parents:'<circle cx="8" cy="7" r="2.3"/><circle cx="16" cy="7" r="2.3"/><path d="M3 19v-3a5 5 0 0 1 10 0v3M11 19v-3a5 5 0 0 1 10 0v3"/>',
    children:'<circle cx="12" cy="6" r="2.5"/><path d="M7 21v-5a5 5 0 0 1 10 0v5M4 13l3-2m13 2-3-2"/>',
    partner:'<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
    divorced:'<path d="M3 15a5 5 0 0 0 8-7M14 8a5 5 0 0 1 7 7M11 4l2 16"/>',
    memorial:'<path d="M8 20h8M9 17h6v3H9zM12 5c-2 3-1 4 0 5 1-1 2-2 0-5ZM12 10v7"/>',
    siblings:'<path d="M4 20v-3a4 4 0 0 1 8 0v3m0 0v-3a4 4 0 0 1 8 0v3"/><circle cx="8" cy="8" r="2.5"/><circle cx="16" cy="8" r="2.5"/>'
  };
  function icon(kind, className='') {
    const holder=document.createElement('span'); holder.className='family-icon '+className; holder.setAttribute('aria-hidden','true');
    holder.innerHTML=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[kind]||icons.children}</svg>`;
    return holder;
  }
  const formatDate = value => {
    if (!value) return t('notKnown');
    const [year,month,day] = value.split('-');
    return day ? `${day}.${month}.${year}` : month ? `${month}.${year}` : year;
  };
  const statusOf = (a,b) => families.find(f => f.parents.includes(a) && f.parents.includes(b));
  const statusText = family => {
    if (!family) return t('unknown');
    const label=t(family.relationship_status||'unknown');
    return family.is_current===null || family.is_current===undefined ? label : `${label} · ${t(family.is_current?'current':'past')}`;
  };
  const statusIcon = family => ['divorced','separated','former'].includes(family?.relationship_status) ? 'divorced' : ['married','partnered'].includes(family?.relationship_status) ? 'partner' : 'parents';

  const search = document.getElementById('search');
  const results = document.getElementById('search-results');
  const tree = document.getElementById('tree');
  const scroll = document.getElementById('tree-scroll');
  const cardView = document.getElementById('card-view');
  const branchesView = document.getElementById('branches-view');
  const depth = (id, visited=new Set()) => {
    if (visited.has(id)) return 0;
    const next=new Set([...visited,id]);
    return 1+Math.max(0,...families.filter(f=>f.parents.includes(id)).flatMap(f=>f.children).map(child=>depth(child,next)));
  };
  const initialId = data.rootIds.find(id => people.has(id)) || data.people[0]?.id;
  let focusId = null;
  let activeView = 'card';
  let trail = [];
  let openBranch = null;

  document.getElementById('person-count').textContent = data.people.length;

  const unique = ids => [...new Set(ids)].filter(id => people.has(id));
  const sort = ids => unique(ids).sort((a, b) => nameOf(a).localeCompare(nameOf(b), language));
  const ownFamilies = id => families.filter(family => family.parents.includes(id));
  const originFamilies = id => families.filter(family => family.children.includes(id));
  const parents = id => unique(originFamilies(id).flatMap(family => family.parents));
  const children = id => unique(ownFamilies(id).flatMap(family => family.children));
  const partners = id => unique(ownFamilies(id).flatMap(family => family.parents.filter(value => value !== id)));
  const siblings = id => sort(originFamilies(id).flatMap(family => family.children.filter(value => value !== id)));

  function makePerson(id, kind) {
    const person = people.get(id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'person' + (id === focusId ? ' focus' : '') + (kind === 'partner' ? ' partner' : '');
    button.dataset.person = id;
    const name = document.createElement('strong');
    name.textContent = nameOf(id);
    const caption = document.createElement('small');
    caption.textContent = id === focusId ? t('focus') : person.deceased ? t('memory') : kind === 'partner' ? statusText(statusOf(focusId,id)) : t('explore');
    button.append(photo(id), name, caption);
    if (person.deceased) button.append(icon('memorial','memorial-badge'));
    button.addEventListener('click', () => select(id, true, true));
    return button;
  }

  function addRow(label, ids, partnerIds = []) {
    if (!ids.length) return;
    const row = document.createElement('div');
    row.className = 'generation';
    const title = document.createElement('span');
    title.className = 'generation-label';
    title.textContent = label;
    const cards = document.createElement('div');
    cards.className = 'generation-people';
    for (const id of ids) cards.append(makePerson(id, partnerIds.includes(id) ? 'partner' : 'relative'));
    row.append(title, cards);
    tree.append(row);
  }

  function drawLines() {
    const old = tree.querySelector('.tree-lines');
    if (old) old.remove();
    const width = tree.scrollWidth;
    const height = tree.scrollHeight;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'tree-lines');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    const treeRect = tree.getBoundingClientRect();
    const positions = new Map();
    for (const card of tree.querySelectorAll('[data-person]')) {
      const rect = card.getBoundingClientRect();
      positions.set(card.dataset.person, {
        cx: rect.left - treeRect.left + rect.width / 2,
        top: rect.top - treeRect.top,
        bottom: rect.bottom - treeRect.top,
      });
    }
    for (const family of families) {
      for (const parentId of family.parents) {
        const parent = positions.get(parentId);
        if (!parent) continue;
        for (const childId of family.children) {
          const child = positions.get(childId);
          if (!child || child.top <= parent.bottom) continue;
          const mid = (parent.bottom + child.top) / 2;
          const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
          path.setAttribute('d', `M${parent.cx} ${parent.bottom} V${mid} H${child.cx} V${child.top}`);
          svg.append(path);
        }
      }
    }
    tree.prepend(svg);
  }

  function renderTree() {
    const id = focusId;
    const directParents = parents(id);
    const grandparents = sort(directParents.flatMap(parents));
    const ownPartners = sort(partners(id));
    const ownSiblings = siblings(id);
    const ownChildren = sort(children(id));
    const grandchildren = sort(ownChildren.flatMap(children));
    const middle = unique([id, ...ownPartners, ...ownSiblings]);
    tree.replaceChildren();
    addRow(t('grandparents'), grandparents);
    addRow(t('parentsGeneration'), directParents);
    addRow(t('central'), middle, ownPartners);
    addRow(t('childrenGeneration'), ownChildren);
    addRow(t('grandchildren'), grandchildren);
    requestAnimationFrame(() => {
      tree.style.transform = 'none';
      drawLines();
      setZoom(zoom);
      const card = tree.querySelector('.person.focus');
      if (card) card.scrollIntoView({ block: 'nearest', inline: 'center' });
      scroll.scrollTop = 0;
    });
  }

  function element(tag, className, label) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  }

  function personButton(id, subtitle) {
    const button = element('button', 'relative-card');
    button.type = 'button';
    const name = element('strong', '', nameOf(id));
    const meta = element('span', 'relative-meta', subtitle || (people.get(id).deceased ? t('memory') : t('viewFamily')));
    button.append(photo(id), name, meta, element('span', 'relative-arrow', language === 'he' ? '←' : '→'));
    if (people.get(id).deceased) button.append(icon('memorial','memorial-badge'));
    button.addEventListener('click', () => select(id, true, true));
    return button;
  }

  function section(title, ids, subtitle) {
    if (!ids.length) return null;
    const box = element('section', 'relation-section');
    const heading = element('div', 'relation-heading');
    const relationIcon = { [t('parents')]:'parents', [t('partners')]:'parents', [t('siblings')]:'siblings', [t('children')]:'children' }[title] || 'children';
    heading.append(icon(relationIcon,'relation-icon'), element('h3', '', title), element('span', 'relation-count', String(ids.length)));
    const list = element('div', 'relative-list');
    for (const id of ids) { const card=personButton(id, title===t('partners') ? statusText(statusOf(focusId,id)) : subtitle); if (title===t('partners')) card.append(icon(statusIcon(statusOf(focusId,id)),'status-badge')); list.append(card); }
    box.append(heading, list);
    return box;
  }

  function navigation() {
    const wrap = element('div', 'person-navigation');
    if (trail.length > 1) {
      const back = element('button', 'back-person', t('back') + nameOf(trail[trail.length - 2]));
      back.type = 'button';
      back.addEventListener('click', () => {
        trail.pop();
        focusId = trail[trail.length - 1];
        openBranch = null;
        history.replaceState(null, '', '#' + encodeURIComponent(focusId));
        render();
      });
      wrap.append(back);
    }
    return wrap;
  }

  function renderCard() {
    const id = focusId;
    cardView.replaceChildren();
    cardView.append(navigation());
    const hero = element('div', 'person-hero');
    hero.append(photo(id, 'hero'), element('span', 'hero-kicker', t('familyOf')), element('h2', '', nameOf(id)));
    if (people.get(id).deceased) { const badge=element('span','memory-label',t('memory')); badge.prepend(icon('memorial')); hero.append(badge); }
    const dates=element('div','person-dates');
    dates.append(element('span','',`${t('birth')}: ${formatDate(people.get(id).birth_date)}`));
    if (people.get(id).deceased || people.get(id).death_date) dates.append(element('span','',`${t('death')}: ${formatDate(people.get(id).death_date)}`));
    hero.append(dates);
    if (data.rootIds.includes(id)) { const other=data.rootIds.find(value=>value!==id && people.has(value)); if(other){const rootPair=element('div','root-pair');rootPair.append(element('span','hero-kicker','זוג ראש העץ'),personButton(other,statusText(statusOf(id,other))));hero.append(rootPair);} }
    cardView.append(hero);
    const relations = element('div', 'relations-grid');
    for (const group of [
      section(t('parents'), parents(id)),
      section(t('partners'), sort(partners(id))),
      section(t('siblings'), siblings(id)),
      section(t('children'), sort(children(id))),
    ]) if (group) relations.append(group);
    if (!relations.children.length) relations.append(element('p', 'no-relations', t('noRelations')));
    cardView.append(relations);
  }

  function addBranch(key, title, description, ids, label) {
    if (!ids.length) return;
    const folder = element('div', 'branch-folder');
    const trigger = element('button', 'branch-trigger');
    trigger.type = 'button';
    trigger.setAttribute('aria-expanded', String(openBranch === key));
    const symbol = element('span', 'folder-symbol', '▤');
    symbol.setAttribute('aria-hidden', 'true');
    trigger.append(symbol);
    const wording = element('span', 'branch-wording');
    wording.append(element('strong', '', title), element('small', '', description));
    trigger.append(wording, element('span', 'folder-count', String(ids.length)), element('span', 'folder-chevron', openBranch === key ? '⌃' : '⌄'));
    trigger.addEventListener('click', () => { openBranch = openBranch === key ? null : key; renderBranches(); });
    folder.append(trigger);
    if (openBranch === key) {
      const list = element('div', 'branch-contents');
      for (const id of ids) list.append(personButton(id, label));
      folder.append(list);
    }
    branchesView.append(folder);
  }

  function renderBranches() {
    const id = focusId;
    branchesView.replaceChildren();
    branchesView.append(navigation());
    const intro = element('div', 'branches-intro');
    intro.append(element('span', 'hero-kicker', t('fromFamily')), element('h2', '', nameOf(id)), element('p', '', t('chooseBranch')));
    branchesView.append(intro);
    const directParents = parents(id);
    for (const parentId of directParents) {
      const next = sort(unique([parentId, ...parents(parentId), ...siblings(parentId)]));
      addBranch('parent-' + parentId, t('branchOf') + nameOf(parentId), t('previous'), next);
    }
    const partnerIds = sort(partners(id));
    for (const partnerId of partnerIds) {
      const next = sort(unique([partnerId, ...children(id).filter(childId => ownFamilies(id).some(family => family.parents.includes(partnerId) && family.children.includes(childId)))]));
      addBranch('partner-' + partnerId, t('familyWith') + nameOf(partnerId), statusText(statusOf(id,partnerId)) + ' · ' + t('shared'), next, statusText(statusOf(id,partnerId)));
    }
    const ownChildren = sort(children(id));
    const listedChildren = new Set(ownFamilies(id).filter(family => family.parents.some(parentId => partnerIds.includes(parentId))).flatMap(family => family.children));
    const otherChildren = ownChildren.filter(childId => !listedChildren.has(childId));
    if (otherChildren.length) addBranch('children', t('next'), t('nextDescription'), otherChildren);
    const ownSiblings = siblings(id);
    addBranch('siblings', t('siblings'), t('siblingsDescription'), ownSiblings);
    if (!branchesView.querySelector('.branch-folder')) branchesView.append(element('p', 'no-relations', t('noBranches')));
  }

  function render() {
    document.getElementById('focus-name').textContent = nameOf(focusId);
    document.getElementById('focus-info').textContent = people.get(focusId).deceased ? t('memory') : '';
    if (activeView === 'card') renderCard();
    if (activeView === 'branches') renderBranches();
    if (activeView === 'tree') renderTree();
  }

  function setView(view) {
    activeView = view;
    for (const button of document.querySelectorAll('.view-tab')) {
      const selected = button.dataset.view === view;
      button.setAttribute('aria-selected', String(selected));
      document.getElementById('panel-' + button.dataset.view).hidden = !selected;
    }
    render();
  }

  function hideResults() {
    results.hidden = true;
    search.setAttribute('aria-expanded', 'false');
  }

  function select(id, updateHash = true, remember = false) {
    if (!people.has(id)) return;
    focusId = id;
    if (remember) {
      const existing = trail.indexOf(id);
      trail = existing >= 0 ? trail.slice(0, existing + 1) : [...trail, id];
    } else trail = [id];
    openBranch = null;
    search.value = '';
    hideResults();
    render();
    if (updateHash) history.replaceState(null, '', '#' + encodeURIComponent(id));
  }

  function updateResults() {
    const query = search.value.trim().toLocaleLowerCase();
    results.replaceChildren();
    if (!query) { hideResults(); return; }
    const matches = data.people.filter(person => nameOf(person.id).toLocaleLowerCase().includes(query)).slice(0, 15);
    if (!matches.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-result';
      empty.textContent = t('notFound');
      results.append(empty);
    }
    for (const person of matches) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'result';
      button.setAttribute('role', 'option');
      button.textContent = nameOf(person.id);
      button.addEventListener('click', () => select(person.id));
      results.append(button);
    }
    results.hidden = false;
    search.setAttribute('aria-expanded', 'true');
  }

  const langButtons = document.querySelectorAll('[data-language]');
  function applyLanguage() {
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'he' ? 'rtl' : 'ltr';
    document.title = t('treeTitle') + ' · ' + t('brand');
    for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    for (const id of ['zoom-in','zoom-out','zoom-reset']) document.getElementById(id).setAttribute('aria-label', t(({ 'zoom-in':'zoomIn','zoom-out':'zoomOut','zoom-reset':'zoomReset' })[id]));
    search.placeholder = t('placeholder');
    for (const button of langButtons) button.setAttribute('aria-pressed', String(button.dataset.language === language));
    render(); updateResults();
  }
  for (const button of langButtons) button.addEventListener('click', () => {
    language = button.dataset.language; localStorage.setItem('family-language', language); applyLanguage();
  });
  let zoom = 1;
  const zoomLayer = document.getElementById('tree-zoom');
  function setZoom(value) {
    zoom = Math.max(.55, Math.min(1.75, Math.round(value * 100) / 100));
    zoomLayer.style.width = (tree.scrollWidth * zoom) + 'px';
    zoomLayer.style.height = (tree.scrollHeight * zoom) + 'px';
    tree.style.transform = `scale(${zoom})`;
    document.getElementById('zoom-value').textContent = Math.round(zoom * 100) + '%';
  }
  document.getElementById('zoom-in').addEventListener('click', () => setZoom(zoom + .15));
  document.getElementById('zoom-out').addEventListener('click', () => setZoom(zoom - .15));
  document.getElementById('zoom-reset').addEventListener('click', () => setZoom(1));
  scroll.addEventListener('wheel', event => { if (event.ctrlKey || event.metaKey) { event.preventDefault(); setZoom(zoom + (event.deltaY < 0 ? .1 : -.1)); } }, {passive:false});
  let pinchDistance = 0;
  scroll.addEventListener('touchmove', event => {
    if (event.touches.length !== 2) { pinchDistance = 0; return; }
    event.preventDefault();
    const [a,b] = event.touches;
    const distance = Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
    if (pinchDistance) setZoom(zoom * distance / pinchDistance);
    pinchDistance = distance;
  }, {passive:false});
  scroll.addEventListener('touchend', () => { pinchDistance = 0; });
  search.addEventListener('input', updateResults);
  search.addEventListener('keydown', event => {
    if (event.key === 'Escape') hideResults();
    if (event.key === 'Enter') {
      const first = results.querySelector('.result');
      if (first) { event.preventDefault(); first.click(); }
    }
  });
  document.addEventListener('click', event => { if (!event.target.closest('.search-wrap')) hideResults(); });
  for (const button of document.querySelectorAll('.view-tab')) button.addEventListener('click', () => setView(button.dataset.view));
  document.getElementById('reset').addEventListener('click', () => select(initialId));
  window.addEventListener('resize', () => { if (activeView === 'tree') drawLines(); });
  window.addEventListener('hashchange', () => select(decodeURIComponent(location.hash.slice(1)), false));
  select(people.has(decodeURIComponent(location.hash.slice(1))) ? decodeURIComponent(location.hash.slice(1)) : initialId, false);
  applyLanguage();
})();
