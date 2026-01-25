import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules, MedusaError } from "@medusajs/framework/utils";

export async function POST(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const { email, password, first_name, last_name, phone } = req.body as {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone?: string;
  };

  try {
    const customerModule = req.scope.resolve(Modules.CUSTOMER);
    const authModule = req.scope.resolve(Modules.AUTH);

    // Check if customer already exists
    const existingCustomers = await customerModule.listCustomers({
      email,
    });

    if (existingCustomers && existingCustomers.length > 0) {
      throw new MedusaError(
        MedusaError.Types.DUPLICATE_ERROR,
        "Customer with this email already exists"
      );
    }

    // Step 1: Call Medusa's built-in registration first (creates auth identity with hashed password)
    const registerResponse = await fetch(`http://localhost:9000/auth/customer/emailpass/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!registerResponse.ok) {
      const errorData = await registerResponse.json().catch(() => ({}));
      console.error("Auth registration failed:", errorData);
      throw new Error("Failed to create authentication identity");
    }

    // Step 2: Create the customer
    const [customer] = await customerModule.createCustomers([
      {
        email,
        first_name,
        last_name,
        ...(phone && { phone }),
        has_account: true,
      },
    ]);

    // Step 3: Find the auth identity that was just created and link it to the customer
    const authIdentities = await authModule.listAuthIdentities({
      provider_identities: {
        entity_id: email,
      },
    });

    const authIdentity = authIdentities && authIdentities.length > 0 ? authIdentities[0] : null;

    if (!authIdentity || !customer) {
      throw new Error("Failed to link auth identity to customer");
    }

    // Update the auth identity to link it to our customer
    await authModule.updateAuthIdentities([
      {
        id: authIdentity.id,
        app_metadata: {
          customer_id: customer.id,
        },
      },
    ]);

    console.log(`Linked auth identity ${authIdentity.id} to customer ${customer.id}`);

    res.status(200).json({
      customer,
      message: "Customer registered successfully",
    });
  } catch (error: any) {
    console.error("Registration error:", error);
    res.status(400).json({
      message: error.message || "Failed to register customer",
    });
  }
}
