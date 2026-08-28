# TaskNotification API

API REST para gestión de tareas y usuarios: asignación de tareas, notificaciones de archivado con reintentos, e idempotencia en operaciones de escritura.

**\*\*Repositorio:\*\*** [https://github.com/10Draken01/testing-task](https://github.com/10Draken01/testing-task)

**\*\*Documentación completa de endpoints:\*\*** [`docs/API.md`](./docs/API.md)

**\*\*Esquema SQL:\*\*** [`sql/schema.sql`](./sql/schema.sql)

**\*\*Diagrama UML (ER):\*\*** [`docs/database-uml.md`](./docs/database-uml.md)

---

**## Despliegue**

🔗 **\*\*API pública:\*\*** [[https://improvement.testing-task.online/](https://improvement.testing-task.online/)](https://improvement.testing-task.online/)

**\*\*Dónde:\*\*** Render (free tier), con dominio propio (`testing-task.online`) apuntado por DNS y HTTPS automático vía Let's Encrypt.

**\*\*Por qué:\*\*** entre las opciones gratuitas evaluadas, Render fue la única que ofrece HTTPS automático + dominio propio + auto-deploy desde GitHub sin pedir tarjeta de crédito. La contrapartida asumida conscientemente: el free tier no garantiza disco persistente entre reinicios/redeploys (la base SQLite puede resetearse) y la instancia "duerme" tras ~15 min de inactividad (el primer request tras eso tarda 30–50s). Suficiente para el alcance de esta prueba; en producción real se movería a un plan con disco persistente.

**\*\*Cómo acceder:\*\*** todos los `POST` de la API principal requieren el header `Idempotency-Key` (ver `docs/API.md`). Ejemplo:

```bash
curl -X POST https://improvement.testing-task.online/tasks \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"title":"Comprar leche"}'
```

**\*\*Endpoint adicional de desarrollo/testing:\*\*** la API también incluye `POST /fake-data`, un endpoint destinado exclusivamente a desarrollo, testing y demostración. Permite generar automáticamente 100 usuarios y 100 tareas, asignando las primeras 50 tareas a los primeros 50 usuarios para facilitar las pruebas de paginación en `GET /users` y `GET /tasks`.

Este endpoint no forma parte del flujo funcional principal de la API y utiliza el header `admin-password` como mecanismo simple de protección. No requiere body ni `Idempotency-Key`.

Ejemplo:

```bash
curl -X POST https://improvement.testing-task.online/fake-data \
  -H "admin-password: <ADMIN_PASSWORD>"
```

> **Nota:** el valor real de `admin-password` no se incluye en el repositorio ni en esta documentación.

---

**## Ejecutar localmente**

```bash
git clone https://github.com/10Draken01/testing-task.git

cd testing-task

npm install

cp .env.example .env   # completar NOTIFY_URL si se quiere probar notificaciones

npm run dev             # levanta con recarga automática (tsx)
```

Producción local:

```bash
npm run build

npm start
```

Tests:

```bash
npm test
```

La base SQLite (`DB_PATH`, default `./data.db`) se crea sola al arrancar, ejecutando `sql/schema.sql`.

Para probar el endpoint adicional de generación de datos, configurar también el password administrativo correspondiente en las variables de entorno y realizar una petición a `POST /fake-data` utilizando el header `admin-password`.

---

**## Decisiones técnicas y justificación**

- **\*\*Arquitectura hexagonal (ports & adapters):\*\*** casos de uso puros, sin depender de Express ni de SQLite directamente. Permite testear reglas de negocio de forma aislada y cambiar de motor de base de datos sin tocarlas.

- **\*\*SQLite (`better-sqlite3`):\*\*** sin servidor externo que levantar, API síncrona que simplifica transacciones atómicas — clave para los dos requisitos de confiabilidad más delicados (ver abajo).

- **\*\*Archivado sin duplicados:\*\*** `UPDATE tasks SET status='archived' WHERE id=? AND status='open'`, verificando `changes > 0`. Si dos usuarios completan la última parte en paralelo, solo uno de los dos `UPDATE` afecta una fila; el otro no dispara notificación. Se resolvió a nivel de DB en vez de con locks en memoria, porque es la única garantía real ante escrituras concurrentes.

- **\*\*Idempotencia con `UNIQUE` en `idempotency_keys.idempotencyKey`:\*\*** mismo principio — un `INSERT` con `PRIMARY KEY` es atómico en SQLite; el segundo request concurrente con la misma key falla el insert y espera (poll corto) la respuesta que ya generó el primero, garantizando respuestas idénticas incluso en paralelo real.

- **\*\*Zod para validación:\*\*** un schema define validación y tipo TypeScript a la vez, evitando duplicar esa lógica.

- **\*\*Reintentos de notificación con backoff exponencial (máx. 3), auditados en `notification_attempts`:\*\*** cumple el requisito de confiabilidad y deja trazabilidad consultable vía `GET /tasks/:idTask/notifications`.

- **\*\*Formato de error único (`{ error: { code, message } }`) vía un solo error-handler global:\*\*** consistencia en toda la API sin repetir lógica de formateo en cada controller.

- **\*\*Tests de integración (Vitest + Supertest) sobre los endpoints reales:\*\*** en vez de mockear las capas internas, se testea el comportamiento real incluyendo middlewares, concurrencia (`Promise.all`) e idempotencia.

- **\*\*CORS configurable vía `ALLOWED_ORIGINS`:\*\*** permite restringir orígenes en producción sin tocar código; sin la variable definida, acepta cualquier origen (útil en desarrollo/testing).

- **\*\*Rate limiting global por IP (`express-rate-limit`):\*\*** protege contra abuso/DoS básico sin costo de infraestructura adicional. Configurable vía `RATE_LIMIT_WINDOW_MS`/`RATE_LIMIT_MAX`; al superarlo, `429 RATE_LIMIT_EXCEEDED` con el mismo formato de error del resto de la API. Detalle en `docs/API.md`.

- **\*\*Paginación en `GET /tasks` y `GET /users` (`LIMIT`/`OFFSET` a nivel de SQL, no en memoria):\*\*** evita traer y filtrar toda la tabla en cada request, algo que no escalaría al crecer el volumen de datos. `page`/`limit` configurables por query param, con tope máximo (`MAX_PAGE_SIZE`) para evitar que un cliente pida páginas arbitrariamente grandes.

- **\*\*Endpoint FakeData para generación de datos de prueba:\*\*** permite generar automáticamente 100 usuarios y 100 tareas, asignando las primeras 50 tareas a los primeros 50 usuarios. Su objetivo es proporcionar rápidamente un volumen controlado de datos relacionados para probar y demostrar el comportamiento de la paginación de `GET /users` y `GET /tasks`, evitando tener que crear manualmente cada registro. Es una funcionalidad auxiliar de desarrollo/testing y no forma parte del flujo funcional principal de la API.

---

**## Supuestos ante ambigüedades**

- Los IDs (`userId`, `taskId`) se generan como UUID (string), no numéricos como el ejemplo `"userIds": [1,2,3]` del enunciado — es el estándar para IDs generados por el servidor sin autoincrement centralizado; el array de ejemplo se interpretó como ilustrativo, no como tipo estricto.

- `POST /tasks/:idTask/complete` sobre un usuario que ya había completado su parte se trata como éxito idempotente (no error), para no penalizar reintentos legítimos del cliente.

- `POST /tasks/:idTask/assign` sobre un usuario ya asignado no falla — solo evita duplicar la relación, interpretando "no debe duplicarse" en vez de "debe rechazarse".

- Solo un `5xx` o ausencia de respuesta disparan reintento de notificación; un `4xx` se trata como error del cliente que no cambiaría al reintentar.

- `description` en `POST /tasks` es opcional; si no se envía, se guarda como `""` en vez de `null`, para simplificar el tipado de la entidad.

- `Idempotency-Key` se exigió obligatoria en todo `POST` de la API principal (decisión propia, no explícita en el enunciado) para reforzar la garantía de confiabilidad pedida. `POST /fake-data` es una excepción deliberada debido a que su finalidad es exclusivamente generar datos de prueba y utiliza `admin-password` como protección básica. Los `GET` no la requieren por ser naturalmente idempotentes.

- Paginación con defaults propios (`page=1`, `limit=20`, tope `100`) al no estar especificada en el enunciado — valores razonables para el volumen esperado de esta prueba, ajustables vía env vars sin tocar código.

- `POST /fake-data` se considera una funcionalidad auxiliar para desarrollo, testing y demostración. No representa un mecanismo de carga de datos para producción ni forma parte de los casos de uso principales de la API.

---

**## Funcionalidades recortadas por falta de tiempo**

- Sin autenticación/autorización: cualquiera puede crear usuarios, tareas y completarlas. Fuera del alcance pedido, pero necesario para un entorno real.

- Los ports soportan `delete`, pero no hay endpoints `DELETE` expuestos en las rutas.

- Los reintentos de notificación son secuenciales dentro del mismo ciclo de vida del proceso: si el servidor se reinicia a mitad de la secuencia, ese intento pendiente se pierde (no hay cola persistente tipo BullMQ/cron job de reintentos).

- **\*\*El endpoint `POST /fake-data` no constituye un sistema de autenticación administrativa.\*\*** El header `admin-password` únicamente proporciona una protección básica para evitar ejecuciones accidentales o acceso casual al endpoint durante desarrollo/testing. Para un entorno de producción debería sustituirse por un mecanismo de autenticación y autorización adecuado, o eliminarse completamente.