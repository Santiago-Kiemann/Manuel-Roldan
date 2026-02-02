import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, BookOpen, RefreshCw } from 'lucide-react';
import { ListaLibros } from './ListaLibros';
import { LibroDeepBlue } from './LibroDeepBlue';
import { LibroGalakiwi } from './LibroGalakiwi';
import { ModalNuevoLibro } from './ModalNuevoLibro';
import { supabase } from '@/lib/supabase';
import type { Libro, Cliente } from '@/types/gestion';

export function GestionPage() {
  const [activeTab, setActiveTab] = useState<Cliente>('deep_blue');
  const [librosDeepBlue, setLibrosDeepBlue] = useState<Libro[]>([]);
  const [librosGalakiwi, setLibrosGalakiwi] = useState<Libro[]>([]);
  const [selectedLibro, setSelectedLibro] = useState<Libro | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchLibros = async () => {
    setLoading(true);
    try {
      const { data: deepBlueData, error: deepBlueError } = await supabase
        .from('libros')
        .select('*')
        .eq('cliente', 'deep_blue')
        .is('parent_id', null)
        .order('fecha_creacion', { ascending: false });

      if (deepBlueError) throw deepBlueError;
      setLibrosDeepBlue(deepBlueData || []);

      const { data: galakiwiData, error: galakiwiError } = await supabase
        .from('libros')
        .select('*')
        .eq('cliente', 'galakiwi')
        .is('parent_id', null)
        .order('fecha_creacion', { ascending: false });

      if (galakiwiError) throw galakiwiError;
      setLibrosGalakiwi(galakiwiData || []);
    } catch (error) {
      console.error('Error fetching libros:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibros();
  }, []);

  const handleLibroCreated = () => {
    fetchLibros();
    setIsModalOpen(false);
  };

  const handleLibroDeleted = () => {
    fetchLibros();
    setSelectedLibro(null);
  };

  const handleLibroUpdated = () => {
    fetchLibros();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-slate-800 p-2 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">Sistema de Gestión</h1>
                <p className="text-sm text-slate-500">Tío Ñaño - Libros de Servicios</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchLibros}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Cliente)} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2 bg-white border border-slate-200">
            <TabsTrigger 
              value="deep_blue"
              className="data-[state=active]:bg-slate-800 data-[state=active]:text-white"
            >
              Deep Blue
            </TabsTrigger>
            <TabsTrigger 
              value="galakiwi"
              className="data-[state=active]:bg-slate-800 data-[state=active]:text-white"
            >
              Galakiwi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deep_blue" className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      Libros Deep Blue
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Gestión de saldos y pagos parciales
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Libro
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <ListaLibros
                      libros={librosDeepBlue}
                      selectedLibro={selectedLibro}
                      onSelectLibro={setSelectedLibro}
                      cliente="deep_blue"
                      onLibroDeleted={handleLibroDeleted}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    {selectedLibro && selectedLibro.cliente === 'deep_blue' ? (
                      <LibroDeepBlue
                        libro={selectedLibro}
                        onLibroUpdated={handleLibroUpdated}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-96 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-slate-500 text-center">
                          Selecciona un libro para ver los detalles
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="galakiwi" className="space-y-4">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold text-slate-900">
                      Libros Galakiwi
                    </CardTitle>
                    <p className="text-sm text-slate-500 mt-1">
                      Gestión de guías con comisión 10%
                    </p>
                  </div>
                  <Button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-slate-800 hover:bg-slate-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Libro
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1">
                    <ListaLibros
                      libros={librosGalakiwi}
                      selectedLibro={selectedLibro}
                      onSelectLibro={setSelectedLibro}
                      cliente="galakiwi"
                      onLibroDeleted={handleLibroDeleted}
                    />
                  </div>
                  <div className="lg:col-span-2">
                    {selectedLibro && selectedLibro.cliente === 'galakiwi' ? (
                      <LibroGalakiwi
                        libro={selectedLibro}
                        onLibroUpdated={handleLibroUpdated}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-96 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <BookOpen className="h-12 w-12 text-slate-300 mb-4" />
                        <p className="text-slate-500 text-center">
                          Selecciona un libro para ver los detalles
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <ModalNuevoLibro
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLibroCreated={handleLibroCreated}
        cliente={activeTab}
      />
    </div>
  );
}
