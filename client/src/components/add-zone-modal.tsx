import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { InsertWarehouseZone } from "@shared/schema";

interface AddZoneModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AddZoneModal({ open, onOpenChange }: AddZoneModalProps) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    capacity: ""
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: InsertWarehouseZone) => {
      const response = await fetch("/api/warehouse-zones", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "Content-Type": "application/json" }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error creating zone');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-zones"] });
      toast({
        title: "Zona creada",
        description: "La zona de almacén se ha creado correctamente.",
      });
      onOpenChange(false);
      setFormData({ code: "", name: "", description: "", capacity: "" });
    },
    onError: (error: any) => {
      console.error("Error creating zone:", error);
      const errorMessage = error?.message || "No se pudo crear la zona de almacén.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.code || !formData.name || !formData.capacity) {
      toast({
        title: "Error",
        description: "Todos los campos obligatorios deben completarse.",
        variant: "destructive",
      });
      return;
    }

    const capacity = parseInt(formData.capacity);
    if (isNaN(capacity) || capacity <= 0) {
      toast({
        title: "Error",
        description: "La capacidad debe ser un número mayor a 0.",
        variant: "destructive",
      });
      return;
    }
    
    const zoneData: InsertWarehouseZone = {
      code: formData.code.toUpperCase().trim(),
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      capacity: capacity
    };

    createMutation.mutate(zoneData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Zona</DialogTitle>
        </DialogHeader>
        
        <p className="text-sm text-slate-600 mb-4">
          Crear una nueva zona de almacenamiento en el almacén.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código de zona *</Label>
            <Input
              id="code"
              value={formData.code}
              onChange={(e) => handleInputChange("code", e.target.value)}
              placeholder="ej. A1, B2, RECEIVING"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la zona *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="ej. Zona A1, Área de recepción"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Descripción de la zona"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="capacity">Capacidad *</Label>
            <Input
              id="capacity"
              type="number"
              min="1"
              value={formData.capacity}
              onChange={(e) => handleInputChange("capacity", e.target.value)}
              placeholder="100"
              required
            />
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
              {createMutation.isPending ? "Creando..." : "Crear zona"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
