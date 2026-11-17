// ==========================================================
// LÓGICA INTERACTIVA CONECTADA A SQLITE - ETIA_interactiva
// ==========================================================

let usuarioActivo = null;
let moduloSeleccionado = 1;

const datosModulos = {
  1: {
    titulo: "1. Tips y Buenas Prácticas",
    icono: "💡",
    claseColor: "cat-blue",
    contenido: "Para obtener respuestas útiles de la IA Generativa asigna siempre un Rol, una Tarea clara y un Formato de salida. Nunca ingreses contraseñas, datos bancarios o información personal confidencial en chats públicos."
  },
  2: {
    titulo: "2. Reglas y Ética en IAG",
    icono: "⚖️",
    claseColor: "cat-green",
    contenido: "El uso ético exige transparencia: declara cuando utilices IA como apoyo académico o laboral, respeta los derechos de autor y valida la veracidad de los textos antes de publicarlos como propios."
  },
  3: {
    titulo: "3. Apuntes y Prompts",
    icono: "📚",
    claseColor: "cat-orange",
    contenido: "En la sección de Recursos puedes copiar nuestra plantilla maestra Rol-Tarea-Formato y descargar el Manual de Ética en PDF para tener tus apuntes listos en cualquier proyecto."
  },
  4: {
    titulo: "4. Examen Final y Certificación",
    icono: "🎓",
    claseColor: "cat-pink",
    contenido: "Dirígete a la sección de Recursos para presentar el Test Integrador. Necesitas obtener una calificación mínima de 85/100 y completar los 4 módulos para desbloquear tu Diploma Oficial."
  }
};

// ==========================================================
// 1. AUTENTICACIÓN REAL CON BASE DE DATOS SQLITE (RF-01)
// ==========================================================
function alternarAuth(vista) {
  if (vista === "registro") {
    document.getElementById("form-login").classList.add("oculto");
    document.getElementById("form-registro").classList.remove("oculto");
  } else {
    document.getElementById("form-registro").classList.add("oculto");
    document.getElementById("form-login").classList.remove("oculto");
  }
}

async function registrarUsuario(e) {
  e.preventDefault();
  const nombre = document.getElementById("reg-nombre").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-pass").value;

  const respuesta = await fetch("/api/registro", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre, email, password })
  });
  const data = await respuesta.json();

  if (data.ok) {
    usuarioActivo = data.usuario;
    entrarAPlataforma();
  } else {
    mostrarAvisoSimple("Error de Registro", data.mensaje);
  }
}

async function iniciarSesion(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-pass").value;

  const respuesta = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const data = await respuesta.json();

  if (data.ok) {
    usuarioActivo = data.usuario;
    entrarAPlataforma();
  } else {
    mostrarAvisoSimple("Acceso Denegado", data.mensaje);
  }
}

function entrarAPlataforma() {
  document.getElementById("vista-auth").classList.add("oculto");
  document.getElementById("vista-plataforma").classList.remove("oculto");
  document.getElementById("nombre-usuario-header").innerText = usuarioActivo.nombre;
  actualizarProgresoUI();
}

function abrirModalCerrarSesion() {
  document.getElementById("modal-gen-badge").innerText = "Cuenta de Usuario";
  document.getElementById("modal-gen-titulo").innerText = "¿Deseas cerrar tu sesión?";
  document.getElementById("modal-gen-contenido").innerHTML = `<p>Sesión activa de <strong>${usuarioActivo.nombre}</strong> (${usuarioActivo.email}). Tu progreso está guardado en SQLite.</p>`;
  document.getElementById("modal-gen-botones").innerHTML = `
    <button class="btn-secondary" onclick="cerrarModal('modal-general')">Cancelar</button>
    <button class="btn-action" onclick="confirmarCerrarSesion()">🚪 Cerrar Sesión</button>
  `;
  document.getElementById("modal-general").classList.remove("oculto");
}

function confirmarCerrarSesion() {
  cerrarModal("modal-general");
  usuarioActivo = null;
  document.getElementById("vista-plataforma").classList.add("oculto");
  document.getElementById("vista-auth").classList.remove("oculto");
}

// ==========================================================
// 2. ACTUALIZACIÓN DE PROGRESO EN UI Y SQLITE (RF-07)
// ==========================================================
function calcularPorcentaje() {
  if (!usuarioActivo) return 0;
  return usuarioActivo.modulosCompletados.length * 25;
}

