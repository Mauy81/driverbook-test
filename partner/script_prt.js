(function() {
    const chiaviIsolate = ['driverbutler_auth_token', 'driverbutler_refresh_token', 'driverbutler_ruolo', 'driverbutler_last_user', 'driverbutler_last_page', 'driverbutler_ricordami', 'driverbutler_lang'];
    
    document.addEventListener("DOMContentLoaded", function() {
        const percorsoCorrenteMenu = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
        
        const isPaginaPubblica = ['login_prt.html', 'registrazione_prt.html', 'pwreset_prt.html', 'assistenza_prt.html'].includes(percorsoCorrenteMenu) || percorsoCorrenteMenu === 'index.html' || percorsoCorrenteMenu === '';

        if (isPaginaPubblica) {
            const footerHtml = document.createElement('footer');
            footerHtml.className = 'footer';
            footerHtml.innerHTML = '&copy; 2026-2027 DriverButler. Tutti i diritti riservati.';
            document.body.appendChild(footerHtml);
        }
    });
    
    function getPrefissoApp() {
        return 'prt_';
    }
    
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
        if (chiaviIsolate.includes(key)) key = getPrefissoApp() + key;
        originalSetItem.call(this, key, value);
    };
    
    const originalGetItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function(key) {
        let scopedKey = key;
        if (chiaviIsolate.includes(key)) scopedKey = getPrefissoApp() + key;
        
        let val = originalGetItem.call(this, scopedKey);
        if (val === null && this === localStorage && chiaviIsolate.includes(key)) {
            val = sessionStorage.getItem(scopedKey);
        }
        return val;
    };
    
    const originalRemoveItem = Storage.prototype.removeItem;
    Storage.prototype.removeItem = function(key) {
        if (chiaviIsolate.includes(key)) key = getPrefissoApp() + key;
        originalRemoveItem.call(this, key);
    };
})();

let phoneInput;
let itiProfiloPartner;
let itiDipendente;
let latLngZonaOperativa = null;
let latLngProfiloZonaOperativa = null;

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

document.addEventListener("DOMContentLoaded", function() {
    let linkFavicon = document.querySelector("link[rel~='icon']");
    if (!linkFavicon) {
        linkFavicon = document.createElement('link');
        linkFavicon.rel = 'icon';
        linkFavicon.type = 'image/png';
        linkFavicon.href = '../logo/icona-pwa-prt.png';
        document.head.appendChild(linkFavicon);
    }

    if (sessionStorage.getItem('prt_avviso_email_modificata') === 'true') {
        sessionStorage.removeItem('prt_avviso_email_modificata');
        mostraModaleEmailModificata();
    }

    if (localStorage.getItem('driverbutler_ricordami') === 'false' && !sessionStorage.getItem('finestra_attiva')) {
        esciAccount();
        return;
    }
    sessionStorage.setItem('finestra_attiva', 'true');

    localStorage.setItem('driverbutler_lang', 'it');
    
    const chkRicordami = document.getElementById('ricordami');
    if (chkRicordami) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) chkRicordami.checked = true;
    }
    
    const paginaCorrenteSicurezza = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];

    if (paginaCorrenteSicurezza === 'index.html') {
        localStorage.setItem('driverbutler_ruolo', 'partner');
    }

    const blacklistPubblicaAccesso = [
        'index.html',
        'login_prt.html',
        'registrazione_prt.html',
        'pwreset_prt.html',
        'assistenza_prt.html',
        'preview-schermate.html'
    ];

    if (!blacklistPubblicaAccesso.includes(paginaCorrenteSicurezza)) {
        localStorage.setItem('driverbutler_last_page', window.location.href);
    }

    if (!blacklistPubblicaAccesso.includes(paginaCorrenteSicurezza) && !localStorage.getItem('driverbutler_auth_token')) {
        window.location.href = 'login_prt.html';
        return;
    } else if (!blacklistPubblicaAccesso.includes(paginaCorrenteSicurezza)) {
        rinnovaSessioneSilenziosa(); 
        setInterval(rinnovaSessioneSilenziosa, 50 * 60 * 1000); 
        
        if ('caches' in window) {
            caches.open('driverbutler-partner-session').then(cache => {
                const usaLocalStorage = localStorage.getItem('driverbutler_ricordami') === 'true';
                cache.put('/auth-status', new Response(JSON.stringify({ ricordami: usaLocalStorage })));
            });
        }
    }
    
    if (paginaCorrenteSicurezza === 'index.html' && localStorage.getItem('driverbutler_auth_token')) {
        const ultimaPagina = localStorage.getItem('driverbutler_last_page') || 'dashboard_prt.html';
        window.location.replace(ultimaPagina);
        return;
    }

    inizializzaMenuPartner();

    const phoneInputField = document.querySelector("#telefono");
    if (phoneInputField && window.intlTelInput) {
        phoneInput = window.intlTelInput(phoneInputField, {
            initialCountry: "it",
            preferredCountries: ["it"],
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
        });
    }

    const inputTelProfilo = document.getElementById('profilo_telefono');
    if (inputTelProfilo && window.intlTelInput) {
        itiProfiloPartner = window.intlTelInput(inputTelProfilo, {
            preferredCountries: ['it'],
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
        });
    }

    const inputTelDipendente = document.getElementById('dip_telefono');
    if (inputTelDipendente && window.intlTelInput) {
        itiDipendente = window.intlTelInput(inputTelDipendente, {
            preferredCountries: ['it'],
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
        });
    }

    const inputZonaOperativa = document.getElementById('zonaOperativa');
    const inputProfiloZonaOperativa = document.getElementById('profilo_zonaOperativa');
    
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        const confiniArea = new google.maps.LatLngBounds(
            new google.maps.LatLng(36.0, -2.0),
            new google.maps.LatLng(52.0, 18.0)
        );
        
        let acZona, acProfZona;

        if (inputZonaOperativa) {
            acZona = new google.maps.places.Autocomplete(inputZonaOperativa, { bounds: confiniArea, strictBounds: true });
            acZona.addListener('place_changed', function() {
                const place = acZona.getPlace();
                if (place && place.geometry) {
                    latLngZonaOperativa = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                }
            });
        }
        if (inputProfiloZonaOperativa) {
            acProfZona = new google.maps.places.Autocomplete(inputProfiloZonaOperativa, { bounds: confiniArea, strictBounds: true });
            acProfZona.addListener('place_changed', function() {
                const place = acProfZona.getPlace();
                if (place && place.geometry) {
                    latLngProfiloZonaOperativa = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                }
            });
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function() {});
        }
    }

    if (document.getElementById('dash_nome_partner') || document.getElementById('profilo_nome') || document.getElementById('btn_modifica_password') || document.getElementById('form_assistenza_interna')) {
        caricaDatiDashboardPartner();
    }
    if (localStorage.getItem('driverbutler_auth_token')) {
        verificaBadgeBacheca();
    }

    if (document.getElementById('contenitore_bacheca')) {
        caricaBachecaRichieste();
    }

    if (document.getElementById('bottom_bar_calendario')) {
        inizializzaCalendario();
    }

    const formProfilo = document.getElementById('formModificaProfilo');
    if (formProfilo) {
        formProfilo.addEventListener('submit', function(event) {
            if (typeof aggiornaProfilo === 'function') {
                aggiornaProfilo(event);
            }
        });
    }

    const formPwdEmail = document.getElementById('form_sicurezza_password_email');
    if (formPwdEmail) formPwdEmail.addEventListener('submit', verificaPasswordPerEmail);

    const btnAnnullaModEmail = document.getElementById('btn_annulla_mod_email');
    if (btnAnnullaModEmail) {
        btnAnnullaModEmail.addEventListener('click', function() {
            document.getElementById('blocco_sicurezza_email_password').classList.add('hidden');
            document.getElementById('formModificaProfilo').classList.remove('hidden');
            document.getElementById('password_attuale_email').value = '';
            nascondiMessaggioBottone('msg_errore_password_email');
        });
    }

    const formOtpEmail = document.getElementById('form_sicurezza_otp_email');
    if (formOtpEmail) formOtpEmail.addEventListener('submit', verificaOtpNuovaEmail);

    const linkRinviaOtpEmail = document.getElementById('link_rinvia_otp_email');
    if (linkRinviaOtpEmail) linkRinviaOtpEmail.addEventListener('click', inviaOtpNuovaEmail);

    const inputOtpNuovaEmail = document.getElementById('otp_code_nuova_email');
    if (inputOtpNuovaEmail) {
        inputOtpNuovaEmail.addEventListener('input', function() {
            nascondiMessaggioBottone('msg_errore_otp_email');
        });
    }

    const btnModificaPassword = document.getElementById('btn_modifica_password');
    if (btnModificaPassword) {
        btnModificaPassword.addEventListener('click', function() {
            if (typeof modificaPassword === 'function') {
                modificaPassword();
            }
        });
    }

    const formCambioPasswordInterno = document.getElementById('formCambioPasswordInterno');
    if (formCambioPasswordInterno) {
        formCambioPasswordInterno.addEventListener('submit', function(e) {
            if (typeof verificaOtpECambiaPassword === 'function') verificaOtpECambiaPassword(e);
        });
    }

    const linkNuovoOtpCambio = document.getElementById('link_invia_nuovo_otp_cambio');
    if (linkNuovoOtpCambio) {
        linkNuovoOtpCambio.addEventListener('click', function(e) {
            if (typeof inviaNuovoOtpCambio === 'function') inviaNuovoOtpCambio(e);
        });
    }

    const inputOtpCambio = document.getElementById('otp_code_cambio');
    if (inputOtpCambio) {
        inputOtpCambio.addEventListener('input', function() {
            nascondiMessaggioBottone('messaggio_errore_otp_cambio');
        });
    }

    const btnLogout = document.getElementById('btn_logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (typeof esciAccount === 'function') {
                esciAccount();
            }
        });
    }

    const formAssistenzaInterna = document.getElementById('form_assistenza_interna');
    if (formAssistenzaInterna) {
        formAssistenzaInterna.addEventListener('submit', function(event) {
            if (typeof inviaAssistenzaInterna === 'function') {
                inviaAssistenzaInterna(event);
            }
        });
    }

    const formAssistenzaPubblica = document.getElementById('form_assistenza');
    if (formAssistenzaPubblica) {
        formAssistenzaPubblica.addEventListener('submit', function(event) {
            if (typeof inviaAssistenza === 'function') {
                inviaAssistenza(event);
            }
        });
    }

    const puliziaErroriModuli = [
        { selector: '#formLogin', msgId: 'messaggio_errore_server_login' },
        { selector: '#form_sicurezza_password_email', msgId: 'msg_errore_password_email' },
        { selector: '#formModificaProfilo', msgId: 'msg_stato_profilo' },
        { selector: '#formRecuperoPassword', msgId: 'msg_recupero' },
        { selector: '#formRegistrazione', msgId: 'messaggio_errore_server' },
        { selector: '#form_assistenza', msgId: 'msg_stato_assistenza' },
        { selector: '#form_assistenza_interna', msgId: 'msg_stato_assistenza_interna' },
        { selector: '#formGestioneDipendente', msgId: 'msg_stato_dipendente' }
    ];

    puliziaErroriModuli.forEach(({ selector, msgId }) => {
        const formEl = document.querySelector(selector);
        if (formEl) {
            formEl.addEventListener('input', () => nascondiMessaggioBottone(msgId));
            formEl.addEventListener('change', () => nascondiMessaggioBottone(msgId));
        }
    });
});

function mostraMessaggioBottone(elementoId, testo, tipo = 'errore') {
    const el = document.getElementById(elementoId);
    if (!el) return;
    el.textContent = testo;
    if (tipo === 'neutro') {
        el.classList.add('messaggio-neutro');
    } else {
        el.classList.remove('messaggio-neutro');
    }
    el.classList.add('mostra');
}

function nascondiMessaggioBottone(elementoId) {
    const el = document.getElementById(elementoId);
    if (!el) return;
    el.classList.remove('mostra', 'messaggio-neutro');
    el.textContent = '';
}

function togglePassword(inputId, button) {
    const input = document.getElementById(inputId);
    const isPassword = input.type === 'password';
    
    input.type = isPassword ? 'text' : 'password';

    if (isPassword) {
        button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    } else {
        button.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`;
    }
}

async function inviaLogin(event) {
    event.preventDefault();

    const btnSubmit = document.querySelector('#formLogin button[type="submit"]');
    btnSubmit.disabled = true;
    mostraMessaggioBottone('messaggio_errore_server_login', "Accesso in corso...", 'neutro');
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    const urlLogin = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/token?grant_type=password";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const risposta = await fetch(urlLogin, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: email, password: password })
        });

        if (!risposta.ok) {
            const erroreDati = await risposta.json();
            const descErrore = (erroreDati.error_description || erroreDati.msg || "").toLowerCase();
            
            if (descErrore.includes("not confirmed") || descErrore.includes("non confermata")) {
                throw new Error("ACCOUNT_NON_VERIFICATO");
            }
            
            throw new Error("Email o password non validi.");
        }

        const datiSessione = await risposta.json();
        const userId = datiSessione.user.id;
        
        let ruoloAssegnato = null;

        const checkPartner = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${userId}&select=id_partner`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + datiSessione.access_token }
        });
        const datiPartner = await checkPartner.json();

        if (datiPartner && datiPartner.length > 0) {
            ruoloAssegnato = 'partner';
        } else {
            const checkDipendente = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/rpc/check_stato_dipendente", {
                method: "POST",
                headers: {
                    "apikey": chiaveAnon,
                    "Authorization": "Bearer " + datiSessione.access_token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({})
            });
            const datiDipendente = await checkDipendente.json();

            if (!datiDipendente || datiDipendente.length === 0) {
                throw new Error("Account non autorizzato per questa App.");
            }

            if (datiDipendente[0].ruolo === 'AUTISTA') {
                throw new Error("Accesso non consentito. Sei registrato come Autista, scarica e utilizza l'App Autisti dedicata.");
            }

            if (datiDipendente[0].stato_attivo !== true) {
                throw new Error("Account sospeso.");
            }

            ruoloAssegnato = 'operativo';
        }

        const checkRicordami = document.getElementById('ricordami');
        const usaLocalStorage = (checkRicordami && checkRicordami.checked);
        const storage = usaLocalStorage ? localStorage : sessionStorage;

        if (usaLocalStorage) {
            localStorage.setItem('driverbutler_ricordami', 'true');
        } else {
            localStorage.setItem('driverbutler_ricordami', 'false');
            sessionStorage.setItem('finestra_attiva', 'true');
        }

        if ('caches' in window) {
            caches.open('driverbutler-partner-session').then(cache => {
                cache.put('/auth-status', new Response(JSON.stringify({ ricordami: usaLocalStorage })));
            });
        }

        storage.setItem('driverbutler_auth_token', datiSessione.access_token);
        storage.setItem('driverbutler_refresh_token', datiSessione.refresh_token);
        localStorage.setItem('driverbutler_last_user', userId);
        
        nascondiMessaggioBottone('messaggio_errore_server_login');
        storage.setItem('driverbutler_ruolo', ruoloAssegnato);
        window.location.href = 'dashboard_prt.html';

    } catch (errore) {
        if (errore.message === "ACCOUNT_NON_VERIFICATO") {
            nascondiMessaggioBottone('messaggio_errore_server_login');
            document.getElementById('blocco_dati_login').classList.add('hidden');
            document.getElementById('blocco_verifica_otp_login').classList.remove('hidden');
            
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
            
            btnSubmit.disabled = false;
            return;
        }

        btnSubmit.disabled = false;
        mostraMessaggioBottone('messaggio_errore_server_login', errore.message, 'errore');
    }
}

