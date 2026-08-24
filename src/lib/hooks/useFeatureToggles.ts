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
  enableInvoices: false, // Landlord Privacy: Mặc định TẮT hóa đơn ủy thác trừ khi Chủ nhà chủ động BẬT
  enableProfitReport: false, // Landlord Privacy: Mặc định TẮT P&L riêng tư
  enableZaloZns: true,
  enableAiCopilot: true,
  privacyShieldMode: true,
  enableMaintenance: false, // Mặc định TẮT Bảo trì & Sự cố, khi nào người dùng cần thì vào Settings bật lên
};

export function useFeatureToggles() {
  const { role } = useAuth();
  const storageKey = `realhome_feature_toggles_${role || 'guest'}`;

  const [toggles, setToggles] = useState<FeatureToggles>(() => {
    if (typeof window === 'undefined') {
      return role === 'landlord' ? LANDLORD_DEFAULT_TOGGLES : DEFAULT_TOGGLES;
    }
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return role === 'landlord' ? LANDLORD_DEFAULT_TOGGLES : DEFAULT_TOGGLES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(toggles));
    } catch {}
  }, [toggles, storageKey]);

  const updateToggle = (key: keyof FeatureToggles, value: boolean) => {
    setToggles((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const resetToDefaults = () => {
    const defaultVal = role === 'landlord' ? LANDLORD_DEFAULT_TOGGLES : DEFAULT_TOGGLES;
    setToggles(defaultVal);
  };

  return {
    toggles,
    updateToggle,
    resetToDefaults,
  };
}