function actualizarProgresoUI() {
  const porcentaje = calcularPorcentaje();
  const cantidad = usuarioActivo.modulosCompletados.length;

  document.getElementById("barra-progreso").style.width = porcentaje + "%";
  document.getElementById("texto-progreso").innerText = `Avance actual: ${porcentaje}% (${cantidad} de 4 módulos aprobados)`;

  const btnCert = document.getElementById("btn-certificado");
  const txtCert = document.getElementById("estado-certificado-texto");

  if (porcentaje >= 100 && usuarioActivo.examenAprobado) {
    btnCert.className = "btn-cert-unlocked";
    btnCert.innerText = "🏆 Descargar Certificado Oficial";
    txtCert.innerText = `¡Felicidades ${usuarioActivo.nombre}! Has acreditado los 4 módulos y aprobado la evaluación final.`;
  } else {
    btnCert.className = "btn-cert-locked";
    btnCert.innerText = `🔒 Certificado Bloqueado (${porcentaje}%)`;
    txtCert.innerText = "Completa los 4 módulos de aprendizaje y aprueba la evaluación final con mínimo 85/100 para desbloquear tu diploma.";
  }
}

async function sincronizarConSQLite(idModulo, calificacion) {
  const porcentaje = calcularPorcentaje();
  await fetch("/api/progreso", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id_usuario: usuarioActivo.id_usuario,
      id_modulo: idModulo,
      calificacion: calificacion,
      progreso_general: porcentaje
    })
  });
}

// ==========================================================
// 3. MODALES DE MÓDULOS
// ==========================================================
function abrirModalModulo(num) {
  moduloSeleccionado = num;
  const info = datosModulos[num];
  const card = document.getElementById("modal-modulo-card");

  card.className = "modal-card " + info.claseColor;
  document.getElementById("modal-mod-icon").innerText = info.icono;
  document.getElementById("modal-mod-titulo").innerText = info.titulo;
  document.getElementById("modal-mod-cuerpo").innerText = info.contenido;

  const btnCompletar = document.getElementById("btn-completar-mod");
  if (num === 4) {
    btnCompletar.innerText = "📝 Ir al Examen en Recursos";
  } else if (usuarioActivo.modulosCompletados.includes(num)) {
    btnCompletar.innerText = "✅ Módulo Ya Completado";
  } else {
    btnCompletar.innerText = "✅ Marcar Módulo como Completado (+25%)";
  }

  document.getElementById("modal-modulo").classList.remove("oculto");
}

async function completarModuloActual() {
  if (moduloSeleccionado === 4) {
    cerrarModal("modal-modulo");
    document.getElementById("seccion-recursos").scrollIntoView({ behavior: "smooth" });
    return;
  }

  if (!usuarioActivo.modulosCompletados.includes(moduloSeleccionado)) {
    usuarioActivo.modulosCompletados.push(moduloSeleccionado);
    actualizarProgresoUI();
    await sincronizarConSQLite(moduloSeleccionado, 100);
  }
  cerrarModal("modal-modulo");
}

// ==========================================================
// 4. MODALES DE RECURSOS Y CERTIFICACIÓN
// ==========================================================
function abrirModalPrompt() {
  document.getElementById("aviso-copiado").classList.add("oculto");
  document.getElementById("modal-prompt").classList.remove("oculto");
}

function ejecutarCopiadoPrompt() {
  const texto = document.getElementById("texto-prompt-copiar").innerText;
  navigator.clipboard.writeText(texto).then(() => {
    document.getElementById("aviso-copiado").classList.remove("oculto");
  });
}

function abrirModalPDF() {
  document.getElementById("modal-gen-badge").innerText = "Guía de Estudio PDF (RF-05)";
  document.getElementById("modal-gen-titulo").innerText = "Manual de Ética y Normatividad en IA";
  document.getElementById("modal-gen-contenido").innerHTML = `
    <p>El documento <strong>Manual_Etica_IAG_ETIA.pdf</strong> contiene:</p>
    <p>• Reglas de citación académica.<br>• Protección de privacidad y datos sensibles.<br>• Checklist para detectar alucinaciones.</p>
  `;
  document.getElementById("modal-gen-botones").innerHTML = `
    <button class="btn-secondary" onclick="cerrarModal('modal-general')">Cerrar</button>
    <button class="btn-action" onclick="cerrarModal('modal-general')">✅ Descarga Lista</button>
  `;
  document.getElementById("modal-general").classList.remove("oculto");
}

