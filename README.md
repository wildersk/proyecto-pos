# POS Central — Plataforma de Gestión de Terminales

Aplicación de gestión del flujo de alta e instalación de terminales POS. El proceso se divide en cinco etapas (captura, validación, programación, entrega e instalación) y cada usuario accede solo a la etapa que le corresponde según su rol.

- **Frontend:** React 19 + Vite + Tailwind CSS 4
- **Backend:** Spring Boot 4.1 (Java 21) + Spring Security con JWT
- **Base de datos:** PostgreSQL 16 en Docker

---

## 1. Requisitos

| Herramienta | Versión mínima | Para qué |
|---|---|---|
| **Docker Desktop** | cualquiera reciente | Levantar PostgreSQL |
| **JDK** | 21 o superior | Compilar y ejecutar el backend |
| **Node.js** | 20 o superior | Ejecutar el frontend |

No hace falta instalar Maven: el repositorio incluye el wrapper (`mvnw`).

Comprueba que lo tienes todo:

```bash
docker --version
java -version
node -v
```

---

## 2. Puesta en marcha

Son tres procesos y hay que arrancarlos **en este orden**. Abre una terminal distinta para los pasos 2 y 3, porque ambos se quedan en ejecución.

### Paso 1 — Base de datos

```bash
cd backend
docker compose up -d
```

Esto levanta un contenedor llamado `pos_postgres` con la base `pos_db`. Se publica en el **puerto 5433** del host (no en el 5432, para no chocar con un PostgreSQL que ya tengas instalado).

Verifica que está arriba:

```bash
docker compose ps
```

### Paso 2 — Backend

```bash
cd backend
./mvnw spring-boot:run
```

En Windows con PowerShell o CMD:

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Queda escuchando en **http://localhost:8080**. Para confirmar que responde, abre esa URL en el navegador: devuelve un JSON con `"status": "online"` y la lista de endpoints.

En el primer arranque ocurren dos cosas automáticamente:

1. Hibernate crea las tablas (`spring.jpa.hibernate.ddl-auto=update`).
2. Si la tabla `usuarios` está vacía, se crean los **usuarios de prueba** de la sección 3.

### Paso 3 — Frontend

Desde la raíz del proyecto (no desde `backend/`):

```bash
npm install
npm run dev
```

Vite imprime la URL, normalmente **http://localhost:5173**. Ábrela y entra con cualquiera de los usuarios de la tabla siguiente.

---

## 3. Usuarios de prueba

Se crean solos en el primer arranque del backend contra una base de datos vacía. Todos comparten la misma contraseña:

**Contraseña: `Password123!`**

| Usuario | Rol | Qué puede hacer |
|---|---|---|
| `administrador1` | admin | Acceso a todo, incluida la gestión de usuarios |
| `etapa1` | Etapa 1 | Servicio al Cliente — captura de solicitudes |
| `etapa2` | Etapa 2 | Validación de Documentos — crea afiliados |
| `etapa3` | Etapa 3 | Programación — configura la terminal |
| `etapa4` | Etapa 4 | Entrega — programa el despacho |
| `etapa5` | Etapa 5 | Instalación — confirma la instalación |

Para recorrer el flujo completo conviene ir iniciando sesión con `etapa1`, luego `etapa2`, y así sucesivamente, o usar `administrador1`, que ve todas las etapas.

Los usuarios nuevos se crean desde la propia aplicación entrando como `administrador1`, en la vista de gestión de usuarios.

> **La siembra solo actúa si la tabla `usuarios` no tiene ninguna fila.** Nunca sobrescribe contraseñas existentes ni recrea usuarios que hayas borrado a mano. Si quieres volver al estado inicial, borra el volumen (sección 6) y arranca el backend de nuevo.

---

## 4. Configuración

Todo tiene valores por defecto que funcionan en local; estas variables solo hacen falta si quieres cambiar algo.

### Backend

| Variable | Por defecto | Para qué |
|---|---|---|
| `POS_DB_URL` | `jdbc:postgresql://localhost:5433/pos_db` | Conexión a PostgreSQL |
| `POS_DB_USERNAME` | `pos_user` | Usuario de la base |
| `POS_DB_PASSWORD` | `pos_password` | Contraseña de la base |
| `POS_JWT_SECRET` | *(aleatoria en cada arranque)* | Clave de firma de los JWT. Mínimo 32 caracteres |
| `POS_CORS_ALLOWED_ORIGINS` | `*` | Orígenes permitidos, separados por comas |
| `POS_SEED_ENABLED` | `true` | Pon `false` para desactivar la siembra inicial |
| `POS_SEED_PASSWORD` | `Password123!` | Contraseña de los usuarios sembrados |

### Frontend

| Variable | Por defecto | Para qué |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080` | URL del backend |

Para cambiarla, crea un archivo `.env` en la raíz:

```
VITE_API_URL=http://localhost:8080
```

---

## 5. Dos comportamientos 


**Al reiniciar el backend caducan todas las sesiones.** Si `POS_JWT_SECRET` no está definida, el backend genera una clave aleatoria en cada arranque, lo que invalida los tokens emitidos antes. Se nota sobre todo al recompilar mientras desarrollas. Para evitarlo, define la variable con cualquier cadena de 32 caracteres o más:

```bash
# Linux / macOS
export POS_JWT_SECRET="una-clave-de-desarrollo-de-32-chars-o-mas"
```

```powershell
# Windows PowerShell
$env:POS_JWT_SECRET = "una-clave-de-desarrollo-de-32-chars-o-mas"
```

---

## 6. Comandos útiles

### Base de datos

```bash
cd backend

