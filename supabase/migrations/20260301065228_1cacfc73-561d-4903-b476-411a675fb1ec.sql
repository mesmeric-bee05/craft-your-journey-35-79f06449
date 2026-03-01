
-- Product category enum
CREATE TYPE public.product_category AS ENUM ('fashion', 'food_beverage', 'electronics', 'beauty', 'general_merchandise', 'other');

-- Stock movement type enum
CREATE TYPE public.stock_movement_type AS ENUM ('sale', 'restock', 'adjustment', 'loss');

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  product_categories TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  category public.product_category NOT NULL DEFAULT 'other',
  buying_price NUMERIC NOT NULL DEFAULT 0,
  selling_price NUMERIC NOT NULL DEFAULT 0,
  current_stock INTEGER NOT NULL DEFAULT 0,
  reorder_level INTEGER NOT NULL DEFAULT 5,
  unit TEXT NOT NULL DEFAULT 'pieces',
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Stock movements table
CREATE TABLE public.stock_movements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  movement_type public.stock_movement_type NOT NULL,
  quantity_change INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  note TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- Suppliers RLS
CREATE POLICY "Business members can view suppliers"
  ON public.suppliers FOR SELECT
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can manage suppliers"
  ON public.suppliers FOR ALL
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

-- Products RLS
CREATE POLICY "Business members can view products"
  ON public.products FOR SELECT
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can manage products"
  ON public.products FOR ALL
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

-- Stock movements RLS
CREATE POLICY "Business members can view stock movements"
  ON public.stock_movements FOR SELECT
  USING (is_business_member(auth.uid(), business_id) OR is_admin(auth.uid()));

CREATE POLICY "Business members can create stock movements"
  ON public.stock_movements FOR INSERT
  WITH CHECK (is_business_member(auth.uid(), business_id) AND created_by = auth.uid());

-- Indexes
CREATE INDEX idx_products_business ON public.products(business_id);
CREATE INDEX idx_products_supplier ON public.products(supplier_id);
CREATE INDEX idx_products_category ON public.products(category);
CREATE INDEX idx_products_low_stock ON public.products(business_id) WHERE current_stock <= reorder_level;
CREATE INDEX idx_suppliers_business ON public.suppliers(business_id);
CREATE INDEX idx_stock_movements_product ON public.stock_movements(product_id);
CREATE INDEX idx_stock_movements_business ON public.stock_movements(business_id);
CREATE INDEX idx_stock_movements_type ON public.stock_movements(movement_type);

-- Triggers for updated_at
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
