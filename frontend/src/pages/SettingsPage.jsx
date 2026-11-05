import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import api from '../api/client.js';
import { Button } from '../components/common/Button.jsx';
import { Input } from '../components/common/Input.jsx';
import {
  Settings,
  Building,
  CreditCard,
  Bot,
  ShieldCheck,
  Save,
  CheckCircle,
} from 'lucide-react';

export const SettingsPage = () => {
  const { user, activeWorkspace } = useAuth();
  const toast = useToast();
  const [profileData, setProfileData] = useState({
    businessName: activeWorkspace?.name || '',
    businessType: 'Agency',
    taxId: '29ABCDE1234F1Z5',
    addressLine1: 'Tech Park, Indiranagar',
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    paymentInstructions: 'UPI ID: technova@upi or Netbanking: HDFC0001234 A/C 987654321',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/workspaces/current');
        if (res.success && res.data?.businessProfile) {
          setProfileData(prev => ({
            ...prev,
            ...res.data.businessProfile,
          }));
        }
      } catch (err) {
        console.error('Error fetching workspace profile:', err);
      }
    };
    fetchProfile();
  }, [activeWorkspace?.id]);

  const handleChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/workspaces/current/profile', profileData);
      setSaved(true);
      toast.success('Settings Saved', 'Business profile and payment instructions updated successfully.');
    } catch (err) {
      toast.error('Update Failed', err.message || 'Failed to update business profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-black text-[#1C1D22] tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-[#1C1D22]" />
          Settings & Business Configuration
        </h1>
        <p className="text-xs text-[#8E9297] font-medium mt-1">
          Manage workspace settings, legal tax details, and payment gateway integrations
        </p>
      </div>

      {/* Business Profile Form */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl space-y-6 border border-[#E8E4DC] shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-[#E8E4DC]">
          <div className="flex items-center gap-2.5">
            <Building className="w-5 h-5 text-[#1C1D22]" />
            <h3 className="text-sm font-bold text-[#1C1D22]">Business & Invoicing Identity</h3>
          </div>
          {saved && (
            <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
              <CheckCircle className="w-4 h-4" /> Changes Saved
            </span>
          )}
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Business Name"
              name="businessName"
              value={profileData.businessName}
              onChange={handleChange}
              required
            />
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#1C1D22]">Business Structure</label>
              <select
                name="businessType"
                value={profileData.businessType}
                onChange={handleChange}
                className="w-full bg-white border border-[#E8E4DC] rounded-xl px-3.5 py-2.5 text-xs text-[#1C1D22] focus:outline-none focus:border-slate-400"
              >
                <option value="Freelancer">Freelancer / Professional</option>
                <option value="Agency">Digital Agency</option>
                <option value="Startup">Startup</option>
                <option value="Small Business">Small Business</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tax Identification / GSTIN"
              name="taxId"
              value={profileData.taxId || ''}
              onChange={handleChange}
              placeholder="29ABCDE1234F1Z5"
            />
            <Input
              label="City"
              name="city"
              value={profileData.city || ''}
              onChange={handleChange}
            />
          </div>

          <Input
            label="Registered Address"
            name="addressLine1"
            value={profileData.addressLine1 || ''}
            onChange={handleChange}
          />

          <div>
            <label className="block text-xs font-bold text-[#1C1D22] mb-1.5">
              Payment Instructions & Bank Transfer Details
            </label>
            <textarea
              name="paymentInstructions"
              rows={3}
              value={profileData.paymentInstructions || ''}
              onChange={handleChange}
              className="w-full bg-white border border-[#E8E4DC] rounded-xl p-3 text-xs text-[#1C1D22] focus:outline-none focus:border-slate-400 font-mono"
            />
            <p className="text-[10px] text-[#8E9297] mt-1 font-medium">
              These payment details and bank account instructions will appear on all generated PDF invoices.
            </p>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="md" loading={saving} icon={Save}>
              Save Business Details
            </Button>
          </div>
        </form>
      </div>

      {/* Connected Payment Providers Status */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl space-y-4 border border-[#E8E4DC] shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E4DC]">
          <CreditCard className="w-5 h-5 text-[#1C1D22]" />
          <h3 className="text-sm font-bold text-[#1C1D22]">Connected Fintech Gateways</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#1C1D22]">Razorpay Sandbox</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-[#8E9297] mt-1 font-medium">Domestic Indian UPI & Card Payments</p>
            </div>
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
          </div>

          <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E8E4DC] flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-[#1C1D22]">PayPal Sandbox</span>
                <span className="text-[10px] bg-sky-100 text-sky-800 font-bold px-2 py-0.5 rounded-full">
                  ACTIVE
                </span>
              </div>
              <p className="text-[11px] text-[#8E9297] mt-1 font-medium">International Global Client Flows</p>
            </div>
            <ShieldCheck className="w-6 h-6 text-sky-600" />
          </div>
        </div>
      </div>
    </div>
  );
};
