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
const evalsContainer = document.getElementById('evals-container');
const progresoContainer = document.getElementById('progreso-container');

// Tab buttons y panels
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

// ─────────────────────────────────────────────
// ESTADO GLOBAL
// ─────────────────────────────────────────────
let currentSession   = null;
let currentDashboard = null;
let activeTab        = 'evaluaciones';
let retryIdAlumno    = null;

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
  renderEvaluaciones(data.evaluaciones || []);
  renderProgreso(data.progreso || [], data.evaluaciones || []);
  showContentState();
  setActiveTab(activeTab); // restaurar tab activo
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
function setActiveTab(tabId) {
  activeTab = tabId;

  tabBtns.forEach(btn => {
    const isActive = btn.dataset.tab === tabId;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive);
  });

  tabPanels.forEach(panel => {
    const panelTab = panel.id.replace('panel-', '');
    if (panelTab === tabId) {
      panel.classList.add('active');
      panel.classList.remove('hidden');
    } else {
      panel.classList.remove('active');
      panel.classList.add('hidden');
    }
  });
}

// ─────────────────────────────────────────────
// RENDER — EVALUACIONES
// ─────────────────────────────────────────────
function renderEvaluaciones(evaluaciones) {
  evalsContainer.innerHTML = '';

  if (!evaluaciones.length) {
    evalsContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>Sin evaluaciones registradas</h3>
        <p>Aún no hay evaluaciones para mostrar.</p>
      </div>`;
    return;
  }

  evaluaciones.forEach((ev, i) => {
    const card = buildEvalCard(ev, i);
    evalsContainer.appendChild(card);
  });

  // Animar score rings después de que el DOM esté listo
  requestAnimationFrame(() => {
    document.querySelectorAll('.score-ring-fill').forEach(ring => {
      const targetOffset = ring.dataset.targetOffset;
      if (targetOffset !== undefined) {
        setTimeout(() => {
          ring.style.strokeDashoffset = targetOffset;
        }, 100);
      }
    });
  });
}

function buildEvalCard(ev, index) {
  const card = document.createElement('article');
  card.className = 'eval-card';
  card.style.animationDelay = (index * 0.07) + 's';

  const nota       = ev.nota;
  const nivel      = getNivelLogro(nota);
  const notaColor  = getNotaColor(nota);
  const ringData   = buildScoreRing(nota, notaColor);
  const fechaFmt   = formatFecha(ev.fecha);
  const indicHTML  = buildRubricaTable(ev.indicadores || []);

  // Feedback
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

  card.innerHTML = `
    <div class="eval-card-header" onclick="this.parentElement.classList.toggle('expanded')" tabindex="0" role="button" aria-expanded="false">
      <div class="eval-header-left">
        <h3 class="eval-name">${escHtml(ev.nombre)}</h3>
        <div class="eval-meta">
          <span class="eval-date">📅 ${fechaFmt}</span>
          ${ev.descripcion ? `<span class="eval-desc">· ${escHtml(ev.descripcion)}</span>` : ''}
        </div>
      </div>
      <div class="eval-score-section">
        <div class="score-ring-wrap" title="Nota: ${nota !== null ? nota : '—'} / 7.0">
          ${ringData.svg}
          <div class="score-ring-text">
            <span class="score-nota-num" style="color:${notaColor}">${nota !== null ? nota.toFixed(1) : '—'}</span>
            <span class="score-nota-max">/ 7.0</span>
          </div>
        </div>
        <div class="eval-score-badges">
          <span class="nivel-badge ${nivel.cls}">
            ${nivel.emoji} ${nivel.texto}
          </span>
          ${ev.total_max > 0 ? `
          <div class="puntaje-total">
            <strong>${ev.total_puntaje}</strong> / ${ev.total_max} pts
            ${ev.porcentaje !== null ? `· ${ev.porcentaje.toFixed(1)}%` : ''}
          </div>` : ''}
        </div>
        <div class="eval-card-chevron" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>
    </div>
    <div class="rubrica-section">
      ${indicHTML}
      ${feedbackHTML}
    </div>
  `;

  return card;
}

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
// RENDER — PROGRESO
// ─────────────────────────────────────────────
function renderProgreso(progreso, evaluaciones) {
  progresoContainer.innerHTML = '';

  // Header informativo
  const headerCard = document.createElement('div');
  headerCard.className = 'progreso-header';
  headerCard.innerHTML = `
    <div class="progreso-header-icon">📈</div>
    <div class="progreso-header-text">
      <h3>Evolución por Objetivo de Aprendizaje</h3>
      <p>Se comparan los OA que aparecen en 2 o más evaluaciones.</p>
    </div>`;
  progresoContainer.appendChild(headerCard);

  if (!progreso.length) {
    const empty = document.createElement('div');
    empty.className = 'progreso-empty';
    empty.innerHTML = `
      <div class="progreso-empty-icon">🌱</div>
      <h3>¡Sigue adelante!</h3>
      <p>El progreso por OA aparecerá cuando tengas evaluaciones con objetivos de aprendizaje en común. ¡Cada evaluación suma!</p>`;
    progresoContainer.appendChild(empty);
    return;
  }

  progreso.forEach((oa, i) => {
    const card = buildProgresoCard(oa, i);
    progresoContainer.appendChild(card);
  });
}

function buildProgresoCard(oa, index) {
  const card = document.createElement('div');
  card.className = 'progreso-card';
  card.style.animationDelay = (index * 0.08) + 's';

  const tendencia = oa.tendencia || 'estable';
  const tendTexto = tendencia === 'subio'  ? '↑ Mejoró'
                  : tendencia === 'bajo'   ? '↓ Bajó'
                  : '→ Estable';

  const mejora = oa.mejora_puntos;
  const mejoraStr = mejora > 0  ? `+${mejora.toFixed(1)}%`
                  : mejora < 0  ? `${mejora.toFixed(1)}%`
                  : '=';

  // Chips de registros
  const chips = oa.registros.map(r => {
    const pct = r.porcentaje;
    const color = pct >= 75 ? '#00b894' : pct >= 50 ? '#fdcb6e' : '#fc5c65';
    return `
      <div class="progreso-record-chip">
        <span class="record-pct" style="color:${color}">${pct.toFixed(0)}%</span>
        <span class="record-eval-name">${escHtml(r.nombre_eval)}</span>
        <span class="record-fecha">${formatFechaCorta(r.fecha)}</span>
      </div>`;
  }).join('');

  // SVG chart
  const svgChart = buildLineChart(oa.registros, tendencia);

  card.innerHTML = `
    <div class="progreso-card-header">
      <div class="progreso-oa">
        <span class="progreso-oa-num">${escHtml(oa.oa_numero)}</span>
      </div>
      <span class="tendencia-badge ${tendencia}">
        ${tendTexto} (${mejoraStr})
      </span>
    </div>
    <div class="progreso-chart-area">
      <div class="chart-svg-wrap">${svgChart}</div>
      <div class="progreso-records">${chips}</div>
    </div>`;

  return card;
}

function buildLineChart(registros, tendencia) {
  if (registros.length < 2) return '';

  const W = 560, H = 120;
  const pad = { t: 16, r: 20, b: 32, l: 44 };
  const cW = W - pad.l - pad.r;
  const cH = H - pad.t - pad.b;

  const pcts = registros.map(r => r.porcentaje);
  const minP = Math.max(0,  Math.min(...pcts) - 15);
  const maxP = Math.min(100, Math.max(...pcts) + 15);
  const range = maxP - minP || 10;

  const xOf = (i) => pad.l + (i / (registros.length - 1)) * cW;
  const yOf = (p) => pad.t + cH - ((p - minP) / range) * cH;

  const lineColor = tendencia === 'subio'  ? '#00b894'
                  : tendencia === 'bajo'   ? '#fc5c65'
                  : '#fdcb6e';

  // Path de línea
  const linePath = registros.map((r, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)},${yOf(r.porcentaje).toFixed(1)}`).join(' ');

  // Área rellena
  const areaPath = linePath
    + ` L${xOf(registros.length - 1).toFixed(1)},${(pad.t + cH).toFixed(1)}`
    + ` L${pad.l.toFixed(1)},${(pad.t + cH).toFixed(1)} Z`;

  // Puntos con tooltip
  const dots = registros.map((r, i) => {
    const x = xOf(i).toFixed(1);
    const y = yOf(r.porcentaje).toFixed(1);
    const dotColor = r.porcentaje >= 75 ? '#00b894' : r.porcentaje >= 50 ? '#fdcb6e' : '#fc5c65';
    return `<circle cx="${x}" cy="${y}" r="6" fill="${dotColor}" stroke="white" stroke-width="2.5">
      <title>${r.nombre_eval}: ${r.porcentaje.toFixed(1)}%</title>
    </circle>`;
  }).join('');

  // Lines de guía Y
  const yGuides = [25, 50, 75, 100].filter(v => v >= minP && v <= maxP).map(v => {
    const y = yOf(v).toFixed(1);
    return `
      <line x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}" stroke="#f0f4f8" stroke-width="1" stroke-dasharray="4,3"/>
      <text x="${(pad.l - 6).toFixed(1)}" y="${(parseFloat(y) + 4).toFixed(1)}" text-anchor="end" font-size="9" fill="#cbd5e0" font-family="Outfit, sans-serif">${v}%</text>`;
  }).join('');

  return `
    <svg width="100%" viewBox="0 0 ${W} ${H}" style="overflow:visible;" role="img" aria-label="Gráfico de progreso">
      <defs>
        <linearGradient id="areaGrad${tendencia}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${lineColor}" stop-opacity="0.25"/>
          <stop offset="100%" stop-color="${lineColor}" stop-opacity="0.02"/>
        </linearGradient>
      </defs>
      ${yGuides}
      <path d="${areaPath}" fill="url(#areaGrad${tendencia})"/>
      <path d="${linePath}" fill="none" stroke="${lineColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>`;
}

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
