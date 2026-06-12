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
    const parametros = new URLSearchParams(window.location.search);
    const modo = parametros.get('modo');

    vistaLoginVotante.classList.add('hidden');
    vistaLoginAdmin.classList.add('hidden');
    vistaAdmin.classList.add('hidden');
    vistaVotante.classList.add('hidden');

    if (modo === 'admin') {
        estadoSistem.rolActual = 'admin';
        vistaLoginAdmin.classList.remove('hidden');
        // Aseguramos que inicie mostrando el Login de Admin y oculte el Registro
        contenedorLoginAdmin.classList.remove('hidden');
        contenedorRegistroAdmin.classList.add('hidden');
    } else {
        estadoSistem.rolActual = 'votante';
        vistaLoginVotante.classList.remove('hidden');
    }
}

// ==========================================
// INTERCAMBIO DE VISTAS (LOGIN / REGISTRO ADMIN)
// ==========================================
linkIrARegistro.addEventListener('click', (e) => {
    e.preventDefault();
    adminErrorMsg.classList.add('hidden');
    contenedorLoginAdmin.classList.add('hidden');
    contenedorRegistroAdmin.classList.remove('hidden');
});

linkIrALogin.addEventListener('click', (e) => {
    e.preventDefault();
    adminRegErrorMsg.classList.add('hidden');
    contenedorRegistroAdmin.classList.add('hidden');
    contenedorLoginAdmin.classList.remove('hidden');
});

// Formateadores de entradas para celular (Máscaras automáticas)
function aplicarMascaraDUI(input) {
    if (!input) return;
    input.addEventListener('input', (e) => {
        let valor = e.target.value.replace(/\D/g, ''); 
        if (valor.length > 8) {
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
btnExecuteRegister.addEventListener('click', async () => {
    adminRegErrorMsg.classList.add('hidden');
    
    const nombre = adminRegName.value.trim();
    const dui = adminRegDui.value.trim();
    const telefono = adminRegPhone.value.trim();
    const email = adminRegEmail.value.trim();
    const password = adminRegPass.value.trim();

    // Validaciones del formulario
    if (!nombre || dui.length < 10 || telefono.length < 9 || !email.includes('@') || password.length < 6) {
        adminRegErrorMsg.textContent = "Por favor, completa todos los campos correctamente. La contraseña debe tener al menos 6 caracteres.";
        adminRegErrorMsg.classList.remove('hidden');
        return;
    }

    try {
        // 1. Crear el usuario en la sección de Autenticación de Firebase
        const credenciales = await createUserWithEmailAndPassword(auth, email, password);
        
        // 2. Guardar información complementaria del Administrador en la colección de Firestore
        await setDoc(doc(db, "administradores", credenciales.user.uid), {
            nombreCompleto: nombre,
            dui: dui,
            telefono: telefono,
            correo: email,
            creadoEn: Date.now()
        });

        alert("¡Cuenta de Administrador creada con éxito!");
        
        // Pasar directo al Panel de Control sin forzar otro login
        vistaLoginAdmin.classList.add('hidden');
        vistaAdmin.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        if (error.code === 'auth/email-already-in-use') {
            adminRegErrorMsg.textContent = "Este correo electrónico ya se encuentra registrado por otro usuario.";
        } else if (error.code === 'auth/weak-password') {
            adminRegErrorMsg.textContent = "La contraseña proporcionada es demasiado débil.";
        } else {
            adminRegErrorMsg.textContent = "Error al registrar cuenta: " + error.message;
        }
        adminRegErrorMsg.classList.remove('hidden');
    }
});

// ==========================================
// EJECUTAR INICIO DE SESIÓN DE ADMIN EN FIREBASE AUTH
// ==========================================
btnExecuteLogin.addEventListener('click', async () => {
    adminErrorMsg.classList.add('hidden');
    
    const email = adminLoginEmail.value.trim();
    const password = adminLoginPass.value.trim();

    if (!email || !password) {
        adminErrorMsg.textContent = "Por favor, introduce tu correo y tu contraseña.";
        adminErrorMsg.classList.remove('hidden');
        return;
    }

    try {
        // Iniciar sesión usando Firebase Auth
        await signInWithEmailAndPassword(auth, email, password);
        
        // Si todo es correcto, saltamos directo al panel administrativo
        vistaLoginAdmin.classList.add('hidden');
        vistaAdmin.classList.remove('hidden');
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            adminErrorMsg.textContent = "Credenciales incorrectas. Verifica tu correo electrónico o tu contraseña.";
        } else {
            adminErrorMsg.textContent = "Error de conexión: " + error.message;
        }
        adminErrorMsg.classList.remove('hidden');
    }
});

// ==========================================
// VALIDACIONES Y LOGIN DEL VOTANTE
// ==========================================
btnIngresar.addEventListener('click', async () => {
    const duiIngresado = inputDuiLogin.value.trim();
    errorMsgLogin.classList.add('hidden');

    if (duiIngresado.length < 10) {
        errorMsgLogin.textContent = "Por favor introduce un DUI válido (10 dígitos).";
        errorMsgLogin.classList.remove('hidden');
        return;
    }

    const snapshotConfig = await getDoc(controlVotacionDocRef);
    if (!snapshotConfig.exists()) {
        errorMsgLogin.textContent = "No se ha inicializado ninguna votación en la base de datos.";
        errorMsgLogin.classList.remove('hidden');
        return;
    }

    const infoVotacion = snapshotConfig.data();
    const listaAutorizados = infoVotacion.padronDuis || [];
    const listaYaVotaron = infoVotacion.duisQueYaVotaron || [];

    // 1. Comprobar si el DUI existe en el padrón cargado
    if (!listaAutorizados.includes(duiIngresado)) {
        errorMsgLogin.textContent = "Este número de DUI no ha sido registrado para esta votación.";
        errorMsgLogin.classList.remove('hidden');
        return;
    }

    // 2. Comprobar si ya emitió su voto (Seguridad estricta)
    if (listaYaVotaron.includes(duiIngresado)) {
        const tiempoRestante = calcularTiempoFormateado(infoVotacion.expiraEn);
        errorMsgLogin.innerHTML = `Usted ya registró su voto exitosamente.<br><br><strong>Nota:</strong> Al expirar el tiempo establecido (${tiempoRestante}) podrá consultar los resultados definitivos en pantalla.`;
        errorMsgLogin.classList.remove('hidden');
        return;
    }

    // 3. Validar si la votación ya expiró por tiempo global
    if (infoVotacion.haFinalizado || Date.now() > infoVotacion.expiraEn) {
        errorMsgLogin.textContent = "La ventana de tiempo para esta votación ha concluido.";
        errorMsgLogin.classList.remove('hidden');
        finalizarYCalcularResultados();
        return;
    }

    // Permitir acceso seguro a las boletas
    estadoSistem.duiLogueado = duiIngresado;
    vistaLoginVotante.classList.add('hidden');
    vistaVotante.classList.remove('hidden');
});

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
    inputDuiLogin.value = ''; 
    errorMsgLogin.classList.add('hidden');

    vistaVotante.classList.add('hidden');
    vistaLoginVotante.classList.remove('hidden'); 
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
            timerDisplay.textContent = "¡Tiempo Agotado!";
            estadoSistem.haFinalizado = true;
            updateDoc(controlVotacionDocRef, { haFinalizado: true });
            finalizarYCalcularResultados();
            return;
        }
        timerDisplay.textContent = `Tiempo restante: ${calcularTiempoFormateado(tiempoFinal)}`;
    }, 1000);
}

