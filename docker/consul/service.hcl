service {
    name    = "notification-service"
    id      = "notification-service"
    address = "notification-service-connect"
    port    = 5003

    connect {
        sidecar_service {
            address = "notification-service-connect"
            port    = 21003

            proxy {
                local_service_address = "127.0.0.1"
                local_service_port    = 5003

                config {
                    bind_address = "0.0.0.0"
                    bind_port    = 21003
                }

                upstreams = [
                    {
                        destination_name   = "access-control-service"
                        local_bind_address = "127.0.0.1"
                        local_bind_port    = 15051
                    }
                ]
            }
        }
    }
}
