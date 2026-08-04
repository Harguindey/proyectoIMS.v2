import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import AddProductModal from "@/components/add-product-modal";
import EditProductModal from "@/components/edit-product-modal";
import BulkAddProductsModal from "@/components/bulk-add-products-modal";
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  Grid3X3, 
  LayoutList, 
  Filter,
  TrendingUp,
  TrendingDown,
  Euro,
  BarChart3,
  Users,
  Tag,
  ArrowUpDown,
  Eye,
  MoreHorizontal
} from "lucide-react";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useDeviceDetection } from "@/hooks/use-device-detection";
import { apiRequest } from "@/lib/queryClient";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import type { Product, WarehouseZone, Supplier } from "@shared/schema";

export default function Products() {
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "category" | "price">("name");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isMobile } = useDeviceDetection();

  // Data queries
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: zones = [] } = useQuery<WarehouseZone[]>({
    queryKey: ["/api/warehouse-zones"],
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Get unique categories and stats
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    products.forEach(p => {
      if (p.category) {
        uniqueCategories.add(p.category);
      }
    });
    return Array.from(uniqueCategories).sort();
  }, [products]);

  // Filter and organize products
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(product => 
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query) ||
        (product.category && product.category.toLowerCase().includes(query)) ||
        (product.description && product.description.toLowerCase().includes(query))
      );
    }

    // Apply category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter(product => product.category === filterCategory);
    }

    // Apply status filter
    if (filterStatus !== "all") {
      if (filterStatus === "low-stock") {
        filtered = filtered.filter(product => product.currentStock <= product.minStock);
      } else if (filterStatus === "out-of-stock") {
        filtered = filtered.filter(product => product.currentStock === 0);
      } else if (filterStatus === "in-stock") {
        filtered = filtered.filter(product => product.currentStock > product.minStock);
      }
    }
    
    // Sort products
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "stock":
          return b.currentStock - a.currentStock;
        case "category":
          return (a.category || "").localeCompare(b.category || "");
        case "price":
          return parseFloat(b.unitPrice || "0") - parseFloat(a.unitPrice || "0");
        default:
          return 0;
      }
    });
  }, [products, searchQuery, filterCategory, filterStatus, sortBy]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = products.length;
    const lowStock = products.filter(p => p.currentStock <= p.minStock).length;
    const outOfStock = products.filter(p => p.currentStock === 0).length;
    const totalValue = products.reduce((sum, p) => sum + (p.currentStock * parseFloat(p.unitPrice || "0")), 0);

    return { total, lowStock, outOfStock, totalValue };
  }, [products]);

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      return await apiRequest("DELETE", `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto eliminado",
        description: "El producto ha sido eliminado correctamente.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo eliminar el producto.",
        variant: "destructive",
      });
    },
  });

  const getStockStatus = (product: Product) => {
    if (product.currentStock === 0) {
      return { status: "Sin Stock", color: "destructive" as const };
    }
    if (product.currentStock <= product.minStock) {
      return { status: "Stock Bajo", color: "secondary" as const };
    }
    return { status: "En Stock", color: "default" as const };
  };

  const getSupplierName = (supplierId: number | null) => {
    if (!supplierId) return "Sin proveedor";
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.name || "Sin proveedor";
  };

  const getZoneName = (zoneId: number | null) => {
    if (!zoneId) return "Sin zona";
    const zone = zones.find(z => z.id === zoneId);
    return zone?.name || "Sin zona";
  };

  const ProductCard = ({ product }: { product: Product }) => {
    const stockStatus = getStockStatus(product);
    const supplier = getSupplierName(product.supplierId);
    const zone = getZoneName(product.warehouseZoneId);

    return (
      <Card className="group hover:shadow-lg transition-all duration-200 border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
          <div className={`flex items-start justify-between gap-2 ${isMobile ? 'mb-3' : 'mb-4'}`}>
            <div className={`flex items-start flex-1 min-w-0 ${isMobile ? 'space-x-2' : 'space-x-3'}`}>
              <Avatar className={`${isMobile ? 'h-10 w-10' : 'h-12 w-12'} flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600`}>
                <AvatarFallback className="text-white font-medium">
                  {product.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 overflow-hidden">
                <h3 className={`font-semibold text-slate-900 truncate ${isMobile ? 'text-sm' : 'text-base'}`}>{product.name}</h3>
                <p className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-500 truncate`}>SKU: {product.sku}</p>
                <Badge variant="outline" className={`mt-1 ${isMobile ? 'text-xs px-1 py-0' : 'text-xs'}`}>
                  {isMobile ? (() => {
                    const displayText = product.category || "Sin cat.";
                    return displayText.substring(0, 8) + (displayText.length > 8 ? '...' : '');
                  })() : (product.category || "Sin categoría")}
                </Badge>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={`${isMobile ? 'opacity-100 min-h-[44px] min-w-[44px]' : 'opacity-40 hover:opacity-100 group-hover:opacity-100 h-10 w-10'} transition-opacity flex-shrink-0 relative z-10`}
                  data-testid={`button-menu-${product.id}`}
                >
                  <MoreHorizontal size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/product/${product.id}`} className="flex items-center">
                    <Eye size={16} className="mr-2" />
                    Ver detalles
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                  <Edit size={16} className="mr-2" />
                  Editar
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem 
                      className="text-red-600 focus:text-red-600"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 size={16} className="mr-2" />
                      Eliminar
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. El producto será eliminado permanentemente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteMutation.mutate(product.id)}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className={`${isMobile ? 'space-y-2' : 'space-y-3'}`}>
            <div className="flex items-center justify-between">
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-600`}>Stock</span>
              <div className="flex items-center space-x-2">
                <span className={`font-semibold text-slate-900 ${isMobile ? 'text-sm' : 'text-base'}`}>{product.currentStock}</span>
                <Badge variant={stockStatus.color} className={`${isMobile ? 'text-xs px-1 py-0' : 'text-xs'}`}>
                  {isMobile ? stockStatus.status.replace('Stock ', '') : stockStatus.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className={`${isMobile ? 'text-xs' : 'text-sm'} text-slate-600`}>Precio</span>
              <span className={`font-semibold text-slate-900 ${isMobile ? 'text-sm' : 'text-base'}`}>
                €{parseFloat(product.unitPrice || "0").toLocaleString('es-ES', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {!isMobile && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Zona</span>
                  <span className="text-sm text-slate-700">{zone}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600">Proveedor</span>
                  <span className="text-sm text-slate-700">{supplier}</span>
                </div>
              </>
            )}
          </div>

          <Separator className={`${isMobile ? 'my-3' : 'my-4'}`} />

          <div className={`flex items-center ${isMobile ? 'justify-center' : 'justify-between'} ${isMobile ? 'text-xs' : 'text-xs'} text-slate-500`}>
            {isMobile ? (
              <span className="font-medium">
                Valor: €{(product.currentStock * parseFloat(product.unitPrice || "0")).toLocaleString('es-ES')}
              </span>
            ) : (
              <>
                <span>Min: {product.minStock}</span>
                <span>Max: {product.maxStock}</span>
                <span className="font-medium">
                  Valor: €{(product.currentStock * parseFloat(product.unitPrice || "0")).toLocaleString('es-ES')}
                </span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const ProductListItem = ({ product }: { product: Product }) => {
    const stockStatus = getStockStatus(product);
    const supplier = getSupplierName(product.supplierId);
    const zone = getZoneName(product.warehouseZoneId);

    return (
      <Card className="group hover:shadow-md transition-all duration-200 border-0 bg-white/80 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <Avatar className="h-10 w-10 flex-shrink-0 bg-gradient-to-br from-blue-500 to-purple-600">
                <AvatarFallback className="text-white font-medium text-sm">
                  {product.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex items-center space-x-3">
                  <h3 className="font-medium text-slate-900 truncate flex-shrink-0 max-w-xs">{product.name}</h3>
                  <Badge variant="outline" className="text-xs">
                    {product.category || "Sin categoría"}
                  </Badge>
                  <Badge variant={stockStatus.color} className="text-xs">
                    {stockStatus.status}
                  </Badge>
                </div>
                <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500">
                  <span>SKU: {product.sku}</span>
                  <span>•</span>
                  <span>{zone}</span>
                  <span>•</span>
                  <span>{supplier}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-right">
                <div className="font-semibold text-slate-900">{product.currentStock}</div>
                <div className="text-xs text-slate-500">unidades</div>
              </div>
              
              <div className="text-right">
                <div className="font-semibold text-slate-900">
                  €{parseFloat(product.unitPrice || "0").toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500">por unidad</div>
              </div>

              <div className="text-right">
                <div className="font-semibold text-slate-900">
                  €{(product.currentStock * parseFloat(product.unitPrice || "0")).toLocaleString('es-ES')}
                </div>
                <div className="text-xs text-slate-500">valor total</div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`${isMobile ? 'opacity-100 min-h-[44px] min-w-[44px]' : 'opacity-40 hover:opacity-100 group-hover:opacity-100'} transition-opacity flex-shrink-0 relative z-10`}
                    data-testid={`button-menu-list-${product.id}`}
                  >
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/product/${product.id}`} className="flex items-center">
                      <Eye size={16} className="mr-2" />
                      Ver detalles
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setEditingProduct(product)}>
                    <Edit size={16} className="mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600"
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Trash2 size={16} className="mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta acción no se puede deshacer. El producto será eliminado permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => deleteMutation.mutate(product.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Eliminar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (productsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-slate-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-64 bg-slate-200 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100/50">
      <div className="max-w-7xl mx-auto p-3 sm:p-8 pb-20 md:pb-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
            <div>
              <h1 className="text-xl sm:text-3xl font-bold text-slate-900 mb-1 sm:mb-2">Gestión de Productos</h1>
              <p className="text-sm sm:text-base text-slate-600">Administra tu inventario de equipamiento deportivo</p>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setShowBulkAdd(true)}
                className="bg-white/80 backdrop-blur-sm flex-1 sm:flex-initial text-xs sm:text-sm"
                size="sm"
              >
                <Plus size={14} className="mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Agregar múltiples</span>
                <span className="sm:hidden">Múltiples</span>
              </Button>
              <Button 
                onClick={() => setShowAddProduct(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 flex-1 sm:flex-initial text-xs sm:text-sm"
                size="sm"
              >
                <Plus size={14} className="mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Nuevo Producto</span>
                <span className="sm:hidden">Nuevo</span>
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-3 sm:p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-slate-500">Total Productos</p>
                    <p className="text-lg sm:text-2xl font-bold text-slate-900">{stats.total}</p>
                  </div>
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Package className="text-blue-600" size={16} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-500`}>Stock Bajo</p>
                    <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-amber-600`}>{stats.lowStock}</p>
                  </div>
                  <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-amber-50 rounded-lg flex items-center justify-center`}>
                    <AlertTriangle className="text-amber-600" size={isMobile ? 16 : 20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-500`}>Sin Stock</p>
                    <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-red-600`}>{stats.outOfStock}</p>
                  </div>
                  <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-red-50 rounded-lg flex items-center justify-center`}>
                    <TrendingDown className="text-red-600" size={isMobile ? 16 : 20} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className={`${isMobile ? 'p-3' : 'p-6'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`${isMobile ? 'text-xs' : 'text-sm'} font-medium text-slate-500`}>Valor Total</p>
                    <p className={`${isMobile ? 'text-lg' : 'text-2xl'} font-bold text-green-600`}>
                      €{stats.totalValue.toLocaleString('es-ES')}
                    </p>
                  </div>
                  <div className={`${isMobile ? 'w-8 h-8' : 'w-10 h-10'} bg-green-50 rounded-lg flex items-center justify-center`}>
                    <Euro className="text-green-600" size={isMobile ? 16 : 20} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Controls */}
          <Card className="border-0 bg-white/80 backdrop-blur-sm mb-8">
            <CardContent className={`${isMobile ? 'p-4' : 'p-6'}`}>
              <div className={`${isMobile ? 'space-y-4' : 'flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0'}`}>
                <div className={`${isMobile ? 'space-y-3' : 'flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4 flex-1'}`}>
                  {/* Search */}
                  <div className={`relative ${isMobile ? 'w-full' : 'flex-1 max-w-md'}`}>
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                    <Input
                      placeholder={isMobile ? "Buscar..." : "Buscar productos..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-white/50 border-slate-200"
                    />
                  </div>

                  {/* Filters */}
                  <div className={`${isMobile ? 'grid grid-cols-2 gap-2' : 'flex items-center space-x-3'}`}>
                    <Select value={filterCategory} onValueChange={setFilterCategory}>
                      <SelectTrigger className={`${isMobile ? 'text-sm min-h-10' : 'w-40'} bg-white/50 border-slate-200`}>
                        <SelectValue placeholder="Categoría" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {isMobile ? category.substring(0, 10) + (category.length > 10 ? '...' : '') : category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                      <SelectTrigger className={`${isMobile ? 'text-sm min-h-10' : 'w-36'} bg-white/50 border-slate-200`}>
                        <SelectValue placeholder="Estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="in-stock">En Stock</SelectItem>
                        <SelectItem value="low-stock">Stock Bajo</SelectItem>
                        <SelectItem value="out-of-stock">Sin Stock</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                      <SelectTrigger className={`${isMobile ? 'text-sm min-h-10 col-span-2' : 'w-36'} bg-white/50 border-slate-200`}>
                        <SelectValue placeholder="Ordenar por" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Nombre</SelectItem>
                        <SelectItem value="stock">Stock</SelectItem>
                        <SelectItem value="category">Categoría</SelectItem>
                        <SelectItem value="price">Precio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* View Mode */}
                <div className={`flex items-center ${isMobile ? 'justify-center' : 'space-x-2'}`}>
                  <Button
                    variant={viewMode === "grid" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className={`${viewMode === "grid" ? "bg-slate-900 hover:bg-slate-800" : "bg-white/50"} ${isMobile ? 'flex-1 mr-2 min-h-[44px]' : ''}`}
                    data-testid="button-view-grid"
                  >
                    <Grid3X3 size={18} className={isMobile ? '' : 'mr-2'} />
                    {!isMobile && 'Tarjetas'}
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className={`${viewMode === "list" ? "bg-slate-900 hover:bg-slate-800" : "bg-white/50"} ${isMobile ? 'flex-1 min-h-[44px]' : ''}`}
                    data-testid="button-view-list"
                  >
                    <LayoutList size={18} className={isMobile ? '' : 'mr-2'} />
                    {!isMobile && 'Lista'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Display */}
        {filteredProducts.length === 0 ? (
          <Card className="border-0 bg-white/80 backdrop-blur-sm">
            <CardContent className="p-12 text-center">
              <Package size={48} className="mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No se encontraron productos</h3>
              <p className="text-slate-600 mb-6">
                {searchQuery || filterCategory !== "all" || filterStatus !== "all"
                  ? "Prueba a cambiar los filtros de búsqueda"
                  : "Comienza agregando tu primer producto"}
              </p>
              {!searchQuery && filterCategory === "all" && filterStatus === "all" && (
                <Button onClick={() => setShowAddProduct(true)}>
                  <Plus size={16} className="mr-2" />
                  Agregar Producto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Results Info */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-600">
                Mostrando <span className="font-medium">{filteredProducts.length}</span> de{" "}
                <span className="font-medium">{products.length}</span> productos
              </p>
            </div>

            {/* Products Grid/List */}
            <div className={
              viewMode === "grid" 
                ? `grid ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'} ${isMobile ? 'gap-4' : 'gap-6'}`
                : `${isMobile ? 'space-y-3' : 'space-y-4'}`
            }>
              {filteredProducts.map((product) => (
                viewMode === "grid" ? (
                  <ProductCard key={product.id} product={product} />
                ) : (
                  <ProductListItem key={product.id} product={product} />
                )
              ))}
            </div>
          </>
        )}

        {/* Modals */}
        <AddProductModal 
          open={showAddProduct} 
          onOpenChange={setShowAddProduct} 
        />
        
        <BulkAddProductsModal 
          open={showBulkAdd} 
          onOpenChange={setShowBulkAdd} 
        />

        {editingProduct && (
          <EditProductModal 
            open={!!editingProduct} 
            onOpenChange={(open) => !open && setEditingProduct(null)}
            product={editingProduct}
          />
        )}
      </div>
    </div>
  );
}