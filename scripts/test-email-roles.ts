import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const API = "http://localhost:3000/api/users";
  const TEST_EMAIL = "email_duplicado@test.com";

  // Usamos organization=mock o obtenemos uno
  const r = await fetch("http://localhost:3000/api/organizations");
  const orgs = await r.json();
  const orgId = orgs[0]?._id;

  async function createUser(email: string, role: string, suffix: string) {
    const res = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "TestUser " + suffix,
        email,
        role,
        organization_id: orgId
      })
    });
    return { status: res.status, body: await res.json() };
  }

  console.log("1. Creando user normal con", TEST_EMAIL);
  const r1 = await createUser(TEST_EMAIL, "user", "1");
  console.log(r1.status, r1.body.error || "Exito");

  console.log("\n2. Intentando crear OTRO user normal con el MISMO email", TEST_EMAIL);
  const r2 = await createUser(TEST_EMAIL, "user", "2");
  console.log(r2.status, r2.body.error || "Exito");

  console.log("\n3. Intentando crear ORG ADMIN con el MISMO email", TEST_EMAIL);
  const r3 = await createUser(TEST_EMAIL, "org_admin", "3");
  console.log(r3.status, r3.body.error || "Exito");

  console.log("\n4. Intentando crear OTRO ORG ADMIN con el MISMO email", TEST_EMAIL);
  const r4 = await createUser(TEST_EMAIL, "org_admin", "4");
  console.log(r4.status, r4.body.error || "Exito");
}

main().catch(console.error);