docker compose up -d              # Levantar
docker compose stop               # Parar sin perder datos
docker compose down               # Parar y eliminar el contenedor (los datos se conservan)
docker compose down -v            # Parar y BORRAR los datos (vuelve a sembrar al arrancar)
```

```bash
# Abrir una consola SQL
docker exec -it pos_postgres psql -U pos_user -d pos_db

# Ver los usuarios registrados
docker exec pos_postgres psql -U pos_user -d pos_db -c "SELECT id, username, role FROM usuarios ORDER BY id;"
```

Los datos viven en un volumen de Docker (`backend_postgres_data`), que Docker guarda en su propio almacenamiento y **no** dentro de la carpeta del proyecto. Por eso al clonar el repositorio la base de datos siempre empieza vacía, y por eso `docker compose down -v` es la forma de volver al estado inicial.

### Frontend

```bash
npm run dev       # Servidor de desarrollo
npm run build     # Compilar para producción
npm run preview   # Servir la compilación de producción
npm run lint      # Oxlint
```

### Backend

```bash
cd backend

./mvnw spring-boot:run    # Arrancar
./mvnw test               # Ejecutar las pruebas
./mvnw clean package      # Generar el .jar en target/
```

---

## 7. Problemas frecuentes

**«Error de conexión con el servidor» en la pantalla de login.** El backend no está corriendo o no está en el puerto 8080. Abre http://localhost:8080 para comprobarlo.

**El backend no arranca y menciona `Connection refused` al puerto 5433.** El contenedor de PostgreSQL no está levantado. Ejecuta `docker compose up -d` dentro de `backend/` y espera unos segundos.

**«Usuario o contraseña incorrectos» con los usuarios de prueba.** Lo más probable es que la tabla ya tuviera datos cuando arrancaste el backend, así que la siembra se omitió. Comprueba qué hay:

```bash
docker exec pos_postgres psql -U pos_user -d pos_db -c "SELECT username, role FROM usuarios;"
```

Si la tabla no está vacía pero no reconoces a esos usuarios, o si en los logs del backend ves el error `Encoded password does not look like BCrypt` (esto ocurre si usaste el `mock-backend.js` previamente o se guardaron contraseñas en texto plano), empieza de cero borrando el volumen:
```bash
docker compose down -v
docker compose up -d
```
y finalmente reinicia el backend de Java.

**Nota sobre `mock-backend.js`**: Si estás ejecutando `node mock-backend.js` en el puerto 8080, asegúrate de detenerlo antes de iniciar el backend real de Spring Boot, de lo contrario ambos chocarán en el puerto o podrías tener comportamientos inesperados con las credenciales de prueba.

**El puerto 5433 ya está ocupado.** Cambia el mapeo en `backend/docker-compose.yml` (por ejemplo a `"5434:5432"`) y define `POS_DB_URL` con el puerto nuevo.

**`./mvnw` no se ejecuta en Linux o macOS.** Dale permisos: `chmod +x mvnw`.

---

## 8. Estructura del proyecto

```
proyecto-pos-frontend/
├── src/                        # Frontend (React)
│   ├── views/                  # Pantallas: login, dashboard, etapas, usuarios
│   ├── components/stages/      # Panel de cada una de las 5 etapas
│   ├── lib/api.js              # Cliente HTTP y almacenamiento del token
│   └── lib/workflow.js         # Definición de las etapas y tipos de venta
│
└── backend/                    # Backend (Spring Boot)
    ├── docker-compose.yml      # PostgreSQL
    └── src/main/java/com/pos/backend/
        ├── controller/         # Endpoints REST
        ├── model/              # Entidades JPA
        ├── repository/         # Acceso a datos
        ├── config/             # DataSeeder: siembra de los usuarios de prueba
        └── security/           # Configuración de seguridad y emisión de JWT
```

### Endpoints y permisos

La autenticación es por JWT en la cabecera `Authorization: Bearer <token>`. El único endpoint público es el login.

| Método y ruta | Roles con acceso |
|---|---|
| `POST /api/usuarios/login` | público |
| `GET`, `POST /api/usuarios` | admin |
| `POST /api/solicitudes` | admin, etapa 1 |
| `GET /api/solicitudes` | admin, etapas 1 y 2 |
| `PUT /api/solicitudes/{id}/estado` | admin, etapa 2 |
| `POST /api/afiliados` | admin, etapa 2 |
| `GET /api/afiliados` | admin, etapas 2 y 3 |
| `POST /api/terminales` | admin, etapa 3 |
| `GET /api/terminales` | admin, etapas 3 y 4 |
| `POST /api/ordenes-despacho` | admin, etapa 4 |
| `GET /api/ordenes-despacho` | admin, etapas 4 y 5 |
| `PUT /api/ordenes-despacho/{id}/estado` | admin, etapa 5 |

### Esta es solo una copia del proyecto que se desarrollo, no es la version final.