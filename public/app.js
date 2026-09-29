(async () => {
  const data = await window.loadFamilyData();
  if (!data || !Array.isArray(data.people) || !data.people.length) { document.getElementById('person-count').textContent = '—'; document.getElementById('focus-name').textContent = 'הנתונים אינם זמינים כרגע. נסו לרענן את העמוד.'; return; }

  const people = new Map(data.people.map(person => [person.id, person]));
  const labels = { brand:'משפחת טטרו', treeTitle:'עץ המשפחה של משפחת טטרו', story:'הסיפור שלנו, בין הדורות', intro:'מכירים את המשפחה, אדם אחרי אדם.', count:'בני משפחה בעץ', search:'מחפשים מישהו במשפחה?', placeholder:'הקלידו שם פרטי או משפחה', reset:'חזרה לראש העץ', card:'כרטיס משפחתי', branches:'ענפי המשפחה', diagram:'תרשים העץ', viewing:'מסתכלים על', hint:'התרשים מציג את הדורות ביחס לציפורה ומיכאל. אפשר לגלול או להגדיל בתוך התרשים בלבד.', footer:'מכירים קשר שצריך לתקן? ספרו לעילאי כדי שנעדכן את העץ.', admin:'ניהול', focus:'במרכז העץ', memory:'לזכרו/ה', partner:'קשר הורי/זוגי', explore:'למעבר לענף', viewFamily:'לצפייה במשפחה', familyOf:'המשפחה של', parents:'הורים', partners:'זוגיות והורות משותפת', siblings:'אחים ואחיות', children:'ילדים', noRelations:'אין עדיין קשרים נוספים לאדם הזה בעץ.', fromFamily:'הענף המשפחתי של', chooseBranch:'כל זוג מוצג עם הילדים המשותפים שלו. בחרו אדם כדי להמשיך לדור הבא.', shared:'ילדים משותפים', noBranches:'אין לאדם הזה ילדים או ענף נוסף בעץ.', notFound:'לא מצאנו שם כזה בעץ', zoomIn:'הגדלה', zoomOut:'הקטנה', zoomReset:'איפוס תצוגה', relation:'קשר משפחתי', birth:'נולד/ה', death:'נפטר/ה', notKnown:'לא צוין', current:'קשר נוכחי', past:'קשר קודם', married:'נשואים', partnered:'בני זוג', divorced:'גרושים', separated:'פרודים', former:'קשר קודם', unknown:'סוג קשר לא ידוע', viewsLabel:'איך להציג את המשפחה?' };
  const t = key => labels[key];
  const nameOf = id => people.get(id)?.name_he || '';
  const photoDialog=document.createElement('dialog');photoDialog.className='photo-lightbox';photoDialog.innerHTML='<button type="button" class="photo-lightbox-close" aria-label="סגירת התמונה">×</button><img alt=""><p></p>';document.body.append(photoDialog);
  const closePhoto=()=>photoDialog.close();photoDialog.querySelector('button').addEventListener('click',closePhoto);photoDialog.addEventListener('click',event=>{if(event.target===photoDialog)closePhoto()});
  const openPhoto=id=>{const image=photoDialog.querySelector('img');image.src=people.get(id).photo_url;image.alt='תמונה של '+nameOf(id);photoDialog.querySelector('p').textContent=nameOf(id);photoDialog.showModal();};
  const photo = (id, size='small', interactive=false) => {
    const person = people.get(id);
    const node = document.createElement(interactive&&person.photo_url?'button':'span'); node.className = 'avatar avatar-' + size;
    if(node.tagName==='BUTTON'){node.type='button';node.classList.add('avatar-action');node.setAttribute('aria-label','פתיחת התמונה של '+nameOf(id));node.addEventListener('click',event=>{event.stopPropagation();openPhoto(id)});}
    if (person.photo_url) { const image = document.createElement('img'); image.src = person.photo_url; image.alt = ''; image.loading = 'lazy'; node.append(image); }
    else { node.textContent = nameOf(id).trim().charAt(0) || '•'; node.setAttribute('aria-hidden','true'); }
    return node;
  };
  const families = data.families;
  const icons = {
    parents:'<circle cx="8" cy="7" r="2.3"/><circle cx="16" cy="7" r="2.3"/><path d="M3 19v-3a5 5 0 0 1 10 0v3M11 19v-3a5 5 0 0 1 10 0v3"/>',
    children:'<circle cx="12" cy="6" r="2.5"/><path d="M7 21v-5a5 5 0 0 1 10 0v5M4 13l3-2m13 2-3-2"/>',
    partner:'<path d="M7 12.5 10.5 16 17 8.5"/><circle cx="7" cy="8" r="3.5"/><circle cx="17" cy="15" r="3.5"/>',
    rings:'<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/><path d="m17 4 .6 1.8L19.5 6.5l-1.9.7L17 9l-.6-1.8-1.9-.7 1.9-.7L17 4Z"/>',
    male:'<circle cx="10" cy="14" r="5"/><path d="m14 10 6-6m-4 0h4v4"/>',
    female:'<circle cx="12" cy="9" r="5"/><path d="M12 14v7m-3-3h6"/>',
    person:'<circle cx="12" cy="8" r="3"/><path d="M6 21v-4a6 6 0 0 1 12 0v4"/>',
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
    if (family.relationship_status && family.relationship_status !== 'unknown') return label;
    if (family.is_current === true) return t('current');
    if (family.is_current === false) return t('past');
    return label;
  };
  const statusIcon = family => ['divorced','separated','former'].includes(family?.relationship_status) ? 'divorced' : family?.relationship_status==='married' ? 'rings' : family?.relationship_status==='partnered' ? 'partner' : 'parents';

  const search = document.getElementById('search');
  const results = document.getElementById('search-results');
  const tree = document.getElementById('tree');
  const scroll = document.getElementById('tree-scroll');
  const cardView = document.getElementById('card-view');
  const branchesView = document.getElementById('branches-view');
  const initialId = data.rootIds.find(id => people.has(id)) || data.people[0]?.id;
  let focusId = null;
  let activeView = 'branches';

  document.getElementById('person-count').textContent = data.people.length;

  const unique = ids => [...new Set(ids)].filter(id => people.has(id));
  const sort = ids => unique(ids).sort((a, b) => nameOf(a).localeCompare(nameOf(b), 'he'));
  const ownFamilies = id => families.filter(family => family.parents.includes(id));
  const originFamilies = id => families.filter(family => family.children.includes(id));
  const parents = id => unique(originFamilies(id).flatMap(family => family.parents));
  const children = id => unique(ownFamilies(id).flatMap(family => family.children));
  const partners = id => unique(ownFamilies(id).flatMap(family => family.parents.filter(value => value !== id)));
  const siblings = id => sort(originFamilies(id).flatMap(family => family.children.filter(value => value !== id)));
  const generations = new Map(data.rootIds.filter(id=>people.has(id)).map(id=>[id,0]));
  for(let pass=0;pass<people.size*2;pass++){
    let changed=false;
    for(const family of families){
      const known=family.parents.map(id=>generations.get(id)).filter(level=>level!==undefined);
      if(known.length){
        const level=Math.min(...known);
        for(const parentId of family.parents)if(!generations.has(parentId)){generations.set(parentId,level);changed=true;}
        for(const childId of family.children){const next=level+1;if(!generations.has(childId)||generations.get(childId)>next){generations.set(childId,next);changed=true;}}
      }
    }
    if(!changed)break;
  }
  const generationText=id=>({0:'דור המייסדים',1:'דור הילדים',2:'דור הנכדים',3:'דור הנינים',4:'דור בני הנינים'}[generations.get(id)]||`דור ${generations.get(id)??'לא ידוע'}`);
  const familyForChild=id=>originFamilies(id)[0]||null;
  const relationContext=id=>{const ps=parents(id);return ps.length?`${generationText(id)} · ילד/ה של ${ps.map(nameOf).join(' ו־')}`:generationText(id);};

  const roleText=(id,role)=>{const gender=people.get(id)?.gender;if(role==='spouse')return gender==='male'?'חתן המשפחה':gender==='female'?'כלת המשפחה':'בן/בת זוג';if(role==='founder')return gender==='male'?'מייסד המשפחה':gender==='female'?'מייסדת המשפחה':'ראש המשפחה';return gender==='male'?'בן המשפחה':gender==='female'?'בת המשפחה':'בן/בת המשפחה';};
  const roleIcon=(id,role)=>role==='spouse'?'rings':people.get(id)?.gender==='male'?'male':people.get(id)?.gender==='female'?'female':'person';
  function makePerson(id, role, captionText) {
    const person = people.get(id);
    const card = document.createElement('div');
    card.className = 'person' + (id === focusId ? ' focus' : '') + (role === 'spouse' ? ' partner' : '');
    card.dataset.person = id;
    const button=document.createElement('button');button.type='button';button.className='person-select';button.setAttribute('aria-label','מעבר אל '+nameOf(id));
    const name = document.createElement('strong');
    name.textContent = nameOf(id);
    const caption = document.createElement('small');
    caption.textContent = captionText || (id === focusId ? t('focus') : person.deceased ? t('memory') : generationText(id));
    const roleBadge=element('span','person-role',roleText(id,role));roleBadge.prepend(icon(roleIcon(id,role),'person-role-icon'));
    button.append(roleBadge,name,caption);card.append(photo(id,'tree',true),button);
    if (person.deceased) card.append(icon('memorial','memorial-badge'));
    button.addEventListener('click', () => select(id));
    return card;
  }

  function element(tag, className, label) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (label !== undefined) node.textContent = label;
    return node;
  }

  function renderTreeBranch(id, visited=new Set()) {
    const branch=element('div','tree-person-branch');
    const lineageRole=data.rootIds.includes(id)?'founder':'lineage';
    if(visited.has(id)){const head=element('div','tree-person-head');head.append(makePerson(id,lineageRole,generationText(id)));branch.append(head);return branch;}
    const nextVisited=new Set([...visited,id]);
    const allUnits=ownFamilies(id).filter(family=>family.parents.includes(id));
    const displayPartners=new Set(allUnits.filter(family=>family.parents.length===1&&family.children.length&&family.display_partner_id).map(family=>family.display_partner_id));
    const units=allUnits.filter(family=>!(family.parents.length===2&&!family.children.length&&displayPartners.has(family.parents.find(value=>value!==id)))).sort((a,b)=>{
      const aName=a.parents.filter(value=>value!==id).map(nameOf).join(' '),bName=b.parents.filter(value=>value!==id).map(nameOf).join(' ');
      return aName.localeCompare(bName,'he');
    });
    if(!units.length){const head=element('div','tree-person-head');head.append(makePerson(id,lineageRole,generationText(id)));branch.append(head);return branch;}
    const unitsBox=element('div','tree-person-units');
    for(const family of units){
      const actualPartnerIds=sort(family.parents.filter(value=>value!==id));
      const partnerIds=actualPartnerIds.length?actualPartnerIds:family.display_partner_id&&people.has(family.display_partner_id)?[family.display_partner_id]:[];
      const relationshipFamily=partnerIds.length?statusOf(id,partnerIds[0])||family:family;
      if(!partnerIds.length&&!family.children.length)continue;
      const unit=element('section','tree-family-unit');
      const unitTop=element('div','tree-unit-top');
      if(partnerIds.length){
        const couple=element('div','tree-couple-cell relationship-'+(relationshipFamily.relationship_status||'unknown'));
        couple.append(makePerson(id,lineageRole,generationText(id)));
        const status=element('div','tree-couple-status');status.append(icon(statusIcon(relationshipFamily),'tree-status-icon'),element('span','',statusText(relationshipFamily)));couple.append(status);
        for(const partnerId of partnerIds)couple.append(makePerson(partnerId,data.rootIds.includes(partnerId)?'founder':'spouse',generationText(partnerId)));
        unitTop.append(couple);
      }else{unitTop.append(makePerson(id,lineageRole,generationText(id)),element('span','tree-single-parent','הורה יחיד/ה'));}
      unit.append(unitTop);
      if(family.children.length){
        const childLabel=element('div','tree-generation-title',generationText(family.children[0]));
        const childRow=element('div','tree-branch-children');
        for(const childId of sort(family.children))childRow.append(renderTreeBranch(childId,nextVisited));
        unit.append(childLabel,childRow);
      }
      unitsBox.append(unit);
    }
    if(unitsBox.children.length)branch.append(unitsBox);
    return branch;
  }

  function renderTree() {
    tree.replaceChildren();
    const root=data.rootIds.find(id=>people.has(id))||initialId;
    const full=element('div','family-tree-root');
    full.append(renderTreeBranch(root));
    tree.append(full);
    requestAnimationFrame(()=>{
      tree.style.transform='none';
      setZoom(zoom);
      const cards=[...tree.querySelectorAll('.person')];
      const card=cards.find(node=>node.dataset.person===focusId);
      if(card)card.scrollIntoView({block:'nearest',inline:'center'});
      scroll.scrollTop=0;
    });
  }

  function personButton(id, subtitle) {
    const button = element('button', 'relative-card');
    button.type = 'button';
    const name = element('strong', '', nameOf(id));
    const meta = element('span', 'relative-meta', subtitle || (people.get(id).deceased ? t('memory') : t('viewFamily')));
    button.append(photo(id), name, meta, element('span', 'relative-arrow', '←'));
    if (people.get(id).deceased) button.append(icon('memorial','memorial-badge'));
    button.addEventListener('click', () => select(id));
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

  function parentPath(id,seen=new Set()){
    if(seen.has(id))return null;
    if(data.rootIds.includes(id))return [id];
    const nextSeen=new Set([...seen,id]);
    for(const parentId of sort(parents(id))){const path=parentPath(parentId,nextSeen);if(path)return [...path,id];}
    return null;
  }
  function ancestryPath(id){
    const direct=parentPath(id);if(direct)return direct;
    for(const partnerId of sort(partners(id))){const path=parentPath(partnerId);if(path)return [...path,id];}
    return null;
  }

  function navigation() {
    const wrap=element('nav','person-navigation');
    wrap.setAttribute('aria-label','המסלול המשפחתי');
    const path=ancestryPath(focusId)||[focusId];
    const rootIds=data.rootIds.filter(id=>people.has(id));
    const root=element('button','path-crumb',rootIds.map(nameOf).join(' ו־'));
    root.type='button';root.disabled=rootIds.includes(focusId);root.addEventListener('click',()=>select(initialId));wrap.append(root);
    for(const id of path.filter(id=>!rootIds.includes(id))){
      wrap.append(element('span','path-separator','←'));
      const crumb=element('button','path-crumb',nameOf(id));crumb.type='button';crumb.disabled=id===focusId;crumb.addEventListener('click',()=>select(id));wrap.append(crumb);
    }
    return wrap;
  }

  function renderCard() {
    const id = focusId;
    cardView.replaceChildren();
    cardView.append(navigation());
    const hero = element('div', 'person-hero');
    hero.append(photo(id, 'hero', true), element('span', 'hero-kicker', t('familyOf')), element('h2', '', nameOf(id)));
    if (people.get(id).deceased) { const badge=element('span','memory-label',t('memory')); badge.prepend(icon('memorial')); hero.append(badge); }
    const dates=element('div','person-dates');
    dates.append(element('span','',`${t('birth')}: ${formatDate(people.get(id).birth_date)}`));
    if (people.get(id).deceased || people.get(id).death_date) dates.append(element('span','',`${t('death')}: ${formatDate(people.get(id).death_date)}`));
    hero.append(dates);
    if (data.rootIds.includes(id)) { const other=data.rootIds.find(value=>value!==id && people.has(value)); if(other){const rootPair=element('div','root-pair');rootPair.append(element('span','hero-kicker','זוג ראש העץ'),personButton(other,statusText(statusOf(id,other))));hero.append(rootPair);} }
    cardView.append(hero);
    const personal=element('section','profile-story');
    const details=[['על עצמי',people.get(id).about_me],['תחביבים',people.get(id).hobbies],['מקום עבודה',people.get(id).workplace],['אוכל מועדף',people.get(id).favorite_food],['סיפור מעניין',people.get(id).interesting_story]].filter(([,value])=>value);
    if(details.length){personal.append(element('h3','','קצת עליי'));for(const [title,value] of details){const item=element('div','profile-story-item');item.append(element('strong','',title),element('p','',value));personal.append(item)}cardView.append(personal);}
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

  function renderBranches() {
    const id = focusId;
    branchesView.replaceChildren();
    branchesView.append(navigation());
    const intro = element('div', 'branches-intro');
    intro.append(element('span', 'hero-kicker', `${generationText(id)} · ${t('fromFamily')}`), element('h2', '', nameOf(id)), element('p', '', t('chooseBranch')));
    branchesView.append(intro);
    const allUnits=ownFamilies(id).filter(family=>family.parents.includes(id));
    const displayPartners=new Set(allUnits.filter(family=>family.parents.length===1&&family.children.length&&family.display_partner_id).map(family=>family.display_partner_id));
    const units=allUnits.filter(family=>!(family.parents.length===2&&!family.children.length&&displayPartners.has(family.parents.find(value=>value!==id))));
    for(const family of units){
      const familyCard=element('section','branch-family-card');
      const actualPartnerIds=sort(family.parents.filter(value=>value!==id));
      const partnerIds=actualPartnerIds.length?actualPartnerIds:family.display_partner_id&&people.has(family.display_partner_id)?[family.display_partner_id]:[];
      const relationshipFamily=partnerIds.length?statusOf(id,partnerIds[0])||family:family;
      const heading=element('div','branch-family-heading');
      const wording=element('div','branch-family-wording');
      wording.append(element('h3','',[id,...partnerIds].map(nameOf).join(' ו־')),element('p','',partnerIds.length?statusText(relationshipFamily):'משפחה עם הורה אחד'));
      heading.append(icon(partnerIds.length?statusIcon(relationshipFamily):'parents','relation-icon'),wording);
      familyCard.append(heading);
      if(family.children.length){
        const label=element('div','branch-generation-label');
        label.append(element('strong','',generationText(family.children[0])),element('span','',`${family.children.length} ${family.children.length===1?'ילד/ה':'ילדים'} בענף`));
        const list=element('div','branch-child-list');
        for(const childId of sort(family.children))list.append(personButton(childId,relationContext(childId)));
        familyCard.append(label,list);
      }else familyCard.append(element('p','branch-empty','אין ילדים שמשויכים לקשר הזה.'));
      branchesView.append(familyCard);
    }
    const ownSiblings=siblings(id);
    if(ownSiblings.length){
      const parallel=element('section','parallel-branches');
      const heading=element('div','relation-heading');heading.append(icon('siblings','relation-icon'),element('h3','','ענפים מקבילים באותו דור'),element('span','relation-count',String(ownSiblings.length)));
      const list=element('div','branch-child-list');for(const siblingId of ownSiblings)list.append(personButton(siblingId,relationContext(siblingId)));
      parallel.append(heading,list);branchesView.append(parallel);
    }
    if(!units.length&&!ownSiblings.length)branchesView.append(element('p','no-relations',t('noBranches')));
  }

  function render() {
    document.getElementById('focus-name').textContent = nameOf(focusId);
    document.getElementById('focus-info').textContent = people.get(focusId).deceased ? t('memory') : '';
    if (activeView === 'card') renderCard();
    if (activeView === 'branches') renderBranches();
    if (activeView === 'tree') renderTree();
  }

  function setView(view, updateState=true) {
    activeView = view;
    for (const button of document.querySelectorAll('.view-tab')) {
      const selected = button.dataset.view === view;
      button.setAttribute('aria-selected', String(selected));
      document.getElementById('panel-' + button.dataset.view).hidden = !selected;
    }
    render();
    if(updateState&&focusId)history.replaceState({personId:focusId,view:activeView,fromTree:true},'',location.hash||'#'+encodeURIComponent(focusId));
  }

  function hideResults() {
    results.hidden = true;
    search.setAttribute('aria-expanded', 'false');
  }

  function select(id, updateHistory = true) {
    if (!people.has(id)) return;
    focusId = id;
    search.value = '';
    hideResults();
    render();
    if(updateHistory)history.pushState({personId:id,view:activeView,fromTree:true},'','#'+encodeURIComponent(id));
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

  function applyLabels() {
    document.title = t('treeTitle') + ' · ' + t('brand');
    for (const node of document.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    for (const id of ['zoom-in','zoom-out','zoom-reset']) document.getElementById(id).setAttribute('aria-label', t(({ 'zoom-in':'zoomIn','zoom-out':'zoomOut','zoom-reset':'zoomReset' })[id]));
    search.placeholder = t('placeholder');
    render(); updateResults();
  }
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
  window.addEventListener('resize', () => { if (activeView === 'tree') setZoom(zoom); });
  window.addEventListener('popstate', event => {
    const id=event.state?.personId||decodeURIComponent(location.hash.slice(1));
    if(!people.has(id))return;
    focusId=id;
    if(['card','branches','tree'].includes(event.state?.view))activeView=event.state.view;
    for(const button of document.querySelectorAll('.view-tab')){const selected=button.dataset.view===activeView;button.setAttribute('aria-selected',String(selected));document.getElementById('panel-'+button.dataset.view).hidden=!selected;}
    render();
  });
  const startId=people.has(decodeURIComponent(location.hash.slice(1)))?decodeURIComponent(location.hash.slice(1)):initialId;
  focusId=startId;
  history.replaceState({personId:startId,view:activeView,fromTree:true},'','#'+encodeURIComponent(startId));
  applyLabels();
})();
