'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';

export interface FeatureToggles {
  enableInvoices: boolean; // Bật/Tắt Quản lý Hóa đơn & Thu tiền hàng tháng
  enableProfitReport: boolean; // Bật/Tắt Báo cáo Doanh thu & Net Profit
  enableZaloZns: boolean; // Bật/Tắt Tự động nhắn Zalo ZNS & SMS
  enableAiCopilot: boolean; // Bật/Tắt Trợ lý AI Copilot & Bot cư dân
  privacyShieldMode: boolean; // Bật/Tắt Chế độ Bảo mật Tài chính Chủ nhà (Ẩn P&L riêng tư khỏi Sàn)
  enableMaintenance: boolean; // Bật/Tắt Quản lý Bảo trì & Sự cố trên Sidebar
}

const DEFAULT_TOGGLES: FeatureToggles = {
  enableInvoices: true,
  enableProfitReport: true,
  enableZaloZns: true,
  enableAiCopilot: true,
  privacyShieldMode: true,
  enableMaintenance: true,
};

const LANDLORD_DEFAULT_TOGGLES: FeatureToggles = {
  enableInvoices: true, // Mặc định BẬT theo yêu cầu
  enableProfitReport: true, // Mặc định BẬT theo yêu cầu
  enableZaloZns: true,
  enableAiCopilot: true,
  privacyShieldMode: true,
  enableMaintenance: true,
};

export function useFeatureToggles() {
  const { role } = useAuth();
  const storageKey = `realhome_feature_toggles_${role || 'guest'}`;

  const getInitialToggles = (): FeatureToggles => {
    const defaultVal = role === 'landlord' ? LANDLORD_DEFAULT_TOGGLES : DEFAULT_TOGGLES;
    if (typeof window === 'undefined') return defaultVal;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        return { ...defaultVal, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultVal;
  };

  const [toggles, setToggles] = useState<FeatureToggles>(getInitialToggles);

  useEffect(() => {
    setToggles(getInitialToggles());
  }, [role, storageKey]);

  useEffect(() => {
    const handleToggleChange = () => {
      setToggles(getInitialToggles());
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('feature_toggles_changed', handleToggleChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('feature_toggles_changed', handleToggleChange);
      }
    };
  }, [storageKey, role]);

  const updateToggle = (key: keyof FeatureToggles, value: boolean) => {
    setToggles((prev) => {
      const updated = { ...prev, [key]: value };
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated));
        if (key === 'enableInvoices') {
          localStorage.setItem('landlord_settings_use_invoices', JSON.stringify(value));
        }
        if (key === 'enableMaintenance') {
          localStorage.setItem('landlord_settings_use_maintenance', JSON.stringify(value));
        }
      } catch {}
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('feature_toggles_changed'));
        window.dispatchEvent(new Event('landlord_settings_changed'));
      }
      return updated;
    });
  };

  const resetToDefaults = () => {
    const defaultVal = role === 'landlord' ? LANDLORD_DEFAULT_TOGGLES : DEFAULT_TOGGLES;
    setToggles(defaultVal);
    try {
      localStorage.setItem(storageKey, JSON.stringify(defaultVal));
      localStorage.setItem('landlord_settings_use_invoices', JSON.stringify(true));
      localStorage.setItem('landlord_settings_use_maintenance', JSON.stringify(true));
    } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('feature_toggles_changed'));
      window.dispatchEvent(new Event('landlord_settings_changed'));
    }
  };

  return {
    toggles,
    updateToggle,
    resetToDefaults,
  };
}

