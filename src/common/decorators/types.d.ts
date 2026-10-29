declare namespace Extract {
    type Meta = {
        userAgent: string;
        ip: string;
    };

    namespace Session {
        type Public = {
            realms?: string[];
            account?: string;
            session?: string;
            client?: string;
            scope?: string;
        };

        type Auth = {
            expiresAt?: number;
            realms: string[];
            account: string;
            session: string;
            client: string;
            scope: string;
        };
    }
}
