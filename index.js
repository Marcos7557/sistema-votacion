import { db } from "./firebase-config.js"; 
import { 
    collection, 
    addDoc, 
    onSnapshot, 
    updateDoc, 
    doc, 
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Importaciones para el sistema de Usuarios y Contraseñas de Firebase
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Inicializar Autenticación
const auth = getAuth();

const estadoSistem = {
    rolActual: 'votante',
    haFinalizado: false,
    participantes: [],
    duiLogueado: null,
    padronDuis: [], 
    intervaloReloj: null,
    tiempoExpiracionGlobal: 0
};

const participantesRef = collection(db, "participantes");
const controlVotacionDocRef = doc(db, "configuracion", "estado_actual");

// Elementos del DOM - Vistas Principales
const vistaLoginVotante = document.getElementById('login-view');
const vistaLoginAdmin = document.getElementById('admin-login-view');
const vistaAdmin = document.getElementById('admin-view');
const vistaVotante = document.getElementById('voter-view');
const gridVotacion = document.getElementById('voting-grid');
const panelResultados = document.getElementById('results-panel');
const listaResultados = document.getElementById('results-list');
const timerDisplay = document.getElementById('timer-display');

// Elementos del DOM - Formularios Admin (Login / Registro)
const contenedorLoginAdmin = document.getElementById('admin-box-login');
const contenedorRegistroAdmin = document.getElementById('admin-box-register');
const linkIrARegistro = document.getElementById('link-ir-a-registro');
const linkIrALogin = document.getElementById('link-ir-a-login');

// Inputs y Botones Login Votante
const inputDuiLogin = document.getElementById('input-dui-login');
const btnIngresar = document.getElementById('btn-ingresar');
const errorMsgLogin = document.getElementById('login-error-msg');

// Inputs y Botones Login Admin
const adminLoginEmail = document.getElementById('admin-login-email');
const adminLoginPass = document.getElementById('admin-login-pass');
const btnExecuteLogin = document.getElementById('btn-execute-login');
const adminErrorMsg = document.getElementById('admin-error-msg');

// Inputs y Botones Registro Admin
const adminRegName = document.getElementById('admin-reg-name');
const adminRegDui = document.getElementById('admin-reg-dui');
const adminRegPhone = document.getElementById('admin-reg-phone');
const adminRegEmail = document.getElementById('admin-reg-email');
const adminRegPass = document.getElementById('admin-reg-pass');
const btnExecuteRegister = document.getElementById('btn-execute-register');
const adminRegErrorMsg = document.getElementById('admin-reg-error-msg');

// Elementos Admin - Control de Padrón y Opciones
const inputNuevoDui = document.getElementById('nuevo-dui');
const btnAddDui = document.getElementById('btn-add-dui');
const inputArchivoDuis = document.getElementById('archivo-duis');
const listaDuisPrevia = document.getElementById('lista-duis-previa');
const inputTiempoDuracion = document.getElementById('tiempo-duracion');
const selectTipoVotacion = document.getElementById('tipo-votacion');
const formInscripcion = document.getElementById('form-inscripcion');
const btnReset = document.getElementById('btn-reset');
const btnFinalize = document.getElementById('btn-finalize');

// ==========================================
// CONTROL DE RUTAS AUTOMÁTICO
// ==========================================
function inicializarRutas() {
    if (!vistaLoginVotante) return; // Salvaguarda inicial

    vistaLoginVotante.classList.add('hidden');
    if (vistaLoginAdmin) vistaLoginAdmin.classList.add('hidden');
    if (vistaAdmin) vistaAdmin.classList.add('hidden');
    if (vistaVotante) vistaVotante.classList.add('hidden');

    const parametros = new URLSearchParams(window.location.search);
    const modo = parametros.get('modo');

    if (modo === 'admin' && vistaLoginAdmin) {
        estadoSistem.rolActual = 'admin';
        vistaLoginAdmin.classList.remove('hidden');
        if (contenedorLoginAdmin) contenedorLoginAdmin.classList.remove('hidden');
        if (contenedorRegistroAdmin) contenedorRegistroAdmin.classList.add('hidden');
    } else {
        estadoSistem.rolActual = 'votante';
        vistaLoginVotante.classList.remove('hidden');
    }
}

// ==========================================
// INTERCAMBIO DE VISTAS (LOGIN / REGISTRO ADMIN)
// ==========================================
if (linkIrARegistro) {
    linkIrARegistro.addEventListener('click', (e) => {
        e.preventDefault();
        if (adminErrorMsg) adminErrorMsg.classList.add('hidden');
        if (contenedorLoginAdmin) contenedorLoginAdmin.classList.add('hidden');
        if (contenedorRegistroAdmin) contenedorRegistroAdmin.classList.remove('hidden');
    });
}

if (linkIrALogin) {
    linkIrALogin.addEventListener('click', (e) => {
        e.preventDefault();
        if (adminRegErrorMsg) adminRegErrorMsg.classList.add('hidden');
        if (contenedorRegistroAdmin) contenedorRegistroAdmin.classList.add('hidden');
        if (contenedorLoginAdmin) contenedorLoginAdmin.classList.remove('hidden');
    });
}

// Formateadores de entradas para celular (Máscaras automáticas)
function aplicarMascaraDUI(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, ''); // Remueve lo que no sea número
        
        if (valor.length > 8) {
            // Coloca el guión exactamente después del octavo dígito
            valor = valor.slice(0, 8) + '-' + valor.slice(8, 9);
        }
        e.target.value = valor;
    });
}

