let phoneInput;
let itiPasseggero, itiReferente, itiProfiloPasseggero;
let latLngPartenza = null;
let latLngArrivo = null;

const CONFIG_TARIFFE = {
    CLASSE_E: { allAlKm: 2.00, oraDisposizione: 70.00, corsaMinima: 70.00 },
    CLASSE_V: { allAlKm: 2.45, oraDisposizione: 90.00, corsaMinima: 90.00 },
    CLASSE_S: { allAlKm: 4.00, oraDisposizione: 120.00, corsaMinima: 120.00 }
};

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

document.addEventListener("DOMContentLoaded", function() {
    const paginaCorrenteSicurezza = window.location.pathname.split('/').pop() || 'index.html';
    const blacklistPubblicaAccesso = [
        'index.html',
        'login-passeggero.html',
        'registrazione-passeggero.html',
        'reset-password.html',
        'reimposta-password.html',
        'assistenza.html'
    ];

    if (!blacklistPubblicaAccesso.includes(paginaCorrenteSicurezza) && !localStorage.getItem('driverbook_auth_token')) {
        window.location.href = 'login-passeggero.html';
        return;
    } else if (!blacklistPubblicaAccesso.includes(paginaCorrenteSicurezza)) {
        rinnovaSessioneSilenziosa(); 
        setInterval(rinnovaSessioneSilenziosa, 50 * 60 * 1000); 
    }

    if (window.location.hash.includes('type=email_change')) {
        localStorage.removeItem('driverbook_auth_token');
        const urlAttuale = window.location.href.toLowerCase();
        const destinazioneLogin = urlAttuale.includes('autista') ? 'login-autista-amministrativo.html' : 'login-passeggero.html';
        window.location.href = destinazioneLogin + '?email_changed=1';
        return;
    }

    if (window.location.search.includes('email_changed=1')) {
        const msgBox = document.getElementById('messaggio_cambio_email');
        if (msgBox) msgBox.classList.remove('hidden');
    }

    const contenitoreMenu = document.getElementById("menu-principale");
    if (contenitoreMenu) {
        const isIndex = window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/');
        const isResetPassword = window.location.pathname.endsWith('reimposta-password.html');
        const isIndexOrReset = isIndex || isResetPassword;
        
        let linkLogo = "index.html";
        if (isResetPassword) {
            linkLogo = "javascript:void(0)";
        } else if (localStorage.getItem('driverbook_auth_token') && !isIndex) {
            linkLogo = window.location.pathname.includes('autista') ? 'dashboard-autista-amministrativo.html' : 'dashboard-passeggero.html';
        }

        const paginaCorrente = window.location.pathname.split('/').pop() || 'index.html';
        const bloccaClickLogo = (linkLogo === paginaCorrente) || isResetPassword;

        const iconaUtente = !isIndexOrReset ? `
            <button id="btn_apri_menu" class="user-icon-btn">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </button>` : '';
            
        const btnInstallaApp = !isResetPassword ? `<button id="btn_installa_app" class="nav-btn btn-install-app">Installa App</button>` : '';

        contenitoreMenu.innerHTML = `
        <nav class="navbar">
            <a href="${linkLogo}" class="logo-container" ${bloccaClickLogo ? 'style="pointer-events: none;"' : ''}>
                <img src="logo/logo-bianco.png" alt="Logo DriverBook" class="logo-icon">
                <img src="logo/scritta-bianco.png" alt="DriverBook" class="logo-text-img">
            </a>
            <div class="menu-destra" style="gap: 5px;">
                ${btnInstallaApp}
                <div class="nav-btn lang-selector" style="border: none;">IT / EN</div>
                ${iconaUtente}
            </div>
        </nav>`;
    }

    const btnApri = document.getElementById('btn_apri_menu');
    const btnChiudi = document.getElementById('btn_chiudi_menu');
    const overlay = document.getElementById('menu_overlay');
    const sidePanel = document.getElementById('side_panel');

    function apriMenu() {
        if (sidePanel) sidePanel.classList.add('open');
        if (overlay) overlay.classList.add('open');
        document.body.style.overflow = 'hidden'; 
    }

    function chiudiMenu() {
        if (sidePanel) sidePanel.classList.remove('open');
        if (overlay) overlay.classList.remove('open');
        document.body.style.overflow = '';
    }

    if (btnApri) btnApri.addEventListener('click', apriMenu);
    if (btnChiudi) btnChiudi.addEventListener('click', chiudiMenu);
    if (overlay) overlay.addEventListener('click', chiudiMenu);

    const contenitoreMenuLaterale = document.querySelector('.scrollable-menu');
    const percorsoCorrenteMenu = window.location.pathname.split('/').pop() || 'index.html';
    const blacklistPubblica = ['login-passeggero.html', 'reset-password.html', 'registrazione-passeggero.html', 'assistenza.html'];
    const isPaginaPubblica = blacklistPubblica.includes(percorsoCorrenteMenu);

    if (contenitoreMenuLaterale) {
        if (isPaginaPubblica) {
            contenitoreMenuLaterale.innerHTML = `
                <a href="#" id="link_menu_pub_login" class="menu-item">Accesso</a>
                <a href="#" id="link_menu_pub_reset" class="menu-item">Recupero Password</a>
                <a href="#" id="link_menu_pub_reg" class="menu-item">Registrazione</a>
                <a href="#" id="link_menu_pub_assist" class="menu-item">Assistenza</a>
            `;
            if (btnChiudi) {
                btnChiudi.classList.add('bordo-inferiore-grigio');
            }
        } else if (localStorage.getItem('driverbook_auth_token')) {
            const linkRiepilogo = localStorage.getItem('db_partenza') ? `<a href="#" id="link_menu_riepilogo" class="menu-item">Riepilogo Richiesta</a>` : '';
            contenitoreMenuLaterale.innerHTML = `
                <a href="#" id="link_menu_home" class="menu-item">Pannello Utente</a>
                <a href="#" id="link_menu_prenota" class="menu-item">Prenota Servizio</a>
                ${linkRiepilogo}
                <a href="#" id="link_menu_viaggi" class="menu-item">Viaggi in Programma</a>
                <a href="#" id="link_menu_storico" class="menu-item">Storico Viaggi</a>
                <a href="#" id="link_menu_profilo" class="menu-item">Modifica Profilo</a>
                <a href="#" id="link_menu_sicurezza" class="menu-item">Cambio Password</a>
                <a href="#" id="link_menu_assistenza" class="menu-item">Assistenza</a>
            `;
        }
    }

    const menuLinks = document.querySelectorAll('.menu-item');
    const percorsoAttuale = window.location.pathname.split('/').pop() || 'index.html';

    const mappaPagine = {
        'link_menu_home': 'dashboard-passeggero.html',
        'link_menu_prenota': 'prenota-servizio-passeggero.html',
        'link_menu_riepilogo': 'checkout.html',
        'link_menu_viaggi': 'viaggi-in-programma.html',
        'link_menu_storico': 'storico-viaggi.html',
        'link_menu_profilo': 'modifica-profilo.html',
        'link_menu_sicurezza': 'cambio-password.html',
        'link_menu_assistenza': 'assistenza-loggato.html',
        'link_menu_pub_login': 'login-passeggero.html',
        'link_menu_pub_reset': 'reset-password.html',
        'link_menu_pub_reg': 'registrazione-passeggero.html',
        'link_menu_pub_assist': 'assistenza.html'
    };
    
    menuLinks.forEach(link => {
        const idLink = link.id;
        const urlDestinazione = mappaPagine[idLink] || link.getAttribute('href');
        
        if (urlDestinazione && urlDestinazione === percorsoAttuale) {
            link.classList.add('hidden');
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
            localStorage.removeItem('driverbook_auth_token');
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
        itiProfiloPasseggero = window.intlTelInput(inputTelProfilo, {
            preferredCountries: ['it'],
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
        });
    }

    const inputZonaOperativa = document.getElementById('zonaOperativa');
    if (inputZonaOperativa && typeof google !== 'undefined' && google.maps && google.maps.places) {
        const confiniArea = new google.maps.LatLngBounds(
            new google.maps.LatLng(36.0, -2.0),
            new google.maps.LatLng(52.0, 18.0)
        );
        new google.maps.places.Autocomplete(inputZonaOperativa, {
            bounds: confiniArea,
            strictBounds: true
        });
    }

    const inputTelPasseggero = document.getElementById('tel_passeggero');
    if (inputTelPasseggero && window.intlTelInput) {
        itiPasseggero = window.intlTelInput(inputTelPasseggero, {
            initialCountry: "it",
            preferredCountries: ['it'],
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
        });

        const inputTelReferente = document.getElementById('tel_referente');
        itiReferente = window.intlTelInput(inputTelReferente, {
            initialCountry: "it",
            preferredCountries: ['it'],
            utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
        });

        const inputPartenza = document.getElementById('partenza');
        const inputArrivo = document.getElementById('arrivo');
        
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            const confiniArea = new google.maps.LatLngBounds(
                new google.maps.LatLng(36.0, -2.0),
                new google.maps.LatLng(52.0, 18.0)
            );

            const opzioniGoogle = {
                bounds: confiniArea,
                strictBounds: true
            };

            const acPartenza = new google.maps.places.Autocomplete(inputPartenza, opzioniGoogle);
            const acArrivo = new google.maps.places.Autocomplete(inputArrivo, opzioniGoogle);

            acPartenza.addListener('place_changed', function() {
                const place = acPartenza.getPlace();
                if (place && place.geometry) {
                    latLngPartenza = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                }
                calcolaPrezzi();
            });
            acArrivo.addListener('place_changed', function() {
                const place = acArrivo.getPlace();
                if (place && place.geometry) {
                    latLngArrivo = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                }
                calcolaPrezzi();
            });
        }
        
        inputPartenza.addEventListener('blur', calcolaPrezzi);
        inputArrivo.addEventListener('blur', calcolaPrezzi);
        document.getElementById('ore').addEventListener('change', calcolaPrezzi);

        impostaLimitiData();

        document.getElementById('nome_passeggero').value = localStorage.getItem('db_nome_passeggero') || '';
        if (localStorage.getItem('db_tel_passeggero')) {
            itiPasseggero.setNumber(localStorage.getItem('db_tel_passeggero'));
        }

        const checkReferente = localStorage.getItem('db_chk_referente') === 'true';
        document.getElementById('chk_referente').checked = checkReferente;
        document.getElementById('nome_referente').value = localStorage.getItem('db_nome_referente') || '';
        if (localStorage.getItem('db_tel_referente')) {
            itiReferente.setNumber(localStorage.getItem('db_tel_referente'));
        }
        gestisciVisualizzazioneReferente();

        document.getElementById('tipo_servizio').value = localStorage.getItem('db_tipo_servizio') || '';
        gestisciCampi(); 

        document.getElementById('partenza').value = localStorage.getItem('db_partenza') || '';
        document.getElementById('arrivo').value = localStorage.getItem('db_arrivo') || '';
        document.getElementById('itinerario_previsto').value = localStorage.getItem('db_itinerario_previsto') || '';

        const checkHub = localStorage.getItem('db_chk_hub') === 'true';
        document.getElementById('chk_hub').checked = checkHub;
        document.getElementById('info_trasporto').value = localStorage.getItem('db_info_trasporto') || '';
        gestisciVisualizzazioneHub();

        document.getElementById('ore').value = localStorage.getItem('db_ore') || '3';
        document.getElementById('data_partenza').value = localStorage.getItem('db_data_partenza') || '';
        document.getElementById('ora_partenza').value = localStorage.getItem('db_ora_partenza') || '';
        
        document.getElementById('passeggeri').value = localStorage.getItem('db_pax') || '1';
        document.getElementById('bagagli_grandi').value = localStorage.getItem('db_grandi') || '0';
        document.getElementById('bagagli_mano').value = localStorage.getItem('db_mano') || '0';
        
        const vetturaSalvata = localStorage.getItem('db_vettura');
        if (vetturaSalvata) {
            document.getElementById('vettura_selezionata').value = vetturaSalvata;
        }
        
        validaFlottaEBagagli(); 
        document.getElementById('note_servizio').value = localStorage.getItem('db_note_servizio') || '';
    }

    if (document.getElementById('view_nome_pax')) {
        caricaRiepilogo();
    }

    if (document.getElementById('dash_nome_utente') || document.getElementById('profilo_nome') || document.getElementById('btn_modifica_password') || document.getElementById('card_viaggi_edit') || document.getElementById('card_storico') || document.getElementById('form_assistenza_interna') || document.getElementById('form_prenotazione')) {
        caricaDatiDashboardPasseggero();
    }

    const btnPrenota = document.getElementById('btn_prenota_servizio');
    if (btnPrenota) {
        btnPrenota.addEventListener('click', function() {
            window.location.href = 'prenota-servizio-passeggero.html';
        });
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

        if (window.location.href.includes('passeggero')) {
            const checkResponse = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userId}&select=id_passeggero`, {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + datiSessione.access_token }
            });
            const datiPasseggero = await checkResponse.json();

            if (!datiPasseggero || datiPasseggero.length === 0) {
                throw new Error("Account non registrato come Passeggero.");
            }
        } else {
            const checkResponse = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/autisti?id_autista=eq.${userId}&select=id_autista`, {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + datiSessione.access_token }
            });
            const datiAutista = await checkResponse.json();

            if (!datiAutista || datiAutista.length === 0) {
                throw new Error("Account non autorizzato come Autista.");
            }
        }

        localStorage.setItem('driverbook_auth_token', datiSessione.access_token);
        localStorage.setItem('driverbook_refresh_token', datiSessione.refresh_token);
        
        btnSubmit.textContent = "Accesso effettuato!";
        btnSubmit.style.backgroundColor = "#28a745";
        btnSubmit.style.color = "#ffffff";
        btnSubmit.style.borderColor = "#28a745";
        
        setTimeout(() => {
            if (window.location.href.includes('passeggero')) {
                window.location.href = 'dashboard-passeggero.html';
            } else {
                window.location.href = 'dashboard-autista-amministrativo.html';
            }
        }, 1000);

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

    const msgErroreServer = document.getElementById('messaggio_errore_server');
    if (msgErroreServer) {
        msgErroreServer.style.display = 'none';
    }

    if (!validaComplessitaPassword() || !verificaCoincidenzaPassword() || !validaNotifiche()) {
        return;
    }

    let urlRedirect = "https://mauy81.github.io/driverbook-test/login-autista-amministrativo.html";
    if (window.location.protocol !== 'file:') {
        urlRedirect = window.location.origin + window.location.pathname.replace('registrazione', 'login');
    }

    const urlAuth = `https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/signup?redirect_to=${encodeURIComponent(urlRedirect)}`;
    const urlAutisti = "https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/autisti";
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
            id_autista: authUserId,
            nome_cognome: document.getElementById('nome').value,
            email: email,
            tel_autista: telefonoFinale,
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
            notifica_push: document.getElementById('notificaPush').checked,
            notifica_email: document.getElementById('notificaEmail').checked
        };

        const dbResponse = await fetch(urlAutisti, {
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

        const btnSubmit = document.querySelector('#formRegistrazione button[type="submit"]');
        btnSubmit.textContent = "Registrato! Conferma la mail per attivarlo.";
        btnSubmit.style.backgroundColor = "#28a745";
        btnSubmit.disabled = true;

        setTimeout(() => {
            document.getElementById('formRegistrazione').reset();
            window.location.href = 'login-autista-amministrativo.html';
        }, 5000);

    } catch (errore) {
        let testoErrore = errore.message;
        
        if (testoErrore.toLowerCase().includes("user already registered") || testoErrore.toLowerCase().includes("already")) {
            testoErrore = "Questa email risulta già registrata. Inserisci un indirizzo diverso oppure vai alla pagina di Login.";
        } else {
            testoErrore = "Non è stato possibile completare la registrazione: " + testoErrore;
        }
        
        if (msgErroreServer) {
            msgErroreServer.textContent = testoErrore;
            msgErroreServer.style.display = 'block';
        }
    }
}

