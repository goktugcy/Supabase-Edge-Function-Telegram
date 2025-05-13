CREATE OR REPLACE FUNCTION notify_telegram()
RETURNS TRIGGER AS $$
DECLARE
    telegram_bot_token text := 'YOUR_BOT_TOKEN';
    chat_id text := 'YOUR_CHAT_ID';
    message text;
BEGIN
    message := format('New Contact Submission: Name: %s, Email: %s, Message: %s',
                      NEW.name, NEW.email, NEW.message);

    PERFORM pg_notify('telegram_channel', message);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER contact_insert_trigger
AFTER INSERT ON public.contacts
FOR EACH ROW EXECUTE FUNCTION notify_telegram();
