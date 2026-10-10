(function() {
    const chiaviIsolate = ['driverbook_auth_token', 'driverbook_refresh_token', 'driverbook_ruolo', 'driverbook_last_user', 'driverbook_last_page'];
    
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
let latLngZonaOperativa = null;
let latLngProfiloZonaOperativa = null;

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

document.addEventListener("DOMContentLoaded", function() {
    localStorage.setItem('driverbook_lang', 'it');
    
    const chkRicordami = document.getElementById('ricordami');
    if (chkRicordami) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) chkRicordami.checked = true;
    }
    
    const paginaCorrenteSicurezza = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];

    if (paginaCorrenteSicurezza === 'index.html') {
        localStorage.setItem('driverbook_ruolo', 'partner');
    }

    const blacklistPubblicaAccesso = [
        'index.html',
        'login.html',
        'registrazione.html',
        'pwreset.html',
        'pwreimposta.html',
        'assistenza.html',
        'preview-schermate.html'
    ];

    if (!blacklistPubblicaAccesso.includes(paginaCorrenteSicurezza)) {
        localStorage.setItem('driverbook_last_page', window.location.href);
    }

    if (!blacklistPubblicaAccesso.includes(paginaCorrenteSicurezza) && !localStorage.getItem('driverbook_auth_token')) {
        window.location.href = 'login.html';
        return;
    } else if (!blacklistPubblicaAccesso.includes(paginaCorrenteSicurezza)) {
        rinnovaSessioneSilenziosa(); 
        setInterval(rinnovaSessioneSilenziosa, 50 * 60 * 1000); 
    }
    
    if (paginaCorrenteSicurezza === 'index.html' && localStorage.getItem('driverbook_auth_token')) {
        const ultimaPagina = localStorage.getItem('driverbook_last_page') || 'dashboard.html';
        window.location.replace(ultimaPagina);
        return;
    }

    const hashCheck = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hashCheck);

    if (hashParams.get('type') === 'email_change' || hashParams.has('error_description')) {
        const chiaviDaCancellare = [
            'driverbook_auth_token', 'driverbook_refresh_token', 'driverbook_ruolo', 'driverbook_last_user',
            'db_nome_passeggero', 'db_tel_passeggero', 'db_chk_referente', 'db_nome_referente',
            'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_partenza_lat', 'db_partenza_lng', 'db_arrivo', 'db_arrivo_lat', 'db_arrivo_lng', 'db_itinerario_previsto',
            'db_chk_hub', 'db_info_trasporto', 'db_ore', 'db_data_partenza', 'db_ora_partenza',
            'db_pax', 'db_grandi', 'db_mano', 'db_vettura', 'db_note_servizio', 'db_prezzo_stimato', 'db_prezzo_stripe'
        ];

        chiaviDaCancellare.forEach(chiave => localStorage.removeItem(chiave));

        if (hashParams.has('error') || hashParams.has('error_description')) {
            window.location.href = 'login.html?email_err=1';
        } else {
            window.location.href = 'login.html?email_changed=1';
        }
        return;
    }

    if (window.location.search.includes('email_changed=1')) {
        const msgBox = document.getElementById('messaggio_cambio_email');
        if (msgBox) {
            msgBox.classList.remove('hidden');
            const lang = localStorage.getItem('driverbook_lang') || 'it';
            msgBox.innerHTML = traduzioni[lang].msg_email_confermata || "Email confermata con successo. Effettua il login con le tue nuove credenziali.";
        }
    }

    if (window.location.search.includes('email_err=1')) {
        const msgBox = document.getElementById('messaggio_cambio_email');
        if (msgBox) {
            msgBox.classList.remove('hidden');
            msgBox.style.backgroundColor = "#ffebee";
            msgBox.style.color = "#c62828";
            msgBox.style.borderColor = "#c62828";
            const lang = localStorage.getItem('driverbook_lang') || 'it';
            msgBox.innerHTML = traduzioni[lang].msg_email_errore || "Il link di conferma è scaduto o non valido. Ripeti la procedura dal tuo profilo.";
        }
    }
	
    if (document.getElementById('formLogin') && window.location.hash.includes('access_token') && window.location.hash.includes('type=signup')) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
            localStorage.setItem('driverbook_auth_token', accessToken);
            if (refreshToken) localStorage.setItem('driverbook_refresh_token', refreshToken);
            
            window.history.replaceState(null, null, window.location.pathname);
            
            const btnSubmit = document.querySelector('#formLogin button[type="submit"]');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = localStorage.getItem('driverbook_lang') === 'en' ? "Access confirmed! Redirecting..." : "Accesso confermato! Reindirizzamento...";
                btnSubmit.style.backgroundColor = "#28a745";
                btnSubmit.style.color = "#ffffff";
            }

            const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
            
            fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + accessToken }
            })
            .then(res => res.json())
            .then(userData => {
                const userId = userData.id;
                return fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${userId}&select=id_partner`, {
                    headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + accessToken }
                });
            })
            .then(res => res.json())
            .then(datiPartner => {
                setTimeout(() => {
                    localStorage.setItem('driverbook_ruolo', 'partner');
                    window.location.href = 'dashboard.html';
                }, 2000);
            })
            .catch(errore => {
                console.error(errore);
                window.location.href = 'login.html';
            });
            return;
        }
    }

    const contenitoreMenu = document.getElementById("menu-principale");
    if (contenitoreMenu) {
        const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
        const isResetPassword = window.location.pathname.endsWith('pwreimposta.html');
        const isIndexOrReset = isIndex || isResetPassword;
        
        let linkLogo = "index.html";
        if (isResetPassword) {
            linkLogo = "javascript:void(0)";
        } else if (localStorage.getItem('driverbook_auth_token') && !isIndex) {
            linkLogo = "dashboard.html";
        }

        const paginaCorrente = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
        const bloccaClickLogo = (linkLogo === paginaCorrente) || isResetPassword;

        const iconaUtente = !isResetPassword ? `
            <button id="btn_apri_menu" class="user-icon-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </button>` : '';
        
        contenitoreMenu.innerHTML = `
        <nav class="navbar">
            <a href="${linkLogo}" class="logo-container" ${bloccaClickLogo ? 'style="pointer-events: none;"' : ''}>
                <img src="../logo/logo-bianco.png" alt="Logo DriverBook" class="logo-icon">
                <img src="../logo/scritta-bianco.png" alt="DriverBook" class="logo-text-img">
            </a>
            <div class="menu-destra" style="gap: 5px;">
                ${iconaUtente}
            </div>
        </nav>`;
    }

    const btnApri = document.getElementById('btn_apri_menu');
    const btnChiudi = document.getElementById('btn_chiudi_menu');
    const overlay = document.getElementById('menu_overlay');
    const sidePanel = document.getElementById('side_panel');

    if (sidePanel && !sidePanel.classList.contains('open')) {
        sidePanel.style.pointerEvents = 'none';
        sidePanel.style.visibility = 'hidden';
    }

    function apriMenu(e) {
        if (e) e.stopPropagation();
        if (sidePanel) {
            sidePanel.style.visibility = 'visible';
            sidePanel.style.pointerEvents = 'auto';
            sidePanel.classList.add('open');
        }
        if (overlay) {
            overlay.style.pointerEvents = 'auto';
            overlay.classList.add('open');
        }
        document.body.style.overflow = 'hidden'; 
    }

    function chiudiMenu(e) {
        if (e) e.stopPropagation();
        if (sidePanel) {
            sidePanel.classList.remove('open');
            sidePanel.style.pointerEvents = 'none';
            sidePanel.style.visibility = 'hidden';
        }
        if (overlay) {
            overlay.classList.remove('open');
            overlay.style.pointerEvents = 'none';
        }
        document.body.style.overflow = '';
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
    const percorsoCorrenteMenu = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    const blacklistPubblica = ['login.html', 'registrazione.html', 'pwreset.html', 'pwreimposta.html', 'assistenza.html'];
    const isPaginaPubblica = blacklistPubblica.includes(percorsoCorrenteMenu) || percorsoCorrenteMenu === 'index.html' || percorsoCorrenteMenu === '';
    
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
        } else if (localStorage.getItem('driverbook_auth_token')) {
            contenitoreMenuLaterale.innerHTML = `
                <a id="link_menu_home" class="menu-item">Pannello Utente</a>
                <a id="link_menu_bacheca" class="menu-item">Bacheca Richieste</a>
                <a id="link_menu_calendario" class="menu-item">Calendario Servizi</a>
                <a id="link_menu_guidatori" class="menu-item">Gestione Autisti</a>
                <a id="link_menu_viaggi" class="menu-item">I Miei Servizi</a>
                <a id="link_menu_flotta" class="menu-item">Gestione Flotta</a>
                <a id="link_menu_profilo" class="menu-item">Modifica Profilo</a>
                <a id="link_menu_sicurezza" class="menu-item">Cambio Password</a>
                <a id="link_menu_assistenza" class="menu-item">Assistenza</a>
            `;
        }
        
        if (contenitoreMenuLaterale.innerHTML.trim() !== '') {
            const btnInstallSidebar = `<a id="btn_installa_app_sidebar" class="menu-item" style="display: none; color: #00FF66; font-weight: bold; background-color: rgba(0, 255, 102, 0.05); border-bottom: 1px solid #333333;"><span>Installa App</span> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></a>`;
            contenitoreMenuLaterale.innerHTML = btnInstallSidebar + contenitoreMenuLaterale.innerHTML;
        }
    }

    const menuLinks = document.querySelectorAll('.menu-item');
    const percorsoAttuale = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];

    const mappaPagine = {
        'link_menu_home': 'dashboard.html',
        'link_menu_bacheca': 'bacheca.html',
        'link_menu_prenota': 'prenotazione.html',
        'link_menu_riepilogo': 'checkout.html',
        'link_menu_viaggi': 'viaggiprogrammati.html',
        'link_menu_storico': 'viaggistorico.html',
        'link_menu_profilo': 'modprofilo.html',
        'link_menu_sicurezza': 'pwcambio.html',
        'link_menu_assistenza': 'assistenzalog.html',
        'link_menu_pub_login': 'login.html',
        'link_menu_pub_reset': 'pwreset.html',
        'link_menu_pub_reg': 'registrazione.html',
        'link_menu_pub_assist': 'assistenza.html',
        'link_menu_flotta': 'flotta.html',
        'link_menu_guidatori': 'autisti.html',
        'link_menu_calendario': '#'
    };
    
    menuLinks.forEach(link => {
        const idLink = link.id;
        const urlDestinazione = mappaPagine[idLink] || link.getAttribute('href');
        
        if (urlDestinazione) {
            const destinazioneBase = urlDestinazione.split('?')[0].split('#')[0];
            if (destinazioneBase === percorsoAttuale) {
                link.classList.add('hidden');
            }
        }
        
        link.addEventListener('click', function(e) {
            if (urlDestinazione && urlDestinazione !== '#') {
                e.preventDefault();
                
                if (sidePanel) {
                    sidePanel.style.transition = 'none';
                    sidePanel.classList.remove('open');
                }
                if (overlay) {
                    overlay.style.transition = 'none';
                    overlay.classList.remove('open');
                }
                document.body.style.overflow = '';
                
                if (typeof moduloSporco !== 'undefined' && moduloSporco) {
                    mostraModaleSalvataggio(urlDestinazione);
                    return;
                }
                
                setTimeout(() => {
                    window.location.href = urlDestinazione;
                }, 20);
            }
        });
    });

    window.addEventListener('pageshow', function(event) {
        if (sidePanel) sidePanel.style.transition = '';
        if (overlay) overlay.style.transition = '';
        
        if (document.getElementById('formLogin')) {
            if (!window.location.hash.includes('access_token')) {
                localStorage.removeItem('driverbook_auth_token');
            }
            if (event.persisted) {
                window.location.reload();
            }
        }
    });

    const swipeRange = document.getElementById('swipe_logout_range');
    if (swipeRange) {
        const resetSlider = () => { if(swipeRange.value < 95) swipeRange.value = 0; };
        swipeRange.addEventListener('input', function() {
            if(this.value >= 95) {
                this.value = 100;
                if (typeof esciAccount === 'function') esciAccount();
            }
        });
        swipeRange.addEventListener('change', resetSlider);
        swipeRange.addEventListener('touchend', resetSlider);
        swipeRange.addEventListener('mouseup', resetSlider);
    }

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

    const inputZonaOperativa = document.getElementById('zonaOperativa');
    const inputProfiloZonaOperativa = document.getElementById('profilo_zonaOperativa');
    
    if (typeof google !== 'undefined' && google.maps && google.maps.places) {
        const confiniArea = new google.maps.LatLngBounds(
            new google.maps.LatLng(36.0, -2.0),
            new google.maps.LatLng(52.0, 18.0)
        );
        if (inputZonaOperativa) {
            const acZona = new google.maps.places.Autocomplete(inputZonaOperativa, { bounds: confiniArea, strictBounds: true });
            acZona.addListener('place_changed', function() {
                const place = acZona.getPlace();
                if (place && place.geometry) {
                    latLngZonaOperativa = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                }
            });
        }
        if (inputProfiloZonaOperativa) {
            const acProfZona = new google.maps.places.Autocomplete(inputProfiloZonaOperativa, { bounds: confiniArea, strictBounds: true });
            acProfZona.addListener('place_changed', function() {
                const place = acProfZona.getPlace();
                if (place && place.geometry) {
                    latLngProfiloZonaOperativa = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                }
            });
        }
    }

    if (document.getElementById('dash_nome_partner') || document.getElementById('profilo_nome') || document.getElementById('btn_modifica_password') || document.getElementById('form_assistenza_interna')) {
        caricaDatiDashboardPartner();
    }

    const formProfilo = document.getElementById('formModificaProfilo');
    if (formProfilo) {
        formProfilo.addEventListener('submit', function(event) {
            if (typeof aggiornaProfilo === 'function') {
                aggiornaProfilo(event);
            }
        });
    }

    const checkFattura = document.getElementById('profilo_richiedeFattura');
    if (checkFattura) {
        checkFattura.addEventListener('change', function() {
            if (typeof verificaChiusuraFatturazione === 'function') {
                verificaChiusuraFatturazione();
            }
        });
    }

    const btnAnnullaChiusura = document.getElementById('btn_annulla_chiusura');
    if (btnAnnullaChiusura) {
        btnAnnullaChiusura.addEventListener('click', function() {
            if (typeof annullaChiusuraFatturazione === 'function') {
                annullaChiusuraFatturazione();
            }
        });
    }

    const btnConfermaChiusura = document.getElementById('btn_conferma_chiusura');
    if (btnConfermaChiusura) {
        btnConfermaChiusura.addEventListener('click', function() {
            if (typeof confermaChiusuraFatturazione === 'function') {
                confermaChiusuraFatturazione();
            }
        });
    }

    const checkPush = document.getElementById('profilo_notificaPush');
    if (checkPush) {
        checkPush.addEventListener('change', function() {
            if (typeof validaNotificheDashboard === 'function') {
                validaNotificheDashboard();
            }
        });
    }

    const checkEmail = document.getElementById('profilo_notificaEmail');
    if (checkEmail) {
        checkEmail.addEventListener('change', function() {
            if (typeof validaNotificheDashboard === 'function') {
                validaNotificheDashboard();
            }
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

    const btnLogout = document.getElementById('btn_logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', function() {
            if (typeof esciAccount === 'function') {
                esciAccount();
            }
        });
    }

    const btnChiudiIos = document.getElementById('btn_chiudi_ios_popup');
    if (btnChiudiIos) {
        btnChiudiIos.addEventListener('click', function() {
            if (typeof chiudiPopupIOS === 'function') {
                chiudiPopupIOS();
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

    const inputPass = document.getElementById('password');
    const inputConfPass = document.getElementById('confermaPassword');
    if (inputPass && inputConfPass) {
        inputPass.addEventListener('input', verificaCoincidenzaPassword);
        inputConfPass.addEventListener('input', verificaCoincidenzaPassword);
    }
});

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
    const testoOriginale = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Accesso in corso...";
    
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
                throw new Error("Account non attivo. Hai confermato il link via email?");
            }
            
            throw new Error("Email o password non validi.");
        }

        const datiSessione = await risposta.json();
        const userId = datiSessione.user.id;

        const checkResponse = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${userId}&select=id_partner,linguaggio`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + datiSessione.access_token }
        });
        const datiPartner = await checkResponse.json();

        if (!datiPartner || datiPartner.length === 0) {
            throw new Error("Account non autorizzato come Partner.");
        }

        const checkRicordami = document.getElementById('ricordami');
        const usaLocalStorage = (checkRicordami && checkRicordami.checked);
        const storage = usaLocalStorage ? localStorage : sessionStorage;

        if (usaLocalStorage) {
            localStorage.setItem('driverbook_ricordami', 'true');
        } else {
            localStorage.removeItem('driverbook_ricordami');
        }

        storage.setItem('driverbook_auth_token', datiSessione.access_token);
        storage.setItem('driverbook_refresh_token', datiSessione.refresh_token);

        const ultimoUtente = localStorage.getItem('driverbook_last_user');
        if (ultimoUtente && ultimoUtente !== userId) {
            const chiaviDaCancellare = [
                'db_nome_passeggero', 'db_tel_passeggero', 'db_chk_referente', 'db_nome_referente',
                'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_partenza_lat', 'db_partenza_lng', 'db_arrivo', 'db_arrivo_lat', 'db_arrivo_lng', 'db_itinerario_previsto',
                'db_chk_hub', 'db_info_trasporto', 'db_ore', 'db_data_partenza', 'db_ora_partenza',
                'db_pax', 'db_grandi', 'db_mano', 'db_vettura', 'db_note_servizio', 'db_prezzo_stimato', 'db_prezzo_stripe'
            ];
            chiaviDaCancellare.forEach(chiave => localStorage.removeItem(chiave));
        }
        localStorage.setItem('driverbook_last_user', userId);
        
        btnSubmit.textContent = "Accesso effettuato!";
        btnSubmit.style.backgroundColor = "#28a745";
        btnSubmit.style.color = "#ffffff";
        btnSubmit.style.borderColor = "#28a745";
        
        storage.setItem('driverbook_ruolo', 'partner');
        window.location.href = 'dashboard.html';

    } catch (errore) {
        btnSubmit.textContent = errore.message;
        btnSubmit.style.backgroundColor = "#dc3545";
        btnSubmit.style.color = "#ffffff";
        btnSubmit.style.borderColor = "#dc3545";

        setTimeout(() => {
            btnSubmit.textContent = testoOriginale;
            btnSubmit.style.backgroundColor = "";
            btnSubmit.style.color = "";
            btnSubmit.style.borderColor = "";
            btnSubmit.disabled = false;
        }, 5000);
    }
}

function validaComplessitaPassword() {
    const pass = document.getElementById('password').value;
    const msgErrore = document.getElementById('errore_password');
    const regexPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

    if (!msgErrore) return true;

    if (pass.length === 0) {
        msgErrore.style.display = 'none';
        return false;
    }

    if (!regexPassword.test(pass)) {
        msgErrore.style.display = 'block';
        return false;
    } else {
        msgErrore.style.display = 'none';
        return true;
    }
}

function verificaCoincidenzaPassword() {
    const pass = document.getElementById('password').value;
    const confermaPass = document.getElementById('confermaPassword').value;
    const msgErrore = document.getElementById('errore_coincidenza');

    if (!msgErrore) return true;

    if (confermaPass.length === 0) {
        msgErrore.style.display = 'none';
        return false;
    }

    if (pass !== confermaPass) {
        msgErrore.style.display = 'block';
        return false;
    } else {
        msgErrore.style.display = 'none';
        return true;
    }
}

function validaNotifiche() {
    const notificaPush = document.getElementById('notificaPush').checked;
    const notificaEmail = document.getElementById('notificaEmail').checked;
    const msgErrore = document.getElementById('errore_notifiche');

    if (!msgErrore) return true;

    if (!notificaPush && !notificaEmail) {
        msgErrore.style.display = 'block';
        return false;
    } else {
        msgErrore.style.display = 'none';
        return true;
    }
}

function validaNotificheDashboard() {
    const notificaPush = document.getElementById('profilo_notificaPush').checked;
    const notificaEmail = document.getElementById('profilo_notificaEmail').checked;
    const msgErrore = document.getElementById('errore_notifiche_dashboard');

    if (!msgErrore) return true;

    if (!notificaPush && !notificaEmail) {
        msgErrore.style.display = 'block';
        return false;
    } else {
        msgErrore.style.display = 'none';
        return true;
    }
}

async function inviaRegistrazione(event) {
    event.preventDefault();
    const linguaAttuale = localStorage.getItem('driverbook_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    const msgErroreServer = document.getElementById('messaggio_errore_server');
    if (msgErroreServer) {
        msgErroreServer.style.display = 'none';
    }

    if (!validaComplessitaPassword() || !verificaCoincidenzaPassword() || !validaNotifiche()) {
        event.preventDefault();
        return;
    }

    let pathAssoluto = window.location.href.split('?')[0].split('#')[0];
    let urlRedirect = pathAssoluto.replace('registrazione.html', 'login.html');

    const urlAuth = `https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/signup?redirect_to=${encodeURIComponent(urlRedirect)}`;
    const urlPartner = "https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    let prefissoTel = phoneInput ? "+" + phoneInput.getSelectedCountryData().dialCode : "+39";
    let numeroDigitato = document.getElementById('telefono').value.trim();
    let telefonoFinale = (numeroDigitato.startsWith('+') ? numeroDigitato : (prefissoTel + numeroDigitato)).replace(/\s+/g, '');

    try {
        const authResponse = await fetch(urlAuth, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: email, password: password })
        });

        if (!authResponse.ok) {
            const authError = await authResponse.json();
            throw new Error(authError.msg || authError.message || "Errore nella registrazione delle credenziali");
        }

        const authData = await authResponse.json();
        const authUserId = authData.id || (authData.user && authData.user.id);

        if (!authUserId) {
            throw new Error("ID utente non ricevuto da Supabase.");
        }

        const corpoDati = {
            id_partner: authUserId,
            nome_cognome: document.getElementById('nome').value,
            email: email,
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
            notifica_push: document.getElementById('notificaPush').checked,
            notifica_email: document.getElementById('notificaEmail').checked,
            linguaggio: linguaAttuale
        };

        const dbResponse = await fetch(urlPartner, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + chiaveAnon,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            body: JSON.stringify(corpoDati)
        });

        if (!dbResponse.ok) {
            throw new Error("Errore nel salvataggio del profilo");
        }

        if (typeof svuotaBozze === 'function') svuotaBozze();
        mostraUiRegistrazioneOk('.login-wrapper');

    } catch (errore) {
        let testoErrore = errore.message;
        
        if (testoErrore.toLowerCase().includes("user already registered") || testoErrore.toLowerCase().includes("already")) {
            testoErrore = dict.js_reg_err_exists;
        } else if (testoErrore.toLowerCase().includes("sending confirmation email")) {
            testoErrore = dict.js_reg_err_email_send;
        } else {
            testoErrore = dict.js_reg_err_generic + testoErrore;
        }
        
        if (msgErroreServer) {
            msgErroreServer.textContent = testoErrore;
            msgErroreServer.style.display = 'block';
        }
    }
}

function toggleFatturazione() {
    const spunta = document.getElementById('richiedeFattura').checked;
    const sezione = document.getElementById('sezione_fatturazione');
    const campiFatturazione = [
        'ragioneSociale', 'piva_cf', 'codice_sdi', 'pec',
        'indirizzo_via', 'indirizzo_cap', 'indirizzo_citta', 'indirizzo_provincia'
    ];

    if (spunta) {
        sezione.classList.remove('hidden');
        campiFatturazione.forEach(id => document.getElementById(id).required = true);
    } else {
        sezione.classList.add('hidden');
        campiFatturazione.forEach(id => {
            const el = document.getElementById(id);
            el.required = false;
            el.value = '';
        });
    }
}

function verificaChiusuraFatturazione() {
    const spunta = document.getElementById('profilo_richiedeFattura');
    const alertBox = document.getElementById('alert_chiusura_fatturazione');

    if (!spunta.checked) {
        let haDati = false;
        const campiFatturazione = [
            'profilo_ragioneSociale', 'profilo_piva_cf', 'profilo_codice_sdi', 'profilo_pec',
            'profilo_indirizzo_via', 'profilo_indirizzo_cap', 'profilo_indirizzo_citta', 'profilo_indirizzo_provincia'
        ];

        campiFatturazione.forEach(id => {
            const el = document.getElementById(id);
            if (el && el.value.trim() !== '') {
                haDati = true;
            }
        });

        if (haDati) {
            if (alertBox) alertBox.classList.remove('hidden');
        } else {
            if (alertBox) alertBox.classList.add('hidden');
            toggleFatturazioneProfiloReale(false);
        }
    } else {
        if (alertBox) alertBox.classList.add('hidden');
        toggleFatturazioneProfiloReale(true);
    }
}

function annullaChiusuraFatturazione() {
    document.getElementById('profilo_richiedeFattura').checked = true;
    document.getElementById('alert_chiusura_fatturazione').classList.add('hidden');
    toggleFatturazioneProfiloReale(true);
}

function confermaChiusuraFatturazione() {
    document.getElementById('profilo_richiedeFattura').checked = false;
    document.getElementById('alert_chiusura_fatturazione').classList.add('hidden');

    const campiFatturazione = [
        'profilo_ragioneSociale', 'profilo_piva_cf', 'profilo_codice_sdi', 'profilo_pec',
        'profilo_indirizzo_via', 'profilo_indirizzo_cap', 'profilo_indirizzo_citta', 'profilo_indirizzo_provincia'
    ];

    campiFatturazione.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = '';
    });

    toggleFatturazioneProfiloReale(false);
}

function toggleFatturazioneProfiloReale(stato) {
    const sezione = document.getElementById('sezione_fatturazione_profilo');
    const campiFatturazione = [
        'profilo_ragioneSociale', 'profilo_piva_cf', 'profilo_codice_sdi', 'profilo_pec',
        'profilo_indirizzo_via', 'profilo_indirizzo_cap', 'profilo_indirizzo_citta', 'profilo_indirizzo_provincia'
    ];

    if (stato) {
        sezione.classList.remove('hidden');
        campiFatturazione.forEach(id => document.getElementById(id).required = true);
    } else {
        sezione.classList.add('hidden');
        campiFatturazione.forEach(id => {
            const el = document.getElementById(id);
            el.required = false;
        });
    }
}

async function caricaDatiDashboardPartner() {
    const token = localStorage.getItem('driverbook_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const userData = await userRes.json();
        if (!userRes.ok) throw new Error("Token non valido");

        const userId = userData.id;

        const dbRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${userId}`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const dbData = await dbRes.json();

        if (dbData && dbData.length > 0) {
            const partner = dbData[0];
            
            if (document.getElementById('dash_nome_partner')) {
                document.getElementById('dash_nome_partner').textContent = partner.nome_cognome;
            }
            if (document.getElementById('dash_codice_partner')) {
                document.getElementById('dash_codice_partner').textContent = partner.codice_partner;
            }

            if (document.getElementById('profilo_nome')) {
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
                if (document.getElementById('profilo_zonaOperativa')) document.getElementById('profilo_zonaOperativa').value = partner.zona_operativa || '';

                if (document.getElementById('profilo_notificaPush')) document.getElementById('profilo_notificaPush').checked = partner.notifica_push;
                if (document.getElementById('profilo_notificaEmail')) document.getElementById('profilo_notificaEmail').checked = partner.notifica_email;
            }
            
            if (typeof applicaBozze === 'function') applicaBozze();

        } else {
            esciAccount();
        }
    } catch (error) {
        localStorage.removeItem('driverbook_auth_token');
        window.location.href = 'login.html';
    }
}

