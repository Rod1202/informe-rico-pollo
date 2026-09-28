# Dashboard Informe Rico Pollo · Misión Tecnológica

Dashboard web de **volumetría, facturación y auditoría NDD** del contrato MPS de
Rico Pollo S.A.C. Reproduce en web las 43 medidas del modelo `INFORME_RICO_POLLO.pbix`
(ver `MEDIDAS_INFORME_RICO_POLLO.md`) y añade la conciliación contra la auditoría NDD.

---

## Puesta en marcha

```bash
npm install      # solo la primera vez
npm run dev      # genera el dataset y levanta http://localhost:5173
```

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run data` | Relee los archivos de `utils/sds` y `utils/ndd` y regenera `src/data/dataset.json` |
| `npm run dev` | `npm run data` + servidor de desarrollo con recarga en caliente |
| `npm run build` | `npm run data` + build de producción en `dist/` |
| `npm run preview` | Sirve el build de `dist/` en http://localhost:4173 |

---

## Cómo se alimenta

```
utils/
├── sds/   →  1 Excel (DATA_CONSOLIDADA.xlsx). Hoja CONTADOR_SDS.
│             Es la fuente ÚNICA de la facturación.
└── ndd/   →  N archivos CSV/Excel. SE ANEXAN TODOS.
              Solo se usan Paginas_Mono y Paginas_Color como volumetría
              monocroma y color, más Fecha_de_Impresion.
```

**Para cerrar un mes nuevo:** copiar el Excel actualizado en `utils/sds/`, dejar el
nuevo export NDD en `utils/ndd/` y correr `npm run data`. No hay que tocar código.

Reglas que aplica `scripts/build-data.mjs`:

- **`Fecha_de_Impresion` → `Periodo`** en formato `mmm-yyyy` (`jun-2026`, `jul-2026`, `ago-2026`).
  Es la columna calculada que pide el informe; todos los cubos NDD se agregan por ella.
- Los CSV de NDD se leen en **latin-1** con separador `;` (formato del export).
- Se **descartan los registros duplicados** entre exportaciones con ventanas solapadas
  (en la carga actual: 812 de 111 362).
- Se detecta si un mes tiene **captura NDD parcial** (junio 2026 arranca el 18/06) y el
  dashboard lo advierte para no comparar contra un contador de mes completo.
- Las columnas `Total`, `Total Facturado` y `Total Páginas` del Excel **no se usan**: se
  recalculan con las medidas, igual que en el modelo Power BI.

---

## Medidas

`src/lib/measures.js` es la traducción 1:1 del DAX, con los mismos nombres y bloques:

| Bloque | Medidas |
|---|---|
| 01 Volumetría | Vol B/N, Vol Color, Volumetría, % Volumen B/N, % Volumen Color, YTD |
| 02 Facturación | Cargo Fijo, Clic B/N, Clic Color, Clic Variable, Facturación del Periodo, % B/N, % Color, % Cargo Fijo, Costo por Página, YTD |
| 03 Tarifas | Tarifa B/N, Tarifa Color, Tarifa Color A3 |
| 04 Variación mensual | Mes anterior, % Var MoM y Dif MoM de volumen y facturación |
| 05 Promedios | Meses Evaluados, Promedio y % Var vs Promedio |
| 06 Parque | Equipos Totales / Activos / Sin Actividad, Cargo Fijo Sin Actividad, Vol y Fact por Equipo |
| 07 Participación | % Participación Volumetría y Facturación |
| 08 Auditoría | Dif Contador B/N y Color, Equipos con Inconsistencia, Clic Variable Origen, Dif Clic vs Origen |

**Tarifas de contrato** — en `scripts/build-data.mjs`, constante `TARIFAS`.
Cambiarlas ahí y correr `npm run data` recalcula todo el informe, igual que la tabla
`Tarifas Clic` del modelo:

```
Clic B/N   $0.00720
Clic Color $0.05886
Color A3   $0.19000   (solo la serie BRCST7Q0HB)
```

Validado contra el origen: **Dif Clic vs Origen = $0.00** en jun, jul y ago 2026.

---

## Atribución: cómo se reparte el volumen

`src/lib/prorrateo.js` resuelve el problema de fondo del informe: **la factura sale del
contador SDS, pero solo NDD sabe quién imprimió.** Los dos nunca coinciden.

La regla es que **el contador SDS es el 100%**. NDD no aporta volumen: aporta la
*proporción* con la que se reparte ese volumen.

```
Impresora CNBRS9X0CB (PAB San José), ago-2026
  SDS factura ....... 13 294 páginas   ← el 100%
  NDD registra .......... 542 páginas   ← solo el patrón de uso

  despacho.juliaca  511/542 = 94.3%  →  12 534 págs
  lccori             28/542 =  5.2%  →     687 págs
  DESPACHO-05         3/542 =  0.6%  →      73 págs
                                        ──────────
                                         13 294  ✓ cuadra con la factura
