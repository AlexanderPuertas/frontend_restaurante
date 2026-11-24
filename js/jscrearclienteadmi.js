// ==========================================================================
// JS CREAR CLIENTE POR EL ADMINISTRADOR (RF-01)
// Conexión con apirestaurante: POST /seguridad-crearCliente
// ==========================================================================

const API_URL_CREAR_CLIENTE = 'http://localhost:5020/seguridad-crearCliente';

// Referencias al DOM
const form = document.getElementById('formCrearCliente');
const inputNombre = document.getElementById('nombre');
const inputCorreo = document.getElementById('correo');
const inputTelefono = document.getElementById('telefono');
const inputContrasena = document.getElementById('contrasena');
const btnSubmit = document.getElementById('btnSubmit');
const btnText = btnSubmit.querySelector('span');
const btnIcon = btnSubmit.querySelector('i');
const btnTogglePassword = document.getElementById('btnTogglePassword');

// Elementos de la alerta
const mensajeAlerta = document.getElementById('mensajeAlerta');
const alertaTitulo = document.getElementById('alertaTitulo');
const alertaMensaje = document.getElementById('alertaMensaje');
const alertaIcono = document.getElementById('alertaIcono');

// Elementos del checklist de contraseña
const reqLongitud = document.getElementById('reqLongitud');
const reqMayus = document.getElementById('reqMayus');
const reqMinus = document.getElementById('reqMinus');
const reqNumero = document.getElementById('reqNumero');
const reqSimbolo = document.getElementById('reqSimbolo');

// ==========================================================================
// 1. CARGA DE DATOS DEL ADMINISTRADOR EN LA CABECERA
// ==========================================================================
function cargarDatosAdmin() {
    try {
        const sesionStr = localStorage.getItem('usuarioRestaurante') || localStorage.getItem('usuarioSena');
        if (sesionStr) {
            const admin = JSON.parse(sesionStr);
            const nombre = admin.nombre || admin.nombres || (admin.correo ? admin.correo.split('@')[0] : 'Administrador');
            
            const displayNombre = document.getElementById('adminNombreDisplay');
            const displayAvatar = document.getElementById('adminAvatar');

            if (displayNombre) displayNombre.textContent = nombre;
            if (displayAvatar) displayAvatar.textContent = nombre.charAt(0).toUpperCase();
        }
    } catch (e) {
        console.error("Error al cargar datos del admin:", e);
    }
}

// ==========================================================================
// 2. TOGGLE PARA MOSTRAR / OCULTAR CONTRASEÑA
// ==========================================================================
if (btnTogglePassword) {
    btnTogglePassword.addEventListener('click', () => {
        const icon = btnTogglePassword.querySelector('i');
        if (inputContrasena.type === 'password') {
            inputContrasena.type = 'text';
            icon.className = 'fa-solid fa-eye-slash';
        } else {
            inputContrasena.type = 'password';
            icon.className = 'fa-solid fa-eye';
        }
    });
}

// ==========================================================================
// 3. VALIDACIÓN EN TIEMPO REAL DE CONTRASEÑA (CHECKLIST)
// ==========================================================================
inputContrasena.addEventListener('input', () => {
    const valor = inputContrasena.value;

    const tieneLongitud = valor.length >= 8;
    const tieneMayus = /[A-Z]/.test(valor);
    const tieneMinus = /[a-z]/.test(valor);
    const tieneNumero = /\d/.test(valor);
    const tieneSimbolo = /[\W_]/.test(valor);

    actualizarCheck(reqLongitud, tieneLongitud);
    actualizarCheck(reqMayus, tieneMayus);
    actualizarCheck(reqMinus, tieneMinus);
    actualizarCheck(reqNumero, tieneNumero);
    actualizarCheck(reqSimbolo, tieneSimbolo);
});

function actualizarCheck(elemento, esValido) {
    if (!elemento) return;
    if (esValido) {
        elemento.classList.add('cumplido');
    } else {
        elemento.classList.remove('cumplido');
    }
}

