// ==========================================================================
// GESTIÓN DE MESAS Y RESERVAS - JSMESAS.JS
// Conexión con apirestaurante (Node.js + Express + MySQL)
// ==========================================================================

const API_BASE = 'http://localhost:5020';

const ENDPOINTS = {
    mesasCliente: `${API_BASE}/ver-mesascliente`,
    mesasAdmin: `${API_BASE}/ver-mesasadmi`,
    reservarMesa: `${API_BASE}/reservar-mesa`,
    horariosTurnos: `${API_BASE}/horarios-turnos`,
    misReservas: `${API_BASE}/mis-reservas`
};

// Variable global con el usuario autenticado y lista de mesas
let usuarioActual = null;
let listaMesas = [];
let mesaSeleccionada = null;

// ==========================================================================
// 1. VERIFICACIÓN Y CARGA DE SESIÓN
// ==========================================================================
function inicializarSesion() {
    try {
        const sesionStr = localStorage.getItem('usuarioRestaurante') || localStorage.getItem('usuarioSena');
        if (!sesionStr) {
            // Si no hay sesión, volver al login
            window.location.replace('login.html');
            return null;
        }

        usuarioActual = JSON.parse(sesionStr);

        // Mostrar datos en el header
        const nombreDisplay = document.getElementById('nombreUsuarioDisplay');
        const inicialDisplay = document.getElementById('inicialUsuario');
        const rolDisplay = document.getElementById('rolUsuarioDisplay');

        const nombre = usuarioActual.nombre || usuarioActual.nombres || (usuarioActual.correo ? usuarioActual.correo.split('@')[0] : 'Usuario');

        if (nombreDisplay) nombreDisplay.textContent = nombre;
        if (inicialDisplay) inicialDisplay.textContent = nombre.charAt(0).toUpperCase();
        if (rolDisplay) rolDisplay.textContent = usuarioActual.rol || 'Cliente';

        // Detección insensible a mayúsculas/minúsculas de administrador
        const esAdmin = usuarioActual && (
            String(usuarioActual.rol || '').toLowerCase().includes('admin') ||
            Boolean(usuarioActual.idAdmin) ||
            Boolean(usuarioActual.idadmin)
        );

        // Mostrar o esconder botones de administración
        const btnCrearCliente = document.getElementById('btnAdminCrearCliente');
        const btnToolbar = document.getElementById('btnToolbarCrearCliente');

        if (btnCrearCliente) {
            btnCrearCliente.style.display = esAdmin ? 'inline-flex' : 'none';
        }
        if (btnToolbar) {
            btnToolbar.style.display = esAdmin ? 'inline-flex' : 'none';
        }

        return usuarioActual;
    } catch (e) {
        console.error("Error al leer sesión:", e);
        window.location.replace('login.html');
        return null;
    }
}

// ==========================================================================
// 2. CIERRE DE SESIÓN
// ==========================================================================
function cerrarSesion() {
    localStorage.removeItem('usuarioRestaurante');
    localStorage.removeItem('usuarioSena');
    localStorage.removeItem('tokenSena');
    window.location.replace('login.html');
}

