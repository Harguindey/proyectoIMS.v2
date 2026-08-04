import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidateRelatedQueries } from "@/lib/queryClient";
import type { Supplier, InsertSupplier } from "@shared/schema";

interface EditSupplierModalProps {
  supplier: Supplier;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditSupplierModal({ supplier, open, onOpenChange }: EditSupplierModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    leadTimeDays: "",
    reliability: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset form when supplier changes
  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || "",
        contactEmail: supplier.contactEmail || "",
        contactPhone: supplier.contactPhone || "",
        address: supplier.address || "",
        leadTimeDays: supplier.leadTimeDays?.toString() || "7",
        reliability: supplier.reliability || "95.00"
      });
    }
  }, [supplier]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Supplier>) => {
      return await apiRequest("PATCH", `/api/suppliers/${supplier.id}`, data);
    },
    onSuccess: async () => {
      await invalidateRelatedQueries("suppliers");
      toast({
        title: "Proveedor actualizado",
        description: "Los datos del proveedor se han actualizado correctamente.",
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo actualizar el proveedor.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const supplierData: Partial<Supplier> = {
      name: formData.name,
      contactEmail: formData.contactEmail || null,
      contactPhone: formData.contactPhone || null,
      address: formData.address || null,
      leadTimeDays: parseInt(formData.leadTimeDays) || 7,
      reliability: formData.reliability || "95.00"
    };

    updateMutation.mutate(supplierData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Proveedor</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nombre del proveedor *</Label>
            <Input
              id="edit-name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Nombre de la empresa"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-contactEmail">Email de contacto</Label>
              <Input
                id="edit-contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                placeholder="contacto@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-contactPhone">Teléfono de contacto</Label>
              <Input
                id="edit-contactPhone"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                placeholder="+34 123 456 789"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-address">Dirección</Label>
            <Textarea
              id="edit-address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Dirección completa del proveedor"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-leadTimeDays">Tiempo de entrega (días)</Label>
              <Input
                id="edit-leadTimeDays"
                type="number"
                min="1"
                value={formData.leadTimeDays}
                onChange={(e) => handleInputChange("leadTimeDays", e.target.value)}
                placeholder="7"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-reliability">Fiabilidad (%)</Label>
              <Input
                id="edit-reliability"
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={formData.reliability}
                onChange={(e) => handleInputChange("reliability", e.target.value)}
                placeholder="95.00"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Actualizando..." : "Actualizar proveedor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}