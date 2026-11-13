// Inventario de la tienda — todo se guarda en el navegador (localStorage).
const CLAVE = 'inventario-tienda-v1';
const $ = (s) => document.querySelector(s);

let datos = cargar();
let editandoId = null;
let surtiendoId = null;

function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE));
    if (d && Array.isArray(d.productos)) return normalizar(d);
  } catch (e) { /* datos dañados o sin acceso: empezar vacío */ }
  return normalizar({ productos: [] });
}
// dias: { 'AAAA-MM-DD': { ventas: número | null, salidas: [{ id, tipo, concepto, valor }] } }
function normalizar(d) { return { diasAviso: 7, dias: {}, ...d, productos: d.productos }; }
function guardar() {
  try { localStorage.setItem(CLAVE, JSON.stringify(datos)); }
  catch (e) { aviso('No se pudo guardar. Descargue una copia de seguridad.'); }
}

// ---------- utilidades ----------
const fmt = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
const plata = (n) => fmt.format(Math.round(n || 0));
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const id = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function hoyISO() { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); }
function diasHasta(fecha) {
  if (!fecha) return null;
  const [y, m, d] = fecha.split('-').map(Number);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  return Math.round((new Date(y, m - 1, d) - hoy) / 86400000);
}
function fechaBonita(f) {
  if (!f) return '';
  const [y, m, d] = f.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
function aviso(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(aviso.t); aviso.t = setTimeout(() => t.classList.remove('show'), 2500);
}
function estadoVence(p) {
  const d = diasHasta(p.vence);
  if (d === null) return null;
  if (d < 0) return { clase: 'rojo', texto: `Vencido hace ${-d} día${d === -1 ? '' : 's'}`, d };
  if (d === 0) return { clase: 'rojo', texto: 'Vence hoy', d };
  if (d <= datos.diasAviso) return { clase: 'amarillo', texto: `Vence en ${d} día${d === 1 ? '' : 's'}`, d };
  return { clase: 'verde', texto: fechaBonita(p.vence), d };
}
// "pendiente" = producto del catálogo que todavía no se ha contado (no genera alertas)
const pocoStock = (p) => !p.pendiente && Number(p.cantidad) <= Number(p.minimo || 0);
const porVencer = (p) => { const e = estadoVence(p); return e && e.clase !== 'verde'; };
const pendientes = () => datos.productos.filter((p) => p.pendiente);

// ---------- pestañas ----------
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('active', x === b));
  document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('active', p.id === b.dataset.tab));
  render();
}));

// ---------- render ----------
function render() {
  renderResumen();
  renderProductos();
  renderCuentas();
  $('#diasAviso').value = datos.diasAviso;
  $('#diasAvisoTxt').textContent = datos.diasAviso;
}

// ---------- cuentas ----------
const dia = (f) => datos.dias[f] || { ventas: null, salidas: [] };
const salidasDe = (f) => dia(f).salidas.reduce((t, x) => t + x.valor, 0);
function resumenMes(mes) { // mes = 'AAAA-MM'
  const fechas = Object.keys(datos.dias).filter((f) => f.startsWith(mes)).sort();
  let ventas = 0, salidas = 0, diasConVenta = 0; const porTipo = {};
  fechas.forEach((f) => {
    const d = dia(f);
    if (d.ventas != null) { ventas += d.ventas; diasConVenta++; }
    d.salidas.forEach((x) => { salidas += x.valor; porTipo[x.tipo] = (porTipo[x.tipo] || 0) + x.valor; });
  });
  return { fechas, ventas, salidas, diasConVenta, porTipo };
}

