import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Create admin user from environment variables
 * Run with: medusa exec ./src/scripts/create-admin.ts
 */
export default async function createAdminUser({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const userModuleService = container.resolve(Modules.USER);
  const authModuleService = container.resolve(Modules.AUTH);
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK);

  const email = process.env.ADMIN_EMAIL || "admin@example.com";
  const password = process.env.ADMIN_PASSWORD || "supersecret";
  const firstName = process.env.ADMIN_FIRST_NAME || "Admin";
  const lastName = process.env.ADMIN_LAST_NAME || "User";

  if (!email || !password) {
    logger.error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in environment");
    throw new Error("Missing admin credentials in environment");
  }

  // Validate password strength
  if (password.length < 8) {
    logger.error("Password must be at least 8 characters long");
    throw new Error("Password too short");
  }

  try {
    // Check if user already exists
    const existingUsers = await userModuleService.listUsers({
      email: email,
    });

    if (existingUsers.length > 0) {
      logger.info(`Admin user with email ${email} already exists. Resetting password...`);
      try {
        // List all identities with provider_identities relation
        // We need to find the one associated with this user (either by ID or email)
        const allIdentities = await authModuleService.listAuthIdentities({}, {
            relations: ["provider_identities"]
        });

        // Find the identity for this user
        // We check if any provider identity matches the user ID or Email
        const targetIdentity = allIdentities.find(identity => 
            identity.provider_identities?.some(pi => 
                (pi.entity_id === existingUsers[0]?.id || pi.entity_id === email) && 
                pi.provider === "emailpass"
            )
        );

        if (targetIdentity) {
          await authModuleService.deleteAuthIdentities([targetIdentity.id]);
        }

        // Create new identity with new password
        const authIdentity = await authModuleService.register("emailpass", {
          entity_id: email,
          provider_metadata: {
            password: password,
          },
        } as any);
        
        // Link user to auth identity
        await remoteLink.create({
            [Modules.USER]: {
                user_id: existingUsers[0]!.id
            },
            [Modules.AUTH]: {
                auth_identity_id: (authIdentity as any).id
            }
        });

        logger.info(`✅ Password reset successfully!`);
        return;
      } catch (err: any) {
        logger.error(`Failed to reset password: ${err.message}`);
        throw err;
      }
    }

    // Create the admin user
    const user = await userModuleService.createUsers({
      email: email,
      first_name: firstName,
      last_name: lastName,
    });

    logger.info(`Created user: ${user.email} (ID: ${user.id})`);

    // Create auth identity with password using the emailpass provider
    try {
      const authIdentity = await authModuleService.register("emailpass", {
        entity_id: email,
        provider_metadata: {
          password: password,
        },
      } as any);

      // Link user to auth identity
      await remoteLink.create({
          [Modules.USER]: {
              user_id: user.id
          },
          [Modules.AUTH]: {
              auth_identity_id: (authIdentity as any).id
          }
      });

      logger.info(`✅ Admin user created successfully!`);
      logger.info(`   Email: ${email}`);
      logger.info(`   Password: ${password.replace(/./g, '*')}`);
      logger.info(`   You can now log in to the admin panel at /app`);
      logger.info(``);
      logger.info(`   🔗 Admin URL: ${process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'}/app`);
    } catch (authError: any) {
      logger.error(`Failed to create auth identity: ${authError.message}`);
      logger.warn(`User was created but you may need to set the password manually.`);
      throw authError;
    }

  } catch (error: any) {
    logger.error(`Failed to create admin user: ${error.message}`);
    if (error.stack) {
      logger.error(error.stack);
    }
    throw error;
  }
}
