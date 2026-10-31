export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  // Hatalı env ile sunucu ilk istekte değil, açılışta dursun
  const { getEnv } = await import("./env");
  getEnv();
}