async function aggiornaProfilo(event) {
    event.preventDefault();

    if (!validaNotificheDashboard()) {
        return;
    }

    const btnSubmit = document.querySelector('#formModificaProfilo button[type="submit"]');
    const testoOriginale = btnSubmit.textContent;
    btnSubmit.disabled = true;

    const alertBox = document.getElementById('alert_chiusura_fatturazione');
    if (alertBox && alertBox.style.display === 'block') {
        btnSubmit.textContent = "Conferma disattivazione P.IVA prima di salvare!";
        btnSubmit.style.backgroundColor = "#FF4444";
        btnSubmit.style.color = "#ffffff";
        btnSubmit.style.borderColor = "#FF4444";

        setTimeout(() => {
            btnSubmit.textContent = testoOriginale;
            btnSubmit.style.backgroundColor = "";
            btnSubmit.style.color = "";
            btnSubmit.style.borderColor = "";
            btnSubmit.disabled = false;
        }, 5000);
        return;
    }

    btnSubmit.textContent = "Salvataggio in corso...";

    const token = localStorage.getItem('driverbook_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const userData = await userRes.json();
        const userId = userData.id;

        let prefissoTel = "+" + itiProfiloPartner.getSelectedCountryData().dialCode;
        let numeroDigitato = document.getElementById('profilo_telefono').value.trim();
        let telefonoFinale = (numeroDigitato.startsWith('+') ? numeroDigitato : (prefissoTel + numeroDigitato)).replace(/\s+/g, '');

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
            zona_operativa: document.getElementById('profilo_zonaOperativa').value,
            notifica_push: document.getElementById('profilo_notificaPush').checked,
            notifica_email: document.getElementById('profilo_notificaEmail').checked
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
        
        const nuovaEmail = document.getElementById('profilo_email').value;
        if (nuovaEmail !== userData.email) {
            let urlRedirect = "https://mauy81.github.io/driverbook-test/partner/login.html";
            if (window.location.protocol !== 'file:') {
                let pathAssoluto = window.location.href.split('?')[0].split('#')[0];
                urlRedirect = pathAssoluto.substring(0, pathAssoluto.lastIndexOf('/')) + '/login.html';
            }
            
            const emailRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user?redirect_to=${encodeURIComponent(urlRedirect)}`, {
                method: "PUT",
                headers: {
                    "apikey": chiaveAnon,
                    "Authorization": "Bearer " + token,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: nuovaEmail })
            });
            
            if (!emailRes.ok) {
                const errEmail = await emailRes.json();
                const stringaErrore = JSON.stringify(errEmail).toLowerCase();
                
                if (emailRes.status === 422 || stringaErrore.includes("already") || stringaErrore.includes("registered") || stringaErrore.includes("exists")) {
                    throw new Error("EMAIL_ESISTENTE");
                }
                throw new Error("Errore email generico");
            }
            
            if (typeof svuotaBozze === 'function') svuotaBozze();
            const titoloFeedback = `<h2 class="feedback-titolo feedback-titolo-successo">Email aggiornata!</h2>`;
            const msgFeedback = `<p class="feedback-testo">Controlla la nuova casella di posta e clicca il link per confermare l'indirizzo. Per sicurezza, verrai scollegato.</p>`;
            
            mostraSchermataFeedback('successo', '.login-wrapper', titoloFeedback, msgFeedback);

            const chiaviDaCancellare = [
                'driverbook_auth_token', 'driverbook_refresh_token', 'driverbook_ruolo', 'driverbook_last_user',
                'db_nome_passeggero', 'db_tel_passeggero', 'db_chk_referente', 'db_nome_referente',
                'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_partenza_lat', 'db_partenza_lng', 'db_arrivo', 'db_arrivo_lat', 'db_arrivo_lng', 'db_itinerario_previsto',
                'db_chk_hub', 'db_info_trasporto', 'db_ore', 'db_data_partenza', 'db_ora_partenza',
                'db_pax', 'db_grandi', 'db_mano', 'db_vettura', 'db_note_servizio', 'db_prezzo_stimato', 'db_prezzo_stripe'
            ];
            chiaviDaCancellare.forEach(chiave => localStorage.removeItem(chiave));
            
            return;
        } else {
            if (typeof svuotaBozze === 'function') svuotaBozze();
            btnSubmit.textContent = "Modifiche salvate con successo!";
            btnSubmit.style.backgroundColor = "#00FF66";
            btnSubmit.style.color = "#000000";
            btnSubmit.style.borderColor = "#00FF66";

            setTimeout(() => {
                btnSubmit.textContent = testoOriginale;
                btnSubmit.style.backgroundColor = "";
                btnSubmit.style.color = "";
                btnSubmit.style.borderColor = "";
                btnSubmit.disabled = false;
            }, 5000);
            
            caricaDatiDashboardPartner();
        }
    } catch (errore) {
        let msgErrore = "Errore durante il salvataggio. Riprova.";
        
        if (errore.message === "EMAIL_ESISTENTE") {
            msgErrore = "La mail scelta è già registrata.";
        }

        btnSubmit.textContent = msgErrore;
        btnSubmit.style.backgroundColor = "#dc3545";
        btnSubmit.style.color = "#ffffff";
        btnSubmit.style.borderColor = "#dc3545";

        setTimeout(() => {
            btnSubmit.textContent = testoOriginale;
            btnSubmit.style.backgroundColor = "";
            btnSubmit.style.color = "";
            btnSubmit.style.borderColor = "";
            btnSubmit.disabled = false;
        }, 5000);
    }
}

