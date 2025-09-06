// RecipeFinder app.js
// client-side demo using Spoonacular API
// user places their API key into the input (stored to localStorage for convenience)

const apiKeyInput = document.getElementById('apiKey');
const ingInput = document.getElementById('ingredients');
const searchBtn = document.getElementById('searchBtn');
const resultsDiv = document.getElementById('results');
const detailDiv = document.getElementById('detail');
const favoritesDiv = document.getElementById('favorites');
const clearFavsBtn = document.getElementById('clearFavs');

const LS_KEY = 'rf_favorites_v1';
const LS_APIKEY = 'rf_spoonacular_key';

let favorites = JSON.parse(localStorage.getItem(LS_KEY) || '[]');

// restore api key if present
apiKeyInput.value = localStorage.getItem(LS_APIKEY) || '';

// helpers
function setApiKey(k){ localStorage.setItem(LS_APIKEY, k); apiKeyInput.value = k; }
function getApiKey(){ return (apiKeyInput.value || '').trim(); }
function showError(msg){ detailDiv.innerHTML = `<div style="color:#b91c1c">${msg}</div>`; }
function formatNumber(n){ return Math.round(n); }

// render favorites
function renderFavorites(){
  if(!favorites.length){ favoritesDiv.innerHTML = '<div class="muted">No favorites yet.</div>'; return; }
  favoritesDiv.innerHTML = favorites.map((r,i)=>`
    <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0">
      <div><strong>${escapeHtml(r.title)}</strong><div class="small muted">${escapeHtml(r.sourceName||'')}</div></div>
      <div><button onclick="playFav(${i})">View</button> <button onclick="removeFav(${i})" class="danger">Remove</button></div>
    </div>
  `).join('');
}
window.playFav = function(i){
  const r = favorites[i];
  if(!r) return;
  fetchRecipeInformation(r.id);
}
window.removeFav = function(i){
  favorites.splice(i,1);
  localStorage.setItem(LS_KEY, JSON.stringify(favorites));
  renderFavorites();
}

// basic escape
function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])); }

// search by ingredients
searchBtn.addEventListener('click', async ()=>{
  const key = getApiKey();
  if(!key){ alert('Please paste your Spoonacular API key in the top field.'); return; }
  localStorage.setItem(LS_APIKEY, key);
  const raw = (ingInput.value || '').trim();
  if(!raw){ alert('Please enter at least one ingredient.'); return; }
  resultsDiv.innerHTML = '<div class="small muted">Searching…</div>';
  const ingredients = raw.split(',').map(s=>s.trim()).filter(Boolean).join(',');
  // spoonacular endpoint - findByIngredients
  const url = `https://api.spoonacular.com/recipes/findByIngredients?ingredients=${encodeURIComponent(ingredients)}&number=12&ranking=1&ignorePantry=true&apiKey=${encodeURIComponent(key)}`;
  try{
    const res = await fetch(url);
    if(!res.ok){ const txt = await res.text(); throw new Error(txt || res.statusText); }
    const data = await res.json();
    if(!data || !data.length){ resultsDiv.innerHTML = '<div class="muted">No recipes found.</div>'; return; }
    renderResults(data);
  }catch(err){
    console.error(err); showError('Search failed: ' + (err.message || err)); resultsDiv.innerHTML = '';
  }
});

// render list of recipe cards
function renderResults(list){
  resultsDiv.innerHTML = list.map(r=>`
    <div class="recipe">
      <img src="${r.image}" alt="${escapeHtml(r.title)}" style="width:78px;height:78px;border-radius:8px;object-fit:cover" />
      <div class="meta">
        <div style="display:flex;align-items:center;gap:8px">
          <strong>${escapeHtml(r.title)}</strong>
          <span class="badge small">${r.missedIngredientCount} missing</span>
        </div>
        <div class="small muted">${r.usedIngredientCount} used • ${r.likes || 0} likes</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button onclick="fetchRecipeInformation(${r.id})">View</button>
        <button onclick="addToFavorites(${encodeURIComponent(JSON.stringify({id:r.id,title:r.title,sourceName:r.sourceName||''}))})" class="fav-btn">♥ Fav</button>
      </div>
    </div>
  `).join('');
}

