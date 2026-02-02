import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { Libro, Item, Pago } from '@/types/gestion';

// ==================== DEEP BLUE EXPORTS (sin cambios) ====================

export function exportToPDF(libro: Libro, items: Item[], pagos: Pago[]) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Tío Ñaño - Libro de Servicios', 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Cliente: Deep Blue`, 14, 30);
  doc.text(`Libro: ${libro.nombre}`, 14, 37);
  if (libro.numero_factura) {
    doc.text(`Factura: ${libro.numero_factura}`, 14, 44);
  }
  doc.text(`Estado: ${libro.estado.toUpperCase()}`, 14, libro.numero_factura ? 51 : 44);
  
  // Totales
  const totalItems = items.reduce((sum, item) => sum + item.monto, 0);
  const totalPagos = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  const saldo = totalItems - totalPagos;
  
  doc.setFontSize(11);
  doc.text(`Total Servicios: $${totalItems.toFixed(2)}`, 140, 30);
  doc.text(`Total Pagado: $${totalPagos.toFixed(2)}`, 140, 37);
  doc.setTextColor(saldo > 0 ? 200 : 0, saldo > 0 ? 0 : 150, 0);
  doc.text(`Saldo Pendiente: $${saldo.toFixed(2)}`, 140, 44);
  doc.setTextColor(0, 0, 0);
  
  // Tabla de Items
  if (items.length > 0) {
    doc.setFontSize(14);
    doc.text('Servicios', 14, 70);
    
    autoTable(doc, {
      startY: 75,
      head: [['Fecha', 'Descripción', 'Monto']],
      body: items.map(item => [
        item.fecha ? new Date(item.fecha).toLocaleDateString('es-EC') : '-',
        item.descripcion,
        `$${item.monto.toFixed(2)}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [51, 51, 51] },
    });
  }
  
  // Tabla de Pagos
  if (pagos.length > 0) {
    const finalY = (doc as any).lastAutoTable?.finalY || 80;
    doc.setFontSize(14);
    doc.text('Pagos', 14, finalY + 15);
    
    autoTable(doc, {
      startY: finalY + 20,
      head: [['Fecha', 'Método', 'Nota', 'Monto']],
      body: pagos.map(pago => [
        new Date(pago.fecha_pago).toLocaleDateString('es-EC'),
        pago.metodo,
        pago.nota || '-',
        `$${pago.monto.toFixed(2)}`,
      ]),
      theme: 'striped',
      headStyles: { fillColor: [0, 128, 0] },
    });
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-EC')} - Página ${i} de ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  doc.save(`DeepBlue_${libro.nombre.replace(/\s+/g, '_')}.pdf`);
}

export function exportToExcel(libro: Libro, items: Item[], pagos: Pago[]) {
  const totalItems = items.reduce((sum, item) => sum + item.monto, 0);
  const totalPagos = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  
  // Hoja de Servicios
  const itemsSheet = XLSX.utils.json_to_sheet(
    items.map(item => ({
      Fecha: item.fecha ? new Date(item.fecha).toLocaleDateString('es-EC') : '-',
      Descripción: item.descripcion,
      Monto: item.monto,
    }))
  );
  
  // Agregar totales
  const itemsData = XLSX.utils.sheet_to_json(itemsSheet, { header: 1 }) as any[];
  itemsData.push(['', 'TOTAL', totalItems]);
  const itemsSheetWithTotal = XLSX.utils.aoa_to_sheet(itemsData);
  
  // Hoja de Pagos
  const pagosSheet = XLSX.utils.json_to_sheet(
    pagos.map(pago => ({
      Fecha: new Date(pago.fecha_pago).toLocaleDateString('es-EC'),
      Método: pago.metodo,
      Nota: pago.nota || '',
      Monto: pago.monto,
    }))
  );
  
  const pagosData = XLSX.utils.sheet_to_json(pagosSheet, { header: 1 }) as any[];
  pagosData.push(['', '', 'TOTAL PAGADO', totalPagos]);
  pagosData.push(['', '', 'SALDO PENDIENTE', totalItems - totalPagos]);
  const pagosSheetWithTotal = XLSX.utils.aoa_to_sheet(pagosData);
  
  // Crear workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, itemsSheetWithTotal, 'Servicios');
  XLSX.utils.book_append_sheet(wb, pagosSheetWithTotal, 'Pagos');
  
  // Hoja de Resumen
  const resumenSheet = XLSX.utils.aoa_to_sheet([
    ['RESUMEN'],
    [],
    ['Cliente:', 'Deep Blue'],
    ['Libro:', libro.nombre],
    ['Factura:', libro.numero_factura || 'N/A'],
    ['Estado:', libro.estado.toUpperCase()],
    [],
    ['Total Servicios:', totalItems],
    ['Total Pagado:', totalPagos],
    ['Saldo Pendiente:', totalItems - totalPagos],
  ]);
  XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen');
  
  XLSX.writeFile(wb, `DeepBlue_${libro.nombre.replace(/\s+/g, '_')}.xlsx`);
}

// ==================== GALAKIWI EXPORTS (ACTUALIZADO) ====================
interface SublibroConItems extends Libro {
  items: Item[];
  totalGenerado: number;
}

export function exportGalakiwiToPDF(
  libro: Libro, 
  sublibros: SublibroConItems[], 
  pagos: Pago[],
  guiaEspecifica?: SublibroConItems
) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Tío Ñaño - Libro de Servicios', 14, 20);
  
  doc.setFontSize(12);
  doc.text(`Cliente: Galakiwi`, 14, 30);
  doc.text(`Libro: ${libro.nombre}`, 14, 37);
  if (libro.numero_factura) {
    doc.text(`Factura: ${libro.numero_factura}`, 14, 44);
  }
  
  // Calcular totales generales
  const totalGeneral = sublibros.reduce((sum, sub) => sum + sub.totalGenerado, 0);
  const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  const saldoGeneral = totalGeneral - totalPagado;
  
  // Si es exportación de una guía específica
  if (guiaEspecifica) {
    doc.text(`Guía: ${guiaEspecifica.nombre}`, 14, libro.numero_factura ? 51 : 44);
    
    doc.setFontSize(11);
    doc.text(`Total Guía: $${guiaEspecifica.totalGenerado.toFixed(2)}`, 140, 30);
    
    // Tabla de Items
    if (guiaEspecifica.items.length > 0) {
      doc.setFontSize(14);
      doc.text('Servicios', 14, 65);
      
      autoTable(doc, {
        startY: 70,
        head: [['Fecha', 'Descripción', 'Monto Base', '+10%', 'Monto Final']],
        body: guiaEspecifica.items.map(item => [
          item.fecha ? new Date(item.fecha).toLocaleDateString('es-EC') : '-',
          item.descripcion,
          `$${item.monto.toFixed(2)}`,
          item.aplica_10 ? 'Sí' : 'No',
          `$${item.monto_final.toFixed(2)}`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [51, 51, 51] },
      });
    }
  } else {
    // Exportación COMPLETA con pagos generales
    doc.setFontSize(11);
    doc.text(`Total General: $${totalGeneral.toFixed(2)}`, 14, libro.numero_factura ? 55 : 48);
    doc.text(`Total Pagado: $${totalPagado.toFixed(2)}`, 14, libro.numero_factura ? 62 : 55);
    doc.setTextColor(saldoGeneral > 0 ? 200 : 0, saldoGeneral > 0 ? 0 : 150, 0);
    doc.text(`Saldo Pendiente: $${saldoGeneral.toFixed(2)}`, 14, libro.numero_factura ? 69 : 62);
    doc.setTextColor(0, 0, 0);
    doc.text(`Guías: ${sublibros.length}`, 14, libro.numero_factura ? 76 : 69);
    
    let startY = libro.numero_factura ? 85 : 78;
    
    // Tabla de Guías
    if (sublibros.length > 0) {
      doc.setFontSize(14);
      doc.text('Resumen por Guía', 14, startY);
      
      autoTable(doc, {
        startY: startY + 5,
        head: [['Guía', 'Servicios', 'Total Generado']],
        body: sublibros.map(sub => [
          sub.nombre,
          sub.items.length.toString(),
          `$${sub.totalGenerado.toFixed(2)}`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [102, 51, 153] },
      });
      
      startY = (doc as any).lastAutoTable.finalY + 15;
    }
    
    // Tabla de Pagos Generales
    if (pagos.length > 0) {
      if (startY > 200) {
        doc.addPage();
        startY = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Pagos Registrados', 14, startY);
      
      autoTable(doc, {
        startY: startY + 5,
        head: [['Fecha', 'Método', 'Nota', 'Monto']],
        body: pagos.map(pago => [
          new Date(pago.fecha_pago).toLocaleDateString('es-EC'),
          pago.metodo,
          pago.nota || '-',
          `$${pago.monto.toFixed(2)}`,
        ]),
        theme: 'striped',
        headStyles: { fillColor: [0, 128, 0] },
      });
    }
  }
  
  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(10);
    doc.text(
      `Generado el ${new Date().toLocaleDateString('es-EC')} - Página ${i} de ${pageCount}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }
  
  const fileName = guiaEspecifica 
    ? `Galakiwi_${libro.nombre}_${guiaEspecifica.nombre}.pdf`
    : `Galakiwi_${libro.nombre}_Completo.pdf`;
  doc.save(fileName.replace(/\s+/g, '_'));
}

export function exportGalakiwiToExcel(
  libro: Libro, 
  sublibros: SublibroConItems[], 
  pagos: Pago[]
) {
  const wb = XLSX.utils.book_new();
  
  const totalGeneral = sublibros.reduce((sum, sub) => sum + sub.totalGenerado, 0);
  const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  
  // Hoja de Guías (servicios detallados)
  sublibros.forEach(sublibro => {
    const sheetData: any[] = [
      [`GUÍA: ${sublibro.nombre}`],
      [],
      ['Servicios'],
      ['Fecha', 'Descripción', 'Monto Base', 'Aplica 10%', 'Monto Final'],
      ...sublibro.items.map(item => [
        item.fecha ? new Date(item.fecha).toLocaleDateString('es-EC') : '-',
        item.descripcion,
        item.monto,
        item.aplica_10 ? 'Sí' : 'No',
        item.monto_final,
      ]),
      [],
      ['', '', '', 'TOTAL GUÍA:', sublibro.totalGenerado],
    ];
    
    const sheet = XLSX.utils.aoa_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(wb, sheet, sublibro.nombre.substring(0, 31));
  });
  
  // Hoja de Pagos Generales
  if (pagos.length > 0) {
    const pagosData = [
      ['PAGOS GENERALES DEL LIBRO'],
      [],
      ['Fecha', 'Método', 'Nota', 'Monto'],
      ...pagos.map(pago => [
        new Date(pago.fecha_pago).toLocaleDateString('es-EC'),
        pago.metodo,
        pago.nota || '',
        pago.monto,
      ]),
      [],
      ['', '', 'TOTAL PAGADO:', totalPagado],
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
    ['Fecha:', new Date().toLocaleDateString('es-EC')],
    [],
    ['Guía', 'Total Generado'],
    ...sublibros.map(sub => [sub.nombre, sub.totalGenerado]),
    [],
    ['TOTAL GENERADO', totalGeneral],
    ['TOTAL PAGADO', totalPagado],
    ['SALDO PENDIENTE', totalGeneral - totalPagado],
  ];
  
  const resumenSheet = XLSX.utils.aoa_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen General');
  
  XLSX.writeFile(wb, `Galakiwi_${libro.nombre.replace(/\s+/g, '_')}.xlsx`);
}