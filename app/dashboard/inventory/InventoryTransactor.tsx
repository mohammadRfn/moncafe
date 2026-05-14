'use client'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { apiRequest } from '../../api/request'

interface InventoryItem {
  id: number;
  code: string;
  type: 'ING' | 'BOX';
}

export default function InventoryTransaction() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filtered, setFiltered] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [quantity, setQuantity] = useState<number>(0)
  const [transactionType, setTransactionType] = useState<'in' | 'out'>('in')
  const [loading, setLoading] = useState(false)

  // Fetch items from DB so we know what we are adjusting
  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const [ingRes, boxRes] = await Promise.all([
          apiRequest('/v1/inventory/ingredients', null, 'GET'),
          apiRequest('/v1/inventory/boxes', null, 'GET')
        ]);
        const combined: InventoryItem[] = [
          ...ingRes.data.map((i: any) => ({ id: i.id, code: i.code, type: 'ING' })),
          ...boxRes.data.map((b: any) => ({ id: b.id, code: b.code, type: 'BOX' }))
        ];
        setItems(combined);
      } catch (err) {
        console.error("Fetch error", err);
      }
    };
    fetchInventory();
  }, []);

  const handleSearch = (val: string) => {
    setQuery(val)
    setFiltered(items.filter(i => i.code.toLowerCase().includes(val.toLowerCase())))
    setShowDropdown(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem || quantity <= 0) return alert('باید کالا و مقدار معتبر وارد کنید')
    setLoading(true)

    const isBox = selectedItem.type === 'BOX'
    
    // BACKEND NOTE: Endpoints from Doc Page 3/4
    const endpoint = isBox
      ? '/v1/inventory/boxes/transaction'
      : '/v1/inventory/products/transaction'

    const payload = isBox
      ? {
          box_id: selectedItem.id,
          type: transactionType, // "in" or "out"
          quantity: quantity
        }
      : {
          ingredient_id: selectedItem.id,
          type: transactionType, // "in" or "out"
          quantity_grams: quantity
        }

    try {
      await apiRequest(endpoint, payload, 'POST')
      alert(`تراکنش ${transactionType === 'in' ? 'ورودی' : 'خروجی'} با موفقیت ثبت شد`)
      setQuery(''); setQuantity(0); setSelectedItem(null);
    } catch (err) {
      alert('خطا در ثبت تراکنش');
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-auto w-full max-w-2xl rounded-3xl border border-[var(--secondary)] bg-[var(--ternary)] p-5 shadow-lg sm:p-6 lg:p-8"
    >
      <div className="mb-7 text-center">
        <h2 className="text-xl font-semibold text-[var(--primary)] sm:text-2xl">مدیریت تراکنش انبار</h2>
        <p className="mt-2 text-sm text-[var(--primary)]/70">ورود یا خروج کالا از موجودی فعلی</p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-4">
        {/* Toggle between IN and OUT */}
        <div className="flex gap-2 p-1 bg-[var(--bg)] rounded-2xl border border-[var(--secondary)]">
          <button
            type="button"
            onClick={() => setTransactionType('in')}
            className={`flex-1 py-2 rounded-xl transition ${transactionType === 'in' ? 'bg-green-500 text-white' : 'text-[var(--primary)]'}`}
          >
            ورود به انبار (+)
          </button>
          <button
            type="button"
            onClick={() => setTransactionType('out')}
            className={`flex-1 py-2 rounded-xl transition ${transactionType === 'out' ? 'bg-red-500 text-white' : 'text-[var(--primary)]'}`}
          >
            خروج / ضایعات (-)
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="جستجوی کد کالا..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => setShowDropdown(true)}
            className="w-full rounded-2xl border border-[var(--secondary)] bg-[var(--bg)] px-4 py-4 outline-none text-right"
            dir="rtl"
          />
          <AnimatePresence>
            {showDropdown && filtered.length > 0 && (
              <motion.ul className="absolute top-full z-10 mt-2 w-full max-h-48 overflow-y-auto rounded-2xl border border-[var(--secondary)] bg-[var(--ternary)] shadow-xl">
                {filtered.map((item) => (
                  <li
                    key={`${item.type}-${item.id}`}
                    onClick={() => { setSelectedItem(item); setQuery(item.code); setShowDropdown(false); }}
                    className="cursor-pointer px-4 py-3 hover:bg-[var(--button)] hover:text-white text-right"
                  >
                    {item.code} ({item.type === 'BOX' ? 'باکس' : 'ماده'})
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        <input
          type="number"
          placeholder="مقدار تراکنش"
          value={quantity || ''}
          onChange={(e) => setQuantity(Number(e.target.value))}
          className="w-full rounded-2xl border border-[var(--secondary)] bg-[var(--bg)] px-4 py-4 outline-none text-right"
        />

        <motion.button
          type="submit"
          disabled={loading}
          whileTap={{ scale: 0.98 }}
          className="mt-2 rounded-2xl bg-[var(--button)] py-4 font-medium text-[var(--font-alt)] disabled:opacity-50"
        >
          {loading ? 'در حال پردازش...' : 'ثبت تراکنش'}
        </motion.button>
      </form>
    </motion.div>
  )
}