import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { email, password, first_name, last_name, phone } = req.body as {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };

  const customerModuleService = req.scope.resolve("customerModuleService") as any;
  const authModuleService = req.scope.resolve("authModuleService") as any;

  try {
    // First, register with auth module to create auth identity
    const authIdentity = await authModuleService.register("emailpass", {
      email,
      password,
    })

    // Then create the customer record
    const customer = await customerModuleService.createCustomers({
      email,
      first_name,
      last_name,
      ...(phone && { phone }),
      has_account: true,
    })

    // Link auth identity to customer using entity_id
    await authModuleService.updateAuthIdentities(authIdentity.id, {
      app_metadata: {
        customer_id: customer.id,
      },
    })

    res.status(200).json({
      customer,
      message: "Customer registered successfully",
    })
  } catch (error: any) {
    console.error("Registration error:", error)
    res.status(400).json({
      message: error.message || "Failed to register customer",
    })
  }
}