async function modificaPassword() {
    const btn = document.getElementById('btn_modifica_password');
    if (!btn) return;

    const ruoloSalvato = localStorage.getItem('driverbook_ruolo');
    if (ruoloSalvato !== 'partner') {
        esciAccount();
        return;
    }

    const testoOriginale = btn.textContent;
    btn.textContent = "Invio richiesta...";
    btn.disabled = true;

    const token = localStorage.getItem('driverbook_auth_token');
    let pathAssoluto = window.location.href.split('?')[0].split('#')[0];
    let redirectUrl = pathAssoluto.substring(0, pathAssoluto.lastIndexOf('/')) + '/pwreimposta.html';
    const urlRecover = `https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/recover?redirect_to=${encodeURIComponent(redirectUrl)}`;
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        let emailUtente = "";
        const emailInput = document.getElementById('profilo_email');
        
        if (emailInput && emailInput.value) {
            emailUtente = emailInput.value;
        } else if (token) {
            const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
            });
            if (userRes.ok) {
                const userData = await userRes.json();
                emailUtente = userData.email;
            }
        }

        if (!emailUtente) throw new Error("Email non trovata");

        const risposta = await fetch(urlRecover, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: emailUtente })
        });

        if (!risposta.ok) {
            throw new Error("Errore durante l'invio della richiesta");
        }

        const titolo = `<h2 class="feedback-titolo feedback-titolo-successo">Richiesta Ricevuta</h2>`;
        const messaggio = `<p class="feedback-testo">Riceverai a breve un'email con il link da cliccare per creare la nuova password.</p>`;
        
        mostraSchermataFeedback('successo', '.login-wrapper', titolo, messaggio);

        setTimeout(() => {
            if (typeof esciAccount === 'function') {
                esciAccount();
            } else {
                window.location.href = 'index.html';
            }
        }, 5000);

    } catch (errore) {
        console.error(errore);
        btn.textContent = "Errore di invio";
        btn.style.backgroundColor = "#dc3545"; 
        
        setTimeout(() => {
            btn.textContent = testoOriginale;
            btn.style.backgroundColor = "";
            btn.disabled = false;
        }, 5000);
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

    const testoOriginale = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Invio in corso...";

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
        alert("Errore durante l'invio. Riprova più tardi.");
        btnSubmit.disabled = false;
        btnSubmit.textContent = testoOriginale;
    }
}

