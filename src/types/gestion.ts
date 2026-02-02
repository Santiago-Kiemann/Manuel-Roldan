export type Cliente = 'deep_blue' | 'galakiwi';
export type EstadoLibro = 'abierto' | 'cerrado' | 'pagado';

export interface Libro {
  id: string;
  cliente: Cliente;
  parent_id: string | null;
  numero_factura: string | null;
  nombre: string;
  estado: EstadoLibro;
  fecha_creacion: string;
  total_calculado: number;
  pagado: number;
  created_at: string;
}

export interface Item {
  id: string;
  libro_id: string;
  fecha: string | null;
  descripcion: string;
  monto: number;
  aplica_10: boolean;
  monto_final: number;
  es_pendiente: boolean;
  created_at: string;
}

export interface Pago {
  id: string;
  libro_id: string;
  fecha_pago: string;
  monto: number;
  metodo: string;
  nota: string | null;
  created_at: string;
}

export interface LibroConItems extends Libro {
  items: Item[];
  pagos: Pago[];
  sublibros?: LibroConItems[];
}

export interface NuevoLibroData {
  cliente: Cliente;
  nombre: string;
  numero_factura?: string;
  parent_id?: string | null;
}

export interface NuevoItemData {
  libro_id: string;
  fecha: string;
  descripcion: string;
  monto: number;
  aplica_10?: boolean;
}

export interface NuevoPagoData {
  libro_id: string;
  monto: number;
  metodo?: string;
  nota?: string;
}
