import { auth } from "@/firebase";

interface RegisterUserParams {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
}

interface RegisterUserResult {
  email: string;
  userId: string;
  requiresEmailConfirmation: boolean;
}

const getEmailRedirectTo = () => {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}/login`;
};

export const registerUserWithEmail = async ({
  email,
  password,
  name,
  phone,
  address,
}: RegisterUserParams): Promise<RegisterUserResult> => {
  const emailRedirectTo = getEmailRedirectTo();
  const metadata = {
    ...(name ? { name } : {}),
    ...(phone ? { phone } : {}),
    ...(address ? { address } : {}),
  };

  const { data, error } = await auth.signUp({
    email,
    password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
      data: metadata,
    },
  });

  if (error) throw error;
  if (!data.user) {
    throw new Error("No se pudo crear el usuario en autenticacion.");
  }

  return {
    email,
    userId: data.user.id,
    requiresEmailConfirmation: !data.session,
  };
};

export const resendSignupConfirmationEmail = async (email: string) => {
  const emailRedirectTo = getEmailRedirectTo();
  const { error } = await auth.resend({
    type: "signup",
    email,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });

  if (error) throw error;
};

export const getAuthErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }

  return "Ocurrio un error inesperado.";
};

export const isAlreadyRegisteredError = (error: unknown) => {
  const message = getAuthErrorMessage(error).toLowerCase();
  return (
    message.includes("already registered") ||
    message.includes("already been registered") ||
    message.includes("ya esta registrado") ||
    message.includes("ya existe") ||
    message.includes("already exists")
  );
};

export const isEmailConfirmationPendingError = (error: unknown) => {
  const message = getAuthErrorMessage(error).toLowerCase();
  return (
    message.includes("email not confirmed") ||
    message.includes("email_not_confirmed") ||
    message.includes("correo no confirmado")
  );
};

export const isEmailRateLimitError = (error: unknown) => {
  const message = getAuthErrorMessage(error).toLowerCase();
  return (
    message.includes("over_email_send_rate_limit") ||
    message.includes("email rate limit exceeded") ||
    message.includes("too many requests") ||
    message.includes("rate limit")
  );
};
