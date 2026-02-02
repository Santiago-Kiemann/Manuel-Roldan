import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import type { Cliente } from '@/types/gestion';

interface ModalNuevoLibroProps {
  isOpen: boolean;
  onClose: () => void;
  onLibroCreated: () => void;
  cliente: Cliente;
}

export function ModalNuevoLibro({ isOpen, onClose, onLibroCreated, cliente }: ModalNuevoLibroProps) {
  const [nombre, setNombre] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setNombre('');
    setNumeroFactura('');
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
      // Validar que solo haya un libro abierto para Deep Blue
      if (cliente === 'deep_blue') {
        const { data: librosAbiertos, error: checkError } = await supabase
          .from('libros')
          .select('id')
          .eq('cliente', 'deep_blue')
          .eq('estado', 'abierto')
          .is('parent_id', null);

        if (checkError) throw checkError;

        if (librosAbiertos && librosAbiertos.length > 0) {
          setError('Ya existe un libro abierto para Deep Blue. Debes cerrarlo antes de crear uno nuevo.');
          setLoading(false);
          return;
        }
      }

      const { error: insertError } = await supabase
        .from('libros')
        .insert({
          cliente,
          nombre: nombre.trim(),
          numero_factura: numeroFactura.trim() || null,
          estado: 'abierto',
          parent_id: null,
        });

      if (insertError) throw insertError;

      resetForm();
      onLibroCreated();
    } catch (err: any) {
      console.error('Error creating libro:', err);
      setError(err.message || 'Error al crear el libro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            Nuevo Libro - {cliente === 'deep_blue' ? 'Deep Blue' : 'Galakiwi'}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            Crea un nuevo libro de servicios para {cliente === 'deep_blue' ? 'gestionar saldos y pagos' : 'gestionar guías'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="nombre" className="text-slate-700">
              Nombre del libro <span className="text-red-500">*</span>
            </Label>
            <Input
              id="nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={cliente === 'deep_blue' ? 'Ej: Enero 2026' : 'Ej: Enero 2026'}
              className="border-slate-300"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="numero_factura" className="text-slate-700">
              Número de Factura (opcional)
            </Label>
            <Input
              id="numero_factura"
              value={numeroFactura}
              onChange={(e) => setNumeroFactura(e.target.value)}
              placeholder="Ej: FAC-001-2026"
              className="border-slate-300"
            />
          </div>

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
              disabled={loading || !nombre.trim()}
              className="bg-slate-800 hover:bg-slate-700"
            >
              {loading ? 'Creando...' : 'Crear Libro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
