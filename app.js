// Inventario de la tienda — todo se guarda en el navegador (localStorage).
const CLAVE = 'inventario-tienda-v1';
const $ = (s) => document.querySelector(s);

let datos = cargar();
let carrito = [];
let editandoId = null;
let surtiendoId = null;

function cargar() {
  try {
    const d = JSON.parse(localStorage.getItem(CLAVE));
    if (d && Array.isArray(d.productos)) return { diasAviso: 7, ventas: [], ...d };
  } catch (e) { /* datos dañados o sin acceso: empezar vacío */ }
  return { productos: [], ventas: [], diasAviso: 7 };
}
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
const pocoStock = (p) => Number(p.cantidad) <= Number(p.minimo || 0);
const porVencer = (p) => { const e = estadoVence(p); return e && e.clase !== 'verde'; };

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
  renderVentas();
  $('#diasAviso').value = datos.diasAviso;
  $('#diasAvisoTxt').textContent = datos.diasAviso;
}

function ventasDelDia(fecha) { return datos.ventas.filter((v) => v.fecha.slice(0, 10) === fecha); }
function totales(ventas) {
  let total = 0, ganancia = 0;
  ventas.forEach((v) => v.items.forEach((i) => { total += i.precio * i.cantidad; ganancia += (i.precio - i.costo) * i.cantidad; }));
  return { total, ganancia };
}

function renderResumen() {
  const t = totales(ventasDelDia(hoyISO()));
  $('#kpiVentasHoy').textContent = plata(t.total);
  $('#kpiGananciaHoy').textContent = plata(t.ganancia);
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
  $('#listaNombres').innerHTML = datos.productos.map((p) => `<option value="${esc(p.nombre)}">`).join('');

  const q = $('#buscar').value.trim().toLowerCase();
  const est = $('#filtroEstado').value;
  const lista = datos.productos
    .filter((p) => !q || p.nombre.toLowerCase().includes(q))
    .filter((p) => !sel.value || p.categoria === sel.value)
    .filter((p) => !est || (est === 'vence' ? porVencer(p) : pocoStock(p)))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));

  $('#tablaProductos').innerHTML = lista.map((p) => {
    const e = estadoVence(p);
    const cant = pocoStock(p) ? `<span class="tag ${p.cantidad <= 0 ? 'rojo' : 'amarillo'}">${p.cantidad}</span>` : p.cantidad;
    return `<tr>
      <td><b>${esc(p.nombre)}</b></td>
      <td>${esc(p.categoria)}</td>
      <td class="num">${cant}</td>
      <td class="num">${plata(p.costo)}</td>
      <td class="num">${plata(p.precio)}</td>
      <td>${e ? `<span class="tag ${e.clase}">${e.texto}</span>` : '<span class="hint">No vence</span>'}</td>
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

function renderVentas() {
  $('#carrito').innerHTML = carrito.map((i, n) => `<li><span>${i.cantidad} × ${esc(i.nombre)}</span>
    <span>${plata(i.precio * i.cantidad)} <button class="btn peq peligro" data-quitar="${n}">✕</button></span></li>`).join('');
  $('#totalCarrito').textContent = plata(carrito.reduce((s, i) => s + i.precio * i.cantidad, 0));
  $('#btnCobrar').disabled = !carrito.length;

  const fecha = $('#fechaHistorial').value || hoyISO();
  const vs = ventasDelDia(fecha).slice().reverse();
  const t = totales(vs);
  $('#histTotal').textContent = plata(t.total);
  $('#histGanancia').textContent = plata(t.ganancia);
  $('#listaVentas').innerHTML = vs.length ? vs.map((v) => {
    const total = v.items.reduce((s, i) => s + i.precio * i.cantidad, 0);
    const hora = new Date(v.fecha).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    return `<li><span>${hora}</span><span><b>${plata(total)}</b> <button class="btn peq peligro" data-anular="${v.id}" title="Anular venta y devolver al inventario">Anular</button></span>
      <small>${v.items.map((i) => `${i.cantidad} × ${esc(i.nombre)}`).join(', ')}</small></li>`;
  }).join('') : '<li class="vacio">No hay ventas este día.</li>';
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
  if (editandoId) Object.assign(datos.productos.find((x) => x.id === editandoId), p);
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
  guardar(); render(); aviso(`Ahora hay ${p.cantidad} de ${p.nombre}`);
});

// ---------- ventas ----------
$('#formCarrito').addEventListener('submit', (ev) => {
  ev.preventDefault();
  const nombre = $('#ventaProducto').value.trim().toLowerCase();
  const cant = Number($('#ventaCantidad').value);
  const p = datos.productos.find((x) => x.nombre.toLowerCase() === nombre);
  if (!p) { aviso('Ese producto no está en el inventario.'); return; }
  if (!(cant > 0)) return;
  const enCarrito = carrito.filter((i) => i.id === p.id).reduce((s, i) => s + i.cantidad, 0);
  if (enCarrito + cant > p.cantidad && !confirm(`Según el inventario solo hay ${p.cantidad} de ${p.nombre}. ¿Vender de todas formas?`)) return;
  const e = estadoVence(p);
  if (e && e.d < 0) aviso(`Ojo: ${p.nombre} está vencido`);
  const ya = carrito.find((i) => i.id === p.id);
  if (ya) ya.cantidad += cant; else carrito.push({ id: p.id, nombre: p.nombre, cantidad: cant, precio: p.precio, costo: p.costo });
  $('#ventaProducto').value = ''; $('#ventaCantidad').value = 1; $('#ventaProducto').focus();
  renderVentas();
});

$('#carrito').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-quitar]'); if (!b) return;
  carrito.splice(Number(b.dataset.quitar), 1); renderVentas();
});

$('#btnCobrar').addEventListener('click', () => {
  if (!carrito.length) return;
  carrito.forEach((i) => { const p = datos.productos.find((x) => x.id === i.id); if (p) p.cantidad = Math.max(0, p.cantidad - i.cantidad); });
  datos.ventas.push({ id: id(), fecha: new Date().toISOString(), items: carrito.map(({ id: productoId, ...r }) => ({ productoId, ...r })) });
  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);
  carrito = []; guardar();
  $('#fechaHistorial').value = hoyISO();
  render(); aviso(`Venta registrada: ${plata(total)}`);
});

$('#fechaHistorial').addEventListener('change', renderVentas);
$('#listaVentas').addEventListener('click', (ev) => {
  const b = ev.target.closest('[data-anular]'); if (!b) return;
  if (!confirm('¿Anular esta venta? Los productos vuelven al inventario.')) return;
  const v = datos.ventas.find((x) => x.id === b.dataset.anular);
  v.items.forEach((i) => { const p = datos.productos.find((x) => x.id === i.productoId); if (p) p.cantidad += i.cantidad; });
  datos.ventas = datos.ventas.filter((x) => x !== v); guardar(); render(); aviso('Venta anulada');
});

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
    datos = { diasAviso: 7, ventas: [], ...d }; guardar(); render(); aviso('Copia cargada ✔');
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

$('#fechaHistorial').value = hoyISO();
render();