function renderResumen() {
  const np = pendientes().length;
  $('#avisoContar').hidden = !np;
  $('#numContar').textContent = np;
  const hoy = dia(hoyISO());
  $('#avisoCierre').hidden = hoy.ventas != null || new Date().getHours() < 17;
  $('#kpiVentasHoy').textContent = hoy.ventas == null ? 'Sin anotar' : plata(hoy.ventas);
  $('#kpiVentasMes').textContent = plata(resumenMes(hoyISO().slice(0, 7)).ventas);
  let costo = 0, venta = 0;
  datos.productos.forEach((p) => { costo += p.costo * p.cantidad; venta += p.precio * p.cantidad; });
  $('#kpiValorCosto').textContent = plata(costo);
  $('#kpiGananciaPot').textContent = plata(venta - costo);

  const vence = datos.productos.filter(porVencer).sort((a, b) => diasHasta(a.vence) - diasHasta(b.vence));
  $('#listaVence').innerHTML = vence.length
    ? vence.map((p) => { const e = estadoVence(p); return `<li class="${e.clase}"><span><b>${esc(p.nombre)}</b> (${p.cantidad})</span><span>${e.texto}</span></li>`; }).join('')
    : '<li class="vacio">Nada por vencer. ¡Bien! 👍</li>';

  const poco = datos.productos.filter(pocoStock).sort((a, b) => a.cantidad - b.cantidad);
  $('#listaPoco').innerHTML = poco.length
    ? poco.map((p) => `<li class="${p.cantidad <= 0 ? 'rojo' : 'amarillo'}"><span><b>${esc(p.nombre)}</b></span><span>${p.cantidad <= 0 ? 'Agotado' : `Quedan ${p.cantidad}`}</span></li>`).join('')
    : '<li class="vacio">Todo tiene suficiente cantidad.</li>';
}

function renderProductos() {
  const cats = [...new Set(datos.productos.map((p) => p.categoria).filter(Boolean))].sort();
  const sel = $('#filtroCategoria'); const actual = sel.value;
  sel.innerHTML = '<option value="">Todas las categorías</option>' + cats.map((c) => `<option>${esc(c)}</option>`).join('');
  sel.value = cats.includes(actual) ? actual : '';
  $('#listaCategorias').innerHTML = cats.map((c) => `<option value="${esc(c)}">`).join('');

  const q = $('#buscar').value.trim().toLowerCase();
  const est = $('#filtroEstado').value;
  const lista = datos.productos
    .filter((p) => !q || p.nombre.toLowerCase().includes(q))
    .filter((p) => !sel.value || p.categoria === sel.value)
    .filter((p) => !est || (est === 'vence' ? porVencer(p) : est === 'contar' ? p.pendiente : pocoStock(p)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  $('#tablaProductos').innerHTML = lista.map((p) => {
    const e = estadoVence(p);
    // La cantidad se puede corregir ahí mismo cada vez que ella revise el estante
    const clase = p.pendiente ? 'contar pendiente' : pocoStock(p) ? `contar ${p.cantidad <= 0 ? 'rojo' : 'amarillo'}` : 'contar';
    const cant = `<input class="${clase}" type="number" min="0" step="any" inputmode="decimal" placeholder="¿Cuántos?"
      value="${p.pendiente ? '' : p.cantidad}" data-contar="${p.id}" aria-label="Cantidad de ${esc(p.nombre)}">`;
    return `<tr>
      <td class="nombre"><b>${esc(p.nombre)}</b> <small class="cat-movil">${esc(p.categoria)}</small></td>
      <td class="col-cat">${esc(p.categoria)}</td>
      <td class="num" data-label="Cantidad">${cant}</td>
      <td class="num" data-label="Costo">${plata(p.costo)}</td>
      <td class="num" data-label="Precio venta">${plata(p.precio)}</td>
      <td data-label="Vence">${e ? `<span class="tag ${e.clase}">${e.texto}</span>` : '<span class="hint">No vence</span>'}</td>
      <td class="acc">
        <button class="btn peq" data-surtir="${p.id}" title="Llegó mercancía">+ Llegó</button>
        <button class="btn peq" data-editar="${p.id}">Editar</button>
        <button class="btn peq peligro" data-borrar="${p.id}">Borrar</button>
      </td></tr>`;
  }).join('');
  $('#sinProductos').style.display = datos.productos.length ? 'none' : 'block';
  if (datos.productos.length && !lista.length) {
    $('#sinProductos').textContent = 'Ningún producto coincide con la búsqueda.'; $('#sinProductos').style.display = 'block';
  } else $('#sinProductos').textContent = 'Todavía no hay productos. Toque “+ Nuevo producto” para empezar.';
}

function renderCuentas() {
  const f = $('#cierreFecha').value || hoyISO();
  const d = dia(f);
  if (document.activeElement !== $('#cierreVentas')) $('#cierreVentas').value = d.ventas ?? '';
  $('#listaSalidas').innerHTML = d.salidas.length ? d.salidas.map((x) => `<li><span><b>${plata(x.valor)}</b> · ${esc(x.tipo)}</span>
    <button class="btn peq peligro" data-quitar-salida="${x.id}">✕</button>${x.concepto ? `<small>${esc(x.concepto)}</small>` : ''}</li>`).join('')
    : '<li class="vacio">No se ha sacado nada este día.</li>';
  const sal = salidasDe(f);
  $('#diaVentas').textContent = d.ventas == null ? 'Sin anotar' : plata(d.ventas);
  $('#diaSalidas').textContent = plata(sal);
  $('#diaQueda').textContent = plata((d.ventas || 0) - sal);

  const mes = $('#mesResumen').value || hoyISO().slice(0, 7);
  const r = resumenMes(mes);
  $('#mesVentas').textContent = plata(r.ventas);
  $('#mesSalidas').textContent = plata(r.salidas);
  $('#mesQueda').textContent = plata(r.ventas - r.salidas);
  $('#mesPromedio').textContent = r.diasConVenta
    ? `En promedio vende ${plata(r.ventas / r.diasConVenta)} al día (${r.diasConVenta} día${r.diasConVenta === 1 ? '' : 's'} anotado${r.diasConVenta === 1 ? '' : 's'}).`
    : 'Todavía no hay días anotados en este mes.';
  const tipos = Object.entries(r.porTipo).sort((a, b) => b[1] - a[1]);
  $('#mesGastosTipo').innerHTML = tipos.length ? '<b>¿En qué se fue la plata?</b>' + tipos.map(([t, v]) =>
    `<div class="barra"><span>${esc(t)}</span><span>${plata(v)}</span><i style="width:${Math.round((v / r.salidas) * 100)}%"></i></div>`).join('') : '';
  $('#tablaDias').innerHTML = r.fechas.slice().reverse().map((fe) => {
    const dd = dia(fe), sa = salidasDe(fe);
    const [y, m, dn] = fe.split('-').map(Number);
    const corta = new Date(y, m - 1, dn).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });
    return `<tr data-ir-dia="${fe}"><td>${corta}</td><td class="num">${dd.ventas == null ? '—' : plata(dd.ventas)}</td>
      <td class="num">${plata(sa)}</td><td class="num">${plata((dd.ventas || 0) - sa)}</td></tr>`;
  }).join('') || '<tr><td colspan="4" class="vacio">Sin datos.</td></tr>';
}

