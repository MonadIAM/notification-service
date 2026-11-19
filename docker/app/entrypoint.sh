#!/bin/sh
set -eu

export POSTGRES_USER
export POSTGRES_PASSWORD
export REDIS_PASSWORD
export AWS_ACCESS_KEY_ID
export AWS_SECRET_ACCESS_KEY

wait_for_secret() {
    path="$1"
    i=0
    until [ -s "$path" ]; do
        i=$((i + 1))
        if [ "$i" -ge 60 ]; then
            echo "Timed out waiting for $path" >&2
            exit 1
        fi
        sleep 1
    done
}

wait_for_tcp() {
    host="$1"
    port="$2"
    name="$3"
    i=0
    until nc -z "$host" "$port" >/dev/null 2>&1; do
        i=$((i + 1))
        if [ "$i" -ge 60 ]; then
            echo "Timed out waiting for $name at $host:$port" >&2
            exit 1
        fi
        sleep 1
    done
}

wait_for_secret /vault/secrets/postgresql_username
wait_for_secret /vault/secrets/postgresql_password
wait_for_secret /vault/secrets/redis_password
wait_for_secret /vault/secrets/aws_access_key_id
wait_for_secret /vault/secrets/aws_secret_access_key

POSTGRES_USER="$(cat /vault/secrets/postgresql_username)"
POSTGRES_PASSWORD="$(cat /vault/secrets/postgresql_password)"
REDIS_PASSWORD="$(cat /vault/secrets/redis_password)"
AWS_ACCESS_KEY_ID="$(cat /vault/secrets/aws_access_key_id)"
AWS_SECRET_ACCESS_KEY="$(cat /vault/secrets/aws_secret_access_key)"

wait_for_tcp "$POSTGRES_WRITE_HOST" "$POSTGRES_WRITE_PORT" "PostgreSQL write upstream"
wait_for_tcp "$POSTGRES_READ_HOST" "$POSTGRES_READ_PORT" "PostgreSQL read upstream"
wait_for_tcp "$REDIS_HOST" "$REDIS_PORT" "Redis upstream"

export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--require ./dist/src/observability/tracing/script.js"

exec node dist/src/main.js
