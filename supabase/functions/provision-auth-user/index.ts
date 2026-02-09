import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify the caller is authenticated
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller is a project manager using their token
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: callerData, error: callerError } = await callerClient.auth.getUser();
    if (callerError || !callerData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check caller is a project manager
    const { data: callerMember } = await callerClient
      .from("team_members")
      .select("role")
      .ilike("email", callerData.user.email || "")
      .maybeSingle();

    if (!callerMember || !["project_manager", "admin", "god"].includes(callerMember.role)) {
      return new Response(JSON.stringify({ error: "Only project managers can provision users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, teamMemberId } = await req.json();

    if (!email || !teamMemberId) {
      return new Response(JSON.stringify({ error: "Email and teamMemberId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use admin client to create the auth user
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if auth user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existingUser) {
      return new Response(
        JSON.stringify({ message: "Auth user already exists", userId: existingUser.id }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get team member info for metadata
    const { data: teamMember } = await adminClient
      .from("team_members")
      .select("name, initials")
      .eq("id", teamMemberId)
      .single();

    const nameParts = (teamMember?.name || "").split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Create auth user with default password and mark as needing password reset
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: email.toLowerCase(),
      password: "Centauro1",
      email_confirm: true, // Auto-confirm since admin is creating them
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        must_reset_password: true,
      },
    });

    if (createError) {
      console.error("Error creating auth user:", createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Auth user created for ${email}, team member ${teamMemberId}`);

    return new Response(
      JSON.stringify({ message: "Auth user created", userId: newUser.user?.id }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in provision-auth-user:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
