import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

const vapidPublicKey = "BGoIs_sj3qfrDqtmo5qnMb2AOWtUTWTLyjnOKUEDigwGdF5IkwuHV9I76v4tFIbGkLrr01ePEbGdO8R0lehSPts";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

webpush.setVapidDetails(
  "mailto:assistenza@driverbook.it",
  vapidPublicKey,
  vapidPrivateKey
);

serve(async (req) => {
  try {
    const payload = await req.json();
    
    if (payload.type !== "INSERT" || payload.table !== "prenotazioni") {
        return new Response("Evento ignorato", { status: 200 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: abbonamenti, error } = await supabase
      .from("abbonamenti_push")
      .select("dati_abbonamento");

    if (error || !abbonamenti) {
      throw new Error("Errore lettura abbonamenti");
    }

    const notificationPayload = JSON.stringify({
      title: "Nuova Corsa Disponibile!",
      body: "Controlla la bacheca per i dettagli.",
      icon: "../logo/icona-pwa-prt.png"
    });

    const invii = abbonamenti.map(sub => 
      webpush.sendNotification(sub.dati_abbonamento, notificationPayload)
        .catch(err => console.error("Errore invio:", err))
    );

    await Promise.all(invii);

    return new Response(JSON.stringify({ success: true, inviati: abbonamenti.length }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});