function toggleReferente(event) {
    gestisciVisualizzazioneReferente();
}

function gestisciVisualizzazioneReferente() {
    const chk = document.getElementById('chk_referente');
    const sezione = document.getElementById('sezione_referente');
    const inputNome = document.getElementById('nome_referente');
    const inputTel = document.getElementById('tel_referente');

    if (chk && sezione) {
        if (chk.checked) {
            sezione.classList.remove('hidden');
            if (inputNome) inputNome.required = true;
            if (inputTel) inputTel.required = true;
        } else {
            sezione.classList.add('hidden');
            if (inputNome) inputNome.required = false;
            if (inputTel) inputTel.required = false;
        }
    }
}

function toggleHubTrasporti(event) {
    gestisciVisualizzazioneHub();
}

function gestisciVisualizzazioneHub() {
    const chk = document.getElementById('chk_hub');
    const sezione = document.getElementById('sezione_hub');
    const inputInfo = document.getElementById('info_trasporto');

    if (chk && sezione) {
        if (chk.checked) {
            sezione.classList.remove('hidden');
            if (inputInfo) inputInfo.required = true;
        } else {
            sezione.classList.add('hidden');
            if (inputInfo) inputInfo.required = false;
        }
    }
}

function gestisciCampi() {
    const tipo = document.getElementById('tipo_servizio').value;
    
    document.getElementById('campi_comuni').classList.remove('hidden');
    document.getElementById('blocco_chk_hub').classList.remove('hidden');
    document.getElementById('blocco_tempo').classList.remove('hidden');
    document.getElementById('blocco_passeggeri').classList.remove('hidden');
    document.getElementById('blocco_note').classList.remove('hidden');
    document.getElementById('sezione_vetture').classList.remove('hidden');
    document.getElementById('btn_submit').classList.remove('hidden');

    document.getElementById('partenza').required = true;
    document.getElementById('data_partenza').required = true;
    document.getElementById('ora_partenza').required = true;

    if (tipo === 'TRASFERIMENTO') {
        document.getElementById('campo_arrivo').classList.remove('hidden');
        document.getElementById('arrivo').required = true;
        document.getElementById('campo_ore').classList.add('hidden');
        document.getElementById('blocco_itinerario').classList.add('hidden');
    } else if (tipo === 'DISPOSIZIONE') {
        document.getElementById('campo_arrivo').classList.add('hidden');
        document.getElementById('arrivo').required = false;
        document.getElementById('campo_ore').classList.remove('hidden');
        document.getElementById('blocco_itinerario').classList.remove('hidden');
    }

    validaFlottaEBagagli();
    calcolaPrezzi();
}

