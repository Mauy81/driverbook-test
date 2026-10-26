import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import webpush from "npm:web-push"

const vapidPublicKey = "BGoIs_sj3qfrDqtmo5qnMb2AOWtUTWTLyjnOKUEDigwGdF5IkwuHV9I76v4tFIbGkLrr01ePEbGdO8R0lehSPts";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

webpush.setVapidDetails(
  "https://mauy81.github.io/driverbook-test",
  vapidPublicKey,
  vapidPrivateKey
);

serve(async (req) => {
  try {
    const payload = await req.json();
    
    if (payload.type !== "INSERT" || payload.table !== "prenotazioni") {
        return new Response("Evento ignorato", { status: 200 });
    }

    const corsa = payload.record;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: partnerIdonei, error: errRpc } = await supabase.rpc("get_partner_idonei", {
        p_partenza_lat: corsa.partenza_lat,
        p_partenza_lng: corsa.partenza_lng,
        p_arrivo_lat: corsa.arrivo_lat,
        p_arrivo_lng: corsa.arrivo_lng,
        p_vettura: corsa.vettura_selezionata
    });

    if (errRpc || !partnerIdonei || partnerIdonei.length === 0) {
        return new Response(JSON.stringify({ success: true, inviati: 0, msg: "Nessun partner in zona con veicolo idoneo" }), { headers: { "Content-Type": "application/json" }, status: 200 });
    }

    const idPartnerList = partnerIdonei.map(p => p.id_partner);

    const { data: abbonamenti, error } = await supabase
      .from("abbonamenti_push")
      .select("id, dati_abbonamento")
      .in("user_id", idPartnerList);

    if (error || !abbonamenti || abbonamenti.length === 0) {
        return new Response(JSON.stringify({ success: true, inviati: 0, msg: "Nessun abbonamento trovato" }), { headers: { "Content-Type": "application/json" }, status: 200 });
    }

    const notificationPayload = JSON.stringify({
      title: "Nuova Corsa Disponibile!",
      body: "Controlla la bacheca per i dettagli.",
      icon: "../logo/icona-pwa-prt.png",
      badge: "../logo/badge-bianco.png"
    });

    const invii = abbonamenti.map(sub => 
      webpush.sendNotification(sub.dati_abbonamento, notificationPayload, {
        headers: {
          "Urgency": "high",
          "Topic": "driverbook-corse"
        }
      })
      .catch(async (err) => {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase
            .from("abbonamenti_push")
            .delete()
            .eq("id", sub.id);
        }
      })
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