// ---------- productos ----------
$('#btnNuevo').addEventListener('click', () => abrirProducto(null));
$('#btnCancelar').addEventListener('click', () => $('#dlgProducto').close());
$('#buscar').addEventListener('input', renderProductos);
$('#filtroCategoria').addEventListener('change', renderProductos);
$('#filtroEstado').addEventListener('change', renderProductos);

function abrirProducto(pid) {
  editandoId = pid;
  const f = $('#formProducto'); f.reset();
  const p = datos.productos.find((x) => x.id === pid);
  $('#tituloDlg').textContent = p ? 'Editar producto' : 'Nuevo producto';
  if (p) ['nombre', 'categoria', 'cantidad', 'minimo', 'costo', 'precio', 'vence'].forEach((k) => { f.elements[k].value = p[k] ?? ''; });
  $('#dlgProducto').showModal();
}

$('#formProducto').addEventListener('submit', (ev) => {
  const f = ev.target.elements;
  const p = {
    nombre: f.nombre.value.trim(), categoria: f.categoria.value.trim(),
    cantidad: Number(f.cantidad.value), minimo: Number(f.minimo.value || 0),
    costo: Number(f.costo.value), precio: Number(f.precio.value), vence: f.vence.value,
  };
  const repetido = datos.productos.find((x) => x.nombre.toLowerCase() === p.nombre.toLowerCase() && x.id !== editandoId);
  if (repetido) { ev.preventDefault(); aviso('Ya existe un producto con ese nombre.'); return; }
  if (p.precio < p.costo && !confirm('El precio de venta es menor que el costo. ¿Guardar de todas formas?')) { ev.preventDefault(); return; }
  if (editandoId) Object.assign(datos.productos.find((x) => x.id === editandoId), p, { pendiente: false });
  else datos.productos.push({ id: id(), ...p });
  guardar(); render(); aviso('Producto guardado ✔');
});

