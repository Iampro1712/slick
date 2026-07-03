# syntax=docker/dockerfile:1

# ============================================================================
# Slick API — imagen de producción (Dokploy / Ubuntu 24.04)
#
# Multi-stage sobre Alpine: la etapa `vendor` instala dependencias con
# Composer; la etapa final solo lleva PHP-FPM + nginx + supervisord y el
# código. Un único contenedor sirve HTTP, corre la cola (Redis) y el
# scheduler (recordatorios cada minuto).
#
#   docker build -t slick-api .
#   docker run -p 8080:8080 --env-file .env slick-api
#
# La configuración llega por variables de entorno (Dokploy); el .env nunca
# se copia a la imagen (ver .dockerignore).
# ============================================================================

# ---------------------------------------------------------------- deps ------
FROM composer:2 AS vendor

WORKDIR /app

# Solo los manifiestos primero: la capa de dependencias se cachea mientras
# composer.json/lock no cambien, aunque cambie el código.
COPY composer.json composer.lock ./

RUN composer install \
    --no-dev \
    --no-interaction \
    --no-progress \
    --no-scripts \
    --prefer-dist \
    --no-autoloader

# Ahora el código completo, y el autoloader optimizado (classmap autoritativo:
# sin I/O de disco para resolver clases en producción). --no-scripts: el
# package:discover se ejecuta en el entrypoint, cuando ya existen las
# variables de entorno reales.
COPY . .
RUN composer dump-autoload \
    --no-dev \
    --classmap-authoritative \
    --no-scripts \
    --no-interaction

# -------------------------------------------------------------- runtime -----
FROM php:8.4-fpm-alpine AS runtime

# Paquetes del sistema: nginx (HTTP), supervisor (orquesta procesos),
# ca-certificates (TLS hacia Google OAuth / Redis externo).
RUN apk add --no-cache nginx supervisor ca-certificates \
    # Extensiones PHP que Laravel necesita y la base no trae:
    #  - pdo_mysql: MySQL · opcache: rendimiento · pcntl: parada limpia
    #    del queue:work (señales)
    && docker-php-ext-install -j"$(nproc)" pdo_mysql opcache pcntl \
    # php.ini de producción como base
    && mv "$PHP_INI_DIR/php.ini-production" "$PHP_INI_DIR/php.ini" \
    # Limpieza
    && rm -rf /tmp/* /var/cache/apk/*

# Configuración propia (sobrescribe defaults)
COPY docker/php.ini        "$PHP_INI_DIR/conf.d/99-slick.ini"
COPY docker/php-fpm.conf   /usr/local/etc/php-fpm.d/zz-slick.conf
COPY docker/nginx.conf     /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisord.conf
COPY docker/entrypoint.sh  /usr/local/bin/entrypoint.sh

WORKDIR /var/www/html

# Código + vendor desde la etapa de build, ya con dueño correcto (evita un
# chown -R posterior, que duplicaría el peso de la capa).
COPY --from=vendor --chown=www-data:www-data /app .

# Directorios en los que escribe el contenedor en runtime. Todo lo demás del
# código queda de solo lectura para el proceso (menos superficie de ataque).
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && mkdir -p /run/php /run/nginx /var/lib/nginx/tmp /var/log/supervisor \
    && chown -R www-data:www-data /run/php /run/nginx /var/lib/nginx /var/log/nginx /var/log/supervisor \
    && chown -R www-data:www-data storage bootstrap/cache

# Contenedor no-root: nginx escucha en 8080 (puerto sin privilegios).
USER www-data

EXPOSE 8080

# Laravel expone /up como health endpoint (bootstrap/app.php).
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget -qO /dev/null http://127.0.0.1:8080/up || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
