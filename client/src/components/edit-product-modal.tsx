import { useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidateRelatedQueries } from "@/lib/queryClient";
import type { Product, WarehouseZone, Supplier, InsertProduct } from "@shared/schema";

interface EditProductModalProps {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProductModal({ product, open, onOpenChange }: EditProductModalProps) {
  const { isMobile } = useDeviceDetection();
  const [formData, setFormData] = useState({
    name: product.name,
    sku: product.sku,
    description: product.description || "",
    category: product.category,
    currentStock: product.currentStock.toString(),
    minStock: product.minStock.toString(),
    unitPrice: product.unitPrice?.toString() || "",
    warehouseZoneId: product.warehouseZoneId?.toString() || "unassigned",
    supplierId: product.supplierId?.toString() || "unassigned",
    reorderPoint: product.reorderPoint?.toString() || "",
    safetyStock: product.safetyStock?.toString() || "",
    orderQuantity: product.orderQuantity?.toString() || ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Product>) => {
      const response = await apiRequest("PATCH", `/api/products/${product.id}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products/low-stock"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({
        title: "Producto actualizado",
        description: "El producto se ha actualizado correctamente.",
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast({
        title: "Error",
        description: error?.message || "No se pudo actualizar el producto.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.name.trim() || !formData.sku.trim() || !formData.category.trim()) {
      toast({
        title: "Error",
        description: "Los campos nombre, SKU y categoría son obligatorios",
        variant: "destructive",
      });
      return;
    }

    const updateData: Partial<Product> = {
      name: formData.name.trim(),
      sku: formData.sku.trim(),
      description: formData.description?.trim() || "",
      category: formData.category.trim(),
      currentStock: parseInt(formData.currentStock) || 0,
      minStock: parseInt(formData.minStock) || 0,
      unitPrice: formData.unitPrice ? formData.unitPrice.toString() : null,
      warehouseZoneId: formData.warehouseZoneId && formData.warehouseZoneId !== "unassigned" ? parseInt(formData.warehouseZoneId) : null,
      supplierId: formData.supplierId && formData.supplierId !== "unassigned" ? parseInt(formData.supplierId) : null,
      reorderPoint: formData.reorderPoint ? parseInt(formData.reorderPoint) : null,
      safetyStock: formData.safetyStock ? parseInt(formData.safetyStock) : null,
      orderQuantity: formData.orderQuantity ? parseInt(formData.orderQuantity) : null
    };

    updateMutation.mutate(updateData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${
          isMobile 
            ? 'max-w-[95vw] max-h-[95vh] w-full mx-2' 
            : 'max-w-2xl max-h-[90vh]'
        } overflow-y-auto`}
        data-testid="modal-edit-product"
      >
        <DialogHeader className={isMobile ? 'pb-2' : ''}>
          <DialogTitle className={isMobile ? 'text-base' : 'text-lg'}>Editar Producto</DialogTitle>
          <DialogDescription className={isMobile ? 'text-sm' : ''}>
            Modifica las características y detalles del producto seleccionado.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className={isMobile ? 'space-y-3' : 'space-y-4'}>
          <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-2' : ''} ${isMobile ? 'gap-3' : 'gap-4'}`}>
            <div className="space-y-2">
              <Label htmlFor="name" className={isMobile ? 'text-sm font-medium' : ''}>Nombre del producto *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Nombre del producto"
                className={isMobile ? 'h-12 text-base' : ''}
                data-testid="input-edit-product-name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="sku" className={isMobile ? 'text-sm font-medium' : ''}>SKU *</Label>
              <Input
                id="sku"
                value={formData.sku}
                onChange={(e) => handleInputChange("sku", e.target.value)}
                placeholder="SKU del producto"
                className={isMobile ? 'h-12 text-base' : ''}
                data-testid="input-edit-product-sku"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className={isMobile ? 'text-sm font-medium' : ''}>Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Descripción del producto"
              rows={isMobile ? 2 : 3}
              className={isMobile ? 'text-base' : ''}
              data-testid="textarea-edit-product-description"
            />
          </div>

          <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-2' : ''} ${isMobile ? 'gap-3' : 'gap-4'}`}>
            <div className="space-y-2">
              <Label htmlFor="category" className={isMobile ? 'text-sm font-medium' : ''}>Categoría *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleInputChange("category", e.target.value)}
                placeholder="Categoría"
                className={isMobile ? 'h-12 text-base' : ''}
                data-testid="input-edit-product-category"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unitPrice" className={isMobile ? 'text-sm font-medium' : ''}>Precio unitario</Label>
              <Input
                id="unitPrice"
                type="number"
                step="0.01"
                min="0"
                value={formData.unitPrice}
                onChange={(e) => handleInputChange("unitPrice", e.target.value)}
                placeholder="0.00"
                className={isMobile ? 'h-12 text-base' : ''}
                data-testid="input-edit-product-unit-price"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-3' : 'md:grid-cols-2'} ${isMobile ? 'gap-3' : 'gap-4'}`}>
            <div className="space-y-2">
              <Label htmlFor="currentStock" className={isMobile ? 'text-sm font-medium' : ''}>Stock actual *</Label>
              <Input
                id="currentStock"
                type="number"
                min="0"
                value={formData.currentStock}
                onChange={(e) => handleInputChange("currentStock", e.target.value)}
                className={isMobile ? 'h-12 text-base' : ''}
                data-testid="input-edit-current-stock"
                inputMode="numeric"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock" className={isMobile ? 'text-sm font-medium' : ''}>Stock mínimo *</Label>
              <Input
                id="minStock"
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => handleInputChange("minStock", e.target.value)}
                className={isMobile ? 'h-12 text-base' : ''}
                data-testid="input-edit-min-stock"
                inputMode="numeric"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reorderPoint" className={isMobile ? 'text-sm font-medium' : ''}>Punto de reorden</Label>
              <Input
                id="reorderPoint"
                type="number"
                min="0"
                value={formData.reorderPoint}
                onChange={(e) => handleInputChange("reorderPoint", e.target.value)}
                placeholder="Opcional"
                className={isMobile ? 'h-12 text-base' : ''}
                data-testid="input-edit-reorder-point"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-2' : ''} ${isMobile ? 'gap-3' : 'gap-4'}`}>
            <div className="space-y-2">
              <Label htmlFor="safetyStock" className={isMobile ? 'text-sm font-medium' : ''}>Stock de seguridad</Label>
              <Input
                id="safetyStock"
                type="number"
                min="0"
                value={formData.safetyStock}
                onChange={(e) => handleInputChange("safetyStock", e.target.value)}
                placeholder="Opcional"
                className={isMobile ? 'h-12 text-base' : ''}
                data-testid="input-edit-safety-stock"
                inputMode="numeric"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="orderQuantity" className={isMobile ? 'text-sm font-medium' : ''}>Cantidad de pedido</Label>
              <Input
                id="orderQuantity"
                type="number"
                min="1"
                value={formData.orderQuantity}
                onChange={(e) => handleInputChange("orderQuantity", e.target.value)}
                placeholder="Cantidad típica de pedido"
                className={isMobile ? 'h-12 text-base' : ''}
                data-testid="input-edit-order-quantity"
                inputMode="numeric"
              />
            </div>
          </div>

