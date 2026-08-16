// =============================================================================
// PORTAL INFORMES DE EVALUACIÓN — Educación Física y Salud
// Escuela Roberto Ojeda Torres | 2026
// Archivo: app.js
// =============================================================================

// ─────────────────────────────────────────────
// 🔗 URL de la API — REEMPLAZA con tu URL real de Apps Script
// ─────────────────────────────────────────────
const API_URL = "https://script.google.com/macros/s/AKfycbx6qHkRSE1l3_k-rP_3a3k4cbba37QI1CIzXIcN5zHM0tFIPQW74Akc8qgzhiOXyEjQ/exec";

// ─────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────
const loginView      = document.getElementById('login-view');
const dashboardView  = document.getElementById('dashboard-view');
const loginForm      = document.getElementById('login-form');
const rutInput       = document.getElementById('rut-input');
const btnLogin       = document.getElementById('btn-login');
const loginError     = document.getElementById('login-error');
const btnLogout      = document.getElementById('btn-logout');
const studentAvatar  = document.getElementById('student-avatar');
const studentNameEl  = document.getElementById('student-name');
const studentMetaEl  = document.getElementById('student-meta');
const heroGreeting   = document.getElementById('hero-greeting');
const heroEmoji      = document.getElementById('hero-emoji');
const dashLoading    = document.getElementById('dash-loading');
const dashError      = document.getElementById('dash-error');
const dashErrorMsg   = document.getElementById('dash-error-msg');
const btnRetry       = document.getElementById('btn-retry');
const dashContent    = document.getElementById('dash-content');
const notasContainer    = document.getElementById('notas-container');

// Tab buttons y panels
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// ─────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────
let currentSession   = null;
let currentDashboard = null;
let currentEvaluaciones = [];
let retryIdAlumno    = null;

// ─────────────────────────────────────────────
// BOTTOM SHEET (Mobile & Desktop)
// ─────────────────────────────────────────────
const bsOverlay = document.createElement('div');
bsOverlay.className = 'bottom-sheet-overlay';
document.body.appendChild(bsOverlay);

const bsSheet = document.createElement('div');
bsSheet.className = 'bottom-sheet';
bsSheet.innerHTML = `
  <div class="bottom-sheet-handle"></div>
  <div class="bottom-sheet-header">
    <span class="bottom-sheet-pct" id="bs-pct"></span>
    <button class="bottom-sheet-close" id="bs-close" aria-label="Cerrar">✕</button>
  </div>
  <div class="bottom-sheet-criterio" id="bs-criterio"></div>
  <div class="bottom-sheet-eval">
    <span class="bottom-sheet-eval-icon">📋</span>
    <span id="bs-eval"></span>
  </div>`;
document.body.appendChild(bsSheet);

function _bsOpen(criterio, pct, evalName) {
  const pctNum = parseFloat(pct);
  const color = pctNum >= 75 ? '#00b894' : pctNum >= 50 ? '#fdcb6e' : '#fc5c65';
  document.getElementById('bs-pct').textContent = pct;
  document.getElementById('bs-pct').style.color = color;
  document.getElementById('bs-criterio').textContent = criterio;
  document.getElementById('bs-eval').textContent = evalName;
  bsOverlay.classList.add('visible');
  bsSheet.classList.add('visible');
}

function _bsClose() {
  bsOverlay.classList.remove('visible');
  bsSheet.classList.remove('visible');
}

bsOverlay.addEventListener('click', _bsClose);
document.getElementById('bs-close').addEventListener('click', _bsClose);

window.showDotInfo = function(criterio, pct, evalName) {
  _bsOpen(criterio, pct, evalName);
};

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  checkSession();
  setupEventListeners();
});

// ─────────────────────────────────────────────
// SESSION
// ─────────────────────────────────────────────
function checkSession() {
  const saved = localStorage.getItem('ef_session');
  if (saved) {
    try {
      currentSession = JSON.parse(saved);
      showDashboard(currentSession);
    } catch {
      localStorage.removeItem('ef_session');
      showLogin();
    }
  } else {
    showLogin();
  }
}