async function verificaOtpLogin() {
    const email = document.getElementById('email').value.trim();
    const token = document.getElementById('otp_code_login').value.trim();
    const btnVerifica = document.getElementById('btn_verifica_otp_login');

    nascondiMessaggioBottone('messaggio_errore_otp_login');

    if (token.length !== 6) {
        mostraMessaggioBottone('messaggio_errore_otp_login', "Il codice deve essere di 6 cifre.", 'errore');
        return;
    }

    btnVerifica.disabled = true;
    mostraMessaggioBottone('messaggio_errore_otp_login', "Verifica in corso...", 'neutro');

    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    const urlVerify = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/verify";

    try {
        const risposta = await fetch(urlVerify, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: "signup",
                email: email,
                token: token
            })
        });

        if (!risposta.ok) {
            throw new Error("Codice errato o scaduto.");
        }

        const datiSessione = await risposta.json();
        const userId = datiSessione.user.id;
        let ruoloAssegnato = null;

        const checkPartner = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${userId}&select=id_partner`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + datiSessione.access_token }
        });
        const datiPartner = await checkPartner.json();

        if (datiPartner && datiPartner.length > 0) {
            ruoloAssegnato = 'partner';
        } else {
            const checkDipendente = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/rpc/check_stato_dipendente", {
                method: "POST",
                headers: {
                    "apikey": chiaveAnon,
                    "Authorization": "Bearer " + datiSessione.access_token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({})
            });
            const datiDipendente = await checkDipendente.json();

            if (!datiDipendente || datiDipendente.length === 0) {
                throw new Error("Account non autorizzato per questa App.");
            }
            if (datiDipendente[0].ruolo === 'AUTISTA') {
                throw new Error("Accesso non consentito. Sei registrato come Autista, scarica e utilizza l'App Autisti dedicata.");
            }
            if (datiDipendente[0].stato_attivo !== true) {
                throw new Error("Account sospeso.");
            }
            ruoloAssegnato = 'operativo';
        }

        const checkRicordami = document.getElementById('ricordami');
        const usaLocalStorage = (checkRicordami && checkRicordami.checked);
        const storage = usaLocalStorage ? localStorage : sessionStorage;

        if (usaLocalStorage) {
            localStorage.setItem('driverbutler_ricordami', 'true');
        } else {
            localStorage.setItem('driverbutler_ricordami', 'false');
            sessionStorage.setItem('finestra_attiva', 'true');
        }

        if ('caches' in window) {
            caches.open('driverbutler-partner-session').then(cache => {
                cache.put('/auth-status', new Response(JSON.stringify({ ricordami: usaLocalStorage })));
            });
        }

        storage.setItem('driverbutler_auth_token', datiSessione.access_token);
        storage.setItem('driverbutler_refresh_token', datiSessione.refresh_token);
        localStorage.setItem('driverbutler_last_user', userId);
        
        if (typeof svuotaBozze === 'function') svuotaBozze();

        nascondiMessaggioBottone('messaggio_errore_otp_login');
        storage.setItem('driverbutler_ruolo', ruoloAssegnato);
        window.location.href = 'dashboard_prt.html';

    } catch (errore) {
        btnVerifica.disabled = false;
        btnVerifica.blur();
        mostraMessaggioBottone('messaggio_errore_otp_login', errore.message, 'errore');
    }
}

async function inviaNuovoOtpLogin(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const link = document.getElementById('link_invia_nuovo_otp_login');

    const testoOriginale = link.textContent;
    link.textContent = "Invio in corso...";
    link.classList.add('no-click');

    nascondiMessaggioBottone('messaggio_errore_otp_login');

    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    const urlResend = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/resend";

    try {
        const risposta = await fetch(urlResend, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: "signup",
                email: email
            })
        });

        if (!risposta.ok) {
            throw new Error("Errore invio codice");
        }

        mostraMessaggioBottone('messaggio_errore_otp_login', "Nuovo codice inviato!", 'neutro');
        setTimeout(() => {
            nascondiMessaggioBottone('messaggio_errore_otp_login');
        }, 5000);

        link.textContent = testoOriginale;
        link.classList.remove('no-click');

    } catch (errore) {
        link.textContent = testoOriginale;
        link.classList.remove('no-click');
        mostraMessaggioBottone('messaggio_errore_otp_login', "Errore di connessione. Riprova.", 'errore');
    }
}

function validaComplessitaPassword() {
    const pass = document.getElementById('password').value;
    const msgErrore = document.getElementById('errore_password');
    const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!msgErrore) return true;

    if (pass.length === 0) {
        msgErrore.classList.remove('mostra');
        return false;
    }

    if (!regexPassword.test(pass)) {
        msgErrore.classList.add('mostra');
        return false;
    } else {
        msgErrore.classList.remove('mostra');
        return true;
    }
}

function verificaCoincidenzaPassword() {
    const confPassElement = document.getElementById('confermaPassword');
    if (!confPassElement) return true;
    const pass = document.getElementById('password').value;
    const confermaPass = confPassElement.value;
    const msgErrore = document.getElementById('errore_coincidenza');

    if (!msgErrore) return true;

    if (confermaPass.length === 0) {
        msgErrore.classList.remove('mostra');
        return false;
    }

    if (pass !== confermaPass) {
        msgErrore.classList.add('mostra');
        return false;
    } else {
        msgErrore.classList.remove('mostra');
        return true;
    }
}

async function inviaRegistrazione(event) {
    event.preventDefault();

    nascondiMessaggioBottone('messaggio_errore_server');

    if (!validaComplessitaPassword() || !verificaCoincidenzaPassword()) {
        return;
    }

    const btnSubmit = document.getElementById('btn_invia_registrazione') || event.target.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = true;
    }
    mostraMessaggioBottone('messaggio_errore_server', "Elaborazione...", 'neutro');

    const urlAuth = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/signup";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    const email = document.getElementById('email').value.trim();

    try {
        const checkEmail = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/rpc/check_email_esistente", {
            method: "POST",
            headers: { 
                "apikey": chiaveAnon, 
                "Authorization": "Bearer " + chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email_check: email })
        });
        
        const emailEsiste = await checkEmail.json();
        if (emailEsiste === true) throw new Error("EMAIL_ESISTENTE");

        const password = document.getElementById('password').value;

        let prefissoTel = phoneInput ? "+" + phoneInput.getSelectedCountryData().dialCode : "+39";
        let numeroDigitato = document.getElementById('telefono').value.trim();
        let telefonoFinale = (numeroDigitato.startsWith('+') ? numeroDigitato : (prefissoTel + numeroDigitato)).replace(/\s+/g, '');

        const corpoDati = {
            display_name: document.getElementById('nome').value,
            nome_cognome: document.getElementById('nome').value,
            tel_partner: telefonoFinale,
            ragione_sociale: document.getElementById('ragioneSociale').value,
            piva: document.getElementById('piva').value,
            codice_sdi: document.getElementById('codice_sdi').value || null,
            pec: document.getElementById('pec').value || null,
            indirizzo_via: document.getElementById('indirizzo_via').value,
            indirizzo_cap: document.getElementById('indirizzo_cap').value,
            indirizzo_citta: document.getElementById('indirizzo_citta').value,
            indirizzo_provincia: document.getElementById('indirizzo_provincia').value,
            iban: document.getElementById('iban').value,
            intestatario_conto: document.getElementById('intestatario_conto').value,
            ruolo_conducenti: document.getElementById('ruoloConducenti').value,
            autocertificazione_kb: document.getElementById('autocertificazioneKb').checked,
            zona_operativa: document.getElementById('zonaOperativa').value,
            zona_operativa_lat: latLngZonaOperativa ? latLngZonaOperativa.lat : null,
            zona_operativa_lng: latLngZonaOperativa ? latLngZonaOperativa.lng : null,
            notifica_push: true,
            notifica_email: false,
            linguaggio: 'it'
        };

        const authResponse = await fetch(urlAuth, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ 
                email: email, 
                password: password,
                data: corpoDati
            })
        });

        if (!authResponse.ok) {
            const authError = await authResponse.json();
            throw new Error(authError.msg || authError.message || "Errore nella registrazione delle credenziali");
        }

        nascondiMessaggioBottone('messaggio_errore_server');
        if (btnSubmit) btnSubmit.disabled = false;
        document.getElementById('blocco_dati_registrazione').classList.add('hidden');
        document.getElementById('blocco_verifica_otp').classList.remove('hidden');
        
        setTimeout(() => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 100);

    } catch (errore) {
        nascondiMessaggioBottone('messaggio_errore_server');
        if (btnSubmit) {
            btnSubmit.disabled = false;
        }

        let testoErrore = "Non è stato possibile completare la registrazione: " + errore.message;
        
        if (errore.message === "EMAIL_ESISTENTE" || errore.message.toLowerCase().includes("user already registered") || errore.message.toLowerCase().includes("already")) {
            testoErrore = "Questa email risulta già registrata a sistema. Usa un indirizzo diverso oppure vai alla pagina di accesso.";
        } else if (errore.message.toLowerCase().includes("sending confirmation email") || errore.message.toLowerCase().includes("rate limit")) {
            testoErrore = "Errore del server durante l'invio dell'email di conferma. Riprova più tardi.";
        }
        
        const overlay = document.getElementById('modale_errore_registrazione');
        if (overlay) {
            document.getElementById('testo_errore_registrazione').innerHTML = testoErrore;
            overlay.classList.remove('hidden');
            
            document.getElementById('btn_chiudi_errore_reg').onclick = function() {
                overlay.classList.add('hidden');
            };
        } else {
            mostraMessaggioBottone('messaggio_errore_server', testoErrore, 'errore');
        }
    }
}

async function verificaOtpRegistrazione() {
    const email = document.getElementById('email').value.trim();
    const token = document.getElementById('otp_code').value.trim();
    const btnVerifica = document.getElementById('btn_verifica_otp');

    nascondiMessaggioBottone('messaggio_errore_otp');

    if (token.length !== 6) {
        mostraMessaggioBottone('messaggio_errore_otp', "Il codice deve essere di 6 cifre.", 'errore');
        return;
    }

    btnVerifica.disabled = true;
    mostraMessaggioBottone('messaggio_errore_otp', "Verifica in corso...", 'neutro');

    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    const urlVerify = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/verify";

    try {
        const risposta = await fetch(urlVerify, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: "signup",
                email: email,
                token: token
            })
        });

        if (!risposta.ok) {
            throw new Error("Codice errato o scaduto.");
        }

        const datiSessione = await risposta.json();
        
        localStorage.setItem('driverbutler_auth_token', datiSessione.access_token);
        localStorage.setItem('driverbutler_refresh_token', datiSessione.refresh_token);
        localStorage.setItem('driverbutler_ruolo', 'partner');
        
        const userId = datiSessione.user.id;
        localStorage.setItem('driverbutler_last_user', userId);

        if (typeof svuotaBozze === 'function') svuotaBozze();
        
        nascondiMessaggioBottone('messaggio_errore_otp');
        window.location.href = 'dashboard_prt.html';

    } catch (errore) {
        btnVerifica.disabled = false;
        btnVerifica.blur();
        mostraMessaggioBottone('messaggio_errore_otp', "Codice errato o scaduto.", 'errore');
    }
}

async function inviaNuovoOtpRegistrazione(event) {
    event.preventDefault();
    const email = document.getElementById('email').value.trim();
    const link = document.getElementById('link_invia_nuovo_otp');

    const testoOriginale = link.textContent;
    link.textContent = "Invio in corso...";
    link.classList.add('no-click');

    nascondiMessaggioBottone('messaggio_errore_otp');

    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    const urlResend = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/resend";

    try {
        const risposta = await fetch(urlResend, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                type: "signup",
                email: email
            })
        });

        if (!risposta.ok) {
            throw new Error("Errore invio codice");
        }

        mostraMessaggioBottone('messaggio_errore_otp', "Nuovo codice inviato!", 'neutro');
        setTimeout(() => {
            nascondiMessaggioBottone('messaggio_errore_otp');
        }, 5000);

        link.textContent = testoOriginale;
        link.classList.remove('no-click');

    } catch (errore) {
        link.textContent = testoOriginale;
        link.classList.remove('no-click');
        mostraMessaggioBottone('messaggio_errore_otp', "Errore di connessione. Riprova.", 'errore');
    }
}

function aggiornaCampiGuidaProfiloOperativo() {
    const selectRuolo = document.getElementById('profilo_dip_ruolo');
    const gruppoSpunta = document.getElementById('gruppo_spunta_guida_profilo');
    const chkGuida = document.getElementById('profilo_dip_abilitato_guida');
    const sezioneGuida = document.getElementById('sezione_dati_guida_profilo');
    const inputNumRuolo = document.getElementById('profilo_dip_numero_ruolo');
    const chkPatente = document.getElementById('profilo_dip_autocert_patente');

    if (!selectRuolo || !gruppoSpunta || !chkGuida || !sezioneGuida) return;

    const ruolo = selectRuolo.value;
    const isGuida = (ruolo === 'AUTISTA') || (ruolo === 'OPERATIVO' && chkGuida.checked);

    if (ruolo === 'OPERATIVO') {
        gruppoSpunta.classList.remove('hidden');
    } else {
        gruppoSpunta.classList.add('hidden');
        chkGuida.checked = false;
    }

    if (isGuida) {
        sezioneGuida.classList.remove('hidden');
        if (inputNumRuolo) inputNumRuolo.required = true;
        if (chkPatente) chkPatente.required = true;
    } else {
        sezioneGuida.classList.add('hidden');
        if (inputNumRuolo) {
            inputNumRuolo.required = false;
            inputNumRuolo.value = '';
        }
        if (chkPatente) {
            chkPatente.required = false;
            chkPatente.checked = false;
        }
    }
}

async function recuperaContestoUtentePartner(token, userId) {
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    const partnerRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${userId}`, {
        headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
    });
    const partnerData = await partnerRes.json();

    if (partnerData && partnerData.length > 0) {
        return {
            tipoUtente: 'partner',
            partner: partnerData[0],
            dipendente: null,
            idPartnerAzienda: partnerData[0].id_partner,
            codicePartnerAzienda: partnerData[0].codice_partner
        };
    }

    const dipRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/dipendenti?id_dipendente=eq.${userId}`, {
        headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
    });
    const dipData = await dipRes.json();

    if (dipData && dipData.length > 0) {
        const dip = dipData[0];
        if (dip.stato_attivo !== true || dip.ruolo === 'AUTISTA') {
            return null;
        }

        const partnerAziendaRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${dip.id_partner}`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const partnerAziendaData = await partnerAziendaRes.json();
        const partnerAzienda = (partnerAziendaData && partnerAziendaData.length > 0) ? partnerAziendaData[0] : null;

        return {
            tipoUtente: 'operativo',
            partner: partnerAzienda,
            dipendente: dip,
            idPartnerAzienda: dip.id_partner,
            codicePartnerAzienda: dip.codice_partner
        };
    }

    return null;
}

async function caricaDatiDashboardPartner() {
    let token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    try {
        let userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });

        if (userRes.status === 401 || !userRes.ok) {
            await rinnovaSessioneSilenziosa();
            token = localStorage.getItem('driverbutler_auth_token');
            
            userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
            });
            
            if (!userRes.ok) throw new Error("Token irrecuperabile");
        }

        const userData = await userRes.json();
        const contesto = await recuperaContestoUtentePartner(token, userData.id);

        if (!contesto) {
            esciAccount();
            return;
        }

        if (contesto.tipoUtente === 'partner') {
            const partner = contesto.partner;

            const lblCodPrinc = document.getElementById('lbl_codice_principale');
            if (lblCodPrinc) lblCodPrinc.textContent = 'Codice Partner:';

            if (document.getElementById('dash_nome_partner')) {
                document.getElementById('dash_nome_partner').textContent = partner.nome_cognome;
            }
            if (document.getElementById('dash_codice_partner')) {
                document.getElementById('dash_codice_partner').textContent = partner.codice_partner;
            }
            const bloccoOpDash = document.getElementById('blocco_dati_operativo_dash');
            if (bloccoOpDash) bloccoOpDash.classList.add('hidden');

            if (document.getElementById('profilo_nome')) {
                const bloccoPrt = document.getElementById('blocco_campi_partner_profilo');
                const bloccoOp = document.getElementById('blocco_campi_operativo_profilo');
                const bloccoRuoloOp = document.getElementById('blocco_ruolo_operativo_profilo');
                const bloccoSoc = document.getElementById('blocco_dati_societari_partner');

                if (bloccoPrt) bloccoPrt.classList.remove('hidden');
                if (bloccoOp) bloccoOp.classList.add('hidden');
                if (bloccoRuoloOp) bloccoRuoloOp.classList.add('hidden');
                if (bloccoSoc) bloccoSoc.classList.remove('hidden');

                document.getElementById('profilo_nome').required = true;
                ['profilo_dip_nome', 'profilo_dip_cognome', 'profilo_dip_numero_ruolo'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.required = false;
                });
                ['profilo_ragioneSociale', 'profilo_piva', 'profilo_codice_sdi', 'profilo_pec', 'profilo_indirizzo_via', 'profilo_indirizzo_cap', 'profilo_indirizzo_citta', 'profilo_indirizzo_provincia', 'profilo_iban', 'profilo_intestatario_conto', 'profilo_ruoloConducenti', 'profilo_zonaOperativa'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.required = true;
                });
                const chkKb = document.getElementById('profilo_autocertificazioneKb');
                if (chkKb) chkKb.required = true;

                document.getElementById('profilo_nome').value = partner.nome_cognome || '';
                document.getElementById('profilo_email').value = partner.email || '';
                if (itiProfiloPartner && partner.tel_partner) {
                    itiProfiloPartner.setNumber(partner.tel_partner);
                }
                
                if (document.getElementById('profilo_ragioneSociale')) document.getElementById('profilo_ragioneSociale').value = partner.ragione_sociale || '';
                if (document.getElementById('profilo_piva')) document.getElementById('profilo_piva').value = partner.piva || '';
                if (document.getElementById('profilo_codice_sdi')) document.getElementById('profilo_codice_sdi').value = partner.codice_sdi || '';
                if (document.getElementById('profilo_pec')) document.getElementById('profilo_pec').value = partner.pec || '';
                if (document.getElementById('profilo_indirizzo_via')) document.getElementById('profilo_indirizzo_via').value = partner.indirizzo_via || '';
                if (document.getElementById('profilo_indirizzo_cap')) document.getElementById('profilo_indirizzo_cap').value = partner.indirizzo_cap || '';
                if (document.getElementById('profilo_indirizzo_citta')) document.getElementById('profilo_indirizzo_citta').value = partner.indirizzo_citta || '';
                if (document.getElementById('profilo_indirizzo_provincia')) document.getElementById('profilo_indirizzo_provincia').value = partner.indirizzo_provincia || '';
                
                if (document.getElementById('profilo_iban')) document.getElementById('profilo_iban').value = partner.iban || '';
                if (document.getElementById('profilo_intestatario_conto')) document.getElementById('profilo_intestatario_conto').value = partner.intestatario_conto || '';
                if (document.getElementById('profilo_ruoloConducenti')) document.getElementById('profilo_ruoloConducenti').value = partner.ruolo_conducenti || '';
                if (document.getElementById('profilo_autocertificazioneKb')) document.getElementById('profilo_autocertificazioneKb').checked = partner.autocertificazione_kb;
                if (document.getElementById('profilo_abilitato_guida')) document.getElementById('profilo_abilitato_guida').checked = partner.abilitato_guida !== false;
                if (document.getElementById('profilo_zonaOperativa')) document.getElementById('profilo_zonaOperativa').value = partner.zona_operativa || '';

                if (document.getElementById('profilo_notificaPush')) document.getElementById('profilo_notificaPush').checked = partner.notifica_push;
            }
        } else {
            const dip = contesto.dipendente;
            const partnerAzienda = contesto.partner;
            const nomeCompletoOp = `${dip.nome || ''} ${dip.cognome || ''}`.trim();

            const lblCodPrinc = document.getElementById('lbl_codice_principale');
            if (lblCodPrinc) lblCodPrinc.textContent = 'Codice Dipendente:';

            if (document.getElementById('dash_nome_partner')) {
                document.getElementById('dash_nome_partner').textContent = nomeCompletoOp || dip.email;
            }
            if (document.getElementById('dash_codice_partner')) {
                document.getElementById('dash_codice_partner').textContent = dip.codice_dipendente || '-';
            }
            const bloccoOpDash = document.getElementById('blocco_dati_operativo_dash');
            if (bloccoOpDash) {
                bloccoOpDash.classList.remove('hidden');
                const elAzienda = document.getElementById('dash_azienda_operativo');
                const elCodDip = document.getElementById('dash_codice_dipendente');
                if (elAzienda) elAzienda.textContent = (partnerAzienda && (partnerAzienda.ragione_sociale || partnerAzienda.nome_cognome)) ? (partnerAzienda.ragione_sociale || partnerAzienda.nome_cognome) : '-';
                if (elCodDip) elCodDip.textContent = contesto.codicePartnerAzienda || '-';
            }

            if (document.getElementById('profilo_dip_nome') || document.getElementById('profilo_email')) {
                const bloccoPrt = document.getElementById('blocco_campi_partner_profilo');
                const bloccoOp = document.getElementById('blocco_campi_operativo_profilo');
                const bloccoRuoloOp = document.getElementById('blocco_ruolo_operativo_profilo');
                const bloccoSoc = document.getElementById('blocco_dati_societari_partner');

                if (bloccoPrt) bloccoPrt.classList.add('hidden');
                if (bloccoOp) bloccoOp.classList.remove('hidden');
                if (bloccoRuoloOp) bloccoRuoloOp.classList.remove('hidden');
                if (bloccoSoc) bloccoSoc.classList.add('hidden');

                const inputNomePrt = document.getElementById('profilo_nome');
                if (inputNomePrt) inputNomePrt.required = false;

                ['profilo_ragioneSociale', 'profilo_piva', 'profilo_codice_sdi', 'profilo_pec', 'profilo_indirizzo_via', 'profilo_indirizzo_cap', 'profilo_indirizzo_citta', 'profilo_indirizzo_provincia', 'profilo_iban', 'profilo_intestatario_conto', 'profilo_ruoloConducenti', 'profilo_zonaOperativa'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el) el.required = false;
                });
                const chkKb = document.getElementById('profilo_autocertificazioneKb');
                if (chkKb) chkKb.required = false;

                if (document.getElementById('profilo_dip_nome')) {
                    document.getElementById('profilo_dip_nome').value = dip.nome || '';
                    document.getElementById('profilo_dip_nome').required = true;
                }
                if (document.getElementById('profilo_dip_cognome')) {
                    document.getElementById('profilo_dip_cognome').value = dip.cognome || '';
                    document.getElementById('profilo_dip_cognome').required = true;
                }
                if (document.getElementById('profilo_email')) {
                    document.getElementById('profilo_email').value = dip.email || userData.email || '';
                }
                if (itiProfiloPartner && dip.telefono) {
                    itiProfiloPartner.setNumber(dip.telefono);
                }
                if (document.getElementById('profilo_dip_ruolo')) {
                    document.getElementById('profilo_dip_ruolo').value = dip.ruolo || 'OPERATIVO';
                }
                if (document.getElementById('profilo_dip_abilitato_guida')) {
                    document.getElementById('profilo_dip_abilitato_guida').checked = !!dip.abilitato_guida;
                }
                if (document.getElementById('profilo_dip_numero_ruolo')) {
                    document.getElementById('profilo_dip_numero_ruolo').value = dip.numero_ruolo_provincia || '';
                }
                if (document.getElementById('profilo_dip_autocert_patente')) {
                    document.getElementById('profilo_dip_autocert_patente').checked = !!dip.autocert_patente;
                }
                if (document.getElementById('profilo_notificaPush')) {
                    document.getElementById('profilo_notificaPush').checked = !!dip.notifica_push;
                }

                const selRuolo = document.getElementById('profilo_dip_ruolo');
                const chkGuida = document.getElementById('profilo_dip_abilitato_guida');
                if (selRuolo && !selRuolo.dataset.listenerAttached) {
                    selRuolo.addEventListener('change', aggiornaCampiGuidaProfiloOperativo);
                    selRuolo.dataset.listenerAttached = 'true';
                }
                if (chkGuida && !chkGuida.dataset.listenerAttached) {
                    chkGuida.addEventListener('change', aggiornaCampiGuidaProfiloOperativo);
                    chkGuida.dataset.listenerAttached = 'true';
                }

                aggiornaCampiGuidaProfiloOperativo();
            }
        }

        if (typeof applicaBozze === 'function') applicaBozze();

    } catch (error) {
        localStorage.removeItem('driverbutler_auth_token');
        window.location.href = 'login_prt.html';
    }
}

