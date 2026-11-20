// --- ESTADO INICIAL DE LA APLICACIÓN ---
let esProfesor = false;
let rolActual = 'alumno'; // Siempre inicia en modo alumno (solo lectura)

let datosEscuela = {
    materias: [], // Array de objetos: { id: docId, nombre: 'Español' }
    alumnos: [],  // Array de objetos: { id: docId, nombre: '...', notas: { ... } }
    horarios: []  // Array de objetos: { id: docId, hora: '...', lunes: '...', ... }
};

function tieneFirestore() {
    return Boolean(
        window.db &&
        window.collection &&
        window.getDocs &&
        window.addDoc &&
        window.updateDoc &&
        window.deleteDoc &&
        window.doc
    );
}

// --- CARGA DESDE FIREBASE ---
async function cargarDatosDesdeFirebase() {
    if (!tieneFirestore()) return;

    try {
        // 1. Cargar Materias
        const snapshotMaterias = await window.getDocs(window.collection(window.db, "materias"));
        datosEscuela.materias = snapshotMaterias.docs.map(d => ({
            id: d.id,
            nombre: d.data().nombre || ""
        })).filter(m => m.nombre);

        // Si está vacía por primera vez, crea las materias base en Firestore
        if (datosEscuela.materias.length === 0) {
            const iniciales = ['Español', 'Matemáticas', 'Ciencias', 'Historia'];
            for (const nombreMat of iniciales) {
                const ref = await window.addDoc(window.collection(window.db, "materias"), { nombre: nombreMat });
                datosEscuela.materias.push({ id: ref.id, nombre: nombreMat });
            }
        }

        // 2. Cargar Alumnos
        const snapshotAlumnos = await window.getDocs(window.collection(window.db, "alumnos"));
        datosEscuela.alumnos = snapshotAlumnos.docs.map(d => ({
            id: d.id,
            nombre: d.data().nombre || "",
            notas: d.data().notas || {}
        }));

        // 3. Cargar Horarios
        const snapshotHorarios = await window.getDocs(window.collection(window.db, "horarios"));
        datosEscuela.horarios = snapshotHorarios.docs.map(d => ({
            id: d.id,
            hora: d.data().hora || "00:00 - 00:00",
            lunes: d.data().lunes || "-",
            martes: d.data().martes || "-",
            miercoles: d.data().miercoles || "-",
            jueves: d.data().jueves || "-",
            viernes: d.data().viernes || "-"
        }));

        renderizarTodo();
    } catch (error) {
        console.error("Error al cargar datos de Firebase:", error);
    }
}

// --- SEGURIDAD Y MODO PROFESOR ---
function aplicarEstadoRol() {
    const roleSelect = document.getElementById('roleSelect');
    const elementosMaestro = document.querySelectorAll('.maestro-only');

    if (esProfesor && rolActual === 'maestro') {
        document.body.classList.remove('modo-alumno');
        if (roleSelect) roleSelect.value = 'maestro';
        elementosMaestro.forEach(el => {
            if (el.tagName === 'TH') {
                el.style.display = 'table-cell';
            } else if (el.classList.contains('teacher-controls')) {
                el.style.display = 'flex';
            } else {
                el.style.display = 'inline-block';
            }
        });
    } else {
        rolActual = 'alumno';
        document.body.classList.add('modo-alumno');
        if (roleSelect) roleSelect.value = 'alumno';
        elementosMaestro.forEach(el => {
            el.style.display = 'none';
        });
    }
}

function activarModoProfesor() {
    const password = prompt("Introduce la contraseña de maestro:");
    if (password === "ProfeYasir2026") {
        esProfesor = true;
        rolActual = 'maestro';
        aplicarEstadoRol();
        renderizarTodo();
        alert("¡Modo profesor activado! Los cambios ahora se guardan en Firebase.");
    } else if (password !== null) {
        alert("Contraseña incorrecta.");
    }
}

function verificarPermisoEdicion() {
    if (!esProfesor || rolActual !== 'maestro') {
        alert("Acceso denegado. Solo el profesor con contraseña puede editar.");
        return false;
    }
    if (!tieneFirestore()) {
        alert("Firebase aún no está listo. Espera un momento e inténtalo de nuevo.");
        return false;
    }
    return true;
}