$('#tablaProductos').addEventListener('click', (ev) => {
  const b = ev.target.closest('button'); if (!b) return;
  if (b.dataset.editar) abrirProducto(b.dataset.editar);
  if (b.dataset.borrar) {
    const p = datos.productos.find((x) => x.id === b.dataset.borrar);
    if (confirm(`¿Borrar "${p.nombre}" del inventario?`)) {
      datos.productos = datos.productos.filter((x) => x.id !== p.id); guardar(); render(); aviso('Producto borrado');
    }
  }
  if (b.dataset.surtir) {
    surtiendoId = b.dataset.surtir;
    $('#formSurtir').reset();
    $('#surtirNombre').textContent = datos.productos.find((x) => x.id === surtiendoId).nombre;
    $('#dlgSurtir').showModal();
  }
});

$('#btnCancelarSurtir').addEventListener('click', () => $('#dlgSurtir').close());
$('#formSurtir').addEventListener('submit', (ev) => {
  const f = ev.target.elements;
  const p = datos.productos.find((x) => x.id === surtiendoId);
  p.cantidad = Number(p.cantidad) + Number(f.cantidad.value);
  if (f.costo.value !== '') p.costo = Number(f.costo.value);
  if (f.vence.value) p.vence = f.vence.value;
  p.pendiente = false;
  guardar(); render(); aviso(`Ahora hay ${p.cantidad} de ${p.nombre}`);
});

// ---------- cuentas del día ----------
function diaEditable(f) { if (!datos.dias[f]) datos.dias[f] = { ventas: null, salidas: [] }; return datos.dias[f]; }
$('#cierreFecha').addEventListener('change', renderCuentas);
$('#mesResumen').addEventListener('change', renderCuentas);
$('#btnGuardarVentas').addEventListener('click', () => {
  const f = $('#cierreFecha').value || hoyISO();
  const v = $('#cierreVentas').value;
  diaEditable(f).ventas = v === '' ? null : Math.max(0, Number(v));
  guardar(); render(); aviso(v === '' ? 'Total borrado' : `Vendido el ${fechaBonita(f)}: ${plata(Number(v))} ✔`);
});
$('#cierreVentas').addEventListener('keydown', (ev) => { if (ev.key === 'Enter') $('#btnGuardarVentas').click(); });
$('#formSalida').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const valor = Number($('#salidaValor').value); if (!(valor > 0)) return;
  const f = $('#cierreFecha').value || hoyISO();
  diaEditable(f).salidas.push({ id: id(), tipo: $('#salidaTipo').value, concepto: $('#salidaConcepto').value.trim(), valor });
  $('#salidaValor').value = ''; $('#salidaConcepto').value = '';
  guardar(); render(); aviso(`Salida de ${plata(valor)} anotada`);
});
$('#listaSalidas').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-quitar-salida]'); if (!b) return;
  const d = diaEditable($('#cierreFecha').value || hoyISO());
  d.salidas = d.salidas.filter((x) => x.id !== b.dataset.quitarSalida); guardar(); render();
});
$('#tablaDias').addEventListener('click', (ev) => {
  const tr = ev.target.closest('[data-ir-dia]'); if (!tr) return;
  $('#cierreFecha').value = tr.dataset.irDia; renderCuentas(); window.scrollTo({ top: 0, behavior: 'smooth' });
});
$('#irCierre').addEventListener('click', () => document.querySelector('[data-tab=cuentas]').click());