async function aggiornaProfilo(event) {
    event.preventDefault();

    nascondiMessaggioBottone('msg_stato_profilo');

    const btnSubmit = document.querySelector('#formModificaProfilo button[type="submit"]');
    btnSubmit.disabled = true;
    mostraMessaggioBottone('msg_stato_profilo', "Salvataggio in corso...", 'neutro');

    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const userData = await userRes.json();
        const userId = userData.id;
        const contesto = await recuperaContestoUtentePartner(token, userId);

        if (!contesto) {
            throw new Error("Contesto utente non valido");
        }

        let prefissoTel = "+" + itiProfiloPartner.getSelectedCountryData().dialCode;
        let numeroDigitato = document.getElementById('profilo_telefono').value.trim();
        let telefonoFinale = (numeroDigitato.startsWith('+') ? numeroDigitato : (prefissoTel + numeroDigitato)).replace(/\s+/g, '');
        const nuovaEmail = document.getElementById('profilo_email').value.trim();

        if (contesto.tipoUtente === 'partner') {
            const urlPatch = `https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${userId}`;
            const corpoDati = {
                nome_cognome: document.getElementById('profilo_nome').value,
                tel_partner: telefonoFinale,
                ragione_sociale: document.getElementById('profilo_ragioneSociale').value,
                piva: document.getElementById('profilo_piva').value,
                codice_sdi: document.getElementById('profilo_codice_sdi').value || null,
                pec: document.getElementById('profilo_pec').value || null,
                indirizzo_via: document.getElementById('profilo_indirizzo_via').value,
                indirizzo_cap: document.getElementById('profilo_indirizzo_cap').value,
                indirizzo_citta: document.getElementById('profilo_indirizzo_citta').value,
                indirizzo_provincia: document.getElementById('profilo_indirizzo_provincia').value,
                iban: document.getElementById('profilo_iban').value,
                intestatario_conto: document.getElementById('profilo_intestatario_conto').value,
                ruolo_conducenti: document.getElementById('profilo_ruoloConducenti').value,
                autocertificazione_kb: document.getElementById('profilo_autocertificazioneKb').checked,
                abilitato_guida: document.getElementById('profilo_abilitato_guida') ? document.getElementById('profilo_abilitato_guida').checked : true,
                zona_operativa: document.getElementById('profilo_zonaOperativa').value,
                notifica_push: document.getElementById('profilo_notificaPush').checked,
                notifica_email: false
            };
            if (latLngProfiloZonaOperativa) {
                corpoDati.zona_operativa_lat = latLngProfiloZonaOperativa.lat;
                corpoDati.zona_operativa_lng = latLngProfiloZonaOperativa.lng;
            }

            const dbRes = await fetch(urlPatch, {
                method: "PATCH",
                headers: {
                    "apikey": chiaveAnon,
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify(corpoDati)
            });

            if (!dbRes.ok) {
                throw new Error("Errore database");
            }

            await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                method: "PUT",
                headers: {
                    "apikey": chiaveAnon,
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ data: { display_name: corpoDati.nome_cognome, name: corpoDati.nome_cognome } })
            });
        } else {
            const nomeDip = document.getElementById('profilo_dip_nome').value.trim();
            const cognomeDip = document.getElementById('profilo_dip_cognome').value.trim();
            const ruoloScelto = document.getElementById('profilo_dip_ruolo').value;
            const chkGuida = document.getElementById('profilo_dip_abilitato_guida');
            const abilitatoGuida = ruoloScelto === 'AUTISTA' ? true : (chkGuida ? chkGuida.checked : false);
            const numRuoloEl = document.getElementById('profilo_dip_numero_ruolo');
            const patenteEl = document.getElementById('profilo_dip_autocert_patente');

            const corpoDip = {
                nome: nomeDip,
                cognome: cognomeDip,
                telefono: telefonoFinale,
                ruolo: ruoloScelto,
                abilitato_guida: abilitatoGuida,
                numero_ruolo_provincia: abilitatoGuida && numRuoloEl ? (numRuoloEl.value.trim() || null) : null,
                autocert_patente: abilitatoGuida && patenteEl ? patenteEl.checked : false,
                notifica_push: document.getElementById('profilo_notificaPush').checked,
                notifica_email: false
            };

            if (nuovaEmail === userData.email) {
                corpoDip.email = nuovaEmail;
            }

            const dbRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/dipendenti?id_dipendente=eq.${userId}`, {
                method: "PATCH",
                headers: {
                    "apikey": chiaveAnon,
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify(corpoDip)
            });

            if (!dbRes.ok) {
                throw new Error("Errore database");
            }

            await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                method: "PUT",
                headers: {
                    "apikey": chiaveAnon,
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ data: { display_name: `${cognomeDip} ${nomeDip}`.trim(), name: `${nomeDip} ${cognomeDip}`.trim() } })
            });
        }

        if (nuovaEmail !== userData.email) {
            btnSubmit.disabled = false;
            nascondiMessaggioBottone('msg_stato_profilo');
            
            document.getElementById('formModificaProfilo').classList.add('hidden');
            document.getElementById('blocco_sicurezza_email_password').classList.remove('hidden');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (typeof svuotaBozze === 'function') svuotaBozze();

        btnSubmit.disabled = false;
        mostraMessaggioBottone('msg_stato_profilo', "Modifiche salvate con successo!", 'neutro');

        setTimeout(() => {
            nascondiMessaggioBottone('msg_stato_profilo');
        }, 5000);
        
        caricaDatiDashboardPartner();
        
    } catch (errore) {
        btnSubmit.disabled = false;
        mostraMessaggioBottone('msg_stato_profilo', "Errore durante il salvataggio. Riprova.", 'errore');
    }
}

async function verificaPasswordPerEmail(event) {
    event.preventDefault();
    nascondiMessaggioBottone('msg_errore_password_email');

    const btn = document.getElementById('btn_conferma_password_email');
    const pwdInserita = document.getElementById('password_attuale_email').value;
    
    btn.disabled = true;
    mostraMessaggioBottone('msg_errore_password_email', "Verifica...", 'neutro');

    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const userData = await userRes.json();
        
        const loginCheck = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/token?grant_type=password", {
            method: "POST",
            headers: { "apikey": chiaveAnon, "Content-Type": "application/json" },
            body: JSON.stringify({ email: userData.email, password: pwdInserita })
        });

        if (!loginCheck.ok) {
            throw new Error("PWD_ERRATA");
        }

        await inviaOtpNuovaEmail(null, true);

    } catch (errore) {
        btn.disabled = false;
        document.getElementById('password_attuale_email').value = '';
        const testoErrore = errore.message === "PWD_ERRATA" ? "Password errata." : "Errore di connessione.";
        mostraMessaggioBottone('msg_errore_password_email', testoErrore, 'errore');
    }
}

async function inviaOtpNuovaEmail(event, daFlussoPrincipale = false) {
    if (event) event.preventDefault();
    
    const nuovaEmail = document.getElementById('profilo_email').value.trim();
    const btn = document.getElementById('btn_conferma_password_email');
    const link = document.getElementById('link_rinvia_otp_email');
    
    nascondiMessaggioBottone('msg_errore_otp_email');

    if (!daFlussoPrincipale && link) {
        link.textContent = "Invio in corso...";
        link.classList.add('no-click');
    }

    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const updateRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            method: "PUT",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: nuovaEmail })
        });

        if (!updateRes.ok) {
            const errEmail = await updateRes.json();
            const stringaErrore = JSON.stringify(errEmail).toLowerCase();
            if (updateRes.status === 422 || stringaErrore.includes("already") || stringaErrore.includes("exists")) {
                throw new Error("EMAIL_ESISTENTE");
            }
            throw new Error("ERRORE_INVIO");
        }

        if (daFlussoPrincipale) {
            nascondiMessaggioBottone('msg_errore_password_email');
            document.getElementById('blocco_sicurezza_email_password').classList.add('hidden');
            document.getElementById('blocco_sicurezza_email_otp').classList.remove('hidden');
            btn.disabled = false;
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            mostraMessaggioBottone('msg_errore_otp_email', "Nuovo codice inviato!", 'neutro');
            setTimeout(() => {
                nascondiMessaggioBottone('msg_errore_otp_email');
            }, 5000);
            if (link) {
                link.textContent = "Codice scaduto o non ricevuto? Invia di nuovo";
                link.classList.remove('no-click');
            }
        }

    } catch (errore) {
        if (daFlussoPrincipale) {
            btn.disabled = false;
            const testoErrore = errore.message === "EMAIL_ESISTENTE" ? "La mail scelta è già registrata." : "Errore invio OTP.";
            mostraMessaggioBottone('msg_errore_password_email', testoErrore, 'errore');
        } else {
            if (link) {
                link.textContent = "Codice scaduto o non ricevuto? Invia di nuovo";
                link.classList.remove('no-click');
            }
            const testoErrore = errore.message === "EMAIL_ESISTENTE" ? "La mail scelta è già registrata." : "Errore di connessione.";
            mostraMessaggioBottone('msg_errore_otp_email', testoErrore, 'errore');
        }
    }
}

async function verificaOtpNuovaEmail(event) {
    event.preventDefault();
    nascondiMessaggioBottone('msg_errore_otp_email');

    const tokenOtp = document.getElementById('otp_code_nuova_email').value.trim();
    if (tokenOtp.length !== 6) {
        mostraMessaggioBottone('msg_errore_otp_email', "Il codice deve essere di 6 cifre.", 'errore');
        return;
    }

    const nuovaEmail = document.getElementById('profilo_email').value.trim();
    const btn = document.getElementById('btn_verifica_otp_email');
    btn.disabled = true;
    mostraMessaggioBottone('msg_errore_otp_email', "Verifica...", 'neutro');

    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const verifyRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/verify", {
            method: "POST",
            headers: { "apikey": chiaveAnon, "Content-Type": "application/json" },
            body: JSON.stringify({ type: "email_change", email: nuovaEmail, token: tokenOtp })
        });

        if (!verifyRes.ok) throw new Error("OTP_INVALID");

        const sessioneAggiornata = await verifyRes.json();
        
        localStorage.setItem('driverbutler_auth_token', sessioneAggiornata.access_token);
        localStorage.setItem('driverbutler_refresh_token', sessioneAggiornata.refresh_token);

        if (sessioneAggiornata.user && sessioneAggiornata.user.id && sessioneAggiornata.user.email) {
            await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/dipendenti?id_dipendente=eq.${sessioneAggiornata.user.id}`, {
                method: "PATCH",
                headers: {
                    "apikey": chiaveAnon,
                    "Authorization": "Bearer " + sessioneAggiornata.access_token,
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify({ email: sessioneAggiornata.user.email })
            });
        }

        if (typeof svuotaBozze === 'function') svuotaBozze();

        const titoloFeedback = `<h2 class="feedback-titolo feedback-titolo-successo">Richiesta Inviata!</h2>`;
        const msgFeedback = `<p class="feedback-testo">L'indirizzo email è stato aggiornato correttamente.</p>`;
        const btnDashboard = `<a data-href="dashboard_prt.html" class="btn link-cliccabile">Vai al Pannello Utente</a>`;
        
        mostraSchermataFeedback('successo', '.login-wrapper', titoloFeedback, msgFeedback, btnDashboard);

    } catch (errore) {
        btn.disabled = false;
        mostraMessaggioBottone('msg_errore_otp_email', "Codice errato o scaduto.", 'errore');
    }
}

async function modificaPassword() {
    const btn = document.getElementById('btn_modifica_password');
    if (!btn) return;

    const ruoloSalvato = localStorage.getItem('driverbutler_ruolo');
    if (ruoloSalvato !== 'partner' && ruoloSalvato !== 'operativo') {
        esciAccount();
        return;
    }

    btn.disabled = true;
    mostraMessaggioBottone('msg_richiesta_cambio', "Invio richiesta...", 'neutro');

    const token = localStorage.getItem('driverbutler_auth_token');
    const urlRecover = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/recover";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!userRes.ok) throw new Error("Sessione non valida");
        
        const userData = await userRes.json();
        const emailUtente = userData.email;

        const risposta = await fetch(urlRecover, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: emailUtente })
        });

        if (!risposta.ok) {
            throw new Error("Errore invio OTP");
        }

        nascondiMessaggioBottone('msg_richiesta_cambio');
        document.getElementById('blocco_richiesta_cambio').classList.add('hidden');
        document.getElementById('blocco_verifica_cambio').classList.remove('hidden');
        
        btn.disabled = false;

    } catch (errore) {
        console.error(errore);
        btn.disabled = false;
        mostraMessaggioBottone('msg_richiesta_cambio', "Errore di invio", 'errore');
    }
}

async function verificaOtpECambiaPassword(event) {
    event.preventDefault();

    nascondiMessaggioBottone('messaggio_errore_server_cambio');
    nascondiMessaggioBottone('messaggio_errore_otp_cambio');

    const tokenOtp = document.getElementById('otp_code_cambio').value.trim();
    if (tokenOtp.length !== 6) {
        mostraMessaggioBottone('messaggio_errore_otp_cambio', "Il codice deve essere di 6 cifre.", 'errore');
        return;
    }

    if (typeof validaComplessitaPassword === 'function' && !validaComplessitaPassword()) return;
    if (typeof verificaCoincidenzaPassword === 'function' && !verificaCoincidenzaPassword()) return;

    const nuovaPassword = document.getElementById('password').value;
    const btnSubmit = document.getElementById('btn_salva_password_interna');
    
    btnSubmit.disabled = true;
    mostraMessaggioBottone('messaggio_errore_server_cambio', "Salvataggio in corso...", 'neutro');

    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!userRes.ok) throw new Error("Sessione non valida");
        
        const userData = await userRes.json();
        const emailUtente = userData.email;

        let sessioneRecupero = (window._sessioneOtpCambio && window._sessioneOtpCambio.otp === tokenOtp) ? window._sessioneOtpCambio.sessione : null;

        if (!sessioneRecupero) {
            const verifyRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/verify", {
                method: "POST",
                headers: {
                    "apikey": chiaveAnon,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ type: "recovery", email: emailUtente, token: tokenOtp })
            });

            if (!verifyRes.ok) throw new Error("OTP_INVALID");

            sessioneRecupero = await verifyRes.json();
            window._sessioneOtpCambio = { otp: tokenOtp, sessione: sessioneRecupero };
        }

        const tempToken = sessioneRecupero.access_token;

        const updateRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            method: "PUT",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + tempToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password: nuovaPassword })
        });

        if (!updateRes.ok) {
            const datiErrore = await updateRes.json();
            if (datiErrore.error_code === "same_password") {
                throw new Error("La nuova password digitata è uguale all'attuale, non hai bisogno di reimpostarla.");
            }
            throw new Error("UPDATE_FAILED");
        }

        localStorage.setItem('driverbutler_auth_token', sessioneRecupero.access_token);
        localStorage.setItem('driverbutler_refresh_token', sessioneRecupero.refresh_token);

        if (typeof svuotaBozze === 'function') svuotaBozze();

        nascondiMessaggioBottone('messaggio_errore_server_cambio');
        window.location.href = 'dashboard_prt.html';

    } catch (errore) {
        nascondiMessaggioBottone('messaggio_errore_server_cambio');
        btnSubmit.disabled = false;
        
        if (errore.message === "OTP_INVALID") {
            mostraMessaggioBottone('messaggio_errore_otp_cambio', "Codice errato o scaduto.", 'errore');
        } else {
            const testoErrore = errore.message === "UPDATE_FAILED" ? "Impossibile aggiornare la password." : errore.message;
            mostraMessaggioBottone('messaggio_errore_server_cambio', testoErrore, 'errore');
        }
    }
}

async function inviaNuovoOtpCambio(event) {
    event.preventDefault();
    const link = document.getElementById('link_invia_nuovo_otp_cambio');

    const testoOriginale = link.textContent;
    link.textContent = "Invio in corso...";
    link.classList.add('no-click');

    nascondiMessaggioBottone('messaggio_errore_otp_cambio');

    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!userRes.ok) throw new Error("Sessione non valida");
        
        const userData = await userRes.json();
        const emailUtente = userData.email;

        const risposta = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/recover", {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: emailUtente })
        });

        if (!risposta.ok) {
            throw new Error("Errore invio codice");
        }

        mostraMessaggioBottone('messaggio_errore_otp_cambio', "Nuovo codice inviato!", 'neutro');
        setTimeout(() => {
            nascondiMessaggioBottone('messaggio_errore_otp_cambio');
        }, 5000);

        link.textContent = testoOriginale;
        link.classList.remove('no-click');

    } catch (errore) {
        link.textContent = testoOriginale;
        link.classList.remove('no-click');
        mostraMessaggioBottone('messaggio_errore_otp_cambio', "Errore di connessione. Riprova.", 'errore');
    }
}

function toggleAssistenza() {
    const form = document.getElementById('form_assistenza');
    if (form.classList.contains('hidden')) {
        form.classList.remove('hidden');
    } else {
        form.classList.add('hidden');
    }
}

async function inviaAssistenza(event) {
    event.preventDefault();
    
    const honeypot = document.getElementById('azienda_hp').value;
    if (honeypot) return;

    const emailUtente = document.getElementById('assistenza_email').value.trim();
    const messaggioUtente = document.getElementById('testo_assistenza').value.trim();
    const btnSubmit = document.querySelector('#form_assistenza button[type="submit"]');

    btnSubmit.disabled = true;
    mostraMessaggioBottone('msg_stato_assistenza', "Invio in corso...", 'neutro');

    const urlSupabase = "https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/richieste_assistenza";
    const urlGoogleApp = "https://script.google.com/macros/s/AKfycbxS7_NOyZXPwhO9m3VDH1aD98a1emWtuDRDNi6VnnqStZtieZUE_ILt_lcvu_HU88In/exec";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const resSupa = await fetch(urlSupabase, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: emailUtente, messaggio: messaggioUtente })
        });

        if (!resSupa.ok) throw new Error("Errore salvataggio database");

        fetch(urlGoogleApp, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailUtente, messaggio: messaggioUtente })
        });

        if (typeof svuotaBozze === 'function') svuotaBozze();
        mostraUiAssistenzaOk('.login-wrapper');

    } catch (errore) {
        btnSubmit.disabled = false;
        mostraMessaggioBottone('msg_stato_assistenza', "Errore durante l'invio. Riprova più tardi.", 'errore');
    }
}

function mostraModaleEmailModificata() {
    let overlay = document.getElementById('modale_email_modificata');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modale_email_modificata';
        overlay.className = 'modale-overlay';
        overlay.innerHTML = `
            <div class="modale-box">
                <h3 class="modale-titolo">Email di accesso modificata</h3>
                <p class="modale-testo">La tua email di accesso è stata modificata. Accedi con il nuovo indirizzo e verifica che la tua ultima operazione sia andata a buon fine.</p>
                <div class="modale-bottoni-container btn-singolo-container">
                    <button id="btn_ok_email_modificata" class="btn-modale-bianco">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn_ok_email_modificata').addEventListener('click', function() {
            overlay.classList.add('hidden');
        });
    }

    overlay.classList.remove('hidden');
}

let disconnessioneForzataInCorso = false;
const originalFetchPrt = window.fetch.bind(window);
window.fetch = async function(...args) {
    const response = await originalFetchPrt(...args);
    const urlRichiesta = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');

    if (
        urlRichiesta.includes('drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user') &&
        (response.status === 401 || response.status === 403) &&
        localStorage.getItem('driverbutler_auth_token') &&
        !disconnessioneForzataInCorso
    ) {
        disconnessioneForzataInCorso = true;
        rinnovaSessioneSilenziosa();
    }

    return response;
};

async function esciAccount(sessioneRevocata = false) {
    let endpointCorrente = null;
    let subCorrente = null;
    
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.getRegistration();
            if (reg) {
                subCorrente = await reg.pushManager.getSubscription();
                if (subCorrente) {
                    endpointCorrente = subCorrente.endpoint;
                }
            }
        } catch (e) {
            console.error("Errore recupero subscription:", e);
        }
    }

    const token = localStorage.getItem('driverbutler_auth_token') || sessionStorage.getItem('driverbutler_auth_token');
    if (token && endpointCorrente) {
        const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
        try {
            const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
            });
            if (userRes.ok) {
                const userData = await userRes.json();
                
                const deviceId = localStorage.getItem('driverbutler_device_id');
                if (deviceId) {
                    await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/abbonamenti_push?user_id=eq.${userData.id}&device_id=eq.${deviceId}`, {
                        method: "DELETE",
                        headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
                    });
                }
            }
        } catch (e) {
            console.error("Errore cancellazione DB:", e);
        }
    }

    if (subCorrente) {
        try {
            await subCorrente.unsubscribe();
        } catch (e) {}
    }

    const chiaviDaCancellare = [
        'driverbutler_auth_token', 'driverbutler_refresh_token', 'driverbutler_ruolo', 'driverbutler_last_user', 'driverbutler_last_page'
    ];
    chiaviDaCancellare.forEach(chiave => {
        localStorage.removeItem(chiave);
        sessionStorage.removeItem(chiave);
        sessionStorage.removeItem('prt_' + chiave);
    });
    localStorage.removeItem('driverbutler_ricordami');
    sessionStorage.removeItem('finestra_attiva');
	if ('caches' in window) {
        caches.delete('driverbutler-partner-session');
    }
    if (sessioneRevocata === true) {
        sessionStorage.setItem('prt_avviso_email_modificata', 'true');
        window.location.href = 'login_prt.html';
        return;
    }
    window.location.href = 'index.html';
}

async function richiediResetPassword(event) {
    event.preventDefault();

    const email = document.getElementById('email_recupero').value.trim();
    const btn = document.getElementById('btn_invia_recupero');

    btn.disabled = true;
    mostraMessaggioBottone('msg_recupero', "Elaborazione in corso...", 'neutro');

    const urlRecover = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/recover";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        await fetch(urlRecover, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: email })
        });

        nascondiMessaggioBottone('msg_recupero');
        document.getElementById('blocco_richiesta_reset').classList.add('hidden');
        document.getElementById('blocco_verifica_reset').classList.remove('hidden');
        
        const testoInvio = document.getElementById('testo_invio_reset_email');
        if (testoInvio) {
            testoInvio.innerHTML = `Abbiamo inviato un codice di sicurezza a: <strong>${email}</strong>`;
        }

        btn.disabled = false;

    } catch (errore) {
        btn.disabled = false;
        mostraMessaggioBottone('msg_recupero', "Errore di connessione. Riprova.", 'errore');
    }
}

function tornaARichiestaReset(event) {
    if (event) event.preventDefault();
    document.getElementById('blocco_verifica_reset').classList.add('hidden');
    document.getElementById('blocco_richiesta_reset').classList.remove('hidden');
    
    const emailInput = document.getElementById('email_recupero');
    if (emailInput) emailInput.value = '';
    
    const otpInput = document.getElementById('otp_code_reset');
    if (otpInput) otpInput.value = '';

    const passwordInput = document.getElementById('password');
    if (passwordInput) passwordInput.value = '';

    const confPasswordInput = document.getElementById('confermaPassword');
    if (confPasswordInput) confPasswordInput.value = '';

    nascondiMessaggioBottone('messaggio_errore_otp_reset');
    nascondiMessaggioBottone('messaggio_errore_server');
}

