import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, invalidateRelatedQueries } from "@/lib/queryClient";
import type { InsertSupplier } from "@shared/schema";

interface AddSupplierModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddSupplierModal({ open, onOpenChange }: AddSupplierModalProps) {
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

  const createMutation = useMutation({
    mutationFn: async (data: InsertSupplier) => {
      return await apiRequest("POST", "/api/suppliers", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({
        title: "Proveedor creado",
        description: "El proveedor se ha creado correctamente.",
      });
      onOpenChange(false);
      setFormData({
        name: "",
        contactEmail: "",
        contactPhone: "",
        address: "",
        leadTimeDays: "",
        reliability: ""
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "No se pudo crear el proveedor.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const supplierData: InsertSupplier = {
      name: formData.name,
      contactEmail: formData.contactEmail || null,
      contactPhone: formData.contactPhone || null,
      address: formData.address || null,
      leadTimeDays: parseInt(formData.leadTimeDays) || 7,
      reliability: formData.reliability || "95.00"
    };

    createMutation.mutate(supplierData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Proveedor</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del proveedor *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="Nombre de la empresa"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Email de contacto</Label>
              <Input
                id="contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={(e) => handleInputChange("contactEmail", e.target.value)}
                placeholder="contacto@empresa.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">Teléfono de contacto</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(e) => handleInputChange("contactPhone", e.target.value)}
                placeholder="+34 123 456 789"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Dirección</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Dirección completa del proveedor"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leadTimeDays">Tiempo de entrega (días)</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="1"
                value={formData.leadTimeDays}
                onChange={(e) => handleInputChange("leadTimeDays", e.target.value)}
                placeholder="7"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reliability">Fiabilidad (%)</Label>
              <Input
                id="reliability"
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
              disabled={createMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Creando..." : "Crear proveedor"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}