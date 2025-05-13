# ⚡️ Supabase Telegram Notifier

This project is a backend notification system built using **Supabase Edge Functions** and **PostgreSQL triggers**. It listens for new entries in the `contacts` table and sends formatted messages to a **Telegram bot** using a queue-based system.

---

## 🧠 How It Works

1. A **PostgreSQL trigger** on the `contacts` table fires after a new row is inserted.
2. The trigger function **adds a message to the `telegram_queue`** table.
3. A **Supabase Edge Function**, triggered every minute via Supabase Cron, pulls unsent messages from the queue.
4. Messages are **sent to a Telegram channel** via bot.
5. Messages are marked as sent.

---

## 🛠 Tech Stack

- 🧩 Supabase (PostgreSQL, Edge Functions, REST API)
- 📦 Deno (Edge runtime)
- 📬 Telegram Bot API
- ⏰ Supabase Cron (every minute)
- 🧾 SQL Triggers

---

## 🚀 Installation

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/supabase-telegram-notifier.git
cd supabase-telegram-notifier
```
1. Install Supabase CLI
Follow instructions: https://supabase.com/docs/guides/cli

2. Link Your Project
```bash
supabase link --project-ref your-project-ref
```

3. Set Environment Variables
Create .env from example:

```bash
cp .env.example .env
```

Fill in your values:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
```
## 🧱 Usage

1. Deploy Edge Function
```bash
supabase functions deploy telegram-dispatcher
```
2. Execute SQL for Trigger
```bash
supabase db execute --file supabase/sql/notify_telegram.sql
```
3. Schedule Cron Job (via Supabase UI)

Go to your Supabase project dashboard → Edge Functions → Add Schedule:

Function: telegram-dispatcher

Cron: * * * * * (every minute)

🔐 SQL Trigger (notify_telegram.sql)
```sql
CREATE OR REPLACE FUNCTION notify_telegram()
RETURNS TRIGGER AS $$
DECLARE
    message text;
BEGIN
    message := format('New Contact Submission: Name: %s, Email: %s, Message: %s',
                      NEW.name, NEW.email, NEW.message);

    INSERT INTO telegram_queue (message) VALUES (message);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_insert_trigger
AFTER INSERT ON public.contacts
FOR EACH ROW EXECUTE FUNCTION notify_telegram();
```
🧩 Edge Function (index.ts)
```ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

Deno.serve(async () => {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return new Response("Missing environment variables", { status: 500 });
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/telegram_queue?sent=eq.false&order=created_at.asc`, {
    headers: {
      "apikey": SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SERVICE_ROLE_KEY}`
    }
  });

  if (!res.ok) {
    const error = await res.text();
    console.error("Failed to fetch queue:", error);
    return new Response("Fetch error", { status: 500 });
  }

  const rows = await res.json();

  for (const row of rows) {
    try {
      const tg = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: row.message,
          parse_mode: "HTML"
        })
      });

      if (tg.ok) {
        await fetch(`${SUPABASE_URL}/rest/v1/telegram_queue?id=eq.${row.id}`, {
          method: "PATCH",
          headers: {
            "apikey": SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SERVICE_ROLE_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ sent: true })
        });
      } else {
        console.error("Telegram send failed:", await tg.text());
      }
    } catch (e) {
      console.error("Unexpected error:", e);
    }
  }

  return new Response(JSON.stringify({ message: "Processed" }), {
    headers: { "Content-Type": "application/json" }
  });
});
```

🔐 Environment Variables (.env.example)

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
TELEGRAM_CHAT_ID=your-telegram-chat-id
```

This project ensures you get real-time notifications on Telegram, without polling or manual checking.

📜 License
This project is licensed under the [MIT](LICENSE)

🤝 Contributing
Feel free to open issues or submit pull requests to improve this project!