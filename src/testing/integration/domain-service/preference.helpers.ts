import { PreferenceRepository } from "~context/infrastructure/repositories/preference.repository";
import { RecipientRepository } from "~context/infrastructure/repositories/recipient.repository";
import { PreferenceService } from "~context/domain/services/preference.service";

export class PreferenceIntegrationHelpers implements Integration.Domain.Preference.Contract {
    public service(context: Integration.Postgres.Suite.FactoryContext): Integration.Domain.Preference.Service.Context {
        const repositories = this.repositories(context);

        return {
            preferenceService: new PreferenceService(repositories.preferences, repositories.recipients),
            repositories,
        };
    }

    public repositories(
        context: Integration.Postgres.Suite.FactoryContext,
    ): Integration.Domain.Preference.Repositories.Context {
        return {
            preferences: new PreferenceRepository(context.readManager),
            recipients: new RecipientRepository(context.readManager),
        };
    }
}
