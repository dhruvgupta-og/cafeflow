import React, { useState } from 'react';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';
import { MenuCategory, MenuItem, AddOn } from '../../../types';
import {
  Plus,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Check,
  X,
  Layers,
  Sparkles,
  DollarSign,
  Coffee,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface Props {
  cafeId: string;
  categories: MenuCategory[];
}

export const MenuTab: React.FC<Props> = ({ cafeId, categories }) => {
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || '');
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Item Form Modal
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  // Form fields
  const [itemName, setItemName] = useState('');
  const [itemCatId, setItemCatId] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemPrice, setItemPrice] = useState<number>(0);
  const [itemPhotoUrl, setItemPhotoUrl] = useState('');
  const [itemIsVeg, setItemIsVeg] = useState(true);
  const [itemIsAvailable, setItemIsAvailable] = useState(true);
  const [itemAddOns, setItemAddOns] = useState<AddOn[]>([]);
  const [newAddOnName, setNewAddOnName] = useState('');
  const [newAddOnPrice, setNewAddOnPrice] = useState<number>(0);

  const [loading, setLoading] = useState(false);

  const selectedCategory = categories.find(c => c.id === (activeCategory || categories[0]?.id));

  // Open item modal for creation
  const handleOpenNewItem = (catId?: string) => {
    setEditingItem(null);
    setItemName('');
    setItemCatId(catId || activeCategory || categories[0]?.id || '');
    setItemDesc('');
    setItemPrice(4.50);
    setItemPhotoUrl('https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80');
    setItemIsVeg(true);
    setItemIsAvailable(true);
    setItemAddOns([]);
    setIsItemModalOpen(true);
  };

  // Open item modal for editing
  const handleOpenEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemCatId(item.categoryId);
    setItemDesc(item.description);
    setItemPrice(item.price);
    setItemPhotoUrl(item.photoUrl);
    setItemIsVeg(item.isVeg);
    setItemIsAvailable(item.isAvailable);
    setItemAddOns(item.addOns || []);
    setIsItemModalOpen(true);
  };

  // Quick toggle availability
  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await updateDoc(
        doc(db, `cafes/${cafeId}/menuCategories/${item.categoryId}/items`, item.id),
        { isAvailable: !item.isAvailable }
      );
    } catch (err) {
      console.error('Error toggling availability:', err);
    }
  };

  // Save item (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemCatId) return;
    setLoading(true);

    try {
      const itemId = editingItem ? editingItem.id : `item-${Date.now()}`;
      const itemData: MenuItem = {
        id: itemId,
        categoryId: itemCatId,
        name: itemName.trim(),
        description: itemDesc.trim(),
        price: Number(itemPrice),
        photoUrl: itemPhotoUrl.trim() || 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80',
        isVeg: itemIsVeg,
        isAvailable: itemIsAvailable,
        addOns: itemAddOns
      };

      // If category was changed during edit, remove from old category path
      if (editingItem && editingItem.categoryId !== itemCatId) {
        await deleteDoc(doc(db, `cafes/${cafeId}/menuCategories/${editingItem.categoryId}/items`, editingItem.id));
      }

      await setDoc(doc(db, `cafes/${cafeId}/menuCategories/${itemCatId}/items`, itemId), itemData);
      setIsItemModalOpen(false);
    } catch (err) {
      console.error('Error saving item:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete Item
  const handleDeleteItem = async (item: MenuItem) => {
    if (!window.confirm(`Delete "${item.name}" from the menu?`)) return;
    try {
      await deleteDoc(doc(db, `cafes/${cafeId}/menuCategories/${item.categoryId}/items`, item.id));
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  // Create Category
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setLoading(true);

    try {
      const catId = `cat-${newCatName.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;
      const catData: MenuCategory = {
        id: catId,
        name: newCatName.trim(),
        sortOrder: categories.length + 1
      };

      await setDoc(doc(db, `cafes/${cafeId}/menuCategories`, catId), catData);
      setActiveCategory(catId);
      setNewCatName('');
      setIsCatModalOpen(false);
    } catch (err) {
      console.error('Error adding category:', err);
    } finally {
      setLoading(false);
    }
  };

  // Delete Category
  const handleDeleteCategory = async (cat: MenuCategory) => {
    if (!window.confirm(`Delete category "${cat.name}" and all its dishes?`)) return;
    try {
      await deleteDoc(doc(db, `cafes/${cafeId}/menuCategories`, cat.id));
      const remaining = categories.filter(c => c.id !== cat.id);
      if (remaining.length > 0) setActiveCategory(remaining[0].id);
    } catch (err) {
      console.error('Error deleting category:', err);
    }
  };

  // Add-ons sub-builder
  const handleAddCustomAddOn = () => {
    if (!newAddOnName.trim()) return;
    setItemAddOns([...itemAddOns, { name: newAddOnName.trim(), price: Number(newAddOnPrice) }]);
    setNewAddOnName('');
    setNewAddOnPrice(0);
  };

  const handleRemoveAddOn = (idx: number) => {
    setItemAddOns(itemAddOns.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-900 border border-stone-800 p-4 rounded-2xl">
        <div>
          <h2 className="text-base font-bold text-stone-100 flex items-center gap-2">
            <Coffee className="w-5 h-5 text-amber-400" /> Menu Engineering & Catalog
          </h2>
          <p className="text-xs text-stone-400">
            Real-time updates sync instantly with customer mobile menus and table QR links.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs flex items-center gap-1.5 border border-stone-700 transition"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" /> New Category
          </button>

          <button
            onClick={() => handleOpenNewItem()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" /> Add Menu Dish
          </button>
        </div>
      </div>

      {/* Categories Tabs Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-800">
        {categories.map(cat => {
          const isSelected = (selectedCategory?.id || categories[0]?.id) === cat.id;
          const count = cat.items?.length || 0;

          return (
            <div key={cat.id} className="flex items-center shrink-0">
              <button
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition ${
                  isSelected
                    ? 'bg-amber-500 text-stone-950 shadow-md font-bold'
                    : 'bg-stone-900 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-stone-950/20 text-stone-900' : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {count}
                </span>
              </button>

              {isSelected && categories.length > 1 && (
                <button
                  onClick={() => handleDeleteCategory(cat)}
                  className="p-1.5 ml-1 text-stone-500 hover:text-rose-400 rounded-lg hover:bg-stone-800 transition"
                  title="Delete category"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Dishes in active category */}
      {selectedCategory && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-stone-300 uppercase tracking-wide font-mono">
              {selectedCategory.name} ({selectedCategory.items?.length || 0} items)
            </h3>

            <button
              onClick={() => handleOpenNewItem(selectedCategory.id)}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add dish to this category
            </button>
          </div>

          {(!selectedCategory.items || selectedCategory.items.length === 0) ? (
            <div className="bg-stone-900/40 border border-stone-800 rounded-2xl p-10 text-center text-stone-500 space-y-2">
              <p className="text-xs">No items in "{selectedCategory.name}" yet.</p>
              <button
                onClick={() => handleOpenNewItem(selectedCategory.id)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold"
              >
                Add the first dish
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedCategory.items.map(item => (
                <div
                  key={item.id}
                  className={`bg-stone-900 rounded-2xl border flex flex-col justify-between overflow-hidden transition-all ${
                    item.isAvailable
                      ? 'border-stone-800 hover:border-stone-700'
                      : 'border-rose-900/40 bg-stone-950/60 opacity-70'
                  }`}
                >
                  <div>
                    {/* Item Image */}
                    <div className="relative h-44 bg-stone-950 overflow-hidden group">
                      <img
                        src={item.photoUrl}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        onError={(e: any) => {
                          e.target.src = 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80';
                        }}
                      />

                      {/* Veg / Non-Veg Badge */}
                      <span
                        className={`absolute top-3 left-3 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow ${
                          item.isVeg ? 'bg-emerald-900/90 text-emerald-300 border border-emerald-500' : 'bg-rose-900/90 text-rose-300 border border-rose-500'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {item.isVeg ? 'Veg' : 'Non-Veg'}
                      </span>

                      {/* Out of Stock Ribbon */}
                      {!item.isAvailable && (
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="px-3 py-1 rounded-full bg-rose-600 text-white font-bold text-xs uppercase tracking-wider shadow">
                            Out of Stock
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-bold text-base text-stone-100">{item.name}</h4>
                        <span className="font-serif font-bold text-amber-400 text-base shrink-0">
                          ${item.price.toFixed(2)}
                        </span>
                      </div>

                      <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>

                      {/* Addons preview */}
                      {item.addOns && item.addOns.length > 0 && (
                        <div className="pt-2">
                          <span className="text-[10px] text-stone-500 uppercase font-semibold block mb-1">
                            Available Customizations ({item.addOns.length})
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.addOns.map((add: AddOn, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 bg-stone-950 border border-stone-800 text-[11px] text-stone-300 rounded-md"
                              >
                                + {add.name} (${add.price.toFixed(2)})
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Action Bar */}
                  <div className="p-3 bg-stone-950/60 border-t border-stone-800/80 flex items-center justify-between gap-2">
                    {/* Fast In-Stock toggle */}
                    <button
                      onClick={() => handleToggleAvailability(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                        item.isAvailable
                          ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/80 hover:bg-emerald-900'
                          : 'bg-stone-800 text-stone-400 hover:text-stone-200'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      {item.isAvailable ? 'In Stock' : 'Mark In-Stock'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                        title="Edit dish"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-950 text-stone-400 hover:text-rose-400 transition"
                        title="Delete dish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Creation Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-md p-6 text-stone-100 shadow-2xl">
            <h3 className="text-lg font-bold font-serif mb-3">Add Menu Category</h3>
            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Specialty Cold Brews, Woodfired Pizza"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCatModalOpen(false)}
                  className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow transition"
                >
                  {loading ? 'Creating...' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Create / Edit Modal */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-xl p-6 text-stone-100 shadow-2xl my-8 space-y-4">
            <div className="flex justify-between items-center border-b border-stone-800 pb-3">
              <h3 className="text-lg font-bold font-serif">
                {editingItem ? `Edit: ${editingItem.name}` : 'Add New Menu Dish'}
              </h3>
              <button
                onClick={() => setIsItemModalOpen(false)}
                className="text-stone-400 hover:text-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Vanilla Bean Iced Shakerato"
                    value={itemName}
                    onChange={(e) => setItemName(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">
                    Category *
                  </label>
                  <select
                    value={itemCatId}
                    onChange={(e) => setItemCatId(e.target.value)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">
                    Price ($ USD) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                    className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-400 mb-1">
                    Dietary Classification
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setItemIsVeg(true)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        itemIsVeg
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : 'bg-stone-950 border-stone-700 text-stone-400'
                      }`}
                    >
                      🌿 Vegetarian
                    </button>
                    <button
                      type="button"
                      onClick={() => setItemIsVeg(false)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition ${
                        !itemIsVeg
                          ? 'bg-rose-950 border-rose-500 text-rose-300'
                          : 'bg-stone-950 border-stone-700 text-stone-400'
                      }`}
                    >
                      🥩 Non-Veg
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Photo URL
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={itemPhotoUrl}
                  onChange={(e) => setItemPhotoUrl(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Dish Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Describe ingredients, tasting notes, allergens..."
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Add-ons Builder */}
              <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-300">
                    Add-ons & Options (e.g. Oat Milk, Extra Shot)
                  </span>
                  <span className="text-[11px] text-stone-500">
                    {itemAddOns.length} configured
                  </span>
                </div>

                {itemAddOns.length > 0 && (
                  <div className="space-y-1.5">
                    {itemAddOns.map((addon, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-stone-900 px-3 py-1.5 rounded-lg text-xs"
                      >
                        <span className="text-stone-200 font-medium">{addon.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-amber-400 font-mono">+${addon.price.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveAddOn(idx)}
                            className="text-stone-500 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Option name (e.g. Oat Milk Sub)"
                    value={newAddOnName}
                    onChange={(e) => setNewAddOnName(e.target.value)}
                    className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                  />
                  <input
                    type="number"
                    step="0.10"
                    placeholder="+$"
                    value={newAddOnPrice || ''}
                    onChange={(e) => setNewAddOnPrice(parseFloat(e.target.value) || 0)}
                    className="w-20 bg-stone-900 border border-stone-700 rounded-xl px-2 py-1.5 text-xs text-stone-100 placeholder-stone-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomAddOn}
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsItemModalOpen(false)}
                  className="px-4 py-2 text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow transition"
                >
                  {loading ? 'Saving...' : editingItem ? 'Update Dish' : 'Publish Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