function impostaLimitiData() {
    const inputData = document.getElementById('data_partenza');
    if (inputData) {
        const oggi = new Date();
        const anno = oggi.getFullYear();
        const mese = String(oggi.getMonth() + 1).padStart(2, '0');
        const giorno = String(oggi.getDate()).padStart(2, '0');
        inputData.min = `${anno}-${mese}-${giorno}`;
    }
}

function validaOrario() {
    const inputData = document.getElementById('data_partenza').value;
    const inputOra = document.getElementById('ora_partenza').value;
    const msgErrore = document.getElementById('errore_ora');

    if (!inputData || !inputOra) return true;

    const dataOraScelta = new Date(`${inputData}T${inputOra}`);
    const adesso = new Date();
    const limiteMinimo = new Date(adesso.getTime() + (3 * 60 * 60 * 1000));

    if (dataOraScelta < limiteMinimo) {
        msgErrore.style.display = 'block';
        document.getElementById('ora_partenza').value = ''; 
        return false;
    } else {
        msgErrore.style.display = 'none';
        return true;
    }
}

function calcolaPrezzi(tentativo = 1) {
    const tipoServizio = document.getElementById('tipo_servizio').value;
    if (!tipoServizio) return;

    if (tipoServizio === 'DISPOSIZIONE') {
        const ore = parseInt(document.getElementById('ore').value) || 3;
        
        aggiornaGraficaPrezzo('CLASSE_E', ore * CONFIG_TARIFFE.CLASSE_E.oraDisposizione);
        aggiornaGraficaPrezzo('CLASSE_V', ore * CONFIG_TARIFFE.CLASSE_V.oraDisposizione);
        aggiornaGraficaPrezzo('CLASSE_S', ore * CONFIG_TARIFFE.CLASSE_S.oraDisposizione);
        
    } else if (tipoServizio === 'TRASFERIMENTO') {
        const partenza = document.getElementById('partenza').value;
        const arrivo = document.getElementById('arrivo').value;

        if (!partenza || !arrivo) {
            nascondiPrezzi();
            return;
        }

        if (typeof google !== 'undefined' && google.maps && google.maps.DistanceMatrixService) {
            const service = new google.maps.DistanceMatrixService();
            service.getDistanceMatrix({
                origins: [partenza],
                destinations: [arrivo],
                travelMode: 'DRIVING',
                unitSystem: google.maps.UnitSystem.METRIC
            }, function(response, status) {
                if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
                    const distanzaMetri = response.rows[0].elements[0].distance.value;
                    const km = distanzaMetri / 1000;
                    
                    let distanzaValida = true;
                    if (latLngPartenza && latLngArrivo) {
                        const distanzaAria = calcolaDistanzaAria(latLngPartenza.lat, latLngPartenza.lng, latLngArrivo.lat, latLngArrivo.lng);
                        if (distanzaAria > 0 && km > (distanzaAria * 2.2)) {
                            distanzaValida = false;
                        }
                    }

                    if (!distanzaValida && tentativo === 1) {
                        setTimeout(() => calcolaPrezzi(2), 200);
                        return;
                    }
                    
                    let prezzoE = km * CONFIG_TARIFFE.CLASSE_E.allAlKm;
                    if(prezzoE < CONFIG_TARIFFE.CLASSE_E.corsaMinima) prezzoE = CONFIG_TARIFFE.CLASSE_E.corsaMinima;
                    prezzoE = Math.round(prezzoE / 5) * 5;

                    let prezzoV = km * CONFIG_TARIFFE.CLASSE_V.allAlKm;
                    if(prezzoV < CONFIG_TARIFFE.CLASSE_V.corsaMinima) prezzoV = CONFIG_TARIFFE.CLASSE_V.corsaMinima;
                    prezzoV = Math.round(prezzoV / 5) * 5;

                    let prezzoS = km * CONFIG_TARIFFE.CLASSE_S.allAlKm;
                    if(prezzoS < CONFIG_TARIFFE.CLASSE_S.corsaMinima) prezzoS = CONFIG_TARIFFE.CLASSE_S.corsaMinima;
                    prezzoS = Math.round(prezzoS / 5) * 5;
                    
                    aggiornaGraficaPrezzo('CLASSE_E', prezzoE);
                    aggiornaGraficaPrezzo('CLASSE_V', prezzoV);
                    aggiornaGraficaPrezzo('CLASSE_S', prezzoS);
                } else {
                    nascondiPrezzi();
                }
            });
        }
    }
}