function esciAccount() {
    const chiaviDaCancellare = [
        'driverbook_auth_token', 'driverbook_refresh_token', 'driverbook_ruolo', 'driverbook_last_user', 'driverbook_last_page',
        'db_nome_passeggero', 'db_tel_passeggero', 'db_chk_referente', 'db_nome_referente',
        'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_partenza_lat', 'db_partenza_lng', 'db_arrivo', 'db_arrivo_lat', 'db_arrivo_lng', 'db_itinerario_previsto',
        'db_chk_hub', 'db_info_trasporto', 'db_ore', 'db_data_partenza', 'db_ora_partenza',
        'db_pax', 'db_grandi', 'db_mano', 'db_vettura', 'db_note_servizio', 'db_prezzo_stimato', 'db_prezzo_stripe'
    ];
    chiaviDaCancellare.forEach(chiave => {
        localStorage.removeItem(chiave);
        sessionStorage.removeItem(chiave);
    });
    window.location.href = 'index.html';
}

document.addEventListener("DOMContentLoaded", function() {
    if (document.getElementById('formResetPassword') || document.getElementById('btn_salva_password')) {
        const hash = window.location.hash;
        let accessToken = null;
        
        if (hash) {
            const hashParams = new URLSearchParams(hash.substring(1));
            accessToken = hashParams.get('access_token');
        }

        if (accessToken) {
            localStorage.setItem('driverbook_temp_recovery_token', accessToken);
            window.history.replaceState(null, null, window.location.pathname);
        } else if (!localStorage.getItem('driverbook_temp_recovery_token')) {
            mostraUiLinkScaduto('.login-wrapper');
        }
    }
});