// ─────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────
function setupEventListeners() {
  // Login form submit
  loginForm.addEventListener('submit', handleLoginSubmit);

  // Logout
  btnLogout.addEventListener('click', handleLogout);

  // Retry on error
  btnRetry.addEventListener('click', () => {
    if (retryIdAlumno) loadDashboardData(retryIdAlumno);
  });

  // Tab navigation
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.dataset.tab));
  });

  // Keyboard: close mobile keyboard on enter for RUT input
  rutInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginForm.dispatchEvent(new Event('submit', { cancelable: true }));
  });

  // Auto-format RUT input
  rutInput.addEventListener('input', formatRutInput);
}

// ─────────────────────────────────────────────
// AUTO-FORMATO RUT (agrega guión automáticamente)
// ─────────────────────────────────────────────
function formatRutInput(e) {
  let val = e.target.value.replace(/[^0-9kK\-]/g, '').replace(/\-+/g, '-');
  // Si tiene guion, mantener; si el último char es dígito verificador y no hay guion, agregar
  e.target.value = val;
}

// ─────────────────────────────────────────────
// AUTH — LOGIN
// ─────────────────────────────────────────────
async function handleLoginSubmit(e) {
  e.preventDefault();
  const rut = rutInput.value.trim();
  if (!rut) return;

  setLoginLoading(true);
  hideElement(loginError);

  try {
    const res  = await fetch(`${API_URL}?action=login&rut=${encodeURIComponent(rut)}`);
    const data = await res.json();

    if (data.success) {
      currentSession = data.data;
      localStorage.setItem('ef_session', JSON.stringify(currentSession));
      showDashboard(currentSession);
    } else {
      showLoginError(data.error || 'RUT no encontrado. Verifica que esté correcto.');
    }
  } catch (err) {
    showLoginError('Error de conexión. Revisa tu internet e intenta nuevamente.');
  } finally {
    setLoginLoading(false);
  }
}

function setLoginLoading(isLoading) {
  const btnText   = btnLogin.querySelector('.btn-text');
  const btnIcon   = btnLogin.querySelector('.btn-icon');
  const btnLoader = btnLogin.querySelector('.btn-loader');

  btnLogin.disabled = isLoading;
  if (isLoading) {
    btnText.textContent = 'Verificando...';
    hideElement(btnIcon);
    showElement(btnLoader);
  } else {
    btnText.textContent = 'Ingresar al Portal';
    showElement(btnIcon);
    hideElement(btnLoader);
  }
}

function showLoginError(msg) {
  loginError.textContent = '⚠️ ' + msg;
  showElement(loginError);
}

// ─────────────────────────────────────────────
// AUTH — LOGOUT
// ─────────────────────────────────────────────
function handleLogout() {
  localStorage.removeItem('ef_session');
  currentSession   = null;
  currentDashboard = null;
  rutInput.value   = '';
  showLogin();
}

// ─────────────────────────────────────────────
// VIEW MANAGERS
// ─────────────────────────────────────────────
function showLogin() {
  document.body.classList.remove('dashboard-mode');
  document.body.classList.add('login-mode');

  loginView.classList.add('active');
  loginView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
  dashboardView.classList.remove('active');
  dashboardView.style.display = 'none';
}

function showDashboard(alumno) {
  document.body.classList.remove('login-mode');
  document.body.classList.add('dashboard-mode');

  loginView.classList.remove('active');
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  dashboardView.style.display = 'block';

  renderDashboardHeader(alumno);
  showLoadingState();
  loadDashboardData(alumno.id_alumno);
}

function showLoadingState() {
  showElement(dashLoading);
  hideElement(dashError);
  hideElement(dashContent);
}

function showErrorState(msg) {
  hideElement(dashLoading);
  hideElement(dashContent);
  dashErrorMsg.textContent = msg;
  showElement(dashError);
}

function showContentState() {
  hideElement(dashLoading);
  hideElement(dashError);
  showElement(dashContent);
}