function aggiornaGraficaPrezzo(classe, valore) {  
    const elemento = document.getElementById(`prezzo_${classe.toLowerCase()}`);  
    if (elemento) {  
        const prezzoFormattato = valore.toFixed(2).replace('.', ',');  
        elemento.textContent = `€ ${prezzoFormattato}`;  
        elemento.classList.remove('hidden');  
    }  
}

function nascondiPrezzi() {
    ['classe_e', 'classe_s', 'classe_v'].forEach(classe => {
        const el = document.getElementById(`prezzo_${classe}`);
        if (el) el.classList.add('hidden');
    });
}

function validaFlottaEBagagli() {
    const pax = parseInt(document.getElementById('passeggeri').value) || 1;
    const grandi = parseInt(document.getElementById('bagagli_grandi').value) || 0;
    const mano = parseInt(document.getElementById('bagagli_mano').value) || 0;

    const punteggioBagagli = (grandi * 2) + mano;

    const cardE = document.getElementById('card_classe_e');
    const cardS = document.getElementById('card_classe_s');
    const cardV = document.getElementById('card_classe_v');
    
    const tagE = document.getElementById('tag_classe_e');
    const tagS = document.getElementById('tag_classe_s');
    const tagV = document.getElementById('tag_classe_v');
    
    const motivoE = document.getElementById('motivo_classe_e');
    const motivoS = document.getElementById('motivo_classe_s');
    
    const alertBox = document.getElementById('alert_eccedenza');
    const btnSubmit = document.getElementById('btn_submit');
    const inputVettura = document.getElementById('vettura_selezionata');

    cardE.className = "vettura-card attiva";
    cardS.className = "vettura-card attiva";
    cardV.className = "vettura-card attiva";
    
    tagE.textContent = (inputVettura.value === 'CLASSE_E') ? "Selezionata" : "Disponibile";
    tagS.textContent = (inputVettura.value === 'CLASSE_S') ? "Selezionata" : "Disponibile";
    tagV.textContent = (inputVettura.value === 'CLASSE_V') ? "Selezionata" : "Disponibile";
    
    if(inputVettura.value === 'CLASSE_E') cardE.classList.add('selezionata');
    if(inputVettura.value === 'CLASSE_S') cardS.classList.add('selezionata');
    if(inputVettura.value === 'CLASSE_V') cardV.classList.add('selezionata');

    motivoE.style.display = 'none';
    motivoS.style.display = 'none';
    alertBox.style.display = 'none';
    btnSubmit.disabled = false;

    if (punteggioBagagli > 16) {
        alertBox.style.display = 'block';
        btnSubmit.disabled = true;
        inputVettura.value = ""; 
        cardE.className = "vettura-card bloccata";
        cardS.className = "vettura-card bloccata";
        cardV.className = "vettura-card bloccata";
        tagE.textContent = "Non disponibile";
        tagS.textContent = "Non disponibile";
        tagV.textContent = "Non disponibile";
        nascondiPrezzi();
        return;
    }

    const msgBagagliEccedenti = "Per motivi di sicurezza e in conformità con le normative vigenti, tutti i bagagli devono essere alloggiati esclusivamente nel vano di carico. La quantità selezionata supera la capacità massima del bagagliaio.";

    let escludiE = false;
    let motivoE_testo = "";

    if (pax > 2) {
        escludiE = true;
        motivoE_testo = "Per garantire il massimo comfort e l'esclusività del servizio sulle nostre berline, ospitiamo un massimo di due passeggeri nella parte posteriore. Oltre questa capienza è prevista la selezione del Van.";
    } else if (punteggioBagagli > 5) {
        escludiE = true;
        motivoE_testo = msgBagagliEccedenti;
    }

    if (escludiE) {
        cardE.className = "vettura-card bloccata";
        tagE.textContent = "Non disponibile";
        motivoE.textContent = motivoE_testo;
        motivoE.style.display = 'block';
        if (inputVettura.value === 'CLASSE_E') inputVettura.value = "";
    }

    let escludiS = false;
    let motivoS_testo = "";

    if (pax > 2) {
        escludiS = true;
        motivoS_testo = "Per garantire il massimo comfort e l'esclusività del servizio sulle nostre berline, ospitiamo un massimo di due passeggeri nella parte posteriore. Oltre questa capienza è prevista la selezione del Van.";
    } else if (punteggioBagagli > 5) {
        escludiS = true;
        motivoS_testo = msgBagagliEccedenti;
    }

    if (escludiS) {
        cardS.className = "vettura-card bloccata";
        tagS.textContent = "Non disponibile";
        motivoS.textContent = motivoS_testo;
        motivoS.style.display = 'block';
        if (inputVettura.value === 'CLASSE_S') inputVettura.value = "";
    }
    
    calcolaPrezzi();
}

function selezionaVettura(codiceVettura) {
    const cardE = document.getElementById('card_classe_e');
    const cardS = document.getElementById('card_classe_s');
    const cardV = document.getElementById('card_classe_v');
    
    const tagE = document.getElementById('tag_classe_e');
    const tagS = document.getElementById('tag_classe_s');
    const tagV = document.getElementById('tag_classe_v');
    
    const inputVettura = document.getElementById('vettura_selezionata');
    
    let cardCliccata;
    if(codiceVettura === 'CLASSE_E') cardCliccata = cardE;
    if(codiceVettura === 'CLASSE_S') cardCliccata = cardS;
    if(codiceVettura === 'CLASSE_V') cardCliccata = cardV;

    if (cardCliccata.classList.contains('bloccata')) return;

    if(cardE.classList.contains('attiva')) { cardE.classList.remove('selezionata'); tagE.textContent = "Disponibile"; }
    if(cardS.classList.contains('attiva')) { cardS.classList.remove('selezionata'); tagS.textContent = "Disponibile"; }
    if(cardV.classList.contains('attiva')) { cardV.classList.remove('selezionata'); tagV.textContent = "Disponibile"; }

    cardCliccata.classList.add('selezionata');
        inputVettura.value = codiceVettura;
        
        if(codiceVettura === 'CLASSE_E') tagE.textContent = "Selezionata";
        if(codiceVettura === 'CLASSE_S') tagS.textContent = "Selezionata";
        if(codiceVettura === 'CLASSE_V') tagV.textContent = "Selezionata";

        const msgErroreVettura = document.getElementById('errore_vettura');
        if (msgErroreVettura) msgErroreVettura.style.display = 'none';
    }

