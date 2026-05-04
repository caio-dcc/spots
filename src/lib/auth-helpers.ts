import { supabase } from "@/lib/supabase";

export type UserType = "admin" | "customer";

export interface UserProfile {
  id: string;
  user_type: UserType;
  full_name: string;
  cpf?: string;
  phone_number?: string;
  avatar_url?: string;
}

/**
 * Buscar tipo de usuário do perfil
 */
export async function getUserType(): Promise<UserType | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // SUDO (DEV) Bypass: Sempre permitir acesso de admin para o desenvolvedor principal
    if (user.email === 'dev.caio.marques@gmail.com') {
      return "admin";
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single();

    if (error) {
      // PGRST116 é o código para "nenhum resultado encontrado" ao usar .single()
      if (error.code === "PGRST116") {
        console.warn("Perfil não encontrado para o usuário:", user.id);
        return null;
      }
      
      console.error("Erro ao buscar tipo de usuário:", JSON.stringify(error, null, 2));
      return null;
    }

    return (data?.user_type as UserType) || null;
  } catch (err) {
    console.error("Erro ao verificar user type:", err);
    return null;
  }
}

/**
 * Buscar perfil completo do usuário
 */
export async function getUserProfile(): Promise<UserProfile | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Erro ao buscar perfil:", error);
      return null;
    }

    return data as UserProfile;
  } catch (err) {
    console.error("Erro ao buscar perfil:", err);
    return null;
  }
}

/**
 * Criar/Atualizar perfil após login
 */
export async function createOrUpdateProfile(
  userId: string,
  userType: UserType,
  fullName?: string,
  cpf?: string,
  phone?: string
) {
  try {
    const { error } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          user_type: userType,
          full_name: fullName || "",
          cpf: cpf || null,
          phone_number: phone || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (error) {
      console.error("Erro ao criar/atualizar perfil:", error);
      return false;
    }

    return true;
  } catch (err) {
    console.error("Erro ao criar/atualizar perfil:", err);
    return false;
  }
}

/**
 * Signup para Cliente
 */
export async function signupCustomer(
  email: string,
  password: string,
  fullName: string,
  cpf?: string,
  phone?: string
) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: "customer",
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error("Falha ao criar usuário");

    // Criar perfil
    await createOrUpdateProfile(data.user.id, "customer", fullName, cpf, phone);

    return { user: data.user, success: true };
  } catch (err: any) {
    console.error("Erro no signup:", err);
    return { error: err.message, success: false };
  }
}

/**
 * Signup para Admin
 */
export async function signupAdmin(
  email: string,
  password: string,
  fullName: string,
  cpf?: string,
  phone?: string
) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: "admin",
          full_name: fullName,
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error("Falha ao criar usuário");

    // Criar perfil
    await createOrUpdateProfile(data.user.id, "admin", fullName, cpf, phone);

    return { user: data.user, success: true };
  } catch (err: any) {
    console.error("Erro no signup:", err);
    return { error: err.message, success: false };
  }
}

/**
 * Login com redirecionamento automático
 */
export async function loginAndRedirect(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    if (!data.user) throw new Error("Usuário não encontrado");

    // Buscar tipo de usuário
    const userType = await getUserType();

    return {
      user: data.user,
      userType: userType || "customer",
      success: true,
    };
  } catch (err: any) {
    console.error("Erro no login:", err);
    return { error: err.message, success: false };
  }
}
