// --- ESTADO INICIAL DE LA APLICACIÓN ---
// Si ya hay datos guardados en el navegador, los carga; si no, usa datos de ejemplo.
let datosEscuela = JSON.parse(localStorage.getItem('portalEscolarData')) || {
    materias: ['Español', 'Matemáticas', 'Ciencias', 'Historia'],
    alumnos: [
        { id: 1, nombre: 'Ana Sofía Martínez', notas: { 'Español': 95, 'Matemáticas': 88, 'Ciencias': 92, 'Historia': 90 } },
        { id: 2, nombre: 'Carlos Eduardo López', notas: { 'Español': 82, 'Matemáticas': 95, 'Ciencias': 85, 'Historia': 88 } }
    ],
    horarios: [
        { hora: '07:00 - 08:00', lunes: 'Español', martes: 'Matemáticas', miercoles: 'Español', jueves: 'Ciencias', viernes: 'Historia' },
        { hora: '08:00 - 09:00', lunes: 'Matemáticas', martes: 'Ciencias', miercoles: 'Historia', jueves: 'Español', viernes: 'Matemáticas' }
    ]
};

let rolActual = 'maestro'; // 'maestro' o 'alumno'

// Función para guardar cambios en la memoria del navegador
function guardarDatos() {
    localStorage.setItem('portalEscolarData', JSON.stringify(datosEscuela));
}

// --- CAMBIO DE ROL (MAESTRO / ALUMNO) ---
const roleSelect = document.getElementById('roleSelect');
roleSelect.addEventListener('change', (e) => {
    rolActual = e.target.value;
    if (rolActual === 'alumno') {
        document.body.classList.add('modo-alumno');
    } else {
        document.body.classList.remove('modo-alumno');
    }
    renderizarTodo();
});

// --- NAVEGACIÓN POR PESTAÑAS ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

// --- GESTIÓN DE ALUMNOS Y MATERIAS ---
document.getElementById('btnAgregarAlumno').addEventListener('click', () => {
    const input = document.getElementById('nuevoAlumnoInput');
    const nombre = input.value.trim();
    if (!nombre) return;

    const notasIniciales = {};
    datosEscuela.materias.forEach(mat => notasIniciales[mat] = 0);

    datosEscuela.alumnos.push({
        id: Date.now(),
        nombre: nombre,
        notas: notasIniciales
    });

    input.value = '';
    guardarDatos();
    renderizarTablaNotas();
});

document.getElementById('btnAgregarMateria').addEventListener('click', () => {
    const input = document.getElementById('nuevaMateriaInput');
    const materia = input.value.trim();
    if (!materia || datosEscuela.materias.includes(materia)) return;

    datosEscuela.materias.push(materia);
    datosEscuela.alumnos.forEach(al => al.notas[materia] = 0);

    input.value = '';
    guardarDatos();
    renderizarTablaNotas();
});

function editarMateria(index) {
    if (rolActual !== 'maestro') return;
    const nombreViejo = datosEscuela.materias[index];
    const nombreNuevo = prompt('Nuevo nombre para la materia:', nombreViejo);
    
    if (nombreNuevo && nombreNuevo.trim() !== '' && nombreNuevo !== nombreViejo) {
        datosEscuela.materias[index] = nombreNuevo.trim();
        // Actualizar la clave en las notas de cada alumno
        datosEscuela.alumnos.forEach(al => {
            al.notas[nombreNuevo.trim()] = al.notas[nombreViejo] || 0;
            delete al.notas[nombreViejo];
        });
        guardarDatos();
        renderizarTablaNotas();
    }
}

function eliminarMateria(index) {
    if (rolActual !== 'maestro') return;
    const materia = datosEscuela.materias[index];
    if (confirm(`¿Seguro que deseas eliminar la materia "${materia}"?`)) {
        datosEscuela.materias.splice(index, 1);
        datosEscuela.alumnos.forEach(al => delete al.notas[materia]);
        guardarDatos();
        renderizarTablaNotas();
    }
}

function editarAlumno(id) {
    if (rolActual !== 'maestro') return;
    const alumno = datosEscuela.alumnos.find(a => a.id === id);
    const nuevoNombre = prompt('Editar nombre del alumno:', alumno.nombre);
    if (nuevoNombre && nuevoNombre.trim() !== '') {
        alumno.nombre = nuevoNombre.trim();
        guardarDatos();
        renderizarTablaNotas();
    }
}

