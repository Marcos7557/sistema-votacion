// admin-panel.js
import { db } from "./firebase-config.js";
import { collection, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// Importamos Firebase Authentication incluyendo la función de restaurar contraseñas
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Inicializamos el servicio de autenticación
const auth = getAuth();

// Arreglo interno para almacenar los DUIs inscritos con su marca de tiempo
let padronDuis = [];

// ========================================================
// MÁSCARAS Y FORMATEADORES AUTOMÁTICOS
// ========================================================
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

// ========================================================
// 1. DECLARACIÓN DE ELEMENTOS DEL DOM (Garantiza que existan antes de usarlos)
// ========================================================
const boxLogin = document.getElementById("admin-box-login");
const boxRegister = document.getElementById("admin-box-register");
const boxRecover = document.getElementById("admin-box-recover");

const linkIrARegistro = document.getElementById("link-ir-a-registro");
const linkIrALogin = document.getElementById("link-ir-a-login");
const linkIrARecuperar = document.getElementById("link-ir-a-recuperar"); 
const linkRecuperarALogin = document.getElementById("link-recuperar-a-login");

const inputNuevoDui = document.getElementById("nuevo-dui");
const btnAddDui = document.getElementById("btn-add-dui");
const adminRegDui = document.getElementById("admin-reg-dui");

// ACTIVACIÓN DE MÁSCARAS AUTOMÁTICAS
aplicarMascaraDUI(inputNuevoDui);
aplicarMascaraDUI(adminRegDui);

// Alternar a la vista de Registro
if (linkIrARegistro) {
    linkIrARegistro.addEventListener("click", (e) => {
        e.preventDefault();
        if (boxLogin) boxLogin.classList.add("hidden");
        if (boxRegister) boxRegister.classList.remove("hidden");
        if (boxRecover) boxRecover.classList.add("hidden");
        const err = document.getElementById("admin-error-msg");
        if (err) err.classList.add("hidden");
    });
}

// Alternar a la vista de Iniciar Sesión (desde Registro)
if (linkIrALogin) {
    linkIrALogin.addEventListener("click", (e) => {
        e.preventDefault();
        if (boxRegister) boxRegister.classList.add("hidden");
        if (boxLogin) boxLogin.classList.remove("hidden");
        if (boxRecover) boxRecover.classList.add("hidden");
        const errReg = document.getElementById("admin-reg-error-msg");
        if (errReg) errReg.classList.add("hidden");
    });
}

// Alternar a la vista de Recuperar Contraseña
if (linkIrARecuperar) {
    linkIrARecuperar.addEventListener("click", (e) => {
        e.preventDefault();
        if (boxLogin) boxLogin.classList.add("hidden");
        if (boxRegister) boxRegister.classList.add("hidden");
        if (boxRecover) boxRecover.classList.remove("hidden");
        const err = document.getElementById("admin-error-msg");
        if (err) err.classList.add("hidden");
    });
}

// Alternar de Recuperación de vuelta al Inicio de Sesión
if (linkRecuperarALogin) {
    linkRecuperarALogin.addEventListener("click", (e) => {
        e.preventDefault();
        if (boxRecover) boxRecover.classList.add("hidden");
        if (boxLogin) boxLogin.classList.remove("hidden");
        if (boxRegister) boxRegister.classList.add("hidden");
        const recMsg = document.getElementById("admin-recover-msg");
        if (recMsg) recMsg.classList.add("hidden");
    });
}


// ========================================================
// 2. LÓGICA DE AUTENTICACIÓN (FIREBASE AUTH)
// ========================================================

// BOTÓN: Ejecutar Inicio de Sesión
const btnExecuteLogin = document.getElementById("btn-execute-login");
if (btnExecuteLogin) {
    btnExecuteLogin.addEventListener("click", async () => {
        const email = document.getElementById("admin-login-email").value.trim();
        const pass = document.getElementById("admin-login-pass").value;
        const errorMsg = document.getElementById("admin-error-msg");

        if (errorMsg) errorMsg.classList.add("hidden");

        if (!email || !pass) {
            if (errorMsg) {
                errorMsg.innerText = "Por favor, completa todos los campos.";
                errorMsg.classList.remove("hidden");
            }
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            
            const loginView = document.getElementById("admin-login-view");
            const panelView = document.getElementById("admin-panel-view");
            if (loginView) loginView.classList.add("hidden");
            if (panelView) panelView.classList.remove("hidden");
            
        } catch (error) {
            console.error("Error al loguear admin:", error);
            if (errorMsg) {
                errorMsg.innerText = "Credenciales incorrectas o administrador no registrado.";
                errorMsg.classList.remove("hidden");
            }
        }
    });
}

// BOTÓN: Ejecutar Registro de Nuevo Administrador
const btnExecuteRegister = document.getElementById("btn-execute-register");
if (btnExecuteRegister) {
    btnExecuteRegister.addEventListener("click", async () => {
        const name = document.getElementById("admin-reg-name").value.trim();
        const dui = document.getElementById("admin-reg-dui").value.trim();
        const phone = document.getElementById("admin-reg-phone").value.trim();
        const email = document.getElementById("admin-reg-email").value.trim();
        const pass = document.getElementById("admin-reg-pass").value;
        const errorRegMsg = document.getElementById("admin-reg-error-msg");

        if (errorRegMsg) errorRegMsg.classList.add("hidden");

        if (!name || !dui || !phone || !email || !pass) {
            if (errorRegMsg) {
                errorRegMsg.innerText = "Todos los campos son obligatorios para el registro.";
                errorRegMsg.classList.remove("hidden");
            }
            return;
        }

        // VALIDACIÓN DE FORMATO DE DUI EN REGISTRO DE ADMIN
        const formatoDuiValido = /^\d{8}-\d{1}$/;
        if (!formatoDuiValido.test(dui)) {
            if (errorRegMsg) {
                errorRegMsg.innerText = "Por favor introduce un número de DUI válido (Ejemplo: 01234567-8).";
                errorRegMsg.classList.remove("hidden");
            }
            return;
        }

        if (pass.length < 6) {
            if (errorRegMsg) {
                errorRegMsg.innerText = "La contraseña debe tener un mínimo de 6 caracteres.";
                errorRegMsg.classList.remove("hidden");
            }
            return;
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;

            await addDoc(collection(db, "administradores"), {
                uid: user.uid,
                nombre: name,
                dui: dui,
                telefono: phone,
                correo: email,
                fechaRegistro: new Date()
            });

            const loginView = document.getElementById("admin-login-view");
            const panelView = document.getElementById("admin-panel-view");
            if (loginView) loginView.classList.add("hidden");
            if (panelView) panelView.classList.remove("hidden");

        } catch (error) {
            console.error("Error en el registro:", error);
            if (errorRegMsg) {
                if (error.code === "auth/email-already-in-use") {
                    errorRegMsg.innerText = "Este correo electrónico ya se encuentra registrado.";
                } else {
                    errorRegMsg.innerText = "Ocurrió un error en el registro. Inténtalo de nuevo.";
                }
                errorRegMsg.classList.remove("hidden");
            }
        }
    });
}

// BOTÓN: Ejecutar Recuperación de Contraseña por Correo
const btnExecuteRecover = document.getElementById("btn-execute-recover");
if (btnExecuteRecover) {
    btnExecuteRecover.addEventListener("click", async () => {
        const email = document.getElementById("admin-recover-email").value.trim();
        const recoverMsg = document.getElementById("admin-recover-msg");

        if (recoverMsg) recoverMsg.classList.add("hidden");

        if (!email) {
            if (recoverMsg) {
                recoverMsg.innerText = "Por favor, ingresa tu correo electrónico.";
                recoverMsg.style.color = "#dc2626";
                recoverMsg.classList.remove("hidden");
            }
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            if (recoverMsg) {
                recoverMsg.innerText = "¡Enlace enviado! Revisa tu bandeja de entrada o spam.";
                recoverMsg.style.color = "#16a34a";
                recoverMsg.classList.remove("hidden");
            }
        } catch (error) {
            console.error("Error de restauración:", error);
            if (recoverMsg) {
                recoverMsg.innerText = "No se pudo enviar el correo. Verifica el formato.";
                recoverMsg.style.color = "#dc2626";
                recoverMsg.classList.remove("hidden");
            }
        }
    });
}


// ========================================================
// 3. GESTIÓN DE PADRÓN DE DUIs Y VENTANA FLOTANTE
// ========================================================

const archivoDuisInput = document.getElementById("archivo-duis");
const modalPadron = document.getElementById("modal-padron");
const btnVerPadron = document.getElementById("btn-ver-padron");
const btnCerrarModal = document.getElementById("btn-cerrar-modal");
const listaDuisModal = document.getElementById("lista-duis-modal");
const selectOrdenarDuis = document.getElementById("ordenar-duis");
const txtTotalDuis = document.getElementById("total-duis");

// Inicializar la ventana flotante oculta al cargar
if (modalPadron) {
    modalPadron.classList.add("hidden");
}

// Función para renderizar y ordenar la lista en la ventana flotante
function actualizarListaModal() {
    if (!listaDuisModal) return;

    let duisOrdenados = [...padronDuis];
    const criterio = selectOrdenarDuis ? selectOrdenarDuis.value : "tiempo";

    if (criterio === "numero") {
        duisOrdenados.sort((a, b) => {
            const numA = parseInt(a.dui.replace("-", ""), 10);
            const numB = parseInt(b.dui.replace("-", ""), 10);
            return numA - numB;
        });
    }

    listaDuisModal.innerHTML = "";
    duisOrdenados.forEach((item) => {
        const li = document.createElement("li");
        li.style.padding = "6px 8px";
        li.style.borderBottom = "1px solid #e5e7eb";
        li.style.display = "flex";
        li.style.justifyContent = "space-between";
        li.innerText = item.dui;
        listaDuisModal.appendChild(li);
    });

    if (txtTotalDuis) {
        txtTotalDuis.innerText = `Total: ${padronDuis.length} DUIs`;
    }
}

// Evento: Agregar un DUI manualmente con el botón "+"
if (btnAddDui && inputNuevoDui) {
    btnAddDui.addEventListener("click", () => {
        const valorDui = inputNuevoDui.value.trim();

        // VALIDACIÓN ESTRICTA DEL FORMATO DE DUI (8 dígitos, guión, 1 dígito)
        const formatoDuiValido = /^\d{8}-\d{1}$/;
        if (!formatoDuiValido.test(valorDui)) {
            alert("Por favor introduce un número de DUI válido con guión (Ejemplo: 00000000-0).");
            return;
        }

        // Comprobación para evitar duplicados repetidos
        const existe = padronDuis.some(item => item.dui === valorDui);
        if (existe) {
            alert("Este número de DUI ya está inscrito en la lista.");
            return;
        }

        padronDuis.push({
            dui: valorDui,
            timestamp: Date.now()
        });

        inputNuevoDui.value = "";
        inputNuevoDui.focus();

        actualizarListaModal();
    });
}

// Evento: Carga Masiva desde archivo .txt
if (archivoDuisInput) {
    archivoDuisInput.addEventListener("change", async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        try {
            const duisCargados = await leerArchivoDUIs(archivo);
            duisCargados.forEach(valDui => {
                // Comprobación estricta de formato en elementos procesados desde el archivo
                const formatoDuiValido = /^\d{8}-\d{1}$/;
                if (formatoDuiValido.test(valDui)) {
                    if (!padronDuis.some(item => item.dui === valDui)) {
                        padronDuis.push({
                            dui: valDui,
                            timestamp: Date.now()
                        });
                    }
                }
            });
            actualizarListaModal();
            alert("Archivo cargado con éxito. Los DUIs válidos se añadieron al padrón.");
        } catch (error) {
            console.error("Error al procesar el archivo:", error);
            alert("No se pudo leer el archivo de texto.");
        }
        archivoDuisInput.value = ""; 
    });
}

