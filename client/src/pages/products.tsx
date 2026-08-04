import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  MoreHorizontal,
  ChevronRight,
  ChevronDown,
  Grid
} from "lucide-react";
import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
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
  const [viewMode, setViewMode] = useState<"grid" | "list" | "category" | "supplier">("grid");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"name" | "stock" | "category" | "price">("name");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
  
  // Filter and organize products based on search query and view mode
  const filteredProducts = useMemo(() => {
    let filtered = products;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = products.filter(product => {
        const nameMatch = product.name && product.name.toLowerCase().includes(query);
        const skuMatch = product.sku && product.sku.toLowerCase().includes(query);
        const categoryMatch = product.category && product.category.toLowerCase().includes(query);
        const descriptionMatch = product.description && product.description.toLowerCase().includes(query);
        return nameMatch || skuMatch || categoryMatch || descriptionMatch;
      });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "stock":
          return b.currentStock - a.currentStock;
        case "category":
          return a.category.localeCompare(b.category);
        case "price":
          return parseFloat(b.unitPrice || "0") - parseFloat(a.unitPrice || "0");
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [products, searchQuery, sortBy]);

  // Organize products by category
  const productsByCategory = useMemo(() => {
    const grouped = filteredProducts.reduce((acc, product) => {
      const category = product.category || "Sin categoría";
      if (!acc[category]) acc[category] = [];
      acc[category].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
    
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProducts]);

  // Organize products by supplier
  const productsBySupplier = useMemo(() => {
    const grouped = filteredProducts.reduce((acc, product) => {
      const supplier = suppliers.find(s => s.id === product.supplierId);
      const supplierName = supplier?.name || "Sin proveedor";
      if (!acc[supplierName]) acc[supplierName] = [];
      acc[supplierName].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
    
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredProducts, suppliers]);

  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections);
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId);
    } else {
      newCollapsed.add(sectionId);
    }
    setCollapsedSections(newCollapsed);
  };

  const getStockStatus = (product: Product) => {
    if (product.currentStock === 0) {
      return { status: "Crítico", color: "destructive" as const };
    }
    if (product.currentStock <= product.minStock) {
      return { status: "Bajo", color: "secondary" as const };
    }
    return { status: "Normal", color: "default" as const };
  };

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (productId: number) => {
      return await apiRequest("DELETE", `/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Producto eliminado",
        description: "El producto se ha eliminado correctamente.",
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

  return (
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Productos</h2>
            <p className="text-slate-600">
              {searchQuery.trim() 
                ? `${filteredProducts.length} producto${filteredProducts.length !== 1 ? 's' : ''} encontrado${filteredProducts.length !== 1 ? 's' : ''}`
                : "Gestión del catálogo de productos"
              }
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Buscar productos..."
                className="w-80 pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              {searchQuery && (
                <span className="absolute right-3 top-3 text-xs text-slate-500">
                  {filteredProducts.length}
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-3">
              <Select value={sortBy} onValueChange={(value: "name" | "stock" | "category" | "price") => setSortBy(value)}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nombre</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="category">Categoría</SelectItem>
                  <SelectItem value="price">Precio</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex rounded-md border">
                <Button
                  variant={viewMode === "category" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("category")}
                  className="rounded-r-none"
                >
                  <Tag size={16} className="mr-1" />
                  Categorías
                </Button>
                <Button
                  variant={viewMode === "supplier" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("supplier")}
                  className="rounded-none border-x"
                >
                  <Users size={16} className="mr-1" />
                  Proveedores
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode("grid")}
                  className="rounded-l-none"
                >
                  <Grid size={16} className="mr-1" />
                  Lista
                </Button>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Button onClick={() => setShowAddProduct(true)}>
                <Plus size={16} className="mr-2" />
                Agregar Producto
              </Button>
              <Button variant="outline" onClick={() => setShowBulkAdd(true)}>
                <Package size={16} className="mr-2" />
                Agregar Múltiples
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-primary" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Total Productos</p>
                  <p className="text-2xl font-bold">{products.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-warning" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Stock Bajo</p>
                  <p className="text-2xl font-bold">
                    {products.filter(p => p.currentStock <= p.minStock).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-accent" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Stock Total</p>
                  <p className="text-2xl font-bold">
                    {products.reduce((sum, p) => sum + p.currentStock, 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-slate-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-slate-600">Categorías</p>
                  <p className="text-2xl font-bold">
                    {new Set(products.map(p => p.category)).size}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products Content */}
        {productsLoading ? (
          <div className="grid gap-6">
            {Array.from({ length: 3 }).map((_, sectionIndex) => (
              <Card key={sectionIndex}>
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded animate-pulse w-48"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, itemIndex) => (
                      <div key={itemIndex} className="flex items-center space-x-4 p-4 border rounded-lg">
                        <div className="h-12 w-12 bg-gray-200 rounded animate-pulse"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
                        </div>
                        <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Package className="h-16 w-16 text-slate-400 mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {searchQuery
                  ? `No se encontraron productos que coincidan con "${searchQuery}"`
                  : "No hay productos registrados"
                }
              </h3>
              <p className="text-slate-500 mb-6 text-center max-w-md">
                {searchQuery
                  ? "Intenta con otros términos de búsqueda o revisa la ortografía"
                  : "Comienza agregando tu primer producto al inventario para gestionar tu catálogo"
                }
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddProduct(true)} size="lg">
                  <Plus size={16} className="mr-2" />
                  Agregar Primer Producto
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {viewMode === "category" && (
              <div className="space-y-6">
                {productsByCategory.map(([categoryName, categoryProducts]) => (
                  <Card key={categoryName}>
                    <Collapsible
                      open={!collapsedSections.has(categoryName)}
                      onOpenChange={() => toggleSection(categoryName)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Tag className="h-5 w-5 text-slate-600" />
                              <CardTitle className="text-lg">{categoryName}</CardTitle>
                              <Badge variant="secondary">{categoryProducts.length} productos</Badge>
                            </div>
                            {collapsedSections.has(categoryName) ? (
                              <ChevronRight className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="grid gap-4">
                            {categoryProducts.map((product) => {
                              const zone = zones.find(z => z.id === product.warehouseZoneId);
                              const stockStatus = getStockStatus(product);
                              
                              return (
                                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors group">
                                  <div className="flex items-center space-x-4 flex-1">
                                    <div className="flex-shrink-0">
                                      <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <Package className="h-6 w-6 text-slate-600" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-slate-900 truncate">{product.name}</h4>
                                      <p className="text-sm text-slate-500">SKU: {product.sku}</p>
                                      {product.description && (
                                        <p className="text-sm text-slate-400 truncate max-w-md mt-1">
                                          {product.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm">
                                      <div className="text-center">
                                        <p className="font-medium text-slate-900">{product.currentStock}</p>
                                        <p className="text-slate-500">Stock</p>
                                      </div>
                                      <div>
                                        <Badge variant={stockStatus.color}>
                                          {stockStatus.status}
                                        </Badge>
                                      </div>
                                      <div>
                                        {zone ? (
                                          <Badge variant="outline">{zone.name}</Badge>
                                        ) : (
                                          <span className="text-slate-400 text-xs">Sin zona</span>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <p className="font-semibold text-slate-900">${product.unitPrice}</p>
                                        <p className="text-slate-500">Precio</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingProduct(product)}
                                    >
                                      <Edit size={14} />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="outline">
                                          <Trash2 size={14} />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Se eliminará permanentemente el producto "{product.name}" del sistema.
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
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}

            {viewMode === "supplier" && (
              <div className="space-y-6">
                {productsBySupplier.map(([supplierName, supplierProducts]) => (
                  <Card key={supplierName}>
                    <Collapsible
                      open={!collapsedSections.has(supplierName)}  
                      onOpenChange={() => toggleSection(supplierName)}
                    >
                      <CollapsibleTrigger asChild>
                        <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Users className="h-5 w-5 text-slate-600" />
                              <CardTitle className="text-lg">{supplierName}</CardTitle>
                              <Badge variant="secondary">{supplierProducts.length} productos</Badge>
                            </div>
                            {collapsedSections.has(supplierName) ? (
                              <ChevronRight className="h-5 w-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <CardContent>
                          <div className="grid gap-4">
                            {supplierProducts.map((product) => {
                              const zone = zones.find(z => z.id === product.warehouseZoneId);
                              const stockStatus = getStockStatus(product);
                              
                              return (
                                <div key={product.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors group">
                                  <div className="flex items-center space-x-4 flex-1">
                                    <div className="flex-shrink-0">
                                      <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                        <Package className="h-6 w-6 text-slate-600" />
                                      </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h4 className="font-semibold text-slate-900 truncate">{product.name}</h4>
                                      <div className="flex items-center space-x-3 mt-1">
                                        <p className="text-sm text-slate-500">SKU: {product.sku}</p>
                                        <Badge variant="outline" className="text-xs">{product.category}</Badge>
                                      </div>
                                      {product.description && (
                                        <p className="text-sm text-slate-400 truncate max-w-md mt-1">
                                          {product.description}
                                        </p>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-4 text-sm">
                                      <div className="text-center">
                                        <p className="font-medium text-slate-900">{product.currentStock}</p>
                                        <p className="text-slate-500">Stock</p>
                                      </div>
                                      <div>
                                        <Badge variant={stockStatus.color}>
                                          {stockStatus.status}
                                        </Badge>
                                      </div>
                                      <div>
                                        {zone ? (
                                          <Badge variant="outline">{zone.name}</Badge>
                                        ) : (
                                          <span className="text-slate-400 text-xs">Sin zona</span>
                                        )}
                                      </div>
                                      <div className="text-right">
                                        <p className="font-semibold text-slate-900">${product.unitPrice}</p>
                                        <p className="text-slate-500">Precio</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => setEditingProduct(product)}
                                    >
                                      <Edit size={14} />
                                    </Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button size="sm" variant="outline">
                                          <Trash2 size={14} />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Se eliminará permanentemente el producto "{product.name}" del sistema.
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
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                ))}
              </div>
            )}

            {viewMode === "grid" && (
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Zona</TableHead>
                        <TableHead>Precio</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => {
                        const zone = zones.find(z => z.id === product.warehouseZoneId);
                        const stockStatus = getStockStatus(product);

                        return (
                          <TableRow key={product.id} className="group hover:bg-muted/50">
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                {product.description && (
                                  <p className="text-sm text-slate-500 truncate max-w-xs">
                                    {product.description}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-sm bg-slate-100 px-2 py-1 rounded">
                                {product.sku}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{product.category}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-center">
                                <p className="font-medium">{product.currentStock}</p>
                                {product.minStock && (
                                  <p className="text-xs text-slate-500">
                                    Min: {product.minStock}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={stockStatus.color}>
                                {stockStatus.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {zone ? (
                                <Badge variant="outline">{zone.name}</Badge>
                              ) : (
                                <span className="text-slate-400">Sin asignar</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">${product.unitPrice}</p>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingProduct(product)}
                                >
                                  <Edit size={14} />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      <Trash2 size={14} />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Se eliminará
                                        permanentemente el producto "{product.name}" del sistema.
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
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>

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
          product={editingProduct}
          open={!!editingProduct}
          onOpenChange={(open) => !open && setEditingProduct(null)}
        />
      )}
    </div>
  );
}