function eliminarAlumno(id) {
    if (rolActual !== 'maestro') return;
    if (confirm('¿Eliminar a este alumno de la lista?')) {
        datosEscuela.alumnos = datosEscuela.alumnos.filter(a => a.id !== id);
        guardarDatos();
        renderizarTablaNotas();
    }
}

function actualizarNota(idAlumno, materia, valor) {
    const alumno = datosEscuela.alumnos.find(a => a.id === idAlumno);
    let num = parseFloat(valor);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;

    alumno.notas[materia] = num;
    guardarDatos();
    renderizarTablaNotas();
}

function renderizarTablaNotas() {
    const thead = document.getElementById('tablaHead');
    const tbody = document.getElementById('tablaBody');
    const esMaestro = rolActual === 'maestro';

    // 1. Construir Encabezados (Alumno + Materias + Promedio + Acciones)
    let headHTML = `<tr><th>Alumno</th>`;
    datosEscuela.materias.forEach((mat, index) => {
        headHTML += `
            <th>
                ${mat}
                ${esMaestro ? `
                    <button class="btn-edit" onclick="editarMateria(${index})" title="Renombrar">✏️</button>
                    <button class="btn-danger" onclick="eliminarMateria(${index})" title="Borrar">×</button>
                ` : ''}
            </th>`;
    });
    headHTML += `<th>Promedio</th>`;
    if (esMaestro) headHTML += `<th>Acciones</th>`;
    headHTML += `</tr>`;
    thead.innerHTML = headHTML;

    // 2. Construir Filas de Alumnos
    tbody.innerHTML = '';
    datosEscuela.alumnos.forEach(alumno => {
        let suma = 0;
        let rowHTML = `<tr>
            <td>
                <strong>${alumno.nombre}</strong>
                ${esMaestro ? `<button class="btn-edit" onclick="editarAlumno(${alumno.id})">✏️</button>` : ''}
            </td>`;

        datosEscuela.materias.forEach(mat => {
            const nota = alumno.notas[mat] || 0;
            suma += nota;
            rowHTML += `
                <td>
                    <input type="number" class="nota-input" min="0" max="100" 
                        value="${nota}" 
                        ${!esMaestro ? 'disabled' : ''}
                        onchange="actualizarNota(${alumno.id}, '${mat}', this.value)">
                </td>`;
        });

        const promedio = datosEscuela.materias.length > 0 
            ? (suma / datosEscuela.materias.length).toFixed(1) 
            : '0.0';

        rowHTML += `<td><span class="promedio-badge">${promedio}</span></td>`;
        
        if (esMaestro) {
            rowHTML += `<td><button class="btn-danger" onclick="eliminarAlumno(${alumno.id})">Eliminar</button></td>`;
        }
        rowHTML += `</tr>`;
        tbody.innerHTML += rowHTML;
    });
}

// --- GESTIÓN DE HORARIOS ---
document.getElementById('btnAgregarHorario').addEventListener('click', () => {
    datosEscuela.horarios.push({
        hora: '00:00 - 00:00', lunes: '-', martes: '-', miercoles: '-', jueves: '-', viernes: '-'
    });
    guardarDatos();
    renderizarHorarios();
});

function actualizarHorario(index, campo, valor) {
    datosEscuela.horarios[index][campo] = valor;
    guardarDatos();
}

function eliminarHorario(index) {
    if (confirm('¿Eliminar esta fila del horario?')) {
        datosEscuela.horarios.splice(index, 1);
        guardarDatos();
        renderizarHorarios();
    }
}

function renderizarHorarios() {
    const tbody = document.getElementById('horariosBody');
    const esMaestro = rolActual === 'maestro';
    const dias = ['hora', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

    tbody.innerHTML = '';
    datosEscuela.horarios.forEach((fila, index) => {
        let tr = `<tr>`;
        dias.forEach(dia => {
            tr += `
                <td>
                    <input type="text" class="horario-input" 
                        value="${fila[dia]}" 
                        ${!esMaestro ? 'disabled' : ''}
                        onchange="actualizarHorario(${index}, '${dia}', this.value)">
                </td>`;
        });

        if (esMaestro) {
            tr += `<td><button class="btn-danger" onclick="eliminarHorario(${index})">Borrar</button></td>`;
        }
        tr += `</tr>`;
        tbody.innerHTML += tr;
    });
}

// Inicializar la página
function renderizarTodo() {
    renderizarTablaNotas();
    renderizarHorarios();
}

renderizarTodo();