// ==========================================================================
// 3. CONSULTA DE MESAS DESDE LA API
// ==========================================================================
async function cargarMesas() {
    const contenedor = document.getElementById('contenedorMesas') || document.getElementById('gridMesas');
    if (!contenedor) return;

    // Mostrar estado de carga
    contenedor.innerHTML = `
        <div class="mesas-cargando" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #a39c94;">
            <i class="fa-solid fa-circle-notch fa-spin fa-2x" style="color: #c87a46; margin-bottom: 12px;"></i>
            <p>Cargando disponibilidad de mesas...</p>
        </div>
    `;

    try {
        // Si es administrador puede ver todas las mesas, si es cliente ve las disponibles
        const esAdmin = usuarioActual && (usuarioActual.rol === 'Administrador' || usuarioActual.idAdmin);
        const url = esAdmin ? ENDPOINTS.mesasAdmin : ENDPOINTS.mesasCliente;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error en el servidor (${response.status})`);
        }

        const data = await response.json();
        listaMesas = data.datos || [];

        renderizarMesas(listaMesas);

    } catch (error) {
        console.error("Error al cargar mesas:", error);
        contenedor.innerHTML = `
            <div class="alerta-error-mesas" style="grid-column: 1 / -1; text-align: center; padding: 30px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 16px; color: #fca5a5;">
                <i class="fa-solid fa-triangle-exclamation fa-2x" style="margin-bottom: 10px;"></i>
                <p>No se pudo conectar con el servidor de mesas (${error.message}).</p>
                <button onclick="cargarMesas()" class="btn-reintentar" style="margin-top: 12px; padding: 8px 18px; background: #c87a46; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    <i class="fa-solid fa-rotate-right"></i> Reintentar
                </button>
            </div>
        `;
    }
}

// ==========================================================================
// 4. RENDERIZADO DE MESAS EN LA INTERFAZ
// ==========================================================================
function renderizarMesas(mesas) {
    const contenedor = document.getElementById('contenedorMesas') || document.getElementById('gridMesas');
    if (!contenedor) return;

    if (!mesas || mesas.length === 0) {
        contenedor.innerHTML = `
            <div class="mesas-vacio" style="grid-column: 1 / -1; text-align: center; padding: 50px 20px; color: #a39c94;">
                <i class="fa-solid fa-chair fa-3x" style="color: #6e6761; margin-bottom: 15px;"></i>
                <h3 style="color: #f5f2ee; margin-bottom: 6px;">No hay mesas disponibles</h3>
                <p>En este momento todas las mesas están reservadas u ocupadas. Por favor intenta más tarde.</p>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = mesas.map(mesa => {
        const idMesa = mesa.idmesa || mesa.idMesa || mesa.numero_mesa;
        const disponible = String(mesa.estado).toLowerCase() === 'disponible';
        const estadoClase = disponible ? 'estado-disponible' : 'estado-ocupada';
        const estadoTexto = disponible ? 'Disponible' : (mesa.estado || 'Ocupada');

        return `
            <div class="card-mesa ${disponible ? '' : 'mesa-deshabilitada'}" data-id="${idMesa}">
                <div class="card-mesa-header">
                    <span class="mesa-numero">Mesa #${mesa.numero_mesa}</span>
                    <span class="badge-estado ${estadoClase}">${estadoTexto}</span>
                </div>

                <div class="card-mesa-body">
                    <div class="mesa-info-item">
                        <i class="fa-solid fa-users"></i>
                        <span>Capacidad: <strong>${mesa.capacidad} personas</strong></span>
                    </div>
                    <div class="mesa-info-item">
                        <i class="fa-solid fa-location-dot"></i>
                        <span>Ubicación: <strong>${mesa.ubicacion || 'Salón Principal'}</strong></span>
                    </div>
                </div>

                <div class="card-mesa-footer">
                    ${disponible ? `
                        <button class="btn-reservar-mesa" onclick="abrirModalReserva(${idMesa}, ${mesa.numero_mesa}, ${mesa.capacidad})">
                            <i class="fa-solid fa-calendar-check"></i> Reservar Mesa
                        </button>
                    ` : `
                        <button class="btn-reservar-mesa disabled" disabled>
                            <i class="fa-solid fa-ban"></i> No disponible
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// ==========================================================================
// 5. FILTRADO RÁPIDO DE MESAS (Por capacidad o ubicación)
// ==========================================================================
function filtrarMesasPorCapacidad(capacidadMinima) {
    if (!capacidadMinima || capacidadMinima === 'todas') {
        renderizarMesas(listaMesas);
    } else {
        const filtradas = listaMesas.filter(m => Number(m.capacidad) >= Number(capacidadMinima));
        renderizarMesas(filtradas);
    }
}

// ==========================================================================
// 6. GESTIÓN DE RESERVAS (MODAL & ENVÍO A LA API)
// ==========================================================================
function abrirModalReserva(idMesa, numeroMesa, capacidad) {
    mesaSeleccionada = { idMesa, numeroMesa, capacidad };

    const modal = document.getElementById('modalReserva');
    const inputMesaInfo = document.getElementById('reservaMesaNumero');
    const inputCapacidadMax = document.getElementById('reservaPersonas');
    const inputFecha = document.getElementById('reservaFecha');

    if (inputMesaInfo) {
        inputMesaInfo.textContent = `Mesa #${numeroMesa} (Capacidad: máx. ${capacidad} personas)`;
    }

    if (inputCapacidadMax) {
        inputCapacidadMax.max = capacidad;
        inputCapacidadMax.value = Math.min(2, capacidad);
    }

    // Configurar fecha mínima como HOY
    if (inputFecha) {
        const hoy = new Date().toISOString().split('T')[0];
        inputFecha.min = hoy;
        if (!inputFecha.value) inputFecha.value = hoy;
    }

    if (modal) {
        modal.classList.add('activo');
        modal.style.display = 'flex';
    } else {
        // Si no existe modal en el DOM, hacer prompt interactivo
        crearReservaRapida(idMesa, numeroMesa, capacidad);
    }
}

function cerrarModalReserva() {
    const modal = document.getElementById('modalReserva');
    if (modal) {
        modal.classList.remove('activo');
        modal.style.display = 'none';
    }
    mesaSeleccionada = null;
}

// Envío de la reserva al backend
async function procesarReserva(evento) {
    if (evento) evento.preventDefault();

    if (!mesaSeleccionada) {
        alert("Selecciona una mesa antes de continuar.");
        return;
    }

    const inputFecha = document.getElementById('reservaFecha');
    const inputHora = document.getElementById('reservaHora');
    const inputPersonas = document.getElementById('reservaPersonas');
    const inputNotas = document.getElementById('reservaNotas');

    const fecha = inputFecha ? inputFecha.value : null;
    const hora = inputHora ? inputHora.value : null;
    const numPersonas = inputPersonas ? Number(inputPersonas.value) : 1;
    const notas = inputNotas ? inputNotas.value.trim() : '';

    if (!fecha || !hora) {
        alert("Por favor ingresa la fecha y la hora para la reserva.");
        return;
    }

    // ID del cliente obtenido de la sesión guardada
    const idCliente = usuarioActual.idCliente || usuarioActual.idclientes || usuarioActual.idAdmin;

    if (!idCliente) {
        alert("No se pudo identificar tu cuenta de usuario. Inicia sesión nuevamente.");
        cerrarSesion();
        return;
    }

    const payload = {
        idMesa: Number(mesaSeleccionada.idMesa),
        Idclientes: Number(idCliente),
        fecha: fecha,
        hora: hora.length === 5 ? `${hora}:00` : hora,
        numPersonas: numPersonas,
        notas: notas
    };

    const btnSubmit = document.getElementById('btnConfirmarReserva');
    if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Confirmando...`;
    }

    try {
        const response = await fetch(ENDPOINTS.reservarMesa, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'No se pudo completar la reserva.');
        }

        alert(`¡Reserva confirmada con éxito para la Mesa #${mesaSeleccionada.numeroMesa}!\nFecha: ${fecha} - Hora: ${hora}`);
        cerrarModalReserva();
        // Recargar mesas para actualizar estados
        cargarMesas();

    } catch (error) {
        alert(`Error al registrar la reserva: ${error.message}`);
    } finally {
        if (btnSubmit) {
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = `<i class="fa-solid fa-check"></i> Confirmar Reserva`;
        }
    }
}

// ==========================================================================
// 7. RESPONSIVIDAD Y UTILIDADES DEL SIDEBAR
// ==========================================================================
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

window.addEventListener('resize', () => {
    if (window.innerWidth > 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        if (sidebar) sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }
});

// ==========================================================================
// 8. INICIALIZACIÓN AUTOMÁTICA AL CARGAR EL DOCUMENTO
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (inicializarSesion()) {
        cargarMesas();

        // Vincular formulario de reserva si existe
        const formReserva = document.getElementById('formReserva');
        if (formReserva) {
            formReserva.addEventListener('submit', procesarReserva);
        }
    }
});


// ==========================================================================
// 8. INICIALIZACIÓN AUTOMÁTICA AL CARGAR EL DOCUMENTO
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (inicializarSesion()) {
        cargarMesas();

        // Vincular formulario de reserva si existe
        const formReserva = document.getElementById('formReserva');
        if (formReserva) {
            formReserva.addEventListener('submit', procesarReserva);
        }
    }
});