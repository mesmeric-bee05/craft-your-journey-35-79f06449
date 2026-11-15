    const { data: profile } = await supabase!
      .from("profiles")
      .select("phone")
      .eq("user_id", user!.id)
      .maybeSingle();
