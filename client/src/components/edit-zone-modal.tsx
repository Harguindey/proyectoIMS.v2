import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertWarehouseZoneSchema, type WarehouseZone } from "@shared/schema";
import { z } from "zod";

const formSchema = insertWarehouseZoneSchema.extend({
  capacity: z.coerce.number().min(1, "La capacidad debe ser mayor a 0"),
  currentOccupancy: z.coerce.number().min(0, "La ocupación no puede ser negativa"),
  type: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface EditZoneModalProps {
  zone: WarehouseZone;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditZoneModal({ zone, open, onOpenChange }: EditZoneModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: zone.code,
      name: zone.name,
      capacity: zone.capacity,
      currentOccupancy: zone.currentOccupancy,
      description: zone.description || "",
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await apiRequest("PATCH", `/api/warehouse-zones/${zone.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse-zones"] });
      queryClient.invalidateQueries({ queryKey: [`/api/warehouse-zones/${zone.id}`] });
      toast({
        title: "Zona actualizada",
        description: "La zona se ha actualizado correctamente.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo actualizar la zona.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const { type, ...zoneData } = data;
    updateMutation.mutate(zoneData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Zona de Almacén</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="A1, B2, etc." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Zona A1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Zona</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona el tipo de zona" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="receiving">Recepción</SelectItem>
                      <SelectItem value="storage">Almacenamiento</SelectItem>
                      <SelectItem value="picking">Preparación</SelectItem>
                      <SelectItem value="shipping">Envío</SelectItem>
                      <SelectItem value="returns">Devoluciones</SelectItem>
                      <SelectItem value="quality">Control de Calidad</SelectItem>
                      <SelectItem value="staging">Área de Espera</SelectItem>
                      <SelectItem value="bulk">Almacenamiento a Granel</SelectItem>
                      <SelectItem value="cold">Almacén Frío</SelectItem>
                      <SelectItem value="hazmat">Materiales Peligrosos</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="capacity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Capacidad Total</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="100" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentOccupancy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ocupación Actual</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                        onChange={(e) => field.onChange(e.target.value)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción (Opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripción adicional de la zona..."
                      className="min-h-[80px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Actualizando..." : "Actualizar Zona"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
