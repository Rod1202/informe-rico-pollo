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

## Vistas

1. **Resumen ejecutivo** — KPIs del periodo, distribución de consumo, sedes, parque
   ocioso, ciclo de facturación y comparativas mensuales.
2. **Volumetría y parque** — volumen por sede, área, modelo y detalle por equipo.
3. **Facturación y costos** — estructura de la factura, costo por página, tarifas,
   facturación por sede, modelo y área.
4. **Auditoría SDS vs NDD** — auditoría del contador, conciliación de parque, brecha
   por serie, perfil de uso (usuarios, dúplex, tipo de trabajo, papel).

Filtros del encabezado (periodo, sede, estado y búsqueda) se aplican a todas las vistas.

> **La factura se emite siempre sobre el contador SDS.** NDD cuenta páginas *enviadas a
> la cola*, no impresas, por lo que su volumen es mayor; sirve como control de gestión
> para identificar usuarios, áreas y equipos que originan el consumo.

---

## Stack

React 18 + Vite 5 + Tailwind CSS 3 + Recharts. Paleta de marca: `#0066ff`, gris claro y
negro (`src/lib/palette.js`, orden categórico fijo verificado para daltonismo).