// ─────────────────────────────────────────────
// HEADER DEL DASHBOARD
// ─────────────────────────────────────────────
function renderDashboardHeader(alumno) {
  const nombres   = alumno.nombres || '';
  const apellidos = (alumno.apellido_paterno || '') + ' ' + (alumno.apellido_materno || '');
  const initial   = nombres.charAt(0).toUpperCase();
  const curso     = alumno.curso || '—';

  let nombreMostrado = alumno.nombre_completo || nombres + ' ' + apellidos;
  // Limpiar posible coma al inicio si la DB la envía mal (ej: ", Bórquez...")
  nombreMostrado = nombreMostrado.replace(/^[\s,]+/, '');

  studentAvatar.textContent = initial;
  studentNameEl.textContent = nombreMostrado;
  studentMetaEl.textContent = `Curso ${curso} · RUT ${alumno.rut || '—'}`;

  // Extraer el primer nombre correctamente
  let primerNombre = nombres.split(' ')[0];
  if (!alumno.apellido_paterno && nombres.split(' ').length >= 3) {
    // Si la base de datos juntó todo en 'nombres' (ej: Bórquez Caamaño Elián Guzmaro)
    primerNombre = nombres.split(' ')[2];
  }

  // Hero
  heroGreeting.textContent  = `¡Hola, ${primerNombre}! 👋`;
  heroEmoji.textContent     = getEmojiForCourse(curso);
}

function getEmojiForCourse(curso) {
  const num = parseInt(curso);
  if (num <= 2) return '🌟';
  if (num <= 4) return '🏃';
  if (num <= 6) return '⚽';
  return '🏆';
}

// ─────────────────────────────────────────────
// DATA LOADING
// ─────────────────────────────────────────────
async function loadDashboardData(idAlumno) {
  retryIdAlumno = idAlumno;

  try {
    const res  = await fetch(`${API_URL}?action=getDashboard&id_alumno=${encodeURIComponent(idAlumno)}`);
    const data = await res.json();

    if (data.success) {
      currentDashboard = data.data;
      renderFullDashboard(data.data);
    } else {
      showErrorState('Error al cargar los datos: ' + (data.error || 'Error desconocido.'));
    }
  } catch (err) {
    showErrorState('No se pudo conectar al servidor. Verifica tu conexión a internet.');
  }
}

// ─────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────
function renderFullDashboard(data) {
  renderNotas(data.evaluaciones || []);
    showContentState();
  }

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────


// ─────────────────────────────────────────────
// RENDER — EVALUACIONES
function buildScoreRing(nota, color) {
  const R = 46;
  const C = 2 * Math.PI * R; // circumference ≈ 289
  const pct = nota !== null ? Math.min(nota / 7, 1) : 0;
  const offset = C * (1 - pct);
  const cx = 55, cy = 55;

  const svg = `
    <svg class="score-ring-svg" viewBox="0 0 110 110" aria-hidden="true">
      <circle class="score-ring-bg" cx="${cx}" cy="${cy}" r="${R}"/>
      <circle
        class="score-ring-fill"
        cx="${cx}" cy="${cy}" r="${R}"
        stroke="${color}"
        stroke-dasharray="${C}"
        stroke-dashoffset="${C}"
        data-target-offset="${offset}"
        style="stroke-dashoffset:${C}"
      />
    </svg>`;

  return { svg, offset, circumference: C };
}