function inviaRichiesta(event) {
    event.preventDefault();
    
    const vetturaScelta = document.getElementById('vettura_selezionata').value;
    const msgErroreVettura = document.getElementById('errore_vettura');

    if (!vetturaScelta) {
        if (msgErroreVettura) msgErroreVettura.style.display = 'block';
        return;
    } else {
        if (msgErroreVettura) msgErroreVettura.style.display = 'none';
    }

    if (validaOrario()) {
        localStorage.setItem('db_nome_passeggero', document.getElementById('nome_passeggero').value);
        let prefissoPax = "+" + itiPasseggero.getSelectedCountryData().dialCode;
        let numPax = document.getElementById('tel_passeggero').value.trim();
        localStorage.setItem('db_tel_passeggero', (numPax.startsWith('+') ? numPax : (prefissoPax + numPax)).replace(/\s+/g, '')); 

        let chkAttivo = document.getElementById('chk_referente').checked;
        localStorage.setItem('db_chk_referente', chkAttivo);
        localStorage.setItem('db_nome_referente', chkAttivo ? document.getElementById('nome_referente').value : "");

        let prefissoRef = "+" + itiReferente.getSelectedCountryData().dialCode;
        let numRef = document.getElementById('tel_referente').value.trim();
        localStorage.setItem('db_tel_referente', (chkAttivo && numRef !== "") ? (numRef.startsWith('+') ? numRef : (prefissoRef + numRef)).replace(/\s+/g, '') : "");
        
        localStorage.setItem('db_tipo_servizio', document.getElementById('tipo_servizio').value);
        localStorage.setItem('db_partenza', document.getElementById('partenza').value);
        localStorage.setItem('db_arrivo', document.getElementById('arrivo').value || '');
        localStorage.setItem('db_itinerario_previsto', document.getElementById('itinerario_previsto').value);
        
        localStorage.setItem('db_chk_hub', document.getElementById('chk_hub').checked);
        localStorage.setItem('db_info_trasporto', document.getElementById('info_trasporto').value);
        localStorage.setItem('db_ore', document.getElementById('ore').value);
        
        localStorage.setItem('db_data_partenza', document.getElementById('data_partenza').value);
        localStorage.setItem('db_ora_partenza', document.getElementById('ora_partenza').value);
        localStorage.setItem('db_pax', document.getElementById('passeggeri').value);
        localStorage.setItem('db_grandi', document.getElementById('bagagli_grandi').value);
        localStorage.setItem('db_mano', document.getElementById('bagagli_mano').value);
        localStorage.setItem('db_vettura', vetturaScelta);
        localStorage.setItem('db_note_servizio', document.getElementById('note_servizio').value);

        const prezzoFormattato = document.getElementById(`prezzo_${vetturaScelta.toLowerCase()}`).textContent;
        localStorage.setItem('db_prezzo_stimato', prezzoFormattato);

        let prezzoPulito = prezzoFormattato.replace('€ ', '').replace(',', '.');
        let prezzoPerStripe = Math.round(parseFloat(prezzoPulito) * 100);

        localStorage.setItem('db_prezzo_stripe', prezzoPerStripe);

        window.location.href = 'checkout.html';
    }
}

function caricaRiepilogo() {
    const nomePax = localStorage.getItem('db_nome_passeggero');
    const telPax = localStorage.getItem('db_tel_passeggero');
    const chkReferente = localStorage.getItem('db_chk_referente') === 'true';
    const nomeRef = localStorage.getItem('db_nome_referente');
    const telRef = localStorage.getItem('db_tel_referente');
    
    const tipoServizio = localStorage.getItem('db_tipo_servizio');
    const partenza = localStorage.getItem('db_partenza');
    const arrivo = localStorage.getItem('db_arrivo');
    const itinerario = localStorage.getItem('db_itinerario_previsto');
    
    const chkHub = localStorage.getItem('db_chk_hub') === 'true';
    const infoTrasporto = localStorage.getItem('db_info_trasporto'); 
    const ore = localStorage.getItem('db_ore');
    
    const dataPartenza = localStorage.getItem('db_data_partenza');
    const oraPartenza = localStorage.getItem('db_ora_partenza');
    const pax = localStorage.getItem('db_pax') || '1';
    const grandi = localStorage.getItem('db_grandi') || '0';
    const mano = localStorage.getItem('db_mano') || '0';
    const vetturaCodice = localStorage.getItem('db_vettura');
    const noteServizio = localStorage.getItem('db_note_servizio');
    const prezzoStimato = localStorage.getItem('db_prezzo_stimato');

    if (!tipoServizio || !partenza) {
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = `
                <div class="logo-container">
                    <img src="logo/logo-bianco.png" alt="Logo DriverBook" class="logo-icon">
                    <img src="logo/scritta-bianco.png" alt="DriverBook" class="logo-text-img">
                </div>
                <div class="alert-redirect">
                    Nessun dato di prenotazione trovato.<br><br>Reindirizzamento in corso...
                </div>
            `;
        }
        setTimeout(() => {
            window.location.href = 'prenota-servizio-passeggero.html';
        }, 5000);
        return;
    }

    document.getElementById('view_nome_pax').textContent = nomePax || '-';
    document.getElementById('view_tel_pax').textContent = telPax || '-';

    if (chkReferente) {
        document.getElementById('blocco_view_referente').classList.remove('hidden');
        document.getElementById('view_nome_ref').textContent = nomeRef || '-';
        document.getElementById('view_tel_ref').textContent = telRef || '-';
    }

    if (tipoServizio === 'TRASFERIMENTO') {
        document.getElementById('view_servizio').textContent = 'Servizio a Tratta Diretta';
        document.getElementById('blocco_view_arrivo').classList.remove('hidden');
        document.getElementById('view_arrivo').textContent = arrivo || '-';
        document.getElementById('blocco_view_ore').classList.add('hidden');
        document.getElementById('blocco_view_itinerario').classList.add('hidden');
    } else if (tipoServizio === 'DISPOSIZIONE') {
        document.getElementById('view_servizio').textContent = 'Servizio a Disposizione Oraria';
        document.getElementById('blocco_view_ore').classList.remove('hidden');
        document.getElementById('view_ore').textContent = `${ore} Ore`;
        document.getElementById('blocco_view_arrivo').classList.add('hidden');
        
        if (itinerario && itinerario.trim() !== '') {
            document.getElementById('blocco_view_itinerario').classList.remove('hidden');
            document.getElementById('view_itinerario').textContent = itinerario;
        }
    }

    let vetturaLeggibile = "-";
    if (vetturaCodice === 'CLASSE_E') vetturaLeggibile = "Mercedes Classe E<br>(Berlina Comfort)";
    if (vetturaCodice === 'CLASSE_S') vetturaLeggibile = "Mercedes Classe S<br>(Berlina Lusso)";
    if (vetturaCodice === 'CLASSE_V') vetturaLeggibile = "Mercedes Classe V<br>(Van Comfort)";
    document.getElementById('view_vettura').innerHTML = vetturaLeggibile;

    let dataFormattata = dataPartenza;
    if (dataPartenza) {
        const parti = dataPartenza.split('-');
        if(parti.length === 3) dataFormattata = `${parti[2]}/${parti[1]}/${parti[0]}`;
    }
    document.getElementById('view_data_ora').textContent = `${dataFormattata} alle ore ${oraPartenza}`;
    document.getElementById('view_partenza').textContent = partenza || '-';

    if (chkHub) {
        document.getElementById('blocco_view_hub').classList.remove('hidden');
        document.getElementById('view_info_trasporto').textContent = infoTrasporto || '-';
    }

    let testoPax = pax === '1' ? "1 Passeggero" : pax + " Passeggeri";
    let testoGrandi = grandi === '1' ? "1 Valigia Grande" : grandi + " Valigie Grandi";
    let testoMano = mano + " Trolley";

    document.getElementById('view_carico').innerHTML = `${testoPax}<br>${testoGrandi}<br>${testoMano}`;
    
    if (noteServizio && noteServizio.trim() !== '') {
        document.getElementById('view_note').textContent = noteServizio;
    } else {
        document.getElementById('view_note').textContent = 'Nessuna nota o richiesta particolare inserita.';
        document.getElementById('view_note').style.color = '#555555';
    }

    if (prezzoStimato) {
        let prezzoPulito = prezzoStimato.replace('€', '').trim();
        document.getElementById('view_prezzo').textContent = `${prezzoPulito} €`;
    } else {
        document.getElementById('view_prezzo').textContent = '-';
    }
}