async function richiediResetPassword(event) {
    event.preventDefault();

    const email = document.getElementById('email_recupero').value.trim();
    const btn = document.getElementById('btn_invia_recupero');

    const testoOriginale = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Elaborazione in corso...";

    let pathAssoluto = window.location.href.split('?')[0].split('#')[0];
    let redirectUrl = pathAssoluto.substring(0, pathAssoluto.lastIndexOf('/')) + '/pwreimposta.html';
    const urlRecover = `https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/recover?redirect_to=${encodeURIComponent(redirectUrl)}`;
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

        mostraUiResetRicevuto('.login-wrapper');

    } catch (errore) {
        btn.textContent = "Errore di connessione. Riprova.";
        btn.style.backgroundColor = "#dc3545";
        btn.style.color = "#ffffff";
        btn.style.borderColor = "#dc3545";
        
        setTimeout(() => {
            btn.textContent = testoOriginale;
            btn.style.backgroundColor = "";
            btn.style.color = "";
            btn.style.borderColor = "";
            btn.disabled = false;
        }, 5000);
    }
}

async function inviaNuovaPassword(event) {
    event.preventDefault();

    const msgErroreServer = document.getElementById('messaggio_errore_server');
    if (msgErroreServer) msgErroreServer.style.display = 'none';

    if (!validaComplessitaPassword() || !verificaCoincidenzaPassword()) {
        return;
    }

    const nuovaPassword = document.getElementById('password').value;
    const accessToken = localStorage.getItem('driverbook_temp_recovery_token');

    if (!accessToken) {
        if (msgErroreServer) {
            msgErroreServer.textContent = "Sessione scaduta o token mancante. Richiedi un nuovo link.";
            msgErroreServer.style.display = 'block';
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 5000);
        } else {
            window.location.href = 'index.html';
        }
        return;
    }

    const btnSubmit = document.getElementById('btn_salva_password');
    const testoOriginale = btnSubmit.textContent;
    btnSubmit.textContent = "Salvataggio in corso...";
    btnSubmit.disabled = true;

    const urlUpdate = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const risposta = await fetch(urlUpdate, {
            method: "PUT",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + accessToken,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password: nuovaPassword })
        });

        if (!risposta.ok) {
            const datiErrore = await risposta.json();
            if (datiErrore.error_code === "same_password") {
                throw new Error("La nuova password digitata è uguale all'attuale, non hai bisogno di reimpostarla.");
            }
            throw new Error("Impossibile aggiornare la password. Link scaduto o errore server.");
        }

        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + accessToken }
        });
        const userData = await userRes.json();
        const emailUtente = userData.email;

        localStorage.removeItem('driverbook_temp_recovery_token');

        const urlLogin = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/token?grant_type=password";
        const loginRes = await fetch(urlLogin, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ email: emailUtente, password: nuovaPassword })
        });

        if (loginRes.ok) {
            const datiSessione = await loginRes.json();
            localStorage.setItem('driverbook_auth_token', datiSessione.access_token);
            localStorage.setItem('driverbook_refresh_token', datiSessione.refresh_token);
        } else {
            localStorage.setItem('driverbook_auth_token', accessToken);
        }

        localStorage.setItem('driverbook_ruolo', 'partner');

        btnSubmit.textContent = "Password aggiornata! Accesso in corso...";
        btnSubmit.style.backgroundColor = "#28a745";

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (errore) {
        console.error(errore);
        btnSubmit.textContent = testoOriginale;
        btnSubmit.disabled = false;
        if (msgErroreServer) {
            msgErroreServer.textContent = errore.message;
            msgErroreServer.style.display = 'block';
            
            setTimeout(() => {
                msgErroreServer.style.display = 'none';
            }, 5000);
        }
    }
}