async function inviaNuovaPassword(event) {
    event.preventDefault();

    nascondiMessaggioBottone('messaggio_errore_server');
    nascondiMessaggioBottone('messaggio_errore_otp_reset');

    const token = document.getElementById('otp_code_reset').value.trim();
    if (token.length !== 6) {
        mostraMessaggioBottone('messaggio_errore_otp_reset', "Il codice deve essere di 6 cifre.", 'errore');
        return;
    }

    if (typeof validaComplessitaPassword === 'function' && !validaComplessitaPassword()) return;
    if (typeof verificaCoincidenzaPassword === 'function' && !verificaCoincidenzaPassword()) return;

    const email = document.getElementById('email_recupero').value.trim();
    const nuovaPassword = document.getElementById('password').value;

    const btnSubmit = document.getElementById('btn_salva_password');
    btnSubmit.disabled = true;
    mostraMessaggioBottone('messaggio_errore_server', "Salvataggio in corso...", 'neutro');

    const urlVerify = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/verify";
    const urlUpdate = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const chiaveOtpReset = `${email}_${token}`;
        let sessioneRecupero = (window._sessioneOtpReset && window._sessioneOtpReset.chiave === chiaveOtpReset) ? window._sessioneOtpReset.sessione : null;

        if (!sessioneRecupero) {
            const verifyRes = await fetch(urlVerify, {
                method: "POST",
                headers: {
                    "apikey": chiaveAnon,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ type: "recovery", email: email, token: token })
            });

            if (!verifyRes.ok) {
                throw new Error("OTP_INVALID");
            }

            sessioneRecupero = await verifyRes.json();
            window._sessioneOtpReset = { chiave: chiaveOtpReset, sessione: sessioneRecupero };
        }

        const tempToken = sessioneRecupero.access_token;

        const updateRes = await fetch(urlUpdate, {
            method: "PUT",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + tempToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password: nuovaPassword })
        });

        if (!updateRes.ok) {
            const datiErrore = await updateRes.json();
            if (datiErrore.error_code === "same_password") {
                throw new Error("La nuova password digitata è uguale all'attuale, non hai bisogno di reimpostarla.");
            }
            throw new Error("UPDATE_FAILED");
        }

        const userId = sessioneRecupero.user.id;
        let ruoloAssegnato = 'partner';

        const checkPartner = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${userId}&select=id_partner`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + tempToken }
        });
        const datiPartner = await checkPartner.json();

        if (!datiPartner || datiPartner.length === 0) {
            ruoloAssegnato = 'operativo';
        }

        localStorage.setItem('driverbutler_auth_token', sessioneRecupero.access_token);
        localStorage.setItem('driverbutler_refresh_token', sessioneRecupero.refresh_token);
        localStorage.setItem('driverbutler_ruolo', ruoloAssegnato);
        localStorage.setItem('driverbutler_last_user', userId);
        
        if (typeof svuotaBozze === 'function') svuotaBozze();

        nascondiMessaggioBottone('messaggio_errore_server');
        window.location.href = 'dashboard_prt.html';

    } catch (errore) {
        nascondiMessaggioBottone('messaggio_errore_server');
        btnSubmit.disabled = false;
        
        if (errore.message === "OTP_INVALID") {
            mostraMessaggioBottone('messaggio_errore_otp_reset', "Codice errato o scaduto.", 'errore');
        } else {
            const testoErrore = errore.message === "UPDATE_FAILED" ? "Impossibile aggiornare la password. Errore server." : errore.message;
            mostraMessaggioBottone('messaggio_errore_server', testoErrore, 'errore');
        }
    }
}

if ('serviceWorker' in navigator) {
    let swPath = window.location.pathname.includes('driverbook-test') ? '/driverbook-test/partner/service-worker_prt.js' : '/partner/service-worker_prt.js';
    navigator.serviceWorker.register(swPath)
        .catch(errore => console.log('Registrazione SW fallita: ', errore));
}

let deferredPrompt;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isMacSafari = /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

function mostraBottoneInstallazione() {
    const btnDynamic = document.getElementById('btn_installa_app_sidebar');
    if (btnDynamic) btnDynamic.classList.remove('hidden');
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    mostraBottoneInstallazione();
});

document.addEventListener("DOMContentLoaded", () => {
    if (deferredPrompt) mostraBottoneInstallazione();
    
    if (isIOS || isMacSafari) {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (!isStandalone) mostraBottoneInstallazione();
    }
});

document.addEventListener('click', async (e) => {
    const btnApp = e.target.closest('#btn_installa_app_sidebar');
    if (btnApp) {
        if (isIOS || isMacSafari) {
            mostraPopupInstallazioneApple(isMacSafari);
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') e.target.classList.add('hidden');
            deferredPrompt = null;
        }
    }
});

function mostraPopupInstallazioneApple(isMac) {
    let popup = document.getElementById('ios_install_popup');

    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'ios_install_popup';
        popup.className = 'ios-popup';
        document.body.appendChild(popup);
    }

    let testoPopup = "";
    if (isMac) {
        testoPopup = "Per ricevere le notifiche push in tempo reale e utilizzare DriverButler al 100% delle sue funzioni, è necessario salvare l'app sul dispositivo.<br><br>Clicca su <strong>File</strong> nella barra in alto di Safari e seleziona <strong>Aggiungi al Dock</strong>.";
    } else {
        testoPopup = "Per ricevere le notifiche push in tempo reale e utilizzare DriverButler al 100% delle sue funzioni, è necessario salvare l'app sul dispositivo.<br><br>Tocca l'icona Condividi <svg class=\"icona-inline-ios\" width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8\"></path><polyline points=\"16 6 12 2 8 6\"></polyline><line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"15\"></line></svg> nella barra del browser e seleziona <strong>Aggiungi alla schermata Home</strong>.";
    }

    popup.innerHTML = `
        <span class="close-popup" id="btn_chiudi_apple_popup">&times;</span>
        <p>${testoPopup}</p>
    `;

    popup.classList.remove('hidden');

    document.getElementById('btn_chiudi_apple_popup').onclick = function() {
        popup.classList.add('hidden');
    };
}

async function inviaAssistenzaInterna(event) {
    event.preventDefault();
    
    const honeypot = document.getElementById('azienda_hp_interna').value;
    if (honeypot) return;

    const messaggioUtente = document.getElementById('testo_assistenza_interna').value.trim();
    const btnSubmit = document.querySelector('#form_assistenza_interna button[type="submit"]');

    btnSubmit.disabled = true;
    mostraMessaggioBottone('msg_stato_assistenza_interna', "Invio in corso...", 'neutro');

    const token = localStorage.getItem('driverbutler_auth_token');
    const urlSupabase = "https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/richieste_assistenza";
    const urlGoogleApp = "https://script.google.com/macros/s/AKfycbxS7_NOyZXPwhO9m3VDH1aD98a1emWtuDRDNi6VnnqStZtieZUE_ILt_lcvu_HU88In/exec";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!userRes.ok) throw new Error("Sessione non valida");
        const userData = await userRes.json();
        const emailUtente = userData.email;
        const userId = userData.id;

        let nomeUtente = "N/A";
        let codiceCliente = "N/A";
        let infoAziendaOp = "";

        const checkPartner = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${userId}&select=nome_cognome,codice_partner`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const datiPartner = await checkPartner.json();
        if (datiPartner && datiPartner.length > 0) {
            nomeUtente = datiPartner[0].nome_cognome || "N/A";
            codiceCliente = datiPartner[0].codice_partner || "N/A";
        } else {
            const checkDip = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/dipendenti?id_dipendente=eq.${userId}&select=nome,cognome,codice_dipendente,codice_partner,id_partner`, {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
            });
            const datiDip = await checkDip.json();
            if (datiDip && datiDip.length > 0) {
                const dip = datiDip[0];
                nomeUtente = `${dip.nome || ''} ${dip.cognome || ''}`.trim() || "N/A";
                codiceCliente = dip.codice_dipendente || "N/A";
                let nomeAzienda = "N/A";
                if (dip.id_partner) {
                    const pRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${dip.id_partner}&select=ragione_sociale,nome_cognome,codice_partner`, {
                        headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
                    });
                    const pData = await pRes.json();
                    if (pData && pData.length > 0) {
                        nomeAzienda = pData[0].ragione_sociale || pData[0].nome_cognome || "N/A";
                    }
                }
                infoAziendaOp = `\nRuolo: OPERATIVO\nAzienda Partner: ${nomeAzienda} (${dip.codice_partner || 'N/A'})`;
            }
        }

        const etichettaCodice = infoAziendaOp ? "Codice Dipendente" : "Codice Partner";
        const messaggioArricchito = `${etichettaCodice}: ${codiceCliente}\nNome: ${nomeUtente}${infoAziendaOp}\n\nRichiesta:\n${messaggioUtente}`;

        const resSupa = await fetch(urlSupabase, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: emailUtente, messaggio: messaggioArricchito })
        });

        if (!resSupa.ok) throw new Error("Errore salvataggio database");

        fetch(urlGoogleApp, {
            method: "POST",
            mode: "no-cors",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: emailUtente, messaggio: messaggioArricchito })
        });

        if (typeof svuotaBozze === 'function') svuotaBozze();
        const titolo = `<h2 class="feedback-titolo feedback-titolo-successo">Richiesta Inviata</h2>`;
        const messaggio = `<p class="feedback-testo">Abbiamo ricevuto il tuo messaggio. Il nostro team ti risponderà al più presto al tuo indirizzo email.</p>`;
        const bottone = `<a data-href="dashboard_prt.html" class="btn">Vai al Pannello Utente</a>`;
        
        mostraSchermataFeedback('successo', '.login-wrapper', titolo, messaggio, bottone);

    } catch (errore) {
        btnSubmit.disabled = false;
        mostraMessaggioBottone('msg_stato_assistenza_interna', "Errore durante l'invio. Riprova più tardi.", 'errore');
    }
}

let moduloSporco = false;

document.addEventListener("DOMContentLoaded", function() {
    document.body.addEventListener('input', function(e) {
        if (e.target.id === 'swipe_logout_range' || e.target.id === 'input_data_calendario' || e.target.hasAttribute('data-no-dirty') || e.target.closest('#formLogin') || e.target.closest('.hidden')) {
            return;
        }
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
            moduloSporco = true;
        }
    });

    document.body.addEventListener('submit', function() {
        moduloSporco = false;
    });

    document.querySelectorAll('a').forEach(link => {
        const destinazione = link.getAttribute('href');
        if (destinazione && destinazione !== '#' && !destinazione.startsWith('mailto:')) {
            link.setAttribute('data-href', destinazione);
            link.removeAttribute('href');
            link.classList.add('link-cliccabile');
        }
    });

    document.body.addEventListener('click', async function(e) {
        const link = e.target.closest('a');
        
        if (!link) return;
        
        const destinazione = link.getAttribute('data-href') || link.getAttribute('href');

        if (!destinazione || destinazione === '#' || destinazione.startsWith('mailto:')) {
            return;
        }

        e.preventDefault();

        const pathAttuale = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];

        if (typeof moduloSporco !== 'undefined' && moduloSporco && pathAttuale !== 'login_prt.html') {
            mostraModaleSalvataggio(destinazione);
            return;
        }

        if (pathAttuale === 'bacheca_prt.html' && typeof segnaBachecaComeLetta === 'function') {
            const barraLette = document.getElementById('bottom_bar_bacheca');
            if (barraLette && !barraLette.classList.contains('hidden')) {
                await segnaBachecaComeLetta(true);
            }
        }

        window.location.href = destinazione;
    }, true);
});

function mostraModaleSalvataggio(destinazione) {
    let overlay = document.getElementById('modale_uscita_dati');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modale_uscita_dati';
        overlay.className = 'modale-overlay';
        
        let modal = document.createElement('div');
        modal.className = 'modale-box';
        
        modal.innerHTML = `
            <h3 class="modale-titolo">Attenzione</h3>
            <p class="modale-testo">Hai delle modifiche non salvate. Sei sicuro di voler abbandonare la pagina?</p>
            <div class="modale-bottoni-container">
                <button id="btn_annulla_uscita" class="btn-modale-bianco">NO</button>
                <button id="btn_conferma_uscita" class="btn-modale-bianco">SI</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('btn_annulla_uscita').addEventListener('click', function() {
            overlay.classList.add('hidden');
        });
    }
    
    overlay.classList.remove('hidden');
    
    document.getElementById('btn_conferma_uscita').onclick = function() {
        if (typeof svuotaBozze === 'function') svuotaBozze();
        moduloSporco = false;
        window.location.href = destinazione;
    };
}

async function rinnovaSessioneSilenziosa() {
    const refreshToken = localStorage.getItem('driverbutler_refresh_token');
    if (!refreshToken) return;

    const urlRinnovo = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/token?grant_type=refresh_token";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const risposta = await fetch(urlRinnovo, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ refresh_token: refreshToken })
        });

        if (risposta.ok) {
            const nuoviDati = await risposta.json();
            localStorage.setItem('driverbutler_auth_token', nuoviDati.access_token);
            localStorage.setItem('driverbutler_refresh_token', nuoviDati.refresh_token);
            console.log("Sessione rinnovata con successo dietro le quinte.");
        } else {
            console.warn("Impossibile rinnovare la sessione. Disconnessione imminente.");
            esciAccount(true);
        }
    } catch (errore) {
        console.error("Errore di rete durante il rinnovo:", errore);
    }
}

function mostraUiAssistenzaOk(containerId) {
    const titolo = `<h2 class="feedback-titolo feedback-titolo-successo">Richiesta Inviata</h2>`;
    const messaggio = `<p class="feedback-testo">Abbiamo ricevuto il tuo messaggio. Il nostro team ti risponderà al più presto all'indirizzo email che ci hai fornito.</p>`;
    const bottone = `<a data-href="index.html" class="btn">Torna alla Home</a>`;
    mostraSchermataFeedback('successo', containerId, titolo, messaggio, bottone);
}

function mostraSchermataFeedback(tipo, containerId, htmlTitolo, htmlMessaggio, htmlBottone = '') {
    const menuPrincipale = document.getElementById('menu-principale');
    if (menuPrincipale) {
        menuPrincipale.classList.add('hidden');
    }

    let classeColore = tipo === 'errore' ? 'feedback-icona-errore' : 'feedback-icona-successo';
    let icona = tipo === 'errore' 
        ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
        : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';

    let layoutHtml = `
        <div class="login-wrapper">
            <div class="schermata-feedback">
                <svg class="feedback-icona ${classeColore}" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icona}</svg>
                ${htmlTitolo}
                ${htmlMessaggio}
                ${htmlBottone}
            </div>
        </div>
    `;

    if (containerId === 'body') {
        document.body.innerHTML = layoutHtml;
    } else {
        const wrapper = document.querySelector(containerId);
        if (wrapper) {
            wrapper.innerHTML = layoutHtml;
            wrapper.classList.remove('hidden');
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const btnApri = document.getElementById('bottom_bar_flotta');
    if (!btnApri) return;

    const btnAnnulla = document.getElementById('btn_annulla_veicolo');
    const formContainer = document.getElementById('form_container_veicolo');
    const elencoVeicoli = document.getElementById('sezione_elenco_veicoli');
    const selectModello = document.getElementById('veicolo_modello');
    const gruppoPostiV = document.getElementById('gruppo_posti_v');
    const selectPosti = document.getElementById('veicolo_posti');
    const titoloForm = document.getElementById('titolo_form_veicolo');
    const formGestione = document.getElementById('formGestioneVeicolo');

    caricaFlotta();

    function apriForm() {
        formContainer.classList.remove('hidden');
        btnApri.classList.add('hidden');
        elencoVeicoli.classList.add('hidden');
        document.querySelector('.login-wrapper').classList.add('padding-bottom-extra');
        window.scrollTo(0, 0);
    }

    function chiudiForm() {
        formContainer.classList.add('hidden');
        btnApri.classList.remove('hidden');
        elencoVeicoli.classList.remove('hidden');
        document.querySelector('.login-wrapper').classList.remove('padding-bottom-extra');
        window.scrollTo(0, 0);
        formGestione.reset();
        if (typeof moduloSporco !== 'undefined') moduloSporco = false;
    }

    btnApri.addEventListener('click', () => {
        formGestione.reset();
        titoloForm.textContent = 'Nuovo Veicolo';
        gruppoPostiV.classList.add('hidden');
        selectPosti.required = false;
        apriForm();
    });

    btnAnnulla.addEventListener('click', () => {
        chiudiForm();
    });

    selectModello.addEventListener('change', function() {
        if (this.value === 'CLASSE V') {
            gruppoPostiV.classList.remove('hidden');
            selectPosti.required = true;
        } else {
            gruppoPostiV.classList.add('hidden');
            selectPosti.value = "";
            selectPosti.required = false;
        }
    });

    formGestione.addEventListener('submit', async function(e) {
        e.preventDefault();
        const btnSalva = document.getElementById('btn_salva_veicolo');
        btnSalva.disabled = true;
        mostraMessaggioBottone('msg_stato_veicolo', "Salvataggio in corso...", 'neutro');

        const token = localStorage.getItem('driverbutler_auth_token');
        const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
        
        try {
            let targaPulita = document.getElementById('veicolo_targa').value.toUpperCase().replace(/\s+/g, '');
            const regexTarga = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;
            
            if (!regexTarga.test(targaPulita)) {
                throw new Error("FORMATO_TARGA_ERRATO");
            }
            
            const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
            });
            const userData = await userRes.json();
            const contesto = await recuperaContestoUtentePartner(token, userData.id);
            const idPartnerTarget = contesto ? contesto.idPartnerAzienda : userData.id;
            
            let targaValue = targaPulita.substring(0, 2) + ' ' + targaPulita.substring(2, 5) + ' ' + targaPulita.substring(5, 7);

            const corpoDati = {
                id_partner: idPartnerTarget,
                modello: selectModello.value,
                posti: selectModello.value === 'CLASSE V' ? parseInt(selectPosti.value) : null,
                targa: targaValue,
                autocert_destinazione: document.getElementById('autocert_destinazione').checked,
                autocert_assicurazione: document.getElementById('autocert_assicurazione').checked,
                autocert_autorizzazione: document.getElementById('autocert_autorizzazione').checked
            };

            const res = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/veicoli_flotta", {
                method: "POST",
                headers: {
                    "apikey": chiaveAnon,
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(corpoDati)
            });

            if (!res.ok) {
                const err = await res.json();
                if (JSON.stringify(err).includes("unique") || JSON.stringify(err).includes("targa")) {
                    throw new Error("TARGA_ESISTENTE");
                }
                throw new Error("ERRORE_SALVATAGGIO");
            }

            nascondiMessaggioBottone('msg_stato_veicolo');
            chiudiForm();
            caricaFlotta();
            
        } catch (errore) {
            nascondiMessaggioBottone('msg_stato_veicolo');
            let testoErrore = "Si è verificato un errore durante il salvataggio.";
            if (errore.message === "TARGA_ESISTENTE") {
                testoErrore = "Questa targa è già presente nel sistema.";
            } else if (errore.message === "FORMATO_TARGA_ERRATO") {
                testoErrore = "Formato targa non valido.<br><span class='testo-nota-grigia'>Inserisci 2 lettere, 3 numeri e 2 lettere (es. AB 123 CD).</span>";
            }
            
            let overlay = document.getElementById('modale_errore_veicolo');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.id = 'modale_errore_veicolo';
                overlay.className = 'modale-overlay';
                overlay.innerHTML = `
                    <div class="modale-box">
                        <h3 class="modale-titolo">Attenzione</h3>
                        <p class="modale-testo" id="testo_errore_veicolo"></p>
                    </div>
                `;
                document.body.appendChild(overlay);
            }
            document.getElementById('testo_errore_veicolo').innerHTML = testoErrore;
            overlay.classList.remove('hidden');
            
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 5000);

            btnSalva.disabled = false;
            return;
        }
        
        btnSalva.disabled = false;
    });

    if (sessionStorage.getItem('prt_apri_nuovo_veicolo') === 'true') {
        sessionStorage.removeItem('prt_apri_nuovo_veicolo');
        btnApri.click();
    }
});