          <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-2' : ''} ${isMobile ? 'gap-3' : 'gap-4'}`}>
            <div className="space-y-2">
              <Label htmlFor="warehouseZoneId" className={isMobile ? 'text-sm font-medium' : ''}>Zona de almacén</Label>
              <Select value={formData.warehouseZoneId} onValueChange={(value) => handleInputChange("warehouseZoneId", value)}>
                <SelectTrigger 
                  className={isMobile ? 'h-12 text-base' : ''}
                  data-testid="select-edit-warehouse-zone"
                >
                  <SelectValue placeholder="Seleccionar zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" data-testid="option-zone-unassigned">Sin asignar</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id.toString()} data-testid={`option-zone-${zone.id}`}>
                      {zone.name} ({zone.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="supplierId" className={isMobile ? 'text-sm font-medium' : ''}>Proveedor</Label>
              <Select value={formData.supplierId} onValueChange={(value) => handleInputChange("supplierId", value)}>
                <SelectTrigger 
                  className={isMobile ? 'h-12 text-base' : ''}
                  data-testid="select-edit-supplier"
                >
                  <SelectValue placeholder="Seleccionar proveedor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned" data-testid="option-supplier-unassigned">Sin asignar</SelectItem>
                  {suppliers.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()} data-testid={`option-supplier-${supplier.id}`}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="orderQuantity" className={isMobile ? 'text-sm font-medium' : ''}>Cantidad de pedido</Label>
            <Input
              id="orderQuantity"
              type="number"
              min="1"
              value={formData.orderQuantity}
              onChange={(e) => handleInputChange("orderQuantity", e.target.value)}
              placeholder="Cantidad típica de pedido"
              className={isMobile ? 'h-12 text-base' : ''}
              data-testid="input-edit-order-quantity"
              inputMode="numeric"
            />
          </div>

          <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'justify-end space-x-2'} pt-4`}>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
              className={isMobile ? 'w-full h-12 text-base' : ''}
              data-testid="button-cancel-edit-product"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={updateMutation.isPending}
              className={isMobile ? 'w-full h-12 text-base' : ''}
              data-testid="button-submit-edit-product"
            >
              {updateMutation.isPending ? "Actualizando..." : "Actualizar producto"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}