-- ============================================
-- Sistema de Gestión de Servicios - Tío Ñaño
-- SQL de inicialización para Supabase
-- ============================================

-- Tabla de Libros
CREATE TABLE IF NOT EXISTS libros (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente TEXT CHECK (cliente IN ('deep_blue', 'galakiwi')),
  parent_id UUID REFERENCES libros(id),
  numero_factura TEXT,
  nombre TEXT NOT NULL,
  estado TEXT DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado', 'pagado')),
  fecha_creacion DATE DEFAULT CURRENT_DATE,
  total_calculado NUMERIC DEFAULT 0,
  pagado NUMERIC DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de Items
CREATE TABLE IF NOT EXISTS items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  libro_id UUID REFERENCES libros(id) ON DELETE CASCADE,
  fecha DATE,
  descripcion TEXT NOT NULL,
  monto NUMERIC NOT NULL,
  aplica_10 BOOLEAN DEFAULT FALSE,
  monto_final NUMERIC GENERATED ALWAYS AS (
    monto + CASE WHEN aplica_10 THEN monto * 0.10 ELSE 0 END
  ) STORED,
  es_pendiente BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de Pagos (Deep Blue)
CREATE TABLE IF NOT EXISTS pagos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  libro_id UUID REFERENCES libros(id) ON DELETE CASCADE,
  fecha_pago DATE DEFAULT CURRENT_DATE,
  monto NUMERIC NOT NULL,
  metodo TEXT DEFAULT 'transferencia',
  nota TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Políticas de Seguridad (Row Level Security)
ALTER TABLE libros ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas para desarrollo
-- NOTA: En producción, reemplazar con políticas más restrictivas
CREATE POLICY IF NOT EXISTS "Allow all" ON libros FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all" ON items FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all" ON pagos FOR ALL USING (true);

-- ============================================
-- DATOS DE PRUEBA (Opcional - Eliminar en producción)
-- ============================================

-- Insertar libro de prueba para Deep Blue
INSERT INTO libros (cliente, nombre, numero_factura, estado) 
VALUES ('deep_blue', 'Enero 2026', 'FAC-DB-001', 'abierto')
ON CONFLICT DO NOTHING;

-- Insertar libro de prueba para Galakiwi
INSERT INTO libros (cliente, nombre, numero_factura, estado) 
VALUES ('galakiwi', 'Enero 2026', 'FAC-G-001', 'abierto')
ON CONFLICT DO NOTHING;
