import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

export default async function deleteAdmin({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModuleService = container.resolve(Modules.USER);
  const authModuleService = container.resolve(Modules.AUTH);

  const email = process.env.ADMIN_EMAIL || "admin@admin.com";

  logger.info(`Attempting to delete user with email: ${email}`);

  const users = await userModuleService.listUsers({ email });

  if (users.length === 0) {
    logger.info(`No user found with email ${email}`);
  } else {
    const user = users[0];
    if (!user) {
      logger.error(`User is undefined`);
      return;
    }

    logger.info(`Found user ${user.id} with email ${email}`);

    // Delete user
    await userModuleService.deleteUsers([user.id]);
    logger.info(`Deleted user ${user.id}`);

    // Try to find and delete auth identity associated with this user ID
    const authIdentities = await authModuleService.listAuthIdentities(
      {},
      {
        relations: ["provider_identities"],
      }
    );

    const identityToDelete = authIdentities.find((ai) =>
      ai.provider_identities?.some(
        (pi) => (pi.entity_id === user.id || pi.entity_id === email) && pi.provider === "emailpass"
      )
    );

    if (identityToDelete) {
      await authModuleService.deleteAuthIdentities([identityToDelete.id]);
      logger.info(`Deleted auth identity ${identityToDelete.id}`);
    } else {
      logger.warn(`Could not find auth identity for user ${user.id}.`);
    }
  }

  // Also check for any orphaned auth identity with this email as entity_id (just in case)
  // This handles cases where user might be gone but auth remains
  try {
    const authIdentities = await authModuleService.listAuthIdentities(
      {},
      {
        relations: ["provider_identities"],
      }
    );

    const orphanedIdentity = authIdentities.find((ai) =>
      ai.provider_identities?.some((pi) => pi.entity_id === email && pi.provider === "emailpass")
    );

    if (orphanedIdentity) {
      await authModuleService.deleteAuthIdentities([orphanedIdentity.id]);
      logger.info(`Deleted orphaned auth identity for email ${email}`);
    }
  } catch (e) {
    // ignore
  }
}