if ('serviceWorker' in navigator) {
    let swPath = window.location.pathname.includes('driverbook-test') ? '/driverbook-test/partner/service-worker.js' : '/partner/service-worker.js';
    navigator.serviceWorker.register(swPath)
        .catch(errore => console.log('Registrazione SW fallita: ', errore));
}

let deferredPrompt;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isMacSafari = /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

function mostraBottoneInstallazione() {
    const btnDynamic = document.getElementById('btn_installa_app_sidebar');
    if (btnDynamic) btnDynamic.style.setProperty('display', 'flex', 'important');
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
            if (outcome === 'accepted') e.target.style.display = 'none';
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
        testoPopup = "Per ricevere le notifiche push in tempo reale e utilizzare DriverBook al 100% delle sue funzioni, è necessario salvare l'app sul dispositivo.<br><br>Clicca su <strong>File</strong> nella barra in alto di Safari e seleziona <strong>Aggiungi al Dock</strong>.";
    } else {
        testoPopup = "Per ricevere le notifiche push in tempo reale e utilizzare DriverBook al 100% delle sue funzioni, è necessario salvare l'app sul dispositivo.<br><br>Tocca l'icona Condividi <svg width=\"18\" height=\"18\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" style=\"vertical-align: middle; margin: 0 4px;\"><path d=\"M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8\"></path><polyline points=\"16 6 12 2 8 6\"></polyline><line x1=\"12\" y1=\"2\" x2=\"12\" y2=\"15\"></line></svg> nella barra del browser e seleziona <strong>Aggiungi alla schermata Home</strong>.";
    }

    popup.innerHTML = `
        <span class="close-popup" id="btn_chiudi_apple_popup">&times;</span>
        <p>${testoPopup}</p>
    `;

    popup.style.display = 'block';

    document.getElementById('btn_chiudi_apple_popup').onclick = function() {
        popup.style.display = 'none';
    };
}

