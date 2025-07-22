import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface DocumentCategory {
  id: number;
  name: string;
  description?: string;
  icon: string;
  isSystem: boolean;
}

interface DocumentSubcategory {
  id: number;
  categoryId: number;
  name: string;
  description?: string;
  isSystem: boolean;
}

interface DocumentCategorySelectorProps {
  selectedCategoryId?: number;
  selectedSubcategoryId?: number;
  onCategoryChange?: (categoryId: number, subcategoryId?: number) => void;
  size?: "default" | "sm";
  showLabels?: boolean;
  className?: string;
}

export function DocumentCategorySelector({
  selectedCategoryId,
  selectedSubcategoryId,
  onCategoryChange,
  size = "default",
  showLabels = true,
  className = ""
}: DocumentCategorySelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(selectedCategoryId);
  const [selectedSubcategory, setSelectedSubcategory] = useState<number | undefined>(selectedSubcategoryId);
  const [newCategoryDialog, setNewCategoryDialog] = useState(false);
  const [newSubcategoryDialog, setNewSubcategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");
  const [newSubcategoryDescription, setNewSubcategoryDescription] = useState("");

  const { data: categories = [], refetch: refetchCategories } = useQuery({
    queryKey: ['/api/document-categories'],
    enabled: true
  });

  const { data: subcategories = [], refetch: refetchSubcategories } = useQuery({
    queryKey: ['/api/document-subcategories', selectedCategory],
    enabled: !!selectedCategory
  });

  useEffect(() => {
    setSelectedCategory(selectedCategoryId);
    setSelectedSubcategory(selectedSubcategoryId);
  }, [selectedCategoryId, selectedSubcategoryId]);

  const handleCategoryChange = (categoryId: string) => {
    const newCategoryId = parseInt(categoryId);
    setSelectedCategory(newCategoryId);
    setSelectedSubcategory(undefined);
    onCategoryChange?.(newCategoryId);
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    const newSubcategoryId = parseInt(subcategoryId);
    setSelectedSubcategory(newSubcategoryId);
    if (selectedCategory) {
      onCategoryChange?.(selectedCategory, newSubcategoryId);
    }
  };

  const createCategory = async () => {
    try {
      await apiRequest('POST', '/api/document-categories', {
        name: newCategoryName,
        description: newCategoryDescription
      });
      setNewCategoryDialog(false);
      setNewCategoryName("");
      setNewCategoryDescription("");
      refetchCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const createSubcategory = async () => {
    if (!selectedCategory) return;
    
    try {
      await apiRequest('POST', '/api/document-subcategories', {
        categoryId: selectedCategory,
        name: newSubcategoryName,
        description: newSubcategoryDescription
      });
      setNewSubcategoryDialog(false);
      setNewSubcategoryName("");
      setNewSubcategoryDescription("");
      refetchSubcategories();
    } catch (error) {
      console.error('Failed to create subcategory:', error);
    }
  };

  const getSelectedCategoryName = () => {
    const category = (categories as DocumentCategory[]).find((c: DocumentCategory) => c.id === selectedCategory);
    return category ? `${category.icon} ${category.name}` : "Select category";
  };

  const getSelectedSubcategoryName = () => {
    const subcategory = (subcategories as DocumentSubcategory[]).find((s: DocumentSubcategory) => s.id === selectedSubcategory);
    return subcategory ? subcategory.name : "Select subcategory";
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Category Selection */}
      <div className="space-y-2">
        {showLabels && <Label className="text-sm font-medium">Document Category</Label>}
        <div className="flex gap-2">
          <Select value={selectedCategory?.toString() || ""} onValueChange={handleCategoryChange}>
            <SelectTrigger className={size === "sm" ? "h-8 text-sm" : ""}>
              <SelectValue placeholder={getSelectedCategoryName()} />
            </SelectTrigger>
            <SelectContent>
              {(categories as DocumentCategory[]).map((category: DocumentCategory) => (
                <SelectItem key={category.id} value={category.id.toString()}>
                  <div className="flex items-center gap-2">
                    <span>{category.icon}</span>
                    <span>{category.name}</span>
                    {category.isSystem && (
                      <Badge variant="secondary" className="text-xs">System</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={newCategoryDialog} onOpenChange={setNewCategoryDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size={size === "sm" ? "sm" : "default"} className="px-3">
                <Plus className="h-4 w-4" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Category</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Category Name</Label>
                  <Input
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder="e.g., Custom Research"
                  />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    value={newCategoryDescription}
                    onChange={(e) => setNewCategoryDescription(e.target.value)}
                    placeholder="Brief description of this category"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="outline" onClick={() => setNewCategoryDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createCategory} disabled={!newCategoryName.trim()}>
                    Create Category
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Subcategory Selection */}
      {selectedCategory && (
        <div className="space-y-2">
          {showLabels && <Label className="text-sm font-medium">Document Subcategory</Label>}
          <div className="flex gap-2">
            <Select value={selectedSubcategory?.toString() || ""} onValueChange={handleSubcategoryChange}>
              <SelectTrigger className={size === "sm" ? "h-8 text-sm" : ""}>
                <SelectValue placeholder={getSelectedSubcategoryName()} />
              </SelectTrigger>
              <SelectContent>
                {(subcategories as DocumentSubcategory[]).map((subcategory: DocumentSubcategory) => (
                  <SelectItem key={subcategory.id} value={subcategory.id.toString()}>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span>{subcategory.name}</span>
                      {subcategory.isSystem && (
                        <Badge variant="secondary" className="text-xs">System</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Dialog open={newSubcategoryDialog} onOpenChange={setNewSubcategoryDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size={size === "sm" ? "sm" : "default"} className="px-3">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Subcategory</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Subcategory Name</Label>
                    <Input
                      value={newSubcategoryName}
                      onChange={(e) => setNewSubcategoryName(e.target.value)}
                      placeholder="e.g., Competitive Analysis"
                    />
                  </div>
                  <div>
                    <Label>Description (Optional)</Label>
                    <Textarea
                      value={newSubcategoryDescription}
                      onChange={(e) => setNewSubcategoryDescription(e.target.value)}
                      placeholder="Brief description of this subcategory"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setNewSubcategoryDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={createSubcategory} disabled={!newSubcategoryName.trim()}>
                      Create Subcategory
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      )}

      {/* Selected Categories Display */}
      {(selectedCategory || selectedSubcategory) && (
        <div className="flex gap-2 flex-wrap">
          {selectedCategory && (
            <Badge variant="outline" className="text-xs">
              Category: {(categories as DocumentCategory[]).find((c: DocumentCategory) => c.id === selectedCategory)?.name}
            </Badge>
          )}
          {selectedSubcategory && (
            <Badge variant="outline" className="text-xs">
              Subcategory: {(subcategories as DocumentSubcategory[]).find((s: DocumentSubcategory) => s.id === selectedSubcategory)?.name}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}