// ---------- copia de seguridad ----------
function descargar(nombre, contenido, tipo) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  a.download = nombre; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
$('#btnExportar').addEventListener('click', () => descargar(`tienda-copia-${hoyISO()}.json`, JSON.stringify(datos, null, 2), 'application/json'));
$('#archivoImportar').addEventListener('change', async (ev) => {
  const file = ev.target.files[0]; if (!file) return;
  try {
    const d = JSON.parse(await file.text());
    if (!Array.isArray(d.productos)) throw new Error();
    if (!confirm('Esto reemplaza los datos actuales por los de la copia. ¿Continuar?')) return;
    datos = normalizar(d); guardar(); render(); aviso('Copia cargada ✔');
  } catch { aviso('Ese archivo no es una copia válida.'); }
  ev.target.value = '';
});
$('#btnCsv').addEventListener('click', () => {
  const filas = [['Producto', 'Categoría', 'Cantidad', 'Mínimo', 'Costo', 'Precio', 'Vence']]
    .concat(datos.productos.map((p) => [p.nombre, p.categoria, p.cantidad, p.minimo, p.costo, p.precio, p.vence]));
  const csv = filas.map((f) => f.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n');
  descargar(`inventario-${hoyISO()}.csv`, '﻿' + csv, 'text/csv');
});
$('#diasAviso').addEventListener('change', (ev) => {
  datos.diasAviso = Math.max(1, Number(ev.target.value) || 7); guardar(); render();
});

// ---------- catálogo de productos típicos ----------
function cargarCatalogo() {
  const existentes = new Set(datos.productos.map((p) => p.nombre.toLowerCase()));
  const nuevos = CATALOGO.filter(([n]) => !existentes.has(n.toLowerCase()))
    .map(([nombre, categoria, costo, precio, minimo]) => ({ id: id(), nombre, categoria, cantidad: 0, minimo, costo, precio, vence: '', pendiente: true }));
  if (!nuevos.length) { aviso('Ya tiene todos los productos de la lista.'); return; }
  if (!confirm(`Se van a agregar ${nuevos.length} productos típicos de tienda con precios aproximados.\n\nDespués escriba cuántos tiene de cada uno, revise los precios y borre los que no vende. ¿Continuar?`)) return;
  datos.productos.push(...nuevos); guardar();
  $('#filtroEstado').value = 'contar';
  render(); aviso(`${nuevos.length} productos agregados. Ahora cuéntelos.`);
}
document.querySelectorAll('.btnCatalogo').forEach((b) => b.addEventListener('click', cargarCatalogo));

// Escribir o corregir la cantidad directamente en la lista
$('#tablaProductos').addEventListener('change', (ev) => {
  const inp = ev.target.closest('[data-contar]'); if (!inp || inp.value === '') return;
  const p = datos.productos.find((x) => x.id === inp.dataset.contar);
  const pos = [...document.querySelectorAll('[data-contar]')].indexOf(inp);
  const sale = $('#filtroEstado').value === 'contar' || $('#filtroEstado').value === 'poco'; // la fila puede desaparecer del filtro
  p.cantidad = Number(inp.value); p.pendiente = false; guardar();
  aviso(`${p.nombre}: ${p.cantidad} ✔`);
  setTimeout(() => { // redibujar después de que la casilla termine de perder el foco
    render();
    // Pasar al siguiente producto para seguir contando
    const todos = document.querySelectorAll('[data-contar]');
    const sig = todos[sale && todos[pos]?.dataset.contar !== p.id ? pos : pos + 1]; if (sig) sig.focus();
  }, 0);
});
$('#tablaProductos').addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter' && ev.target.matches('[data-contar]')) ev.target.blur(); // al salir de la casilla se guarda
});

$('#btnQuitarPendientes').addEventListener('click', () => {
  const n = pendientes().length;
  if (!n) { aviso('No hay productos sin contar.'); return; }
  if (!confirm(`¿Quitar los ${n} productos que nunca se contaron? (Los que ya tienen cantidad no se tocan.)`)) return;
  datos.productos = datos.productos.filter((p) => !p.pendiente); guardar(); render(); aviso(`${n} productos quitados`);
});
$('#irContar').addEventListener('click', () => {
  $('#filtroEstado').value = 'contar';
  document.querySelector('[data-tab=productos]').click();
});

$('#cierreFecha').value = hoyISO();
$('#mesResumen').value = hoyISO().slice(0, 7);
render();

// Instalar en el celular y funcionar sin internet (solo cuando está publicada, p. ej. en Netlify)
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
