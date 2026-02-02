import * as XLSX from 'xlsx';
import type { Libro, Item, Pago } from '@/types/gestion';

// ==================== HELPERS ====================

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-EC', { 
    style: 'currency', 
    currency: 'USD' 
  }).format(amount);
};

const formatDate = (dateString: string | null) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('es-EC', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric' 
  });
};

const getFechaExportacion = () => {
  return new Date().toLocaleString('es-EC', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ==================== DEEP BLUE EXPORTS ====================

export function exportDeepBlueToHTML(libro: Libro, items: Item[], pagos: Pago[]) {
  const totalItems = items.reduce((sum, item) => sum + item.monto, 0);
  const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  const saldoPendiente = totalItems - totalPagado;
  const fechaExportacion = getFechaExportacion();

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      'abierto': '<span class="badge badge-warning">Abierto</span>',
      'cerrado': '<span class="badge badge-info">Cerrado</span>',
      'pagado': '<span class="badge badge-success">Pagado</span>'
    };
    return styles[estado] || estado;
  };

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Deep Blue - ${libro.nombre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background: #f5f5f5; 
      padding: 20px; 
      line-height: 1.6; 
    }
    .container { 
      max-width: 900px; 
      margin: 0 auto; 
      background: white; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
      border-radius: 8px; 
      overflow: hidden; 
    }
    .header { 
      background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); 
      color: white; 
      padding: 30px; 
      text-align: center; 
    }
    .header h1 { 
      font-size: 2.5rem; 
      font-weight: 700; 
      margin-bottom: 5px; 
      letter-spacing: 1px; 
    }
    .header p { font-size: 1.1rem; opacity: 0.9; }
    .info-section { 
      background: #f8fafc; 
      padding: 20px 30px; 
      border-bottom: 3px solid #1e3a5f; 
    }
    .info-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
      gap: 15px; 
    }
    .info-item { display: flex; flex-direction: column; }
    .info-label { 
      font-size: 0.85rem; 
      color: #64748b; 
      font-weight: 600; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
    }
    .info-value { 
      font-size: 1.1rem; 
      color: #1e293b; 
      font-weight: 600; 
      margin-top: 3px; 
    }
    .badge { 
      display: inline-block; 
      padding: 4px 10px; 
      border-radius: 20px; 
      font-size: 0.75rem; 
      font-weight: 600; 
      text-transform: uppercase; 
    }
    .badge-success { background: #dcfce7; color: #16a34a; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-info { background: #e0e7ff; color: #4f46e5; }
    .resumen-section { padding: 25px 30px; background: white; }
    .section-title { 
      font-size: 1.1rem; 
      color: #1e3a5f; 
      font-weight: 700; 
      margin-bottom: 15px; 
      display: flex; 
      align-items: center; 
      gap: 8px; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
    }
    .resumen-cards { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
      gap: 15px; 
    }
    .resumen-card { 
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
      border-radius: 10px; 
      padding: 20px; 
      text-align: center; 
      border: 2px solid #e2e8f0; 
    }
    .resumen-card.servicios { 
      background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); 
      border-color: #1e3a5f; 
    }
    .resumen-card.pagado { 
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); 
      border-color: #22c55e; 
    }
    .resumen-card.pendiente { 
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
      border-color: #f59e0b; 
    }
    .resumen-label { 
      font-size: 0.8rem; 
      color: #64748b; 
      font-weight: 600; 
      text-transform: uppercase; 
      margin-bottom: 5px; 
    }
    .resumen-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
    .resumen-card.servicios .resumen-value { color: #1e3a5f; }
    .resumen-card.pagado .resumen-value { color: #16a34a; }
    .resumen-card.pendiente .resumen-value { color: #d97706; }
    .progress-section { padding: 0 30px 25px; }
    .progress-container { 
      background: #e2e8f0; 
      border-radius: 10px; 
      height: 30px; 
      overflow: hidden; 
      position: relative; 
    }
    .progress-bar { 
      background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%); 
      height: 100%; 
      border-radius: 10px; 
      display: flex; 
      align-items: center; 
      justify-content: flex-end; 
      padding-right: 10px; 
      color: white; 
      font-weight: 600; 
      font-size: 0.9rem; 
    }
    .progress-text { 
      position: absolute; 
      width: 100%; 
      text-align: center; 
      line-height: 30px; 
      font-weight: 600; 
      color: #1e293b; 
    }
    .table-section { padding: 25px 30px; border-top: 1px solid #e2e8f0; }
    .table-container { 
      overflow-x: auto; 
      border-radius: 8px; 
      border: 1px solid #e2e8f0; 
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    thead { 
      background: linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%); 
      color: white; 
    }
    th { 
      padding: 12px 15px; 
      text-align: left; 
      font-weight: 600; 
      text-transform: uppercase; 
      font-size: 0.8rem; 
      letter-spacing: 0.5px; 
    }
    td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; }
    tbody tr:hover { background: #f8fafc; }
    tbody tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .footer { 
      background: #1e293b; 
      color: white; 
      padding: 20px 30px; 
      text-align: center; 
      font-size: 0.9rem; 
    }
    .actions { 
      padding: 20px 30px; 
      background: #f8fafc; 
      border-top: 1px solid #e2e8f0; 
      display: flex; 
      gap: 10px; 
      justify-content: center; 
    }
    .btn { 
      padding: 10px 20px; 
      border: none; 
      border-radius: 6px; 
      font-size: 0.9rem; 
      font-weight: 600; 
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      gap: 8px; 
    }
    .btn-primary { background: #1e3a5f; color: white; }
    .btn-primary:hover { background: #2c5282; }
    .btn-secondary { 
      background: white; 
      color: #1e3a5f; 
      border: 2px solid #1e3a5f; 
    }
    .btn-secondary:hover { background: #f8fafc; }
    @media print { 
      body { background: white; padding: 0; } 
      .container { box-shadow: none; max-width: 100%; } 
      .no-print { display: none; } 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Deep Blue</h1>
      <p>Gestión de Saldos y Pagos Parciales</p>
    </div>
    
    <div class="info-section">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Libro</span>
          <span class="info-value">${libro.nombre}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Número de Factura</span>
          <span class="info-value">${libro.numero_factura || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Estado</span>
          <span class="info-value">${getEstadoBadge(libro.estado)}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Fecha de Exportación</span>
          <span class="info-value">${fechaExportacion}</span>
        </div>
      </div>
    </div>
    
    <div class="resumen-section">
      <h2 class="section-title">📊 Resumen General</h2>
      <div class="resumen-cards">
        <div class="resumen-card servicios">
          <div class="resumen-label">Total Servicios</div>
          <div class="resumen-value">${formatCurrency(totalItems)}</div>
        </div>
        <div class="resumen-card pagado">
          <div class="resumen-label">Total Pagado</div>
          <div class="resumen-value">${formatCurrency(totalPagado)}</div>
        </div>
        <div class="resumen-card pendiente">
          <div class="resumen-label">Saldo Pendiente</div>
          <div class="resumen-value">${formatCurrency(saldoPendiente)}</div>
        </div>
      </div>
    </div>
    
    <div class="progress-section">
      <div class="progress-container">
        <div class="progress-bar" style="width: ${totalItems > 0 ? (totalPagado / totalItems * 100) : 0}%">
          ${totalItems > 0 ? Math.round(totalPagado / totalItems * 100) : 0}%
        </div>
        <div class="progress-text">
          ${totalItems > 0 ? Math.round(totalPagado / totalItems * 100) : 0}% Pagado
        </div>
      </div>
    </div>
    
    <div class="table-section">
      <h2 class="section-title">📝 Servicios Realizados</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Descripción</th>
              <th class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${items.length > 0 ? items.map(item => `
              <tr>
                <td>${formatDate(item.fecha)}</td>
                <td>${item.descripcion}</td>
                <td class="text-right">${formatCurrency(item.monto)}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="3" class="text-center" style="padding: 30px; color: #64748b;">
                  No hay servicios registrados
                </td>
              </tr>
            `}
            <tr style="background: #f1f5f9; font-weight: 700;">
              <td colspan="2" style="text-align: right;">TOTAL SERVICIOS:</td>
              <td class="text-right" style="color: #1e3a5f; font-size: 1.1rem;">
                ${formatCurrency(totalItems)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    ${pagos.length > 0 ? `
    <div class="table-section">
      <h2 class="section-title">💳 Pagos Recibidos</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Método</th>
              <th>Nota</th>
              <th class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${pagos.map(pago => `
              <tr>
                <td>${formatDate(pago.fecha_pago)}</td>
                <td>
                  <span class="badge ${pago.metodo === 'efectivo' ? 'badge-warning' : pago.metodo === 'transferencia' ? 'badge-success' : 'badge-info'}">
                    ${pago.metodo}
                  </span>
                </td>
                <td>${pago.nota || '-'}</td>
                <td class="text-right" style="color: #16a34a; font-weight: 600;">
                  ${formatCurrency(pago.monto)}
                </td>
              </tr>
            `).join('')}
            <tr style="background: #f0fdf4; font-weight: 700;">
              <td colspan="3" style="text-align: right;">TOTAL PAGADO:</td>
              <td class="text-right" style="color: #16a34a; font-size: 1.1rem;">
                ${formatCurrency(totalPagado)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    ` : `
    <div class="table-section">
      <h2 class="section-title">💳 Pagos Recibidos</h2>
      <div style="text-align: center; padding: 40px; background: #f8fafc; border-radius: 8px; color: #64748b;">
        <p style="font-size: 1.1rem;">No hay pagos registrados aún</p>
        <p style="font-size: 0.9rem; margin-top: 5px;">Saldo pendiente: ${formatCurrency(saldoPendiente)}</p>
      </div>
    </div>
    `}
    
    <div class="footer">
      <p>Sistema de Gestión de Libros - Manuel Roldán</p>
      <p style="margin-top: 5px; opacity: 0.8; font-size: 0.8rem;">
        ${new Date().getFullYear()} - Todos los derechos reservados
      </p>
    </div>
    
    <div class="actions no-print">
      <button class="btn btn-primary" onclick="window.print()">
        🖨️ Imprimir / Guardar PDF
      </button>
      <button class="btn btn-secondary" onclick="window.close()">
        ✕ Cerrar
      </button>
    </div>
  </div>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    alert('Por favor permite ventanas emergentes para ver el documento');
  }
}

export function exportDeepBlueToExcel(libro: Libro, items: Item[], pagos: Pago[]) {
  const totalItems = items.reduce((sum, item) => sum + item.monto, 0);
  const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0);

  // Hoja de Servicios
  const itemsData = [
    ['SERVICIOS'],
    ['Fecha', 'Descripción', 'Monto'],
    ...items.map(item => [
      formatDate(item.fecha),
      item.descripcion,
      item.monto
    ]),
    ['', 'TOTAL', totalItems]
  ];

  // Hoja de Pagos
  const pagosData = [
    ['PAGOS RECIBIDOS'],
    ['Fecha', 'Método', 'Nota', 'Monto'],
    ...pagos.map(pago => [
      formatDate(pago.fecha_pago),
      pago.metodo,
      pago.nota || '',
      pago.monto
    ]),
    ['', '', 'TOTAL PAGADO', totalPagado],
    ['', '', 'SALDO PENDIENTE', totalItems - totalPagado]
  ];

  // Hoja de Resumen
  const resumenData = [
    ['RESUMEN GENERAL'],
    [],
    ['Cliente:', 'Deep Blue'],
    ['Libro:', libro.nombre],
    ['Factura:', libro.numero_factura || 'N/A'],
    ['Estado:', libro.estado.toUpperCase()],
    [],
    ['Total Servicios:', totalItems],
    ['Total Pagado:', totalPagado],
    ['Saldo Pendiente:', totalItems - totalPagado]
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(itemsData), 'Servicios');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(pagosData), 'Pagos');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumenData), 'Resumen');

  XLSX.writeFile(wb, `DeepBlue_${libro.nombre.replace(/\s+/g, '_')}.xlsx`);
}

// ==================== GALAKIWI EXPORTS ====================

interface SublibroConDatos extends Libro {
  items: Item[];
  totalGenerado: number;
}

export function exportGalakiwiToHTML(
  libro: Libro, 
  sublibros: SublibroConDatos[], 
  pagos: Pago[]
) {
  const totalGeneral = sublibros.reduce((sum, sub) => sum + sub.totalGenerado, 0);
  const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  const saldoPendiente = totalGeneral - totalPagado;
  const fechaExportacion = getFechaExportacion();

  const guiasConPorcentaje = sublibros.map(sub => ({
    ...sub,
    porcentaje: totalGeneral > 0 ? ((sub.totalGenerado / totalGeneral) * 100).toFixed(1) : '0'
  }));

  const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GalaKiwi - ${libro.nombre}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background: #f5f5f5; 
      padding: 20px; 
      line-height: 1.6; 
    }
    .container { 
      max-width: 900px; 
      margin: 0 auto; 
      background: white; 
      box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
      border-radius: 8px; 
      overflow: hidden; 
    }
    .header { 
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
      color: white; 
      padding: 30px; 
      text-align: center; 
    }
    .header h1 { 
      font-size: 2.5rem; 
      font-weight: 700; 
      margin-bottom: 5px; 
      letter-spacing: 1px; 
    }
    .header p { font-size: 1.1rem; opacity: 0.9; }
    .info-section { 
      background: #f8fafc; 
      padding: 20px 30px; 
      border-bottom: 3px solid #6366f1; 
    }
    .info-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
      gap: 15px; 
    }
    .info-item { display: flex; flex-direction: column; }
    .info-label { 
      font-size: 0.85rem; 
      color: #64748b; 
      font-weight: 600; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
    }
    .info-value { 
      font-size: 1.1rem; 
      color: #1e293b; 
      font-weight: 600; 
      margin-top: 3px; 
    }
    .resumen-section { padding: 25px 30px; background: white; }
    .section-title { 
      font-size: 1.1rem; 
      color: #6366f1; 
      font-weight: 700; 
      margin-bottom: 15px; 
      display: flex; 
      align-items: center; 
      gap: 8px; 
      text-transform: uppercase; 
      letter-spacing: 0.5px; 
    }
    .resumen-cards { 
      display: grid; 
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
      gap: 15px; 
    }
    .resumen-card { 
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
      border-radius: 10px; 
      padding: 20px; 
      text-align: center; 
      border: 2px solid #e2e8f0; 
    }
    .resumen-card.total { 
      background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); 
      border-color: #6366f1; 
    }
    .resumen-card.pagado { 
      background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); 
      border-color: #22c55e; 
    }
    .resumen-card.pendiente { 
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
      border-color: #f59e0b; 
    }
    .resumen-label { 
      font-size: 0.8rem; 
      color: #64748b; 
      font-weight: 600; 
      text-transform: uppercase; 
      margin-bottom: 5px; 
    }
    .resumen-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; }
    .resumen-card.total .resumen-value { color: #4f46e5; }
    .resumen-card.pagado .resumen-value { color: #16a34a; }
    .resumen-card.pendiente .resumen-value { color: #d97706; }
    .table-section { padding: 25px 30px; border-top: 1px solid #e2e8f0; }
    .table-container { 
      overflow-x: auto; 
      border-radius: 8px; 
      border: 1px solid #e2e8f0; 
    }
    table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
    thead { 
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); 
      color: white; 
    }
    th { 
      padding: 12px 15px; 
      text-align: left; 
      font-weight: 600; 
      text-transform: uppercase; 
      font-size: 0.8rem; 
      letter-spacing: 0.5px; 
    }
    td { padding: 12px 15px; border-bottom: 1px solid #e2e8f0; }
    tbody tr:hover { background: #f8fafc; }
    tbody tr:last-child td { border-bottom: none; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .badge { 
      display: inline-block; 
      padding: 4px 10px; 
      border-radius: 20px; 
      font-size: 0.75rem; 
      font-weight: 600; 
      text-transform: uppercase; 
    }
    .badge-success { background: #dcfce7; color: #16a34a; }
    .badge-warning { background: #fef3c7; color: #d97706; }
    .badge-info { background: #e0e7ff; color: #4f46e5; }
    .footer { 
      background: #1e293b; 
      color: white; 
      padding: 20px 30px; 
      text-align: center; 
      font-size: 0.9rem; 
    }
    .actions { 
      padding: 20px 30px; 
      background: #f8fafc; 
      border-top: 1px solid #e2e8f0; 
      display: flex; 
      gap: 10px; 
      justify-content: center; 
    }
    .btn { 
      padding: 10px 20px; 
      border: none; 
      border-radius: 6px; 
      font-size: 0.9rem; 
      font-weight: 600; 
      cursor: pointer; 
      display: flex; 
      align-items: center; 
      gap: 8px; 
    }
    .btn-primary { background: #6366f1; color: white; }
    .btn-primary:hover { background: #4f46e5; }
    .btn-secondary { 
      background: white; 
      color: #6366f1; 
      border: 2px solid #6366f1; 
    }
    .btn-secondary:hover { background: #f8fafc; }
    @media print { 
      body { background: white; padding: 0; } 
      .container { box-shadow: none; max-width: 100%; } 
      .no-print { display: none; } 
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>GalaKiwi</h1>
      <p>Sistema de Cobros y Pagos</p>
    </div>
    
    <div class="info-section">
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Número de Factura</span>
          <span class="info-value">${libro.numero_factura || 'N/A'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Libro</span>
          <span class="info-value">${libro.nombre}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Fecha de Exportación</span>
          <span class="info-value">${fechaExportacion}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Total de Guías</span>
          <span class="info-value">${sublibros.length}</span>
        </div>
      </div>
    </div>
    
    <div class="resumen-section">
      <h2 class="section-title">📊 Resumen General</h2>
      <div class="resumen-cards">
        <div class="resumen-card total">
          <div class="resumen-label">Total Generado</div>
          <div class="resumen-value">${formatCurrency(totalGeneral)}</div>
        </div>
        <div class="resumen-card pagado">
          <div class="resumen-label">Total Pagado</div>
          <div class="resumen-value">${formatCurrency(totalPagado)}</div>
        </div>
        <div class="resumen-card pendiente">
          <div class="resumen-label">Saldo Pendiente</div>
          <div class="resumen-value">${formatCurrency(saldoPendiente)}</div>
        </div>
      </div>
    </div>
    
    <div class="table-section">
      <h2 class="section-title">👥 Guías</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Guía</th>
              <th class="text-center">Servicios</th>
              <th class="text-right">Total Generado</th>
              <th class="text-right">% del Total</th>
            </tr>
          </thead>
          <tbody>
            ${guiasConPorcentaje.map(sub => `
              <tr>
                <td><strong>${sub.nombre}</strong></td>
                <td class="text-center">${sub.items.length}</td>
                <td class="text-right">${formatCurrency(sub.totalGenerado)}</td>
                <td class="text-right">
                  <span class="badge badge-info">${sub.porcentaje}%</span>
                </td>
              </tr>
            `).join('')}
            <tr style="background: #f1f5f9; font-weight: 700;">
              <td>TOTAL</td>
              <td class="text-center">${sublibros.reduce((sum, s) => sum + s.items.length, 0)}</td>
              <td class="text-right">${formatCurrency(totalGeneral)}</td>
              <td class="text-right">100%</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <div class="table-section">
      <h2 class="section-title">📝 Detalle de Servicios</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Guía</th>
              <th>Servicio</th>
              <th class="text-right">Valor Base</th>
              <th class="text-center">+10%</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${sublibros.flatMap(sub => 
              sub.items.map(item => `
                <tr>
                  <td>${formatDate(item.fecha)}</td>
                  <td>${sub.nombre}</td>
                  <td>${item.descripcion}</td>
                  <td class="text-right">${formatCurrency(item.monto)}</td>
                  <td class="text-center">
                    ${item.aplica_10 ? '<span class="badge badge-success">Sí</span>' : '<span class="badge badge-warning">No</span>'}
                  </td>
                  <td class="text-right"><strong>${formatCurrency(item.monto_final)}</strong></td>
                </tr>
              `)
            ).join('')}
          </tbody>
        </table>
      </div>
    </div>
    
    ${pagos.length > 0 ? `
    <div class="table-section">
      <h2 class="section-title">💳 Pagos Recibidos</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Método</th>
              <th>Nota</th>
              <th class="text-right">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${pagos.map(pago => `
              <tr>
                <td>${formatDate(pago.fecha_pago)}</td>
                <td>
                  <span class="badge ${pago.metodo === 'efectivo' ? 'badge-warning' : pago.metodo === 'transferencia' ? 'badge-success' : 'badge-info'}">
                    ${pago.metodo}
                  </span>
                </td>
                <td>${pago.nota || '-'}</td>
                <td class="text-right" style="color: #16a34a; font-weight: 600;">
                  ${formatCurrency(pago.monto)}
                </td>
              </tr>
            `).join('')}
            <tr style="background: #f0fdf4; font-weight: 700;">
              <td colspan="3" style="text-align: right;">TOTAL PAGADO:</td>
              <td class="text-right" style="color: #16a34a; font-size: 1.1rem;">
                ${formatCurrency(totalPagado)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    ` : ''}
    
    <div class="footer">
      <p>Sistema de Gestión de Libros - Manuel Roldán - </p>
      <p style="margin-top: 5px; opacity: 0.8; font-size: 0.8rem;">
        ${new Date().getFullYear()} - Todos los derechos reservados
      </p>
    </div>
    
    <div class="actions no-print">
      <button class="btn btn-primary" onclick="window.print()">
        🖨️ Imprimir / Guardar PDF
      </button>
      <button class="btn btn-secondary" onclick="window.close()">
        ✕ Cerrar
      </button>
    </div>
  </div>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  } else {
    alert('Por favor permite ventanas emergentes para ver el documento');
  }
}

export function exportGalakiwiToExcel(
  libro: Libro, 
  sublibros: SublibroConDatos[], 
  pagos: Pago[]
) {
  const totalGeneral = sublibros.reduce((sum, sub) => sum + sub.totalGenerado, 0);
  const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0);

  const wb = XLSX.utils.book_new();

  // Hoja por cada guía
  sublibros.forEach(sub => {
    const sheetData = [
      [`GUÍA: ${sub.nombre}`],
      [],
      ['Servicios'],
      ['Fecha', 'Descripción', 'Monto Base', 'Aplica 10%', 'Monto Final'],
      ...sub.items.map(item => [
        formatDate(item.fecha),
        item.descripcion,
        item.monto,
        item.aplica_10 ? 'Sí' : 'No',
        item.monto_final
      ]),
      [],
      ['', '', '', 'TOTAL GUÍA:', sub.totalGenerado]
    ];

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, sheet, sub.nombre.substring(0, 31));
  });

  // Hoja de Pagos Generales
  if (pagos.length > 0) {
    const pagosData = [
      ['PAGOS GENERALES DEL LIBRO'],
      [],
      ['Fecha', 'Método', 'Nota', 'Monto'],
      ...pagos.map(pago => [
        formatDate(pago.fecha_pago),
        pago.metodo,
        pago.nota || '',
        pago.monto
      ]),
      [],
      ['', '', 'TOTAL PAGADO:', totalPagado]
    ];

    const pagosSheet = XLSX.utils.aoa_to_sheet(pagosData);
    XLSX.utils.book_append_sheet(wb, pagosSheet, 'Pagos');
  }

  // Hoja de Resumen General
  const resumenData = [
    ['RESUMEN GENERAL - GALAKIWI'],
    [],
    ['Cliente:', 'Galakiwi'],
    ['Libro:', libro.nombre],
    ['Factura:', libro.numero_factura || 'N/A'],
    ['Fecha:', formatDate(new Date().toISOString())],
    [],
    ['Guía', 'Total Generado'],
    ...sublibros.map(sub => [sub.nombre, sub.totalGenerado]),
    [],
    ['TOTAL GENERADO', totalGeneral],
    ['TOTAL PAGADO', totalPagado],
    ['SALDO PENDIENTE', totalGeneral - totalPagado]
  ];

  const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen General');

  XLSX.writeFile(wb, `Galakiwi_${libro.nombre.replace(/\s+/g, '_')}.xlsx`);
}