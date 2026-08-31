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
  CheckCircle,
  Building2,
  Home,
  Briefcase,
  Phone,
  User,
  Loader2,
  X,
  ArrowLeft,
  ShieldCheck
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
        setSuccessMsg('Address added.');
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <Navigation />

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Consumer Account</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Delivery Addresses</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage shipping destinations used by AI agents for autonomous order execution.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/customer/chat')}
              className="px-3.5 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Back to Shopping Chat
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Address
            </button>
          </div>
        </div>

        {/* Banner Alert Messages */}
        {error && (
          <div className="mt-6 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
          </div>
        )}
        {successMsg && (
          <div className="mt-6 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Addresses Grid */}
        <div className="mt-8">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-slate-600" />
              <p className="text-xs">Loading addresses...</p>
            </div>
          ) : addresses.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-2xs">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">No saved addresses</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
                Add a delivery address to enable AI agents to execute and ship purchases automatically.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium text-xs rounded-lg shadow-xs transition-colors inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Address
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`bg-white rounded-xl border p-4.5 transition-all flex flex-col justify-between ${
                    addr.is_default
                      ? 'border-slate-400 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div>
                    {/* Header line inside card */}
                    <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{addr.label}</span>
                      </div>

                      {addr.is_default ? (
                        <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded">
                          Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-[11px] font-medium text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          Set default
                        </button>
                      )}
                    </div>

                    {/* Recipient & Address Details */}
                    <div className="space-y-1 text-xs text-slate-700">
                      <p className="font-semibold text-slate-900">{addr.recipient_name}</p>
                      <p className="text-slate-500">{addr.phone}</p>
                      <div className="pt-2 text-slate-600 leading-relaxed">
                        <p>{addr.line1}</p>
                        {addr.line2 && <p>{addr.line2}</p>}
                        <p className="font-medium text-slate-800 mt-1">
                          {addr.city}, {addr.state} {addr.postal_code}
                        </p>
                        <p className="text-[11px] text-slate-400">{addr.country === 'IN' ? 'India' : addr.country}</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 mt-4 border-t border-slate-100 flex items-center justify-end gap-1 text-slate-400">
                    <button
                      onClick={() => handleOpenEditModal(addr)}
                      className="p-1.5 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors text-xs font-medium flex items-center gap-1"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="text-[11px] text-slate-600">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(addr.id)}
                      className="p-1.5 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors text-xs font-medium flex items-center gap-1 ml-2"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[11px] text-red-600">Delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                {editingId ? 'Edit Address' : 'New Delivery Address'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">Label</label>
                  <select
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Office">Office</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">Recipient Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">Address Line 1 *</label>
                <input
                  type="text"
                  required
                  placeholder="Street, flat, building"
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">Address Line 2 (Optional)</label>
                <input
                  type="text"
                  placeholder="Area, landmark"
                  value={formData.line2}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="Bengaluru"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="Karnataka"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 uppercase tracking-wider mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="560001"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full text-xs rounded-lg border border-slate-200 px-3 py-2 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="modal_is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                />
                <label htmlFor="modal_is_default" className="text-xs text-slate-700">
                  Set as default delivery address
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingId ? 'Save Changes' : 'Save Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
