#!/bin/sh
# Slick API — arranque del contenedor.
#
# Las cachés de Laravel se generan AQUÍ y no en el build: dependen de las
# variables de entorno (APP_KEY, DB, Redis…) que solo existen en runtime
# (las inyecta Dokploy).
set -e

cd /var/www/html

if [ -z "$APP_KEY" ]; then
    echo "ERROR: APP_KEY no está definida. Genera una con 'php artisan key:generate --show' y configúrala en Dokploy." >&2
    exit 1
fi

# Migraciones opcionales, controladas por variable (RUN_MIGRATIONS=true).
# En despliegues con varias réplicas, actívala solo en una.
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "==> Ejecutando migraciones…"
    php artisan migrate --force
fi

echo "==> Registrando paquetes y cacheando configuración, rutas y eventos…"
php artisan package:discover --ansi
php artisan config:cache
php artisan route:cache
php artisan event:cache

# supervisord toma el control como PID 1 (maneja señales y relanza procesos).
exec supervisord -c /etc/supervisord.conf
