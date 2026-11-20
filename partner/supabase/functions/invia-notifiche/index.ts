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
    
    if (payload.table !== "prenotazioni" || (payload.type !== "INSERT" && payload.type !== "UPDATE")) {
        return new Response("Evento ignorato", { status: 200 });
    }

    const corsa = payload.record;
    const vecchiaCorsa = payload.old_record;

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (payload.type === "INSERT") {
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
            TTL: 129600,
            headers: {
              "Urgency": "high",
              "Topic": "driverbutler-corse"
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
    }

    if (payload.type === "UPDATE") {
        if (!vecchiaCorsa || vecchiaCorsa.stato === corsa.stato || corsa.stato !== "ASSEGNATO" || !corsa.id_passeggero) {
            return new Response("Aggiornamento ignorato", { status: 200 });
        }

        const { data: paxData } = await supabase
          .from("passeggeri")
          .select("linguaggio")
          .eq("id_passeggero", corsa.id_passeggero)
          .single();

        const lang = paxData?.linguaggio === "en" ? "en" : "it";

        const { data: abbonamenti, error } = await supabase
          .from("abbonamenti_push")
          .select("id, dati_abbonamento")
          .eq("user_id", corsa.id_passeggero)
          .eq("ruolo", "passeggeri");

        if (error || !abbonamenti || abbonamenti.length === 0) {
            return new Response(JSON.stringify({ success: true, inviati: 0, msg: "Nessun abbonamento passeggero trovato" }), { headers: { "Content-Type": "application/json" }, status: 200 });
        }

        const notificationPayload = JSON.stringify({
          title: lang === "en" ? "Driver Assigned!" : "Autista Assegnato!",
          body: lang === "en" ? "Your trip has been taken in charge. Tap to view details." : "La tua corsa è stata presa in carico. Tocca per i dettagli.",
          icon: "../logo/icona-pwa.png",
          badge: "../logo/badge-bianco.png",
          url: "./viaggiprogrammati.html"
        });

        const invii = abbonamenti.map(sub => 
          webpush.sendNotification(sub.dati_abbonamento, notificationPayload, {
            TTL: 129600,
            headers: {
              "Urgency": "high",
              "Topic": "driverbutler-pax"
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
    }

    return new Response("Nessuna azione eseguita", { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});