```

Reglas que aplica:

- El reparto es por **impresora × periodo × tipo**. B/N y color se resuelven por
  separado porque sus factores casi nunca coinciden (en Marketing, ago-2026: 0.40 en
  B/N y 0.84 en color).
- Se usa **mayor residuo**, así la suma de los usuarios da exactamente el entero del
  contador y no se pierden páginas por redondeo.
- Si NDD **no registró monocromo** pero el contador sí lo facturó, el B/N se reparte con
  la huella que dejó el color (y a la inversa): es el único patrón de uso disponible.
- Si NDD **no registró nada** en una impresora que sí factura, esas páginas se marcan
  como **«sin auditoría»** en una fila propia del área, en vez de repartirse a ciegas.
- Si NDD registró **muy poco** (`COBERTURA_MINIMA`, hoy 50%), tampoco se extrapola. En
  PAB San José, ago-2026, NDD alcanza a ver 542 de 13 294 págs: el factor sería 24.5x y
  el reparto dejaría de medir para inventar. Ese volumen también va a «sin auditoría».
  Entre ambos casos son 39 280 págs en la carga actual.
- El umbral se mide **contra lo que el mes podía registrar**, no contra el mes entero.
  Junio solo captura desde el 18/06 (12 de 30 días), así que ahí el mínimo efectivo es
  20%. Sin este ajuste el umbral se llevaría 39 599 de las 54 093 págs de junio.
- Las series que NDD ve pero que **no están en el contrato** no tienen base contra la
  cual prorratearse: van a un bloque aparte, marcado como no facturable.

Efecto lateral útil: esto corrige solo la captura parcial de junio (NDD arranca el
18/06). Al ser SDS la base, el mes incompleto pasa a ser solo el patrón de reparto y el
total queda correcto.

Si se cambia `COBERTURA_MINIMA` conviene volver a correr la comprobación de cuadre: los
totales por área, usuario y trabajo tienen que seguir sumando exactamente el contador.

> El `npm run data` no cambia: el prorrateo se calcula en el navegador a partir del
> mismo `dataset.json`.

---

## Vistas

1. **Tablero KPI · Gerencia** — en este orden: evolución histórica (con pestaña
   volumetría / facturación), KPIs del periodo, composición del clic (B/N, color
   estándar, color A3), top 5 de áreas y de usuarios con variación de consumo y de
   puesto, ranking de áreas **clickeable**, variación contra el periodo anterior,
   evolución mes a mes del área elegida, ranking de usuarios que se filtra con esa misma
   selección (y tiene buscador por nombre o cuenta), y el detalle
   área → usuario → trabajo. Todo sobre volumen atribuido, así que cuadra con la factura.
   Elegir un área en el ranking gobierna el gráfico de evolución, la tabla de usuarios y
   el panel de detalle a la vez; se quita con otro clic en la misma barra. Los dos
   gráficos lineales rotulan cada mes con el parque de ese periodo (`n eq.`, conteo de
   series distintas con contador), que también sigue al área elegida.
2. **Resumen ejecutivo** — KPIs del periodo, distribución de consumo, sedes, parque
   ocioso, ciclo de facturación y comparativas mensuales.
3. **Volumetría y parque** — volumen por sede, área, modelo y detalle por equipo.
4. **Facturación y costos** — estructura de la factura, costo por página, tarifas,
   facturación por sede, modelo y área.
5. **Auditoría SDS vs NDD** — auditoría del contador, conciliación de parque, brecha
   por serie, perfil de uso (usuarios, dúplex, tipo de trabajo, papel). Las tablas de
   conciliación usan NDD **en crudo**: son las que justifican el factor de reparto.

Filtros del encabezado (periodo, sede, estado y búsqueda) se aplican a todas las vistas.

> **La factura se emite siempre sobre el contador SDS.** NDD cuenta páginas *enviadas a
> la cola*, no impresas, así que su volumen no coincide con el del contador. Por eso no
> se muestra su total crudo: se usa solo para repartir el volumen facturado entre
> usuarios, áreas y trabajos (ver «Atribución» más arriba).

---

## Stack

React 18 + Vite 5 + Tailwind CSS 3 + Recharts. Paleta de marca: `#0066ff`, gris claro y
negro (`src/lib/palette.js`, orden categórico fijo verificado para daltonismo).
