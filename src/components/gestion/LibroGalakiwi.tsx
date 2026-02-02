import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, User, Calendar, FileDown, ArrowLeft, Percent, DollarSign, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportGalakiwiToPDF, exportGalakiwiToExcel } from './exportUtils';
import type { Libro, Item, Pago } from '@/types/gestion';

interface LibroGalakiwiProps {
  libro: Libro;
  onLibroUpdated: () => void;
}

interface SublibroConItems extends Libro {
  items: Item[];
  totalGenerado: number;
}

export function LibroGalakiwi({ libro, onLibroUpdated }: LibroGalakiwiProps) {
  const [sublibros, setSublibros] = useState<SublibroConItems[]>([]);
  const [selectedSublibro, setSelectedSublibro] = useState<SublibroConItems | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Pagos a nivel de libro principal
  const [pagos, setPagos] = useState<Pago[]>([]);
  
  // Form states
  const [showNewGuiaDialog, setShowNewGuiaDialog] = useState(false);
  const [newGuiaName, setNewGuiaName] = useState('');
  const [newItem, setNewItem] = useState({ fecha: '', descripcion: '', monto: '', aplica_10: false });
  
  // Estados para pagos generales
  const [showPagoDialog, setShowPagoDialog] = useState(false);
  const [newPago, setNewPago] = useState({ monto: '', metodo: 'transferencia', nota: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Obtener sublibros (guías) con sus items
      const { data: sublibrosData, error: sublibrosError } = await supabase
        .from('libros')
        .select('*')
        .eq('parent_id', libro.id)
        .order('nombre', { ascending: true });

      if (sublibrosError) throw sublibrosError;

      const sublibrosCompletos: SublibroConItems[] = [];
      
      for (const sub of (sublibrosData || [])) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('*')
          .eq('libro_id', sub.id)
          .order('fecha', { ascending: true });

        if (itemsError) throw itemsError;

        const items = itemsData || [];
        const totalGenerado = items.reduce((sum, item) => sum + item.monto_final, 0);

        sublibrosCompletos.push({
          ...sub,
          items,
          totalGenerado,
        });
      }

      setSublibros(sublibrosCompletos);

      // OBTENER PAGOS DEL LIBRO PRINCIPAL (no de guías)
      const { data: pagosData, error: pagosError } = await supabase
        .from('pagos')
        .select('*')
        .eq('libro_id', libro.id)
        .order('fecha_pago', { ascending: true });

      if (pagosError) throw pagosError;
      setPagos(pagosData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [libro.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Calcular totales generales
  const totalGeneral = sublibros.reduce((sum, sub) => sum + sub.totalGenerado, 0);
  const totalPagado = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  const saldoPendiente = totalGeneral - totalPagado;

  const handleCreateGuia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGuiaName.trim()) return;

    try {
      const { error } = await supabase.from('libros').insert({
        cliente: 'galakiwi',
        parent_id: libro.id,
        nombre: newGuiaName.trim(),
        estado: 'abierto',
      });

      if (error) throw error;

      setNewGuiaName('');
      setShowNewGuiaDialog(false);
      fetchData();
      onLibroUpdated();
    } catch (error) {
      console.error('Error creating guia:', error);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSublibro || !newItem.fecha || !newItem.descripcion || !newItem.monto) return;

    try {
      const { error } = await supabase.from('items').insert({
        libro_id: selectedSublibro.id,
        fecha: newItem.fecha,
        descripcion: newItem.descripcion,
        monto: parseFloat(newItem.monto),
        aplica_10: newItem.aplica_10,
      });

      if (error) throw error;

      setNewItem({ fecha: '', descripcion: '', monto: '', aplica_10: false });
      fetchData();
      onLibroUpdated();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  // REGISTRAR PAGO GENERAL (nivel libro, no guía)
  const handleAddPago = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPago.monto) return;

    const montoPago = parseFloat(newPago.monto);
    if (montoPago > saldoPendiente) {
      alert('El pago no puede ser mayor al saldo pendiente');
      return;
    }

    try {
      const { error } = await supabase.from('pagos').insert({
        libro_id: libro.id,  // ID del libro principal, no de la guía
        monto: montoPago,
        metodo: newPago.metodo,
        nota: newPago.nota || null,
      });

      if (error) throw error;

      setNewPago({ monto: '', metodo: 'transferencia', nota: '' });
      setShowPagoDialog(false);
      fetchData();
      onLibroUpdated();
    } catch (error) {
      console.error('Error adding pago:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    
    try {
      const { error } = await supabase.from('items').delete().eq('id', itemId);
      if (error) throw error;
      fetchData();
      onLibroUpdated();
    } catch (error) {
      console.error('Error deleting item:', error);
    }
  };

  const handleDeletePago = async (pagoId: string) => {
    if (!confirm('¿Eliminar este pago?')) return;
    
    try {
      const { error } = await supabase.from('pagos').delete().eq('id', pagoId);
      if (error) throw error;
      fetchData();
      onLibroUpdated();
    } catch (error) {
      console.error('Error deleting pago:', error);
    }
  };

  const handleDeleteGuia = async (guiaId: string) => {
    if (!confirm('¿Eliminar esta guía y todos sus servicios?')) return;
    
    try {
      const { error } = await supabase.from('libros').delete().eq('id', guiaId);
      if (error) throw error;
      
      if (selectedSublibro?.id === guiaId) {
        setSelectedSublibro(null);
      }
      
      fetchData();
      onLibroUpdated();
    } catch (error) {
      console.error('Error deleting guia:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // VISTA DE DETALLE DE UNA GUÍA (sin pagos, solo servicios)
  if (selectedSublibro) {
    return (
      <div className="space-y-4">
        {/* Header */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSublibro(null)}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Volver
                </Button>
                <div>
                  <CardTitle className="text-lg text-slate-900">{selectedSublibro.nombre}</CardTitle>
                  <p className="text-sm text-slate-500">Guía de {libro.nombre}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Guía</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(selectedSublibro.totalGenerado)}</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Formulario agregar servicio */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-700">Agregar Servicio</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddItem} className="space-y-3">
              <div className="grid grid-cols-12 gap-3">
                <div className="col-span-3">
                  <Input
                    type="date"
                    value={newItem.fecha}
                    onChange={(e) => setNewItem({ ...newItem, fecha: e.target.value })}
                    required
                    className="border-slate-300"
                  />
                </div>
                <div className="col-span-4">
                  <Input
                    placeholder="Descripción del servicio"
                    value={newItem.descripcion}
                    onChange={(e) => setNewItem({ ...newItem, descripcion: e.target.value })}
                    required
                    className="border-slate-300"
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Monto base"
                    value={newItem.monto}
                    onChange={(e) => setNewItem({ ...newItem, monto: e.target.value })}
                    required
                    className="border-slate-300"
                  />
                </div>
                <div className="col-span-1 flex items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="aplica10"
                      checked={newItem.aplica_10}
                      onCheckedChange={(checked) => 
                        setNewItem({ ...newItem, aplica_10: checked as boolean })
                      }
                    />
                    <Label htmlFor="aplica10" className="text-xs cursor-pointer">
                      <Percent className="h-3 w-3 inline" /> 10%
                    </Label>
                  </div>
                </div>
                <div className="col-span-1">
                  <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-700">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {newItem.aplica_10 && newItem.monto && (
                <p className="text-xs text-slate-500">
                  Monto final con 10%: {formatCurrency(parseFloat(newItem.monto) * 1.1)}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Lista de servicios */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-700">Servicios de {selectedSublibro.nombre}</CardTitle>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-slate-400 hover:text-red-500"
              onClick={() => handleDeleteGuia(selectedSublibro.id)}
            >
              <Trash2 className="h-5 w-5" />
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {selectedSublibro.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No hay servicios registrados</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedSublibro.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-600">{formatDate(item.fecha)}</span>
                          {item.aplica_10 && (
                            <Badge variant="outline" className="bg-purple-100 text-purple-800 text-xs">
                              <Percent className="h-3 w-3 mr-1" /> 10%
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-slate-900 mt-1">{item.descripcion}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-slate-900">{formatCurrency(item.monto_final)}</p>
                          {item.aplica_10 && (
                            <p className="text-xs text-slate-500">Base: {formatCurrency(item.monto)}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    );
  }

  // VISTA PRINCIPAL: Con pagos generales
  return (
    <div className="space-y-4">
      {/* Header con totales y exportación */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-slate-900">{libro.nombre}</CardTitle>
              {libro.numero_factura && (
                <p className="text-sm text-slate-500">Factura: {libro.numero_factura}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500">Total General</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(totalGeneral)}</p>
                <div className="flex gap-3 text-xs mt-1 justify-end">
                  <span className="text-green-600">Pagado: {formatCurrency(totalPagado)}</span>
                  <span className="text-amber-600">Pendiente: {formatCurrency(saldoPendiente)}</span>
                </div>
              </div>
              {/* Botones exportar */}
              <div className="flex flex-col gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportGalakiwiToPDF(libro, sublibros, pagos)}
                  className="bg-slate-800 text-white hover:bg-slate-700"
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  PDF
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportGalakiwiToExcel(libro, sublibros, pagos)}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Resumen de totales */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg text-center">
              <p className="text-xs text-slate-500 mb-1">Total Generado</p>
              <p className="text-lg font-semibold text-slate-900">{formatCurrency(totalGeneral)}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <p className="text-xs text-green-600 mb-1">Total Pagado</p>
              <p className="text-lg font-semibold text-green-700">{formatCurrency(totalPagado)}</p>
            </div>
            <div className={`p-3 rounded-lg text-center ${saldoPendiente > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
              <p className="text-xs text-slate-500 mb-1">Saldo Pendiente</p>
              <p className={`text-lg font-semibold ${saldoPendiente > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {formatCurrency(saldoPendiente)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Columna izquierda: Guías */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900">Guías</h3>
            <Button 
              size="sm" 
              onClick={() => setShowNewGuiaDialog(true)}
              className="bg-slate-800 hover:bg-slate-700"
            >
              <Plus className="h-4 w-4 mr-1" />
              Nueva Guía
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sublibros.map((sublibro) => {
              const cantidadItems = sublibro.items.length;

              return (
                <div
                  key={sublibro.id}
                  onClick={() => setSelectedSublibro(sublibro)}
                  className="p-4 bg-white border border-slate-200 rounded-lg hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-2 rounded-full">
                      <User className="h-5 w-5 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">{sublibro.nombre}</h4>
                      <p className="text-xs text-slate-500">{cantidadItems} servicio{cantidadItems !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Total acumulado</p>
                    <p className="text-xl font-bold text-slate-900">{formatCurrency(sublibro.totalGenerado)}</p>
                  </div>
                </div>
              );
            })}

            {sublibros.length === 0 && !loading && (
              <div className="col-span-2 text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                <User className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No hay guías registradas</p>
              </div>
            )}
          </div>
        </div>

        {/* Columna derecha: Pagos Generales */}
        <div className="space-y-4">
          <Card className="border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700">Pagos del Libro</CardTitle>
              {saldoPendiente > 0 && (
                <Button 
                  size="sm" 
                  onClick={() => setShowPagoDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="h-4 w-4 mr-1" />
                  Registrar
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {pagos.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <CreditCard className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">No hay pagos registrados</p>
                    <p className="text-xs text-slate-400 mt-1">Los pagos se registran aquí, no por guía</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pagos.map((pago) => (
                      <div key={pago.id} className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-slate-600">{formatDate(pago.fecha_pago)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-green-700">{formatCurrency(pago.monto)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-400 hover:text-red-500"
                              onClick={() => handleDeletePago(pago.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs capitalize">
                            {pago.metodo}
                          </Badge>
                          {pago.nota && <span className="text-xs text-slate-500 truncate">{pago.nota}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog nueva guía */}
      <Dialog open={showNewGuiaDialog} onOpenChange={setShowNewGuiaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Guía</DialogTitle>
            <DialogDescription>
              Crea una nueva guía para {libro.nombre}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateGuia} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="guiaName">Nombre del guía</Label>
              <Input
                id="guiaName"
                value={newGuiaName}
                onChange={(e) => setNewGuiaName(e.target.value)}
                placeholder="Ej: Pedro, Prisila, etc."
                required
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowNewGuiaDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-800 hover:bg-slate-700">
                Crear Guía
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog registrar pago general */}
      <Dialog open={showPagoDialog} onOpenChange={setShowPagoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago - {libro.nombre}</DialogTitle>
            <DialogDescription>
              Registra un pago general para todo el libro.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPago} className="space-y-4 mt-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Total General:</span>
                <span className="font-semibold">{formatCurrency(totalGeneral)}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-slate-600">Ya pagado:</span>
                <span className="font-semibold text-green-600">{formatCurrency(totalPagado)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">Saldo pendiente:</span>
                <span className="font-bold text-amber-600 text-lg">{formatCurrency(saldoPendiente)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Monto a pagar *</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max={saldoPendiente}
                placeholder={`Máximo: ${formatCurrency(saldoPendiente)}`}
                value={newPago.monto}
                onChange={(e) => setNewPago({ ...newPago, monto: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <select
                value={newPago.metodo}
                onChange={(e) => setNewPago({ ...newPago, metodo: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm"
              >
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="deposito">Depósito</option>
                <option value="cheque">Cheque</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Nota (opcional)</Label>
              <Input
                placeholder="Ej: Pago parcial, anticipo, etc."
                value={newPago.nota}
                onChange={(e) => setNewPago({ ...newPago, nota: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowPagoDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-green-600 hover:bg-green-700">
                Registrar Pago
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}