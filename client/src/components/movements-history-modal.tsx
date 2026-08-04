import { useState, useMemo } from "react";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  ArrowUp, 
  ArrowDown, 
  ArrowLeftRight, 
  Filter, 
  Calendar as CalendarIcon,
  X,
  Download
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import type { StockMovement, Product, WarehouseZone } from "@shared/schema";

interface MovementsHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialFilter?: string;
}

export default function MovementsHistoryModal({ 
  open, 
  onOpenChange,
  initialFilter 
}: MovementsHistoryModalProps) {
  const { isMobile } = useDeviceDetection();
  const [filters, setFilters] = useState({
    type: "all",
    product: "all",
    zone: "all",
    quantityMin: "",
    quantityMax: "",
    priceMin: "",
    priceMax: "",
    dateFrom: undefined as Date | undefined,
    dateTo: undefined as Date | undefined,
    reason: "",
    notes: ""
  });

  // Update filters when modal opens with initial filter
  React.useEffect(() => {
    if (open && initialFilter) {
      setFilters(prev => ({
        ...prev,
        type: initialFilter
      }));
    }
  }, [open, initialFilter]);

  const { data: movements = [] } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  // Helper functions
  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : "Producto no encontrado";
  };

  const getProductPrice = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? parseFloat(product.unitPrice || "0") : 0;
  };

  const getZoneName = (zoneId: number | null) => {
    if (!zoneId) return "N/A";
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : "Zona no encontrada";
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entry": return <ArrowUp size={12} className="text-white" />;
      case "exit": return <ArrowDown size={12} className="text-white" />;
      case "transfer": return <ArrowLeftRight size={12} className="text-white" />;
      default: return <ArrowUp size={12} className="text-white" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case "entry": return "bg-accent";
      case "exit": return "bg-warning";
      case "transfer": return "bg-blue-500";
      default: return "bg-gray-500";
    }
  };

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter(movement => {
      // Type filter
      if (filters.type !== "all" && movement.type !== filters.type) return false;

      // Product filter
      if (filters.product !== "all" && movement.productId.toString() !== filters.product) return false;

      // Zone filter (checking both from and to zones)
      if (filters.zone !== "all") {
        const zoneId = parseInt(filters.zone);
        if (movement.fromZoneId !== zoneId && movement.toZoneId !== zoneId) return false;
      }

      // Quantity filters
      if (filters.quantityMin && movement.quantity < parseInt(filters.quantityMin)) return false;
      if (filters.quantityMax && movement.quantity > parseInt(filters.quantityMax)) return false;

      // Price filters
      if (filters.priceMin || filters.priceMax) {
        const productPrice = getProductPrice(movement.productId);
        const totalValue = productPrice * movement.quantity;
        if (filters.priceMin && totalValue < parseFloat(filters.priceMin)) return false;
        if (filters.priceMax && totalValue > parseFloat(filters.priceMax)) return false;
      }

      // Date filters
      const movementDate = new Date(movement.createdAt!);
      if (filters.dateFrom && movementDate < filters.dateFrom) return false;
      if (filters.dateTo && movementDate > filters.dateTo) return false;

      // Text filters
      if (filters.reason && !movement.reason?.toLowerCase().includes(filters.reason.toLowerCase())) return false;
      if (filters.notes && !movement.notes?.toLowerCase().includes(filters.notes.toLowerCase())) return false;

      return true;
    });
  }, [movements, filters, products]);

  const clearFilters = () => {
    setFilters({
      type: initialFilter || "all",
      product: "all",
      zone: "all",
      quantityMin: "",
      quantityMax: "",
      priceMin: "",
      priceMax: "",
      dateFrom: undefined,
      dateTo: undefined,
      reason: "",
      notes: ""
    });
  };

  const exportMovements = () => {
    const csvContent = [
      ["Tipo", "Producto", "Cantidad", "Valor Total", "Origen", "Destino", "Motivo", "Fecha", "Notas"],
      ...filteredMovements.map(movement => [
        movement.type === "entry" ? "Entrada" : movement.type === "exit" ? "Salida" : "Transferencia",
        getProductName(movement.productId),
        movement.quantity.toString(),
        (getProductPrice(movement.productId) * movement.quantity).toFixed(2),
        getZoneName(movement.fromZoneId),
        getZoneName(movement.toZoneId),
        movement.reason || "N/A",
        new Date(movement.createdAt!).toLocaleDateString("es-ES"),
        movement.notes || "N/A"
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movimientos_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className={`${isMobile ? 'max-w-[95vw] max-h-[95vh] w-full' : 'max-w-7xl h-[90vh]'} flex flex-col`}
        data-testid="modal-movements-history"
      >
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Historial de Movimientos</DialogTitle>
          <DialogDescription>
            Filtros avanzados para analizar el historial completo de movimientos de stock
          </DialogDescription>
        </DialogHeader>

        {/* Filters Section */}
        <Card className="mb-3 flex-shrink-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs flex items-center gap-2">
              <Filter size={14} />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* First Row: Type, Product, Zone */}
            <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-3' : ''} ${isMobile ? 'gap-3' : 'gap-3'}`}>
              <div className="space-y-2">
                <Label htmlFor="type" className={isMobile ? 'text-sm font-medium' : 'text-xs'}>Tipo</Label>
                <Select value={filters.type} onValueChange={(value) => setFilters({...filters, type: value})}>
                  <SelectTrigger 
                    className={isMobile ? 'h-12 text-base' : 'h-8 text-xs'}
                    data-testid="select-filter-type"
                  >
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-type-all">Todos los tipos</SelectItem>
                    <SelectItem value="entry" data-testid="option-type-entry">Entradas</SelectItem>
                    <SelectItem value="exit" data-testid="option-type-exit">Salidas</SelectItem>
                    <SelectItem value="transfer" data-testid="option-type-transfer">Transferencias</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product" className={isMobile ? 'text-sm font-medium' : 'text-xs'}>Producto</Label>
                <Select value={filters.product} onValueChange={(value) => setFilters({...filters, product: value})}>
                  <SelectTrigger 
                    className={isMobile ? 'h-12 text-base' : 'h-8 text-xs'}
                    data-testid="select-filter-product"
                  >
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-product-all">Todos los productos</SelectItem>
                    {products.map(product => (
                      <SelectItem key={product.id} value={product.id.toString()} data-testid={`option-product-${product.id}`}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="zone" className={isMobile ? 'text-sm font-medium' : 'text-xs'}>Zona</Label>
                <Select value={filters.zone} onValueChange={(value) => setFilters({...filters, zone: value})}>
                  <SelectTrigger 
                    className={isMobile ? 'h-12 text-base' : 'h-8 text-xs'}
                    data-testid="select-filter-zone"
                  >
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" data-testid="option-zone-all">Todas las zonas</SelectItem>
                    {zones.map(zone => (
                      <SelectItem key={zone.id} value={zone.id.toString()} data-testid={`option-zone-${zone.id}`}>
                        {zone.name} ({zone.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Second Row: Quantity and Price Filters */}
            <div className={`grid ${isMobile ? 'grid-cols-2 gap-3' : 'grid-cols-2 md:grid-cols-4 gap-3'}`}>
              <div className="space-y-2">
                <Label htmlFor="quantityMin" className={isMobile ? 'text-sm font-medium' : 'text-xs'}>Cant. Mín.</Label>
                <Input
                  id="quantityMin"
                  type="number"
                  placeholder="0"
                  className={isMobile ? 'h-12 text-base' : 'h-8 text-xs'}
                  value={filters.quantityMin}
                  onChange={(e) => setFilters({...filters, quantityMin: e.target.value})}
                  data-testid="input-filter-quantity-min"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantityMax" className={isMobile ? 'text-sm font-medium' : 'text-xs'}>Cant. Máx.</Label>
                <Input
                  id="quantityMax"
                  type="number"
                  placeholder="999"
                  className={isMobile ? 'h-12 text-base' : 'h-8 text-xs'}
                  value={filters.quantityMax}
                  onChange={(e) => setFilters({...filters, quantityMax: e.target.value})}
                  data-testid="input-filter-quantity-max"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceMin" className={isMobile ? 'text-sm font-medium' : 'text-xs'}>Valor Mín.</Label>
                <Input
                  id="priceMin"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  className={isMobile ? 'h-12 text-base' : 'h-8 text-xs'}
                  value={filters.priceMin}
                  onChange={(e) => setFilters({...filters, priceMin: e.target.value})}
                  data-testid="input-filter-price-min"
                  inputMode="decimal"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceMax" className={isMobile ? 'text-sm font-medium' : 'text-xs'}>Valor Máx.</Label>
                <Input
                  id="priceMax"
                  type="number"
                  step="0.01"
                  placeholder="999.99"
                  className={isMobile ? 'h-12 text-base' : 'h-8 text-xs'}
                  value={filters.priceMax}
                  onChange={(e) => setFilters({...filters, priceMax: e.target.value})}
                  data-testid="input-filter-price-max"
                  inputMode="decimal"
                />
              </div>
            </div>

            {/* Third Row: Date Filters */}
            <div className={`grid grid-cols-1 ${!isMobile ? 'md:grid-cols-2' : ''} ${isMobile ? 'gap-3' : 'gap-3'}`}>
              <div className="space-y-2">
                <Label className={isMobile ? 'text-sm font-medium' : 'text-xs'}>Fecha Desde</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={`w-full justify-start text-left font-normal ${isMobile ? 'h-12 text-base' : 'h-8 text-xs'}`}
                      data-testid="button-filter-date-from"
                    >
                      <CalendarIcon className={`mr-1 ${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                      {filters.dateFrom ? format(filters.dateFrom, "dd/MM/yyyy") : "Desde"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters({...filters, dateFrom: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className={isMobile ? 'text-sm font-medium' : 'text-xs'}>Fecha Hasta</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button 
                      variant="outline" 
                      className={`w-full justify-start text-left font-normal ${isMobile ? 'h-12 text-base' : 'h-8 text-xs'}`}
                      data-testid="button-filter-date-to"
                    >
                      <CalendarIcon className={`mr-1 ${isMobile ? 'h-4 w-4' : 'h-3 w-3'}`} />
                      {filters.dateTo ? format(filters.dateTo, "dd/MM/yyyy") : "Hasta"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => setFilters({...filters, dateTo: date})}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Fourth Row: Text Filters and Actions */}
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-3 gap-3'} ${!isMobile ? 'items-end' : ''}`}>
              <div className="space-y-2">
                <Label htmlFor="reason" className={isMobile ? 'text-sm font-medium' : 'text-xs'}>Motivo</Label>
                <Input
                  id="reason"
                  placeholder="Buscar..."
                  className={isMobile ? 'h-12 text-base' : 'h-8 text-xs'}
                  value={filters.reason}
                  onChange={(e) => setFilters({...filters, reason: e.target.value})}
                  data-testid="input-filter-reason"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className={isMobile ? 'text-sm font-medium' : 'text-xs'}>Notas</Label>
                <Input
                  id="notes"
                  placeholder="Buscar..."
                  className={isMobile ? 'h-12 text-base' : 'h-8 text-xs'}
                  value={filters.notes}
                  onChange={(e) => setFilters({...filters, notes: e.target.value})}
                  data-testid="input-filter-notes"
                />
              </div>

              <div className={`flex ${isMobile ? 'flex-col space-y-3 mt-4' : 'gap-2'}`}>
                <Button 
                  variant="outline" 
                  onClick={clearFilters} 
                  size={isMobile ? "default" : "sm"} 
                  className={isMobile ? 'h-12 text-base' : 'h-8 text-xs'}
                  data-testid="button-clear-filters"
                >
                  <X size={isMobile ? 16 : 12} className="mr-1" />
                  Limpiar
                </Button>
                <Button 
                  variant="outline" 
                  onClick={exportMovements} 
                  size={isMobile ? "default" : "sm"} 
                  className={isMobile ? 'h-12 text-base' : 'h-8 text-xs'}
                  data-testid="button-export-csv"
                >
                  <Download size={isMobile ? 16 : 12} className="mr-1" />
                  CSV
                </Button>
              </div>
            </div>

            {/* Results Counter */}
            <div className="text-center">
              <span className="text-xs text-slate-600">
                {filteredMovements.length} de {movements.length} movimientos
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        <div className="flex-1 overflow-auto min-h-0">
          {isMobile ? (
            /* Mobile Card View */
            <div className="space-y-3">
              {filteredMovements.length === 0 ? (
                <div className="text-center py-8 text-slate-500" data-testid="empty-state-mobile">
                  No se encontraron movimientos con los filtros aplicados
                </div>
              ) : (
                filteredMovements.map((movement) => (
                  <Card key={movement.id} className="p-4" data-testid={`movement-card-${movement.id}`}>
                    <div className="space-y-3">
                      {/* Header with type and quantity */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getMovementColor(movement.type)}`}>
                            {getMovementIcon(movement.type)}
                          </div>
                          <Badge variant="outline" className="text-sm">
                            {movement.type === "entry" ? "Entrada" : 
                             movement.type === "exit" ? "Salida" : "Transferencia"}
                          </Badge>
                        </div>
                        <div className="font-bold text-lg">
                          {movement.type === "exit" ? "-" : "+"}{movement.quantity}
                        </div>
                      </div>

                      {/* Product name */}
                      <div>
                        <h3 className="font-semibold text-base text-slate-900">
                          {getProductName(movement.productId)}
                        </h3>
                        <p className="text-sm text-slate-600 font-medium">
                          €{(getProductPrice(movement.productId) * movement.quantity).toFixed(2)}
                        </p>
                      </div>

                      {/* Zone info */}
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-slate-500">Origen:</span>
                          <span className="ml-1 font-medium">{getZoneName(movement.fromZoneId)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Destino:</span>
                          <span className="ml-1 font-medium">{getZoneName(movement.toZoneId)}</span>
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-sm text-slate-600">
                        {new Date(movement.createdAt!).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>

                      {/* Reason and Notes */}
                      {(movement.reason || movement.notes) && (
                        <div className="space-y-1">
                          {movement.reason && (
                            <div className="text-sm">
                              <span className="text-slate-500">Motivo:</span>
                              <span className="ml-1">{movement.reason}</span>
                            </div>
                          )}
                          {movement.notes && (
                            <div className="text-sm">
                              <span className="text-slate-500">Notas:</span>
                              <span className="ml-1">{movement.notes}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </Card>
                ))
              )}
            </div>
          ) : (
            /* Desktop Table View */
            <div className="border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10">
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Origen</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {filteredMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-slate-500" data-testid="empty-state-desktop">
                      No se encontraron movimientos con los filtros aplicados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMovements.map((movement) => (
                    <TableRow key={movement.id} data-testid={`movement-row-${movement.id}`}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getMovementColor(movement.type)}`}>
                            {getMovementIcon(movement.type)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {movement.type === "entry" ? "Entrada" : 
                             movement.type === "exit" ? "Salida" : "Transferencia"}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {getProductName(movement.productId)}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {movement.type === "exit" ? "-" : "+"}{movement.quantity}
                      </TableCell>
                      <TableCell className="font-semibold">
                        €{(getProductPrice(movement.productId) * movement.quantity).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getZoneName(movement.fromZoneId)}
                      </TableCell>
                      <TableCell>
                        {getZoneName(movement.toZoneId)}
                      </TableCell>
                      <TableCell>
                        {movement.reason || "N/A"}
                      </TableCell>
                      <TableCell>
                        {new Date(movement.createdAt!).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </TableCell>
                      <TableCell>
                        {movement.notes ? (
                          <div className="max-w-xs truncate" title={movement.notes}>
                            {movement.notes}
                          </div>
                        ) : "N/A"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