function aplicarMascaraTelefono(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, '');
        if (valor.length > 4) {
            valor = valor.slice(0, 4) + '-' + valor.slice(4, 8);
        }
        e.target.value = valor;
    });
}

aplicarMascaraDUI(inputDuiLogin);
aplicarMascaraDUI(adminRegDui);
aplicarMascaraDUI(inputNuevoDui);
aplicarMascaraTelefono(adminRegPhone);

// ==========================================
// EJECUTAR REGISTRO DE ADMINISTRADOR EN FIREBASE AUTH
// ==========================================
if (btnExecuteRegister) {
    btnExecuteRegister.addEventListener('click', async () => {
        if (adminRegErrorMsg) adminRegErrorMsg.classList.add('hidden');
        
        const nombre = adminRegName.value.trim();
        const dui = adminRegDui.value.trim();
        const telefono = adminRegPhone.value.trim();
        const email = adminRegEmail.value.trim();
        const password = adminRegPass.value.trim();

        if (!nombre || dui.length < 10 || telefono.length < 9 || !email.includes('@') || password.length < 6) {
            if (adminRegErrorMsg) {
                adminRegErrorMsg.textContent = "Por favor, completa todos los campos correctamente. El DUI debe tener guión y la contraseña al menos 6 caracteres.";
                adminRegErrorMsg.classList.remove('hidden');
            }
            return;
        }

        try {
            const credenciales = await createUserWithEmailAndPassword(auth, email, password);
            
            await setDoc(doc(db, "administradores", credenciales.user.uid), {
                nombreCompleto: nombre,
                dui: dui,
                telefono: telefono,
                correo: email,
                creadoEn: Date.now()
            });

            alert("¡Cuenta de Administrador creada con éxito!");
            
            if (vistaLoginAdmin) vistaLoginAdmin.classList.add('hidden');
            if (vistaAdmin) vistaAdmin.classList.remove('hidden');

        } catch (error) {
            console.error(error);
            if (adminRegErrorMsg) {
                if (error.code === 'auth/email-already-in-use') {
                    adminRegErrorMsg.textContent = "Este correo electrónico ya se encuentra registrado por otro usuario.";
                } else if (error.code === 'auth/weak-password') {
                    adminRegErrorMsg.textContent = "La contraseña proporcionada es demasiado débil.";
                } else {
                    adminRegErrorMsg.textContent = "Error al registrar cuenta: " + error.message;
                }
                adminRegErrorMsg.classList.remove('hidden');
            }
        }
    });
}

