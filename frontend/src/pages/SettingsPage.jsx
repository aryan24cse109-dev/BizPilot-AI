import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { businessApi } from '../api/business.api.js';
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
    businessName: user?.businessProfile?.businessName || activeWorkspace?.name || '',
    businessType: user?.businessProfile?.businessType || 'STARTUP',
    taxId: user?.businessProfile?.gstin || user?.businessProfile?.taxId || '',
    addressLine1: user?.businessProfile?.addressLine1 || '',
    city: user?.businessProfile?.city || '',
    state: user?.businessProfile?.state || '',
    country: user?.businessProfile?.country || 'India',
    bankAccountName: user?.businessProfile?.bankAccountName || '',
    bankName: user?.businessProfile?.bankName || '',
    bankAccountNumber: user?.businessProfile?.bankAccountNumber || '',
    bankIfscCode: user?.businessProfile?.bankIfscCode || '',
    upiId: user?.businessProfile?.upiId || '',
    paymentInstructions: user?.businessProfile?.paymentInstructions || '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await businessApi.getProfile();
        const profile = res?.data?.profile || res?.data || res;
        if (profile) {
          setProfileData(prev => ({
            ...prev,
            businessName: profile.businessName || prev.businessName,
            businessType: profile.businessType || prev.businessType,
            taxId: profile.gstin || prev.taxId,
            addressLine1: profile.addressLine1 || prev.addressLine1,
            city: profile.city || prev.city,
            state: profile.state || prev.state,
            country: profile.country || prev.country,
            bankAccountName: profile.bankAccountName || prev.bankAccountName,
            bankName: profile.bankName || prev.bankName,
            bankAccountNumber: profile.bankAccountNumber || prev.bankAccountNumber,
            bankIfscCode: profile.bankIfscCode || prev.bankIfscCode,
            upiId: profile.upiId || prev.upiId,
            paymentInstructions: profile.paymentInstructions || prev.paymentInstructions,
          }));
        }
      } catch (err) {
        console.error('Error fetching business profile:', err);
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
      await businessApi.updateProfile({
        businessName: profileData.businessName,
        businessType: profileData.businessType,
        gstin: profileData.taxId || null,
        addressLine1: profileData.addressLine1 || null,
        city: profileData.city || null,
        state: profileData.state || null,
        country: profileData.country || 'India',
        bankAccountName: profileData.bankAccountName || null,
        bankName: profileData.bankName || null,
        bankAccountNumber: profileData.bankAccountNumber || null,
        bankIfscCode: profileData.bankIfscCode ? profileData.bankIfscCode.toUpperCase() : null,
        upiId: profileData.upiId || null,
        paymentInstructions: profileData.paymentInstructions || null,
      });
      setSaved(true);
      toast.success('Settings Saved', 'Business profile and bank settlement details updated successfully.');
    } catch (err) {
      toast.error('Update Failed', err?.response?.data?.message || err.message || 'Failed to update business profile.');
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

          {/* Bank Settlement Credentials */}
          <div className="pt-4 border-t border-[#E8E4DC] space-y-4">
            <div>
              <h4 className="text-xs font-bold text-[#1C1D22] uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Bank Settlement Credentials
              </h4>
              <p className="text-[11px] text-[#8E9297] mt-0.5">
                Bank account and UPI details where client payments and payouts settle.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Account Holder Name"
                name="bankAccountName"
                value={profileData.bankAccountName || ''}
                onChange={handleChange}
                placeholder="e.g. Acme Corp Solutions"
              />
              <Input
                label="Bank Name"
                name="bankName"
                value={profileData.bankName || ''}
                onChange={handleChange}
                placeholder="e.g. HDFC Bank"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Account Number"
                name="bankAccountNumber"
                value={profileData.bankAccountNumber || ''}
                onChange={handleChange}
                placeholder="e.g. 50100234567890"
              />
              <Input
                label="IFSC Code"
                name="bankIfscCode"
                value={profileData.bankIfscCode || ''}
                onChange={handleChange}
                placeholder="e.g. HDFC0001234"
              />
            </div>

            <Input
              label="UPI ID / VPA"
              name="upiId"
              value={profileData.upiId || ''}
              onChange={handleChange}
              placeholder="e.g. business@okaxis"
            />
          </div>

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

      {/* Platform & Intellectual Property */}
      <div className="bg-white p-6 rounded-3xl space-y-4 border border-[#E8E4DC] shadow-xs">
        <div className="flex items-center gap-2.5 pb-3 border-b border-[#E8E4DC]">
          <ShieldCheck className="w-5 h-5 text-[#1C1D22]" />
          <h3 className="text-sm font-bold text-[#1C1D22]">Platform & Ownership Verification</h3>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <p className="font-bold text-[#1C1D22]">Wealthra™ Financial Operations Engine</p>
            <p className="text-[11px] text-[#8E9297] mt-0.5">Authoritative Business Invoicing & Settlement Platform</p>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#E8E4DC] text-left sm:text-right">
            <span className="text-[10px] text-[#8E9297] block">Intellectual Property</span>
            <span className="font-bold text-[#1C1D22] text-xs">Owned by DEVRATOR</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