async function confermaPrenotazione() {
    const prezzoStimato = localStorage.getItem('db_prezzo_stimato');
    
    let prezzoNumero = 0;
    if (prezzoStimato) {
        prezzoNumero = parseFloat(prezzoStimato.replace('€', '').trim()) || 0;
    }

    const urlCompleto = "https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/prenotazioni";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    const token = localStorage.getItem('driverbook_auth_token');

    let emailUtente = null;
    if (token) {
        try {
            const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
            });
            if (userRes.ok) {
                const userData = await userRes.json();
                emailUtente = userData.email;
            }
        } catch (e) {
            console.error("Errore nel recupero email dell'utente", e);
        }
    }

    const corpoDati = {
        nome_passeggero: localStorage.getItem('db_nome_passeggero') || null,
        tel_passeggero: localStorage.getItem('db_tel_passeggero') || null,
        chk_referente: localStorage.getItem('db_chk_referente') === 'true',
        nome_referente: localStorage.getItem('db_nome_referente') || null,
        tel_referente: localStorage.getItem('db_tel_referente') || null,
        tipo_servizio: localStorage.getItem('db_tipo_servizio') === 'TRASFERIMENTO' ? 'TRANSFER' : (localStorage.getItem('db_tipo_servizio') || null),
        ore: localStorage.getItem('db_tipo_servizio') === 'DISPOSIZIONE' && localStorage.getItem('db_ore') ? parseInt(localStorage.getItem('db_ore')) : null,
        partenza: localStorage.getItem('db_partenza') || null,
        arrivo: localStorage.getItem('db_arrivo') || null,
        itinerario_previsto: localStorage.getItem('db_itinerario_previsto') || null,
        chk_hub: localStorage.getItem('db_chk_hub') === 'true',
        info_trasporto: localStorage.getItem('db_info_trasporto') || null,
        data_partenza: localStorage.getItem('db_data_partenza') || null,
        ora_partenza: localStorage.getItem('db_ora_partenza') || null,
        passeggeri: localStorage.getItem('db_pax') ? parseInt(localStorage.getItem('db_pax')) : null,
        bagagli_grandi: localStorage.getItem('db_grandi') ? parseInt(localStorage.getItem('db_grandi')) : null,
        bagagli_mano: localStorage.getItem('db_mano') ? parseInt(localStorage.getItem('db_mano')) : null,
        vettura_selezionata: localStorage.getItem('db_vettura') ? localStorage.getItem('db_vettura').replace('_', ' ') : null,
        note_servizio: localStorage.getItem('db_note_servizio') || null,
        prezzo_totale: prezzoNumero,
        email_cliente: emailUtente,
        stripe_payment_intent_id: null,
        termini_accettati: null
    };

    try {
        const risposta = await fetch(urlCompleto, {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + chiaveAnon,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            },
            body: JSON.stringify(corpoDati)
        });

        if (!risposta.ok) {
            throw new Error("Errore nel salvataggio");
        }

        const datiSalvati = await risposta.json();
        const codiceGenerato = datiSalvati[0].codice_prenotazione;
        
        const chiaviDaCancellare = [
            'db_nome_passeggero', 'db_tel_passeggero', 'db_chk_referente', 'db_nome_referente',
            'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_arrivo', 'db_itinerario_previsto',
            'db_chk_hub', 'db_info_trasporto', 'db_ore', 'db_data_partenza', 'db_ora_partenza',
            'db_pax', 'db_grandi', 'db_mano', 'db_vettura', 'db_note_servizio', 'db_prezzo_stimato', 'db_prezzo_stripe'
        ];
        chiaviDaCancellare.forEach(chiave => localStorage.removeItem(chiave));

        let overlay = document.createElement('div');
        overlay.className = 'modale-overlay';
        overlay.innerHTML = `
            <div class="modale-box">
                <h3 class="modale-titolo" style="color: #00FF66; margin-bottom: 15px;">Richiesta Inviata!</h3>
                <p class="modale-testo">La tua prenotazione è stata registrata con successo.<br><br>Codice: <strong style="color: #00FF66;">${codiceGenerato}</strong></p>
                <div class="modale-bottoni-container">
                    <button id="btn_chiudi_conferma" class="btn btn-primary btn-full">VAI AL PANNELLO UTENTE</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        document.getElementById('btn_chiudi_conferma').onclick = function() {
            window.location.href = 'dashboard-passeggero.html';
        };

    } catch (errore) {
        console.error(errore);
        let overlayErrore = document.createElement('div');
        overlayErrore.className = 'modale-overlay';
        overlayErrore.innerHTML = `
            <div class="modale-box">
                <h3 class="modale-titolo" style="color: #FF4444; margin-bottom: 15px;">Errore</h3>
                <p class="modale-testo">Si è verificato un errore durante l'invio della richiesta nel database. Riprova tra poco.</p>
                <div class="modale-bottoni-container">
                    <button id="btn_chiudi_errore" class="btn-modale-bianco">Chiudi</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlayErrore);
        document.getElementById('btn_chiudi_errore').onclick = function() {
            document.body.removeChild(overlayErrore);
        };
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

