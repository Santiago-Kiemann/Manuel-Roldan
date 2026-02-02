import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Plus, Trash2, User, Calendar, FileDown, ArrowLeft, Percent } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { exportGalakiwiToPDF } from './exportUtils';
import type { Libro, Item } from '@/types/gestion';

interface LibroGalakiwiProps {
  libro: Libro;
  onLibroUpdated: () => void;
}

interface SublibroConItems extends Libro {
  items: Item[];
}

export function LibroGalakiwi({ libro, onLibroUpdated }: LibroGalakiwiProps) {
  const [sublibros, setSublibros] = useState<SublibroConItems[]>([]);
  const [selectedSublibro, setSelectedSublibro] = useState<SublibroConItems | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [showNewGuiaDialog, setShowNewGuiaDialog] = useState(false);
  const [newGuiaName, setNewGuiaName] = useState('');
  const [newItem, setNewItem] = useState({ fecha: '', descripcion: '', monto: '', aplica_10: false });

  const fetchSublibros = useCallback(async () => {
    setLoading(true);
    try {
      // Obtener sublibros (guías)
      const { data: sublibrosData, error: sublibrosError } = await supabase
        .from('libros')
        .select('*')
        .eq('parent_id', libro.id)
        .order('nombre', { ascending: true });

      if (sublibrosError) throw sublibrosError;

      // Para cada sublibro, obtener sus items
      const sublibrosConItems: SublibroConItems[] = [];
      
      for (const sub of (sublibrosData || [])) {
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('*')
          .eq('libro_id', sub.id)
          .order('fecha', { ascending: true });

        if (itemsError) throw itemsError;

        sublibrosConItems.push({
          ...sub,
          items: itemsData || [],
        });
      }

      setSublibros(sublibrosConItems);
    } catch (error) {
      console.error('Error fetching sublibros:', error);
    } finally {
      setLoading(false);
    }
  }, [libro.id]);

  useEffect(() => {
    fetchSublibros();
  }, [fetchSublibros]);

  // Calcular totales
  const calcularTotalSublibro = (sublibro: SublibroConItems) => {
    return sublibro.items.reduce((sum, item) => sum + item.monto_final, 0);
  };

  const calcularTotalGeneral = () => {
    return sublibros.reduce((sum, sub) => sum + calcularTotalSublibro(sub), 0);
  };

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
      fetchSublibros();
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
      fetchSublibros();
      onLibroUpdated();
    } catch (error) {
      console.error('Error adding item:', error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    
    try {
      const { error } = await supabase.from('items').delete().eq('id', itemId);
      if (error) throw error;
      fetchSublibros();
      onLibroUpdated();
    } catch (error) {
      console.error('Error deleting item:', error);
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
      
      fetchSublibros();
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

  // Vista de detalle de un sublibro (guía)
  if (selectedSublibro) {
    const totalSublibro = calcularTotalSublibro(selectedSublibro);

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
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total Guía</p>
                  <p className="text-xl font-bold text-slate-900">{formatCurrency(totalSublibro)}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-slate-400 hover:text-red-500"
                  onClick={() => handleDeleteGuia(selectedSublibro.id)}
                >
                  <Trash2 className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Formulario para agregar item */}
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

        {/* Lista de items */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium text-slate-700">Servicios de {selectedSublibro.nombre}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => exportGalakiwiToPDF(libro, sublibros, selectedSublibro)}>
                <FileDown className="h-4 w-4 mr-1" />
                PDF
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[350px]">
              {selectedSublibro.items.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No hay servicios registrados para esta guía</p>
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
                            <p className="text-xs text-slate-500">
                              Base: {formatCurrency(item.monto)}
                            </p>
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

  // Vista principal: Grid de guías
  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="border-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg text-slate-900">{libro.nombre}</CardTitle>
              {libro.numero_factura && (
                <p className="text-sm text-slate-500">Factura: {libro.numero_factura}</p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-500">Total General</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(calcularTotalGeneral())}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Grid de guías */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Botón de nueva guía */}
        <button
          onClick={() => setShowNewGuiaDialog(true)}
          className="flex flex-col items-center justify-center p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg hover:bg-slate-100 hover:border-slate-400 transition-colors min-h-[140px]"
        >
          <Plus className="h-8 w-8 text-slate-400 mb-2" />
          <span className="text-sm font-medium text-slate-600">Nueva Guía</span>
        </button>

        {/* Tarjetas de guías */}
        {sublibros.map((sublibro) => {
          const total = calcularTotalSublibro(sublibro);
          const cantidadItems = sublibro.items.length;

          return (
            <div
              key={sublibro.id}
              onClick={() => setSelectedSublibro(sublibro)}
              className="p-5 bg-white border border-slate-200 rounded-lg hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-slate-100 p-2 rounded-full">
                    <User className="h-5 w-5 text-slate-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{sublibro.nombre}</h3>
                    <p className="text-xs text-slate-500">{cantidadItems} servicio{cantidadItems !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-1">Total acumulado</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(total)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {sublibros.length === 0 && !loading && (
        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <User className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No hay guías registradas</p>
          <p className="text-sm text-slate-400 mt-1">Haz clic en "Nueva Guía" para comenzar</p>
        </div>
      )}

      {/* Dialog para nueva guía */}
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
                placeholder="Ej: Tim, Pepo, etc."
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
    </div>
  );
}
