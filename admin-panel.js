// admin-panel.js
import { db } from "./firebase-config.js";
import { collection, addDoc, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
// Importamos Firebase Authentication incluyendo la función de restaurar contraseñas
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// Inicializamos el servicio de autenticación
const auth = getAuth();

// ========================================================
// 1. CONTROL DE INTERFAZ INTERNA (LOGIN vs REGISTRO vs RECUPERACIÓN)
// ========================================================

const boxLogin = document.getElementById("admin-box-login");
const boxRegister = document.getElementById("admin-box-register");
const boxRecover = document.getElementById("admin-box-recover");

const linkIrARegistro = document.getElementById("link-ir-a-registro");
const linkIrALogin = document.getElementById("link-ir-a-login");
const linkIrARecuperar = document.getElementById("link-ir-a-recover"); // Enlace de olvido de contraseña
const linkRecuperarALogin = document.getElementById("link-recuperar-a-login");

// Alternar a la vista de Registro
if (linkIrARegistro) {
    linkIrARegistro.addEventListener("click", (e) => {
        e.preventDefault();
        boxLogin.classList.add("hidden");
        boxRegister.classList.remove("hidden");
        boxRecover.classList.add("hidden");
        document.getElementById("admin-error-msg").classList.add("hidden");
    });
}

// Alternar a la vista de Iniciar Sesión (desde Registro)
if (linkIrALogin) {
    linkIrALogin.addEventListener("click", (e) => {
        e.preventDefault();
        boxRegister.classList.add("hidden");
        boxLogin.classList.remove("hidden");
        boxRecover.classList.add("hidden");
        document.getElementById("admin-reg-error-msg").classList.add("hidden");
    });
}

// Alternar a la vista de Recuperar Contraseña
if (linkIrARecuperar) {
    linkIrARecuperar.addEventListener("click", (e) => {
        e.preventDefault();
        boxLogin.classList.add("hidden");
        boxRegister.classList.add("hidden");
        boxRecover.classList.remove("hidden");
        document.getElementById("admin-error-msg").classList.add("hidden");
    });
}

// Alternar de Recuperación de vuelta al Inicio de Sesión
if (linkRecuperarALogin) {
    linkRecuperarALogin.addEventListener("click", (e) => {
        e.preventDefault();
        boxRecover.classList.add("hidden");
        boxLogin.classList.remove("hidden");
        boxRegister.classList.add("hidden");
        document.getElementById("admin-recover-msg").classList.add("hidden");
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

        errorMsg.classList.add("hidden");

        if (!email || !pass) {
            errorMsg.innerText = "Por favor, completa todos los campos.";
            errorMsg.classList.remove("hidden");
            return;
        }

        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, pass);
            
            // Pasamos directo al Panel Administrativo estructurado
            document.getElementById("admin-login-view").classList.add("hidden");
            document.getElementById("admin-panel-view").classList.remove("hidden");
            
        } catch (error) {
            console.error("Error al loguear admin:", error);
            errorMsg.innerText = "Credenciales incorrectas o administrador no registrado.";
            errorMsg.classList.remove("hidden");
        }
    });
}

// BOTÓN: Ejecutar Registro de Nuevo Administrador (Recogiendo todos los datos oficiales)
const btnExecuteRegister = document.getElementById("btn-execute-register");
if (btnExecuteRegister) {
    btnExecuteRegister.addEventListener("click", async () => {
        const name = document.getElementById("admin-reg-name").value.trim();
        const dui = document.getElementById("admin-reg-dui").value.trim();
        const phone = document.getElementById("admin-reg-phone").value.trim();
        const email = document.getElementById("admin-reg-email").value.trim();
        const pass = document.getElementById("admin-reg-pass").value;
        const errorRegMsg = document.getElementById("admin-reg-error-msg");

        errorRegMsg.classList.add("hidden");

        if (!name || !dui || !phone || !email || !pass) {
            errorRegMsg.innerText = "Todos los campos son obligatorios para el registro.";
            errorRegMsg.classList.remove("hidden");
            return;
        }

        if (pass.length < 6) {
            errorRegMsg.innerText = "La contraseña debe tener un mínimo de 6 caracteres.";
            errorRegMsg.classList.remove("hidden");
            return;
        }

        try {
            // Creamos el usuario en Firebase Authentication
            const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
            const user = userCredential.user;

            // Guardamos el perfil completo en la colección de Firestore
            await addDoc(collection(db, "administradores"), {
                uid: user.uid,
                nombre: name,
                dui: dui,
                telefono: phone,
                correo: email,
                fechaRegistro: new Date()
            });

            // Redirigimos automáticamente al panel principal activo
            document.getElementById("admin-login-view").classList.add("hidden");
            document.getElementById("admin-panel-view").classList.remove("hidden");

        } catch (error) {
            console.error("Error en el registro:", error);
            if (error.code === "auth/email-already-in-use") {
                errorRegMsg.innerText = "Este correo electrónico ya se encuentra registrado.";
            } else {
                errorRegMsg.innerText = "Ocurrió un error en el registro. Inténtalo de nuevo.";
            }
            errorRegMsg.classList.remove("hidden");
        }
    });
}

// BOTÓN: Ejecutar Recuperación de Contraseña por Correo
const btnExecuteRecover = document.getElementById("btn-execute-recover");
if (btnExecuteRecover) {
    btnExecuteRecover.addEventListener("click", async () => {
        const email = document.getElementById("admin-recover-email").value.trim();
        const recoverMsg = document.getElementById("admin-recover-msg");

        recoverMsg.classList.add("hidden");

        if (!email) {
            recoverMsg.innerText = "Por favor, ingresa tu correo electrónico.";
            recoverMsg.style.color = "#dc2626";
            recoverMsg.classList.remove("hidden");
            return;
        }

        try {
            await sendPasswordResetEmail(auth, email);
            recoverMsg.innerText = "¡Enlace enviado! Revisa tu bandeja de entrada o spam.";
            recoverMsg.style.color = "#16a34a";
            recoverMsg.classList.remove("hidden");
        } catch (error) {
            console.error("Error de restauración:", error);
            recoverMsg.innerText = "No se pudo enviar el correo. Verifica el formato.";
            recoverMsg.style.color = "#dc2626";
            recoverMsg.classList.remove("hidden");
        }
    });
}


// ========================================================
// 3. TUS FUNCIONES DE PROCESAMIENTO EXISTENTES
// ========================================================

// Función para procesar el archivo de DUIs cargado por el Admin
export function leerArchivoDUIs(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const contenido = e.target.result;
            const listaDuis = contenido.split(/\r?\n/)
                                       .map(dui => dui.trim())
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