// fetch detailed info + nutrition
async function fetchRecipeInformation(id){
  detailDiv.innerHTML = '<div class="small muted">Loading recipe & nutrition…</div>';
  const key = getApiKey();
  if(!key) return showError('Add API key first.');
  const url = `https://api.spoonacular.com/recipes/${id}/information?includeNutrition=true&apiKey=${encodeURIComponent(key)}`;
  try{
    const res = await fetch(url);
    if(!res.ok) throw new Error(await res.text());
    const j = await res.json();
    renderDetail(j);
  }catch(err){
    console.error(err); showError('Could not load recipe info: ' + (err.message||err));
  }
}

// render detailed recipe + nutrition breakdown
function renderDetail(data){
  const nutr = data.nutrition && data.nutrition.nutrients ? data.nutrition.nutrients : [];
  // find common nutrients
  const cal = nutr.find(n=>/calorie/i.test(n.name) || n.name.toLowerCase()==='calories') || {amount:0,unit:'kcal'};
  const protein = nutr.find(n=>/protein/i.test(n.name)) || {amount:0,unit:'g'};
  const carbs = nutr.find(n=>/carbohydrate/i.test(n.name)) || {amount:0,unit:'g'};
  const fat = nutr.find(n=>/fat/i.test(n.name)) || {amount:0,unit:'g'};

  detailDiv.innerHTML = `
    <div style="display:flex;gap:12px;align-items:center">
      <img src="${data.image}" style="width:120px;height:120px;border-radius:10px;object-fit:cover"/>
      <div>
        <div style="font-weight:800">${escapeHtml(data.title)}</div>
        <div class="small muted">${escapeHtml(data.sourceName||'')}</div>
        <div style="margin-top:8px">
          <button onclick="addFavByObject(${encodeURIComponent(JSON.stringify({id:data.id,title:data.title,sourceName:data.sourceName||''}))})">Add to Favorites</button>
          <a href="${escapeHtml(data.sourceUrl||'')}" target="_blank" style="margin-left:8px" class="small">Open source</a>
        </div>
      </div>
    </div>

    <div style="margin-top:12px">
      <strong>Nutrition (per recipe)</strong>
      <div class="nutrition">
        <div class="nut-card"><div class="small muted">Calories</div><div style="font-weight:700">${formatNumber(cal.amount)} ${cal.unit}</div></div>
        <div class="nut-card"><div class="small muted">Protein</div><div style="font-weight:700">${formatNumber(protein.amount)} ${protein.unit}</div></div>
        <div class="nut-card"><div class="small muted">Carbs</div><div style="font-weight:700">${formatNumber(carbs.amount)} ${carbs.unit}</div></div>
        <div class="nut-card"><div class="small muted">Fat</div><div style="font-weight:700">${formatNumber(fat.amount)} ${fat.unit}</div></div>
      </div>
    </div>

    <div style="margin-top:12px">
      <strong>Ingredients</strong>
      <ul>${(data.extendedIngredients||[]).map(i=>`<li>${escapeHtml(i.original)}</li>`).join('')}</ul>
    </div>

    <div style="margin-top:12px">
      <strong>Instructions</strong>
      <div class="small">${escapeHtml(data.instructions || 'Instructions not available')}</div>
    </div>
  `;
}

// favorites helpers
function addToFavorites(encoded){
  try{
    const obj = JSON.parse(decodeURIComponent(encoded));
    favorites.unshift(obj);
    localStorage.setItem(LS_KEY, JSON.stringify(favorites));
    renderFavorites();
    alert('Added to favorites');
  }catch(e){ console.error(e) }
}
function addFavByObject(encoded){
  try{
    const obj = JSON.parse(decodeURIComponent(encoded));
    favorites.unshift(obj);
    localStorage.setItem(LS_KEY, JSON.stringify(favorites));
    renderFavorites();
    alert('Added to favorites');
  }catch(e){ console.error(e) }
}
clearFavsBtn.addEventListener('click', ()=>{ if(confirm('Clear all favorites?')){ favorites=[]; localStorage.setItem(LS_KEY, JSON.stringify(favorites)); renderFavorites(); } });

// load saved favorites on startup
renderFavorites();

// allow pressing Enter to search
ingInput.addEventListener('keydown', e=>{ if(e.key==='Enter') searchBtn.click(); });
apiKeyInput.addEventListener('change', ()=> setApiKey(apiKeyInput.value) );
