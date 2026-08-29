pid_file = "/tmp/pidfile"

vault {
    address = "http://vault:8200"
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

cache {
    use_auto_auth_token = true
}

listener "unix" {
    address     = "/vault/proxy/agent.sock"
    tls_disable = true
}

template {
    contents    = "{{ with secret \"kv/data/notification-service/runtime\" }}{{ .Data.data.postgresql_username }}{{ end }}"
    destination = "/secrets/application/postgresql_username"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"kv/data/notification-service/runtime\" }}{{ .Data.data.postgresql_password }}{{ end }}"
    destination = "/secrets/application/postgresql_password"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"kv/data/notification-service/runtime\" }}{{ .Data.data.redis_password }}{{ end }}"
    destination = "/secrets/application/redis_password"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"kv/data/notification-service/runtime\" }}{{ .Data.data.aws_access_key_id }}{{ end }}"
    destination = "/secrets/application/aws_access_key_id"
    perms       = "0440"
}

template {
    contents    = "{{ with secret \"kv/data/notification-service/runtime\" }}{{ .Data.data.aws_secret_access_key }}{{ end }}"
    destination = "/secrets/application/aws_secret_access_key"
    perms       = "0440"
}
