import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StockMovementModal from "@/components/stock-movement-modal";
import MovementsHistoryModal from "@/components/movements-history-modal";
import BulkStockMovementsModal from "@/components/bulk-stock-movements-modal";
import { Search, Plus, ArrowUpDown, ArrowUp, ArrowDown, ArrowRight, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import type { StockMovement, Product, WarehouseZone } from "@shared/schema";

export default function Movements() {
  const { isMobile } = useDeviceDetection();
  const [showStockMovement, setShowStockMovement] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<string | undefined>(undefined);
  const [movementType, setMovementType] = useState<"entry" | "exit">("entry");
  const [searchQuery, setSearchQuery] = useState("");
  const [showBulkEntry, setShowBulkEntry] = useState(false);
  const [showBulkExit, setShowBulkExit] = useState(false);

  const { data: movements = [], isLoading: movementsLoading } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  const getProductName = (productId: number) => {
    const product = products.find(p => p.id === productId);
    return product ? product.name : "Producto desconocido";
  };

  const getZoneName = (zoneId: number | null) => {
    if (!zoneId) return "N/A";
    const zone = zones.find(z => z.id === zoneId);
    return zone ? zone.name : "Zona desconocida";
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case "entry":
        return <ArrowUp className="h-4 w-4" />;
      case "exit":
        return <ArrowDown className="h-4 w-4" />;
      case "transfer":
        return <ArrowRight className="h-4 w-4" />;
      default:
        return <ArrowUpDown className="h-4 w-4" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case "entry":
        return "bg-accent text-white";
      case "exit":
        return "bg-warning text-white";
      case "transfer":
        return "bg-blue-500 text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const openStockMovement = (type: "entry" | "exit") => {
    setMovementType(type);
    setShowStockMovement(true);
  };

  const openHistoryModal = (filter?: string) => {
    setHistoryFilter(filter);
    setShowHistoryModal(true);
  };

  const filteredMovements = movements.filter(movement => {
    const productName = getProductName(movement.productId).toLowerCase();
    const query = searchQuery.toLowerCase();
    return productName.includes(query) || 
           movement.reason?.toLowerCase().includes(query) ||
           movement.notes?.toLowerCase().includes(query);
  });

  const todayMovements = movements.filter(movement => {
    const today = new Date();
    const movementDate = new Date(movement.createdAt!);
    return movementDate.toDateString() === today.toDateString();
  });

  const entriesCount = movements.filter(m => m.type === "entry").length;
  const exitsCount = movements.filter(m => m.type === "exit").length;
  const transfersCount = movements.filter(m => m.type === "transfer").length;

  if (movementsLoading) {
    return (
      <div className="flex-1 overflow-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-96 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <header className={`bg-white shadow-sm border-b border-slate-200 ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
        <div className={`${isMobile ? 'space-y-3' : 'flex items-center justify-between'}`}>
          <div>
            <h2 className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-slate-900`}>
              {isMobile ? 'Movimientos' : 'Movimientos de Stock'}
            </h2>
            {!isMobile && <p className="text-slate-600">Registro de entradas, salidas y transferencias</p>}
          </div>
          <div className={`${isMobile ? 'space-y-3' : 'flex items-center space-x-4'}`}>
            <div className="relative">
              <Input
                type="text"
                placeholder={isMobile ? "Buscar..." : "Buscar movimientos..."}
                className={`${isMobile ? 'w-full' : 'w-80'} pl-10 ${isMobile ? 'h-10' : ''}`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Buscar en movimientos de stock"
                data-testid="input-search-movements"
              />
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
            </div>
            
            <div className={`${isMobile ? 'flex space-x-2' : 'flex items-center space-x-4'}`}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={isMobile ? 'flex-1 h-10' : ''} 
                    data-testid="dropdown-entry"
                    aria-label={isMobile ? "Crear entrada de stock" : "Crear entrada"}
                  >
                    <ArrowUp size={16} className={isMobile ? '' : 'mr-2'} />
                    {!isMobile && 'Entrada'}
                    {!isMobile && <ChevronDown size={16} className="ml-2" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openStockMovement("entry")} data-testid="menu-entry-individual">
                    <ArrowUp size={16} className="mr-2" />
                    Entrada Individual
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowBulkEntry(true)} data-testid="menu-entry-bulk">
                    <Plus size={16} className="mr-2" />
                    Múltiples Entradas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    className={isMobile ? 'flex-1 h-10' : ''} 
                    data-testid="dropdown-exit"
                    aria-label={isMobile ? "Crear salida de stock" : "Crear salida"}
                  >
                    <ArrowDown size={16} className={isMobile ? '' : 'mr-2'} />
                    {!isMobile && 'Salida'}
                    {!isMobile && <ChevronDown size={16} className="ml-2" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openStockMovement("exit")} data-testid="menu-exit-individual">
                    <ArrowDown size={16} className="mr-2" />
                    Salida Individual
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowBulkExit(true)} data-testid="menu-exit-bulk">
                    <Plus size={16} className="mr-2" />
                    Múltiples Salidas
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-auto ${isMobile ? 'p-4' : 'p-6'}`}>
        {/* Statistics Cards */}
        <div className={`grid gap-4 mb-6 ${isMobile ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-4'} ${isMobile ? 'gap-3' : 'gap-6'}`}>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistoryModal()} data-testid="card-total-movements">
            <CardContent className={isMobile ? 'p-3' : 'p-6'}>
              <div className={`flex items-center ${isMobile ? 'flex-col text-center' : ''}`}>
                <div className={`${isMobile ? 'w-6 h-6 mb-2' : 'w-8 h-8'} bg-slate-100 rounded-lg flex items-center justify-center`}>
                  <ArrowUpDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-slate-600`} />
                </div>
                <div className={isMobile ? '' : 'ml-4'}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>
                    {isMobile ? 'Total' : 'Total Movimientos'}
                  </p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>{movements.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistoryModal("entry")} data-testid="card-entries">
            <CardContent className={isMobile ? 'p-3' : 'p-6'}>
              <div className={`flex items-center ${isMobile ? 'flex-col text-center' : ''}`}>
                <div className={`${isMobile ? 'w-6 h-6 mb-2' : 'w-8 h-8'} bg-green-100 rounded-lg flex items-center justify-center`}>
                  <ArrowUp className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-accent`} />
                </div>
                <div className={isMobile ? '' : 'ml-4'}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>Entradas</p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>{entriesCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistoryModal("exit")} data-testid="card-exits">
            <CardContent className={isMobile ? 'p-3' : 'p-6'}>
              <div className={`flex items-center ${isMobile ? 'flex-col text-center' : ''}`}>
                <div className={`${isMobile ? 'w-6 h-6 mb-2' : 'w-8 h-8'} bg-yellow-100 rounded-lg flex items-center justify-center`}>
                  <ArrowDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-warning`} />
                </div>
                <div className={isMobile ? '' : 'ml-4'}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>Salidas</p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>{exitsCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => openHistoryModal()} data-testid="card-today">
            <CardContent className={isMobile ? 'p-3' : 'p-6'}>
              <div className={`flex items-center ${isMobile ? 'flex-col text-center' : ''}`}>
                <div className={`${isMobile ? 'w-6 h-6 mb-2' : 'w-8 h-8'} bg-blue-100 rounded-lg flex items-center justify-center`}>
                  <ArrowUpDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} text-blue-600`} />
                </div>
                <div className={isMobile ? '' : 'ml-4'}>
                  <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-600`}>Hoy</p>
                  <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold`}>{todayMovements.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Movements Table */}
        <Card data-testid="table-movements">
          <CardHeader className={isMobile ? 'pb-3' : ''}>
            <CardTitle className={isMobile ? 'text-base' : 'text-lg'}>
              {isMobile ? 'Historial' : 'Historial de Movimientos'}
            </CardTitle>
          </CardHeader>
          <CardContent className={isMobile ? 'p-0' : ''}>
            {isMobile ? (
              /* Mobile Card View */
              <div className="space-y-3 p-4">
                {filteredMovements.map((movement) => (
                  <Card key={movement.id} className="border-l-4 border-l-blue-500" data-testid={`card-movement-${movement.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getMovementColor(movement.type)}`}>
                            {getMovementIcon(movement.type)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {movement.type === "entry" ? "Entrada" : 
                             movement.type === "exit" ? "Salida" : "Transferencia"}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-semibold ${movement.type === "exit" ? "text-warning" : "text-accent"}`}>
                            {movement.type === "exit" ? "-" : "+"}{movement.quantity}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="font-medium text-sm truncate">
                          {getProductName(movement.productId)}
                        </div>
                        <div className="text-xs text-slate-500 space-y-0.5">
                          {(movement.fromZoneId || movement.toZoneId) && (
                            <div className="flex items-center">
                              <span className="w-12">Ruta:</span>
                              <span>{getZoneName(movement.fromZoneId)} → {getZoneName(movement.toZoneId)}</span>
                            </div>
                          )}
                          {movement.reason && (
                            <div className="flex items-start">
                              <span className="w-12 flex-shrink-0">Motivo:</span>
                              <span className="truncate">{movement.reason}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <span className="w-12">Fecha:</span>
                            <span>
                              {new Date(movement.createdAt!).toLocaleDateString("es-ES", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredMovements.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <ArrowUpDown className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No hay movimientos que coincidan con la búsqueda</p>
                  </div>
                )}
              </div>
            ) : (
              /* Desktop Table View with Horizontal Scroll */
              <div className="overflow-x-auto">
                {filteredMovements.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <ArrowUpDown className="h-16 w-16 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">No hay movimientos</h3>
                    <p>No hay movimientos que coincidan con la búsqueda actual</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Origen</TableHead>
                        <TableHead>Destino</TableHead>
                        <TableHead>Motivo</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Notas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMovements.map((movement) => (
                        <TableRow key={movement.id} data-testid={`row-movement-${movement.id}`}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getMovementColor(movement.type)}`}>
                                {getMovementIcon(movement.type)}
                              </div>
                              <Badge variant="outline">
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
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <StockMovementModal 
        open={showStockMovement} 
        onOpenChange={setShowStockMovement}
        type={movementType}
      />

      <BulkStockMovementsModal
        open={showBulkEntry}
        onOpenChange={setShowBulkEntry}
        type="entry"
      />
      
      <BulkStockMovementsModal
        open={showBulkExit}
        onOpenChange={setShowBulkExit}
        type="exit"
      />

      <MovementsHistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        initialFilter={historyFilter}
      />
    </>
  );
}