// --- CAMBIO DE ROL (MAESTRO / ALUMNO) ---
const roleSelect = document.getElementById('roleSelect');
roleSelect.addEventListener('change', (e) => {
    if (e.target.value === 'maestro') {
        if (!esProfesor) {
            e.target.value = 'alumno';
            activarModoProfesor();
            return;
        }
        rolActual = 'maestro';
    } else {
        rolActual = 'alumno';
    }
    aplicarEstadoRol();
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

// --- GESTIÓN DE ALUMNOS Y MATERIAS EN FIRESTORE ---
document.getElementById('btnAgregarAlumno').addEventListener('click', async () => {
    if (!verificarPermisoEdicion()) return;

    const input = document.getElementById('nuevoAlumnoInput');
    const nombre = input.value.trim();
    if (!nombre) return;

    const notasIniciales = {};
    datosEscuela.materias.forEach(mat => {
        notasIniciales[mat.nombre] = 0;
    });

    try {
        const docRef = await window.addDoc(window.collection(window.db, "alumnos"), {
            nombre,
            notas: notasIniciales
        });

        datosEscuela.alumnos.push({
            id: docRef.id,
            nombre,
            notas: notasIniciales
        });

        input.value = '';
        renderizarTablaNotas();
    } catch (error) {
        console.error("Error al agregar alumno:", error);
        alert("No se pudo guardar el alumno en Firebase.");
    }
});

document.getElementById('btnAgregarMateria').addEventListener('click', async () => {
    if (!verificarPermisoEdicion()) return;

    const input = document.getElementById('nuevaMateriaInput');
    const nombreMateria = input.value.trim();
    if (!nombreMateria) return;

    const yaExiste = datosEscuela.materias.some(m => m.nombre.toLowerCase() === nombreMateria.toLowerCase());
    if (yaExiste) {
        alert("Esa materia ya existe.");
        return;
    }

    try {
        const matRef = await window.addDoc(window.collection(window.db, "materias"), {
            nombre: nombreMateria
        });

        datosEscuela.materias.push({ id: matRef.id, nombre: nombreMateria });

        // Inicializar nota 0 en cada alumno dentro de Firestore
        for (const alumno of datosEscuela.alumnos) {
            alumno.notas[nombreMateria] = 0;
            await window.updateDoc(window.doc(window.db, "alumnos", alumno.id), {
                notas: alumno.notas
            });
        }

        input.value = '';
        renderizarTablaNotas();
    } catch (error) {
        console.error("Error al agregar materia:", error);
        alert("No se pudo guardar la materia en Firebase.");
    }
});

async function editarMateria(index) {
    if (!verificarPermisoEdicion()) return;

    const materiaObj = datosEscuela.materias[index];
    if (!materiaObj) return;

    const nombreViejo = materiaObj.nombre;
    const nombreNuevoInput = prompt('Nuevo nombre para la materia:', nombreViejo);
    if (!nombreNuevoInput) return;

    const nombreNuevo = nombreNuevoInput.trim();
    if (!nombreNuevo || nombreNuevo === nombreViejo) return;

    try {
        await window.updateDoc(window.doc(window.db, "materias", materiaObj.id), {
            nombre: nombreNuevo
        });
        materiaObj.nombre = nombreNuevo;

        for (const alumno of datosEscuela.alumnos) {
            const notaAnterior = alumno.notas[nombreViejo] ?? 0;
            alumno.notas[nombreNuevo] = notaAnterior;
            delete alumno.notas[nombreViejo];

            await window.updateDoc(window.doc(window.db, "alumnos", alumno.id), {
                notas: alumno.notas
            });
        }

        renderizarTablaNotas();
    } catch (error) {
        console.error("Error al editar materia:", error);
        alert("No se pudo actualizar la materia en Firebase.");
    }
}

async function eliminarMateria(index) {
    if (!verificarPermisoEdicion()) return;

    const materiaObj = datosEscuela.materias[index];
    if (!materiaObj) return;

    if (!confirm(`¿Seguro que deseas eliminar la materia "${materiaObj.nombre}"?`)) return;

    try {
        await window.deleteDoc(window.doc(window.db, "materias", materiaObj.id));
        const nombreEliminado = materiaObj.nombre;
        datosEscuela.materias.splice(index, 1);

        for (const alumno of datosEscuela.alumnos) {
            if (nombreEliminado in alumno.notas) {
                delete alumno.notas[nombreEliminado];
                await window.updateDoc(window.doc(window.db, "alumnos", alumno.id), {
                    notas: alumno.notas
                });
            }
        }

        renderizarTablaNotas();
    } catch (error) {
        console.error("Error al eliminar materia:", error);
        alert("No se pudo eliminar la materia en Firebase.");
    }
}

async function editarAlumno(idDoc) {
    if (!verificarPermisoEdicion()) return;

    const alumno = datosEscuela.alumnos.find(a => a.id === idDoc);
    if (!alumno) return;

    const nuevoNombreInput = prompt('Editar nombre del alumno:', alumno.nombre);
    if (!nuevoNombreInput) return;

    const nuevoNombre = nuevoNombreInput.trim();
    if (!nuevoNombre || nuevoNombre === alumno.nombre) return;

    try {
        await window.updateDoc(window.doc(window.db, "alumnos", alumno.id), {
            nombre: nuevoNombre
        });
        alumno.nombre = nuevoNombre;
        renderizarTablaNotas();
    } catch (error) {
        console.error("Error al editar alumno:", error);
        alert("No se pudo actualizar el alumno en Firebase.");
    }
}

async function eliminarAlumno(idDoc) {
    if (!verificarPermisoEdicion()) return;

    if (!confirm('¿Eliminar a este alumno de la lista?')) return;

    try {
        await window.deleteDoc(window.doc(window.db, "alumnos", idDoc));
        datosEscuela.alumnos = datosEscuela.alumnos.filter(a => a.id !== idDoc);
        renderizarTablaNotas();
    } catch (error) {
        console.error("Error al eliminar alumno:", error);
        alert("No se pudo eliminar el alumno en Firebase.");
    }
}

async function actualizarNota(idDoc, nombreMateria, valor) {
    if (!verificarPermisoEdicion()) {
        renderizarTablaNotas();
        return;
    }

    const alumno = datosEscuela.alumnos.find(a => a.id === idDoc);
    if (!alumno) return;

    let num = parseFloat(valor);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 100) num = 100;

    alumno.notas[nombreMateria] = num;

    try {
        await window.updateDoc(window.doc(window.db, "alumnos", alumno.id), {
            notas: alumno.notas
        });
        renderizarTablaNotas();
    } catch (error) {
        console.error("Error al guardar nota:", error);
        alert("No se pudo guardar la nota en Firebase.");
    }
}

function renderizarTablaNotas() {
    const thead = document.getElementById('tablaHead');
    const tbody = document.getElementById('tablaBody');
    const esMaestro = esProfesor && rolActual === 'maestro';

    let headHTML = `<tr><th>Alumno</th>`;
    datosEscuela.materias.forEach((matObj, index) => {
        headHTML += `
            <th>
                ${matObj.nombre}
                ${esMaestro ? `
                    <button type="button" class="btn-edit" onclick="editarMateria(${index})" title="Renombrar">✏️</button>
                    <button type="button" class="btn-danger" onclick="eliminarMateria(${index})" title="Borrar">×</button>
                ` : ''}
            </th>`;
    });
    headHTML += `<th>Promedio</th>`;
    if (esMaestro) headHTML += `<th>Acciones</th>`;
    headHTML += `</tr>`;
    thead.innerHTML = headHTML;

    tbody.innerHTML = '';
    datosEscuela.alumnos.forEach(alumno => {
        let suma = 0;
        let rowHTML = `<tr>
            <td>
                <strong>${alumno.nombre}</strong>
                ${esMaestro ? `<button type="button" class="btn-edit" onclick="editarAlumno('${alumno.id}')">✏️</button>` : ''}
            </td>`;

        datosEscuela.materias.forEach(matObj => {
            const nota = alumno.notas[matObj.nombre] ?? 0;
            suma += Number(nota);
            rowHTML += `
                <td>
                    <input type="number" class="nota-input" min="0" max="100"
                        value="${nota}"
                        ${!esMaestro ? 'disabled' : ''}
                        onchange="actualizarNota('${alumno.id}', '${matObj.nombre}', this.value)">
                </td>`;
        });

        const promedio = datosEscuela.materias.length > 0
            ? (suma / datosEscuela.materias.length).toFixed(1)
            : '0.0';

        rowHTML += `<td><span class="promedio-badge">${promedio}</span></td>`;

        if (esMaestro) {
            rowHTML += `<td><button type="button" class="btn-danger" onclick="eliminarAlumno('${alumno.id}')">Eliminar</button></td>`;
        }
        rowHTML += `</tr>`;
        tbody.innerHTML += rowHTML;
    });
}

// --- GESTIÓN DE HORARIOS EN FIRESTORE ---
document.getElementById('btnAgregarHorario').addEventListener('click', async () => {
    if (!verificarPermisoEdicion()) return;

    const nuevoBloque = {
        hora: '00:00 - 00:00',
        lunes: '-',
        martes: '-',
        miercoles: '-',
        jueves: '-',
        viernes: '-'
    };

    try {
        const docRef = await window.addDoc(window.collection(window.db, "horarios"), nuevoBloque);
        datosEscuela.horarios.push({ id: docRef.id, ...nuevoBloque });
        renderizarHorarios();
    } catch (error) {
        console.error("Error al agregar horario:", error);
        alert("No se pudo guardar el bloque de horario en Firebase.");
    }
});

async function actualizarHorario(index, campo, valor) {
    if (!verificarPermisoEdicion()) {
        renderizarHorarios();
        return;
    }

    const fila = datosEscuela.horarios[index];
    if (!fila) return;

    fila[campo] = valor;

    try {
        await window.updateDoc(window.doc(window.db, "horarios", fila.id), {
            [campo]: valor
        });
    } catch (error) {
        console.error("Error al actualizar horario:", error);
        alert("No se pudo guardar el cambio de horario en Firebase.");
    }
}

async function eliminarHorario(index) {
    if (!verificarPermisoEdicion()) return;

    const fila = datosEscuela.horarios[index];
    if (!fila) return;

    if (!confirm('¿Eliminar esta fila del horario?')) return;

    try {
        await window.deleteDoc(window.doc(window.db, "horarios", fila.id));
        datosEscuela.horarios.splice(index, 1);
        renderizarHorarios();
    } catch (error) {
        console.error("Error al eliminar horario:", error);
        alert("No se pudo eliminar el bloque de horario en Firebase.");
    }
}

function renderizarHorarios() {
    const tbody = document.getElementById('horariosBody');
    const esMaestro = esProfesor && rolActual === 'maestro';
    const dias = ['hora', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

    tbody.innerHTML = '';
    datosEscuela.horarios.forEach((fila, index) => {
        let tr = `<tr>`;
        dias.forEach(dia => {
            tr += `
                <td>
                    <input type="text" class="horario-input"
                        value="${fila[dia] ?? ''}"
                        ${!esMaestro ? 'disabled' : ''}
                        onchange="actualizarHorario(${index}, '${dia}', this.value)">
                </td>`;
        });

        if (esMaestro) {
            tr += `<td><button type="button" class="btn-danger" onclick="eliminarHorario(${index})">Borrar</button></td>`;
        }
        tr += `</tr>`;
        tbody.innerHTML += tr;
    });
}

function renderizarTodo() {
    aplicarEstadoRol();
    renderizarTablaNotas();
    renderizarHorarios();
}

window.addEventListener("firebaseReady", () => {
    cargarDatosDesdeFirebase();
});

// Por si firebaseReady ya se disparó antes de que terminara de cargarse script.js
if (tieneFirestore()) {
    cargarDatosDesdeFirebase();
}

renderizarTodo();