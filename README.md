# Inventario de la Tienda

Aplicación web sencilla para organizar el inventario de una tienda de barrio.
Funciona en el navegador del computador o del celular, **sin internet y sin instalar nada**.

## Cómo usarla
1. Abrir `index.html` en el navegador (Chrome, Edge, Firefox…).
2. En **Productos**, tocar “+ Nuevo producto” y escribir nombre, cantidad, costo, precio de venta y fecha de vencimiento.
3. Cada vez que se venda algo, ir a **Ventas**, agregar los productos y tocar “Registrar venta”. La cantidad se descuenta sola.
4. Cuando llegue mercancía, tocar “+ Llegó” en el producto.
5. Revisar el **Resumen** todos los días.

## Productos típicos ya listos
En **Productos** (o en **Ajustes**) está el botón “📋 Cargar productos típicos”: agrega más de 130 productos comunes de
tienda de barrio colombiana (gaseosas Coca-Cola, Quatro, Postobón; aguas Brisa y Cristal; jugos Hit; cervezas Póker,
Águila, Costeñita; plaza, carnes, panadería, granos, mecato y aseo) con **precios aproximados**.
Quedan marcados “por contar”: se escribe cuántos hay de cada uno, se revisan los precios y se borran los que no se venden.
En Ajustes hay un botón para quitar de una vez todos los que nunca se contaron. La lista está en `catalogo.js`.

## Qué hace
- **Avisa lo que está vencido o por vencer** (por defecto 7 días antes) para venderlo primero y que no se pierda.
- **Avisa lo que se está acabando** según la cantidad mínima de cada producto.
- **Cuentas del día**: cuánto se vendió y cuánto se ganó; historial por fecha y opción de anular ventas.
- **Plata invertida** en mercancía y ganancia esperada si se vende todo.
- **Copia de seguridad** (descargar/cargar) y exportar el inventario a Excel (CSV).

## Importante
Los datos se guardan en el navegador del dispositivo donde se usa. Descargue una copia de seguridad
de vez en cuando (pestaña “Ajustes”), sobre todo antes de borrar el historial o cambiar de celular.

## Publicar en Netlify
**Opción A — conectada a GitHub (se actualiza sola):**
1. Entrar a https://app.netlify.com e iniciar sesión con GitHub.
2. *Add new site* → *Import an existing project* → *GitHub* → elegir este repositorio.
3. En *Branch to deploy* elegir la rama donde está la app. Dejar vacío el *Build command*; *Publish directory*: `.`
4. *Deploy*. Netlify da un enlace tipo `https://algo.netlify.app` (se puede cambiar el nombre en *Site configuration → Change site name*).

**Opción B — arrastrar y soltar:** descargar el proyecto, ir a https://app.netlify.com/drop y arrastrar la carpeta.

## Instalarla en el celular
Abrir el enlace de Netlify en el celular:
- **Android (Chrome):** menú ⋮ → *Agregar a la pantalla principal* / *Instalar app*.
- **iPhone (Safari):** botón Compartir → *Agregar a inicio*.

Después abre como una app y funciona aunque no haya internet.
Al publicar cambios, subir el número de `VERSION` en `sw.js`.
