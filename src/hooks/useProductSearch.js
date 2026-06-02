import { useState } from 'react';
import { cleanProduct } from '@/domain/food/productSearchModel';
import { searchProducts } from '@/services/productSearchService';

export function useProductSearch({ onAdd }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [draftProduct, setDraftProduct] = useState(null);

  const resetSearch = () => {
    setResults([]);
    setQuery('');
    setSearched(false);
    setShowManual(false);
    setEditingIndex(null);
    setDraftProduct(null);
  };

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    setShowManual(false);
    setEditingIndex(null);

    try {
      setResults(await searchProducts(query));
    } finally {
      setLoading(false);
    }
  };

  const addItem = (item) => {
    onAdd(cleanProduct(item, query));
    resetSearch();
  };

  const startEdit = (product, index) => {
    setEditingIndex(index);
    setDraftProduct({ ...product });
  };

  const updateDraft = (field, value) => {
    setDraftProduct((current) => ({ ...current, [field]: value }));
  };

  const saveDraft = () => {
    const nextProduct = cleanProduct(draftProduct, query);
    setResults((current) => current.map((item, index) => (index === editingIndex ? nextProduct : item)));
    setEditingIndex(null);
    setDraftProduct(null);
  };

  return {
    query,
    setQuery,
    results,
    loading,
    searched,
    showManual,
    setShowManual,
    editingIndex,
    draftProduct,
    search,
    addItem,
    startEdit,
    updateDraft,
    saveDraft,
  };
}