// ==========================================
// EJECUTAR INICIO DE SESIÓN DE ADMIN EN FIREBASE AUTH
// ==========================================
if (btnExecuteLogin) {
    btnExecuteLogin.addEventListener('click', async () => {
        if (adminErrorMsg) adminErrorMsg.classList.add('hidden');
        
        const email = adminLoginEmail.value.trim();
        const password = adminLoginPass.value.trim();

        if (!email || !password) {
            if (adminErrorMsg) {
                adminErrorMsg.textContent = "Por favor, introduce tu correo y tu contraseña.";
                adminErrorMsg.classList.remove('hidden');
            }
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            if (vistaLoginAdmin) vistaLoginAdmin.classList.add('hidden');
            if (vistaAdmin) vistaAdmin.classList.remove('hidden');
        } catch (error) {
            console.error(error);
            if (adminErrorMsg) {
                if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    adminErrorMsg.textContent = "Credenciales incorrectas. Verifica tu correo electrónico o tu contraseña.";
                } else {
                    adminErrorMsg.textContent = "Error de conexión: " + error.message;
                }
                adminErrorMsg.classList.remove('hidden');
            }
        }
    });
}

// ==========================================
// VALIDACIONES Y LOGIN DEL VOTANTE
// ==========================================
if (btnIngresar) {
    btnIngresar.addEventListener('click', async () => {
        const duiIngresado = inputDuiLogin.value.trim();
        if (errorMsgLogin) errorMsgLogin.classList.add('hidden');

        // VALIDACIÓN ESTRICTA DEL DUI: Debe incluir 9 números y 1 guión (Total 10 caracteres)
        const formatoDuiValido = /^\d{8}-\d{1}$/;
        if (!formatoDuiValido.test(duiIngresado)) {
            if (errorMsgLogin) {
                errorMsgLogin.textContent = "Por favor introduce un número de DUI válido (Ejemplo: 03245987-9).";
                errorMsgLogin.classList.remove('hidden');
            }
            return;
        }

        const snapshotConfig = await getDoc(controlVotacionDocRef);
        if (!snapshotConfig.exists()) {
            if (errorMsgLogin) {
                errorMsgLogin.textContent = "No se ha inicializado ninguna votación en la base de datos.";
                errorMsgLogin.classList.remove('hidden');
            }
            return;
        }

        const infoVotacion = snapshotConfig.data();
        const listaAutorizados = infoVotacion.padronDuis || [];
        const listaYaVotaron = infoVotacion.duisQueYaVotaron || [];

        // 1. Comprobar si el DUI existe en el padrón cargado
        if (!listaAutorizados.includes(duiIngresado)) {
            if (errorMsgLogin) {
                errorMsgLogin.textContent = "Este número de DUI no ha sido registrado para esta votación.";
                errorMsgLogin.classList.remove('hidden');
            }
            return;
        }

        // 2. Comprobar si ya emitió su voto
        if (listaYaVotaron.includes(duiIngresado)) {
            const tiempoRestante = calcularTiempoFormateado(infoVotacion.expiraEn);
            if (errorMsgLogin) {
                errorMsgLogin.innerHTML = `Usted ya registró su voto exitosamente.<br><br><strong>Nota:</strong> Al expirar el tiempo establecido (${tiempoRestante}) podrá consultar los resultados definitivos en pantalla.`;
                errorMsgLogin.classList.remove('hidden');
            }
            return;
        }

        // 3. Validar si la votación ya expiró
        if (infoVotacion.haFinalizado || Date.now() > infoVotacion.expiraEn) {
            if (errorMsgLogin) {
                errorMsgLogin.textContent = "La ventana de tiempo para esta votación ha concluido.";
                errorMsgLogin.classList.remove('hidden');
            }
            finalizarYCalcularResultados();
            return;
        }

        // Permitir acceso seguro a las boletas
        estadoSistem.duiLogueado = duiIngresado;
        if (vistaLoginVotante) vistaLoginVotante.classList.add('hidden');
        if (vistaVotante) vistaVotante.classList.remove('hidden');
    });
}