async function inviaRegistrazionePasseggero(event) {
    event.preventDefault();

    const msgErroreServer = document.getElementById('messaggio_errore_server');
    if (msgErroreServer) {
        msgErroreServer.style.display = 'none';
    }

    if (!validaComplessitaPassword() || !verificaCoincidenzaPassword() || !validaNotifiche()) {
        return;
    }

    let urlRedirect = "https://mauy81.github.io/driverbook-test/login-passeggero.html";
    if (window.location.protocol !== 'file:') {
        urlRedirect = window.location.origin + window.location.pathname.replace('registrazione', 'login');
    }

    const urlAuth = `https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/signup?redirect_to=${encodeURIComponent(urlRedirect)}`;
    const urlPasseggeri = "https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri";
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
            throw new Error(authError.msg || authError.message || "Errore credenziali");
        }

        const authData = await authResponse.json();
        const authUserId = authData.id || (authData.user && authData.user.id);

        if (!authUserId) {
            throw new Error("ID utente mancante.");
        }

        const richiedeFattura = document.getElementById('richiedeFattura').checked;

        const corpoDati = {
            id_passeggero: authUserId,
            nome_cognome: document.getElementById('nome').value,
            email: email,
            telefono: telefonoFinale,
            richiede_fattura: richiedeFattura,
            ragione_sociale: richiedeFattura ? document.getElementById('ragioneSociale').value : null,
            piva_cf: richiedeFattura ? document.getElementById('piva_cf').value : null,
            codice_sdi: richiedeFattura ? document.getElementById('codice_sdi').value : null,
            pec: richiedeFattura ? document.getElementById('pec').value : null,
            indirizzo_via: richiedeFattura ? document.getElementById('indirizzo_via').value : null,
            indirizzo_cap: richiedeFattura ? document.getElementById('indirizzo_cap').value : null,
            indirizzo_citta: richiedeFattura ? document.getElementById('indirizzo_citta').value : null,
            indirizzo_provincia: richiedeFattura ? document.getElementById('indirizzo_provincia').value : null,
            notifica_push: document.getElementById('notificaPush').checked,
            notifica_email: document.getElementById('notificaEmail').checked
        };

        const dbResponse = await fetch(urlPasseggeri, {
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
            throw new Error("Errore database");
        }

        const btnSubmit = document.querySelector('#formRegistrazionePasseggero button[type="submit"]');
        btnSubmit.textContent = "Registrato! Conferma la mail per attivarlo.";
        btnSubmit.style.backgroundColor = "#28a745";
        btnSubmit.disabled = true;

        setTimeout(() => {
            document.getElementById('formRegistrazionePasseggero').reset();
            window.location.href = 'login-passeggero.html';
        }, 4000);

    } catch (errore) {
        let testoErrore = errore.message;
        
        if (testoErrore.toLowerCase().includes("user already registered") || testoErrore.toLowerCase().includes("already")) {
            testoErrore = "Questa email risulta già registrata. Inserisci un indirizzo diverso oppure vai alla pagina di Login.";
        }
        
        if (msgErroreServer) {
            msgErroreServer.textContent = testoErrore;
            msgErroreServer.style.display = 'block';
        }
    }
}

