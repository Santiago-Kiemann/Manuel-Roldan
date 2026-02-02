import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Trash2, FileText, Calendar, DollarSign } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Libro, Cliente } from '@/types/gestion';

interface ListaLibrosProps {
  libros: Libro[];
  selectedLibro: Libro | null;
  onSelectLibro: (libro: Libro) => void;
  cliente: Cliente;
  onLibroDeleted: () => void;
}

export function ListaLibros({ 
  libros, 
  selectedLibro, 
  onSelectLibro, 
  cliente, 
  onLibroDeleted 
}: ListaLibrosProps) {
  const [libroToDelete, setLibroToDelete] = useState<Libro | null>(null);

  const handleDelete = async () => {
    if (!libroToDelete) return;

    try {
      const { error } = await supabase
        .from('libros')
        .delete()
        .eq('id', libroToDelete.id);

      if (error) throw error;
      onLibroDeleted();
    } catch (error) {
      console.error('Error deleting libro:', error);
    } finally {
      setLibroToDelete(null);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const styles = {
      abierto: 'bg-blue-100 text-blue-800 border-blue-200',
      cerrado: 'bg-amber-100 text-amber-800 border-amber-200',
      pagado: 'bg-green-100 text-green-800 border-green-200',
    };
    return styles[estado as keyof typeof styles] || 'bg-slate-100 text-slate-800';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-EC', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <>
      <Card className="border-slate-200 h-full">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-slate-700">
            Libros {cliente === 'deep_blue' ? 'Deep Blue' : 'Galakiwi'}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {libros.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                <FileText className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                <p className="text-sm">No hay libros registrados</p>
              </div>
            ) : (
              <div className="space-y-1 p-2">
                {libros.map((libro) => (
                  <div
                    key={libro.id}
                    onClick={() => onSelectLibro(libro)}
                    className={`
                      relative p-3 rounded-lg cursor-pointer transition-all
                      ${selectedLibro?.id === libro.id 
                        ? 'bg-slate-800 text-white shadow-md' 
                        : 'bg-white hover:bg-slate-50 border border-slate-100'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className={`font-medium truncate ${
                            selectedLibro?.id === libro.id ? 'text-white' : 'text-slate-900'
                          }`}>
                            {libro.nombre}
                          </p>
                        </div>
                        
                        {libro.numero_factura && (
                          <p className={`text-xs mb-1 ${
                            selectedLibro?.id === libro.id ? 'text-slate-300' : 'text-slate-500'
                          }`}>
                            Factura: {libro.numero_factura}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-2 text-xs">
                          <span className={selectedLibro?.id === libro.id ? 'text-slate-300' : 'text-slate-500'}>
                            <Calendar className="h-3 w-3 inline mr-1" />
                            {formatDate(libro.fecha_creacion)}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-2">
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getEstadoBadge(libro.estado)}`}
                          >
                            {libro.estado === 'abierto' ? 'Abierto' : 
                             libro.estado === 'cerrado' ? 'Cerrado' : 'Pagado'}
                          </Badge>
                          
                          {cliente === 'deep_blue' && (
                            <span className={`text-xs font-medium ${
                              selectedLibro?.id === libro.id ? 'text-white' : 'text-slate-700'
                            }`}>
                              <DollarSign className="h-3 w-3 inline" />
                              {formatCurrency(libro.total_calculado - libro.pagado)}
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-7 w-7 ${
                          selectedLibro?.id === libro.id 
                            ? 'text-slate-300 hover:text-white hover:bg-slate-700' 
                            : 'text-slate-400 hover:text-red-500 hover:bg-red-50'
                        }`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setLibroToDelete(libro);
                        }}
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

      <AlertDialog open={!!libroToDelete} onOpenChange={() => setLibroToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar libro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el libro "{libroToDelete?.nombre}" 
              y todos sus items y pagos asociados. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
