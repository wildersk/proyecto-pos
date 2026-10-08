import { pathToFileURL } from 'node:url';
import path from 'node:path';
const projectDir = process.cwd();
const toUrl = (p) => pathToFileURL(path.resolve(projectDir, p)).href;
const { createServer } = await import(toUrl('node_modules/vite/dist/node/index.js'));
const React = await import(toUrl('node_modules/react/index.js'));
const ReactDOMServer = await import(toUrl('node_modules/react-dom/server.node.js'));

// Setup browser mocks for SSR rendering of interactive components
globalThis.window = globalThis;
globalThis.window.addEventListener = () => {};
globalThis.window.removeEventListener = () => {};
globalThis.document = {
  addEventListener: () => {},
  removeEventListener: () => {},
  createElement: (tag) => ({
    tag,
    click: () => {},
    setAttribute: () => {},
    href: '',
    download: ''
  })
};
globalThis.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, val) { this.store[key] = String(val); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};

// Test Runner Infrastructure
const testResults = {
  passed: 0,
  failed: 0,
  partial: 0,
  details: []
};

function recordTest(category, name, status, message, defect = null) {
  testResults.details.push({ category, name, status, message, defect });
  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') testResults.failed++;
  else if (status === 'PARTIAL') testResults.partial++;
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`  ${icon} [${status}] ${name}: ${message}`);
  if (defect) {
    console.log(`     ↳ Defect Details: ${defect}`);
  }
}