// Eventos para abrir y cerrar la ventana flotante (Modal)
if (btnVerPadron && modalPadron) {
    btnVerPadron.addEventListener("click", () => {
        actualizarListaModal();
        modalPadron.classList.remove("hidden");
    });
}

if (btnCerrarModal && modalPadron) {
    btnCerrarModal.addEventListener("click", () => {
        modalPadron.classList.add("hidden");
    });
}

if (selectOrdenarDuis) {
    selectOrdenarDuis.addEventListener("change", actualizarListaModal);
}


// ========================================================
// 4. FUNCIONES DE PROCESAMIENTO EXISTENTES CORREGIDAS
// ========================================================

// Función para procesar el archivo de DUIs cargado por el Admin (Con formateo flexible)
export function leerArchivoDUIs(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const contenido = e.target.result;
            const listaDuis = contenido.split(/\r?\n/)
                                       .map(dui => {
                                           let limpio = dui.trim().replace(/\D/g, ''); // Deja solo números enteros
                                           if (limpio.length === 9) {
                                               // Si viene sin guión pero tiene los 9 dígitos, se lo inyecta solo
                                               return limpio.slice(0, 8) + '-' + limpio.slice(8, 9);
                                           }
                                           return dui.trim(); // Si trae guión u otra longitud pasa directo para evaluarse en el test
                                       })
                                       .filter(dui => dui.length > 0);
            resolve(listaDuis);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsText(file);
    });
}

// Función para calcular cuándo expira la votación basado en minutos asignados
export function calcularTiempoExpiracion(minutos) {
    const ahora = new Date();
    return new Date(ahora.getTime() + minutos * 60000);
}