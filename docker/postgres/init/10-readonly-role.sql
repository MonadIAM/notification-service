CREATE ROLE notification_service_readonly NOLOGIN;

GRANT CONNECT ON DATABASE "notification-service" TO notification_service_readonly;
GRANT USAGE ON SCHEMA public TO notification_service_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO notification_service_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO notification_service_readonly;