async function caricaFlotta() {
    const contenitore = document.getElementById('sezione_elenco_veicoli');
    if (!contenitore) return;
    
    contenitore.innerHTML = '<div class="msg-lista-info">Caricamento flotta in corso...</div>';
    
    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const userData = await userRes.json();
        const contesto = await recuperaContestoUtentePartner(token, userData.id);
        const idPartnerTarget = contesto ? contesto.idPartnerAzienda : userData.id;

        const res = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/veicoli_flotta?id_partner=eq.${idPartnerTarget}`, {
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token
            }
        });
        
        if (!res.ok) throw new Error("Errore lettura flotta");
        
        const veicoli = await res.json();
        contenitore.innerHTML = '';
        
        if (veicoli.length === 0) {
            contenitore.innerHTML = '<div class="msg-lista-info">Nessun veicolo presente nella flotta.</div>';
            return;
        }
        
        veicoli.sort((a, b) => {
            const ordineModello = { 'CLASSE V': 1, 'CLASSE E': 2, 'CLASSE S': 3 };
            if (ordineModello[a.modello] !== ordineModello[b.modello]) {
                return ordineModello[a.modello] - ordineModello[b.modello];
            }
            if (a.modello === 'CLASSE V' && a.posti !== b.posti) {
                return b.posti - a.posti;
            }
            return a.targa.localeCompare(b.targa);
        });

        veicoli.forEach(v => {
            generaCardVeicolo(v.modello, v.posti, v.targa);
        });
        
    } catch (errore) {
        contenitore.innerHTML = '<div class="msg-lista-errore">Impossibile caricare la flotta. Riprova più tardi.</div>';
    }
}

async function eliminaVeicoloFlotta(targa, card, btnConferma) {
    btnConferma.disabled = true;
    btnConferma.textContent = "...";

    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const res = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/veicoli_flotta?targa=eq.${encodeURIComponent(targa)}`, {
            method: "DELETE",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token
            }
        });

        if (res.ok) {
            card.remove();
            const contenitore = document.getElementById('sezione_elenco_veicoli');
            if (contenitore && contenitore.children.length === 0) {
                contenitore.innerHTML = '<div class="msg-lista-info">Nessun veicolo presente nella flotta.</div>';
            }
            return;
        }
    } catch (err) {
        console.error(err);
    }

    btnConferma.disabled = false;
    btnConferma.textContent = "SI";
}

function generaCardVeicolo(modello, posti, targa) {
    const contenitore = document.getElementById('sezione_elenco_veicoli');
    const template = document.getElementById('template_card_veicolo');
    if (!contenitore || !template) return;

    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.card-bacheca-minimal');
    
    card.setAttribute('data-targa', targa);
    clone.querySelector('[data-bind="modello"]').textContent = modello;
    clone.querySelector('[data-bind="targa"]').textContent = targa;

    const spanPosti = clone.querySelector('[data-bind="posti"]');
    if (modello === 'CLASSE V' && posti) {
        spanPosti.textContent = `${posti} PASSEGGERI`;
        spanPosti.classList.remove('hidden');
    }

    clone.querySelector('[data-bind-action="toggle"]').onclick = function() {
        card.classList.toggle('aperta');
    };

    const btnConferma = clone.querySelector('[data-bind-action="conferma_elimina"]');
    btnConferma.onclick = function() {
        eliminaVeicoloFlotta(targa, card, btnConferma);
    };

    contenitore.appendChild(clone);
}

window.applicaBozze = function() {
    const blacklistPagineAutosave = ['login_prt.html', 'pwreset_prt.html', 'index.html', 'dipendenti_prt.html', 'flotta_prt.html'];
    const paginaAutosave = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    const prefix = 'prt_';

    if (blacklistPagineAutosave.includes(paginaAutosave)) {
        Object.keys(localStorage).forEach(k => {
            if (k.startsWith(`${prefix}db_draft_${paginaAutosave}_`)) {
                localStorage.removeItem(k);
            }
        });
        return;
    }

    localStorage.removeItem(prefix + 'db_draft_' + paginaAutosave + '_swipe_logout_range');
    document.querySelectorAll('input:not([type="password"]):not([type="hidden"]):not([type="file"]):not(#swipe_logout_range):not(#input_data_calendario), textarea, select').forEach(campo => {
        if (campo.id) {
            const valoreSalvato = localStorage.getItem(`${prefix}db_draft_${paginaAutosave}_${campo.id}`);
            if (valoreSalvato !== null) {
                if (campo.type === 'checkbox' || campo.type === 'radio') {
                    campo.checked = (valoreSalvato === 'true');
                } else {
                    campo.value = valoreSalvato;
                }
                if (typeof moduloSporco !== 'undefined') {
                    moduloSporco = true;
                }
                
                if (campo.tagName === 'SELECT') {
                    campo.dispatchEvent(new Event('change'));
                }
            }
        }
    });
};

document.addEventListener("DOMContentLoaded", function() {
    const blacklistPagineAutosave = ['login_prt.html', 'pwreset_prt.html', 'index.html', 'dipendenti_prt.html', 'flotta_prt.html'];
    const paginaAutosave = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    const prefix = 'prt_';

    if (!blacklistPagineAutosave.includes(paginaAutosave)) {
        if (typeof applicaBozze === 'function') applicaBozze();

        document.body.addEventListener('input', function(e) {
            const campo = e.target;
            if (campo.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(campo.tagName) && campo.id) {
                if (campo.type !== 'password' && campo.type !== 'hidden' && campo.type !== 'file' && campo.id !== 'swipe_logout_range' && campo.id !== 'input_data_calendario') {
                    const valore = (campo.type === 'checkbox' || campo.type === 'radio') ? campo.checked : campo.value;
                    localStorage.setItem(`${prefix}db_draft_${paginaAutosave}_${campo.id}`, valore);
                }
            }
        });
    } else if (typeof applicaBozze === 'function') {
        applicaBozze();
    }
});

window.svuotaBozze = function() {
    const paginaAutosave = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    const prefix = 'prt_';

    document.querySelectorAll('input, textarea, select').forEach(campo => {
        if (campo.id) {
            localStorage.removeItem(`${prefix}db_draft_${paginaAutosave}_${campo.id}`);
        }
    });
    if (typeof moduloSporco !== 'undefined') {
        moduloSporco = false;
    }
};

async function caricaBachecaRichieste() {
    const contenitore = document.getElementById('contenitore_bacheca');
    if (!contenitore) return;

    const listaCard = document.getElementById('lista_card_bacheca');
    const msgLoading = document.getElementById('msg_bacheca_loading');
    const msgNoZona = document.getElementById('msg_bacheca_no_zona');
    const msgNoVeicoli = document.getElementById('msg_bacheca_no_veicoli');
    const msgVuota = document.getElementById('msg_bacheca_vuota');
    const msgErroreRete = document.getElementById('msg_bacheca_errore_rete');

    let codiciAperti = [];
    if (listaCard) {
        const cardAperte = listaCard.querySelectorAll('.card-bacheca-minimal.aperta');
        cardAperte.forEach(card => {
            const spanCodice = card.querySelector('[data-bind="codice_prenotazione_dettaglio"]');
            if (spanCodice) {
                codiciAperti.push(spanCodice.textContent);
            }
        });
    }

    msgLoading.classList.remove('hidden');
    msgNoZona.classList.add('hidden');
    msgNoVeicoli.classList.add('hidden');
    msgVuota.classList.add('hidden');
    msgErroreRete.classList.add('hidden');
    
    const modaleFlotta = document.getElementById('modale_flotta_vuota');
    if (modaleFlotta) {
        modaleFlotta.classList.add('hidden');
    }
    listaCard.innerHTML = '';

    await rinnovaSessioneSilenziosa();
    
    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!userRes.ok) throw new Error("Utente non loggato");
        const userData = await userRes.json();
        const contesto = await recuperaContestoUtentePartner(token, userData.id);
        if (!contesto) throw new Error("Utente non autorizzato");
        const idPartnerTarget = contesto.idPartnerAzienda;

        const partnerRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${idPartnerTarget}&select=zona_operativa_lat,zona_operativa_lng,ultimo_accesso_bacheca`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!partnerRes.ok) throw new Error("Errore recupero zona partner");
        const partnerData = await partnerRes.json();
        
        if (!partnerData || partnerData.length === 0 || !partnerData[0].zona_operativa_lat || !partnerData[0].zona_operativa_lng) {
            msgLoading.classList.add('hidden');
            msgNoZona.classList.remove('hidden');
            return;
        }

        const ultimoAccesso = new Date(partnerData[0].ultimo_accesso_bacheca || 0);

        const prenotazioniRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/rpc/get_corse_disponibili", {
            method: "POST",
            headers: { 
                "apikey": chiaveAnon, 
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ p_id_partner: idPartnerTarget })
        });
        
        const flottaRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/veicoli_flotta?id_partner=eq.${idPartnerTarget}&select=targa`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        
        if (!flottaRes.ok) throw new Error("Errore recupero flotta");
        const flottaData = await flottaRes.json();
        
        if (!flottaData || flottaData.length === 0) {
            msgLoading.classList.add('hidden');
            if (modaleFlotta) {
                modaleFlotta.classList.remove('hidden');
                
                document.getElementById('btn_chiudi_modale_flotta').onclick = function() {
                    modaleFlotta.classList.add('hidden');
                    msgNoVeicoli.classList.remove('hidden');
                };
                
                const btnVaiFlotta = document.getElementById('btn_vai_flotta_nuovo');
                if (btnVaiFlotta) {
                    btnVaiFlotta.onclick = function() {
                        sessionStorage.setItem('prt_apri_nuovo_veicolo', 'true');
                        window.location.href = 'flotta_prt.html';
                    };
                }
            } else {
                msgNoVeicoli.classList.remove('hidden');
            }
            return;
        }

        if (!prenotazioniRes.ok) throw new Error("Errore recupero prenotazioni");
        const richiesteFiltrate = await prenotazioniRes.json();

        msgLoading.classList.add('hidden');

        if (richiesteFiltrate.length === 0) {
            msgVuota.classList.remove('hidden');
            aggiornaBadgeMenu(0);
            if (typeof segnaBachecaComeLetta === 'function') {
                segnaBachecaComeLetta(true);
            }
            return;
        }

        const template = document.getElementById('template_bacheca_card');
        if (!template) {
            console.error("Template bacheca non trovato.");
            return;
        }

        let richiesteNuove = [];
        let richiesteVecchie = [];

        richiesteFiltrate.forEach(p => {
            if (p.created_at && new Date(p.created_at) > ultimoAccesso) {
                richiesteNuove.push(p);
            } else {
                richiesteVecchie.push(p);
            }
        });

        aggiornaBadgeMenu(richiesteNuove.length);

        const barraLette = document.getElementById('bottom_bar_bacheca');
        const btnLette = document.getElementById('btn_segna_lette');
        if (barraLette && btnLette) {
            if (richiesteNuove.length > 0) {
                barraLette.classList.remove('hidden');
                document.body.classList.add('bacheca-barra-attiva');
                btnLette.onclick = () => segnaBachecaComeLetta(false);
            } else {
                barraLette.classList.add('hidden');
                document.body.classList.remove('bacheca-barra-attiva');
            }
        }

        const renderizzaCard = (viaggio, isNuova) => {
            let dataCompatta = viaggio.data_partenza;
            let dataEstesa = viaggio.data_partenza;
            
            if (viaggio.data_partenza) {
                const parti = viaggio.data_partenza.split('-');
                if (parti.length === 3) {
                    dataEstesa = `${parti[2]}/${parti[1]}/${parti[0]}`;
                    dataCompatta = `${parti[2]}/${parti[1]}/${parti[0].substring(2)}`;
                }
            }

            let tipoServizioLeggibile = viaggio.tipo_servizio === 'TRANSFER' ? 'TRANSFER' : 'DISPOSIZIONE';
            let vetturaPulita = (viaggio.vettura_selezionata || '');
            
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.card-bacheca-minimal');
            
            if (isNuova) {
                card.classList.add('card-nuova-evidenza');
            }

            if (codiciAperti.includes(viaggio.codice_prenotazione)) {
                card.classList.add('aperta');
            }
            
            clone.querySelector('[data-bind-action="toggle"]').onclick = function() {
                card.classList.toggle('aperta');
            };

            clone.querySelector('[data-bind="prezzo"]').textContent = `${viaggio.prezzo_totale.toFixed(2).replace('.', ',')} €`;
            clone.querySelector('[data-bind="data_ora"]').textContent = `${dataCompatta} - ${viaggio.ora_partenza}`;
            clone.querySelector('[data-bind="tipo_vettura"]').textContent = `${tipoServizioLeggibile} - ${vetturaPulita}`;

            let stringaPartenza = (viaggio.partenza_citta && viaggio.partenza_via) ? `${viaggio.partenza_citta}, ${viaggio.partenza_via}` : viaggio.partenza;
            clone.querySelector('[data-bind="partenza_sintesi"]').textContent = stringaPartenza;
            
            if (viaggio.tipo_servizio === 'TRANSFER') {
                let stringaArrivo = (viaggio.arrivo_citta && viaggio.arrivo_via) ? `${viaggio.arrivo_citta}, ${viaggio.arrivo_via}` : (viaggio.arrivo || '-');
                clone.querySelector('[data-bind="arrivo_sintesi"]').textContent = stringaArrivo;
                clone.querySelector('[data-bind-container="arrivo_sintesi_riga"]').classList.remove('hidden');
            }

            clone.querySelector('[data-bind="nome_passeggero"]').textContent = viaggio.nome_passeggero || '-';
            
            let telPaxFormattato = viaggio.tel_passeggero || '-';
            if (viaggio.tel_passeggero && window.intlTelInputUtils) {
                telPaxFormattato = window.intlTelInputUtils.formatNumber(viaggio.tel_passeggero, null, window.intlTelInputUtils.numberFormat.INTERNATIONAL);
            }
            clone.querySelector('[data-bind="tel_passeggero"]').textContent = telPaxFormattato;

            if (viaggio.chk_referente && (viaggio.nome_referente || viaggio.tel_referente)) {
                clone.querySelector('[data-bind-container="referente_block"]').classList.remove('hidden');
                clone.querySelector('[data-bind="nome_referente"]').textContent = viaggio.nome_referente || '-';
                
                let telRefFormattato = viaggio.tel_referente || '-';
                if (viaggio.tel_referente && window.intlTelInputUtils) {
                    telRefFormattato = window.intlTelInputUtils.formatNumber(viaggio.tel_referente, null, window.intlTelInputUtils.numberFormat.INTERNATIONAL);
                }
                clone.querySelector('[data-bind="tel_referente"]').textContent = telRefFormattato;
            }

            clone.querySelector('[data-bind="tipo_servizio_full"]').textContent = tipoServizioLeggibile;
            if (viaggio.tipo_servizio === 'DISPOSIZIONE') {
                clone.querySelector('[data-bind-container="durata_block"]').classList.remove('hidden');
                clone.querySelector('[data-bind="durata"]').textContent = viaggio.ore ? `${viaggio.ore} Ore` : '-';
            }
            clone.querySelector('[data-bind="vettura_full"]').textContent = vetturaPulita;
            clone.querySelector('[data-bind="data_ora_dettaglio"]').textContent = `${dataEstesa} alle ore ${viaggio.ora_partenza}`;

            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const apriNavigatore = (indirizzo) => {
                if (isMobile) {
                    window.location.href = `geo:0,0?q=${encodeURIComponent(indirizzo)}`;
                } else {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(indirizzo)}`, '_blank');
                }
            };

            const spanPartenza = clone.querySelector('[data-bind="partenza_full"]');
            if (viaggio.partenza) {
                spanPartenza.textContent = viaggio.partenza;
                spanPartenza.classList.add('link-navigatore');
                spanPartenza.onclick = function(e) {
                    e.stopPropagation();
                    apriNavigatore(viaggio.partenza);
                };
            } else {
                spanPartenza.textContent = '-';
            }

            if (viaggio.tipo_servizio === 'TRANSFER') {
                clone.querySelector('[data-bind-container="arrivo_full_block"]').classList.remove('hidden');
                const spanArrivo = clone.querySelector('[data-bind="arrivo_full"]');
                if (viaggio.arrivo) {
                    spanArrivo.textContent = viaggio.arrivo;
                    spanArrivo.classList.add('link-navigatore');
                    spanArrivo.onclick = function(e) {
                        e.stopPropagation();
                        apriNavigatore(viaggio.arrivo);
                    };
                } else {
                    spanArrivo.textContent = '-';
                }
            } else {
                clone.querySelector('[data-bind-container="itinerario_previsto_block"]').classList.remove('hidden');
                clone.querySelector('[data-bind="itinerario_previsto"]').textContent = viaggio.itinerario_previsto || '-';
            }

            const numPax = viaggio.passeggeri || 1;
            clone.querySelector('[data-bind="pax"]').textContent = numPax + (numPax === 1 ? ' Passeggero' : ' Passeggeri');
            
            const numGrandi = viaggio.bagagli_grandi || 0;
            clone.querySelector('[data-bind="grandi"]').textContent = numGrandi + (numGrandi === 1 ? ' Valigia Grande' : ' Valigie Grandi');
            
            clone.querySelector('[data-bind="mano"]').textContent = viaggio.bagagli_mano || 0;
            clone.querySelector('[data-bind="note_servizio"]').textContent = viaggio.note_servizio || 'Nessuna nota';

            clone.querySelector('[data-bind="codice_prenotazione_dettaglio"]').textContent = viaggio.codice_prenotazione;
            clone.querySelector('[data-bind="prezzo_dettaglio"]').textContent = `${viaggio.prezzo_totale.toFixed(2).replace('.', ',')} €`;

            const msgStatoCorsa = clone.querySelector('[data-bind="msg_stato_corsa"]');
            if (msgStatoCorsa) {
                msgStatoCorsa.id = `msg_corsa_${viaggio.codice_prenotazione}`;
            }

            const btnAccetta = clone.querySelector('[data-bind-action="accetta"]');
            btnAccetta.onclick = function(e) { accettaCorsa(viaggio.codice_prenotazione, e.currentTarget); };

            listaCard.appendChild(clone);
        };

        if (richiesteNuove.length > 0) {
            richiesteNuove.forEach(v => renderizzaCard(v, true));
            if (richiesteVecchie.length > 0) {
                const separatore = document.createElement('div');
                separatore.className = 'separatore-bacheca';
                separatore.innerHTML = '<span>Richieste già viste</span>';
                listaCard.appendChild(separatore);
            }
        }
        
        richiesteVecchie.forEach(v => renderizzaCard(v, false));

    } catch (errore) {
        console.error(errore);
        msgLoading.classList.add('hidden');
        msgErroreRete.classList.remove('hidden');
    }
}

async function segnaBachecaComeLetta(skipReload = false) {
    const token = localStorage.getItem('driverbutler_auth_token');
    if (!token) return;
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    const barraLette = document.getElementById('bottom_bar_bacheca');
    if (barraLette) {
        barraLette.classList.add('hidden');
        document.body.classList.remove('bacheca-barra-attiva');
    }

    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const userData = await userRes.json();
        const contesto = await recuperaContestoUtentePartner(token, userData.id);
        const idPartnerTarget = contesto ? contesto.idPartnerAzienda : userData.id;

        await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${idPartnerTarget}`, {
            method: "PATCH",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            body: JSON.stringify({ ultimo_accesso_bacheca: new Date().toISOString() })
        });

        if (!skipReload) {
            caricaBachecaRichieste();
        }
    } catch (e) {
        console.error("Errore salvataggio data accesso:", e);
    }
}

function aggiornaBadgeMenu(numero) {
    const linkBacheca = document.getElementById('link_menu_bacheca');
    if (linkBacheca) {
        const testoBase = 'Bacheca Richieste';
        if (numero > 0) {
            linkBacheca.innerHTML = `<span>${testoBase}</span> <span class="badge-menu-nuove">NUOVE</span>`;
        } else {
            linkBacheca.innerHTML = `<span>${testoBase}</span>`;
        }
        linkBacheca.classList.remove('hidden');
    }
}