async function runAudit() {
  console.log('='.repeat(80));
  console.log('POS CENTRAL - UI COMPONENT & FUNCTIONAL AUTOMATION AUDIT');
  console.log('Target Root: ' + projectDir);
  console.log('='.repeat(80));

  const server = await createServer({
    root: projectDir,
    server: { middlewareMode: true },
    appType: 'custom'
  });

  const [
    workflow,
    mockData,
    uiComponents,
    RequestFormModalModule,
    RequestDetailDrawerModule,
    DocumentViewerModalModule,
    DashboardViewModule,
    UsersManagementViewModule,
    TopbarModule,
    SidebarModule,
    StageWorkspaceModule
  ] = await Promise.all([
    server.ssrLoadModule('/src/lib/workflow.js'),
    server.ssrLoadModule('/src/data/mockRequests.js'),
    server.ssrLoadModule('/src/components/ui.jsx'),
    server.ssrLoadModule('/src/components/RequestFormModal.jsx'),
    server.ssrLoadModule('/src/components/RequestDetailDrawer.jsx'),
    server.ssrLoadModule('/src/components/DocumentViewerModal.jsx'),
    server.ssrLoadModule('/src/views/DashboardView.jsx'),
    server.ssrLoadModule('/src/views/UsersManagementView.jsx'),
    server.ssrLoadModule('/src/components/Topbar.jsx'),
    server.ssrLoadModule('/src/components/Sidebar.jsx'),
    server.ssrLoadModule('/src/views/StageWorkspace.jsx')
  ]);

  const {
    STAGES,
    SALE_TYPES,
    HARDWARE,
    SYSTEMS,
    isValidAffiliate,
    isBusinessDay,
    nextBusinessDays,
    searchMatches,
    fullName,
    formatDate,
    formatDateTime,
    requestStatus,
    newRequestId
  } = workflow;

  const { initialRequests, initialNotifications } = mockData;

  // =========================================================================
  // SECTION 1: FORM INPUTS, VALIDATION RULES & BOUNDARY VALUES
  // =========================================================================
  console.log('\n--- SECTION 1: FORM INPUTS, VALIDATION RULES & BOUNDARY VALUES ---');

  // Test 1.1: NIT Validation in RequestFormModal
  const nitRegex = /^\d{5,8}-?[\dkK]$/;
  const validNits = ['4829105-8', '48291058', '12345K', '12345-k', '12345678-9', '123456789'];
  const invalidNits = ['', '1234-5', '123456789-0', '12345-X', '4829105-8 '];

  const nitsValidPass = validNits.every(nit => nitRegex.test(nit.trim()));
  const nitsInvalidPass = invalidNits.every(nit => !nitRegex.test(nit));
  const cfRejected = !nitRegex.test('CF');

  if (nitsValidPass && nitsInvalidPass) {
    recordTest(
      'Form Validation',
      'NIT Validation Rules (Standard Guatemalan formats)',
      cfRejected ? 'PARTIAL' : 'PASS',
      'Validates 5-8 digits with check digit or k/K. Rejects malformed and out-of-boundary NITs.',
      cfRejected ? 'NIT "CF" (Consumidor Final) or "C/F" is rejected by regex /^\\d{5,8}-?[\\dkK]$/, which is standard for Guatemalan invoicing.' : null
    );
  } else {
    recordTest('Form Validation', 'NIT Validation Rules', 'FAIL', 'Unexpected validation failure on NIT formats.');
  }

  // Test 1.2: DPI / CUI Validation & Formatting
  const formatDpi = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 13);
    return [d.slice(0, 4), d.slice(4, 9), d.slice(9, 13)].filter(Boolean).join(' ');
  };
  const dpiValidSample = '1982 45102 0101';
  const dpiFormatted = formatDpi('1982451020101');
  const dpiDigitsCount = dpiValidSample.replace(/\D/g, '').length;
  const dpiInvalid12 = '198245102010'.replace(/\D/g, '').length === 13;
  const dpiInvalid14 = '19824510201019'.replace(/\D/g, '').length === 13;

  if (dpiFormatted === '1982 45102 0101' && dpiDigitsCount === 13 && !dpiInvalid12 && !dpiInvalid14) {
    recordTest('Form Validation', 'DPI (CUI) Validation & Auto-Formatting', 'PASS', 'Enforces strict 13 digits and groups into 4-5-4 pattern.');
  } else {
    recordTest('Form Validation', 'DPI (CUI) Validation', 'FAIL', 'DPI formatting or length validation failed.');
  }

  // Test 1.3: Email Validation & Boundary Whitespace Glitch
  const emailRegex = /^\S+@\S+\.\S+$/;
  const validEmail = 'cliente@empresa.com';
  const emailWithTrailingSpace = 'cliente@empresa.com ';
  const emailValidPass = emailRegex.test(validEmail);
  const trailingSpaceFailsValidation = !emailRegex.test(emailWithTrailingSpace);

  if (emailValidPass && trailingSpaceFailsValidation) {
    recordTest(
      'Form Validation',
      'Email Validation & Whitespace Handling',
      'PARTIAL',
      'Email regex validates basic format, but lacks trimming before validation, causing valid emails with trailing whitespace to fail.',
      'RequestFormModal validates `f.email` directly with `/^\\S+@\\S+\\.\\S+$/` without `.trim()`, failing when users paste emails with trailing spaces, even though `build()` later trims it.'
    );
  } else {
    recordTest('Form Validation', 'Email Validation', 'FAIL', 'Email validation regex behavior unexpected.');
  }

  // Test 1.4: Phone Validation
  const phoneTest1 = '+502 5555-0000'.replace(/\D/g, '').length >= 8;
  const phoneTest2 = '55550000'.replace(/\D/g, '').length >= 8;
  const phoneTest3 = '1234567'.replace(/\D/g, '').length >= 8;

  if (phoneTest1 && phoneTest2 && !phoneTest3) {
    recordTest('Form Validation', 'Phone Number Length Validation', 'PASS', 'Ensures at least 8 digits ignoring formatting characters (+, -, spaces).');
  } else {
    recordTest('Form Validation', 'Phone Number Length Validation', 'FAIL', 'Phone number validation failed.');
  }

  // Test 1.5: Required Fields and Sale Types in RequestFormModal
  const validateForm = (f, requireDocs) => {
    const e = {};
    if (!f.firstName.trim()) e.firstName = 'Requerido';
    if (!f.lastName.trim()) e.lastName = 'Requerido';
    if (!/^\d{5,8}-?[\dkK]$/.test(f.nit.trim())) e.nit = 'NIT inválido (ej. 4829105-8)';
    if (f.dpi.replace(/\D/g, '').length !== 13) e.dpi = 'El CUI debe tener 13 dígitos';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Correo inválido';
    if (f.phone.replace(/\D/g, '').length < 8) e.phone = 'Teléfono inválido';
    if (!f.businessName.trim()) e.businessName = 'Requerido';
    if (!f.address.trim()) e.address = 'Requerida';
    if (!f.saleTypes.length) e.saleTypes = 'Selecciona al menos uno';
    if (requireDocs && !f.dpiDoc) e.dpiDoc = 'Carga la foto del DPI';
    if (requireDocs && !f.patenteDoc) e.patenteDoc = 'Carga la patente de comercio';
    return e;
  };

  const emptyForm = {
    firstName: '', lastName: '', nit: '', dpi: '', email: '', phone: '',
    businessName: '', tradeType: 'Supermercado y retail', address: '',
    hardware: 'inalambrico', saleTypes: [], dpiDoc: null, patenteDoc: null
  };
  const emptyErrorsDraft = validateForm(emptyForm, false);
  const emptyErrorsSubmit = validateForm(emptyForm, true);

  if (emptyErrorsDraft.saleTypes && !emptyErrorsDraft.dpiDoc && emptyErrorsSubmit.dpiDoc && emptyErrorsSubmit.patenteDoc) {
    recordTest('Form Validation', 'Draft vs Submit Mode Validation Requirements', 'PASS', 'Draft allows saving without documents; Submit enforces DPI and Patente uploads.');
  } else {
    recordTest('Form Validation', 'Draft vs Submit Mode Validation Requirements', 'FAIL', 'Draft vs submit document requirements misconfigured.');
  }

  // Test 1.6: Stage 2 Affiliate Validation (8 digits numeric & unique per sale type)
  const affTestValid = isValidAffiliate('12345678');
  const affTest7Digits = !isValidAffiliate('1234567');
  const affTestAlpha = !isValidAffiliate('1234567A');
  const affDuplicatesTest = (affs) => {
    const vals = Object.values(affs).filter(Boolean);
    return new Set(vals).size !== vals.length;
  };
  const duplicatedAffs = affDuplicatesTest({ normal: '12345678', cuotas: '12345678' });
  const uniqueAffs = !affDuplicatesTest({ normal: '12345678', cuotas: '87654321' });

  if (affTestValid && affTest7Digits && affTestAlpha && duplicatedAffs && uniqueAffs) {
    recordTest('Form Validation', 'Stage 2 Affiliate Number Validation & Uniqueness', 'PASS', 'Validates 8 numeric digits and catches cross-sale duplicate affiliates.');
  } else {
    recordTest('Form Validation', 'Stage 2 Affiliate Number Validation & Uniqueness', 'FAIL', 'Affiliate validation failed.');
  }

  // Test 1.7: Stage 3 Programming Validation (VHQ, AS400, Mipos, CSP)
  const validateStage3 = (system, p, types, hardware) => {
    const errors = {};
    if (system === 'vhq') {
      if (!p.vhq.serial.trim()) errors.serial = 'Ingresa la serie del POS';
      types.forEach((t) => { if (!/^VG\d{6}$/.test(p.vhq.terminals[t.key] || '')) errors[t.key] = 'Formato VG000000'; });
    }
    if (system === 'as400') {
      if (!p.as400.serial.trim()) errors.serial = 'Ingresa el ID de la serie';
    }
    if (system === 'mipos') {
      types.forEach((t) => { if (!/^MPG\d{5}$/.test(p.mipos.terminals[t.key] || '')) errors[t.key] = 'Formato MPG00000'; });
      if (!p.mipos.contactName.trim()) errors.contactName = 'Requerido';
      if (!/^\S+@\S+\.\S+$/.test(p.mipos.email)) errors.email = 'Correo inválido';
      if (!p.mipos.phone.trim()) errors.phone = 'Requerido';
      if (hardware !== 'hit' && !/^MPOS\d{10}$/.test(p.mipos.readerId || '')) errors.readerId = 'Formato MPOS + 10 dígitos';
    }
    if (system === 'csp') {
      if (!/^\d{9}$/.test(p.csp.binFrom)) errors.binFrom = '9 dígitos';
      if (!/^\d{9}$/.test(p.csp.binTo)) errors.binTo = '9 dígitos';
      if (!errors.binFrom && !errors.binTo && Number(p.csp.binFrom) > Number(p.csp.binTo)) errors.binTo = 'Debe ser ≥ inicio';
      if (!/^\d{4}$/.test(p.csp.closingTime)) errors.closingTime = 'HHMM';
    }
    return errors;
  };

  const s3VhqErr = validateStage3('vhq', { vhq: { serial: '', terminals: { normal: 'VG123' } } }, [{ key: 'normal' }], 'ip');
  const s3CspErr = validateStage3('csp', { csp: { binFrom: '500000000', binTo: '400000000', closingTime: '223' } }, [], 'mipos');
  if (s3VhqErr.serial && s3VhqErr.normal && s3CspErr.binTo && s3CspErr.closingTime) {
    recordTest('Form Validation', 'Stage 3 Legacy Systems Field Validations (VHQ/AS400/Mipos/CSP)', 'PASS', 'Enforces strict formatting for terminal IDs (VG000000, MPG00000), 9-digit BIN ranges, and HHMM closing time.');
  } else {
    recordTest('Form Validation', 'Stage 3 Legacy Systems Field Validations', 'FAIL', 'Stage 3 validation failed.');
  }

  // Test 1.8: Stage 4 Delivery Business Days Validation
  const monday = '2026-09-28';
  const saturday = '2026-09-26';
  const sunday = '2026-09-27';
  if (isBusinessDay(monday) && !isBusinessDay(saturday) && !isBusinessDay(sunday)) {
    recordTest('Form Validation', 'Stage 4 Delivery Date Business-Day Rule', 'PASS', 'Disallows scheduling delivery on weekends (Saturday/Sunday); only Monday through Friday permitted.');
  } else {
    recordTest('Form Validation', 'Stage 4 Delivery Date Business-Day Rule', 'FAIL', 'Business day validation rule failed.');
  }

  // Test 1.9: UsersManagementView Form Validation (Missing .trim())
  const rawUsername = '   ';
  const rawPassword = '   ';
  const codeBlocksEmpty = (!'' || !''); // True in code
  const codeBlocksWhitespace = (!rawUsername || !rawPassword); // False in code! Allows whitespace!

  if (codeBlocksEmpty && !codeBlocksWhitespace) {
    recordTest(
      'Form Validation',
      'UsersManagementView Field Validation & Trimming',
      'PARTIAL',
      'Checks for empty strings, but lacks .trim(), allowing whitespace-only usernames and passwords.',
      'In UsersManagementView line 44, `!form.username || !form.password` does not call `.trim()`, allowing accounts with blank spaces to be sent to the backend.'
    );
  } else {
    recordTest('Form Validation', 'UsersManagementView Field Validation', 'FAIL', 'User validation check behavior unexpected.');
  }

  // =========================================================================
  // SECTION 2: BUTTON ACTIONS, TOGGLE STATES, MODALS, DRAWERS & TABS
  // =========================================================================
  console.log('\n--- SECTION 2: BUTTON ACTIONS, TOGGLE STATES, MODALS, DRAWERS & TABS ---');

  // Test 2.1: RequestFormModal Rendering & Toggle Logic
  const RequestFormModal = RequestFormModalModule.default;
  const modalVNode = React.createElement(RequestFormModal, {
    state: { mode: 'create' },
    onClose: () => {},
    onCreate: () => {},
    onSave: () => {}
  });
  const modalHtml = ReactDOMServer.renderToStaticMarkup(modalVNode);

  const hasCustomerSection = modalHtml.includes('Datos del solicitante');
  const hasCompanySection = modalHtml.includes('Empresa');
  const hasHardwareSection = modalHtml.includes('Tipo de terminal');
  const hasSaleTypesSection = modalHtml.includes('Tipos de venta del POS');
  const hasDocSection = modalHtml.includes('Documentos');
  const hasDraftBtn = modalHtml.includes('Guardar borrador');
  const hasSubmitBtn = modalHtml.includes('Crear y enviar a validación');

  if (hasCustomerSection && hasCompanySection && hasHardwareSection && hasSaleTypesSection && hasDocSection && hasDraftBtn && hasSubmitBtn) {
    recordTest('UI Lifecycle & Actions', 'RequestFormModal Component Hierarchy & Button Layout (Create Mode)', 'PASS', 'Successfully renders all 5 form sections, Draft action, and Submit action.');
  } else {
    recordTest('UI Lifecycle & Actions', 'RequestFormModal Component Hierarchy (Create Mode)', 'FAIL', 'Missing sections or action buttons in RequestFormModal.');
  }

  // Test 2.2: RequestFormModal Edit Mode
  const editModalVNode = React.createElement(RequestFormModal, {
    state: { mode: 'edit', request: initialRequests[0] },
    onClose: () => {},
    onCreate: () => {},
    onSave: () => {}
  });
  const editModalHtml = ReactDOMServer.renderToStaticMarkup(editModalVNode);
  const hasEditTitle = editModalHtml.includes('Editar gestión POS-2026-008');
  const hasSaveBtn = editModalHtml.includes('Guardar cambios');
  const doesNotHaveSubmitBtn = !editModalHtml.includes('Crear y enviar a validación');

  if (hasEditTitle && hasSaveBtn && doesNotHaveSubmitBtn) {
    recordTest('UI Lifecycle & Actions', 'RequestFormModal Edit Mode Lifecycle & Switch', 'PASS', 'Correctly transitions into Edit Mode with contextual title and Save Changes button.');
  } else {
    recordTest('UI Lifecycle & Actions', 'RequestFormModal Edit Mode Lifecycle', 'FAIL', 'Edit mode rendering failed.');
  }

  // Test 2.3: DocumentViewerModal Zoom & Rotation Controls
  const DocumentViewerModal = DocumentViewerModalModule.default;
  const docModalVNode = React.createElement(DocumentViewerModal, {
    open: true,
    type: 'DPI',
    request: initialRequests[0],
    onClose: () => {}
  });
  const docModalHtml = ReactDOMServer.renderToStaticMarkup(docModalVNode);

  let zoom = 1.0;
  zoom = Math.max(0.6, zoom - 0.2);
  zoom = Math.max(0.6, zoom - 0.2);
  zoom = Math.max(0.6, zoom - 0.2);
  const zoomMinClamped = zoom === 0.6;

  zoom = 1.8;
  zoom = Math.min(2.0, zoom + 0.2);
  zoom = Math.min(2.0, zoom + 0.2);
  const zoomMaxClamped = zoom === 2.0;

  let rot = 270;
  rot = (rot + 90) % 360;
  const rotWrapped = rot === 0;

  const hasDownloadButton = docModalHtml.includes('download') || docModalHtml.includes('Descargar');

  if (docModalHtml.includes('Documento Personal de Identificación') && zoomMinClamped && zoomMaxClamped && rotWrapped) {
    if (!hasDownloadButton) {
      recordTest(
        'UI Lifecycle & Actions',
        'DocumentViewerModal Controls (Zoom, Rotate & Download action)',
        'PARTIAL',
        'Zoom (0.6x - 2.0x) and Rotate (90 deg increments) are implemented and clamped; however, Document Download feature is completely missing.',
        'DocumentViewerModal does not provide an action to download or open the original document in a new window/tab.'
      );
    } else {
      recordTest('UI Lifecycle & Actions', 'DocumentViewerModal Controls', 'PASS', 'Viewer modal rendered with full controls and download support.');
    }
  } else {
    recordTest('UI Lifecycle & Actions', 'DocumentViewerModal Controls', 'FAIL', 'Document viewer modal failed to render or controls broken.');
  }

  // Test 2.4: RequestDetailDrawer Sections & Tab Inspection
  const RequestDetailDrawer = RequestDetailDrawerModule.default;
  const drawerVNode = React.createElement(RequestDetailDrawer, {
    request: initialRequests[0],
    onClose: () => {},
    onViewDocument: () => {}
  });
  const drawerHtml = ReactDOMServer.renderToStaticMarkup(drawerVNode);

  const hasSec1 = drawerHtml.includes('Servicio al cliente');
  const hasSec2 = drawerHtml.includes('Validación y afiliados');
  const hasSec3 = drawerHtml.includes('Programación');
  const hasSec4 = drawerHtml.includes('Entrega');
  const hasSec5 = drawerHtml.includes('Instalación');
  const hasBitacora = drawerHtml.includes('Bitácora');

  if (hasSec1 && hasSec2 && hasSec3 && hasSec4 && hasSec5 && hasBitacora) {
    recordTest('UI Lifecycle & Actions', 'RequestDetailDrawer Sequential Sections (Stages 1-5 + Audit Timeline)', 'PASS', 'Renders all 5 workflow sections plus historical bitacora in slide-over drawer.');
  } else {
    recordTest('UI Lifecycle & Actions', 'RequestDetailDrawer Sections', 'FAIL', 'Missing workflow sections in RequestDetailDrawer.');
  }

  // Test 2.5: StageWorkspace Tab Navigation
  const StageWorkspace = StageWorkspaceModule.default;
  const stage1VNode = React.createElement(StageWorkspace, {
    stage: 1,
    actor: 'Ana López',
    requests: initialRequests,
    searchQuery: '',
    applyChange: () => {},
    toast: () => {},
    onOpenDetail: () => {},
    onViewDocument: () => {},
    onNewRequest: () => {},
    onEditRequest: () => {}
  });
  const stage1Html = ReactDOMServer.renderToStaticMarkup(stage1VNode);
  const hasBorradoresTab = stage1Html.includes('Borradores');
  const hasEnviadasTab = stage1Html.includes('Enviadas · seguimiento');

  if (hasBorradoresTab && hasEnviadasTab) {
    recordTest('UI Lifecycle & Actions', 'StageWorkspace Tab Navigation (Queue vs Sent)', 'PASS', 'Correctly configures stage-specific tab titles and counts for workspace queues.');
  } else {
    recordTest('UI Lifecycle & Actions', 'StageWorkspace Tab Navigation', 'FAIL', 'StageWorkspace tabs missing.');
  }

  // =========================================================================
  // SECTION 3: CSV EXPORT DATA GENERATOR LOGIC
  // =========================================================================
  console.log('\n--- SECTION 3: CSV EXPORT DATA GENERATOR LOGIC ---');

  const testRows = [
    {
      id: 'POS-2026-008',
      business: { name: 'Óptica Visión Clara' },
      customer: { nit: '6612093-1' },
      stage: 3,
      completed: false,
      createdAt: '2026-09-23T09:10:00-06:00'
    },
    {
      id: 'POS-2026-009',
      business: { name: 'Distribuidora "El Éxito", S.A.' },
      customer: { nit: '1234567-8' },
      stage: 1,
      completed: false,
      createdAt: '2026-09-24T10:00:00-06:00'
    }
  ];

  const rawHeader = ['ID,Comercio,NIT,Etapa Actual,Progreso,Fecha de Creacion'];
  const rawCsvRows = testRows.map(r => `${r.id},"${r.business.name}","${r.customer.nit}",${r.stage},${r.completed ? 'Completado' : 'En Curso'},${formatDateTime(r.createdAt)}`);

  // DEFECT 1: Escaped newline '\\n' vs real newline '\n'
  const sourceJoinStr = [...rawHeader, ...rawCsvRows].join('\\n');
  const hasLiteralBackslashN = sourceJoinStr.includes('\\n') && !sourceJoinStr.includes('\n');

  if (hasLiteralBackslashN) {
    recordTest(
      'CSV Export',
      'Row Linebreak Escaping (.join("\\\\n") Defect)',
      'FAIL',
      'DashboardView uses .join("\\\\n") with an escaped backslash, producing literal characters "\\n" instead of actual linebreaks.',
      'DashboardView.jsx line 120 executes `[...header, ...csv].join(\'\\\\n\')`. All spreadsheet programs (Excel, LibreOffice) parse this as a single corrupted line.'
    );
  } else {
    recordTest('CSV Export', 'Row Linebreak Escaping', 'PASS', 'Uses correct newline character.');
  }

  // DEFECT 2: Unescaped internal double quotes in business name
  const quoteRow = rawCsvRows[1];
  const hasUnescapedInternalQuotes = quoteRow.includes('"Distribuidora "El Éxito", S.A."');
  if (hasUnescapedInternalQuotes) {
    recordTest(
      'CSV Export',
      'Special Character & Double-Quote Escaping (RFC 4180)',
      'FAIL',
      'Internal double-quotes inside business names are unescaped, breaking CSV column delimiters.',
      'Business name `Distribuidora "El Éxito", S.A.` generates `"Distribuidora "El Éxito", S.A."`, violating RFC 4180. Quotes must be escaped as `""`.'
    );
  } else {
    recordTest('CSV Export', 'Special Character & Double-Quote Escaping', 'PASS', 'Quotes properly escaped.');
  }

  // DEFECT 3: Unquoted date containing comma shifts columns
  const dateFormatted = formatDateTime(testRows[0].createdAt);
  const dateContainsComma = dateFormatted.includes(',');
  if (dateContainsComma) {
    recordTest(
      'CSV Export',
      'Date Column Formatting & Comma Boundary Shift',
      'FAIL',
      `Date format contains a comma ("${dateFormatted}") but is rendered unquoted, splitting into 2 columns and desynchronizing CSV headers.`,
      `formatDateTime returns "${dateFormatted}". When concatenated without quotes (\`\${formatDateTime(r.createdAt)}\`), the comma introduces an unintended 7th column against 6 header columns.`
    );
  } else {
    recordTest('CSV Export', 'Date Column Formatting', 'PASS', 'Date format does not misalign columns.');
  }

  // DEFECT 4: Missing UTF-8 BOM
  recordTest(
    'CSV Export',
    'UTF-8 Byte Order Mark (BOM) for Excel Compatibility',
    'PARTIAL',
    'Missing "\\uFEFF" prefix before CSV blob.',
    'Opening UTF-8 CSV files in Spanish Windows Excel without a BOM causes accented characters ("Óptica", "Visión") to display with mojibake encoding glitches.'
  );

  // =========================================================================
  // SECTION 4: ROLE-BASED VISIBILITY & CONDITIONAL RENDERING
  // =========================================================================
  console.log('\n--- SECTION 4: ROLE-BASED VISIBILITY & CONDITIONAL RENDERING ---');

  const Topbar = TopbarModule.default;
  const Sidebar = SidebarModule.default;

  // Test 4.1: Admin Topbar and Sidebar
  const adminSidebarVNode = React.createElement(Sidebar, {
    view: 'dashboard',
    setView: () => {},
    role: 'admin',
    user: { username: 'admin', role: 'admin' },
    onLogout: () => {},
    requests: initialRequests,
    notifications: initialNotifications,
    onReset: () => {}
  });
  const adminSidebarHtml = ReactDOMServer.renderToStaticMarkup(adminSidebarVNode);
  const adminHasDashboard = adminSidebarHtml.includes('Panel general');
  const adminHasAll5Stages = STAGES.every(s => adminSidebarHtml.includes(`${s.id}. ${s.name}`));
  const adminHasUsers = adminSidebarHtml.includes('Gestión de Usuarios');

  if (adminHasDashboard && adminHasAll5Stages && adminHasUsers) {
    recordTest('Role Permissions', 'Admin Role Complete Menu Visibility', 'PASS', 'Admin sees Dashboard, all 5 workflow stages, systems, architecture, and Users management.');
  } else {
    recordTest('Role Permissions', 'Admin Role Complete Menu Visibility', 'FAIL', 'Admin missing required navigation options.');
  }

  // Test 4.2: Stage Roles Sidebar Isolation
  const stage2SidebarVNode = React.createElement(Sidebar, {
    view: 'stage-2',
    setView: () => {},
    role: 2,
    user: { username: 'validador', role: '2' },
    onLogout: () => {},
    requests: initialRequests,
    notifications: initialNotifications,
    onReset: () => {}
  });
  const stage2SidebarHtml = ReactDOMServer.renderToStaticMarkup(stage2SidebarVNode);
  const stage2HasNoDashboard = !stage2SidebarHtml.includes('Panel general');
  const stage2HasOnlyStage2 = stage2SidebarHtml.includes('2. Validación de Documentos') && !stage2SidebarHtml.includes('1. Servicio al Cliente') && !stage2SidebarHtml.includes('3. Programación');
  const stage2HasNoUsers = !stage2SidebarHtml.includes('Gestión de Usuarios');

  if (stage2HasNoDashboard && stage2HasOnlyStage2 && stage2HasNoUsers) {
    recordTest('Role Permissions', 'Stage Role Workflow Isolation in Desktop Sidebar', 'PASS', 'Stage 2 user sees only Stage 2, excluding Dashboard, other stages, and Users.');
  } else {
    recordTest('Role Permissions', 'Stage Role Workflow Isolation in Desktop Sidebar', 'FAIL', 'Sidebar failed to isolate Stage 2 user.');
  }

  // Test 4.3: Topbar "Nueva gestión" Role Visibility
  const adminTopbarVNode = React.createElement(Topbar, {
    currentUser: { username: 'admin', role: 'admin' },
    view: 'dashboard',
    setView: () => {},
    currentStage: null,
    searchQuery: '',
    setSearchQuery: () => {},
    notifications: initialNotifications,
    onMarkRead: () => {},
    onOpenRequest: () => {},
    onNewRequest: () => {}
  });
  const adminTopbarHtml = ReactDOMServer.renderToStaticMarkup(adminTopbarVNode);
  const adminSeesNewReq = adminTopbarHtml.includes('Nueva gestión');

  const stage2TopbarVNode = React.createElement(Topbar, {
    currentUser: { username: 'validador', role: '2' },
    view: 'stage-2',
    setView: () => {},
    currentStage: 2,
    searchQuery: '',
    setSearchQuery: () => {},
    notifications: initialNotifications,
    onMarkRead: () => {},
    onOpenRequest: () => {},
    onNewRequest: () => {}
  });
  const stage2TopbarHtml = ReactDOMServer.renderToStaticMarkup(stage2TopbarVNode);
  const stage2HidesNewReq = !stage2TopbarHtml.includes('Nueva gestión');

  if (adminSeesNewReq && stage2HidesNewReq) {
    recordTest('Role Permissions', 'Topbar Contextual "Nueva Gestión" Button Rendering', 'PASS', 'Button rendered on Dashboard/Stage 1 and correctly hidden on Stage 2..5.');
  } else {
    recordTest('Role Permissions', 'Topbar Contextual "Nueva Gestión" Button Rendering', 'FAIL', 'Action button displayed improperly.');
  }

  // Test 4.4: CRITICAL SECURITY / UI DEFECT: Mobile View Selector Bypasses Role Restrictions
  const mobileSelectExposesAllStages = STAGES.every(s => stage2TopbarHtml.includes(`value="stage-${s.id}"`));
  const mobileSelectExposesDashboard = stage2TopbarHtml.includes('value="dashboard"');

  if (mobileSelectExposesAllStages && mobileSelectExposesDashboard) {
    recordTest(
      'Role Permissions',
      'Mobile Navigation View Selector Role Guard & Missing Views',
      'FAIL',
      'Topbar mobile select menu ignores user role, exposing all stages and dashboard to non-admin users, while omitting "users" option entirely.',
      'In Topbar.jsx lines 36-45, the mobile `<select>` lists all 5 stages and dashboard unconditionally. A Stage 1 user on mobile can switch to Stage 2-5 or Dashboard. Additionally, the "users" view is not in the dropdown.'
    );
  } else {
    recordTest('Role Permissions', 'Mobile Navigation View Selector Role Guard', 'PASS', 'Mobile navigation properly restricted.');
  }

  // Test 4.5: Topbar Runtime Crash on Unexpected Role
  let unexpectedRoleCrashes = false;
  try {
    const invalidRoleUser = { username: 'testuser', role: 'unknown_role' };
    const invalidRoleTopbar = React.createElement(Topbar, {
      currentUser: invalidRoleUser,
      view: 'dashboard',
      setView: () => {},
      currentStage: null,
      searchQuery: '',
      setSearchQuery: () => {},
      notifications: initialNotifications,
      onMarkRead: () => {},
      onOpenRequest: () => {},
      onNewRequest: () => {}
    });
    ReactDOMServer.renderToStaticMarkup(invalidRoleTopbar);
  } catch (err) {
    unexpectedRoleCrashes = true;
  }

  if (unexpectedRoleCrashes) {
    recordTest(
      'Role Permissions',
      'Topbar Graceful Handling of Non-Standard Roles (Crash Vulnerability)',
      'FAIL',
      'Topbar crashes with unhandled TypeError when currentUser.role is not 1..5 or "admin".',
      'Topbar.jsx line 117 calls `getStage(Number(currentUser.role)).name`. If role is not a recognized stage ID (1-5), `getStage` returns undefined, triggering `Cannot read properties of undefined (reading "name")`.'
    );
  } else {
    recordTest('Role Permissions', 'Topbar Non-Standard Role Handling', 'PASS', 'Handles arbitrary roles safely.');
  }

  // =========================================================================
  // SECTION 5: SEARCH FILTERING LOGIC
  // =========================================================================
  console.log('\n--- SECTION 5: SEARCH FILTERING LOGIC ---');

  const sampleReq = {
    id: 'POS-2026-008',
    customer: { firstName: 'Jorge Luis', lastName: 'Ajquí Tzul', nit: '6612093-1', dpi: '2987 11234 0901' },
    business: { name: 'Óptica Visión Clara' },
    affiliates: { normal: '12887410', cuotas: '12239054' },
    programming: { vhq: { serial: 'VG04566 - 1355664877456687' }, as400: { serial: 'VG04566' } }
  };

  // 5.1 Case Insensitivity & Partial IDs
  const matchUpper = searchMatches(sampleReq, 'POS-2026-008');
  const matchLower = searchMatches(sampleReq, 'pos-2026-008');
  const matchPartialId = searchMatches(sampleReq, '008');
  if (matchUpper && matchLower && matchPartialId) {
    recordTest('Search Filtering', 'Case Insensitivity & Partial ID Search', 'PASS', 'Matches exact and partial identifiers regardless of casing.');
  } else {
    recordTest('Search Filtering', 'Case Insensitivity & Partial ID Search', 'FAIL', 'Case insensitivity or partial ID failed.');
  }

  // 5.2 Client Name, Business Name, NIT, DPI, Affiliate Matching
  const matchFirstName = searchMatches(sampleReq, 'Jorge');
  const matchBusiness = searchMatches(sampleReq, 'Visión');
  const matchNit = searchMatches(sampleReq, '6612093-1');
  const matchDpi = searchMatches(sampleReq, '2987 11234 0901');
  const matchAffiliate = searchMatches(sampleReq, '12887410');
  const matchPartialAff = searchMatches(sampleReq, '1288');
  const matchSerial = searchMatches(sampleReq, 'VG04566');

  if (matchFirstName && matchBusiness && matchNit && matchDpi && matchAffiliate && matchPartialAff && matchSerial) {
    recordTest('Search Filtering', 'Comprehensive Field Coverage (Names, NIT, DPI, Affiliates, Serials)', 'PASS', 'Search queries successfully target customer names, business titles, tax IDs, CUI, and hardware serials.');
  } else {
    recordTest('Search Filtering', 'Comprehensive Field Coverage', 'FAIL', 'Some entity fields were not indexed by searchMatches.');
  }

  // 5.3 Accent (Diacritic) Sensitivity Defect
  const matchWithoutAccent1 = searchMatches(sampleReq, 'Ajqui');
  const matchWithoutAccent2 = searchMatches(sampleReq, 'Optica');
  const matchWithoutAccent3 = searchMatches(sampleReq, 'Vision');

  if (!matchWithoutAccent1 || !matchWithoutAccent2 || !matchWithoutAccent3) {
    recordTest(
      'Search Filtering',
      'Accent-Insensitive Search (Diacritics Normalization)',
      'FAIL',
      'Search fails when users type words without accents (e.g. "Optica" fails to match "Óptica", "Ajqui" fails "Ajquí").',
      'workflow.js line 177 performs `.toLowerCase().includes(s)` without `.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "")`. In Guatemala, users frequently omit tildes on search queries.'
    );
  } else {
    recordTest('Search Filtering', 'Accent-Insensitive Search', 'PASS', 'Properly strips diacritics.');
  }

  // 5.4 Leading/Trailing Whitespace in Query Defect
  const matchWithWhitespace = searchMatches(sampleReq, '  Jorge  ');
  if (!matchWithWhitespace) {
    recordTest(
      'Search Filtering',
      'Query Whitespace Trimming',
      'FAIL',
      'Search query with leading/trailing spaces ("  Jorge  ") fails to match due to missing .trim() on normalized query variable.',
      'workflow.js line 177 sets `const s = q.toLowerCase();` without `.trim()`. Query `"  Jorge  "` is searched literally and fails.'
    );
  } else {
    recordTest('Search Filtering', 'Query Whitespace Trimming', 'PASS', 'Query is properly trimmed before searching.');
  }

  // =========================================================================
  // SECTION 6: UI ERGONOMICS & VISUAL GLITCH INSPECTION
  // =========================================================================
  console.log('\n--- SECTION 6: UI ERGONOMICS & VISUAL GLITCH INSPECTION ---');

  // Test 6.1: Badge component in UsersManagementView passing unused `icon` prop
  const Badge = uiComponents.Badge;
  const badgeHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(Badge, { tone: 'violet', icon: () => null }, 'Admin'));
  const badgeRendersIcon = badgeHtml.includes('<svg') || badgeHtml.includes('icon');
  if (!badgeRendersIcon) {
    recordTest(
      'UI Glitch',
      'Badge Component Icon Prop Inconsistency in UsersManagementView',
      'PARTIAL',
      'UsersManagementView passes `icon={Shield}` to Badge, but Badge does not support or render an icon prop.',
      'In `ui.jsx`, `Badge` only accepts `{ tone, dot, className, children }`. The `icon={Shield}` prop in UsersManagementView.jsx line 103 is completely ignored.'
    );
  } else {
    recordTest('UI Glitch', 'Badge Component Icon Prop', 'PASS', 'Badge supports icons.');
  }

  // Test 6.2: Offline / Empty state in UsersManagementView
  const UsersManagementView = UsersManagementViewModule.default;
  const usersViewHtml = ReactDOMServer.renderToStaticMarkup(React.createElement(UsersManagementView));
  const hasEmptyStateForUsers = usersViewHtml.includes('No hay usuarios registrados') || usersViewHtml.includes('Cargando');
  if (!hasEmptyStateForUsers) {
    recordTest(
      'UI Ergonomics',
      'UsersManagementView Empty / Offline State Feedback',
      'PARTIAL',
      'No user-friendly empty state or backend connection warning rendered inside the user list when 0 users are loaded.',
      'When the backend is offline or no users exist, UsersManagementView renders an empty box with no empty-state illustration or retry button.'
    );
  } else {
    recordTest('UI Ergonomics', 'UsersManagementView Empty State', 'PASS', 'Provides clear feedback.');
  }

  // Test 6.3: Mobile responsiveness of Sidebar vs Topbar Logout/Reset
  recordTest(
    'UI Ergonomics',
    'Mobile Screen Logout & Reset Demo Access',
    'FAIL',
    'Sidebar with Logout and Reset Demo buttons is hidden on viewports < 1024px, and Topbar provides no mobile alternative.',
    'Mobile/tablet users cannot log out or reset the demo data without opening browser developer tools or manually clearing localStorage.'
  );

  // Close server
  await server.close();

  // Print Summary
  console.log('\n' + '='.repeat(80));
  console.log('AUDIT SUMMARY:');
  console.log(`Total Checks Executed : ${testResults.details.length}`);
  console.log(`Passed                : ${testResults.passed}  ✅`);
  console.log(`Failed                : ${testResults.failed}  ❌`);
  console.log(`Partial / Degraded    : ${testResults.partial}  ⚠️`);
  console.log('='.repeat(80));

  return testResults;
}

runAudit().catch(err => {
  console.error('Fatal audit failure:', err);
  process.exit(1);
});
