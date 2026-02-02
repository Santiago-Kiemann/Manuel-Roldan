import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, DollarSign, Calendar, Check, FileDown, CreditCard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportDeepBlueToHTML, exportDeepBlueToExcel } from './exportUtils';
import type { Libro, Item, Pago } from '@/types/gestion';

interface LibroDeepBlueProps {
  libro: Libro;
  onLibroUpdated: () => void;
}

export function LibroDeepBlue({ libro, onLibroUpdated }: LibroDeepBlueProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [, setLoading] = useState(true);
  
  // Form states
  const [newItem, setNewItem] = useState({ fecha: '', descripcion: '', monto: '' });
  const [newPago, setNewPago] = useState({ monto: '', metodo: 'transferencia', nota: '' });
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeData, setCloseData] = useState({ pagado: '', metodo: 'transferencia', nota: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [itemsRes, pagosRes] = await Promise.all([
        supabase.from('items').select('*').eq('libro_id', libro.id).order('fecha', { ascending: true }),
        supabase.from('pagos').select('*').eq('libro_id', libro.id).order('fecha_pago', { ascending: true }),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (pagosRes.error) throw pagosRes.error;

      setItems(itemsRes.data || []);
      setPagos(pagosRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [libro.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalItems = items.reduce((sum, item) => sum + item.monto, 0);
  const totalPagos = pagos.reduce((sum, pago) => sum + pago.monto, 0);
  const saldoPendiente = totalItems - totalPagos;

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.fecha || !newItem.descripcion || !newItem.monto) return;

    try {
      const { error } = await supabase.from('items').insert({
        libro_id: libro.id,
        fecha: newItem.fecha,
        descripcion: newItem.descripcion,
        monto: parseFloat(newItem.monto),
        aplica_10: false,
      });

      if (error) throw error;

      setNewItem({ fecha: '', descripcion: '', monto: '' });
      fetchData();
      onLibroUpdated();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

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
        libro_id: libro.id,
        monto: montoPago,
        metodo: newPago.metodo,
        nota: newPago.nota || null,
      });

      if (error) throw error;

      if (montoPago >= saldoPendiente) {
        await supabase.from('libros').update({ estado: 'pagado' }).eq('id', libro.id);
      }

      setNewPago({ monto: '', metodo: 'transferencia', nota: '' });
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

  const handleCloseLibro = async (e: React.FormEvent) => {
    e.preventDefault();
    const montoCierre = parseFloat(closeData.pagado);
    
    if (montoCierre > saldoPendiente) {
      alert('El monto no puede ser mayor al saldo pendiente');
      return;
    }

    try {
      if (montoCierre > 0) {
        await supabase.from('pagos').insert({
          libro_id: libro.id,
          monto: montoCierre,
          metodo: closeData.metodo,
          nota: closeData.nota || 'Pago de cierre',
        });
      }

      const nuevoSaldo = saldoPendiente - montoCierre;

      if (nuevoSaldo > 0) {
        const { data: newLibro } = await supabase
          .from('libros')
          .insert({
            cliente: 'deep_blue',
            nombre: `${libro.nombre} - Saldo Pendiente`,
            estado: 'abierto',
          })
          .select()
          .single();

        if (newLibro) {
          await supabase.from('items').insert({
            libro_id: newLibro.id,
            descripcion: `Saldo pendiente de ${libro.nombre}`,
            monto: nuevoSaldo,
            es_pendiente: true,
          });
        }

        await supabase.from('libros').update({ estado: 'cerrado' }).eq('id', libro.id);
      } else {
        await supabase.from('libros').update({ estado: 'pagado' }).eq('id', libro.id);
      }

      setShowCloseDialog(false);
      onLibroUpdated();
    } catch (error) {
      console.error('Error closing libro:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Header con resumen */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-slate-900">{libro.nombre}</CardTitle>
              {libro.numero_factura && (
                <p className="text-sm text-slate-500">Factura: {libro.numero_factura}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={libro.estado === 'abierto' ? 'bg-blue-100 text-blue-800' : 
                           libro.estado === 'pagado' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}
              >
                {libro.estado === 'abierto' ? 'Abierto' : libro.estado === 'pagado' ? 'Pagado' : 'Cerrado'}
              </Badge>
              {libro.estado === 'abierto' && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowCloseDialog(true)}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Cerrar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Total Servicios</p>
              <p className="text-lg font-semibold text-slate-900">{formatCurrency(totalItems)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Total Pagado</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(totalPagos)}</p>
            </div>
            <div className={`p-3 rounded-lg ${saldoPendiente > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
              <p className="text-xs text-slate-500 mb-1">Saldo Pendiente</p>
              <p className={`text-lg font-semibold ${saldoPendiente > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                {formatCurrency(saldoPendiente)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="servicios" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white border border-slate-200">
          <TabsTrigger value="servicios" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
            Servicios
          </TabsTrigger>
          <TabsTrigger value="pagos" className="data-[state=active]:bg-slate-800 data-[state=active]:text-white">
            Pagos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="servicios" className="space-y-4">
          {libro.estado === 'abierto' && (
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-700">Agregar Servicio</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddItem} className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <Input
                      type="date"
                      value={newItem.fecha}
                      onChange={(e) => setNewItem({ ...newItem, fecha: e.target.value })}
                      required
                      className="border-slate-300"
                    />
                  </div>
                  <div className="col-span-5">
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
                      placeholder="Monto"
                      value={newItem.monto}
                      onChange={(e) => setNewItem({ ...newItem, monto: e.target.value })}
                      required
                      className="border-slate-300"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button type="submit" className="w-full bg-slate-800 hover:bg-slate-700">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-700">Lista de Servicios</CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportDeepBlueToHTML(libro, items, pagos)}
                  className="bg-blue-900 text-white hover:bg-blue-800"
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  Ver / Imprimir
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => exportDeepBlueToExcel(libro, items, pagos)}
                >
                  <FileDown className="h-4 w-4 mr-1" />
                  Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {items.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No hay servicios registrados</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <span className="text-sm text-slate-600">{formatDate(item.fecha)}</span>
                          </div>
                          <p className="font-medium text-slate-900 mt-1">{item.descripcion}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-900">{formatCurrency(item.monto)}</span>
                          {libro.estado === 'abierto' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-500"
                              onClick={() => handleDeleteItem(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pagos" className="space-y-4">
          {libro.estado === 'abierto' && saldoPendiente > 0 && (
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-slate-700">Registrar Pago</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddPago} className="grid grid-cols-12 gap-3">
                  <div className="col-span-3">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={saldoPendiente}
                      placeholder="Monto"
                      value={newPago.monto}
                      onChange={(e) => setNewPago({ ...newPago, monto: e.target.value })}
                      required
                      className="border-slate-300"
                    />
                  </div>
                  <div className="col-span-3">
                    <select
                      value={newPago.metodo}
                      onChange={(e) => setNewPago({ ...newPago, metodo: e.target.value })}
                      className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm"
                    >
                      <option value="transferencia">Transferencia</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="cheque">Cheque</option>
                      <option value="deposito">Depósito</option>
                    </select>
                  </div>
                  <div className="col-span-5">
                    <Input
                      placeholder="Nota (opcional)"
                      value={newPago.nota}
                      onChange={(e) => setNewPago({ ...newPago, nota: e.target.value })}
                      className="border-slate-300"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                      <DollarSign className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-700">Historial de Pagos</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {pagos.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <p>No hay pagos registrados</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pagos.map((pago) => (
                      <div key={pago.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-green-600" />
                            <span className="text-sm text-slate-600">{formatDate(pago.fecha_pago)}</span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {pago.metodo}
                            </Badge>
                          </div>
                          {pago.nota && <p className="text-sm text-slate-500 mt-1">{pago.nota}</p>}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-green-700">{formatCurrency(pago.monto)}</span>
                          {libro.estado === 'abierto' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-500"
                              onClick={() => handleDeletePago(pago.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de cierre */}
      <Dialog open={showCloseDialog} onOpenChange={setShowCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cerrar Libro</DialogTitle>
            <DialogDescription>
              Registra el pago final para cerrar este libro. Si hay saldo pendiente, se creará un nuevo libro automáticamente.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCloseLibro} className="space-y-4 mt-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-600">Total Servicios:</span>
                <span className="font-medium">{formatCurrency(totalItems)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-600">Total Pagado:</span>
                <span className="font-medium text-green-600">{formatCurrency(totalPagos)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between">
                <span className="text-sm font-medium text-slate-700">Saldo Pendiente:</span>
                <span className="font-bold text-amber-600">{formatCurrency(saldoPendiente)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Monto a pagar</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max={saldoPendiente}
                placeholder={`Máximo: ${formatCurrency(saldoPendiente)}`}
                value={closeData.pagado}
                onChange={(e) => setCloseData({ ...closeData, pagado: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Método de pago</Label>
              <select
                value={closeData.metodo}
                onChange={(e) => setCloseData({ ...closeData, metodo: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-slate-300 bg-white text-sm"
              >
                <option value="transferencia">Transferencia</option>
                <option value="efectivo">Efectivo</option>
                <option value="cheque">Cheque</option>
                <option value="deposito">Depósito</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Nota</Label>
              <Input
                placeholder="Nota opcional"
                value={closeData.nota}
                onChange={(e) => setCloseData({ ...closeData, nota: e.target.value })}
              />
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCloseDialog(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-slate-800 hover:bg-slate-700">
                Cerrar Libro
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}