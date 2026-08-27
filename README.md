# TaskNotification API

API REST para gestión de tareas y usuarios: asignación de tareas, notificaciones de archivado con reintentos, e idempotencia en operaciones de escritura.

**Repositorio:** https://github.com/10Draken01/testing-task
**Documentación completa de endpoints:** [`docs/API.md`](./docs/API.md)
**Esquema SQL:** [`sql/schema.sql`](./sql/schema.sql)

---

## Despliegue

🔗 **API pública:** [https://base.testing-task.online/](https://base.testing-task.online/)

**Dónde:** Render (free tier), con dominio propio (`testing-task.online`) apuntado por DNS y HTTPS automático vía Let's Encrypt.

**Por qué:** entre las opciones gratuitas evaluadas, Render fue la única que ofrece HTTPS automático + dominio propio + auto-deploy desde GitHub sin pedir tarjeta de crédito. La contrapartida asumida conscientemente: el free tier no garantiza disco persistente entre reinicios/redeploys (la base SQLite puede resetearse) y la instancia "duerme" tras ~15 min de inactividad (el primer request tras eso tarda 30–50s). Suficiente para el alcance de esta prueba; en producción real se movería a un plan con disco persistente.

**Cómo acceder:** todos los `POST` requieren el header `Idempotency-Key` (ver `docs/API.md`). Ejemplo:

```bash
curl -X POST https://testing-task.online/tasks \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{"title":"Comprar leche"}'
```

---

## Ejecutar localmente

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

---

## Decisiones técnicas y justificación

- **Arquitectura hexagonal (ports & adapters):** casos de uso puros, sin depender de Express ni de SQLite directamente. Permite testear reglas de negocio de forma aislada y cambiar de motor de base de datos sin tocarlas.
- **SQLite (`better-sqlite3`):** sin servidor externo que levantar, API síncrona que simplifica transacciones atómicas — clave para los dos requisitos de confiabilidad más delicados (ver abajo).
- **Archivado sin duplicados:** `UPDATE tasks SET status='archived' WHERE id=? AND status='open'`, verificando `changes > 0`. Si dos usuarios completan la última parte en paralelo, solo uno de los dos `UPDATE` afecta una fila; el otro no dispara notificación. Se resolvió a nivel de DB en vez de con locks en memoria, porque es la única garantía real ante escrituras concurrentes.
- **Idempotencia con `UNIQUE` en `idempotency_keys.idempotencyKey`:** mismo principio — un `INSERT` con `PRIMARY KEY` es atómico en SQLite; el segundo request concurrente con la misma key falla el insert y espera (poll corto) la respuesta que ya generó el primero, garantizando respuestas idénticas incluso en paralelo real.
- **Zod para validación:** un schema define validación y tipo TypeScript a la vez, evitando duplicar esa lógica.
- **Reintentos de notificación con backoff exponencial (máx. 3), auditados en `notification_attempts`:** cumple el requisito de confiabilidad y deja trazabilidad consultable vía `GET /tasks/:idTask/notifications`.
- **Formato de error único (`{ error: { code, message } }`) vía un solo error-handler global:** consistencia en toda la API sin repetir lógica de formateo en cada controller.
- **Tests de integración (Vitest + Supertest) sobre los endpoints reales:** en vez de mockear las capas internas, se testea el comportamiento real incluyendo middlewares, concurrencia (`Promise.all`) e idempotencia.
- **CORS configurable vía `ALLOWED_ORIGINS`:** permite restringir orígenes en producción sin tocar código; sin la variable definida, acepta cualquier origen (útil en desarrollo/testing).

## Supuestos ante ambigüedades

- Los IDs (`userId`, `taskId`) se generan como UUID (string), no numéricos como el ejemplo `"userIds": [1,2,3]` del enunciado — es el estándar para IDs generados por el servidor sin autoincrement centralizado; el array de ejemplo se interpretó como ilustrativo, no como tipo estricto.
- `POST /tasks/:idTask/complete` sobre un usuario que ya había completado su parte se trata como éxito idempotente (no error), para no penalizar reintentos legítimos del cliente.
- `POST /tasks/:idTask/assign` sobre un usuario ya asignado no falla — solo evita duplicar la relación, interpretando "no debe duplicarse" en vez de "debe rechazarse".
- Solo un `5xx` o ausencia de respuesta disparan reintento de notificación; un `4xx` se trata como error del cliente que no cambiaría al reintentar.
- `description` en `POST /tasks` es opcional; si no se envía, se guarda como `""` en vez de `null`, para simplificar el tipado de la entidad.
- `Idempotency-Key` se exigió obligatoria en todo `POST` (decisión propia, no explícita en el enunciado) para reforzar la garantía de confiabilidad pedida. Los `GET` no la requieren por ser naturalmente idempotentes.

## Funcionalidades recortadas por falta de tiempo

- Sin autenticación/autorización: cualquiera puede crear usuarios, tareas y completarlas. Fuera del alcance pedido, pero necesario para un entorno real.
- Sin paginación en `GET /tasks` / `GET /users`: no era crítico para el volumen de esta prueba.
- Los ports soportan `delete`, pero no hay endpoints `DELETE` expuestos en las rutas.
- Los reintentos de notificación son secuenciales dentro del mismo ciclo de vida del proceso: si el servidor se reinicia a mitad de la secuencia, ese intento pendiente se pierde (no hay cola persistente tipo BullMQ/cron job de reintentos).