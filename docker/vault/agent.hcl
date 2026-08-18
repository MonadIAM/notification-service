pid_file = "/tmp/pidfile"

vault {
    address     = "https://vault:8200"
    tls_ca_file = "/vault/tls/ca.crt"
}

auto_auth {
    method "approle" {
        mount_path = "auth/approle"

        config = {
            role_id_file_path                   = "/vault/config/role-id"
            secret_id_file_path                 = "/vault/agent-bootstrap/secret-id"
            remove_secret_id_file_after_reading = true
        }
    }

    sink "file" {
        config = {
            path = "/vault/token/agent-token"
        }
    }
}

template {
    contents    = "{{ with secret \"kv/data/notification-service/runtime\" }}{{ .Data.data.redis_password }}{{ end }}"
    destination = "/secrets/redis/redis_password"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"kv/data/notification-service/postgresql-replication\" }}{{ .Data.data.postgresql_replication_password }}{{ end }}"
    destination = "/secrets/postgresql/postgresql_replication_password"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"kv/data/notification-service/runtime\" }}{{ .Data.data.postgresql_password }}{{ end }}"
    destination = "/secrets/postgresql/postgresql_password"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"database/creds/notification-service-app\" }}{{ .Data.username }}{{ end }}"
    destination = "/secrets/application/postgresql_username"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"database/creds/notification-service-app\" }}{{ .Data.password }}{{ end }}"
    destination = "/secrets/application/postgresql_password"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"kv/data/notification-service/runtime\" }}{{ .Data.data.redis_password }}{{ end }}"
    destination = "/secrets/application/redis_password"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"kv/data/notification-service/runtime\" }}{{ .Data.data.postgresql_password }}{{ end }}"
    destination = "/secrets/debezium/postgresql_password"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"aws/creds/notification-service-ses\" }}{{ .Data.access_key }}{{ end }}"
    destination = "/secrets/application/aws_access_key_id"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"aws/creds/notification-service-ses\" }}{{ .Data.secret_key }}{{ end }}"
    destination = "/secrets/application/aws_secret_access_key"
    perms       = "0440"
}