function calcularTiempoFormateado(expiraMs) {
    const dif = expiraMs - Date.now();
    if (dif <= 0) return "00:00";
    const min = Math.floor(dif / 60000);
    const seg = Math.floor((dif % 60000) / 1000);
    return `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;
}

// ==========================================
// REGISTRO DE VOTO Y EXPULSIÓN INMEDIATA
// ==========================================
async function registrarVoto(idCard) {
    if (!estadoSistem.duiLogueado) return;

    const pSel = estadoSistem.participantes.find(p => p.id === idCard);
    if (!pSel) return;

    const pDocRef = doc(db, "participantes", idCard);
    await updateDoc(pDocRef, { votos: pSel.votos + 1 });

    const snapshotConfig = await getDoc(controlVotacionDocRef);
    const listaYaVotaron = snapshotConfig.data().duisQueYaVotaron || [];
    
    if (!listaYaVotaron.includes(estadoSistem.duiLogueado)) {
        listaYaVotaron.push(estadoSistem.duiLogueado);
        await updateDoc(controlVotacionDocRef, { duisQueYaVotaron: listaYaVotaron });
    }

    alert("¡Tu voto ha sido procesado de manera limpia y confidencial!");

    estadoSistem.duiLogueado = null;
    if (inputDuiLogin) inputDuiLogin.value = ''; 
    if (errorMsgLogin) errorMsgLogin.classList.add('hidden');

    if (vistaVotante) vistaVotante.classList.add('hidden');
    if (vistaLoginVotante) vistaLoginVotante.classList.remove('hidden'); 
}

// ==========================================
// ESCUCHADORES EN TIEMPO REAL (FIREBASE)
// ==========================================
onSnapshot(participantesRef, (snapshot) => {
    estadoSistem.participantes = [];
    snapshot.forEach((docSnap) => {
        const datos = docSnap.data();
        estadoSistem.participantes.push({
            id: docSnap.id, 
            titulo: datos.titulo,
            descripcion: datos.descripcion,
            votos: datos.votos || 0
        });
    });
    renderizarOpciones();
});

onSnapshot(controlVotacionDocRef, (docSnap) => {
    if (!docSnap.exists()) return;
    const config = docSnap.data();
    estadoSistem.haFinalizado = config.haFinalizado || false;
    estadoSistem.tiempoExpiracionGlobal = config.expiraEn || 0;

    if (estadoSistem.tiempoExpiracionGlobal && !estadoSistem.haFinalizado) {
        controlarReloj(estadoSistem.tiempoExpiracionGlobal);
    } else {
        clearInterval(estadoSistem.intervaloReloj);
        if (estadoSistem.haFinalizado) finalizarYCalcularResultados();
    }
});

function controlarReloj(tiempoFinal) {
    clearInterval(estadoSistem.intervaloReloj);
    estadoSistem.intervaloReloj = setInterval(() => {
        const ahora = Date.now();
        const dif = tiempoFinal - ahora;

        if (dif <= 0) {
            clearInterval(estadoSistem.intervaloReloj);
            if (timerDisplay) timerDisplay.textContent = "¡Tiempo Agotado!";
            estadoSistem.haFinalizado = true;
            updateDoc(controlVotacionDocRef, { haFinalizado: true });
            finalizarYCalcularResultados();
            return;
        }
        if (timerDisplay) timerDisplay.textContent = `Tiempo restante: ${calcularTiempoFormateado(tiempoFinal)}`;
    }, 1000);
}

function renderizarOpciones() {
    if (!gridVotacion) return;
    gridVotacion.innerHTML = '';
    estadoSistem.participantes.forEach(p => {
        const card = document.createElement('div');
        card.classList.add('card');
        card.innerHTML = `
            <div class="card-content">
                <h3>${p.titulo}</h3>
                <p>${p.descripcion}</p>
                <div class="card-footer">
                    <button class="btn-vote" data-id="${p.id}">Emitir Voto</button>
                </div>
            </div>
        `;
        gridVotacion.appendChild(card);
    });
}

if (gridVotacion) {
    gridVotacion.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-vote')) {
            const id = e.target.getAttribute('data-id');
            registrarVoto(id);
        }
    });
}

function finalizarYCalcularResultados() {
    if (estadoSistem.rolActual === 'votante') {
        if (vistaLoginVotante) vistaLoginVotante.classList.add('hidden');
        if (vistaVotante) vistaVotante.classList.add('hidden');
    }
    
    if (!listaResultados) return;
    listaResultados.innerHTML = '';
    const maxVotos = Math.max(...estadoSistem.participantes.map(p => p.votos), 0);

    estadoSistem.participantes.forEach(p => {
        const fila = document.createElement('div');
        fila.className = "resultado-item";
        fila.innerHTML = `<strong>${p.votos === maxVotos && maxVotos > 0 ? '🏆 ' : ''}${p.titulo}</strong>: ${p.votos} votos`;
        listaResultados.appendChild(fila);
    });
    if (panelResultados) panelResultados.classList.remove('hidden');
}

// ==========================================
// GESTIÓN INTERNA DEL ADMINISTRADOR (PADRÓN)
// ==========================================
if (btnAddDui) {
    btnAddDui.addEventListener('click', () => {
        const val = inputNuevoDui.value.trim();
        // Al añadir manual también se exige formato con guión
        const formatoDuiValido = /^\d{8}-\d{1}$/;
        if (formatoDuiValido.test(val) && !estadoSistem.padronDuis.includes(val)) {
            estadoSistem.padronDuis.push(val);
            inyectarListaPrevia();
            inputNuevoDui.value = '';
        } else if (!formatoDuiValido.test(val)) {
            alert("El DUI ingresado manualmente debe tener el formato de 9 dígitos y guión (00000000-0).");
        }
    });
}

if (inputArchivoDuis) {
    inputArchivoDuis.addEventListener('change', (e) => {
        const arch = e.target.files[0];
        if (!arch) return;
        const lector = new FileReader();
        lector.onload = (evt) => {
            const lineas = evt.target.result.split(/\r?\n/);
            lineas.forEach(l => {
                const d = l.trim();
                // Acepta solo líneas con formato DUI estricto desde el bloc de notas
                const formatoDuiValido = /^\d{8}-\d{1}$/;
                if (formatoDuiValido.test(d) && !estadoSistem.padronDuis.includes(d)) {
                    estadoSistem.padronDuis.push(d);
                }
            });
            inyectarListaPrevia();
            inputArchivoDuis.value = '';
        };
        lector.readAsText(arch);
    });
}

function inyectarListaPrevia() {
    if (!listaDuisPrevia) return;
    listaDuisPrevia.innerHTML = '';
    estadoSistem.padronDuis.forEach((d, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${d}</span><button type="button" class="del-dui" data-idx="${idx}">x</button>`;
        listaDuisPrevia.appendChild(li);
    });
}