// ==========================================================================
// 4. FUNCIONES DE ALERTA (ERROR Y ÉXITO)
// ==========================================================================
function mostrarAlerta(tipo, titulo, mensaje) {
    alertaTitulo.textContent = titulo;
    alertaMensaje.textContent = mensaje;

    mensajeAlerta.className = tipo === 'exito' ? 'alerta-box alerta-exito' : 'alerta-box alerta-error';
    alertaIcono.className = tipo === 'exito' ? 'fa-solid fa-circle-check alerta-icono' : 'fa-solid fa-circle-exclamation alerta-icono';

    mensajeAlerta.style.display = 'flex';
    mensajeAlerta.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function ocultarAlerta() {
    mensajeAlerta.style.display = 'none';
}

function setLoading(isLoading) {
    if (isLoading) {
        btnSubmit.disabled = true;
        btnText.textContent = 'Registrando cliente en el sistema...';
        btnIcon.className = 'fa-solid fa-circle-notch fa-spin';
    } else {
        btnSubmit.disabled = false;
        btnText.textContent = 'Crear Cuenta de Cliente';
        btnIcon.className = 'fa-solid fa-user-plus';
    }
}

// ==========================================================================
// 5. VALIDACIÓN DEL LADO DEL CLIENTE (MISMAS REGLAS DEL BACKEND)
// ==========================================================================
function validarCampos(nom, corr, tel, contra) {
    if (!nom || !corr || !tel || !contra) {
        return 'Todos los campos son obligatorios.';
    }

    // Regla nombre: solo letras y espacios de 3 a 100 caracteres
    const regNombre = /^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]{3,100}$/;
    if (!regNombre.test(nom)) {
        return 'Nombres y apellidos inválidos: debe tener entre 3 y 100 caracteres y solo letras.';
    }

    // Regla correo: formato email válido
    const regEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regEmail.test(corr) || corr.length > 250) {
        return 'Correo electrónico inválido. Ejemplo: cliente@correo.com';
    }

    // Regla teléfono: exactamente 10 dígitos numéricos
    if (!/^\d{10}$/.test(tel)) {
        return 'El teléfono celular debe tener exactamente 10 dígitos numéricos (ej: 3001234567).';
    }

    // Regla contraseña: min 8 car, mayúscula, minúscula, número y símbolo
    const regPass = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/;
    if (!regPass.test(contra)) {
        return 'La contraseña debe tener al menos 8 caracteres, incluir una mayúscula, una minúscula, un número y un símbolo especial.';
    }

    return null;
}

// ==========================================================================
// 6. ENVÍO DEL FORMULARIO Y CONSUMO DE LA API
// ==========================================================================
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarAlerta();

    const nom = inputNombre.value.trim();
    const corr = inputCorreo.value.trim();
    const tel = inputTelefono.value.trim();
    const contra = inputContrasena.value;

    // 1. Validar reglas locales
    const errorValidacion = validarCampos(nom, corr, tel, contra);
    if (errorValidacion) {
        mostrarAlerta('error', 'Por favor verifica los datos:', errorValidacion);
        return;
    }

    setLoading(true);

    // Payload compatible con las variables de CrearClienteControladorAdmi (JSON descriptivo y aliases t1-t4)
    const payload = {
        nombre: nom,
        correo: corr,
        telefono: tel,
        contraseña: contra,
        t1: nom,
        t2: corr,
        t3: tel,
        t4: contra
    };

    try {
        const response = await fetch(API_URL_CREAR_CLIENTE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            // Error 409: Correo duplicado
            if (response.status === 409) {
                throw new Error(`${data.error || 'Ya existe un usuario con este correo.'} (${data.sugerencia || 'Verifica el correo ingresado'})`);
            }
            // Error 400: Error de validación en el servidor
            if (response.status === 400) {
                throw new Error(data.error || 'Datos inválidos según las reglas del servidor.');
            }
            // Error 500 u otros
            throw new Error(data.error || `Error del servidor (${response.status})`);
        }

        // ==================================================================
        // ✅ ÉXITO AL CREAR CLIENTE (HTTP 201)
        // ==================================================================
        mostrarAlerta(
            'exito',
            '¡Cliente creado exitosamente!',
            `La cuenta para "${nom}" con correo "${corr}" fue dada de alta con el ID #${data.id || 'N/A'}.`
        );

        // Limpiar el formulario y checklist
        form.reset();
        [reqLongitud, reqMayus, reqMinus, reqNumero, reqSimbolo].forEach(el => {
            if (el) el.classList.remove('cumplido');
        });

    } catch (error) {
        console.error("Error al registrar cliente (RF-01):", error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            mostrarAlerta('error', 'Error de conexión:', 'No se pudo conectar con el servidor (http://localhost:5020). Asegúrate de que el backend de Node.js esté ejecutándose.');
        } else {
            mostrarAlerta('error', 'No se pudo registrar el cliente:', error.message);
        }
    } finally {
        setLoading(false);
    }
});

// Inicializar datos del admin al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    cargarDatosAdmin();
});