function buildRubricaTable(indicadores) {
  if (!indicadores.length) {
    return '<p style="color:var(--text-soft);font-size:13px;padding-top:14px;">Sin indicadores registrados para esta evaluación.</p>';
  }

  const cards = indicadores.map(ind => {
    // Definimos los 4 niveles de la matriz
    const desc = ind.descriptores || {};
    const niveles = [
      { id: 'Logrado', puntaje: ind.puntaje_max, texto: desc.logrado || 'Cumple completamente con el indicador.', cls: 'logrado' },
      { id: 'Medianamente Logrado', puntaje: ind.puntaje_max * 0.75, texto: desc.med_logrado || 'Cumple parcialmente con el indicador.', cls: 'med-logrado' },
      { id: 'Por Lograr', puntaje: ind.puntaje_max * 0.5, texto: desc.por_lograr || 'Muestra indicios pero requiere mayor desarrollo.', cls: 'por-lograr' },
      { id: 'No Observado', puntaje: 0, texto: desc.no_observado || 'No se observa la conducta o habilidad.', cls: 'no-observado' }
    ];

    const blocks = niveles.map(n => {
      // Determinar si este es el nivel alcanzado (simplificado basado en el texto del nivel_logro o aproximación del puntaje)
      const isActive = ind.nivel_logro === n.id;
      const activeCls = isActive ? `active active-${n.cls}` : '';
      const checkIcon = isActive ? `<div class="rubric-block-check">✓</div>` : '';

      return `
        <div class="rubric-block ${activeCls}">
          ${checkIcon}
          <div class="rubric-block-header">
            <span class="rubric-block-title">${n.id}</span>
          </div>
          <p class="rubric-block-desc">${escHtml(n.texto)}</p>
        </div>
      `;
    }).join('');

    return `
      <div class="rubric-indicator-card">
        <div class="rubric-indicator-header">
          <div class="rubric-indicator-title">
            <span class="oa-badge">${escHtml(ind.oa_numero || 'OA')}</span>
            <h4>${escHtml(ind.descripcion_indicador)}</h4>
          </div>
          <div class="rubric-indicator-score">
            <strong>${ind.puntaje}</strong> / ${ind.puntaje_max} pts
          </div>
        </div>
        <div class="rubric-levels-grid">
          ${blocks}
        </div>
      </div>
    `;
  }).join('');

  return `
    <p class="rubrica-title" style="margin-bottom: 16px;">Detalle de Rúbrica</p>
    <div class="rubrica-cards-container">
      ${cards}
    </div>
  `;
}

// ─────────────────────────────────────────────
// MODAL DE RÚBRICA
// ─────────────────────────────────────────────
function openRubricModal(globalIdx) {
  const ev = currentEvaluaciones[globalIdx];
  if (!ev) return;

  const isDirecta = ev.total_max === -1;
  const indicHTML = buildRubricaTable(ev.indicadores || []);

  const r = ev.retroalimentacion;
  const tieneRetro = r && (r.punto_fuerte || r.desafio || r.sugerencia);
  const pf = tieneRetro ? (r.punto_fuerte || '') : '';
  const dp = tieneRetro ? (r.desafio      || '') : '';
  const sa = tieneRetro ? (r.sugerencia   || '') : '';

  const feedbackHTML = tieneRetro ? `
    <div class="retro-blocks" style="margin-top: 20px;">
      ${pf ? `
      <div class="retro-block pf">
        <div class="retro-block-icon-wrap">🌟</div>
        <div>
          <p class="retro-block-label">Punto Fuerte</p>
          <p class="retro-block-text">${escHtml(pf)}</p>
        </div>
      </div>` : ''}
      ${dp ? `
      <div class="retro-block dp">
        <div class="retro-block-icon-wrap">🔶</div>
        <div>
          <p class="retro-block-label">Desafío Principal</p>
          <p class="retro-block-text">${escHtml(dp)}</p>
        </div>
      </div>` : ''}
      ${sa ? `
      <div class="retro-block sa">
        <div class="retro-block-icon-wrap">💡</div>
        <div>
          <p class="retro-block-label">Sugerencia Accionable</p>
          <p class="retro-block-text">${escHtml(sa)}</p>
        </div>
      </div>` : ''}
    </div>` : `
    <div class="retro-pending" style="margin-top: 20px;">
      <div class="retro-pending-icon">⏳</div>
      <div>
        <p class="retro-pending-title">Retroalimentación en preparación</p>
        <p class="retro-pending-text">El profesor está elaborando la retroalimentación personalizada para esta evaluación.</p>
      </div>
    </div>`;

  const modalBody = document.getElementById('rubric-modal-body');
  const modalTitle = document.getElementById('rubric-modal-title');
  const modalDate = document.getElementById('rubric-modal-date');

  modalTitle.textContent = ev.nombre;
  modalDate.textContent = `📅 ${formatFecha(ev.fecha)} ${ev.descripcion ? '· ' + ev.descripcion : ''}`;

  if (isDirecta) {
    modalBody.innerHTML = `
      <div style="text-align:center; padding:40px 20px;">
        <div style="font-size:48px; margin-bottom:16px;">📝</div>
        <h3 style="color:var(--text-main); margin-bottom:8px;">Nota ingresada directamente</h3>
        <p style="color:var(--text-soft); max-width:400px; margin:0 auto; line-height:1.5;">Esta nota fue asignada por el docente sin utilizar una rúbrica detallada en la plataforma.</p>
      </div>
    `;
  } else {
    modalBody.innerHTML = `
      <div class="rubrica-section" style="padding-top:0; margin-top:0; border-top:none;">
        ${indicHTML}
        ${feedbackHTML}
      </div>
    `;
  }

  const modal = document.getElementById('rubric-modal');
  modal.classList.add('show');
  document.body.style.overflow = 'hidden'; // prevent bg scroll
}