function renderizarOpciones() {
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

gridVotacion.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-vote')) {
        const id = e.target.getAttribute('data-id');
        registrarVoto(id);
    }
});

function finalizarYCalcularResultados() {
    if (estadoSistem.rolActual === 'votante') {
        vistaLoginVotante.classList.add('hidden');
        vistaVotante.classList.add('hidden');
    }
    
    listaResultados.innerHTML = '';
    const maxVotos = Math.max(...estadoSistem.participantes.map(p => p.votos), 0);

    estadoSistem.participantes.forEach(p => {
        const fila = document.createElement('div');
        fila.className = "resultado-item";
        fila.innerHTML = `<strong>${p.votos === maxVotos && maxVotos > 0 ? '🏆 ' : ''}${p.titulo}</strong>: ${p.votos} votos`;
        listaResultados.appendChild(fila);
    });
    panelResultados.classList.remove('hidden');
}

// ==========================================
// GESTIÓN INTERNA DEL ADMINISTRADOR (PADRÓN)
// ==========================================
btnAddDui.addEventListener('click', () => {
    const val = inputNuevoDui.value.trim();
    if (val.length === 10 && !estadoSistem.padronDuis.includes(val)) {
        estadoSistem.padronDuis.push(val);
        inyectarListaPrevia();
        inputNuevoDui.value = '';
    }
});

inputArchivoDuis.addEventListener('change', (e) => {
    const arch = e.target.files[0];
    if (!arch) return;
    const lector = new FileReader();
    lector.onload = (evt) => {
        const lineas = evt.target.result.split(/\r?\n/);
        lineas.forEach(l => {
            const d = l.trim();
            if (d.length === 10 && !estadoSistem.padronDuis.includes(d)) estadoSistem.padronDuis.push(d);
        });
        inyectarListaPrevia();
        inputArchivoDuis.value = '';
    };
    lector.readAsText(arch);
});

function inyectarListaPrevia() {
    listaDuisPrevia.innerHTML = '';
    estadoSistem.padronDuis.forEach((d, idx) => {
        const li = document.createElement('li');
        li.innerHTML = `<span>${d}</span><button type="button" class="del-dui" data-idx="${idx}">x</button>`;
        listaDuisPrevia.appendChild(li);
    });
}

listaDuisPrevia.addEventListener('click', (e) => {
    if (e.target.classList.contains('del-dui')) {
        estadoSistem.padronDuis.splice(e.target.getAttribute('data-idx'), 1);
        inyectarListaPrevia();
    }
});

formInscripcion.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = document.getElementById('nuevo-titulo');
    const d = document.getElementById('nueva-descripcion');
    await addDoc(participantesRef, { titulo: t.value, descripcion: d.value, votos: 0 });
    formInscripcion.reset();
});

btnFinalize.addEventListener('click', async () => {
    if (estadoSistem.padronDuis.length === 0) {
        alert("El padrón de DUIs no puede estar vacío.");
        return;
    }
    const tMin = parseInt(inputTiempoDuracion.value) || 10;
    await setDoc(controlVotacionDocRef, {
        modoVotacion: selectTipoVotacion.value,
        haFinalizado: false,
        expiraEn: Date.now() + (tMin * 60 * 1000),
        padronDuis: estadoSistem.padronDuis,
        duisQueYaVotaron: []
    });
    alert("¡Votación lanzada con éxito!");
});

btnReset.addEventListener('click', async () => {
    if (!confirm("¿Deseas vaciar la base de datos por completo?")) return;
    clearInterval(estadoSistem.intervaloReloj);
    estadoSistem.padronDuis = [];
    inyectarListaPrevia();
    panelResultados.classList.add('hidden');
    await setDoc(controlVotacionDocRef, {
        modoVotacion: 'unico',
        haFinalizado: true,
        expiraEn: 0,
        padronDuis: [],
        duisQueYaVotaron: []
    });
});

inicializarRutas();