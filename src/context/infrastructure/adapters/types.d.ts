import { QueryOrder } from "@mikro-orm/postgresql";

import { LinkFilterDTO, OrdinalFilterDTO, StringFilterDTO } from "~common/dto";

declare global {
    namespace Adapters {
        type Meta = {
            Filters: unknown;
            Sort: unknown;
        };

        interface Contract<E, A extends Meta> {
            buildOptionsKnex?(query: ORM.QueryBuilder, sort: A["Sort"], pagination: Pagination, tableAlias: string): void;
            buildWhereKnex?(query: ORM.QueryBuilder, filters: A["Filters"], tableAlias: string): void;
            buildWhereORM(filters: A["Filters"], basic?: ORM.ObjectQuery<E>): ORM.FilterQuery<E>;
            buildOptionsORM<P extends string, F extends string>(
                sort: A["Sort"],
                pagination: Pagination,
                options?: ORM.FindOptions<E, P, F>,
            ): ORM.FindOptions<E, P, F>;
        }

        namespace AuditLog {
            type Filters = {
                id?: StringFilterDTO;
                realm?: LinkFilterDTO;
                actor?: LinkFilterDTO;
                ip?: StringFilterDTO;
                userAgent?: StringFilterDTO;
                actionType?: StringFilterDTO;
                entityType?: StringFilterDTO;
                createdAt?: OrdinalFilterDTO<Date>;
            };

            type Sort = {
                createdAt?: QueryOrder;
                at?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace ChangeLog {
            type Filters = {
                id?: StringFilterDTO;
                entity?: StringFilterDTO;
                changeType?: StringFilterDTO;
                entityType?: StringFilterDTO;
                auditEntry?: StringFilterDTO;
                createdAt?: OrdinalFilterDTO<Date>;
            };

            type Sort = {
                createdAt?: QueryOrder;
                at?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace Recipient {
            type Filters = {
                id?: StringFilterDTO;
                account?: LinkFilterDTO;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
            };

            type Sort = {
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace Channel {
            type Filters = {
                id?: StringFilterDTO;
                recipient?: LinkFilterDTO;
                type?: StringFilterDTO;
                isVerified?: boolean;
                createdAt?: OrdinalFilterDTO<Date>;
                updatedAt?: OrdinalFilterDTO<Date>;
            };

            type Sort = {
                createdAt?: QueryOrder;
                updatedAt?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace Notification {
            type Filters = {
                id?: StringFilterDTO;
                recipient?: LinkFilterDTO;
                category?: StringFilterDTO;
                realm?: LinkFilterDTO;
                sourceService?: StringFilterDTO;
                createdAt?: OrdinalFilterDTO<Date>;
            };

            type Sort = {
                createdAt?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace Message {
            type Filters = {
                id?: StringFilterDTO;
                notification?: LinkFilterDTO;
                channel?: LinkFilterDTO;
                channelType?: StringFilterDTO;
                status?: StringFilterDTO;
                failureReason?: StringFilterDTO;
                createdAt?: OrdinalFilterDTO<Date>;
            };

            type Sort = {
                createdAt?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }

        namespace Preference {
            type Filters = {
                id?: StringFilterDTO;
                recipient?: LinkFilterDTO;
                channelType?: StringFilterDTO;
                category?: StringFilterDTO;
                isEnabled?: boolean;
                createdAt?: OrdinalFilterDTO<Date>;
            };

            type Sort = {
                createdAt?: QueryOrder;
            };

            interface Types {
                Filters: Filters;
                Sort: Sort;
            }
        }
    }
}
