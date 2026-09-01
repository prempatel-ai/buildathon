'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import {
  fetchCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  setDefaultAddress,
  deleteCustomerAddress,
  getCustomerToken,
  CustomerAddress,
  CreateAddressPayload
} from '@/lib/api';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Check,
  Building2,
  Home,
  Briefcase,
  Phone,
  Loader2,
  X
} from 'lucide-react';

export default function ConsumerAddressesPage() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreateAddressPayload>({
    label: 'Home',
    recipient_name: '',
    phone: '',
    line1: '',
    line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'IN',
    is_default: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const token = getCustomerToken();
    if (!token) {
      router.push('/customer/login');
      return;
    }
    loadAddresses();
  }, [router]);

  const loadAddresses = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCustomerAddresses();
      setAddresses(data);
    } catch (err: any) {
      console.error('Failed to load addresses:', err);
      setError(err.message || 'Unable to retrieve delivery addresses.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      label: 'Home',
      recipient_name: '',
      phone: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'IN',
      is_default: addresses.length === 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (addr: CustomerAddress) => {
    setEditingId(addr.id);
    setFormData({
      label: addr.label,
      recipient_name: addr.recipient_name,
      phone: addr.phone,
      line1: addr.line1,
      line2: addr.line2 || '',
      city: addr.city,
      state: addr.state,
      postal_code: addr.postal_code,
      country: addr.country,
      is_default: addr.is_default
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);

      if (!formData.recipient_name || !formData.phone || !formData.line1 || !formData.city || !formData.state || !formData.postal_code) {
        setError('All required address fields must be filled.');
        setSubmitting(false);
        return;
      }

      if (editingId) {
        await updateCustomerAddress(editingId, formData);
        setSuccessMsg('Address updated.');
      } else {
        await createCustomerAddress(formData);
        setSuccessMsg('New delivery address saved.');
      }

      setIsModalOpen(false);
      await loadAddresses();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save address.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      setError(null);
      await setDefaultAddress(id);
      setSuccessMsg('Default delivery address updated.');
      await loadAddresses();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to set default address.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this delivery address?')) return;
    try {
      setError(null);
      await deleteCustomerAddress(id);
      setSuccessMsg('Address removed.');
      await loadAddresses();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete address.');
    }
  };

  const getLabelIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l === 'work' || l === 'office') return <Briefcase className="w-3.5 h-3.5 text-neutral-500" />;
    if (l === 'warehouse' || l === 'building') return <Building2 className="w-3.5 h-3.5 text-neutral-500" />;
    return <Home className="w-3.5 h-3.5 text-neutral-500" />;
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900 flex flex-col font-sans antialiased selection:bg-neutral-200 pb-16">
      <Navigation />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-neutral-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Consumer Account</span>
              <span className="text-neutral-300">•</span>
              <span className="text-xs text-neutral-500 font-medium">
                {addresses.length} {addresses.length === 1 ? 'Saved Destination' : 'Saved Destinations'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Delivery Addresses</h1>
            <p className="text-xs text-neutral-500 mt-0.5 max-w-2xl">
              Manage shipping destinations. The active default address is automatically routed by autonomous AI shopping agents.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              onClick={() => router.push('/customer/chat')}
              className="h-8 px-3 rounded-md border border-neutral-200 bg-white hover:bg-neutral-50 text-xs font-medium text-neutral-700 transition-colors cursor-pointer"
            >
              Shopping Chat
            </button>
            <button
              onClick={handleOpenAddModal}
              className="h-8 px-3.5 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Address</span>
            </button>
          </div>
        </div>

        {/* Banner Alert Messages */}
        {error && (
          <div className="mb-6 p-3.5 rounded-md bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-neutral-400 hover:text-neutral-700 font-bold ml-2 cursor-pointer">×</button>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-3.5 rounded-md bg-neutral-50 border border-neutral-300 text-neutral-900 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-neutral-900" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Addresses Grid */}
        <div>
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-neutral-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-neutral-600" />
              <p className="text-xs">Loading saved destinations...</p>
            </div>
          ) : addresses.length === 0 ? (
            <div className="bg-white border border-neutral-200 rounded-lg p-12 text-center max-w-md mx-auto my-8">
              <div className="w-10 h-10 bg-neutral-100 text-neutral-600 rounded-lg flex items-center justify-center mx-auto mb-3 font-mono text-xs font-bold">
                LOC
              </div>
              <h3 className="text-xs font-semibold text-neutral-900 mb-1">No Delivery Addresses Added</h3>
              <p className="text-xs text-neutral-500 mb-4 leading-relaxed">
                Add a delivery destination so your AI shopping agent can automatically confirm and route purchases.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="h-8 px-3.5 bg-neutral-900 hover:bg-black text-white font-medium text-xs rounded transition-colors inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Address</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`bg-white rounded-lg border flex flex-col justify-between p-5 transition-colors ${
                    addr.is_default
                      ? 'border-neutral-900 ring-1 ring-neutral-900 shadow-xs'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div>
                    {/* Top Row: Label Pill & Default Tag */}
                    <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-100">
                      <div className="flex items-center gap-1.5">
                        {getLabelIcon(addr.label)}
                        <span className="text-[11px] font-semibold text-neutral-900 uppercase font-mono">{addr.label}</span>
                      </div>

                      {addr.is_default ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-semibold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          DEFAULT
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-[11px] font-medium text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                        >
                          Make default
                        </button>
                      )}
                    </div>

                    {/* Recipient Details */}
                    <div className="space-y-0.5">
                      <h2 className="text-sm font-semibold text-neutral-900">
                        {addr.recipient_name}
                      </h2>
                      <div className="text-xs text-neutral-500 flex items-center gap-1 font-mono">
                        <Phone className="w-3 h-3 text-neutral-400" />
                        <span>{addr.phone}</span>
                      </div>
                    </div>

                    {/* Street & Postal Information */}
                    <div className="mt-3 pt-2.5 border-t border-neutral-100 text-xs text-neutral-600 leading-relaxed space-y-0.5">
                      <p className="text-neutral-800 font-medium">{addr.line1}</p>
                      {addr.line2 && <p className="text-neutral-600">{addr.line2}</p>}
                      <p className="text-neutral-900 font-semibold pt-0.5">
                        {addr.city}, {addr.state} <span className="font-mono text-neutral-600 font-normal">{addr.postal_code}</span>
                      </p>
                      <p className="text-[10.5px] text-neutral-400 uppercase tracking-wider">{addr.country === 'IN' ? 'India' : addr.country}</p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 mt-4 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-500">
                    <span className="text-[10.5px] text-neutral-400">
                      {addr.is_default ? 'Active for autonomous orders' : 'Secondary destination'}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(addr)}
                        className="h-6 px-2 text-neutral-700 hover:bg-neutral-100 rounded transition-colors font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Edit address"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(addr.id)}
                        className="h-6 px-2 text-neutral-400 hover:text-red-700 hover:bg-red-50 rounded transition-colors font-medium text-[11px] flex items-center gap-1 cursor-pointer"
                        title="Delete address"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-2xs">
          <div className="bg-white rounded-lg border border-neutral-200 max-w-lg w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-100">
              <h3 className="text-sm font-semibold text-neutral-900">
                {editingId ? 'Edit Delivery Address' : 'Add New Delivery Address'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-neutral-400 hover:text-neutral-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">Address Label *</label>
                  <select
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work / Office</option>
                    <option value="Warehouse">Warehouse</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.recipient_name}
                    onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                    placeholder="e.g. Recipient Full Name"
                    className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">Contact Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91 9876543210"
                  className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs font-mono text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">Address Line 1 (Flat, Building, Street) *</label>
                <input
                  type="text"
                  required
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  placeholder="Flat 402, Sunshine Heights, MG Road"
                  className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">Address Line 2 (Landmark, Area - Optional)</label>
                <input
                  type="text"
                  value={formData.line2 || ''}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  placeholder="Near Metro Station"
                  className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Bengaluru"
                    className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    placeholder="Karnataka"
                    className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all font-sans"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-600 mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="560001"
                    className="w-full h-9 px-3 rounded-md border border-neutral-200 text-xs font-mono text-neutral-900 bg-neutral-50/40 focus:bg-white focus:outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 transition-all"
                  />
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 text-xs text-neutral-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="w-3.5 h-3.5 rounded accent-neutral-900"
                  />
                  <span>Set as primary default destination for autonomous orders</span>
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="h-8 px-3 rounded-md border border-neutral-200 text-xs font-medium text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-8 px-4 rounded-md bg-neutral-900 hover:bg-black text-white text-xs font-medium transition cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingId ? 'Save Changes' : 'Save Address'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
