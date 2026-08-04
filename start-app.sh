#!/bin/bash
cd /app
export DATABASE_URL="postgresql://sportmax:sportmax123@localhost:5432/sportmax_pro"
export SESSION_SECRET="clave_secreta_muy_larga_y_segura_minimo_32_caracteres_para_session"
export REPL_ID="test_repl"
export ISSUER_URL="https://replit.com/oidc"
export REPLIT_DOMAINS="localhost"
export CORS_ORIGIN="http://localhost:3000,http://localhost:8001"
export RATE_LIMIT_REQUESTS=100
export RATE_LIMIT_WINDOW=900000

exec yarn dev:prod
