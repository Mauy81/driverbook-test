(function() {
    const chiaviIsolate = ['driverbutler_auth_token', 'driverbutler_refresh_token', 'driverbutler_ruolo', 'driverbutler_last_user', 'driverbutler_last_page', 'driverbutler_ricordami', 'driverbutler_lang'];
    
    function getPrefissoApp() {
        return 'pax_';
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
let itiPasseggero, itiReferente, itiProfiloPasseggero;
let latLngPartenza = null;
let latLngArrivo = null;
let strutturalePartenzaCitta = null;
let strutturalePartenzaVia = null;
let strutturaleArrivoCitta = null;
let strutturaleArrivoVia = null;

function estraiCittaEViaDaGoogle(place) {
    let citta = "";
    let provincia = "";
    let via = "";
    let nazione = "";
    let cap = "";
    
    if (place && place.address_components) {
        let comune = "";
        let localita = "";
        place.address_components.forEach(component => {
            const types = component.types;
            if (types.includes("administrative_area_level_3")) comune = component.long_name;
            if (types.includes("locality")) localita = component.long_name;
            if (types.includes("administrative_area_level_2")) provincia = component.short_name;
            if (types.includes("route")) via = component.long_name;
            if (types.includes("country")) nazione = component.short_name;
            if (types.includes("postal_code")) cap = component.long_name;
        });
        citta = comune || localita;
    }
    
    if (!citta && place && place.name) citta = place.name;
    
    if (nazione !== "IT" && place && place.formatted_address) {
        return { citta: place.formatted_address, via: "" };
    }

    let stringaCitta = citta;
    
    if (provincia && provincia.length === 2) {
        stringaCitta = stringaCitta + " (" + provincia + ")";
    }
    
    let stringaDettaglio = via;
    const isPOI = place.types && !place.types.includes("street_address") && !place.types.includes("route") && !place.types.includes("premise");
    
    if (isPOI && place.name) {
        stringaDettaglio = place.name;
    } else if (!via && place.name) {
        stringaDettaglio = place.name;
    }
    
    return { citta: stringaCitta, via: stringaDettaglio };
}

const CONFIG_TARIFFE = {
    CLASSE_E: { allAlKm: 2.00, oraDisposizione: 70.00, corsaMinima: 70.00 },
    CLASSE_V: { allAlKm: 2.45, oraDisposizione: 90.00, corsaMinima: 90.00 },
    CLASSE_S: { allAlKm: 4.00, oraDisposizione: 120.00, corsaMinima: 120.00 }
};

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

document.addEventListener("DOMContentLoaded", function() {
    let linkFavicon = document.querySelector("link[rel~='icon']");
    if (!linkFavicon) {
        linkFavicon = document.createElement('link');
        linkFavicon.rel = 'icon';
        linkFavicon.type = 'image/png';
        linkFavicon.href = '../logo/icona-pwa.png';
        document.head.appendChild(linkFavicon);
    }

    if (localStorage.getItem('driverbutler_ricordami') === 'false' && !sessionStorage.getItem('finestra_attiva')) {
        esciAccount();
        return;
    }
    sessionStorage.setItem('finestra_attiva', 'true');

    const chkRicordami = document.getElementById('ricordami');
    if (chkRicordami) {
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) chkRicordami.checked = true;
    }

    const paginaCorrenteSicurezza = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];

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
        localStorage.setItem('driverbutler_last_page', window.location.href);
    }

    if (!blacklistPubblicaAccesso.includes(paginaCorrenteSicurezza) && !localStorage.getItem('driverbutler_auth_token')) {
        window.location.href = 'login.html';
        return;
    } else if (!blacklistPubblicaAccesso.includes(paginaCorrenteSicurezza)) {
        rinnovaSessioneSilenziosa(); 
        setInterval(rinnovaSessioneSilenziosa, 50 * 60 * 1000); 
    }
    
    if (paginaCorrenteSicurezza === 'index.html' && localStorage.getItem('driverbutler_auth_token')) {
        const ultimaPagina = localStorage.getItem('driverbutler_last_page') || 'dashboard.html';
        window.location.replace(ultimaPagina);
        return;
    }

    const hashCheck = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hashCheck);

    if (hashParams.get('type') === 'email_change' || hashParams.has('error_description')) {
        const chiaviDaCancellare = [
            'driverbutler_auth_token', 'driverbutler_refresh_token', 'driverbutler_ruolo', 'driverbutler_last_user',
            'db_nome_passeggero', 'db_tel_passeggero', 'db_chk_referente', 'db_nome_referente',
            'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_partenza_lat', 'db_partenza_lng', 'db_partenza_citta', 'db_partenza_via',
            'db_arrivo', 'db_arrivo_lat', 'db_arrivo_lng', 'db_arrivo_citta', 'db_arrivo_via', 'db_itinerario_previsto',
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
            const lang = localStorage.getItem('driverbutler_lang') || 'it';
            msgBox.innerHTML = traduzioni[lang].msg_email_confermata || "Email confermata con successo. Effettua il login con le tue nuove credenziali.";
        }
    }

    if (window.location.search.includes('email_err=1')) {
        const msgBox = document.getElementById('messaggio_cambio_email');
        if (msgBox) {
            msgBox.classList.remove('hidden');
            msgBox.classList.add('box-messaggio-errore');
            const lang = localStorage.getItem('driverbutler_lang') || 'it';
            msgBox.innerHTML = traduzioni[lang].msg_email_errore || "Il link di conferma è scaduto o non valido. Ripeti la procedura dal tuo profilo.";
        }
    }
	
    if (document.getElementById('formLogin') && window.location.hash.includes('access_token') && window.location.hash.includes('type=signup')) {
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken) {
            localStorage.setItem('driverbutler_auth_token', accessToken);
            if (refreshToken) localStorage.setItem('driverbutler_refresh_token', refreshToken);
            
            window.history.replaceState(null, null, window.location.pathname);
            
            const btnSubmit = document.querySelector('#formLogin button[type="submit"]');
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = localStorage.getItem('driverbutler_lang') === 'en' ? "Access confirmed! Redirecting..." : "Accesso confermato! Reindirizzamento...";
                btnSubmit.classList.add('btn-stato-successo');
            }

            const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
            
            fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + accessToken }
            })
            .then(res => res.json())
            .then(userData => {
                const userId = userData.id;
                return fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userId}&select=id_passeggero`, {
                    headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + accessToken }
                });
            })
            .then(res => res.json())
            .then(datiPasseggero => {
                setTimeout(() => {
                    localStorage.setItem('driverbutler_ruolo', 'passeggeri');
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
        } else if (localStorage.getItem('driverbutler_auth_token') && !isIndex) {
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
        
        const utenteLoggato = localStorage.getItem('driverbutler_auth_token') !== null;
        
        const pagineLinguaConsentite = ['index.html', 'login.html', 'assistenza.html', 'pwreset.html', ''];
        const mostraLingua = pagineLinguaConsentite.includes(paginaCorrente) && !utenteLoggato;
        
        const linguaAttualeMenu = localStorage.getItem('driverbutler_lang') || 'it';
        const linguaOpposta = linguaAttualeMenu === 'it' ? 'en' : 'it';
        
        const testoItaliano = linguaAttualeMenu === 'it' ? '<span class="lang-active">Italiano</span>' : '<span class="lang-inactive">Italiano</span>';
        const testoEnglish = linguaAttualeMenu === 'en' ? '<span class="lang-active">English</span>' : '<span class="lang-inactive">English</span>';

        const selettoreLingua = mostraLingua ? `
            <button class="nav-btn lang-selector-container" onclick="impostaLingua('${linguaOpposta}')">
                ${testoItaliano}
                <span class="lang-divider">/</span>
                ${testoEnglish}
            </button>` : '';

        const footerHTML = !utenteLoggato ? `
            <footer class="footer" data-i18n="footer_rights">
                &copy; 2026-2027 DriverButler. Tutti i diritti riservati.
            </footer>` : '';

        contenitoreMenu.innerHTML = `
        <nav class="navbar">
            <a href="${linkLogo}" class="logo-container ${bloccaClickLogo ? 'link-bloccato' : ''}">
                <img src="../logo/logo.svg" alt="Logo DriverButler" class="logo-icon">
                <img src="../logo/scritta.svg" alt="DriverButler" class="logo-text-img">
            </a>
            <div class="menu-destra menu-gap">
                ${selettoreLingua}
                ${iconaUtente}
            </div>
        </nav>`;

        if (footerHTML) {
            document.body.insertAdjacentHTML('beforeend', footerHTML);
        }
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
                <a id="link_menu_pub_login" class="menu-item" data-i18n="menu_pub_login">Accesso</a>
                <a id="link_menu_pub_reset" class="menu-item" data-i18n="menu_pub_reset">Reset Password</a>
                <a id="link_menu_pub_reg" class="menu-item" data-i18n="menu_pub_reg">Registrazione</a>
                <a id="link_menu_pub_assist" class="menu-item" data-i18n="menu_pub_assist">Assistenza</a>
            `;
            if (btnChiudi) {
                btnChiudi.classList.add('bordo-inferiore-grigio');
            }
        } else if (localStorage.getItem('driverbutler_auth_token')) {
            const linkRiepilogo = localStorage.getItem('db_partenza') ? `<a id="link_menu_riepilogo" class="menu-item" data-i18n="menu_riepilogo">Riepilogo Richiesta</a>` : '';
            contenitoreMenuLaterale.innerHTML = `
                <a id="link_menu_home" class="menu-item" data-i18n="menu_home">Pannello Utente</a>
                <a id="link_menu_prenota" class="menu-item" data-i18n="menu_prenota">Prenota Servizio</a>
                ${linkRiepilogo}
                <a id="link_menu_viaggi" class="menu-item" data-i18n="menu_viaggi">Viaggi in Programma</a>
                <a id="link_menu_storico" class="menu-item" data-i18n="menu_storico">Storico Viaggi</a>
                <a id="link_menu_profilo" class="menu-item" data-i18n="menu_profilo">Modifica Profilo</a>
                <a id="link_menu_sicurezza" class="menu-item" data-i18n="menu_sicurezza">Cambio Password</a>
                <a id="link_menu_assistenza" class="menu-item" data-i18n="menu_assistenza">Assistenza</a>
            `;
        }
        
        if (contenitoreMenuLaterale.innerHTML.trim() !== '') {
            const btnInstallSidebar = `<a id="btn_installa_app_sidebar" class="menu-item btn-menu-installazione hidden"><span data-i18n="btn_installa_app">Installa App</span> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></a>`;
            
            let btnNotificheSidebar = '';
            if (localStorage.getItem('driverbutler_auth_token')) {
                btnNotificheSidebar = `<a id="btn_attiva_notifiche_sidebar" class="menu-item btn-menu-installazione hidden"><span data-i18n="menu_attiva_notifiche">Attiva Notifiche</span> <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke="currentColor"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></a>`;
            }

            contenitoreMenuLaterale.innerHTML = btnInstallSidebar + btnNotificheSidebar + contenitoreMenuLaterale.innerHTML;
        }
    }

    const menuLinks = document.querySelectorAll('.menu-item');
    const percorsoAttuale = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];

    const mappaPagine = {
        'link_menu_home': 'dashboard.html',
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
        'link_menu_pub_assist': 'assistenza.html'
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
                localStorage.removeItem('driverbutler_auth_token');
            }
            if (event.persisted) {
                window.location.reload();
            }
        }
    });

    applicaTraduzioni();
    gestisciModaleNotifichePax();

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

    const inputTelPasseggero = document.getElementById('tel_passeggero');
        if (inputTelPasseggero) {
            if (window.intlTelInput) {
                itiPasseggero = window.intlTelInput(inputTelPasseggero, {
                    preferredCountries: ['it'],
                    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
                });
            }

            const inputTelReferente = document.getElementById('tel_referente');
            if (inputTelReferente && window.intlTelInput) {
                itiReferente = window.intlTelInput(inputTelReferente, {
                    preferredCountries: ['it'],
                    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
                });
            }

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

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function() {});
            }

            acPartenza.addListener('place_changed', function() {
                const place = acPartenza.getPlace();
                if (place && place.geometry) {
                    latLngPartenza = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                    const datiP = estraiCittaEViaDaGoogle(place);
                    strutturalePartenzaCitta = datiP.citta;
                    strutturalePartenzaVia = datiP.via;
                    inputPartenza.dispatchEvent(new Event('input', { bubbles: true }));
                }
                calcolaPrezzi();
            });
            acArrivo.addListener('place_changed', function() {
                const place = acArrivo.getPlace();
                if (place && place.geometry) {
                    latLngArrivo = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
                    const datiA = estraiCittaEViaDaGoogle(place);
                    strutturaleArrivoCitta = datiA.citta;
                    strutturaleArrivoVia = datiA.via;
                    inputArrivo.dispatchEvent(new Event('input', { bubbles: true }));
                }
                calcolaPrezzi();
            });
        }
        
        inputPartenza.addEventListener('keydown', function(e) { if(e.key !== 'Tab' && e.key !== 'Enter') latLngPartenza = null; });
        inputArrivo.addEventListener('keydown', function(e) { if(e.key !== 'Tab' && e.key !== 'Enter') latLngArrivo = null; });
        inputPartenza.addEventListener('blur', calcolaPrezzi);
        inputArrivo.addEventListener('blur', calcolaPrezzi);
        document.getElementById('ore').addEventListener('change', calcolaPrezzi);

        impostaLimitiData();

        document.getElementById('nome_passeggero').value = localStorage.getItem('db_nome_passeggero') || '';
        if (localStorage.getItem('db_tel_passeggero') && itiPasseggero) {
            setTimeout(() => {
                itiPasseggero.setNumber(localStorage.getItem('db_tel_passeggero'));
            }, 100);
        }

        const checkReferente = localStorage.getItem('db_chk_referente') === 'true';
        document.getElementById('chk_referente').checked = checkReferente;
        document.getElementById('nome_referente').value = localStorage.getItem('db_nome_referente') || '';
        if (localStorage.getItem('db_tel_referente') && itiReferente) {
            setTimeout(() => {
                itiReferente.setNumber(localStorage.getItem('db_tel_referente'));
            }, 100);
        }
        gestisciVisualizzazioneReferente();

        document.getElementById('tipo_servizio').value = localStorage.getItem('db_tipo_servizio') || '';
        gestisciCampi(); 

        const latP = localStorage.getItem('db_partenza_lat');
        const lngP = localStorage.getItem('db_partenza_lng');
        if (latP && lngP) latLngPartenza = { lat: parseFloat(latP), lng: parseFloat(lngP) };
        
        const latA = localStorage.getItem('db_arrivo_lat');
        const lngA = localStorage.getItem('db_arrivo_lng');
        if (latA && lngA) latLngArrivo = { lat: parseFloat(latA), lng: parseFloat(lngA) };

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

    if (document.getElementById('lista_viaggi_attivi_edit')) {
        caricaViaggiProgrammati();
    }

    const btnPrenota = document.getElementById('btn_prenota_servizio');
    if (btnPrenota) {
        btnPrenota.addEventListener('click', function() {
            window.location.href = 'prenotazione.html';
        });
    }

    const formProfilo = document.getElementById('formModificaProfilo');
    if (formProfilo) {
        formProfilo.addEventListener('submit', function(event) {
            if (typeof aggiornaProfilo === 'function') aggiornaProfilo(event);
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
            document.getElementById('msg_errore_password_email').style.display = 'none';
        });
    }

    const formOtpEmail = document.getElementById('form_sicurezza_otp_email');
    if (formOtpEmail) formOtpEmail.addEventListener('submit', verificaOtpNuovaEmail);

    const linkRinviaOtpEmail = document.getElementById('link_rinvia_otp_email');
    if (linkRinviaOtpEmail) linkRinviaOtpEmail.addEventListener('click', inviaOtpNuovaEmail);

    const inputOtpNuovaEmail = document.getElementById('otp_code_nuova_email');
    if (inputOtpNuovaEmail) {
        inputOtpNuovaEmail.addEventListener('input', function() {
            const msg = document.getElementById('msg_errore_otp_email');
            if (msg) msg.style.display = 'none';
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
            if (typeof modificaPassword === 'function') modificaPassword();
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
            const msgErroreOtp = document.getElementById('messaggio_errore_otp_cambio');
            if (msgErroreOtp) msgErroreOtp.style.display = 'none';
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

    const formAssistenzaPubblica = document.getElementById('form_assistenza');
    if (formAssistenzaPubblica) {
        formAssistenzaPubblica.addEventListener('submit', function(event) {
            if (typeof inviaAssistenza === 'function') {
                inviaAssistenza(event);
            }
        });
    }

    const inputPass = document.getElementById('password');
    const inputConfPass = document.getElementById('confermaPassword');
    
    if (inputPass) {
        inputPass.addEventListener('input', function() {
            if (typeof validaComplessitaPassword === 'function') validaComplessitaPassword();
            if (inputConfPass && typeof verificaCoincidenzaPassword === 'function') verificaCoincidenzaPassword();
        });
    }
    
    if (inputConfPass) {
        inputConfPass.addEventListener('input', function() {
            if (typeof verificaCoincidenzaPassword === 'function') verificaCoincidenzaPassword();
        });
    }

    const formLogin = document.getElementById('formLogin');
    if (formLogin) formLogin.addEventListener('submit', inviaLogin);

    const btnVerificaOtpLogin = document.getElementById('btn_verifica_otp_login');
    if (btnVerificaOtpLogin) btnVerificaOtpLogin.addEventListener('click', verificaOtpLogin);

    const linkNuovoOtpLogin = document.getElementById('link_invia_nuovo_otp_login');
    if (linkNuovoOtpLogin) linkNuovoOtpLogin.addEventListener('click', inviaNuovoOtpLogin);

    const inputOtpLogin = document.getElementById('otp_code_login');
    if (inputOtpLogin) {
        inputOtpLogin.addEventListener('input', function() {
            const msgErroreOtp = document.getElementById('messaggio_errore_otp_login');
            if (msgErroreOtp) msgErroreOtp.style.display = 'none';
        });
    }

    const btnMostraPassword = document.getElementById('btn_mostra_password');
    if (btnMostraPassword) {
        btnMostraPassword.addEventListener('click', function() {
            togglePassword('password', this);
        });
    }
    
    const btnMostraConfPassword = document.getElementById('btn_mostra_conferma_password');
    if (btnMostraConfPassword) {
        btnMostraConfPassword.addEventListener('click', function() {
            togglePassword('confermaPassword', this);
        });
    }

    const formRecuperoPassword = document.getElementById('formRecuperoPassword');
    if (formRecuperoPassword) formRecuperoPassword.addEventListener('submit', richiediResetPassword);

    const formResetPassword = document.getElementById('formResetPassword');
    if (formResetPassword) formResetPassword.addEventListener('submit', inviaNuovaPassword);

    const linkNuovoOtpReset = document.getElementById('link_invia_nuovo_otp_reset');
    if (linkNuovoOtpReset) linkNuovoOtpReset.addEventListener('click', tornaARichiestaReset);

    const inputOtpReset = document.getElementById('otp_code_reset');
    if (inputOtpReset) {
        inputOtpReset.addEventListener('input', function() {
            const msgErroreOtp = document.getElementById('messaggio_errore_otp_reset');
            if (msgErroreOtp) msgErroreOtp.style.display = 'none';
        });
    }

    const formRegistrazionePasseggero = document.getElementById('formRegistrazionePasseggero');
    if (formRegistrazionePasseggero) formRegistrazionePasseggero.addEventListener('submit', inviaRegistrazionePasseggero);

    const btnVerificaOtp = document.getElementById('btn_verifica_otp');
    if (btnVerificaOtp) btnVerificaOtp.addEventListener('click', verificaOtpRegistrazione);

    const linkNuovoOtp = document.getElementById('link_invia_nuovo_otp');
    if (linkNuovoOtp) linkNuovoOtp.addEventListener('click', inviaNuovoOtpRegistrazione);

    const inputOtp = document.getElementById('otp_code');
    if (inputOtp) {
        inputOtp.addEventListener('input', function() {
            const msgErroreOtp = document.getElementById('messaggio_errore_otp');
            if (msgErroreOtp) msgErroreOtp.style.display = 'none';
        });
    }

    const chkRichiedeFattura = document.getElementById('richiedeFattura');
    if (chkRichiedeFattura) chkRichiedeFattura.addEventListener('change', toggleFatturazione);

    const chkNotificaPush = document.getElementById('notificaPush');
    if (chkNotificaPush) chkNotificaPush.addEventListener('change', validaNotifiche);

    const chkNotificaEmail = document.getElementById('notificaEmail');
    if (chkNotificaEmail) chkNotificaEmail.addEventListener('change', validaNotifiche);

    const btnConfermaPrenotazione = document.getElementById('btn_conferma_prenotazione');
    if (btnConfermaPrenotazione) btnConfermaPrenotazione.addEventListener('click', confermaPrenotazione);

    const btnModificaPrenotazione = document.getElementById('btn_modifica_prenotazione');
    if (btnModificaPrenotazione) {
        btnModificaPrenotazione.addEventListener('click', function() {
            window.location.href = 'prenotazione.html';
        });
    }

    const formPrenotazione = document.getElementById('form_prenotazione');
    if (formPrenotazione) formPrenotazione.addEventListener('submit', function(e) {
        if (typeof inviaRichiesta === 'function') inviaRichiesta(e);
    });

    const chkReferente = document.getElementById('chk_referente');
    if (chkReferente) chkReferente.addEventListener('change', function(e) {
        if (typeof toggleReferente === 'function') toggleReferente(e);
    });

    const tipoServizio = document.getElementById('tipo_servizio');
    if (tipoServizio) tipoServizio.addEventListener('change', function() {
        if (typeof gestisciCampi === 'function') gestisciCampi();
    });

    const chkHub = document.getElementById('chk_hub');
    if (chkHub) chkHub.addEventListener('change', function(e) {
        if (typeof toggleHubTrasporti === 'function') toggleHubTrasporti(e);
    });

    const dataPartenza = document.getElementById('data_partenza');
    if (dataPartenza) dataPartenza.addEventListener('click', function() {
        if (typeof this.showPicker === 'function') this.showPicker();
    });

    const oraPartenza = document.getElementById('ora_partenza');
    if (oraPartenza) {
        oraPartenza.addEventListener('click', function() {
            if (typeof this.showPicker === 'function') this.showPicker();
        });
        oraPartenza.addEventListener('change', function() {
            if (typeof validaOrario === 'function') validaOrario();
        });
    }

    const passeggeri = document.getElementById('passeggeri');
    const bagagliGrandi = document.getElementById('bagagli_grandi');
    const bagagliMano = document.getElementById('bagagli_mano');
    
    if (passeggeri) passeggeri.addEventListener('change', function() { if (typeof validaFlottaEBagagli === 'function') validaFlottaEBagagli(); });
    if (bagagliGrandi) bagagliGrandi.addEventListener('change', function() { if (typeof validaFlottaEBagagli === 'function') validaFlottaEBagagli(); });
    if (bagagliMano) bagagliMano.addEventListener('change', function() { if (typeof validaFlottaEBagagli === 'function') validaFlottaEBagagli(); });

    const cardClasseE = document.getElementById('card_classe_e');
    if (cardClasseE) cardClasseE.addEventListener('click', function() {
        if (typeof selezionaVettura === 'function') selezionaVettura('CLASSE_E');
    });

    const cardClasseS = document.getElementById('card_classe_s');
    if (cardClasseS) cardClasseS.addEventListener('click', function() {
        if (typeof selezionaVettura === 'function') selezionaVettura('CLASSE_S');
    });

    const cardClasseV = document.getElementById('card_classe_v');
    if (cardClasseV) cardClasseV.addEventListener('click', function() {
        if (typeof selezionaVettura === 'function') selezionaVettura('CLASSE_V');
    });
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
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    const btnSubmit = document.querySelector('#formLogin button[type="submit"]');
    const testoOriginale = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = dict.js_login_loading;
    
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
                throw new Error(dict.js_login_err_active);
            }
            
            throw new Error(dict.js_login_err_invalid);
        }

        const datiSessione = await risposta.json();
        const userId = datiSessione.user.id;

        const pathAttuale = window.location.pathname.toLowerCase();
        
        const checkResponse = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userId}&select=id_passeggero,linguaggio`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + datiSessione.access_token }
        });
        const datiPasseggero = await checkResponse.json();

        if (!datiPasseggero || datiPasseggero.length === 0) {
            throw new Error(dict.js_login_err_pax);
        }
        if (datiPasseggero[0].linguaggio) {
            localStorage.setItem('driverbutler_lang', datiPasseggero[0].linguaggio);
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
            caches.open('driverbutler-pax-session').then(cache => {
                cache.put('/auth-status', new Response(JSON.stringify({ ricordami: usaLocalStorage })));
            });
        }

        storage.setItem('driverbutler_auth_token', datiSessione.access_token);
        storage.setItem('driverbutler_refresh_token', datiSessione.refresh_token);

        const ultimoUtente = localStorage.getItem('driverbutler_last_user');
        if (ultimoUtente && ultimoUtente !== userId) {
            const chiaviDaCancellare = [
                'db_nome_passeggero', 'db_tel_passeggero', 'db_chk_referente', 'db_nome_referente',
                'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_partenza_lat', 'db_partenza_lng', 'db_partenza_citta', 'db_partenza_via',
                'db_arrivo', 'db_arrivo_lat', 'db_arrivo_lng', 'db_arrivo_citta', 'db_arrivo_via', 'db_itinerario_previsto',
                'db_chk_hub', 'db_info_trasporto', 'db_ore', 'db_data_partenza', 'db_ora_partenza',
                'db_pax', 'db_grandi', 'db_mano', 'db_vettura', 'db_note_servizio', 'db_prezzo_stimato', 'db_prezzo_stripe'
            ];
            chiaviDaCancellare.forEach(chiave => localStorage.removeItem(chiave));
        }
        localStorage.setItem('driverbutler_last_user', userId);
        
        btnSubmit.textContent = dict.js_login_success;
        btnSubmit.classList.add('btn-stato-successo');
        
        storage.setItem('driverbutler_ruolo', 'passeggeri');
        window.location.href = 'dashboard.html';

    } catch (errore) {
        if (errore.message === dict.js_login_err_active) {
            document.getElementById('blocco_dati_login').classList.add('hidden');
            document.getElementById('blocco_verifica_otp_login').classList.remove('hidden');
            
            setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }, 100);
            
            btnSubmit.textContent = testoOriginale;
            btnSubmit.disabled = false;
            return;
        }

        btnSubmit.textContent = errore.message;
        btnSubmit.classList.add('btn-errore-feedback');

        setTimeout(() => {
            btnSubmit.textContent = testoOriginale;
            btnSubmit.classList.remove('btn-errore-feedback');
            btnSubmit.disabled = false;
        }, 5000);
    }
}

async function verificaOtpLogin() {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const email = document.getElementById('email').value.trim();
    const token = document.getElementById('otp_code_login').value.trim();
    const btnVerifica = document.getElementById('btn_verifica_otp_login');
    const msgErroreOtp = document.getElementById('messaggio_errore_otp_login');

    if (msgErroreOtp) msgErroreOtp.style.display = 'none';

    if (token.length !== 6) {
        if (msgErroreOtp) {
            msgErroreOtp.textContent = dict.js_otp_err_length || "Il codice deve essere di 6 cifre.";
            msgErroreOtp.style.display = 'block';
        }
        return;
    }

    const testoOriginale = btnVerifica.textContent;
    btnVerifica.disabled = true;
    btnVerifica.textContent = dict.js_login_loading || "Verifica in corso...";

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

        const checkResponse = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userId}&select=id_passeggero,linguaggio`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + datiSessione.access_token }
        });
        const datiPasseggero = await checkResponse.json();

        if (!datiPasseggero || datiPasseggero.length === 0) {
            throw new Error(dict.js_login_err_pax || "Account non autorizzato come Passeggero.");
        }
        if (datiPasseggero[0].linguaggio) {
            localStorage.setItem('driverbutler_lang', datiPasseggero[0].linguaggio);
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
            caches.open('driverbutler-pax-session').then(cache => {
                cache.put('/auth-status', new Response(JSON.stringify({ ricordami: usaLocalStorage })));
            });
        }

        storage.setItem('driverbutler_auth_token', datiSessione.access_token);
        storage.setItem('driverbutler_refresh_token', datiSessione.refresh_token);

        const ultimoUtente = localStorage.getItem('driverbutler_last_user');
        if (ultimoUtente && ultimoUtente !== userId) {
            const chiaviDaCancellare = [
                'db_nome_passeggero', 'db_tel_passeggero', 'db_chk_referente', 'db_nome_referente',
                'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_partenza_lat', 'db_partenza_lng', 'db_partenza_citta', 'db_partenza_via',
                'db_arrivo', 'db_arrivo_lat', 'db_arrivo_lng', 'db_arrivo_citta', 'db_arrivo_via', 'db_itinerario_previsto',
                'db_chk_hub', 'db_info_trasporto', 'db_ore', 'db_data_partenza', 'db_ora_partenza',
                'db_pax', 'db_grandi', 'db_mano', 'db_vettura', 'db_note_servizio', 'db_prezzo_stimato', 'db_prezzo_stripe'
            ];
            chiaviDaCancellare.forEach(chiave => localStorage.removeItem(chiave));
        }
        localStorage.setItem('driverbutler_last_user', userId);
        
        if (typeof svuotaBozze === 'function') svuotaBozze();

        btnVerifica.textContent = dict.js_login_success || "Accesso effettuato!";
        btnVerifica.classList.add('btn-stato-successo');
        
        storage.setItem('driverbutler_ruolo', 'passeggeri');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (errore) {
        btnVerifica.disabled = false;
        btnVerifica.textContent = testoOriginale;
        btnVerifica.blur();
        if (msgErroreOtp) {
            msgErroreOtp.textContent = errore.message === (dict.js_login_err_pax || "Account non autorizzato come Passeggero.") ? errore.message : (dict.js_otp_err_invalid || "Codice errato o scaduto.");
            msgErroreOtp.style.display = 'block';
        }
    }
}