async function inviaAssistenzaInterna(event) {
    event.preventDefault();
    
    const honeypot = document.getElementById('azienda_hp_interna').value;
    if (honeypot) return;

    const messaggioUtente = document.getElementById('testo_assistenza_interna').value.trim();
    const btnSubmit = document.querySelector('#form_assistenza_interna button[type="submit"]');

    const testoOriginale = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = "Invio in corso...";

    const token = localStorage.getItem('driverbook_auth_token');
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

        const checkPartner = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/partner?id_partner=eq.${userId}&select=nome_cognome,codice_partner`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const datiPartner = await checkPartner.json();
        if (datiPartner && datiPartner.length > 0) {
            nomeUtente = datiPartner[0].nome_cognome || "N/A";
            codiceCliente = datiPartner[0].codice_partner || "N/A";
        }

        const messaggioArricchito = `Codice Partner: ${codiceCliente}\nNome: ${nomeUtente}\n\nRichiesta:\n${messaggioUtente}`;

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
        const bottone = `<a data-href="dashboard.html" class="btn btn-primary btn-full">Vai al Pannello Utente</a>`;
        
        mostraSchermataFeedback('successo', '.login-wrapper', titolo, messaggio, bottone);

    } catch (errore) {
        alert("Errore durante l'invio. Riprova più tardi.");
        btnSubmit.disabled = false;
        btnSubmit.textContent = testoOriginale;
    }
}

let moduloSporco = false;

document.addEventListener("DOMContentLoaded", function() {
    document.body.addEventListener('input', function(e) {
        if (e.target.id === 'swipe_logout_range' || e.target.closest('#formLogin')) {
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
            link.style.cursor = 'pointer';
        }
    });

    document.body.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        
        if (!link) return;
        
        const destinazione = link.getAttribute('data-href') || link.getAttribute('href');

        if (!destinazione || destinazione === '#' || destinazione.startsWith('mailto:')) {
            return;
        }

        e.preventDefault();

        const pathAttuale = window.location.pathname.split('/').pop();

        if (typeof moduloSporco !== 'undefined' && moduloSporco && pathAttuale !== 'login.html') {
            mostraModaleSalvataggio(destinazione);
        } else {
            window.location.href = destinazione;
        }
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
                <button id="btn_annulla_uscita" class="btn-modale-bianco">RESTA QUI</button>
                <button id="btn_conferma_uscita" class="btn-modale-bianco">ESCI E PERDI</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('btn_annulla_uscita').addEventListener('click', function() {
            overlay.style.display = 'none';
        });
    }
    
    overlay.style.display = 'flex';
    
    document.getElementById('btn_conferma_uscita').onclick = function() {
        moduloSporco = false;
        window.location.href = destinazione;
    };
}

async function rinnovaSessioneSilenziosa() {
    const refreshToken = localStorage.getItem('driverbook_refresh_token');
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
            localStorage.setItem('driverbook_auth_token', nuoviDati.access_token);
            localStorage.setItem('driverbook_refresh_token', nuoviDati.refresh_token);
            console.log("Sessione rinnovata con successo dietro le quinte.");
        } else {
            console.warn("Impossibile rinnovare la sessione. Disconnessione imminente.");
            esciAccount();
        }
    } catch (errore) {
        console.error("Errore di rete durante il rinnovo:", errore);
    }
}

function mostraUiRegistrazioneOk(containerId) {
    const titolo = `<h2 class="feedback-titolo feedback-titolo-successo">Registrazione Completata!</h2>`;
    const messaggio = `<p class="feedback-testo">Ti abbiamo inviato un'email. Vai nella tua casella di posta e clicca sul link per attivare il tuo account.</p>`;
    mostraSchermataFeedback('successo', containerId, titolo, messaggio);
}

function mostraUiResetRicevuto(containerId) {
    const titolo = `<h2 class="feedback-titolo feedback-titolo-successo">Richiesta Ricevuta</h2>`;
    const messaggio = `<p class="feedback-testo">Se l'indirizzo inserito corrisponde ad un account registrato, riceverai a breve un'email con il link da cliccare per creare la nuova password.</p>`;
    mostraSchermataFeedback('successo', containerId, titolo, messaggio);
}

function mostraUiAssistenzaOk(containerId) {
    const titolo = `<h2 class="feedback-titolo feedback-titolo-successo">Richiesta Inviata</h2>`;
    const messaggio = `<p class="feedback-testo">Abbiamo ricevuto il tuo messaggio. Il nostro team ti risponderà al più presto all'indirizzo email che ci hai fornito.</p>`;
    const bottone = `<a data-href="index.html" class="btn btn-primary btn-full">Torna alla Home</a>`;
    mostraSchermataFeedback('successo', containerId, titolo, messaggio, bottone);
}

function mostraUiLinkScaduto(containerId) {
    const titolo = `<h2 class="feedback-titolo feedback-titolo-errore">Link Scaduto</h2>`;
    const messaggio = `<p class="feedback-testo">Il link per la reimpostazione della password non è più valido o è già stato utilizzato.</p>`;
    const bottone = `<a data-href="pwreset.html" class="btn btn-primary btn-full">Richiedi Nuovo Link</a>`;
    mostraSchermataFeedback('errore', containerId, titolo, messaggio, bottone);
}

function mostraSchermataFeedback(tipo, containerId, htmlTitolo, htmlMessaggio, htmlBottone = '') {
    const menuPrincipale = document.getElementById('menu-principale');
    if (menuPrincipale) {
        menuPrincipale.style.display = 'none';
    }

    let colore = tipo === 'errore' ? '#dc3545' : '#00FF66';
    let icona = tipo === 'errore' 
        ? '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>'
        : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline>';

    let layoutHtml = `
        <div class="login-wrapper">
            <div class="schermata-feedback">
                <svg class="feedback-icona" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="${colore}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icona}</svg>
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
            wrapper.style.display = 'block';
        }
    }
}

document.addEventListener("DOMContentLoaded", function() {
    const btnApri = document.getElementById('barra_aggiungi_veicolo');
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
        document.querySelector('.login-wrapper').style.setProperty('padding-bottom', '40px', 'important');
        window.scrollTo(0, 0);
    }

    function chiudiForm() {
        formContainer.classList.add('hidden');
        btnApri.classList.remove('hidden');
        elencoVeicoli.classList.remove('hidden');
        document.querySelector('.login-wrapper').style.setProperty('padding-bottom', '0px', 'important');
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
        if (this.value === 'CLASSE_V') {
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
        const testoOriginale = btnSalva.textContent;
        btnSalva.disabled = true;
        btnSalva.textContent = "SALVATAGGIO...";

        const token = localStorage.getItem('driverbook_auth_token');
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
            
            let targaValue = targaPulita.substring(0, 2) + ' ' + targaPulita.substring(2, 5) + ' ' + targaPulita.substring(5, 7);

            const corpoDati = {
                id_partner: userData.id,
                modello: selectModello.value,
                posti: selectModello.value === 'CLASSE_V' ? parseInt(selectPosti.value) : null,
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

            chiudiForm();
            caricaFlotta();
            
        } catch (errore) {
            let testoErrore = "Si è verificato un errore durante il salvataggio.";
            if (errore.message === "TARGA_ESISTENTE") {
                testoErrore = "Questa targa è già presente nel sistema.";
            } else if (errore.message === "FORMATO_TARGA_ERRATO") {
                testoErrore = "Formato targa non valido.<br><span style='font-size: 0.85em; color: #aaaaaa;'>Inserisci 2 lettere, 3 numeri e 2 lettere (es. AB 123 CD).</span>";
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
            overlay.style.display = 'flex';
            
            setTimeout(() => {
                overlay.style.display = 'none';
            }, 5000);

            btnSalva.textContent = testoOriginale;
            btnSalva.disabled = false;
            return;
        }
        
        btnSalva.textContent = testoOriginale;
        btnSalva.disabled = false;
    });
});

async function caricaFlotta() {
    const contenitore = document.getElementById('sezione_elenco_veicoli');
    if (!contenitore) return;
    
    contenitore.innerHTML = '<div style="text-align: center; color: #888888; padding: 20px;">Caricamento flotta in corso...</div>';
    
    const token = localStorage.getItem('driverbook_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const userData = await userRes.json();

        const res = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/veicoli_flotta?id_partner=eq.${userData.id}`, {
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token
            }
        });
        
        if (!res.ok) throw new Error("Errore lettura flotta");
        
        const veicoli = await res.json();
        contenitore.innerHTML = '';
        
        if (veicoli.length === 0) {
            contenitore.innerHTML = '<div style="text-align: center; color: #888888; padding: 20px;">Nessun veicolo presente nella flotta.</div>';
            return;
        }
        
        veicoli.sort((a, b) => {
            const ordineModello = { 'CLASSE_V': 1, 'CLASSE_E': 2, 'CLASSE_S': 3 };
            if (ordineModello[a.modello] !== ordineModello[b.modello]) {
                return ordineModello[a.modello] - ordineModello[b.modello];
            }
            if (a.modello === 'CLASSE_V' && a.posti !== b.posti) {
                return b.posti - a.posti;
            }
            return a.targa.localeCompare(b.targa);
        });

        veicoli.forEach(v => {
            generaCardVeicolo(v.modello, v.posti, v.targa);
        });
        
    } catch (errore) {
        contenitore.innerHTML = '<div style="text-align: center; color: #dc3545; padding: 20px;">Impossibile caricare la flotta. Riprova più tardi.</div>';
    }
}

