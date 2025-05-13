import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

// Telegram gönderme ve Supabase güncelleme
Deno.serve(async () => {
  if (
    !SUPABASE_URL ||
    !SERVICE_ROLE_KEY ||
    !TELEGRAM_BOT_TOKEN ||
    !TELEGRAM_CHAT_ID
  ) {
    return new Response("Missing environment variables", { status: 500 });
  }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/telegram_queue?sent=eq.false&order=created_at.asc`,
    {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    }
  );

  if (!res.ok) {
    const error = await res.text();
    console.error("Failed to fetch queue:", error);
    return new Response("Fetch error", { status: 500 });
  }

  const rows = await res.json();

  for (const row of rows) {
    try {
      const tg = await fetch(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: TELEGRAM_CHAT_ID,
            text: row.message,
            parse_mode: "HTML",
          }),
        }
      );

      if (tg.ok) {
        await fetch(`${SUPABASE_URL}/rest/v1/telegram_queue?id=eq.${row.id}`, {
          method: "PATCH",
          headers: {
            apikey: SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sent: true }),
        });
      } else {
        console.error("Telegram send failed:", await tg.text());
      }
    } catch (e) {
      console.error("Unexpected error:", e);
    }
  }

  return new Response(JSON.stringify({ message: "Processed" }), {
    headers: { "Content-Type": "application/json" },
  });
});
