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
  User,
  Loader2,
  X,
  ArrowRight,
  ShieldCheck,
  Truck,
  Compass
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
    if (l === 'work' || l === 'office') return <Briefcase className="w-3.5 h-3.5 text-slate-500" />;
    if (l === 'warehouse' || l === 'building') return <Building2 className="w-3.5 h-3.5 text-slate-500" />;
    return <Home className="w-3.5 h-3.5 text-slate-500" />;
  };

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 flex flex-col font-sans selection:bg-slate-200">
      <Navigation />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-6 border-b border-slate-200/80">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Consumer Account</span>
              <span className="text-slate-300">•</span>
              <span className="text-xs text-slate-500 font-medium">
                {addresses.length} {addresses.length === 1 ? 'Saved Destination' : 'Saved Destinations'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Delivery Addresses</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              Configure and manage shipping destinations. The default address is automatically selected by AI agents for autonomous order execution.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => router.push('/customer/chat')}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Back to Shopping Chat
            </button>
            <button
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              Add Address
            </button>
          </div>
        </div>

        {/* Banner Alert Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-center justify-between shadow-2xs">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
          </div>
        )}
        {successMsg && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs flex items-center gap-2 shadow-2xs">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600"></div>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Addresses Grid */}
        <div>
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center text-slate-400 gap-3">
              <Loader2 className="w-7 h-7 animate-spin text-slate-600" />
              <p className="text-xs font-medium">Loading saved addresses...</p>
            </div>
          ) : addresses.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-12 text-center shadow-xs max-w-md mx-auto my-8">
              <div className="w-12 h-12 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">No Delivery Addresses Added</h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Add at least one delivery destination so your AI shopping agent can automatically confirm and route purchases.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Your First Address
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between p-6 ${
                    addr.is_default
                      ? 'border-slate-400 shadow-sm ring-1 ring-slate-200'
                      : 'border-slate-200/90 hover:border-slate-300 shadow-2xs hover:shadow-xs'
                  }`}
                >
                  <div>
                    {/* Top Row: Label Pill & Default Tag */}
                    <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                          {getLabelIcon(addr.label)}
                        </div>
                        <span className="text-xs font-bold text-slate-900 tracking-wide uppercase">{addr.label}</span>
                      </div>

                      {addr.is_default ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                          Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefault(addr.id)}
                          className="text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                        >
                          Make default
                        </button>
                      )}
                    </div>

                    {/* Recipient Details */}
                    <div className="space-y-1.5">
                      <h2 className="text-base font-bold text-slate-900 tracking-tight">
                        {addr.recipient_name}
                      </h2>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{addr.phone}</span>
                      </div>
                    </div>

                    {/* Street & Postal Information */}
                    <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-600 leading-relaxed space-y-0.5">
                      <p className="text-slate-800 font-medium">{addr.line1}</p>
                      {addr.line2 && <p className="text-slate-600">{addr.line2}</p>}
                      <p className="text-slate-900 font-semibold pt-1">
                        {addr.city}, {addr.state} <span className="font-mono text-slate-600 font-normal">{addr.postal_code}</span>
                      </p>
                      <p className="text-[11px] text-slate-400 uppercase tracking-wider">{addr.country === 'IN' ? 'India' : addr.country}</p>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="text-[11px] text-slate-400">
                      {addr.is_default ? 'Active for autonomous orders' : 'Secondary destination'}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(addr)}
                        className="px-2.5 py-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors font-medium flex items-center gap-1"
                        title="Edit address"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(addr.id)}
                        className="px-2.5 py-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium flex items-center gap-1"
                        title="Delete address"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {/* Add New Address Dashed Card Slot */}
              <button
                onClick={handleOpenAddModal}
                className="border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all group bg-white/50 hover:bg-white min-h-[220px]"
              >
                <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-slate-900 text-slate-600 group-hover:text-white flex items-center justify-center mb-3 transition-colors">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-semibold text-slate-900 group-hover:text-slate-900 transition-colors">
                  Add New Address
                </span>
                <span className="text-xs text-slate-400 mt-1">
                  Add a work, home, or secondary delivery location
                </span>
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Add / Edit Address Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-2xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {editingId ? 'Edit Delivery Address' : 'Add Delivery Address'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Enter verified delivery location details</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Address Label</label>
                  <select
                    value={formData.label}
                    onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden transition"
                  >
                    <option value="Home">Home</option>
                    <option value="Work">Work</option>
                    <option value="Office">Office</option>
                    <option value="Primary">Primary</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 9876543210"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-mono transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Recipient Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Prem Patel"
                  value={formData.recipient_name}
                  onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Flat / Building / House No. *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Flat 402, Block B, Tech Residency"
                  value={formData.line1}
                  onChange={(e) => setFormData({ ...formData, line1: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden transition"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Street / Area / Landmark (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. Near Metro Station, Indiranagar"
                  value={formData.line2}
                  onChange={(e) => setFormData({ ...formData, line2: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden transition"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">City *</label>
                  <input
                    type="text"
                    required
                    placeholder="Bengaluru"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">State *</label>
                  <input
                    type="text"
                    required
                    placeholder="Karnataka"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden transition"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">PIN Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="560001"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    className="w-full text-xs rounded-xl border border-slate-200 px-3.5 py-2.5 bg-slate-50 focus:bg-white focus:border-slate-400 focus:outline-hidden font-mono transition"
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
                <label htmlFor="modal_is_default" className="text-xs text-slate-700 font-medium">
                  Set as default delivery address for agent purchases
                </label>
              </div>

              <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100 mt-5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
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