function abrirModalExamen() {
  document.getElementById("resultado-examen-box").classList.add("oculto");
  document.getElementById("modal-examen").classList.remove("oculto");
}

async function calificarExamen(e) {
  e.preventDefault();
  const p1 = parseInt(document.querySelector('input[name="p1"]:checked').value);
  const p2 = parseInt(document.querySelector('input[name="p2"]:checked').value);
  const total = p1 + p2;

  const resBox = document.getElementById("resultado-examen-box");
  resBox.classList.remove("oculto");

  if (total >= 85) {
    resBox.style.backgroundColor = "#dcfce7";
    resBox.style.color = "#166534";
    resBox.innerText = `🎉 ¡Aprobado con ${total}/100! Guardado en SQLite.`;

    usuarioActivo.examenAprobado = true;
    if (!usuarioActivo.modulosCompletados.includes(4)) {
      usuarioActivo.modulosCompletados.push(4);
    }
    actualizarProgresoUI();
    await sincronizarConSQLite(4, total);
  } else {
    resBox.style.backgroundColor = "#fee2e2";
    resBox.style.color = "#991b1b";
    resBox.innerText = `⚠️ Calificación: ${total}/100. Necesitas mínimo 85/100 para aprobar.`;
  }
}

function abrirModalCertificado() {
  const porcentaje = calcularPorcentaje();
  if (porcentaje >= 100 && usuarioActivo.examenAprobado) {
    const folio = `ETIA-2026-UACM-${String(usuarioActivo.id_usuario).padStart(3, "0")}`;
    document.getElementById("modal-gen-badge").innerText = "Diploma Oficial (RF-08)";
    document.getElementById("modal-gen-titulo").innerText = "Certificado de Acreditación";
    document.getElementById("modal-gen-contenido").innerHTML = `
      <div style="border: 2px solid #eab308; background: #fefce8; padding: 18px; border-radius: 10px; text-align: center; margin-bottom: 12px;">
        <p style="font-size: 0.8rem; color: #854d0e; margin-bottom: 4px;">UNIVERSIDAD AUTÓNOMA DE LA CIUDAD DE MÉXICO</p>
        <h4 style="color: #713f12; font-size: 1.1rem; margin-bottom: 6px;">${usuarioActivo.nombre}</h4>
        <p style="font-size: 0.85rem; color: #854d0e; margin-bottom: 4px;">Acreditó satisfactoriamente los 4 módulos de <strong>ETIA_interactiva</strong> con promedio aprobatorio.</p>
        <small style="color: #a16207;">Folio Registrado en BD: ${folio}</small>
      </div>
    `;
    document.getElementById("modal-gen-botones").innerHTML = `
      <button class="btn-secondary" onclick="cerrarModal('modal-general')">Cerrar</button>
      <button class="btn-action" onclick="window.print()">🖨️ Imprimir / Guardar PDF</button>
    `;
  } else {
    document.getElementById("modal-gen-badge").innerText = "Certificado Bloqueado";
    document.getElementById("modal-gen-titulo").innerText = "Aún no cumples los requisitos";
    document.getElementById("modal-gen-contenido").innerHTML = `
      <p>Tu avance actual es del <strong>${porcentaje}%</strong>. Para obtener tu certificado debes:</p>
      <p>1. Completar los 4 módulos de aprendizaje (100%).<br>2. Aprobar el Test Integrador con calificación mínima de 85/100.</p>
    `;
    document.getElementById("modal-gen-botones").innerHTML = `
      <button class="btn-action" onclick="cerrarModal('modal-general')">Entendido</button>
    `;
  }
  document.getElementById("modal-general").classList.remove("oculto");
}

function mostrarAvisoSimple(titulo, mensaje) {
  document.getElementById("modal-gen-badge").innerText = "Aviso del Sistema";
  document.getElementById("modal-gen-titulo").innerText = titulo;
  document.getElementById("modal-gen-contenido").innerHTML = `<p>${mensaje}</p>`;
  document.getElementById("modal-gen-botones").innerHTML = `<button class="btn-action" onclick="cerrarModal('modal-general')">Entendido</button>`;
  document.getElementById("modal-general").classList.remove("oculto");
}

function cerrarModal(idModal) {
  document.getElementById(idModal).classList.add("oculto");
}