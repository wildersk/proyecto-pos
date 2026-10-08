import http from 'node:http';

const PORT = 8080;

let usuarios = [
  { id: 1, username: 'Administrador', password: '12345', role: 'admin' },
  { id: 2, username: 'Etapa1', password: '12345', role: '1' },
  { id: 3, username: 'Etapa2', password: '12345', role: '2' },
  { id: 4, username: 'Etapa3', password: '12345', role: '3' },
  { id: 5, username: 'Etapa4', password: '12345', role: '4' },
  { id: 6, username: 'Etapa5', password: '12345', role: '5' }
];

let solicitudes = [];
let afiliados = [];
let terminales = [];
let ordenesDespacho = [];

let nextId = {
  usuario: 7,
  solicitud: 1,
  afiliado: 1,
  terminal: 1,
  orden: 1
};

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:8080'}`);
  const pathname = parsedUrl.pathname;

  // Helper to read JSON or text body
  const readBody = () => new Promise((resolve) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        resolve(data);
      }
    });
  });

  try {
    // 1. /api/usuarios/login
    if (pathname === '/api/usuarios/login' && req.method === 'POST') {
      const body = await readBody();
      const user = usuarios.find(u => u.username.toLowerCase() === (body.username || '').toLowerCase() && u.password === body.password);
      if (user) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        // Mismo formato que el backend real; el mock no valida el token en las demás rutas
        res.end(JSON.stringify({
          token: 'mock-token',
          tokenType: 'Bearer',
          expiresIn: 28800,
          usuario: { id: user.id, username: user.username, role: user.role }
        }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Credenciales inválidas' }));
      }
      return;
    }

    // 2. /api/usuarios
    if (pathname === '/api/usuarios') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(usuarios.map(u => ({ id: u.id, username: u.username, role: u.role }))));
        return;
      }
      if (req.method === 'POST') {
        const body = await readBody();
        const exists = usuarios.some(u => u.username.toLowerCase() === (body.username || '').toLowerCase());
        if (exists) {
          res.writeHead(409, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ message: 'El usuario ya existe' }));
          return;
        }
        const newUser = { id: nextId.usuario++, username: body.username, password: body.password, role: body.role };
        usuarios.push(newUser);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: newUser.id, username: newUser.username, role: newUser.role }));
        return;
      }
    }

    // 3. /api/solicitudes
    if (pathname === '/api/solicitudes') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(solicitudes));
        return;
      }
      if (req.method === 'POST') {
        const body = await readBody();
        const nuevaSolicitud = {
          id: nextId.solicitud++,
          giroNegocio: body.giroNegocio,
          datosFiscales: body.datosFiscales,
          modalidadPos: body.modalidadPos,
          estado: 'Pendiente'
        };
        solicitudes.push(nuevaSolicitud);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(nuevaSolicitud));
        return;
      }
    }

    const solEstadoMatch = pathname.match(/^\/api\/solicitudes\/(\d+)\/estado$/);
    if (solEstadoMatch && req.method === 'PUT') {
      const id = parseInt(solEstadoMatch[1], 10);
      const body = await readBody();
      const sol = solicitudes.find(s => s.id === id);
      if (sol) {
        sol.estado = typeof body === 'string' ? body : body.estado;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(sol));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Solicitud no encontrada' }));
      }
      return;
    }

    // 4. /api/afiliados
    if (pathname === '/api/afiliados') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(afiliados));
        return;
      }
      if (req.method === 'POST') {
        const body = await readBody();
        const num = body.numeroAfiliado || String(Math.floor(10000000 + Math.random() * 90000000));
        const nuevoAfiliado = {
          id: nextId.afiliado++,
          numeroAfiliado: num,
          solicitud: body.solicitud
        };
        afiliados.push(nuevoAfiliado);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(nuevoAfiliado));
        return;
      }
    }

    // 5. /api/terminales
    if (pathname === '/api/terminales') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(terminales));
        return;
      }
      if (req.method === 'POST') {
        const body = await readBody();
        const nuevaTerminal = {
          id: nextId.terminal++,
          numeroSerie: body.numeroSerie,
          tid: body.tid,
          tipoConexion: body.tipoConexion,
          sistemaSubyacente: body.sistemaSubyacente,
          afiliado: body.afiliado
        };
        terminales.push(nuevaTerminal);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(nuevaTerminal));
        return;
      }
    }

    // 6. /api/ordenes-despacho
    if (pathname === '/api/ordenes-despacho') {
      if (req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(ordenesDespacho));
        return;
      }
      if (req.method === 'POST') {
        const body = await readBody();
        const nuevaOrden = {
          id: nextId.orden++,
          fechaHabil: body.fechaHabil,
          jornada: body.jornada,
          terminal: body.terminal,
          estadoInstalacion: 'Pendiente'
        };
        ordenesDespacho.push(nuevaOrden);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(nuevaOrden));
        return;
      }
    }

    const ordenEstadoMatch = pathname.match(/^\/api\/ordenes-despacho\/(\d+)\/estado$/);
    if (ordenEstadoMatch && req.method === 'PUT') {
      const id = parseInt(ordenEstadoMatch[1], 10);
      const body = await readBody();
      const orden = ordenesDespacho.find(o => o.id === id);
      if (orden) {
        orden.estadoInstalacion = typeof body === 'string' ? body : body.estado;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(orden));
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ message: 'Orden no encontrada' }));
      }
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Endpoint no encontrado' }));
  } catch (error) {
    console.error('API Error:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
});

server.listen(PORT, () => {
  console.log(`Mock Backend server listening on http://localhost:${PORT}`);
});
