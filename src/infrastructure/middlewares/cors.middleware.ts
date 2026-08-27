// src/infrastructure/middlewares/cors.middleware.ts
import cors from 'cors';

// ALLOWED_ORIGINS: lista separada por comas, ej: "https://miapp.com,https://otro.com"
// Si no se define, permite cualquier origen (útil en dev/testing).
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim());

export const corsMiddleware = cors({
  origin: allowedOrigins && allowedOrigins.length > 0 ? allowedOrigins : true,
  methods: ['GET', 'POST'], // la API solo expone estos métodos
  allowedHeaders: ['Content-Type', 'Idempotency-Key'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
});