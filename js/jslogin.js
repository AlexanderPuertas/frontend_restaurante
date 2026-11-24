// ========================================================
// CONFIGURACIÓN DE LA API (apirestaurante)
// ========================================================
const API_BASE = 'http://localhost:5020';
const ENDPOINTS = {
    loginAdmin: `${API_BASE}/login-admin`,       // Valida contra tabla administradores
    loginCliente: `${API_BASE}/login-cliente`    // Valida contra tabla clientes
};

// Referencias al DOM
const loginForm = document.getElementById('loginForm');
const mensajeError = document.getElementById('mensajeError');
const textoError = document.getElementById('textoError');
const btnSubmit = document.getElementById('btnSubmit');
const btnText = btnSubmit.querySelector('span');
const btnIcon = btnSubmit.querySelector('i');
const inputEmail = document.getElementById('t1');
const inputPassword = document.getElementById('t2');
const btnTogglePassword = document.getElementById('btnTogglePassword');

// ========================================================
// 1. UTILIDADES UI
// ========================================================
function mostrarError(mensaje) {
    textoError.textContent = mensaje;
    mensajeError.className = 'mensaje-error';
    mensajeError.style.display = 'flex';
}

function mostrarInfo(mensaje) {
    textoError.textContent = mensaje;
    mensajeError.className = 'mensaje-error mensaje-info';
    mensajeError.style.display = 'flex';
}

function ocultarMensaje() {
    mensajeError.style.display = 'none';
}

function setLoading(isLoading, texto = 'Verificando credenciales...') {
    if (isLoading) {
        btnSubmit.disabled = true;
        btnText.textContent = texto;
        btnIcon.className = 'fa-solid fa-circle-notch fa-spin';
    } else {
        btnSubmit.disabled = false;
        btnText.textContent = 'Iniciar Sesión';
        btnIcon.className = 'fa-solid fa-right-to-bracket';
    }
}

// Toggle para ver/ocultar contraseña
if (btnTogglePassword) {
    btnTogglePassword.addEventListener('click', () => {
        const icon = btnTogglePassword.querySelector('i');
        if (inputPassword.type === 'password') {
            inputPassword.type = 'text';
            icon.className = 'fa-solid fa-eye-slash';
        } else {
            inputPassword.type = 'password';
            icon.className = 'fa-solid fa-eye';
        }
    });
}

// ========================================================
// 2. FUNCIÓN DE AUTENTICACIÓN INTELIGENTE (DETECCIÓN AUTOMÁTICA DE ROL)
// ========================================================
async function autenticarUsuario(correo, contrasena) {
    const credenciales = { t1: correo, t2: contrasena };

    // --- PASO 1: Intentar login como ADMINISTRADOR ---
    try {
        const respAdmin = await fetch(ENDPOINTS.loginAdmin, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credenciales)
        });

        // Si el administrador existe y las credenciales son válidas
        if (respAdmin.ok) {
            const dataAdmin = await respAdmin.json();
            return {
                rol: 'Administrador',
                destino: 'mesas.html',
                datos: {
                    ...dataAdmin.administrador,
                    rol: 'Administrador'
                }
            };
        }

        // Si es una cuenta administrativa pero está inactiva (403)
        if (respAdmin.status === 403) {
            const dataError = await respAdmin.json();
            throw new Error(dataError.error || 'Cuenta de administrador inactiva o deshabilitada.');
        }

        // Si es un error 500 del servidor
        if (respAdmin.status >= 500) {
            const dataError = await respAdmin.json().catch(() => ({}));
            throw new Error(dataError.error || 'Error interno en el servidor.');
        }

    } catch (err) {
        // Si fue error de conexión de red (servidor apagado)
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            throw new Error('No se pudo conectar con el servidor (http://localhost:5020). Asegúrate de que el backend de Node.js esté corriendo.');
        }
        // Si fue una cuenta inactiva o error 500, lanzamos el error
        if (err.message.includes('inactiva') || err.message.includes('interno')) {
            throw err;
        }
        // Si fue 401 (no es admin), continuamos silenciosamente a verificar si es cliente
    }

    // --- PASO 2: Intentar login como CLIENTE ---
    try {
        const respCliente = await fetch(ENDPOINTS.loginCliente, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credenciales)
        });

        const dataCliente = await respCliente.json().catch(() => ({}));

        if (respCliente.ok) {
            return {
                rol: 'Cliente',
                destino: 'mesas.html',
                datos: {
                    ...dataCliente.usuario,
                    rol: 'Cliente'
                }
            };
        }

        if (respCliente.status === 401 || respCliente.status === 400) {
            throw new Error('Credenciales inválidas. Correo o contraseña incorrectos.');
        }

        throw new Error(dataCliente.error || 'Error al validar credenciales.');

    } catch (err) {
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
            throw new Error('No se pudo conectar con el servidor (http://localhost:5020). Asegúrate de que el backend de Node.js esté corriendo.');
        }
        throw err;
    }
}

// ========================================================
// 3. ENVÍO DEL FORMULARIO
// ========================================================
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    ocultarMensaje();

    const correo = inputEmail.value.trim();
    const contrasena = inputPassword.value;

    if (!correo || !contrasena) {
        mostrarError('Por favor completa todos los campos.');
        return;
    }

    setLoading(true, 'Identificando usuario...');

    try {
        const resultado = await autenticarUsuario(correo, contrasena);

        // Guardar información de sesión
        localStorage.setItem('usuarioRestaurante', JSON.stringify(resultado.datos));
        // Compatibilidad con otros scripts que busquen usuarioSena
        localStorage.setItem('usuarioSena', JSON.stringify(resultado.datos));

        mostrarInfo(`¡Bienvenido, ${resultado.datos.nombre || resultado.datos.nombres || resultado.rol}! Redirigiendo a tu panel...`);

        // Redirección al panel correspondiente
        setTimeout(() => {
            window.location.href = resultado.destino;
        }, 800);

    } catch (error) {
        mostrarError(error.message);
    } finally {
        setLoading(false);
    }
});