function mostraModaleEsito(titolo, messaggio) {
    let overlay = document.getElementById('modale_esito_corsa');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modale_esito_corsa';
        overlay.className = 'modale-overlay';
        document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
        <div class="modale-box">
            <h3 class="modale-titolo">${titolo}</h3>
            <p class="modale-testo">${messaggio}</p>
            <div class="modale-bottoni-container btn-singolo-container">
                <button id="btn_ok_esito" class="btn-modale-bianco">OK</button>
            </div>
        </div>
    `;
    
    overlay.classList.remove('hidden');
    
    document.getElementById('btn_ok_esito').onclick = function() {
        overlay.classList.add('hidden');
    };
}

async function recuperaConducentiAbilitatiAzienda(token, idPartnerAzienda) {
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    const [partnerRes, dipRes] = await Promise.all([
        fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${idPartnerAzienda}&select=id_partner,codice_partner,nome_cognome,abilitato_guida`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        }),
        fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/dipendenti?id_partner=eq.${idPartnerAzienda}&stato_attivo=eq.true&email_verificata=eq.true&select=id_dipendente,codice_dipendente,nome,cognome,ruolo,abilitato_guida`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        })
    ]);

    const partnerData = partnerRes.ok ? await partnerRes.json() : [];
    const dipData = dipRes.ok ? await dipRes.json() : [];
    const partner = partnerData.length > 0 ? partnerData[0] : null;

    const dipendentiAbilitati = dipData
        .filter(d => d.ruolo === 'AUTISTA' || (d.ruolo === 'OPERATIVO' && d.abilitato_guida === true))
        .sort((a, b) => {
            const cmpCognome = (a.cognome || '').localeCompare(b.cognome || '', 'it', { sensitivity: 'base' });
            if (cmpCognome !== 0) return cmpCognome;
            return (a.nome || '').localeCompare(b.nome || '', 'it', { sensitivity: 'base' });
        });

    const conducenti = dipendentiAbilitati.map(d => ({
        tipo: 'dipendente',
        codice: d.codice_dipendente,
        id_dipendente: d.id_dipendente,
        label: `${d.cognome || ''} ${d.nome || ''}`.trim()
    }));

    if (partner && partner.abilitato_guida !== false) {
        conducenti.push({
            tipo: 'partner',
            codice: partner.codice_partner,
            id_dipendente: null,
            label: partner.nome_cognome || partner.codice_partner
        });
    }

    return conducenti;
}

async function accettaCorsa(codice, bottone) {
    const idMsgCorsa = `msg_corsa_${codice}`;
    if (bottone) {
        bottone.disabled = true;
    }
    mostraMessaggioBottone(idMsgCorsa, "Verifica in corso...", 'neutro');

    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!userRes.ok) throw new Error("Errore sessione utente");
        const userData = await userRes.json();

        const contesto = await recuperaContestoUtentePartner(token, userData.id);
        if (!contesto) throw new Error("Errore recupero codice partner");
        const codicePartner = contesto.codicePartnerAzienda;
        const idPartnerTarget = contesto.idPartnerAzienda;

        const conducentiAbilitati = await recuperaConducentiAbilitatiAzienda(token, idPartnerTarget);
        const payloadAccettazione = conducentiAbilitati.length === 1
            ? {
                stato: "ASSEGNATO",
                codice_partner_assegnato: codicePartner,
                id_partner: idPartnerTarget,
                codice_autista_assegnato: conducentiAbilitati[0].codice,
                id_dipendente: conducentiAbilitati[0].id_dipendente
            }
            : {
                stato: "CONFERMATO",
                codice_partner_assegnato: codicePartner,
                id_partner: idPartnerTarget,
                codice_autista_assegnato: null,
                id_dipendente: null
            };

        const updateRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/prenotazioni?codice_prenotazione=eq.${encodeURIComponent(codice)}&stato=eq.IN_ATTESA`, {
            method: "PATCH",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            body: JSON.stringify(payloadAccettazione)
        });

        if (!updateRes.ok) throw new Error("Errore aggiornamento database");
        
        const datiAggiornati = await updateRes.json();
        
        nascondiMessaggioBottone(idMsgCorsa);

        if (datiAggiornati.length === 0) {
            mostraModaleEsito("Spiacenti", "Il servizio non è più disponibile.");
            if (bottone) {
                bottone.disabled = false;
            }
            caricaBachecaRichieste();
            return;
        }

        mostraModaleEsito("Servizio acquisito", "Ti è stato assegnato con successo, lo trovi nel calendario servizi.");
        
        if (document.getElementById('contenitore_bacheca')) {
            caricaBachecaRichieste();
        }

    } catch (errore) {
        console.error(errore);
        nascondiMessaggioBottone(idMsgCorsa);
        mostraModaleEsito("Errore", "Si è verificato un errore di connessione. Riprova.");
        if (bottone) {
            bottone.disabled = false;
        }
    }
}

function gestisciModaleNotifiche() {
    const btnMenu = document.getElementById('btn_attiva_notifiche_sidebar');
    const btnTest = document.getElementById('btn_test_notifiche_sidebar');

    const chiudiMenuLaterale = () => {
        const sidePanel = document.getElementById('side_panel');
        const overlay = document.getElementById('menu_overlay');
        if (sidePanel) {
            sidePanel.classList.remove('open');
            sidePanel.classList.add('no-click', 'invisibile');
        }
        if (overlay) {
            overlay.classList.remove('open');
            overlay.classList.add('no-click');
        }
        document.body.classList.remove('no-scroll');
    };

    if (btnTest && localStorage.getItem('driverbutler_auth_token')) {
        btnTest.addEventListener('click', (e) => {
            e.preventDefault();
            chiudiMenuLaterale();

            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            if (!("Notification" in window) || ((isIOS || isMacSafari) && !isStandalone)) {
                mostraPopupInstallazioneApple(isMacSafari);
                return;
            }

            if (Notification.permission === "granted") {
                if (typeof attivaAbbonamentoPush === 'function') attivaAbbonamentoPush();
                inviaNotificaDiProva();
                mostraModaleConfermaNotifiche();
            } else if (Notification.permission === "default") {
                mostraModaleSoftPrompt(btnMenu);
            } else if (Notification.permission === "denied") {
                mostraModaleTecnica();
            }
        });
    }

    if (!("Notification" in window)) return;
    if (!btnMenu) return;

    if (Notification.permission === "granted") {
        btnMenu.classList.add('hidden');
        attivaAbbonamentoPush();
        return;
    }

    if (localStorage.getItem('driverbutler_auth_token')) {
        btnMenu.classList.remove('hidden');
        
        btnMenu.addEventListener('click', (e) => {
            e.preventDefault();
            chiudiMenuLaterale();

            if (Notification.permission === "default") {
                mostraModaleSoftPrompt(btnMenu);
            } else if (Notification.permission === "denied") {
                mostraModaleTecnica();
            }
        });
    }
}

function mostraModaleSoftPrompt(btnMenu) {
    let overlay = document.getElementById('modale_soft_prompt_notifiche');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modale_soft_prompt_notifiche';
        overlay.className = 'modale-overlay';
        
        let modal = document.createElement('div');
        modal.className = 'modale-box';
        
        modal.innerHTML = `
            <h3 class="modale-titolo">Rimani Aggiornato</h3>
            <p class="modale-testo">Ricevi aggiornamenti in tempo reale sui servizi. Clicca su 'Consenti' alla prossima schermata.</p>
            <div class="modale-bottoni-container">
                <button id="btn_notifiche_no" class="btn-modale-bianco">NON ORA</button>
                <button id="btn_notifiche_si" class="btn-modale-bianco">ATTIVA</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('btn_notifiche_no').addEventListener('click', function() {
            overlay.classList.add('hidden');
        });
        
        document.getElementById('btn_notifiche_si').addEventListener('click', function() {
            overlay.classList.add('hidden');
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    if (btnMenu) btnMenu.classList.add('hidden');
                    if (typeof attivaAbbonamentoPush === 'function') attivaAbbonamentoPush();
                    inviaNotificaDiProva();
                    mostraModaleConfermaNotifiche();
                }
            });
        });
    }
    
    overlay.classList.remove('hidden');
}

function inviaNotificaDiProva() {
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(function(registration) {
                    registration.showNotification("Notifiche attive", {
                        body: "Perfetto! Riceverai qui gli aggiornamenti in tempo reale da DriverButler.",
                        icon: "../logo/icona-pwa-prt.png",
                        badge: "../logo/badge-bianco.png",
                        vibrate: [200, 100, 200]
                    });
                });
            } else {
                new Notification("Notifiche attive", {
                    body: "Perfetto! Riceverai qui gli aggiornamenti in tempo reale da DriverButler.",
                    icon: "../logo/icona-pwa-prt.png",
                    badge: "../logo/badge-bianco.png"
                });
            }
        } catch(e) {
            console.error(e);
        }
    }
}

function mostraModaleConfermaNotifiche() {
    let overlay = document.getElementById('modale_conferma_notifiche');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modale_conferma_notifiche';
        overlay.className = 'modale-overlay';
        
        let modal = document.createElement('div');
        modal.className = 'modale-box';
        
        modal.innerHTML = `
            <h3 class="modale-titolo">Notifiche Attivate</h3>
            <p class="modale-testo">Ti abbiamo appena inviato una notifica di prova. Se non l'hai vista comparire, controlla nelle impostazioni del dispositivo che le notifiche siano abilitate sia per DriverButler sia per i browser, e che non sia attiva la modalità Non disturbare.</p>
            <div class="modale-bottoni-container btn-singolo-container">
                <button id="btn_conferma_notifiche_ok" class="btn-modale-bianco">HO CAPITO</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('btn_conferma_notifiche_ok').addEventListener('click', function() {
            overlay.classList.add('hidden');
        });
    }
    
    overlay.classList.remove('hidden');
}

function mostraModaleTecnica() {
    let overlay = document.getElementById('modale_tecnica_notifiche');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modale_tecnica_notifiche';
        overlay.className = 'modale-overlay';
        
        let modal = document.createElement('div');
        modal.className = 'modale-box';
        
        modal.innerHTML = `
            <h3 class="modale-titolo">Notifiche Bloccate</h3>
            <p class="modale-testo">Per ricevere le nuove richieste in tempo reale, DriverButler ha bisogno di poterti avvisare. Attualmente le notifiche risultano bloccate dal sistema.<br><br>Per riattivarle, vai nelle impostazioni, cerca l'app DriverButler e consenti le notifiche. Inoltre, assicurati di consentirle anche sui tuoi browser.</p>
            <div class="modale-bottoni-container btn-singolo-container">
                <button id="btn_notifiche_ok" class="btn-modale-bianco">HO CAPITO</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('btn_notifiche_ok').addEventListener('click', function() {
            overlay.classList.add('hidden');
        });
    }
    
    overlay.classList.remove('hidden');
}

function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function attivaAbbonamentoPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
        const registrazione = await navigator.serviceWorker.ready;
        const chiavePubblicaVapid = "BGoIs_sj3qfrDqtmo5qnMb2AOWtUTWTLyjnOKUEDigwGdF5IkwuHV9I76v4tFIbGkLrr01ePEbGdO8R0lehSPts";
        const chiaveConvertita = urlBase64ToUint8Array(chiavePubblicaVapid);
        
        const abbonamento = await registrazione.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: chiaveConvertita
        });

        const token = localStorage.getItem('driverbutler_auth_token');
        if (!token) return;

        let deviceId = localStorage.getItem('driverbutler_device_id');
        if (!deviceId) {
            deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
            localStorage.setItem('driverbutler_device_id', deviceId);
        }

        const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        
        if (!userRes.ok) return;
        const userData = await userRes.json();
        const userId = userData.id;

        const contesto = await recuperaContestoUtentePartner(token, userId);
        let codiceUtente = null;
        if (contesto) {
            codiceUtente = contesto.tipoUtente === 'operativo' && contesto.dipendente
                ? (contesto.dipendente.codice_dipendente || contesto.codicePartnerAzienda)
                : contesto.codicePartnerAzienda;
        }

        const payloadAbbonamento = {
            codice_utente: codiceUtente,
            ruolo: "partner",
            user_id: userId,
            device_id: deviceId,
            ultimo_accesso: new Date().toISOString(),
            dati_abbonamento: JSON.parse(JSON.stringify(abbonamento))
        };

        await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/abbonamenti_push?on_conflict=user_id,device_id", {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json",
                "Prefer": "resolution=merge-duplicates"
            },
            body: JSON.stringify(payloadAbbonamento)
        });

    } catch (errore) {
        console.error(errore);
    }
}

function innescaNotificaNativa() {
    if ("Notification" in window && Notification.permission === "granted") {
        try {
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(function(registration) {
                    registration.showNotification("Nuova Corsa Disponibile!", {
                        body: "Controlla la bacheca per i dettagli.",
                        icon: "../logo/icona-pwa-prt.png",
                        vibrate: [200, 100, 200]
                    });
                });
            } else {
                new Notification("Nuova Corsa Disponibile!", {
                    body: "Controlla la bacheca per i dettagli.",
                    icon: "../logo/icona-pwa-prt.png"
                });
            }
        } catch(e) {
            console.error("Errore notifica nativa:", e);
        }
    }
}

function inizializzaSupabaseRealtimeGlobale() {
    const token = localStorage.getItem('driverbutler_auth_token');
    if (!token) return;

    if (typeof supabase === 'undefined') {
        const scriptSupa = document.createElement('script');
        scriptSupa.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
        scriptSupa.onload = () => {
            avviaConnessioneRealtime(token);
        };
        document.head.appendChild(scriptSupa);
    } else {
        avviaConnessioneRealtime(token);
    }
}

function avviaConnessioneRealtime(token) {
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    const clientSupa = supabase.createClient("https://drpgiwjwkfxztjbdyncm.supabase.co", chiaveAnon, {
        global: { headers: { Authorization: `Bearer ${token}` } }
    });

    clientSupa.channel('bacheca-globale')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'prenotazioni' }, payload => {
            if (document.getElementById('contenitore_bacheca')) {
                caricaBachecaRichieste();
            } else {
                if (typeof verificaBadgeBacheca === 'function') verificaBadgeBacheca();
            }
        })
        .subscribe();
}

document.addEventListener("DOMContentLoaded", function() {
    setTimeout(inizializzaSupabaseRealtimeGlobale, 1500);
});

async function verificaBadgeBacheca() {
    const token = localStorage.getItem('driverbutler_auth_token');
    if (!token) return;
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!userRes.ok) return;
        const userData = await userRes.json();

        const contesto = await recuperaContestoUtentePartner(token, userData.id);
        if (!contesto) return;
        const idPartnerTarget = contesto.idPartnerAzienda;

        const partnerRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${idPartnerTarget}&select=ultimo_accesso_bacheca`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        let ultimoAccesso = 0;
        if (partnerRes.ok) {
            const partnerData = await partnerRes.json();
            if (partnerData && partnerData.length > 0) {
                ultimoAccesso = new Date(partnerData[0].ultimo_accesso_bacheca || 0);
            }
        }

        const res = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/rpc/get_corse_disponibili", {
            method: "POST",
            headers: { 
                "apikey": chiaveAnon, 
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ p_id_partner: idPartnerTarget })
        });
        
        if (res.ok) {
            const viaggiAttesa = await res.json();
            if (viaggiAttesa && viaggiAttesa.length > 0) {
                const nuove = viaggiAttesa.filter(v => new Date(v.created_at) > ultimoAccesso);
                aggiornaBadgeMenu(nuove.length);
            } else {
                aggiornaBadgeMenu(0);
            }
        }
    } catch (e) {
        console.error("Errore lettura stato bacheca:", e);
    }
}

function azzeraNotifichePWA() {
    if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
    }
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
            registration.getNotifications({ tag: 'driverbutler-notifiche' }).then(notifiche => {
                notifiche.forEach(notifica => notifica.close());
            });
        });
    }
}

document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
        azzeraNotifichePWA();
        
        if (localStorage.getItem('driverbutler_auth_token')) {
            await rinnovaSessioneSilenziosa();
            
            if (document.getElementById('contenitore_bacheca')) {
                caricaBachecaRichieste();
            } else if (typeof verificaBadgeBacheca === 'function') {
                verificaBadgeBacheca();
            }
        }
    }
});

window.addEventListener('focus', azzeraNotifichePWA);
window.addEventListener('load', azzeraNotifichePWA);

let dataCalendarioAttuale = new Date();

function inizializzaCalendario() {
    aggiornaUISelezioneData();

    const btnPrec = document.getElementById('btn_giorno_prec');
    const btnSucc = document.getElementById('btn_giorno_succ');
    const inputData = document.getElementById('input_data_calendario');

    if (btnPrec) {
        btnPrec.addEventListener('click', () => {
            dataCalendarioAttuale.setDate(dataCalendarioAttuale.getDate() - 1);
            aggiornaUISelezioneData();
            caricaServiziCalendario();
        });
    }

    if (btnSucc) {
        btnSucc.addEventListener('click', () => {
            dataCalendarioAttuale.setDate(dataCalendarioAttuale.getDate() + 1);
            aggiornaUISelezioneData();
            caricaServiziCalendario();
        });
    }

    if (inputData) {
        inputData.addEventListener('change', (e) => {
            if (e.target.value) {
                dataCalendarioAttuale = new Date(e.target.value);
                aggiornaUISelezioneData();
                caricaServiziCalendario();
            }
        });

        const contenitoreData = inputData.closest('.data-selezionata-container');
        if (contenitoreData) {
            contenitoreData.addEventListener('click', () => {
                if (typeof inputData.showPicker === 'function') {
                    inputData.showPicker();
                } else {
                    inputData.click();
                }
            });
        }
    }

    caricaServiziCalendario();
}