function closeRubricModal() {
  const modal = document.getElementById('rubric-modal');
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

// Close modal on click outside
window.addEventListener('click', (e) => {
  const modal = document.getElementById('rubric-modal');
  if (e.target === modal) {
    closeRubricModal();
  }
});

// ─────────────────────────────────────────────
// HELPERS — NIVEL DE LOGRO
// ─────────────────────────────────────────────
function getNivelLogro(nota) {
  if (nota === null || nota === undefined) return { texto: 'Sin nota', emoji: '⬜', cls: 'med-logrado' };
  if (nota >= 6.5) return { texto: 'Excelente',             emoji: '⭐', cls: 'excelente'   };
  if (nota >= 5.5) return { texto: 'Logrado',               emoji: '✅', cls: 'logrado'      };
  if (nota >= 4.5) return { texto: 'Medianamente Logrado',  emoji: '🟡', cls: 'med-logrado'  };
  if (nota >= 4.0) return { texto: 'Por Lograr',            emoji: '🟠', cls: 'por-lograr'   };
  return                  { texto: 'No Logrado',            emoji: '🔴', cls: 'no-logrado'   };
}

function getNotaColor(nota) {
  if (nota === null) return '#a0aec0';
  if (nota >= 6.5)   return '#00b894';
  if (nota >= 5.5)   return '#26de81';
  if (nota >= 4.5)   return '#f7b731';
  if (nota >= 4.0)   return '#fd9644';
  return '#fc5c65';
}

function getNivelCls(nivelStr) {
  const s = (nivelStr || '').toLowerCase();
  if (s.includes('medianamente'))              return 'med-logrado';
  if (s.includes('por lograr'))                return 'por-lograr';
  if (s.includes('no logrado'))                return 'no-logrado';
  if (s.includes('logrado') || s.includes('4 p')) return 'logrado';
  return 'med-logrado';
}

function getNivelShort(nivelStr) {
  const s = (nivelStr || '').toLowerCase();
  if (s.includes('medianamente')) return 'Med. Logrado';
  if (s.includes('por lograr'))   return 'Por Lograr';
  if (s.includes('no logrado'))   return 'No Logrado';
  if (s.includes('logrado'))      return 'Logrado';
  return nivelStr;
}

function getNivelEmoji(nivelStr) {
  const s = (nivelStr || '').toLowerCase();
  if (s.includes('medianamente')) return '🟡';
  if (s.includes('por lograr'))   return '🟠';
  if (s.includes('no logrado'))   return '🔴';
  if (s.includes('logrado'))      return '✅';
  return '⬜';
}

// ─────────────────────────────────────────────
// HELPERS — FECHAS
// ─────────────────────────────────────────────
function formatFecha(dateStr) {
  if (!dateStr) return '—';
  try {
    const cleanDate = dateStr.split('T')[0];
    const [y, m, d] = cleanDate.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
    const meses = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    return `${d} de ${meses[m - 1]} de ${y}`;
  } catch { return dateStr; }
}

function formatFechaCorta(dateStr) {
  if (!dateStr) return '';
  try {
    const cleanDate = dateStr.split('T')[0];
    const [y, m, d] = cleanDate.split('-').map(Number);
    if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
    const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${d} ${meses[m - 1]}`;
  } catch { return dateStr; }
}

// ─────────────────────────────────────────────
// HELPERS — DOM / SEGURIDAD
// ─────────────────────────────────────────────
function showElement(el) {
  if (el) el.classList.remove('hidden');
}

function hideElement(el) {
  if (el) el.classList.add('hidden');
}

/** Escapa HTML para prevenir XSS */
function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
