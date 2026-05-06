import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AppRole = "super_admin" | "admin" | "sales" | "procurement" | "production" | "finance" | "hr";

interface Body {
  email: string;
  username?: string;
  password: string;
  full_name?: string;
  company_id: string;
  roles: AppRole[];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userRes, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const caller = userRes.user;

    const body = (await req.json()) as Body;
    if (!body.email || !body.password || !body.company_id || !Array.isArray(body.roles) || body.roles.length === 0) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (body.roles.includes("super_admin")) {
      return new Response(JSON.stringify({ error: "Cannot assign super_admin via this endpoint" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(url, service);

    // Authorize: caller must be super_admin OR company admin of body.company_id
    const { data: callerRoles } = await admin.from("user_roles").select("role, company_id").eq("user_id", caller.id);
    const isSuper = (callerRoles ?? []).some((r) => r.role === "super_admin");
    const isCoAdmin = (callerRoles ?? []).some((r) => r.role === "admin" && r.company_id === body.company_id);
    if (!isSuper && !isCoAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create the user (auto-confirm so they can sign in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: { full_name: body.full_name ?? "" },
    });
    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message ?? "Failed to create user" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const newUserId = created.user.id;

    // Profile is auto-created via trigger handle_new_user. Update company_id.
    const { error: profErr } = await admin
      .from("profiles")
      .upsert(
        {
          id: newUserId,
          email: body.email,
          username: body.username ?? null,
          full_name: body.full_name ?? "",
          company_id: body.company_id,
        },
        { onConflict: "id" },
      );
    if (profErr) {
      return new Response(JSON.stringify({ error: profErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Insert roles
    const rows = body.roles.map((role) => ({ user_id: newUserId, role, company_id: body.company_id }));
    const { error: rolesErr } = await admin.from("user_roles").insert(rows);
    if (rolesErr) {
      return new Response(JSON.stringify({ error: rolesErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ user_id: newUserId }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});