function chiediConfermaEliminazioneVeicolo(targa) {
    let overlay = document.getElementById('modale_eliminazione_veicolo');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modale_eliminazione_veicolo';
        overlay.className = 'modale-overlay';
        
        let modal = document.createElement('div');
        modal.className = 'modale-box';
        
        modal.innerHTML = `
            <h3 class="modale-titolo">Elimina Veicolo</h3>
            <p class="modale-testo">Vuoi davvero eliminare questo veicolo dalla flotta?<br><strong class="targa-evidenza">${targa}</strong></p>
            <div class="modale-bottoni-container">
                <button id="btn_annulla_eliminazione" class="btn-modale-bianco">NO</button>
                <button id="btn_conferma_eliminazione" class="btn-modale-bianco">SI</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('btn_annulla_eliminazione').addEventListener('click', function() {
            overlay.style.display = 'none';
        });
    } else {
        overlay.querySelector('.targa-evidenza').innerText = targa;
    }
    
    overlay.style.display = 'flex';
    
    const btnConferma = document.getElementById('btn_conferma_eliminazione');
    
    const nuovoBtnConferma = btnConferma.cloneNode(true);
    btnConferma.parentNode.replaceChild(nuovoBtnConferma, btnConferma);
    
    nuovoBtnConferma.addEventListener('click', async function() {
        nuovoBtnConferma.disabled = true;
        nuovoBtnConferma.textContent = "...";
        
        const token = localStorage.getItem('driverbook_auth_token');
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
                overlay.style.display = 'none';
                const cardDaRimuovere = document.querySelector(`.vettura-card[data-targa="${targa}"]`);
                if(cardDaRimuovere) {
                    cardDaRimuovere.remove();
                }
                const contenitore = document.getElementById('sezione_elenco_veicoli');
                if (contenitore && contenitore.children.length === 0) {
                    contenitore.innerHTML = '<div style="text-align: center; color: #888888; padding: 20px;">Nessun veicolo presente nella flotta.</div>';
                }
            }
        } catch (err) {
            console.error(err);
        }
        
        nuovoBtnConferma.disabled = false;
        nuovoBtnConferma.textContent = "SI";
    });
}

function generaCardVeicolo(modello, posti, targa) {
    const contenitore = document.getElementById('sezione_elenco_veicoli');
    if (!contenitore) return;

    let classeVettura = '';
    let testoPosti = '';
    
    if (modello === 'CLASSE_V') {
        classeVettura = 'V';
        testoPosti = `VAN ${posti} POSTI`;
    } else if (modello === 'CLASSE_E') {
        classeVettura = 'E';
    } else if (modello === 'CLASSE_S') {
        classeVettura = 'S';
    }

    const divPosti = classeVettura === 'V' 
        ? `<div class="testo-card-veicolo"><span class="testo-label">${testoPosti}</span></div>` 
        : '';

    const htmlCard = `
        <div class="vettura-card vettura-card-mini" data-targa="${targa}">
            <div class="card-flex-container">
                <div class="testo-card-veicolo"><span class="testo-label">CLASSE</span> <span class="testo-valore">${classeVettura}</span></div>
                ${divPosti}
            </div>
            <div class="card-flex-container">
                <div class="testo-card-veicolo"><span class="testo-valore">${targa}</span></div>
                <div class="btn-elimina-veicolo" onclick="chiediConfermaEliminazioneVeicolo('${targa}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </div>
            </div>
        </div>
    `;

    contenitore.insertAdjacentHTML('beforeend', htmlCard);
}

window.applicaBozze = function() {
    const blacklistPagineAutosave = ['login.html', 'pwreset.html', 'pwreimposta.html', 'index.html'];
    const paginaAutosave = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    const prefix = 'prt_';

    if (!blacklistPagineAutosave.includes(paginaAutosave)) {
        document.querySelectorAll('input:not([type="password"]):not([type="hidden"]):not([type="file"]), textarea, select').forEach(campo => {
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
                }
            }
        });
    }
};

document.addEventListener("DOMContentLoaded", function() {
    const blacklistPagineAutosave = ['login.html', 'pwreset.html', 'pwreimposta.html', 'index.html'];
    const paginaAutosave = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    const prefix = 'prt_';

    if (!blacklistPagineAutosave.includes(paginaAutosave)) {
        if (typeof applicaBozze === 'function') applicaBozze();

        document.body.addEventListener('input', function(e) {
            const campo = e.target;
            if (campo.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(campo.tagName) && campo.id) {
                if (campo.type !== 'password' && campo.type !== 'hidden' && campo.type !== 'file') {
                    const valore = (campo.type === 'checkbox' || campo.type === 'radio') ? campo.checked : campo.value;
                    localStorage.setItem(`${prefix}db_draft_${paginaAutosave}_${campo.id}`, valore);
                }
            }
        });
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

window.addEventListener('beforeunload', function(e) {
    if (localStorage.getItem('driverbook_ricordami') !== 'true') {
        const prefix = getPrefissoApp();
        const chiaviDaCancellare = [
            'driverbook_auth_token', 'driverbook_refresh_token', 'driverbook_ruolo', 'driverbook_last_user', 'driverbook_last_page',
            'db_nome_passeggero', 'db_tel_passeggero', 'db_chk_referente', 'db_nome_referente',
            'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_partenza_lat', 'db_partenza_lng', 'db_arrivo', 'db_arrivo_lat', 'db_arrivo_lng', 'db_itinerario_previsto',
            'db_chk_hub', 'db_info_trasporto', 'db_ore', 'db_data_partenza', 'db_ora_partenza',
            'db_pax', 'db_grandi', 'db_mano', 'db_vettura', 'db_note_servizio', 'db_prezzo_stimato', 'db_prezzo_stripe'
        ];
        chiaviDaCancellare.forEach(chiave => {
            sessionStorage.removeItem(prefix + chiave);
            sessionStorage.removeItem(chiave); 
        });
    }
});