async function caricaDatiDashboardPasseggero() {
    const token = localStorage.getItem('driverbook_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const userData = await userRes.json();
        if (!userRes.ok) throw new Error("Token non valido");

        const userId = userData.id;

        const dbRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userId}`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const dbData = await dbRes.json();

        if (dbData && dbData.length > 0) {
            const passeggero = dbData[0];
            
            if (document.getElementById('dash_nome_utente')) {
                document.getElementById('dash_nome_utente').textContent = passeggero.nome_cognome;
            }
            if (document.getElementById('dash_codice_cliente')) {
                document.getElementById('dash_codice_cliente').textContent = passeggero.codice_passeggero;
            }
            
            if (document.getElementById('nome_passeggero') && !localStorage.getItem('db_nome_passeggero')) {
                if (passeggero.richiede_fattura) {
                    document.getElementById('chk_referente').checked = true;
                    gestisciVisualizzazioneReferente();
                    document.getElementById('nome_referente').value = passeggero.ragione_sociale || passeggero.nome_cognome || '';
                    if (itiReferente && passeggero.telefono) {
                        itiReferente.setNumber(passeggero.telefono);
                    }
                } else {
                    document.getElementById('nome_passeggero').value = passeggero.nome_cognome || '';
                    if (itiPasseggero && passeggero.telefono) {
                        itiPasseggero.setNumber(passeggero.telefono);
                    }
                }
            }
            
            if (document.getElementById('profilo_nome')) {
                document.getElementById('profilo_nome').value = passeggero.nome_cognome || '';
                document.getElementById('profilo_email').value = passeggero.email || '';
                if (itiProfiloPasseggero && passeggero.telefono) {
                    itiProfiloPasseggero.setNumber(passeggero.telefono);
                }
                
                document.getElementById('profilo_richiedeFattura').checked = passeggero.richiede_fattura;
                if (passeggero.richiede_fattura) {
                    document.getElementById('sezione_fatturazione_profilo').classList.remove('hidden');
                    document.getElementById('profilo_ragioneSociale').value = passeggero.ragione_sociale || '';
                    document.getElementById('profilo_piva_cf').value = passeggero.piva_cf || '';
                    document.getElementById('profilo_codice_sdi').value = passeggero.codice_sdi || '';
                    document.getElementById('profilo_pec').value = passeggero.pec || '';
                    document.getElementById('profilo_indirizzo_via').value = passeggero.indirizzo_via || '';
                    document.getElementById('profilo_indirizzo_cap').value = passeggero.indirizzo_cap || '';
                    document.getElementById('profilo_indirizzo_citta').value = passeggero.indirizzo_citta || '';
                    document.getElementById('profilo_indirizzo_provincia').value = passeggero.indirizzo_provincia || '';
                }

                document.getElementById('profilo_notificaPush').checked = passeggero.notifica_push;
                document.getElementById('profilo_notificaEmail').checked = passeggero.notifica_email;
            }
        }
    } catch (error) {
        localStorage.removeItem('driverbook_auth_token');
        window.location.href = 'login-passeggero.html';
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

        const richiedeFattura = document.getElementById('profilo_richiedeFattura').checked;
        let prefissoTel = "+" + itiProfiloPasseggero.getSelectedCountryData().dialCode;
        let numeroDigitato = document.getElementById('profilo_telefono').value.trim();
        let telefonoFinale = (numeroDigitato.startsWith('+') ? numeroDigitato : (prefissoTel + numeroDigitato)).replace(/\s+/g, '');

        const corpoDati = {
            nome_cognome: document.getElementById('profilo_nome').value,
            telefono: telefonoFinale,
            richiede_fattura: richiedeFattura,
            ragione_sociale: richiedeFattura ? document.getElementById('profilo_ragioneSociale').value : null,
            piva_cf: richiedeFattura ? document.getElementById('profilo_piva_cf').value : null,
            codice_sdi: richiedeFattura ? document.getElementById('profilo_codice_sdi').value : null,
            pec: richiedeFattura ? document.getElementById('profilo_pec').value : null,
            indirizzo_via: richiedeFattura ? document.getElementById('profilo_indirizzo_via').value : null,
            indirizzo_cap: richiedeFattura ? document.getElementById('profilo_indirizzo_cap').value : null,
            indirizzo_citta: richiedeFattura ? document.getElementById('profilo_indirizzo_citta').value : null,
            indirizzo_provincia: richiedeFattura ? document.getElementById('profilo_indirizzo_provincia').value : null,
            notifica_push: document.getElementById('profilo_notificaPush').checked,
            notifica_email: document.getElementById('profilo_notificaEmail').checked
        };

        const dbRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userId}`, {
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
        
        const nuovaEmail = document.getElementById('profilo_email').value;
        if (nuovaEmail !== userData.email) {
            let paginaCorrente = window.location.pathname.split('/').pop() || 'dashboard-passeggero.html';
            let urlRedirect = "https://mauy81.github.io/driverbook-test/" + paginaCorrente;
            
            if (window.location.protocol !== 'file:') {
                urlRedirect = window.location.origin + window.location.pathname;
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
            
            btnSubmit.textContent = "Email aggiornata! Ti scolleghiamo, conferma il link ricevuto.";
            btnSubmit.style.backgroundColor = "#00FF66";
            btnSubmit.style.color = "#000000";
            btnSubmit.style.borderColor = "#00FF66";

            setTimeout(() => {
                localStorage.removeItem('driverbook_auth_token');
                const urlAttuale = window.location.href.toLowerCase();
                const destinazioneLogin = urlAttuale.includes('autista') ? 'login-autista-amministrativo.html' : 'login-passeggero.html';
                window.location.href = destinazioneLogin;
            }, 5000);
            
            return;
        } else {
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
            
            caricaDatiDashboardPasseggero();
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
    
    const testoOriginale = btn.textContent;
    btn.textContent = "Invio richiesta...";
    btn.disabled = true;

    const token = localStorage.getItem('driverbook_auth_token');
    const urlRecover = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/recover?redirect_to=https://mauy81.github.io/driverbook-test/reimposta-password.html";
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

        btn.textContent = "Email di ripristino inviata!";
        btn.style.backgroundColor = "#28a745"; 

        setTimeout(() => {
            if (typeof esciAccount === 'function') {
                esciAccount();
            } else {
                window.location.href = 'login-passeggero.html';
            }
        }, 3000);

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

        btnSubmit.textContent = "Richiesta inviata correttamente!";
        btnSubmit.style.backgroundColor = "#00FF66";
        btnSubmit.style.color = "#000000";
        btnSubmit.style.borderColor = "#00FF66";
        
        setTimeout(() => {
            document.getElementById('form_assistenza').reset();
            
            btnSubmit.textContent = testoOriginale;
            btnSubmit.style.backgroundColor = "";
            btnSubmit.style.color = "";
            btnSubmit.style.borderColor = "";
            btnSubmit.disabled = false;
        }, 5000);

    } catch (errore) {
        alert("Errore durante l'invio. Riprova più tardi.");
        btnSubmit.disabled = false;
        btnSubmit.textContent = testoOriginale;
    }
}

function esciAccount() {
    localStorage.removeItem('driverbook_auth_token');
    window.location.href = 'index.html';
}

document.addEventListener("DOMContentLoaded", function() {
    if (document.getElementById('formResetPassword')) {
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
            const container = document.querySelector('.container');
            if (container) {
                container.innerHTML = `
                    <nav class="navbar">
                        <a href="index.html" class="logo-container">
                            <img src="logo/logo-bianco.png" alt="Logo DriverBook" class="logo-icon">
                            <img src="logo/scritta-bianco.png" alt="DriverBook" class="logo-text-img">
                        </a>
                        <div class="lang-selector">IT / EN</div>
                    </nav>
                    <div style="text-align: center; margin-top: 40px;">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#dc3545" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 20px;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        <h2 style="color: #ffffff; margin-bottom: 15px;">Link Scaduto o<br>Non Valido</h2>
                        <p style="color: #aaaaaa; margin-bottom: 30px; line-height: 1.5;">Il link di sicurezza che hai utilizzato non è più valido.<br>Ti preghiamo di effettuare una nuova richiesta.</p>
                        <a href="reset-password.html" class="btn">Richiedi un nuovo link</a>
                    </div>
                `;
            }
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

    const urlRecover = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/recover?redirect_to=https://mauy81.github.io/driverbook-test/reimposta-password.html";
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

        btn.textContent = "Se registrato, riceverai un'email a breve!";
        btn.style.backgroundColor = "#00FF66";
        btn.style.color = "#000000";
        btn.style.borderColor = "#00FF66";

        setTimeout(() => {
            document.getElementById('formRecuperoPassword').reset();
            btn.textContent = testoOriginale;
            btn.style.backgroundColor = "";
            btn.style.color = "";
            btn.style.borderColor = "";
            btn.disabled = false;
        }, 5000);

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

        localStorage.removeItem('driverbook_temp_recovery_token');
        localStorage.setItem('driverbook_auth_token', accessToken);

        btnSubmit.textContent = "Password aggiornata! Accesso in corso...";
        btnSubmit.style.backgroundColor = "#28a745";

        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + accessToken }
        });
        const userData = await userRes.json();
        const userId = userData.id;

        const checkPasseggero = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userId}&select=id_passeggero`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + accessToken }
        });
        const datiPasseggero = await checkPasseggero.json();

        setTimeout(() => {
            if (datiPasseggero && datiPasseggero.length > 0) {
                window.location.href = 'dashboard-passeggero.html';
            } else {
                window.location.href = 'dashboard-autista-amministrativo.html';
            }
        }, 2000);

    } catch (errore) {
        console.error(errore);
        btnSubmit.textContent = "Salva Nuova Password";
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
    navigator.serviceWorker.register('service-worker.js')
        .catch(errore => console.log('Registrazione SW fallita: ', errore));
}

let deferredPrompt;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

function mostraBottoneInstallazione() {
    const btnDynamic = document.getElementById('btn_installa_app');
    if (btnDynamic) btnDynamic.style.setProperty('display', 'flex', 'important');
}

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    mostraBottoneInstallazione();
});

document.addEventListener("DOMContentLoaded", () => {
    if (deferredPrompt) mostraBottoneInstallazione();
    
    if (isIOS) {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (!isStandalone) mostraBottoneInstallazione();
    }
});

document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'btn_installa_app') {
        if (isIOS) {
            const iosPopup = document.getElementById('ios_install_popup');
            if (iosPopup) iosPopup.classList.remove('hidden');
        } else if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') e.target.style.display = 'none';
            deferredPrompt = null;
        }
    }
});

function chiudiPopupIOS() {
    const iosPopup = document.getElementById('ios_install_popup');
    if (iosPopup) iosPopup.classList.add('hidden');
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

        const checkPasseggero = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userId}&select=nome_cognome,codice_passeggero`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const datiPasseggero = await checkPasseggero.json();

        if (datiPasseggero && datiPasseggero.length > 0) {
            nomeUtente = datiPasseggero[0].nome_cognome || "N/A";
            codiceCliente = datiPasseggero[0].codice_passeggero || "N/A";
        } else {
            const checkAutista = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/autisti?id_autista=eq.${userId}&select=nome_cognome,codice_autista`, {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
            });
            const datiAutista = await checkAutista.json();
            if (datiAutista && datiAutista.length > 0) {
                nomeUtente = datiAutista[0].nome_cognome || "N/A";
                codiceCliente = datiAutista[0].codice_autista || "N/A";
            }
        }

        const messaggioArricchito = `Codice Cliente: ${codiceCliente}\nNome: ${nomeUtente}\n\nRichiesta:\n${messaggioUtente}`;

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

        btnSubmit.textContent = "Richiesta inviata correttamente!";
        btnSubmit.style.backgroundColor = "#00FF66";
        btnSubmit.style.color = "#000000";
        btnSubmit.style.borderColor = "#00FF66";
        
        setTimeout(() => {
            window.history.back();
        }, 5000);

    } catch (errore) {
        alert("Errore durante l'invio. Riprova più tardi.");
        btnSubmit.disabled = false;
        btnSubmit.textContent = testoOriginale;
    }
}

let moduloSporco = false;

document.addEventListener("DOMContentLoaded", function() {
    document.body.addEventListener('input', function(e) {
        if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) {
            moduloSporco = true;
        }
    });

    document.body.addEventListener('submit', function() {
        moduloSporco = false;
    });

    document.body.addEventListener('click', function(e) {
        const link = e.target.closest('a');
        
        if (!link || link.getAttribute('href') === '#' || link.getAttribute('href').startsWith('mailto:')) {
            return;
        }

        if (moduloSporco) {
            e.preventDefault();
            mostraModaleSalvataggio(link.href);
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

function calcolaDistanzaAria(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}