function aggiornaUISelezioneData() {
    const testoData = document.getElementById('testo_data_selezionata');
    const inputData = document.getElementById('input_data_calendario');

    if (!testoData || !inputData) return;

    const anno = dataCalendarioAttuale.getFullYear();
    const mese = String(dataCalendarioAttuale.getMonth() + 1).padStart(2, '0');
    const giorno = String(dataCalendarioAttuale.getDate()).padStart(2, '0');
    
    inputData.value = `${anno}-${mese}-${giorno}`;

    const opzioni = { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' };
    testoData.textContent = dataCalendarioAttuale.toLocaleDateString('it-IT', opzioni);
}

async function caricaServiziCalendario() {
    const contenitore = document.getElementById('lista_servizi_calendario');
    if (!contenitore) return;
    
    contenitore.innerHTML = '<div class="msg-caricamento">Caricamento in corso...</div>';
    
    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!userRes.ok) throw new Error("Errore sessione");
        const userData = await userRes.json();

        const contesto = await recuperaContestoUtentePartner(token, userData.id);
        if (!contesto) throw new Error("Errore partner");
        const codicePartner = contesto.codicePartnerAzienda;

        const anno = dataCalendarioAttuale.getFullYear();
        const mese = String(dataCalendarioAttuale.getMonth() + 1).padStart(2, '0');
        const giorno = String(dataCalendarioAttuale.getDate()).padStart(2, '0');
        const dataQuery = `${anno}-${mese}-${giorno}`;

        const res = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/prenotazioni?codice_partner_assegnato=eq.${codicePartner}&data_partenza=eq.${dataQuery}&stato=neq.ANNULLATO&order=ora_partenza.asc`, {
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token
            }
        });
        
        if (!res.ok) throw new Error("Errore recupero prenotazioni");
        const servizi = await res.json();
        
        contenitore.innerHTML = '';
        
        if (servizi.length === 0) {
            contenitore.innerHTML = '<div class="msg-caricamento">Nessun servizio in questa data.</div>';
            return;
        }
        
        const conducentiDisponibili = await recuperaConducentiAbilitatiAzienda(token, contesto.idPartnerAzienda);
        const template = document.getElementById('template_calendario_card');

        servizi.forEach(servizio => {
            const isAssegnato = servizio.stato === 'ASSEGNATO' && !!servizio.codice_autista_assegnato;
            
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.card-bacheca-minimal');

            clone.querySelector('[data-bind-action="toggle"]').onclick = function() {
                card.classList.toggle('aperta');
            };

            const tipoServizioStr = servizio.tipo_servizio === 'TRANSFER' ? 'TRANSFER' : 'DISPOSIZIONE';
            const vetturaPulita = servizio.vettura_selezionata || '';
            clone.querySelector('[data-bind="intestazione_unificata"]').textContent = `${servizio.ora_partenza} - ${tipoServizioStr} - ${vetturaPulita}`;

            const badgeStato = clone.querySelector('[data-bind="badge_stato"]');
            if (isAssegnato) {
                badgeStato.textContent = 'ASSEGNATO';
                badgeStato.classList.add('cal-stato-assegnato');
            } else {
                badgeStato.textContent = 'DA ASSEGNARE';
                badgeStato.classList.add('cal-stato-da-assegnare');
            }

            let stringaPartenza = (servizio.partenza_citta && servizio.partenza_via) ? `${servizio.partenza_citta}, ${servizio.partenza_via}` : (servizio.partenza || '-');
            clone.querySelector('[data-bind="partenza_sintesi"]').textContent = stringaPartenza;

            if (servizio.tipo_servizio === 'TRANSFER') {
                let stringaArrivo = (servizio.arrivo_citta && servizio.arrivo_via) ? `${servizio.arrivo_citta}, ${servizio.arrivo_via}` : (servizio.arrivo || '-');
                clone.querySelector('[data-bind="arrivo_sintesi"]').textContent = stringaArrivo;
                clone.querySelector('[data-bind-container="arrivo_sintesi_riga"]').classList.remove('hidden');
            }

            clone.querySelector('[data-bind="pax_sintesi"]').textContent = servizio.nome_passeggero || '-';

            clone.querySelector('[data-bind="nome_passeggero"]').textContent = servizio.nome_passeggero || '-';
            clone.querySelector('[data-bind="tel_passeggero"]').textContent = servizio.tel_passeggero || '-';
            
            if (servizio.chk_referente && (servizio.nome_referente || servizio.tel_referente)) {
                clone.querySelector('[data-bind-container="referente_block"]').classList.remove('hidden');
                clone.querySelector('[data-bind="nome_referente"]').textContent = servizio.nome_referente || '-';
                clone.querySelector('[data-bind="tel_referente"]').textContent = servizio.tel_referente || '-';
            }

            clone.querySelector('[data-bind="tipo_servizio_full"]').textContent = tipoServizioStr;
            if (servizio.tipo_servizio === 'DISPOSIZIONE') {
                clone.querySelector('[data-bind-container="durata_block"]').classList.remove('hidden');
                clone.querySelector('[data-bind="durata"]').textContent = servizio.ore ? `${servizio.ore} Ore` : '-';
            }
            clone.querySelector('[data-bind="vettura_full"]').textContent = vetturaPulita;
            
            let dataEstesa = dataQuery;
            if (servizio.data_partenza) {
                const parti = servizio.data_partenza.split('-');
                if (parti.length === 3) {
                    dataEstesa = `${parti[2]}/${parti[1]}/${parti[0]}`;
                }
            }
            clone.querySelector('[data-bind="data_ora_dettaglio"]').textContent = `${dataEstesa} alle ore ${servizio.ora_partenza}`;

            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const apriNavigatore = (indirizzo) => {
                if (isMobile) {
                    window.location.href = `geo:0,0?q=${encodeURIComponent(indirizzo)}`;
                } else {
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(indirizzo)}`, '_blank');
                }
            };

            const spanPartenza = clone.querySelector('[data-bind="partenza_full"]');
            if (servizio.partenza) {
                spanPartenza.textContent = servizio.partenza;
                spanPartenza.classList.add('link-navigatore');
                spanPartenza.onclick = function(e) {
                    e.stopPropagation();
                    apriNavigatore(servizio.partenza);
                };
            } else {
                spanPartenza.textContent = '-';
            }
            
            if (servizio.tipo_servizio === 'TRANSFER') {
                clone.querySelector('[data-bind-container="arrivo_full_block"]').classList.remove('hidden');
                const spanArrivo = clone.querySelector('[data-bind="arrivo_full"]');
                if (servizio.arrivo) {
                    spanArrivo.textContent = servizio.arrivo;
                    spanArrivo.classList.add('link-navigatore');
                    spanArrivo.onclick = function(e) {
                        e.stopPropagation();
                        apriNavigatore(servizio.arrivo);
                    };
                } else {
                    spanArrivo.textContent = '-';
                }
            } else {
                clone.querySelector('[data-bind-container="itinerario_previsto_block"]').classList.remove('hidden');
                clone.querySelector('[data-bind="itinerario_previsto"]').textContent = servizio.itinerario_previsto || '-';
            }

            const numPax = servizio.passeggeri || 1;
            clone.querySelector('[data-bind="pax"]').textContent = numPax + (numPax === 1 ? ' Passeggero' : ' Passeggeri');
            const numGrandi = servizio.bagagli_grandi || 0;
            clone.querySelector('[data-bind="grandi"]').textContent = numGrandi + (numGrandi === 1 ? ' Valigia Grande' : ' Valigie Grandi');
            clone.querySelector('[data-bind="mano"]').textContent = servizio.bagagli_mano || 0;
            
            clone.querySelector('[data-bind="note_servizio"]').textContent = servizio.note_servizio || 'Nessuna nota';
            clone.querySelector('[data-bind="codice_prenotazione_dettaglio"]').textContent = servizio.codice_prenotazione;
            
            const importoFormattato = servizio.prezzo_totale ? servizio.prezzo_totale.toFixed(2).replace('.', ',') : '0,00';
            clone.querySelector('[data-bind="prezzo_dettaglio"]').textContent = `${importoFormattato} €`;

            const selectAutista = clone.querySelector('[data-bind="select_autista"]');
            const msgAssegnazione = clone.querySelector('[data-bind="msg_assegnazione"]');

            if (selectAutista) {
                const optDefault = document.createElement('option');
                optDefault.value = '';
                optDefault.disabled = true;
                optDefault.textContent = 'Seleziona autista...';
                if (!servizio.codice_autista_assegnato) {
                    optDefault.selected = true;
                }
                selectAutista.appendChild(optDefault);

                conducentiDisponibili.forEach(c => {
                    const opt = document.createElement('option');
                    opt.value = c.codice;
                    opt.textContent = c.label;
                    if (servizio.codice_autista_assegnato === c.codice) {
                        opt.selected = true;
                    }
                    selectAutista.appendChild(opt);
                });

                if (servizio.codice_autista_assegnato && !conducentiDisponibili.some(c => c.codice === servizio.codice_autista_assegnato)) {
                    const optStorico = document.createElement('option');
                    optStorico.value = servizio.codice_autista_assegnato;
                    optStorico.textContent = `${servizio.codice_autista_assegnato} (Non attivo)`;
                    optStorico.selected = true;
                    selectAutista.appendChild(optStorico);
                }

                selectAutista.addEventListener('change', async function() {
                    const codiceScelto = this.value;
                    if (!codiceScelto) return;

                    const conducenteScelto = conducentiDisponibili.find(c => c.codice === codiceScelto);
                    if (!conducenteScelto) return;

                    selectAutista.disabled = true;
                    if (msgAssegnazione) {
                        msgAssegnazione.textContent = 'Assegnazione in corso...';
                        msgAssegnazione.classList.add('messaggio-neutro', 'mostra');
                    }

                    try {
                        const patchRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/prenotazioni?codice_prenotazione=eq.${encodeURIComponent(servizio.codice_prenotazione)}`, {
                            method: 'PATCH',
                            headers: {
                                'apikey': chiaveAnon,
                                'Authorization': 'Bearer ' + token,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=minimal'
                            },
                            body: JSON.stringify({
                                stato: 'ASSEGNATO',
                                codice_autista_assegnato: conducenteScelto.codice,
                                id_dipendente: conducenteScelto.id_dipendente
                            })
                        });

                        if (!patchRes.ok) throw new Error('Errore assegnazione');

                        badgeStato.textContent = 'ASSEGNATO';
                        badgeStato.classList.remove('cal-stato-da-assegnare');
                        badgeStato.classList.add('cal-stato-assegnato');

                        if (msgAssegnazione) {
                            msgAssegnazione.textContent = 'Autista assegnato!';
                            msgAssegnazione.classList.add('messaggio-neutro', 'mostra');
                            setTimeout(() => {
                                msgAssegnazione.classList.remove('mostra', 'messaggio-neutro');
                                msgAssegnazione.textContent = '';
                            }, 3000);
                        }
                    } catch (err) {
                        if (msgAssegnazione) {
                            msgAssegnazione.classList.remove('messaggio-neutro');
                            msgAssegnazione.textContent = "Errore durante l'assegnazione. Riprova.";
                            msgAssegnazione.classList.add('mostra');
                        }
                    } finally {
                        selectAutista.disabled = false;
                    }
                });
            }

            contenitore.appendChild(clone);
        });
        
    } catch (errore) {
        contenitore.innerHTML = '<div class="msg-errore-viaggi">Impossibile caricare i servizi. Riprova.</div>';
    }
}

let idDipendenteInModifica = null;
let emailOriginaleDipendenteInModifica = null;
let funzioneApriModificaDipendente = null;

document.addEventListener("DOMContentLoaded", function() {
    const btnApriDip = document.getElementById('bottom_bar_dipendenti');
    if (!btnApriDip) return;

    const btnAnnullaDip = document.getElementById('btn_annulla_dipendente');
    const formContainerDip = document.getElementById('form_container_dipendente');
    const elencoDipendenti = document.getElementById('sezione_elenco_dipendenti');
    const titoloFormDip = document.getElementById('titolo_form_dipendente');
    const formGestioneDip = document.getElementById('formGestioneDipendente');

    const selectRuolo = document.getElementById('dip_ruolo');
    const gruppoSpuntaGuida = document.getElementById('gruppo_spunta_guida');
    const checkAbilitatoGuida = document.getElementById('dip_abilitato_guida');
    const sezioneDatiGuida = document.getElementById('sezione_dati_guida');
    const checkAutocertPatente = document.getElementById('dip_autocert_patente');

    const bloccoPasswordDip = document.getElementById('blocco_password_dipendente');
    const inputEmailDip = document.getElementById('dip_email');
    const inputPassDip = document.getElementById('dip_password');
    const inputConfPassDip = document.getElementById('dip_conferma_password');
    const errPassDip = document.getElementById('errore_password_dip');
    const errConfPassDip = document.getElementById('errore_coincidenza_dip');

    function validaPasswordDipendente() {
        const pass = inputPassDip.value;
        const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        if (pass.length === 0) {
            errPassDip.classList.remove('mostra');
            return false;
        }
        if (!regexPassword.test(pass)) {
            errPassDip.classList.add('mostra');
            return false;
        }
        errPassDip.classList.remove('mostra');
        return true;
    }

    function validaCoincidenzaDipendente() {
        const pass = inputPassDip.value;
        const confPass = inputConfPassDip.value;
        if (confPass.length === 0) {
            errConfPassDip.classList.remove('mostra');
            return false;
        }
        if (pass !== confPass) {
            errConfPassDip.classList.add('mostra');
            return false;
        }
        errConfPassDip.classList.remove('mostra');
        return true;
    }

    if (inputPassDip && inputConfPassDip) {
        inputPassDip.addEventListener('input', () => {
            validaPasswordDipendente();
            if (inputConfPassDip.value.length > 0) validaCoincidenzaDipendente();
        });
        inputConfPassDip.addEventListener('input', validaCoincidenzaDipendente);
    }

    function aggiornaCampiGuida() {
        const ruolo = selectRuolo.value;
        const isGuida = (ruolo === 'AUTISTA') || (ruolo === 'OPERATIVO' && checkAbilitatoGuida.checked);

        if (ruolo === 'OPERATIVO') {
            gruppoSpuntaGuida.classList.remove('hidden');
        } else {
            gruppoSpuntaGuida.classList.add('hidden');
            checkAbilitatoGuida.checked = false;
        }

        if (isGuida) {
            sezioneDatiGuida.classList.remove('hidden');
            document.getElementById('dip_numero_ruolo').required = true;
            checkAutocertPatente.required = true;
        } else {
            sezioneDatiGuida.classList.add('hidden');
            document.getElementById('dip_numero_ruolo').required = false;
            document.getElementById('dip_numero_ruolo').value = '';
            checkAutocertPatente.required = false;
            checkAutocertPatente.checked = false;
        }
    }

    function apriFormDipendente(isModifica = false) {
        if (isModifica) {
            if (bloccoPasswordDip) bloccoPasswordDip.classList.add('hidden');
            if (inputPassDip) {
                inputPassDip.required = false;
                inputPassDip.value = '';
            }
            if (inputConfPassDip) {
                inputConfPassDip.required = false;
                inputConfPassDip.value = '';
            }
            if (inputEmailDip) inputEmailDip.disabled = false;
        } else {
            idDipendenteInModifica = null;
            emailOriginaleDipendenteInModifica = null;
            if (bloccoPasswordDip) bloccoPasswordDip.classList.remove('hidden');
            if (inputPassDip) inputPassDip.required = true;
            if (inputConfPassDip) inputConfPassDip.required = true;
            if (inputEmailDip) inputEmailDip.disabled = false;
        }

        formContainerDip.classList.remove('hidden');
        btnApriDip.classList.add('hidden');
        elencoDipendenti.classList.add('hidden');
        document.querySelector('.login-wrapper').classList.add('padding-bottom-extra');
        if (typeof moduloSporco !== 'undefined') moduloSporco = false;
        window.scrollTo(0, 0);
    }

    function chiudiFormDipendente() {
        idDipendenteInModifica = null;
        emailOriginaleDipendenteInModifica = null;
        formContainerDip.classList.add('hidden');
        btnApriDip.classList.remove('hidden');
        elencoDipendenti.classList.remove('hidden');
        document.querySelector('.login-wrapper').classList.remove('padding-bottom-extra');
        window.scrollTo(0, 0);
        formGestioneDip.reset();
        if (bloccoPasswordDip) bloccoPasswordDip.classList.remove('hidden');
        if (inputPassDip) inputPassDip.required = true;
        if (inputConfPassDip) inputConfPassDip.required = true;
        if (inputEmailDip) inputEmailDip.disabled = false;
        if (errPassDip) errPassDip.classList.remove('mostra');
        if (errConfPassDip) errConfPassDip.classList.remove('mostra');
        nascondiMessaggioBottone('msg_stato_dipendente');
        aggiornaCampiGuida();
        if (typeof moduloSporco !== 'undefined') moduloSporco = false;
    }

    funzioneApriModificaDipendente = function(dip) {
        formGestioneDip.reset();
        if (errPassDip) errPassDip.classList.remove('mostra');
        if (errConfPassDip) errConfPassDip.classList.remove('mostra');
        nascondiMessaggioBottone('msg_stato_dipendente');

        idDipendenteInModifica = dip.id_dipendente;
        emailOriginaleDipendenteInModifica = (dip.email || '').trim().toLowerCase();
        titoloFormDip.textContent = 'Modifica Dipendente';

        document.getElementById('dip_nome').value = dip.nome || '';
        document.getElementById('dip_cognome').value = dip.cognome || '';
        if (inputEmailDip) inputEmailDip.value = dip.email || '';
        if (itiDipendente && dip.telefono) {
            itiDipendente.setNumber(dip.telefono);
        } else {
            document.getElementById('dip_telefono').value = dip.telefono || '';
        }

        selectRuolo.value = dip.ruolo || '';
        checkAbilitatoGuida.checked = !!dip.abilitato_guida;
        document.getElementById('dip_numero_ruolo').value = dip.numero_ruolo_provincia || '';
        checkAutocertPatente.checked = !!dip.autocert_patente;

        aggiornaCampiGuida();
        if (typeof svuotaBozze === 'function') svuotaBozze();
        apriFormDipendente(true);
    };

    btnApriDip.addEventListener('click', () => {
        formGestioneDip.reset();
        titoloFormDip.textContent = 'Nuovo Dipendente';
        aggiornaCampiGuida();
        apriFormDipendente(false);
    });

    btnAnnullaDip.addEventListener('click', () => {
        chiudiFormDipendente();
    });

    selectRuolo.addEventListener('change', aggiornaCampiGuida);
    checkAbilitatoGuida.addEventListener('change', aggiornaCampiGuida);

    caricaDipendenti();

    formGestioneDip.addEventListener('submit', async function(e) {
        e.preventDefault();

        const isModifica = idDipendenteInModifica !== null;

        if (!isModifica) {
            if (!validaPasswordDipendente() || !validaCoincidenzaDipendente()) {
                return;
            }
        }

        const btnSalva = document.getElementById('btn_salva_dipendente');
        btnSalva.disabled = true;
        mostraMessaggioBottone('msg_stato_dipendente', "Salvataggio in corso...", 'neutro');

        const token = localStorage.getItem('driverbutler_auth_token');
        const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

        try {
            let prefissoTel = itiDipendente ? "+" + itiDipendente.getSelectedCountryData().dialCode : "+39";
            let numeroDigitato = document.getElementById('dip_telefono').value.trim();
            let telefonoFinale = (numeroDigitato.startsWith('+') ? numeroDigitato : (prefissoTel + numeroDigitato)).replace(/\s+/g, '');

            const nomeDip = document.getElementById('dip_nome').value.trim();
            const cognomeDip = document.getElementById('dip_cognome').value.trim();
            const ruoloScelto = selectRuolo.value;
            const abilitatoGuida = ruoloScelto === 'AUTISTA' ? true : checkAbilitatoGuida.checked;

            if (isModifica) {
                const idTarget = idDipendenteInModifica;
                const emailModificata = inputEmailDip ? inputEmailDip.value.trim().toLowerCase() : '';

                if (!emailModificata) {
                    throw new Error("Inserisci un indirizzo email valido.");
                }

                if (emailModificata !== emailOriginaleDipendenteInModifica) {
                    const edgeRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/functions/v1/gestione-email-dipendente", {
                        method: "POST",
                        headers: {
                            "apikey": chiaveAnon,
                            "Authorization": "Bearer " + token,
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            azione: "cambia_email",
                            id_dipendente: idTarget,
                            nuova_email: emailModificata
                        })
                    });

                    const edgeData = await edgeRes.json().catch(() => ({}));
                    if (!edgeRes.ok) {
                        if (edgeData.error === "EMAIL_ESISTENTE") {
                            throw new Error("EMAIL_ESISTENTE");
                        }
                        throw new Error(edgeData.error || "Errore durante l'aggiornamento dell'email.");
                    }
                }

                const corpoModifica = {
                    nome: nomeDip,
                    cognome: cognomeDip,
                    telefono: telefonoFinale,
                    ruolo: ruoloScelto,
                    abilitato_guida: abilitatoGuida,
                    numero_ruolo_provincia: abilitatoGuida ? (document.getElementById('dip_numero_ruolo').value.trim() || null) : null,
                    autocert_patente: abilitatoGuida ? checkAutocertPatente.checked : false
                };

                const updateRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/dipendenti?id_dipendente=eq.${idTarget}`, {
                    method: "PATCH",
                    headers: {
                        "apikey": chiaveAnon,
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json",
                        "Prefer": "return=minimal"
                    },
                    body: JSON.stringify(corpoModifica)
                });

                if (!updateRes.ok) {
                    throw new Error("Errore durante il salvataggio delle modifiche.");
                }

                const userResCheck = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                    headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
                });
                if (userResCheck.ok) {
                    const userDataCheck = await userResCheck.json();
                    if (userDataCheck.id === idTarget && ruoloScelto === 'AUTISTA') {
                        esciAccount();
                        return;
                    }
                }

                if (typeof svuotaBozze === 'function') svuotaBozze();
                nascondiMessaggioBottone('msg_stato_dipendente');
                chiudiFormDipendente();
                caricaDipendenti();
                btnSalva.disabled = false;
                return;
            }

            const emailDip = document.getElementById('dip_email').value.trim();

            const checkPartner = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?email=eq.${encodeURIComponent(emailDip)}&select=id_partner`, { headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token } });
            const dataPartner = await checkPartner.json();
            if (dataPartner && dataPartner.length > 0) throw new Error("EMAIL_ESISTENTE");

            const checkPax = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?email=eq.${encodeURIComponent(emailDip)}&select=id_passeggero`, { headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token } });
            const dataPax = await checkPax.json();
            if (dataPax && dataPax.length > 0) throw new Error("EMAIL_ESISTENTE");

            const checkDip = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/dipendenti?email=eq.${encodeURIComponent(emailDip)}&select=id_dipendente`, { headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token } });
            const dataDip = await checkDip.json();
            if (dataDip && dataDip.length > 0) throw new Error("EMAIL_ESISTENTE");

            const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
            });
            const userData = await userRes.json();
            const currentUserId = userData.id;

            let idPartnerEffettivo = currentUserId;
            let codicePartnerEffettivo = "";

            const checkPartnerCorrente = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${currentUserId}&select=id_partner,codice_partner`, {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
            });
            const dataPartnerCorrente = await checkPartnerCorrente.json();

            if (dataPartnerCorrente && dataPartnerCorrente.length > 0) {
                idPartnerEffettivo = dataPartnerCorrente[0].id_partner;
                codicePartnerEffettivo = dataPartnerCorrente[0].codice_partner;
            } else {
                const checkDipCorrente = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/dipendenti?id_dipendente=eq.${currentUserId}&select=id_partner,codice_partner`, {
                    headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
                });
                const dataDipCorrente = await checkDipCorrente.json();
                if (dataDipCorrente && dataDipCorrente.length > 0) {
                    idPartnerEffettivo = dataDipCorrente[0].id_partner;
                    codicePartnerEffettivo = dataDipCorrente[0].codice_partner;
                } else {
                    throw new Error("Permessi aziendali non validi per l'inserimento.");
                }
            }

            const passwordDip = inputPassDip.value;

            const signupRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/signup", {
                method: "POST",
                headers: {
                    "apikey": chiaveAnon,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: emailDip,
                    password: passwordDip,
                    data: {
                        is_dipendente: true,
                        nome_cognome: nomeDip + ' ' + cognomeDip,
                        display_name: cognomeDip + ' ' + nomeDip
                    }
                })
            });

            if (!signupRes.ok) {
                const err = await signupRes.json();
                if (JSON.stringify(err).toLowerCase().includes("already registered")) {
                    throw new Error("EMAIL_ESISTENTE");
                }
                throw new Error("Errore account: " + (err.msg || err.message));
            }

            const signupData = await signupRes.json();
            const newUserId = signupData.user ? signupData.user.id : signupData.id;

            if (!newUserId) throw new Error("ID Utente non generato dal server.");

            const corpoDipendente = {
                id_dipendente: newUserId,
                id_partner: idPartnerEffettivo,
                codice_partner: codicePartnerEffettivo,
                nome: nomeDip,
                cognome: cognomeDip,
                email: emailDip,
                telefono: telefonoFinale,
                ruolo: ruoloScelto,
                abilitato_guida: abilitatoGuida,
                numero_ruolo_provincia: abilitatoGuida ? (document.getElementById('dip_numero_ruolo').value.trim() || null) : null,
                autocert_patente: abilitatoGuida ? checkAutocertPatente.checked : false,
                notifica_push: true,
                notifica_email: false,
                stato_attivo: true,
                linguaggio: 'it'
            };

            const insertRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/dipendenti", {
                method: "POST",
                headers: {
                    "apikey": chiaveAnon,
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(corpoDipendente)
            });

            if (!insertRes.ok) {
                throw new Error("Errore durante il salvataggio dell'anagrafica.");
            }

            if (typeof svuotaBozze === 'function') svuotaBozze();
            nascondiMessaggioBottone('msg_stato_dipendente');
            chiudiFormDipendente();
            caricaDipendenti();

        } catch (errore) {
            nascondiMessaggioBottone('msg_stato_dipendente');
            let msg = "Si è verificato un errore.";
            if (errore.message === "EMAIL_ESISTENTE") {
                msg = "Questa email risulta già registrata a sistema. Usa un indirizzo diverso.";
            } else {
                msg = errore.message;
            }
            
            const overlay = document.getElementById('modale_errore_dipendente');
            if (overlay) {
                document.getElementById('testo_errore_dipendente').innerHTML = msg;
                overlay.classList.remove('hidden');
                
                document.getElementById('btn_chiudi_errore_dip').onclick = function() {
                    overlay.classList.add('hidden');
                };
            } else {
                alert(msg);
            }
        }

        btnSalva.disabled = false;
    });
});

async function caricaDipendenti() {
    const contenitore = document.getElementById('lista_dipendenti');
    if (!contenitore) return;

    contenitore.innerHTML = '<div class="msg-lista-info">Caricamento dipendenti...</div>';

    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        let currentUserId = null;
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token
            }
        });
        if (userRes.ok) {
            const userData = await userRes.json();
            currentUserId = userData.id;
        }

        const res = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/dipendenti?order=cognome.asc,nome.asc", {
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token
            }
        });

        if (!res.ok) throw new Error("Errore caricamento");
        const dipendenti = await res.json();

        contenitore.innerHTML = '';
        
        if (dipendenti.length === 0) {
            contenitore.innerHTML = '<div class="messaggio-vuoto">Nessun dipendente registrato nella tua azienda.</div>';
            return;
        }

        const template = document.getElementById('template_dipendente_card');

        const ordinaPerCognome = (a, b) => {
            const cmpCognome = (a.cognome || '').localeCompare(b.cognome || '', 'it', { sensitivity: 'base' });
            if (cmpCognome !== 0) return cmpCognome;
            return (a.nome || '').localeCompare(b.nome || '', 'it', { sensitivity: 'base' });
        };

        const dipendentiAttivi = dipendenti.filter(d => d.stato_attivo === true).sort(ordinaPerCognome);
        const dipendentiSospesi = dipendenti.filter(d => d.stato_attivo !== true).sort(ordinaPerCognome);

        const renderizzaDipendente = (dip) => {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.card-bacheca-minimal');
            const isUtenteCorrente = currentUserId && dip.id_dipendente === currentUserId;

            if (isUtenteCorrente) {
                card.classList.add('card-dipendente-corrente', 'no-click');
                const iconaTendina = clone.querySelector('.icona-tendina-mini');
                if (iconaTendina) iconaTendina.classList.add('hidden');
            } else {
                clone.querySelector('[data-bind-action="toggle"]').onclick = function() {
                    card.classList.toggle('aperta');
                };
            }

            clone.querySelector('[data-bind="nome_cognome_sintesi"]').textContent = dip.cognome + ' ' + dip.nome;

            const isVerificato = dip.email_verificata === true;
            const badge = clone.querySelector('[data-bind="badge_stato"]');
            if (!dip.stato_attivo) {
                badge.textContent = "SOSPESO";
            } else if (!isVerificato) {
                badge.textContent = "DA VERIFICARE";
            } else {
                badge.textContent = "ATTIVO";
            }

            clone.querySelector('[data-bind="ruolo_sintesi"]').textContent = dip.ruolo;

            const emailLink = clone.querySelector('[data-bind="email_link"]');
            emailLink.textContent = dip.email;
            emailLink.href = 'mailto:' + dip.email;

            const telLink = clone.querySelector('[data-bind="tel_link"]');
            telLink.textContent = dip.telefono;
            telLink.href = 'tel:' + dip.telefono;

            if (dip.ruolo === 'AUTISTA' || dip.abilitato_guida) {
                clone.querySelector('[data-bind-container="dati_guida_block"]').classList.remove('hidden');
                clone.querySelector('[data-bind="ruolo_provincia"]').textContent = dip.numero_ruolo_provincia || '-';
            }

            const btnModifica = clone.querySelector('[data-bind-action="modifica"]');
            btnModifica.onclick = function() {
                if (typeof funzioneApriModificaDipendente === 'function') {
                    funzioneApriModificaDipendente(dip);
                }
            };

            const btnSospendi = clone.querySelector('[data-bind-action="sospendi"]');
            const msgCard = clone.querySelector('[data-bind="msg_card_dipendente"]');

            if (dip.stato_attivo && !isVerificato) {
                btnSospendi.textContent = "REINVIA VERIFICA";
                btnSospendi.onclick = function() {
                    reinviaVerificaDipendente(dip.id_dipendente, btnSospendi, msgCard);
                };
            } else {
                btnSospendi.textContent = dip.stato_attivo ? "SOSPENDI" : "ATTIVA";
                btnSospendi.onclick = function() {
                    cambiaStatoDipendente(dip.id_dipendente, !dip.stato_attivo, btnSospendi);
                };
            }

            contenitore.appendChild(clone);
        };

        dipendentiAttivi.forEach(renderizzaDipendente);

        if (dipendentiSospesi.length > 0) {
            const separatore = document.createElement('div');
            separatore.className = 'separatore-bacheca';
            separatore.innerHTML = '<span>Dipendenti sospesi</span>';
            contenitore.appendChild(separatore);

            dipendentiSospesi.forEach(renderizzaDipendente);
        }
        
    } catch (e) {
        contenitore.innerHTML = '<div class="msg-lista-errore">Errore di caricamento.</div>';
    }
}

async function reinviaVerificaDipendente(id_dipendente, btn, msgEl) {
    btn.disabled = true;
    const testoOriginale = btn.textContent;
    btn.textContent = "INVIO...";

    if (msgEl) {
        msgEl.classList.remove('mostra', 'messaggio-neutro');
        msgEl.textContent = '';
    }

    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const res = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/functions/v1/gestione-email-dipendente", {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                azione: "reinvia_verifica",
                id_dipendente: id_dipendente
            })
        });

        if (!res.ok) {
            throw new Error("Errore invio email");
        }

        if (msgEl) {
            msgEl.textContent = "Email di verifica reinviata!";
            msgEl.classList.add('messaggio-neutro', 'mostra');
            setTimeout(() => {
                msgEl.classList.remove('mostra', 'messaggio-neutro');
                msgEl.textContent = '';
            }, 5000);
        }
    } catch (e) {
        if (msgEl) {
            msgEl.classList.remove('messaggio-neutro');
            msgEl.textContent = "Errore durante l'invio. Riprova.";
            msgEl.classList.add('mostra');
        }
    } finally {
        btn.disabled = false;
        btn.textContent = testoOriginale;
    }
}

async function cambiaStatoDipendente(id_dipendente, nuovoStato, btn) {
    btn.disabled = true;
    btn.textContent = "...";
    
    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const res = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/dipendenti?id_dipendente=eq.${id_dipendente}`, {
            method: "PATCH",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ stato_attivo: nuovoStato })
        });
        
        if (res.ok) {
            caricaDipendenti();
        } else {
            btn.disabled = false;
            btn.textContent = "ERRORE";
        }
    } catch(e) {
        btn.disabled = false;
        btn.textContent = "ERRORE";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const eyeButtons = document.querySelectorAll('.eye-btn[data-target-input]');
    eyeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const inputId = this.getAttribute('data-target-input');
            if (typeof togglePassword === 'function') {
                togglePassword(inputId, this);
            }
        });
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const formLogin = document.getElementById('formLogin');
    if (formLogin) {
        formLogin.addEventListener('submit', function(event) {
            if (typeof inviaLogin === 'function') {
                inviaLogin(event);
            }
        });
    }

    const btnVerificaOtpLogin = document.getElementById('btn_verifica_otp_login');
    if (btnVerificaOtpLogin) {
        btnVerificaOtpLogin.addEventListener('click', verificaOtpLogin);
    }

    const linkNuovoOtpLogin = document.getElementById('link_invia_nuovo_otp_login');
    if (linkNuovoOtpLogin) {
        linkNuovoOtpLogin.addEventListener('click', inviaNuovoOtpLogin);
    }

    const inputOtpLogin = document.getElementById('otp_code_login');
    if (inputOtpLogin) {
        inputOtpLogin.addEventListener('input', function() {
            nascondiMessaggioBottone('messaggio_errore_otp_login');
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const formRecupero = document.getElementById('formRecuperoPassword');
    if (formRecupero) {
        formRecupero.addEventListener('submit', function(event) {
            if (typeof richiediResetPassword === 'function') {
                richiediResetPassword(event);
            }
        });
    }

    const formResetPassword = document.getElementById('formResetPassword');
    if (formResetPassword) {
        formResetPassword.addEventListener('submit', function(event) {
            if (typeof inviaNuovaPassword === 'function') {
                inviaNuovaPassword(event);
            }
        });
    }

    const linkNuovoOtpReset = document.getElementById('link_invia_nuovo_otp_reset');
    if (linkNuovoOtpReset) {
        linkNuovoOtpReset.addEventListener('click', tornaARichiestaReset);
    }

    const inputOtpReset = document.getElementById('otp_code_reset');
    if (inputOtpReset) {
        inputOtpReset.addEventListener('input', function() {
            nascondiMessaggioBottone('messaggio_errore_otp_reset');
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const formRegistrazione = document.getElementById('formRegistrazione');
    if (formRegistrazione) {
        formRegistrazione.addEventListener('submit', function(event) {
            if (typeof inviaRegistrazione === 'function') {
                inviaRegistrazione(event);
            }
        });
    }

    const btnVerificaOtp = document.getElementById('btn_verifica_otp');
    if (btnVerificaOtp) {
        btnVerificaOtp.addEventListener('click', verificaOtpRegistrazione);
    }

    const linkNuovoOtp = document.getElementById('link_invia_nuovo_otp');
    if (linkNuovoOtp) {
        linkNuovoOtp.addEventListener('click', inviaNuovoOtpRegistrazione);
    }

    const inputOtp = document.getElementById('otp_code');
    if (inputOtp) {
        inputOtp.addEventListener('input', function() {
            nascondiMessaggioBottone('messaggio_errore_otp');
        });
    }
    
    const inputPass = document.getElementById('password');
    const inputConfPass = document.getElementById('confermaPassword');
    if (inputPass) {
        inputPass.addEventListener('input', () => {
            nascondiMessaggioBottone('messaggio_errore_server');
            nascondiMessaggioBottone('messaggio_errore_server_cambio');
            if (typeof validaComplessitaPassword === 'function') validaComplessitaPassword();
            if (inputConfPass && typeof verificaCoincidenzaPassword === 'function') verificaCoincidenzaPassword();
        });
    }
    if (inputConfPass) {
        inputConfPass.addEventListener('input', () => {
            nascondiMessaggioBottone('messaggio_errore_server');
            nascondiMessaggioBottone('messaggio_errore_server_cambio');
            if (typeof verificaCoincidenzaPassword === 'function') verificaCoincidenzaPassword();
        });
    }
});

let menuPartnerInizializzato = false;

function inizializzaMenuPartner() {
    if (menuPartnerInizializzato) return;
    const contenitoreMenu = document.getElementById("menu-principale");
    if (!contenitoreMenu) return;
    menuPartnerInizializzato = true;

    const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
    let linkLogo = "index.html";
    if (localStorage.getItem('driverbutler_auth_token') && !isIndex) {
        linkLogo = "dashboard_prt.html";
    }

    const paginaCorrente = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    const bloccaClickLogo = (linkLogo === paginaCorrente);

    const iconaUtente = `
        <button id="btn_apri_menu" class="user-icon-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        </button>`;

    contenitoreMenu.innerHTML = `
    <nav class="navbar">
        <a href="${linkLogo}" class="logo-container ${bloccaClickLogo ? 'no-click' : ''}">
            <img src="../logo/logo.svg" alt="Logo DriverButler" class="logo-icon">
            <img src="../logo/scritta.svg" alt="DriverButler" class="logo-text-img">
        </a>
        <div class="menu-destra menu-destra-compatta">
            ${iconaUtente}
        </div>
    </nav>`;

    const blacklistPubblica = ['login_prt.html', 'registrazione_prt.html', 'pwreset_prt.html', 'assistenza_prt.html'];
    const isPaginaPubblica = blacklistPubblica.includes(paginaCorrente) || paginaCorrente === 'index.html' || paginaCorrente === '';

    if (!document.getElementById('side_panel')) {
        const blocchiLogoutHtml = isPaginaPubblica ? '' : `
            <div class="swipe-logout-container">
                <div class="swipe-logout-track">
                    <span class="swipe-logout-text"><span>SCORRI PER USCIRE DALL'ACCOUNT</span><svg class="icona-inline-destra" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg></span>
                    <input type="range" id="swipe_logout_range" class="swipe-logout-slider" min="0" max="100" value="0">
                </div>
            </div>`;

        document.body.insertAdjacentHTML('beforeend', `
            <div id="menu_overlay" class="overlay"></div>
            <div id="side_panel" class="side-panel">
                <div class="sidebar-sticky-header">
                    <button id="btn_chiudi_menu" class="btn-chiudi-testuale">
                        <span>CHIUDI MENU</span>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                    ${blocchiLogoutHtml}
                </div>
                <div class="menu-items scrollable-menu"></div>
            </div>`);
    }

    const btnChiudi = document.getElementById('btn_chiudi_menu');
    const overlay = document.getElementById('menu_overlay');
    const sidePanel = document.getElementById('side_panel');

    if (sidePanel && !sidePanel.classList.contains('open')) {
        sidePanel.classList.add('no-click', 'invisibile');
    }

    function apriMenu(e) {
        if (e) e.stopPropagation();
        if (sidePanel) {
            sidePanel.classList.remove('invisibile', 'no-click');
            sidePanel.classList.add('open');
        }
        if (overlay) {
            overlay.classList.remove('no-click');
            overlay.classList.add('open');
        }
        document.body.classList.add('no-scroll');
    }

    function chiudiMenu(e) {
        if (e) e.stopPropagation();
        if (sidePanel) {
            sidePanel.classList.remove('open');
            sidePanel.classList.add('no-click', 'invisibile');
        }
        if (overlay) {
            overlay.classList.remove('open');
            overlay.classList.add('no-click');
        }
        document.body.classList.remove('no-scroll');
    }

    if (btnChiudi) btnChiudi.addEventListener('click', chiudiMenu);
    if (overlay) overlay.addEventListener('click', chiudiMenu);

    document.addEventListener('click', function(e) {
        const btnMenu = document.getElementById('btn_apri_menu');
        if (btnMenu && (e.target === btnMenu || btnMenu.contains(e.target))) {
            apriMenu(e);
            return;
        }
        if (sidePanel && sidePanel.classList.contains('open')) {
            if (!sidePanel.contains(e.target)) {
                chiudiMenu(e);
            }
        }
    });

    const contenitoreMenuLaterale = document.querySelector('.scrollable-menu');
    if (contenitoreMenuLaterale) {
        if (isPaginaPubblica) {
            contenitoreMenuLaterale.innerHTML = `
                <a id="link_menu_pub_login" class="menu-item">Accesso</a>
                <a id="link_menu_pub_reset" class="menu-item">Reset Password</a>
                <a id="link_menu_pub_reg" class="menu-item">Registrazione</a>
                <a id="link_menu_pub_assist" class="menu-item">Assistenza</a>
            `;
            if (btnChiudi) {
                btnChiudi.classList.add('bordo-inferiore-grigio');
            }
        } else if (localStorage.getItem('driverbutler_auth_token')) {
            contenitoreMenuLaterale.innerHTML = `
                <a id="link_menu_home" class="menu-item">Pannello Utente</a>
                <a id="link_menu_bacheca" class="menu-item">Bacheca Richieste</a>
                <a id="link_menu_calendario" class="menu-item">Calendario Servizi</a>
                <a id="link_menu_dipendenti" class="menu-item">Gestione Dipendenti</a>
                <a id="link_menu_miei_servizi" class="menu-item">I Miei Servizi</a>
                <a id="link_menu_flotta" class="menu-item">Gestione Flotta</a>
                <a id="link_menu_profilo" class="menu-item">Modifica Profilo</a>
                <a id="link_menu_sicurezza" class="menu-item">Cambio Password</a>
                <a id="link_menu_assistenza" class="menu-item">Assistenza</a>
            `;
        }

        if (contenitoreMenuLaterale.innerHTML.trim() !== '') {
            const btnInstallSidebar = `<a id="btn_installa_app_sidebar" class="menu-item menu-item-azione hidden"><span>Installa App</span> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></a>`;
            const btnNotificheSidebar = `<a id="btn_attiva_notifiche_sidebar" class="menu-item menu-item-azione hidden"><span>Attiva Notifiche</span> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></a>`;
            const btnTestNotificheSidebar = localStorage.getItem('driverbutler_auth_token') ? `<a id="btn_test_notifiche_sidebar" class="menu-item">Invia notifica di controllo</a>` : '';
            contenitoreMenuLaterale.innerHTML = btnInstallSidebar + btnNotificheSidebar + contenitoreMenuLaterale.innerHTML + btnTestNotificheSidebar;
        }
    }

    const mappaPagine = {
        'link_menu_home': 'dashboard_prt.html',
        'link_menu_bacheca': 'bacheca_prt.html',
        'link_menu_miei_servizi': 'imieiservizi_prt.html',
        'link_menu_profilo': 'modprofilo_prt.html',
        'link_menu_sicurezza': 'pwcambio_prt.html',
        'link_menu_assistenza': 'assistenzalog_prt.html',
        'link_menu_pub_login': 'login_prt.html',
        'link_menu_pub_reset': 'pwreset_prt.html',
        'link_menu_pub_reg': 'registrazione_prt.html',
        'link_menu_pub_assist': 'assistenza_prt.html',
        'link_menu_flotta': 'flotta_prt.html',
        'link_menu_dipendenti': 'dipendenti_prt.html',
        'link_menu_calendario': 'calendario_prt.html'
    };

    document.querySelectorAll('.menu-item').forEach(link => {
        const urlDestinazione = mappaPagine[link.id] || link.getAttribute('href');

        if (urlDestinazione) {
            const destinazioneBase = urlDestinazione.split('?')[0].split('#')[0];
            if (destinazioneBase === paginaCorrente) {
                link.classList.add('menu-item-attiva', 'no-click');
            }
        }

        link.addEventListener('click', async function(e) {
            if (urlDestinazione && urlDestinazione !== '#') {
                e.preventDefault();

                if (sidePanel) {
                    sidePanel.classList.add('no-transition');
                    sidePanel.classList.remove('open');
                }
                if (overlay) {
                    overlay.classList.add('no-transition');
                    overlay.classList.remove('open');
                }
                document.body.classList.remove('no-scroll');

                if (typeof moduloSporco !== 'undefined' && moduloSporco) {
                    mostraModaleSalvataggio(urlDestinazione);
                    return;
                }

                if (paginaCorrente === 'bacheca_prt.html' && typeof segnaBachecaComeLetta === 'function') {
                    const barraLette = document.getElementById('bottom_bar_bacheca');
                    if (barraLette && !barraLette.classList.contains('hidden')) {
                        await segnaBachecaComeLetta(true);
                    }
                }

                window.location.href = urlDestinazione;
            }
        });
    });

    window.addEventListener('pageshow', function(event) {
        if (sidePanel) sidePanel.classList.remove('no-transition');
        if (overlay) overlay.classList.remove('no-transition');

        if (document.getElementById('formLogin')) {
            localStorage.removeItem('driverbutler_auth_token');
            if (event.persisted) {
                window.location.reload();
            }
        }
    });

    const swipeRange = document.getElementById('swipe_logout_range');
    if (swipeRange) {
        const resetSlider = () => { if (swipeRange.value < 95) swipeRange.value = 0; };
        swipeRange.addEventListener('input', function() {
            if (this.value >= 95) {
                this.value = 100;
                if (typeof esciAccount === 'function') esciAccount();
            }
        });
        swipeRange.addEventListener('change', resetSlider);
        swipeRange.addEventListener('touchend', resetSlider);
        swipeRange.addEventListener('mouseup', resetSlider);
    }

    if (deferredPrompt) mostraBottoneInstallazione();
    if (isIOS || isMacSafari) {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (!isStandalone) mostraBottoneInstallazione();
    }
    if (localStorage.getItem('driverbutler_auth_token')) {
        gestisciModaleNotifiche();
    }
}

inizializzaMenuPartner();

function allineaTendinaGoogleMaps() {
    const campoAttivo = document.activeElement;
    if (!campoAttivo || !campoAttivo.classList.contains('pac-target-input')) return;
    const rettangolo = campoAttivo.getBoundingClientRect();
    document.querySelectorAll('.pac-container').forEach(tendina => {
        if (tendina.style.display !== 'none') {
            tendina.style.setProperty('width', rettangolo.width + 'px', 'important');
            tendina.style.setProperty('left', (rettangolo.left + window.scrollX) + 'px', 'important');
        }
    });
}

const osservatoreGoogleMaps = new MutationObserver(() => {
    allineaTendinaGoogleMaps();
});

document.addEventListener('DOMContentLoaded', () => {
    osservatoreGoogleMaps.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
    });
    window.addEventListener('resize', allineaTendinaGoogleMaps);
    document.addEventListener('input', allineaTendinaGoogleMaps);
});

let validazioneNativaRitardata = false;
let attesaTastieraValidazione = false;

document.addEventListener('invalid', function(e) {
    if (validazioneNativaRitardata) return;
    e.preventDefault();

    if (!attesaTastieraValidazione) {
        attesaTastieraValidazione = true;
        const primoCampo = e.target;
        primoCampo.scrollIntoView({ behavior: 'smooth', block: 'center' });
        primoCampo.focus({ preventScroll: true });

        setTimeout(() => {
            validazioneNativaRitardata = true;
            primoCampo.reportValidity();
            validazioneNativaRitardata = false;
            attesaTastieraValidazione = false;
        }, 350);
    }
}, true);