async function inviaNuovoOtpLogin(event) {
    event.preventDefault();
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const email = document.getElementById('email').value.trim();
    const msgErroreOtp = document.getElementById('messaggio_errore_otp_login');

    const link = document.getElementById('link_invia_nuovo_otp_login');
    const testoOriginale = link.textContent;
    link.textContent = dict.js_rec_loading || "Invio in corso...";
    link.style.pointerEvents = "none";

    if (msgErroreOtp) msgErroreOtp.style.display = 'none';

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

        if (msgErroreOtp) {
            msgErroreOtp.textContent = dict.js_rec_success || "Nuovo codice inviato!";
            msgErroreOtp.style.color = "#00FF66";
            msgErroreOtp.style.display = 'block';
            setTimeout(() => {
                msgErroreOtp.style.display = 'none';
                msgErroreOtp.style.color = "";
            }, 5000);
        }

        link.textContent = testoOriginale;
        link.style.pointerEvents = "auto";

    } catch (errore) {
        link.textContent = testoOriginale;
        link.style.pointerEvents = "auto";
        if (msgErroreOtp) {
            msgErroreOtp.textContent = dict.js_rec_conn_err || "Errore di connessione. Riprova.";
            msgErroreOtp.style.color = "#FF4444";
            msgErroreOtp.style.display = 'block';
        }
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

function toggleReferente(event) {
    gestisciVisualizzazioneReferente();
}

function gestisciVisualizzazioneReferente() {
    const chk = document.getElementById('chk_referente');
    const sezione = document.getElementById('sezione_referente');
    const inputNome = document.getElementById('nome_referente');
    const inputTel = document.getElementById('tel_referente');
    const inputNomePax = document.getElementById('nome_passeggero');

    if (chk && sezione) {
        if (chk.checked) {
            sezione.classList.remove('hidden');
            if (inputNome) inputNome.required = true;
            if (inputTel) inputTel.required = true;
            
            if (localStorage.getItem('driverbutler_is_business') === 'false') {
                const defaultNome = localStorage.getItem('driverbutler_privato_nome') || '';
                const defaultTel = localStorage.getItem('driverbutler_privato_tel') || '';
                
                if (inputNome) inputNome.value = defaultNome;
                if (itiReferente) itiReferente.setNumber(defaultTel);
                
                const currentNomePax = inputNomePax ? inputNomePax.value.trim() : '';
                let currentTelPax = '';
                if (itiPasseggero) {
                    currentTelPax = itiPasseggero.getNumber().replace(/\s+/g, '');
                }
                const cleanDefaultTel = defaultTel.replace(/\s+/g, '');
                
                if (currentNomePax === defaultNome.trim() && currentTelPax === cleanDefaultTel) {
                    if (inputNomePax) inputNomePax.value = '';
                    if (itiPasseggero) itiPasseggero.setNumber('');
                }
            }
        } else {
            sezione.classList.add('hidden');
            if (inputNome) inputNome.required = false;
            if (inputTel) inputTel.required = false;
            
            if (localStorage.getItem('driverbutler_is_business') === 'false') {
                if (inputNomePax) inputNomePax.value = localStorage.getItem('driverbutler_privato_nome') || '';
                if (itiPasseggero) itiPasseggero.setNumber(localStorage.getItem('driverbutler_privato_tel') || '');
                if (inputNome) inputNome.value = '';
                if (itiReferente) itiReferente.setNumber('');
            }
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
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const tipoServizio = document.getElementById('tipo_servizio').value;
    const btnSubmit = document.getElementById('btn_submit');
    
    if (!tipoServizio) return;

    if (tipoServizio === 'DISPOSIZIONE') {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = dict.btn_procedi;
        }
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

        if (!latLngPartenza || !latLngArrivo) {
            nascondiPrezzi();
            if (btnSubmit) {
                btnSubmit.disabled = true;
                btnSubmit.textContent = dict.err_no_coord || "INDIRIZZO NON VALIDO: USA LA TENDINA";
            }
            return;
        }

        if (btnSubmit) {
            btnSubmit.disabled = true;
            btnSubmit.textContent = dict.btn_procedi_calc || "CALCOLO IN CORSO...";
        }

        if (typeof google !== 'undefined' && google.maps && google.maps.DistanceMatrixService) {
            const service = new google.maps.DistanceMatrixService();
            service.getDistanceMatrix({
                origins: [latLngPartenza],
                destinations: [latLngArrivo],
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

                    if (!distanzaValida) {
                        if (tentativo < 5) {
                            setTimeout(() => calcolaPrezzi(tentativo + 1), 3000);
                            return;
                        } else {
                            nascondiPrezzi();
                            if (btnSubmit) {
                                btnSubmit.disabled = true;
                                btnSubmit.textContent = dict.btn_procedi_err || "ERRORE DI CALCOLO: RIPROVA TRA POCO";
                            }
                            return;
                        }
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

                    if (btnSubmit) {
                        btnSubmit.disabled = false;
                        btnSubmit.textContent = dict.btn_procedi;
                    }
                } else {
                    if (tentativo < 5) {
                        setTimeout(() => calcolaPrezzi(tentativo + 1), 3000);
                        return;
                    } else {
                        nascondiPrezzi();
                        if (btnSubmit) {
                            btnSubmit.disabled = true;
                            btnSubmit.textContent = dict.btn_procedi_err || "ERRORE DI CALCOLO: RIPROVA TRA POCO";
                        }
                    }
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
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

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
    
    tagE.textContent = (inputVettura.value === 'CLASSE_E') ? dict.js_vettura_sel : dict.js_vettura_disp;
    tagS.textContent = (inputVettura.value === 'CLASSE_S') ? dict.js_vettura_sel : dict.js_vettura_disp;
    tagV.textContent = (inputVettura.value === 'CLASSE_V') ? dict.js_vettura_sel : dict.js_vettura_disp;
    
    if(inputVettura.value === 'CLASSE_E') cardE.classList.add('selezionata');
    if(inputVettura.value === 'CLASSE_S') cardS.classList.add('selezionata');
    if(inputVettura.value === 'CLASSE_V') cardV.classList.add('selezionata');

    motivoE.classList.add('hidden');
    motivoS.classList.add('hidden');
    alertBox.classList.add('hidden');
    btnSubmit.disabled = false;

    if (punteggioBagagli > 16) {
        alertBox.classList.remove('hidden');
        btnSubmit.disabled = true;
        inputVettura.value = ""; 
        cardE.className = "vettura-card bloccata";
        cardS.className = "vettura-card bloccata";
        cardV.className = "vettura-card bloccata";
        tagE.textContent = dict.js_vettura_non_disp;
        tagS.textContent = dict.js_vettura_non_disp;
        tagV.textContent = dict.js_vettura_non_disp;
        nascondiPrezzi();
        return;
    }

    const msgBagagliEccedenti = dict.js_motivo_bagagli;

    let escludiE = false;
    let motivoE_testo = "";

    if (pax > 2) {
        escludiE = true;
        motivoE_testo = dict.js_motivo_comfort;
    } else if (punteggioBagagli > 5) {
        escludiE = true;
        motivoE_testo = msgBagagliEccedenti;
    }

    if (escludiE) {
        cardE.className = "vettura-card bloccata";
        tagE.textContent = dict.js_vettura_non_disp;
        motivoE.textContent = motivoE_testo;
        motivoE.classList.remove('hidden');
        if (inputVettura.value === 'CLASSE_E') inputVettura.value = "";
    }

    let escludiS = false;
    let motivoS_testo = "";

    if (pax > 2) {
        escludiS = true;
        motivoS_testo = dict.js_motivo_comfort;
    } else if (punteggioBagagli > 5) {
        escludiS = true;
        motivoS_testo = msgBagagliEccedenti;
    }

    if (escludiS) {
        cardS.className = "vettura-card bloccata";
        tagS.textContent = dict.js_vettura_non_disp;
        motivoS.textContent = motivoS_testo;
        motivoS.classList.remove('hidden');
        if (inputVettura.value === 'CLASSE_S') inputVettura.value = "";
    }
    
    calcolaPrezzi();
}

function selezionaVettura(codiceVettura) {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

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

    if(cardE.classList.contains('attiva')) { cardE.classList.remove('selezionata'); tagE.textContent = dict.js_vettura_disp; }
    if(cardS.classList.contains('attiva')) { cardS.classList.remove('selezionata'); tagS.textContent = dict.js_vettura_disp; }
    if(cardV.classList.contains('attiva')) { cardV.classList.remove('selezionata'); tagV.textContent = dict.js_vettura_disp; }

    cardCliccata.classList.add('selezionata');
    inputVettura.value = codiceVettura;
    
    if(codiceVettura === 'CLASSE_E') tagE.textContent = dict.js_vettura_sel;
    if(codiceVettura === 'CLASSE_S') tagS.textContent = dict.js_vettura_sel;
    if(codiceVettura === 'CLASSE_V') tagV.textContent = dict.js_vettura_sel;

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
        
        const tipoServizioImpostato = document.getElementById('tipo_servizio').value;
        localStorage.setItem('db_tipo_servizio', tipoServizioImpostato);
        localStorage.setItem('db_partenza', document.getElementById('partenza').value);
        if (latLngPartenza) {
            localStorage.setItem('db_partenza_lat', latLngPartenza.lat);
            localStorage.setItem('db_partenza_lng', latLngPartenza.lng);
        }
        if (strutturalePartenzaCitta) localStorage.setItem('db_partenza_citta', strutturalePartenzaCitta);
        if (strutturalePartenzaVia) localStorage.setItem('db_partenza_via', strutturalePartenzaVia);

        localStorage.setItem('db_arrivo', tipoServizioImpostato === 'TRASFERIMENTO' ? (document.getElementById('arrivo').value || '') : '');
        if (tipoServizioImpostato === 'TRASFERIMENTO' && latLngArrivo) {
            localStorage.setItem('db_arrivo_lat', latLngArrivo.lat);
            localStorage.setItem('db_arrivo_lng', latLngArrivo.lng);
            if (strutturaleArrivoCitta) localStorage.setItem('db_arrivo_citta', strutturaleArrivoCitta);
            if (strutturaleArrivoVia) localStorage.setItem('db_arrivo_via', strutturaleArrivoVia);
        }
        localStorage.setItem('db_itinerario_previsto', tipoServizioImpostato === 'DISPOSIZIONE' ? document.getElementById('itinerario_previsto').value : '');
        
        localStorage.setItem('db_chk_hub', document.getElementById('chk_hub').checked);
        localStorage.setItem('db_info_trasporto', document.getElementById('info_trasporto').value);
        localStorage.setItem('db_ore', tipoServizioImpostato === 'DISPOSIZIONE' ? document.getElementById('ore').value : '');
        
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
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

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
        mostraUiRedirectCheckout('body');
        setTimeout(() => {
            window.location.href = 'dashboard.html';
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
        document.getElementById('view_servizio').textContent = dict.opt_tratta;
        document.getElementById('blocco_view_arrivo').classList.remove('hidden');
        document.getElementById('view_arrivo').textContent = arrivo || '-';
        document.getElementById('blocco_view_ore').classList.add('hidden');
        document.getElementById('blocco_view_itinerario').classList.add('hidden');
    } else if (tipoServizio === 'DISPOSIZIONE') {
        document.getElementById('view_servizio').textContent = dict.opt_disposizione;
        document.getElementById('blocco_view_ore').classList.remove('hidden');
        document.getElementById('view_ore').textContent = ore + dict.js_ore;
        document.getElementById('blocco_view_arrivo').classList.add('hidden');
        
        if (itinerario && itinerario.trim() !== '') {
            document.getElementById('blocco_view_itinerario').classList.remove('hidden');
            document.getElementById('view_itinerario').textContent = itinerario;
        }
    }

    let vetturaLeggibile = "-";
    if (vetturaCodice === 'CLASSE_E') vetturaLeggibile = dict.nome_classe_e + "<br>(" + dict.vettura_berlina_comfort + ")";
    if (vetturaCodice === 'CLASSE_S') vetturaLeggibile = dict.nome_classe_s + "<br>(" + dict.vettura_berlina_lusso + ")";
    if (vetturaCodice === 'CLASSE_V') vetturaLeggibile = dict.nome_classe_v + "<br>(" + dict.vettura_van_comfort + ")";
    document.getElementById('view_vettura').innerHTML = vetturaLeggibile;

    let dataFormattata = dataPartenza;
    if (dataPartenza) {
        const parti = dataPartenza.split('-');
        if(parti.length === 3) dataFormattata = `${parti[2]}/${parti[1]}/${parti[0]}`;
    }
    document.getElementById('view_data_ora').textContent = dataFormattata + dict.js_alle_ore + oraPartenza;
    document.getElementById('view_partenza').textContent = partenza || '-';

    if (chkHub) {
        document.getElementById('blocco_view_hub').classList.remove('hidden');
        document.getElementById('view_info_trasporto').textContent = infoTrasporto || '-';
    }

    let testoPax = pax === '1' ? dict.js_pax_singolo : pax + dict.js_pax_plur;
    let testoGrandi = grandi === '1' ? dict.js_val_singola : grandi + dict.js_val_plur;
    let testoMano = mano === '1' ? dict.js_tro_singolo : mano + dict.js_tro_plur;

    document.getElementById('view_carico').innerHTML = `${testoPax}<br>${testoGrandi}<br>${testoMano}`;
    
    const viewNote = document.getElementById('view_note');
    if (noteServizio && noteServizio.trim() !== '') {
        viewNote.textContent = noteServizio;
        viewNote.classList.remove('nota-vuota');
    } else {
        viewNote.textContent = dict.js_nessuna_nota;
        viewNote.classList.add('nota-vuota');
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
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    
    let prezzoNumero = 0;
    if (prezzoStimato) {
        prezzoNumero = parseFloat(prezzoStimato.replace('€', '').trim()) || 0;
    }

    const urlCompleto = "https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/prenotazioni";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    const token = localStorage.getItem('driverbutler_auth_token');

    let emailUtente = null;
    let codicePasseggero = null;
    let idUtente = null;
    
    if (token) {
        try {
            const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
                headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
            });
            if (userRes.ok) {
                const userData = await userRes.json();
                emailUtente = userData.email;
                idUtente = userData.id;
                
                const passRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userData.id}&select=codice_passeggero`, {
                    headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
                });
                if (passRes.ok) {
                    const passData = await passRes.json();
                    if (passData && passData.length > 0) {
                        codicePasseggero = passData[0].codice_passeggero;
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
    }

    const corpoDati = {
        codice_passeggero: codicePasseggero,
        id_passeggero: idUtente,
        nome_passeggero: localStorage.getItem('db_nome_passeggero') || null,
        tel_passeggero: localStorage.getItem('db_tel_passeggero') || null,
        chk_referente: localStorage.getItem('db_chk_referente') === 'true',
        nome_referente: localStorage.getItem('db_nome_referente') || null,
        tel_referente: localStorage.getItem('db_tel_referente') || null,
        tipo_servizio: localStorage.getItem('db_tipo_servizio') === 'TRASFERIMENTO' ? 'TRANSFER' : (localStorage.getItem('db_tipo_servizio') || null),
        ore: localStorage.getItem('db_tipo_servizio') === 'DISPOSIZIONE' && localStorage.getItem('db_ore') ? parseInt(localStorage.getItem('db_ore')) : null,
        partenza: localStorage.getItem('db_partenza') || null,
        partenza_lat: localStorage.getItem('db_partenza_lat') ? parseFloat(localStorage.getItem('db_partenza_lat')) : null,
        partenza_lng: localStorage.getItem('db_partenza_lng') ? parseFloat(localStorage.getItem('db_partenza_lng')) : null,
        partenza_citta: localStorage.getItem('db_partenza_citta') || null,
        partenza_via: localStorage.getItem('db_partenza_via') || null,
        arrivo: localStorage.getItem('db_tipo_servizio') === 'TRASFERIMENTO' ? (localStorage.getItem('db_arrivo') || null) : null,
        arrivo_lat: localStorage.getItem('db_arrivo_lat') ? parseFloat(localStorage.getItem('db_arrivo_lat')) : null,
        arrivo_lng: localStorage.getItem('db_arrivo_lng') ? parseFloat(localStorage.getItem('db_arrivo_lng')) : null,
        arrivo_citta: localStorage.getItem('db_arrivo_citta') || null,
        arrivo_via: localStorage.getItem('db_arrivo_via') || null,
        itinerario_previsto: localStorage.getItem('db_tipo_servizio') === 'DISPOSIZIONE' ? (localStorage.getItem('db_itinerario_previsto') || null) : null,
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
                "Authorization": "Bearer " + token,
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
            'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_partenza_lat', 'db_partenza_lng', 'db_partenza_citta', 'db_partenza_via',
            'db_arrivo', 'db_arrivo_lat', 'db_arrivo_lng', 'db_arrivo_citta', 'db_arrivo_via', 'db_itinerario_previsto',
            'db_chk_hub', 'db_info_trasporto', 'db_ore', 'db_data_partenza', 'db_ora_partenza',
            'db_pax', 'db_grandi', 'db_mano', 'db_vettura', 'db_note_servizio', 'db_prezzo_stimato', 'db_prezzo_stripe'
        ];
        chiaviDaCancellare.forEach(chiave => localStorage.removeItem(chiave));

        Object.keys(localStorage).forEach(key => {
            if (key.includes('draft_prenotazione.html')) {
                localStorage.removeItem(key);
            }
        });

        mostraUiPrenotazioneOk('body', codiceGenerato);
        
        document.getElementById('btn_chiudi_conferma').onclick = function() {
            window.location.href = 'dashboard.html';
        };

    } catch (errore) {
        mostraUiPrenotazioneErrore('body');
        
        document.getElementById('btn_riprova_errore').onclick = function() {
            window.location.reload();
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
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    const msgErroreServer = document.getElementById('messaggio_errore_server');
    if (msgErroreServer) {
        msgErroreServer.style.display = 'none';
    }

    if (!validaComplessitaPassword() || !verificaCoincidenzaPassword() || !validaNotifiche()) {
        return;
    }

    const btnSubmit = document.getElementById('btn_invia_registrazione');
    let testoOriginale = "REGISTRATI";
    if (btnSubmit) {
        testoOriginale = btnSubmit.textContent;
        btnSubmit.disabled = true;
        btnSubmit.textContent = dict.js_reg_loading || "Elaborazione...";
        btnSubmit.classList.add('btn-in-caricamento');
    }

    const urlAuth = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/signup";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    const email = document.getElementById('email').value;

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

        const richiedeFattura = document.getElementById('richiedeFattura').checked;

        const corpoDati = {
            display_name: document.getElementById('nome').value,
            nome_cognome: document.getElementById('nome').value,
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
            notifica_email: document.getElementById('notificaEmail').checked,
            linguaggio: linguaAttuale
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
            throw new Error(authError.msg || authError.message || "Errore credenziali");
        }

        document.getElementById('blocco_dati_registrazione').classList.add('hidden');
        document.getElementById('blocco_verifica_otp').classList.remove('hidden');
        
        setTimeout(() => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        }, 100);

    } catch (errore) {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.textContent = testoOriginale;
            btnSubmit.classList.remove('btn-in-caricamento');
        }

        let testoErrore = (dict.js_reg_err_generic || "Errore: ") + errore.message;
        
        if (errore.message === "EMAIL_ESISTENTE" || errore.message.toLowerCase().includes("user already registered") || errore.message.toLowerCase().includes("already")) {
            testoErrore = dict.js_reg_err_exists;
        } else if (errore.message.toLowerCase().includes("sending confirmation email") || errore.message.toLowerCase().includes("rate limit")) {
            testoErrore = dict.js_reg_err_email_send;
        }
        
        const overlay = document.getElementById('modale_errore_registrazione');
        if (overlay) {
            document.getElementById('testo_errore_registrazione').innerHTML = testoErrore;
            overlay.classList.remove('hidden');
            
            document.getElementById('btn_chiudi_errore_reg').onclick = function() {
                overlay.classList.add('hidden');
            };
        } else if (msgErroreServer) {
            msgErroreServer.textContent = testoErrore;
            msgErroreServer.style.display = 'block';
        }
    }
}

async function verificaOtpRegistrazione() {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const email = document.getElementById('email').value;
    const token = document.getElementById('otp_code').value.trim();
    const btnVerifica = document.getElementById('btn_verifica_otp');
    const msgErroreOtp = document.getElementById('messaggio_errore_otp');

    if (msgErroreOtp) msgErroreOtp.style.display = 'none';

    if (token.length !== 6) {
        if (msgErroreOtp) {
            msgErroreOtp.textContent = dict.js_otp_err_length || "Il codice deve essere di 6 cifre.";
            msgErroreOtp.style.display = 'block';
        }
        return;
    }

    const testoOriginale = btnVerifica.textContent;
    btnVerifica.disabled = true;
    btnVerifica.textContent = dict.js_login_loading || "Verifica in corso...";

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
        localStorage.setItem('driverbutler_ruolo', 'passeggeri');
        
        const userId = datiSessione.user.id;
        localStorage.setItem('driverbutler_last_user', userId);

        if (typeof svuotaBozze === 'function') svuotaBozze();
        
        btnVerifica.textContent = dict.js_login_success || "Accesso effettuato!";
        btnVerifica.classList.add('btn-stato-successo');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);

    } catch (errore) {
        btnVerifica.disabled = false;
        btnVerifica.textContent = testoOriginale;
        btnVerifica.blur();
        if (msgErroreOtp) {
            msgErroreOtp.textContent = dict.js_otp_err_invalid || "Codice errato o scaduto.";
            msgErroreOtp.style.display = 'block';
        }
    }
}

async function inviaNuovoOtpRegistrazione(event) {
    event.preventDefault();
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const email = document.getElementById('email').value;
    const msgErroreOtp = document.getElementById('messaggio_errore_otp');

    const link = document.getElementById('link_invia_nuovo_otp');
    const testoOriginale = link.textContent;
    link.textContent = dict.js_rec_loading || "Invio in corso...";
    link.style.pointerEvents = "none";

    if (msgErroreOtp) msgErroreOtp.style.display = 'none';

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

        if (msgErroreOtp) {
            msgErroreOtp.textContent = dict.js_rec_success || "Nuovo codice inviato!";
            msgErroreOtp.style.color = "#00FF66";
            msgErroreOtp.style.display = 'block';
            setTimeout(() => {
                msgErroreOtp.style.display = 'none';
                msgErroreOtp.style.color = "";
            }, 5000);
        }

        link.textContent = testoOriginale;
        link.style.pointerEvents = "auto";

    } catch (errore) {
        link.textContent = testoOriginale;
        link.style.pointerEvents = "auto";
        if (msgErroreOtp) {
            msgErroreOtp.textContent = dict.js_rec_conn_err || "Errore di connessione. Riprova.";
            msgErroreOtp.style.color = "#FF4444";
            msgErroreOtp.style.display = 'block';
        }
    }
}

async function caricaDatiDashboardPasseggero() {
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
                    localStorage.setItem('driverbutler_is_business', 'true');
                } else {
                    document.getElementById('nome_passeggero').value = passeggero.nome_cognome || '';
                    if (itiPasseggero && passeggero.telefono) {
                        itiPasseggero.setNumber(passeggero.telefono);
                    }
                    localStorage.setItem('driverbutler_is_business', 'false');
                    localStorage.setItem('driverbutler_privato_nome', passeggero.nome_cognome || '');
                    localStorage.setItem('driverbutler_privato_tel', passeggero.telefono || '');
                    
                    const labelRef = document.querySelector('label[for="chk_referente"]');
                    if (labelRef) {
                        const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
                        labelRef.textContent = traduzioni[linguaAttuale].js_prenotazione_terzi;
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
            
            if (typeof applicaBozze === 'function') applicaBozze();

        } else {
            esciAccount();
        }
    } catch (error) {
        localStorage.removeItem('driverbutler_auth_token');
        window.location.href = 'login.html';
    }
}

async function aggiornaProfilo(event) {
    event.preventDefault();

    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    if (!validaNotificheDashboard()) return;

    const btnSubmit = document.querySelector('#formModificaProfilo button[type="submit"]');
    const testoOriginale = btnSubmit.textContent;
    btnSubmit.disabled = true;

    const alertBox = document.getElementById('alert_chiusura_fatturazione');
    if (alertBox && !alertBox.classList.contains('hidden')) {
        btnSubmit.textContent = dict.js_prof_err_vat;
        btnSubmit.classList.add('btn-stato-errore');
        setTimeout(() => {
            btnSubmit.textContent = testoOriginale;
            btnSubmit.classList.remove('btn-stato-errore');
            btnSubmit.disabled = false;
        }, 5000);
        return;
    }

    btnSubmit.textContent = dict.js_prof_loading || "Salvataggio in corso...";

    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const userData = await userRes.json();
        
        const nuovaEmail = document.getElementById('profilo_email').value.trim();
        
        if (nuovaEmail !== userData.email) {
            btnSubmit.textContent = testoOriginale;
            btnSubmit.disabled = false;
            
            document.getElementById('formModificaProfilo').classList.add('hidden');
            document.getElementById('blocco_sicurezza_email_password').classList.remove('hidden');
            return;
        }

        const userId = userData.id;
        let prefissoTel = "+" + itiProfiloPasseggero.getSelectedCountryData().dialCode;
        let numeroDigitato = document.getElementById('profilo_telefono').value.trim();
        let telefonoFinale = (numeroDigitato.startsWith('+') ? numeroDigitato : (prefissoTel + numeroDigitato)).replace(/\s+/g, '');

        const richiedeFattura = document.getElementById('profilo_richiedeFattura').checked;
        const urlPatch = `https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userId}`;
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

        if (!dbRes.ok) throw new Error("Errore database");

        await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            method: "PUT",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ data: { display_name: corpoDati.nome_cognome, name: corpoDati.nome_cognome } })
        });
        
        if (typeof svuotaBozze === 'function') svuotaBozze();
        
        btnSubmit.textContent = dict.js_prof_success;
        btnSubmit.classList.add('btn-stato-successo');

        setTimeout(() => {
            btnSubmit.textContent = testoOriginale;
            btnSubmit.classList.remove('btn-stato-successo');
            btnSubmit.disabled = false;
        }, 5000);
        
        caricaDatiDashboardPasseggero();
        
    } catch (errore) {
        btnSubmit.textContent = dict.js_prof_err_save;
        btnSubmit.classList.add('btn-stato-errore');

        setTimeout(() => {
            btnSubmit.textContent = testoOriginale;
            btnSubmit.classList.remove('btn-stato-errore');
            btnSubmit.disabled = false;
        }, 5000);
    }
}

async function verificaPasswordPerEmail(event) {
    event.preventDefault();
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const msgErrore = document.getElementById('msg_errore_password_email');
    msgErrore.style.display = 'none';

    const btn = document.getElementById('btn_conferma_password_email');
    const pwdInserita = document.getElementById('password_attuale_email').value;
    
    const testoOriginale = btn.textContent;
    btn.disabled = true;
    btn.textContent = dict.js_login_loading || "Verifica...";

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
        btn.textContent = testoOriginale;
        document.getElementById('password_attuale_email').value = '';
        msgErrore.textContent = errore.message === "PWD_ERRATA" ? (dict.js_login_err_invalid || "Password errata.") : "Errore di connessione.";
        msgErrore.style.display = 'block';
    }
}

async function inviaOtpNuovaEmail(event, daFlussoPrincipale = false) {
    if (event) event.preventDefault();
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    
    const nuovaEmail = document.getElementById('profilo_email').value.trim();
    const btn = document.getElementById('btn_conferma_password_email');
    const link = document.getElementById('link_rinvia_otp_email');
    const msgErrore = document.getElementById('msg_errore_otp_email');
    if (msgErrore) msgErrore.style.display = 'none';

    if (!daFlussoPrincipale) {
        link.textContent = dict.js_rec_loading || "Invio in corso...";
        link.style.pointerEvents = "none";
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
            document.getElementById('blocco_sicurezza_email_password').classList.add('hidden');
            document.getElementById('blocco_sicurezza_email_otp').classList.remove('hidden');
            btn.disabled = false;
            btn.textContent = dict.btn_procedi || "Procedi";
        } else {
            msgErrore.textContent = dict.js_rec_success || "Nuovo codice inviato!";
            msgErrore.style.color = "#00FF66";
            msgErrore.style.display = 'block';
            setTimeout(() => { msgErrore.style.display = 'none'; msgErrore.style.color = ""; }, 5000);
            link.textContent = dict.link_invia_nuovo_otp || "Codice scaduto o non ricevuto? Invia di nuovo";
            link.style.pointerEvents = "auto";
        }

    } catch (errore) {
        if (daFlussoPrincipale) {
            const modalePass = document.getElementById('msg_errore_password_email');
            btn.disabled = false;
            btn.textContent = dict.btn_procedi || "Procedi";
            modalePass.textContent = errore.message === "EMAIL_ESISTENTE" ? (dict.js_prof_err_email_exists || "La mail scelta è già registrata.") : "Errore invio OTP.";
            modalePass.style.display = 'block';
        } else {
            link.textContent = dict.link_invia_nuovo_otp || "Codice scaduto o non ricevuto? Invia di nuovo";
            link.style.pointerEvents = "auto";
            msgErrore.textContent = errore.message === "EMAIL_ESISTENTE" ? (dict.js_prof_err_email_exists || "La mail scelta è già registrata.") : "Errore di connessione.";
            msgErrore.style.color = "#FF4444";
            msgErrore.style.display = 'block';
        }
    }
}

async function verificaOtpNuovaEmail(event) {
    event.preventDefault();
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const msgErrore = document.getElementById('msg_errore_otp_email');
    msgErrore.style.display = 'none';

    const tokenOtp = document.getElementById('otp_code_nuova_email').value.trim();
    if (tokenOtp.length !== 6) {
        msgErrore.textContent = dict.js_otp_err_length || "Il codice deve essere di 6 cifre.";
        msgErrore.style.display = 'block';
        return;
    }

    const nuovaEmail = document.getElementById('profilo_email').value.trim();
    const btn = document.getElementById('btn_verifica_otp_email');
    const testoOriginale = btn.textContent;
    btn.disabled = true;
    btn.textContent = dict.js_login_loading || "Verifica...";

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

        if (typeof svuotaBozze === 'function') svuotaBozze();

        const titoloFeedback = `<h2 class="feedback-titolo feedback-titolo-successo">${dict.js_check_success_title || "Successo"}</h2>`;
        const msgFeedback = `<p class="feedback-testo">${dict.js_prof_email_success_msg || "L'indirizzo email è stato aggiornato correttamente."}</p>`;
        const btnDashboard = `<a href="dashboard.html" class="btn btn-primary btn-full">${dict.menu_home || "Vai al Pannello Utente"}</a>`;
        
        mostraSchermataFeedback('successo', '.login-wrapper', titoloFeedback, msgFeedback, btnDashboard);

    } catch (errore) {
        btn.disabled = false;
        btn.textContent = testoOriginale;
        msgErrore.textContent = dict.js_otp_err_invalid || "Codice errato o scaduto.";
        msgErrore.style.display = 'block';
    }
}

async function modificaPassword() {
    const btn = document.getElementById('btn_modifica_password');
    if (!btn) return;

    const ruoloSalvato = localStorage.getItem('driverbutler_ruolo');
    if (ruoloSalvato !== 'passeggeri') {
        esciAccount();
        return;
    }
    
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    const testoOriginale = btn.textContent;
    btn.textContent = dict.js_rec_loading || "Invio richiesta...";
    btn.disabled = true;

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

        document.getElementById('blocco_richiesta_cambio').classList.add('hidden');
        document.getElementById('blocco_verifica_cambio').classList.remove('hidden');
        
        btn.disabled = false;
        btn.textContent = testoOriginale;

    } catch (errore) {
        console.error(errore);
        btn.textContent = dict.js_rec_err || "Errore di invio";
        btn.classList.add('btn-stato-errore'); 
        
        setTimeout(() => {
            btn.textContent = testoOriginale;
            btn.classList.remove('btn-stato-errore');
            btn.disabled = false;
        }, 5000);
    }
}

async function verificaOtpECambiaPassword(event) {
    event.preventDefault();

    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    const msgErroreServer = document.getElementById('messaggio_errore_server_cambio');
    if (msgErroreServer) msgErroreServer.style.display = 'none';
    
    const msgErroreOtp = document.getElementById('messaggio_errore_otp_cambio');
    if (msgErroreOtp) msgErroreOtp.style.display = 'none';

    const tokenOtp = document.getElementById('otp_code_cambio').value.trim();
    if (tokenOtp.length !== 6) {
        if (msgErroreOtp) {
            msgErroreOtp.textContent = dict.js_otp_err_length || "Il codice deve essere di 6 cifre.";
            msgErroreOtp.style.display = 'block';
        }
        return;
    }

    if (typeof validaComplessitaPassword === 'function' && !validaComplessitaPassword()) return;
    if (typeof verificaCoincidenzaPassword === 'function' && !verificaCoincidenzaPassword()) return;

    const nuovaPassword = document.getElementById('password').value;
    const btnSubmit = document.getElementById('btn_salva_password_interna');
    const testoOriginale = btnSubmit.textContent;
    
    btnSubmit.textContent = dict.js_pass_loading || "Salvataggio in corso...";
    btnSubmit.disabled = true;

    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!userRes.ok) throw new Error("Sessione non valida");
        
        const userData = await userRes.json();
        const emailUtente = userData.email;

        const verifyRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/verify", {
            method: "POST",
            headers: {
                "apikey": chiaveAnon,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ type: "recovery", email: emailUtente, token: tokenOtp })
        });

        if (!verifyRes.ok) throw new Error("OTP_INVALID");

        const sessioneRecupero = await verifyRes.json();
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
                throw new Error(dict.js_pass_err_same || "La nuova password digitata è uguale all'attuale.");
            }
            throw new Error("UPDATE_FAILED");
        }

        localStorage.setItem('driverbutler_auth_token', sessioneRecupero.access_token);
        localStorage.setItem('driverbutler_refresh_token', sessioneRecupero.refresh_token);

        if (typeof svuotaBozze === 'function') svuotaBozze();

        btnSubmit.textContent = dict.js_pass_success || "Password aggiornata! Accesso in corso...";
        btnSubmit.classList.add('btn-stato-successo');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (errore) {
        btnSubmit.textContent = testoOriginale;
        btnSubmit.disabled = false;
        
        if (errore.message === "OTP_INVALID") {
            if (msgErroreOtp) {
                msgErroreOtp.textContent = dict.js_otp_err_invalid || "Codice errato o scaduto.";
                msgErroreOtp.style.display = 'block';
            }
        } else {
            if (msgErroreServer) {
                msgErroreServer.textContent = errore.message === "UPDATE_FAILED" ? (dict.js_pass_err_update || "Impossibile aggiornare la password.") : errore.message;
                msgErroreServer.style.display = 'block';
            }
        }
    }
}

async function inviaNuovoOtpCambio(event) {
    event.preventDefault();
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const msgErroreOtp = document.getElementById('messaggio_errore_otp_cambio');

    const link = document.getElementById('link_invia_nuovo_otp_cambio');
    const testoOriginale = link.textContent;
    link.textContent = dict.js_rec_loading || "Invio in corso...";
    link.style.pointerEvents = "none";

    if (msgErroreOtp) msgErroreOtp.style.display = 'none';

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

        if (msgErroreOtp) {
            msgErroreOtp.textContent = dict.js_rec_success || "Nuovo codice inviato!";
            msgErroreOtp.style.color = "#00FF66";
            msgErroreOtp.style.display = 'block';
            setTimeout(() => {
                msgErroreOtp.style.display = 'none';
                msgErroreOtp.style.color = "";
            }, 5000);
        }

        link.textContent = testoOriginale;
        link.style.pointerEvents = "auto";

    } catch (errore) {
        link.textContent = testoOriginale;
        link.style.pointerEvents = "auto";
        if (msgErroreOtp) {
            msgErroreOtp.textContent = dict.js_rec_conn_err || "Errore di connessione. Riprova.";
            msgErroreOtp.style.color = "#FF4444";
            msgErroreOtp.style.display = 'block';
        }
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

    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    const emailUtente = document.getElementById('assistenza_email').value.trim();
    const messaggioUtente = document.getElementById('testo_assistenza').value.trim();
    const btnSubmit = document.querySelector('#form_assistenza button[type="submit"]');

    const testoOriginale = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = dict.js_assist_loading;

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
        alert(dict.js_assist_err);
        btnSubmit.disabled = false;
        btnSubmit.textContent = testoOriginale;
    }
}

function esciAccount() {
    const chiaviDaCancellare = [
        'driverbutler_auth_token', 'driverbutler_refresh_token', 'driverbutler_ruolo', 'driverbutler_last_user', 'driverbutler_last_page',
        'db_nome_passeggero', 'db_tel_passeggero', 'db_chk_referente', 'db_nome_referente',
        'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_partenza_lat', 'db_partenza_lng', 'db_partenza_citta', 'db_partenza_via',
        'db_arrivo', 'db_arrivo_lat', 'db_arrivo_lng', 'db_arrivo_citta', 'db_arrivo_via', 'db_itinerario_previsto',
        'db_chk_hub', 'db_info_trasporto', 'db_ore', 'db_data_partenza', 'db_ora_partenza',
        'db_pax', 'db_grandi', 'db_mano', 'db_vettura', 'db_note_servizio', 'db_prezzo_stimato', 'db_prezzo_stripe'
    ];
    chiaviDaCancellare.forEach(chiave => {
        localStorage.removeItem(chiave);
        sessionStorage.removeItem(chiave);
        sessionStorage.removeItem('pax_' + chiave);
    });
    localStorage.removeItem('driverbutler_ricordami');
    sessionStorage.removeItem('finestra_attiva');
    if ('caches' in window) {
        caches.delete('driverbutler-pax-session');
    }
    window.location.href = 'index.html';
}

async function richiediResetPassword(event) {
    event.preventDefault();
    
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    const email = document.getElementById('email_recupero').value.trim();
    const btn = document.getElementById('btn_invia_recupero');

    const testoOriginale = btn.textContent;
    btn.disabled = true;
    btn.textContent = dict.js_rec_proc || "Elaborazione in corso...";

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

        document.getElementById('blocco_richiesta_reset').classList.add('hidden');
        document.getElementById('blocco_verifica_reset').classList.remove('hidden');
        
        const testoInvio = document.getElementById('testo_invio_reset_email');
        if (testoInvio) {
            testoInvio.innerHTML = (linguaAttuale === 'en' ? 'We have sent a security code to: ' : 'Abbiamo inviato un codice di sicurezza a: ') + `<strong>${email}</strong>`;
        }

        btn.disabled = false;
        btn.textContent = testoOriginale;

    } catch (errore) {
        btn.textContent = dict.js_rec_conn_err || "Errore di connessione. Riprova.";
        btn.classList.add('btn-stato-errore');
        
        setTimeout(() => {
            btn.textContent = testoOriginale;
            btn.classList.remove('btn-stato-errore');
            btn.disabled = false;
        }, 5000);
    }
}

function tornaARichiestaReset() {
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

    const msgErroreOtp = document.getElementById('messaggio_errore_otp_reset');
    if (msgErroreOtp) msgErroreOtp.style.display = 'none';

    const msgErroreServer = document.getElementById('messaggio_errore_server');
    if (msgErroreServer) msgErroreServer.style.display = 'none';
}

async function inviaNuovaPassword(event) {
    event.preventDefault();

    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    const msgErroreServer = document.getElementById('messaggio_errore_server');
    if (msgErroreServer) msgErroreServer.style.display = 'none';
    
    const msgErroreOtp = document.getElementById('messaggio_errore_otp_reset');
    if (msgErroreOtp) msgErroreOtp.style.display = 'none';

    const token = document.getElementById('otp_code_reset').value.trim();
    if (token.length !== 6) {
        if (msgErroreOtp) {
            msgErroreOtp.textContent = dict.js_otp_err_length || "Il codice deve essere di 6 cifre.";
            msgErroreOtp.style.display = 'block';
        }
        return;
    }

    if (typeof validaComplessitaPassword === 'function' && !validaComplessitaPassword()) return;
    if (typeof verificaCoincidenzaPassword === 'function' && !verificaCoincidenzaPassword()) return;

    const email = document.getElementById('email_recupero').value.trim();
    const nuovaPassword = document.getElementById('password').value;

    const btnSubmit = document.getElementById('btn_salva_password');
    const testoOriginale = btnSubmit.textContent;
    btnSubmit.textContent = dict.js_pass_loading || "Salvataggio in corso...";
    btnSubmit.disabled = true;

    const urlVerify = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/verify";
    const urlUpdate = "https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user";
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";

    try {
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

        const sessioneRecupero = await verifyRes.json();
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
                throw new Error(dict.js_pass_err_same || "La nuova password digitata è uguale all'attuale.");
            }
            throw new Error("UPDATE_FAILED");
        }

        localStorage.setItem('driverbutler_auth_token', sessioneRecupero.access_token);
        localStorage.setItem('driverbutler_refresh_token', sessioneRecupero.refresh_token);
        localStorage.setItem('driverbutler_ruolo', 'passeggeri');
        localStorage.setItem('driverbutler_last_user', sessioneRecupero.user.id);
        
        if (typeof svuotaBozze === 'function') svuotaBozze();

        btnSubmit.textContent = dict.js_pass_success || "Password aggiornata! Accesso in corso...";
        btnSubmit.classList.add('btn-stato-successo');

        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 2000);

    } catch (errore) {
        btnSubmit.textContent = testoOriginale;
        btnSubmit.disabled = false;
        
        if (errore.message === "OTP_INVALID") {
            if (msgErroreOtp) {
                msgErroreOtp.textContent = dict.js_otp_err_invalid || "Codice errato o scaduto.";
                msgErroreOtp.style.display = 'block';
            }
        } else {
            if (msgErroreServer) {
                msgErroreServer.textContent = errore.message === "UPDATE_FAILED" ? (dict.js_pass_err_update || "Impossibile aggiornare la password. Errore server.") : errore.message;
                msgErroreServer.style.display = 'block';
            }
        }
    }
}

if ('serviceWorker' in navigator) {
    let swPath = window.location.pathname.includes('driverbook-test') ? '/driverbook-test/passeggeri/service-worker.js' : '/passeggeri/service-worker.js';
    navigator.serviceWorker.register(swPath)
        .catch(errore => console.log('Registrazione SW fallita: ', errore));
}

let deferredPrompt;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
const isMacSafari = /Macintosh/.test(navigator.userAgent) && /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

function verificaStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function mostraBottoneInstallazione() {
    if (verificaStandalone()) return; // Blocco di sicurezza: se è già PWA, non mostrare nulla
    
    const btnDynamic = document.getElementById('btn_installa_app_sidebar');
    if (btnDynamic) {
        btnDynamic.classList.remove('hidden');
        btnDynamic.style.setProperty('display', 'flex', 'important');
    }
}

window.addEventListener('beforeinstallprompt', (e) => {
    if (verificaStandalone()) return;
    e.preventDefault();
    deferredPrompt = e;
    mostraBottoneInstallazione();
});

// Ascolta l'evento di installazione completata per nascondere il bottone in tempo reale
window.addEventListener('appinstalled', () => {
    const btnDynamic = document.getElementById('btn_installa_app_sidebar');
    if (btnDynamic) {
        btnDynamic.style.display = 'none';
        btnDynamic.classList.add('hidden');
    }
});

document.addEventListener("DOMContentLoaded", () => {
    if (verificaStandalone()) return; // Doppio check al caricamento
    
    if (deferredPrompt || isIOS || isMacSafari) {
        mostraBottoneInstallazione();
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
            if (outcome === 'accepted') {
                btnApp.style.display = 'none';
                btnApp.classList.add('hidden');
            }
            deferredPrompt = null;
        }
    }
});

function mostraPopupInstallazioneApple(isMac) {
    let popup = document.getElementById('ios_install_popup');
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    if (!popup) {
        popup = document.createElement('div');
        popup.id = 'ios_install_popup';
        popup.className = 'ios-popup';
        document.body.appendChild(popup);
    }

    const chiaveTesto = isMac ? 'js_install_mac' : 'js_install_ios';

    popup.innerHTML = `
        <span class="close-popup" id="btn_chiudi_apple_popup">&times;</span>
        <p data-i18n="${chiaveTesto}">${dict[chiaveTesto]}</p>
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

    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    const messaggioUtente = document.getElementById('testo_assistenza_interna').value.trim();
    const btnSubmit = document.querySelector('#form_assistenza_interna button[type="submit"]');

    const testoOriginale = btnSubmit.textContent;
    btnSubmit.disabled = true;
    btnSubmit.textContent = dict.js_assist_loading;

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

        const checkPasseggero = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userId}&select=nome_cognome,codice_passeggero`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        const datiPasseggero = await checkPasseggero.json();

        if (datiPasseggero && datiPasseggero.length > 0) {
            nomeUtente = datiPasseggero[0].nome_cognome || "N/A";
            codiceCliente = datiPasseggero[0].codice_passeggero || "N/A";
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

        if (typeof svuotaBozze === 'function') svuotaBozze();
        const titolo = `<h2 class="feedback-titolo feedback-titolo-successo" data-i18n="js_assist_success_title">${dict.js_assist_success_title}</h2>`;
        const messaggio = `<p class="feedback-testo" data-i18n="js_assist_int_success_msg">${dict.js_assist_int_success_msg}</p>`;
        const bottone = `<a data-href="dashboard.html" class="btn btn-primary btn-full" data-i18n="js_btn_pannello_utente">${dict.js_btn_pannello_utente}</a>`;
        
        mostraSchermataFeedback('successo', '.login-wrapper', titolo, messaggio, bottone);

    } catch (errore) {
        alert(dict.js_assist_err);
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
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modale_uscita_dati';
        overlay.className = 'modale-overlay';
        
        let modal = document.createElement('div');
        modal.className = 'modale-box';
        
        modal.innerHTML = `
            <h3 class="modale-titolo" data-i18n="modale_uscita_titolo">${dict.modale_uscita_titolo}</h3>
            <p class="modale-testo" data-i18n="modale_uscita_testo">${dict.modale_uscita_testo}</p>
            <div class="modale-bottoni-container">
                <button id="btn_annulla_uscita" class="btn-modale-bianco btn-modale-meta" data-i18n="modale_uscita_btn_resta">${dict.modale_uscita_btn_resta}</button>
                <button id="btn_conferma_uscita" class="btn-modale-bianco btn-modale-meta" data-i18n="modale_uscita_btn_esci">${dict.modale_uscita_btn_esci}</button>
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

function applicaTraduzioni() {
    if (!window.location.pathname.toLowerCase().includes('/passeggeri/')) return;
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    
    document.querySelectorAll('[data-i18n]').forEach(elemento => {
        const chiave = elemento.getAttribute('data-i18n');
        if (traduzioni[linguaAttuale] && traduzioni[linguaAttuale][chiave]) {
            if (elemento.tagName === 'TITLE') {
                document.title = traduzioni[linguaAttuale][chiave];
            } else {
                elemento.innerHTML = traduzioni[linguaAttuale][chiave];
            }
        }
    });

    const textareaAssistenza = document.getElementById('testo_assistenza');
    if (textareaAssistenza && traduzioni[linguaAttuale]) {
        textareaAssistenza.placeholder = traduzioni[linguaAttuale]['placeholder_assistenza'] || "Scrivi qui i dettagli della tua richiesta...";
    }

    const textareaAssistenzaInterna = document.getElementById('testo_assistenza_interna');
    if (textareaAssistenzaInterna && traduzioni[linguaAttuale]) {
        textareaAssistenzaInterna.placeholder = traduzioni[linguaAttuale]['placeholder_assistenza'] || "Scrivi qui i dettagli della tua richiesta...";
    }
	
	const elementiPlaceholders = [
        { id: 'nome', chiave: 'ph_nome_reg' },
        { id: 'profilo_nome', chiave: 'ph_nome_reg' },
        { id: 'nome_passeggero', chiave: 'ph_nome_pax' },
        { id: 'nome_referente', chiave: 'ph_nome_ref' },
        { id: 'partenza', chiave: 'ph_indirizzo' },
        { id: 'arrivo', chiave: 'ph_indirizzo' },
        { id: 'itinerario_previsto', chiave: 'ph_itinerario' },
        { id: 'info_trasporto', chiave: 'ph_trasporto' },
        { id: 'note_servizio', chiave: 'ph_note' },
        { id: 'ragioneSociale', chiave: 'ph_ragione_sociale' },
        { id: 'profilo_ragioneSociale', chiave: 'ph_ragione_sociale' },
        { id: 'codice_sdi', chiave: 'ph_sdi' },
        { id: 'profilo_codice_sdi', chiave: 'ph_sdi' },
        { id: 'indirizzo_via', chiave: 'ph_via' },
        { id: 'profilo_indirizzo_via', chiave: 'ph_via' },
        { id: 'indirizzo_citta', chiave: 'ph_citta' },
        { id: 'profilo_indirizzo_citta', chiave: 'ph_citta' }
    ];

    elementiPlaceholders.forEach(item => {
        const el = document.getElementById(item.id);
        if (el && traduzioni[linguaAttuale] && traduzioni[linguaAttuale][item.chiave]) {
            el.placeholder = traduzioni[linguaAttuale][item.chiave];
        }
    });

    const bloccoFatturazione = document.getElementById('blocco_fatturazione_registrazione');
    if (bloccoFatturazione) {
        const checkboxFattura = document.getElementById('richiedeFattura');
        if (linguaAttuale === 'en') {
            bloccoFatturazione.style.display = 'none';
            if (checkboxFattura && checkboxFattura.checked) {
                checkboxFattura.checked = false;
                toggleFatturazione();
            }
        } else {
            bloccoFatturazione.style.display = 'flex';
        }
    }
    
    document.documentElement.lang = linguaAttuale;
}

function impostaLingua(nuovaLingua) {
    localStorage.setItem('driverbutler_lang', nuovaLingua);
    window.location.reload();
}

function mostraUiRegistrazioneOk(containerId) {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const titolo = `<h2 class="feedback-titolo feedback-titolo-successo" data-i18n="js_reg_success_title">${dict.js_reg_success_title}</h2>`;
    const messaggio = `<p class="feedback-testo" data-i18n="js_reg_success_msg">${dict.js_reg_success_msg}</p>`;
    mostraSchermataFeedback('successo', containerId, titolo, messaggio);
}

function mostraUiResetRicevuto(containerId) {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const titolo = `<h2 class="feedback-titolo feedback-titolo-successo" data-i18n="js_rec_success_title">${dict.js_rec_success_title}</h2>`;
    const messaggio = `<p class="feedback-testo" data-i18n="js_rec_success_msg">${dict.js_rec_success_msg}</p>`;
    mostraSchermataFeedback('successo', containerId, titolo, messaggio);
}

function mostraUiAssistenzaOk(containerId) {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const titolo = `<h2 class="feedback-titolo feedback-titolo-successo" data-i18n="js_assist_success_title">${dict.js_assist_success_title}</h2>`;
    const messaggio = `<p class="feedback-testo" data-i18n="js_assist_success_msg">${dict.js_assist_success_msg}</p>`;
    const bottone = `<a data-href="index.html" class="btn btn-primary btn-full" data-i18n="js_btn_torna_home">${dict.js_btn_torna_home}</a>`;
    mostraSchermataFeedback('successo', containerId, titolo, messaggio, bottone);
}

function mostraUiLinkScaduto(containerId) {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const titolo = `<h2 class="feedback-titolo feedback-titolo-errore" data-i18n="js_link_exp_title">${dict.js_link_exp_title}</h2>`;
    const messaggio = `<p class="feedback-testo" data-i18n="js_link_exp_text">${dict.js_link_exp_text}</p>`;
    const bottone = `<a data-href="pwreset.html" class="btn btn-primary btn-full" data-i18n="js_link_exp_btn">${dict.js_link_exp_btn}</a>`;
    mostraSchermataFeedback('errore', containerId, titolo, messaggio, bottone);
}

function mostraUiPrenotazioneOk(containerId, codiceGenerato = "DB-A1B2C") {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const btnPannelloStr = dict.js_btn_pannello_utente || (linguaAttuale === 'en' ? 'Go to Dashboard' : 'Vai al Pannello Utente');
    const titolo = `<h2 class="feedback-titolo feedback-titolo-successo" data-i18n="js_check_success_title">${dict.js_check_success_title}</h2>`;
    const messaggio = `<p class="feedback-testo"><span data-i18n="js_check_success_text">${dict.js_check_success_text}</span><strong class="feedback-evidenza">${codiceGenerato}</strong></p>`;
    const bottone = `<button id="btn_chiudi_conferma" class="btn btn-primary btn-full">${btnPannelloStr}</button>`;
    mostraSchermataFeedback('successo', containerId, titolo, messaggio, bottone);
}

function mostraUiPrenotazioneErrore(containerId) {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const btnRiprovaStr = dict.js_btn_riprova || (linguaAttuale === 'en' ? 'Try Again' : 'Riprova');
    const titolo = `<h2 class="feedback-titolo feedback-titolo-errore" data-i18n="js_check_err_title">${dict.js_check_err_title}</h2>`;
    const messaggio = `<p class="feedback-testo" data-i18n="js_check_err_text">${dict.js_check_err_text}</p>`;
    const bottone = `<button id="btn_riprova_errore" class="btn btn-primary btn-full">${btnRiprovaStr}</button>`;
    mostraSchermataFeedback('errore', containerId, titolo, messaggio, bottone);
}

function mostraUiRedirectCheckout(containerId) {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const titolo = `<h2 class="feedback-titolo feedback-titolo-errore" data-i18n="js_redirect_title">${dict.js_redirect_title}</h2>`;
    const messaggio = `<p class="feedback-testo" data-i18n="js_check_redirect">${dict.js_check_redirect}</p>`;
    mostraSchermataFeedback('errore', containerId, titolo, messaggio);
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

window.applicaBozze = function() {
    const blacklistPagineAutosave = ['login.html', 'pwreset.html', 'pwreimposta.html', 'index.html'];
    const paginaAutosave = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    const prefix = 'pax_';

    if (!blacklistPagineAutosave.includes(paginaAutosave)) {
        localStorage.removeItem(prefix + 'db_draft_' + paginaAutosave + '_swipe_logout_range');
        document.querySelectorAll('input:not([type="password"]):not([type="hidden"]):not([type="file"]):not(#swipe_logout_range), textarea, select').forEach(campo => {
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
                    
                    if (campo.tagName === 'SELECT' || campo.id === 'tipo_servizio') {
                        if (typeof gestisciCampi === 'function') gestisciCampi();
                    }
                }
            }
        });
    }
};

document.addEventListener("DOMContentLoaded", function() {
    const blacklistPagineAutosave = ['login.html', 'pwreset.html', 'pwreimposta.html', 'index.html'];
    const paginaAutosave = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    const prefix = 'pax_';

    if (!blacklistPagineAutosave.includes(paginaAutosave)) {
        if (typeof applicaBozze === 'function') applicaBozze();

        document.body.addEventListener('input', function(e) {
            const campo = e.target;
            if (campo.tagName && ['INPUT', 'TEXTAREA', 'SELECT'].includes(campo.tagName) && campo.id) {
                if (campo.type !== 'password' && campo.type !== 'hidden' && campo.type !== 'file' && campo.id !== 'swipe_logout_range') {
                    const valore = (campo.type === 'checkbox' || campo.type === 'radio') ? campo.checked : campo.value;
                    localStorage.setItem(`${prefix}db_draft_${paginaAutosave}_${campo.id}`, valore);
                }
            }
        });
    }
});

window.svuotaBozze = function() {
    const paginaAutosave = (window.location.pathname.split('/').pop() || 'index.html').split('?')[0].split('#')[0];
    const prefix = 'pax_';

    document.querySelectorAll('input, textarea, select').forEach(campo => {
        if (campo.id) {
            localStorage.removeItem(`${prefix}db_draft_${paginaAutosave}_${campo.id}`);
        }
    });
    
    const chiaviDaCancellare = [
        'db_nome_passeggero', 'db_tel_passeggero', 'db_chk_referente', 'db_nome_referente',
        'db_tel_referente', 'db_tipo_servizio', 'db_partenza', 'db_partenza_lat', 'db_partenza_lng', 'db_partenza_citta', 'db_partenza_via',
        'db_arrivo', 'db_arrivo_lat', 'db_arrivo_lng', 'db_arrivo_citta', 'db_arrivo_via', 'db_itinerario_previsto',
        'db_chk_hub', 'db_info_trasporto', 'db_ore', 'db_data_partenza', 'db_ora_partenza',
        'db_pax', 'db_grandi', 'db_mano', 'db_vettura', 'db_note_servizio', 'db_prezzo_stimato', 'db_prezzo_stripe'
    ];
    chiaviDaCancellare.forEach(chiave => localStorage.removeItem(chiave));

    if (typeof moduloSporco !== 'undefined') {
        moduloSporco = false;
    }
};

async function caricaViaggiProgrammati() {
    const contenitore = document.getElementById('lista_viaggi_attivi_edit');
    if (!contenitore) return;
    
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    
    let codiciAperti = [];
    const cardAperte = contenitore.querySelectorAll('.card-viaggio.aperta');
    cardAperte.forEach(card => {
        if (card.id && card.id.startsWith('card_')) {
            codiciAperti.push(card.id.replace('card_', ''));
        }
    });
    
    contenitore.innerHTML = '<div class="msg-caricamento">Caricamento in corso...</div>';
    
    await rinnovaSessioneSilenziosa();
    
    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    try {
        const userRes = await fetch("https://drpgiwjwkfxztjbdyncm.supabase.co/auth/v1/user", {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!userRes.ok) throw new Error("Utente non loggato");
        const userData = await userRes.json();
        
        const passRes = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/passeggeri?id_passeggero=eq.${userData.id}&select=codice_passeggero`, {
            headers: { "apikey": chiaveAnon, "Authorization": "Bearer " + token }
        });
        if (!passRes.ok) throw new Error("Errore lettura passeggero");
        const passData = await passRes.json();
        const codicePasseggero = passData[0].codice_passeggero;

        const oggi = new Date().toISOString().split('T')[0];
        
        const urlFetch = `https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/prenotazioni?codice_passeggero=eq.${codicePasseggero}&data_partenza=gte.${oggi}&stato=neq.ANNULLATO&order=data_partenza.asc,ora_partenza.asc`;
        
        const res = await fetch(urlFetch, {
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token
            }
        });
        
        if (!res.ok) throw new Error("Errore lettura viaggi");
        
        const viaggi = await res.json();
        contenitore.innerHTML = '';
        
        if (viaggi.length === 0) {
            contenitore.innerHTML = `<div class="form-group"><span class="label">${dict.lbl_nessun_viaggio_gestire || 'Nessun viaggio in programma da gestire.'}</span></div>`;
            return;
        }
        
        viaggi.forEach(viaggio => {
            let classeBadge = 'badge-attesa';
            let testoStato = dict.js_stato_in_attesa || 'IN ATTESA DI ASSEGNAZIONE';
            
            if (viaggio.stato === 'CONFERMATO') {
                testoStato = dict.js_stato_confermato || 'VIAGGIO CONFERMATO';
            } else if (viaggio.stato === 'ASSEGNATO') {
                classeBadge = 'badge-assegnato';
                testoStato = dict.js_stato_assegnato || 'AUTISTA ASSEGNATO';
            }

            const htmlLimbo = (viaggio.stato === 'IN_ATTESA' || viaggio.stato === 'CONFERMATO') ? `
                <div class="viaggio-limbo-box">
                    ${dict.js_limbo_info || 'Nei servizi NCC, le assegnazioni definitive per i viaggi programmati avvengono solitamente nei giorni precedenti la partenza, in base alla pianificazione logistica dei turni. Riceverai una notifica immediata non appena il tuo autista prenderà in carico la corsa.'}
                </div>
            ` : '';
            
            const btnAnnulla = `
                <button onclick="chiediConfermaAnnullamento('${viaggio.codice_prenotazione}', '${viaggio.data_partenza}', '${viaggio.ora_partenza}', '${viaggio.stato}')" class="btn btn-ghost btn-full btn-annulla-viaggio">
                    ${dict.js_btn_annulla_viaggio || 'ANNULLA RICHIESTA'}
                </button>
            `;

            let dataFormattata = viaggio.data_partenza;
            const parti = dataFormattata.split('-');
            if (parti.length === 3) dataFormattata = `${parti[2]}/${parti[1]}/${parti[0]}`;

            let nomePasseggero = viaggio.nome_passeggero || "-";
            let telPasseggero = viaggio.tel_passeggero || "-";
            
            let bloccoReferenteHtml = "";
            if (viaggio.chk_referente) {
                let nomeRef = viaggio.nome_referente || "-";
                let telRef = viaggio.tel_referente || "-";
                bloccoReferenteHtml = `
                    <div class="checkout-style-block">
                        <div class="checkout-style-title">${(dict.h2_referente || 'REFERENTE PRENOTAZIONE').toUpperCase()}</div>
                        <div class="checkout-style-row">
                            <span class="checkout-style-label">${dict.lbl_nome_ref || 'Nome Azienda / Referente'}</span>
                            <span class="checkout-style-value">${nomeRef}</span>
                        </div>
                        <div class="checkout-style-row">
                            <span class="checkout-style-label">${dict.lbl_tel_ref || 'Telefono Referente'}</span>
                            <span class="checkout-style-value">${telRef}</span>
                        </div>
                    </div>
                `;
            }

            let tipoServizioLeggibile = viaggio.tipo_servizio === 'TRANSFER' ? (dict.opt_tratta || 'Servizio a Tratta Diretta') : (dict.opt_disposizione || 'Servizio a Disposizione Oraria');
            let vetturaCodice = viaggio.vettura_selezionata || "";
            let vetturaLeggibile = vetturaCodice;
            if (vetturaCodice.includes('CLASSE E')) vetturaLeggibile = `${dict.nome_classe_e || 'Mercedes Classe E'}<br><span class="vettura-sottotitolo">(${dict.vettura_berlina_comfort || 'Berlina Comfort'})</span>`;
            if (vetturaCodice.includes('CLASSE S')) vetturaLeggibile = `${dict.nome_classe_s || 'Mercedes Classe S'}<br><span class="vettura-sottotitolo">(${dict.vettura_berlina_lusso || 'Berlina Lusso'})</span>`;
            if (vetturaCodice.includes('CLASSE V')) vetturaLeggibile = `${dict.nome_classe_v || 'Mercedes Classe V'}<br><span class="vettura-sottotitolo">(${dict.vettura_van_comfort || 'Van Comfort'})</span>`;

            let arrivoHtml = "";
            if (viaggio.tipo_servizio === 'TRANSFER') {
                arrivoHtml = `
                    <div class="checkout-style-row">
                        <span class="checkout-style-label">${dict.lbl_arrivo || 'Luogo di Destinazione'}</span>
                        <span class="checkout-style-value">${viaggio.arrivo || '-'}</span>
                    </div>
                `;
            } else if (viaggio.tipo_servizio === 'DISPOSIZIONE' && viaggio.itinerario_previsto) {
                arrivoHtml = `
                    <div class="checkout-style-row">
                        <span class="checkout-style-label">${dict.lbl_itinerario_previsto || 'Itinerario Previsto'}</span>
                        <span class="checkout-style-value">${viaggio.itinerario_previsto}</span>
                    </div>
                `;
            }

            let pax = viaggio.passeggeri || 1;
            let grandi = viaggio.bagagli_grandi || 0;
            let mano = viaggio.bagagli_mano || 0;
            let testoPax = pax === 1 ? (dict.js_pax_singolo || "1 Passeggero") : pax + (dict.js_pax_plur || " Passeggeri");
            let testoGrandi = grandi === 1 ? (dict.js_val_singola || "1 Valigia Grande") : grandi + (dict.js_val_plur || " Valigie Grandi");
            let testoMano = mano === 1 ? (dict.js_tro_singolo || "1 Trolley") : mano + (dict.js_tro_plur || " Trolley");
            
            let noteServizio = (viaggio.note_servizio && viaggio.note_servizio.trim() !== '') ? viaggio.note_servizio : (dict.js_nessuna_nota || "Nessuna nota o richiesta particolare inserita.");

            const classeAperta = codiciAperti.includes(viaggio.codice_prenotazione) ? ' aperta' : '';

            const htmlCard = `
                <div class="card-viaggio${classeAperta}" id="card_${viaggio.codice_prenotazione}">
                    
                    <div class="viaggio-header-touch" onclick="document.getElementById('card_${viaggio.codice_prenotazione}').classList.toggle('aperta')">
                        <div class="viaggio-header-info">
                            <span class="viaggio-data">${dataFormattata} - ${viaggio.ora_partenza}</span>
                            <span class="viaggio-badge ${classeBadge}">${testoStato}</span>
                        </div>
                        <svg class="icona-tendina" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>

                    <div class="viaggio-dettaglio-body">
                        
                        ${htmlLimbo}

                        <div class="checkout-style-block">
                            <div class="checkout-style-title">${(dict.h2_passeggero || 'PASSEGGERO').toUpperCase()}</div>
                            <div class="checkout-style-row">
                                <span class="checkout-style-label">${dict.lbl_nome_cognome_pax || 'Nome e Cognome'}</span>
                                <span class="checkout-style-value">${nomePasseggero}</span>
                            </div>
                            <div class="checkout-style-row">
                                <span class="checkout-style-label">${dict.lbl_tel_pax || 'Telefono Passeggero'}</span>
                                <span class="checkout-style-value">${telPasseggero}</span>
                            </div>
                        </div>

                        ${bloccoReferenteHtml}

                        <div class="checkout-style-block">
                            <div class="checkout-style-title">${(dict.h2_dettagli_servizio || 'DETTAGLI SERVIZIO').toUpperCase()}</div>
                            <div class="checkout-style-row">
                                <span class="checkout-style-label">${dict.lbl_tipologia || 'Tipologia Servizio'}</span>
                                <span class="checkout-style-value">${tipoServizioLeggibile}</span>
                            </div>
                            ${viaggio.tipo_servizio === 'DISPOSIZIONE' ? `
                            <div class="checkout-style-row">
                                <span class="checkout-style-label">${dict.lbl_durata || 'Durata Disposizione'}</span>
                                <span class="checkout-style-value">${viaggio.ore}${dict.js_ore || ' Ore'}</span>
                            </div>` : ''}
                            <div class="checkout-style-row">
                                <span class="checkout-style-label">${dict.lbl_vettura_richiesta || 'Vettura Richiesta'}</span>
                                <span class="checkout-style-value">${vetturaLeggibile}</span>
                            </div>
                            <div class="checkout-style-row">
                                <span class="checkout-style-label">${dict.lbl_data_ora || 'Data e Ora Partenza'}</span>
                                <span class="checkout-style-value">${dataFormattata}${dict.js_alle_ore || ' alle ore '}${viaggio.ora_partenza}</span>
                            </div>
                        </div>

                        <div class="checkout-style-block">
                            <div class="checkout-style-title">${(dict.h2_itinerario || 'ITINERARIO').toUpperCase()}</div>
                            <div class="checkout-style-row">
                                <span class="checkout-style-label">${dict.lbl_partenza || 'Luogo di Partenza'}</span>
                                <span class="checkout-style-value">${viaggio.partenza}</span>
                            </div>
                            ${arrivoHtml}
                        </div>

                        <div class="checkout-style-block">
                            <div class="checkout-style-title">${(dict.h2_logistica || 'LOGISTICA E NOTE').toUpperCase()}</div>
                            <div class="checkout-style-row">
                                <span class="checkout-style-label">${dict.lbl_pax_bagagli || 'Passeggeri e Bagagli'}</span>
                                <span class="checkout-style-value">${testoPax}<br>${testoGrandi}<br>${testoMano}</span>
                            </div>
                            <div class="checkout-style-row note-row-margine">
                                <span class="checkout-style-label">${dict.lbl_note_richieste || 'Note e Richieste Particolari'}</span>
                                <span class="checkout-style-value ${noteServizio === (dict.js_nessuna_nota || 'Nessuna nota o richiesta particolare inserita.') ? 'nota-vuota' : ''}">${noteServizio}</span>
                            </div>
                        </div>

                        <div class="viaggio-footer-totale">
                            <span class="viaggio-codice-label">${dict.lbl_codice_prenotazione || 'CODICE PRENOTAZIONE:'}</span>
                            <span class="viaggio-codice-valore">${viaggio.codice_prenotazione}</span>
                            <div class="viaggio-prezzo-totale">
                                ${viaggio.prezzo_totale.toFixed(2).replace('.', ',')} €
                            </div>
                            
                            ${btnAnnulla}
                        </div>
                        
                    </div>
                </div>
            `;
            
            contenitore.insertAdjacentHTML('beforeend', htmlCard);
        });
        
    } catch (errore) {
        contenitore.innerHTML = `<div class="msg-errore-viaggi">Impossibile caricare i viaggi. Riprova più tardi.</div>`;
    }
}

function chiediConfermaAnnullamento(codice, data, ora, statoAttuale) {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    
    const dataPartenza = new Date(`${data}T${ora}:00`);
    const oraAttuale = new Date();
    const oreMancanti = (dataPartenza - oraAttuale) / (1000 * 60 * 60);
    
    let titoloModale = dict.js_btn_annulla_viaggio || "Annulla Richiesta";
    let testoModale = "";
    let classeBottone = "btn-modale-bianco";
    let penale = false;
    
    if (statoAttuale === 'IN_ATTESA') {
        testoModale = linguaAttuale === 'en' ? "Are you sure you want to cancel this request? The pre-authorized amount will be immediately released." : "Sei sicuro di voler annullare questa richiesta? L'importo pre-autorizzato verrà sbloccato immediatamente.";
    } else if (statoAttuale === 'ASSEGNATO') {
        if (oreMancanti > 24) {
            testoModale = linguaAttuale === 'en' ? "Are you sure you want to cancel? Since there are more than 24 hours until departure, no penalty will be applied." : "Sei sicuro di voler annullare? Mancando più di 24 ore alla partenza, non verrà applicata alcuna penale.";
        } else {
            titoloModale = dict.js_penale_avviso || "Annullamento con Penale 100%";
            testoModale = dict.js_penale_testo || "Mancano meno di 24 ore alla partenza. Come da termini accettati, l'annullamento comporterà l'addebito dell'intero importo della corsa.";
            classeBottone = "btn-danger-outline";
            penale = true;
        }
    }
    
    let overlay = document.getElementById('modale_annullamento');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modale_annullamento';
        overlay.className = 'modale-overlay';
        document.body.appendChild(overlay);
    }
    
    let classeTitolo = penale ? 'testo-pericolo' : '';

    overlay.innerHTML = `
        <div class="modale-box">
            <h3 class="modale-titolo ${classeTitolo}">${titoloModale}</h3>
            <p class="modale-testo">${testoModale}</p>
            <div class="modale-bottoni-container">
                <button id="btn_chiudi_modale_annulla" class="btn-modale-bianco btn-modale-meta">${dict.js_btn_no || 'NO'}</button>
                <button id="btn_procedi_annullamento" class="btn ${classeBottone} btn-modale-meta">${dict.js_btn_si || 'SI'}</button>
            </div>
        </div>
    `;
    
    overlay.style.display = 'flex';
    
    document.getElementById('btn_chiudi_modale_annulla').onclick = function() {
        overlay.style.display = 'none';
    };
    
    document.getElementById('btn_procedi_annullamento').onclick = function() {
        eseguiAnnullamento(codice);
        overlay.style.display = 'none';
    };
}

async function eseguiAnnullamento(codice) {
    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    const token = localStorage.getItem('driverbutler_auth_token');
    const chiaveAnon = "sb_publishable_XFc00vrhf2Ein-PlAk9WMg_hAV8SIU8";
    
    const card = document.getElementById('card_' + codice);
    if (card) {
        card.style.opacity = '0.5';
        card.style.pointerEvents = 'none';
    }
    
    try {
        const res = await fetch(`https://drpgiwjwkfxztjbdyncm.supabase.co/rest/v1/prenotazioni?codice_prenotazione=eq.${codice}`, {
            method: "PATCH",
            headers: {
                "apikey": chiaveAnon,
                "Authorization": "Bearer " + token,
                "Content-Type": "application/json",
                "Prefer": "return=minimal"
            },
            body: JSON.stringify({ stato: 'ANNULLATO' })
        });
        
        if (!res.ok) throw new Error("Errore aggiornamento DB");
        
        if (card) {
            card.remove();
        }
        
        const contenitore = document.getElementById('lista_viaggi_attivi_edit');
        if (contenitore && contenitore.children.length === 0) {
            contenitore.innerHTML = `<div class="form-group"><span class="label">${dict.lbl_nessun_viaggio_gestire || 'Nessun viaggio in programma da gestire.'}</span></div>`;
        }
        
        alert(dict.js_annulla_success || "Richiesta annullata correttamente. I fondi pre-autorizzati sono stati sbloccati.");
        
    } catch (errore) {
        if (card) {
            card.style.opacity = '1';
            card.style.pointerEvents = 'auto';
        }
        alert(dict.js_annulla_error || "Impossibile annullare la richiesta al momento. Riprova più tardi.");
    }
}

document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
        if (localStorage.getItem('driverbutler_auth_token')) {
            await rinnovaSessioneSilenziosa();
            
            if (document.getElementById('lista_viaggi_attivi_edit') && typeof caricaViaggiProgrammati === 'function') {
                caricaViaggiProgrammati();
            }
            if ((document.getElementById('dash_nome_utente') || document.getElementById('profilo_nome')) && typeof caricaDatiDashboardPasseggero === 'function') {
                caricaDatiDashboardPasseggero();
            }
        }
    }
});

function gestisciModaleNotifichePax() {
    if (!("Notification" in window)) return;

    const btnMenu = document.getElementById('btn_attiva_notifiche_sidebar');
    if (!btnMenu) return;

    const linguaAttuale = localStorage.getItem('driverbutler_lang') || 'it';
    const dict = traduzioni[linguaAttuale] || traduzioni['it'];
    
    if (Notification.permission === "granted") {
        btnMenu.style.setProperty('display', 'none', 'important');
        return;
    }

    if (localStorage.getItem('driverbutler_auth_token')) {
        btnMenu.classList.remove('hidden');
        btnMenu.style.setProperty('display', 'flex', 'important');
        
        btnMenu.addEventListener('click', (e) => {
            e.preventDefault();
            
            const sidePanel = document.getElementById('side_panel');
            const overlay = document.getElementById('menu_overlay');
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

            if (Notification.permission === "default") {
                mostraModaleSoftPrompt(dict, btnMenu);
            } else if (Notification.permission === "denied") {
                mostraModaleTecnica(dict);
            }
        });
    }
}

function mostraModaleSoftPrompt(dict, btnMenu) {
    let overlay = document.getElementById('modale_soft_prompt_notifiche');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modale_soft_prompt_notifiche';
        overlay.className = 'modale-overlay';
        
        let modal = document.createElement('div');
        modal.className = 'modale-box';
        
        modal.innerHTML = `
            <h3 class="modale-titolo" data-i18n="modale_notifiche_titolo">${dict.modale_notifiche_titolo}</h3>
            <p class="modale-testo" data-i18n="modale_notifiche_testo">${dict.modale_notifiche_testo}</p>
            <div class="modale-bottoni-container">
                <button id="btn_notifiche_no" class="btn-modale-bianco btn-modale-meta" data-i18n="modale_notifiche_btn_no">${dict.modale_notifiche_btn_no}</button>
                <button id="btn_notifiche_si" class="btn-modale-bianco btn-modale-meta" data-i18n="modale_notifiche_btn_si">${dict.modale_notifiche_btn_si}</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('btn_notifiche_no').addEventListener('click', function() {
            overlay.style.display = 'none';
        });
        
        document.getElementById('btn_notifiche_si').addEventListener('click', function() {
            overlay.style.display = 'none';
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    if (btnMenu) btnMenu.style.setProperty('display', 'none', 'important');
                }
            });
        });
    }
    
    overlay.style.display = 'flex';
}

function mostraModaleTecnica(dict) {
    let overlay = document.getElementById('modale_tecnica_notifiche');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'modale_tecnica_notifiche';
        overlay.className = 'modale-overlay';
        
        let modal = document.createElement('div');
        modal.className = 'modale-box';
        
        modal.innerHTML = `
            <h3 class="modale-titolo" data-i18n="modale_notifiche_bloccate_titolo">${dict.modale_notifiche_bloccate_titolo}</h3>
            <p class="modale-testo" data-i18n="modale_notifiche_bloccate_testo">${dict.modale_notifiche_bloccate_testo}</p>
            <div class="modale-bottoni-container btn-singolo-container">
                <button id="btn_notifiche_ok" class="btn-modale-bianco" data-i18n="modale_notifiche_bloccate_btn_ok">${dict.modale_notifiche_bloccate_btn_ok}</button>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        document.getElementById('btn_notifiche_ok').addEventListener('click', function() {
            overlay.style.display = 'none';
        });
    }
    
    overlay.style.display = 'flex';
}