if (listaDuisPrevia) {
    listaDuisPrevia.addEventListener('click', (e) => {
        if (e.target.classList.contains('del-dui')) {
            estadoSistem.padronDuis.splice(e.target.getAttribute('data-idx'), 1);
            inyectarListaPrevia();
        }
    });
}

if (formInscripcion) {
    formInscripcion.addEventListener('submit', async (e) => {
        e.preventDefault();
        const t = document.getElementById('nuevo-titulo');
        const d = document.getElementById('nueva-descripcion');
        if (t && d) {
            await addDoc(participantesRef, { titulo: t.value, descripcion: d.value, votos: 0 });
            formInscripcion.reset();
        }
    });
}

if (btnFinalize) {
    btnFinalize.addEventListener('click', async () => {
        if (estadoSistem.padronDuis.length === 0) {
            alert("El padrón de DUIs no puede estar vacío.");
            return;
        }
        const tMin = parseInt(inputTiempoDuracion.value) || 10;
        await setDoc(controlVotacionDocRef, {
            modoVotacion: selectTipoVotacion ? selectTipoVotacion.value : 'unico',
            haFinalizado: false,
            expiraEn: Date.now() + (tMin * 60 * 1000),
            padronDuis: estadoSistem.padronDuis,
            duisQueYaVotaron: []
        });
        alert("¡Votación lanzada con éxito!");
    });
}

if (btnReset) {
    btnReset.addEventListener('click', async () => {
        if (!confirm("¿Deseas vaciar la base de datos por completo?")) return;
        clearInterval(estadoSistem.intervaloReloj);
        estadoSistem.padronDuis = [];
        inyectarListaPrevia();
        if (panelResultados) panelResultados.classList.add('hidden');
        await setDoc(controlVotacionDocRef, {
            modoVotacion: 'unico',
            haFinalizado: true,
            expiraEn: 0,
            padronDuis: [],
            duisQueYaVotaron: []
        });
    });
}

// Inicialización de la aplicación
inicializarRutas();