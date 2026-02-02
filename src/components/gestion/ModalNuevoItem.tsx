import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/types/gestion';

interface ModalNuevoItemProps {
  isOpen: boolean;
  onClose: () => void;
  onItemCreated: () => void;
  libroId: string;
  cliente: Cliente;
}

export function ModalNuevoItem({ isOpen, onClose, onItemCreated, libroId, cliente }: ModalNuevoItemProps) {
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    monto: '',
    aplica_10: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setFormData({
      fecha: new Date().toISOString().split('T')[0],
      descripcion: '',
      monto: '',
      aplica_10: false,
    });
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase.from('items').insert({
        libro_id: libroId,
        fecha: formData.fecha,
        descripcion: formData.descripcion.trim(),
        monto: parseFloat(formData.monto),
        aplica_10: cliente === 'galakiwi' ? formData.aplica_10 : false,
      });

      if (insertError) throw insertError;

      resetForm();
      onItemCreated();
    } catch (err: any) {
      console.error('Error creating item:', err);
      setError(err.message || 'Error al crear el item');
    } finally {
      setLoading(false);
    }
  };

  const montoFinal = formData.aplica_10 && formData.monto 
    ? parseFloat(formData.monto) * 1.1 
    : parseFloat(formData.monto || '0');

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            Nuevo Servicio
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Agrega un nuevo servicio al libro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fecha" className="text-slate-700">
              Fecha <span className="text-red-500">*</span>
            </Label>
            <Input
              id="fecha"
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="border-slate-300"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descripcion" className="text-slate-700">
              Descripción <span className="text-red-500">*</span>
            </Label>
            <Input
              id="descripcion"
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              placeholder="Descripción del servicio"
              className="border-slate-300"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monto" className="text-slate-700">
              Monto Base <span className="text-red-500">*</span>
            </Label>
            <Input
              id="monto"
              type="number"
              step="0.01"
              min="0"
              value={formData.monto}
              onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
              placeholder="0.00"
              className="border-slate-300"
              required
            />
          </div>

          {cliente === 'galakiwi' && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="aplica_10"
                checked={formData.aplica_10}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, aplica_10: checked as boolean })
                }
              />
              <Label htmlFor="aplica_10" className="text-slate-700 cursor-pointer">
                Aplicar 10% de comisión
              </Label>
            </div>
          )}

          {formData.aplica_10 && formData.monto && (
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm text-purple-800">
                <span className="font-medium">Monto final con 10%:</span>{' '}
                ${montoFinal.toFixed(2)}
              </p>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.descripcion.trim() || !formData.monto}
              className="bg-slate-800 hover:bg-slate-700"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
