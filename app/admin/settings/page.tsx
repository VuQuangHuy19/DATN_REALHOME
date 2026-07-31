'use client';

import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Moon, Sun, Laptop, Palette, Globe, Bell, Sliders } from 'lucide-react';
import { useAppPreferences, AccentColor, AppLanguage } from '@/components/providers/AppPreferencesProvider';
import { Switch } from '@/components/ui/switch';
import { useEffect, useState } from 'react';

const COLORS: { value: AccentColor; label: string; tailwind: string }[] = [
  { value: 'blue', label: 'Blue (Mặc định)', tailwind: 'bg-blue-600' },
  { value: 'emerald', label: 'Emerald', tailwind: 'bg-emerald-600' },
  { value: 'violet', label: 'Violet', tailwind: 'bg-violet-600' },
  { value: 'rose', label: 'Rose', tailwind: 'bg-rose-600' },
  { value: 'orange', label: 'Orange', tailwind: 'bg-orange-600' },
];

export default function AdminSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { accentColor, setAccentColor, language, setLanguage } = useAppPreferences();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-heading text-ink">
          {language === 'vi' ? 'Cài đặt' : 'Settings'}
        </h1>
        <p className="text-sm text-ink-muted mt-1">
          {language === 'vi' 
            ? 'Cá nhân hóa giao diện và cấu hình hệ thống của bạn'
            : 'Personalize your interface and system configurations'
          }
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cột trái */}
        <div className="space-y-6">
          
          {/* Giao diện (Sáng/Tối) */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sun className="h-5 w-5 text-accent" />
                {language === 'vi' ? 'Giao diện' : 'Appearance'}
              </CardTitle>
              <CardDescription>
                {language === 'vi' ? 'Chọn chế độ sáng hoặc tối' : 'Choose light or dark mode'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={theme}
                onValueChange={(val) => setTheme(val)}
                className="grid grid-cols-3 gap-4"
              >
                <div>
                  <RadioGroupItem value="light" id="light" className="peer sr-only" />
                  <Label
                    htmlFor="light"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-border-subtle bg-transparent p-4 hover:bg-bg-subtle hover:text-ink peer-data-[state=checked]:border-accent peer-data-[state=checked]:text-accent cursor-pointer"
                  >
                    <Sun className="mb-3 h-6 w-6" />
                    {language === 'vi' ? 'Sáng' : 'Light'}
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                  <Label
                    htmlFor="dark"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-border-subtle bg-transparent p-4 hover:bg-bg-subtle hover:text-ink peer-data-[state=checked]:border-accent peer-data-[state=checked]:text-accent cursor-pointer"
                  >
                    <Moon className="mb-3 h-6 w-6" />
                    {language === 'vi' ? 'Tối' : 'Dark'}
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="system" id="system" className="peer sr-only" />
                  <Label
                    htmlFor="system"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-border-subtle bg-transparent p-4 hover:bg-bg-subtle hover:text-ink peer-data-[state=checked]:border-accent peer-data-[state=checked]:text-accent cursor-pointer text-center"
                  >
                    <Laptop className="mb-3 h-6 w-6" />
                    {language === 'vi' ? 'Hệ thống' : 'System'}
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Màu chủ đạo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Palette className="h-5 w-5 text-accent" />
                {language === 'vi' ? 'Màu chủ đạo' : 'Accent Color'}
              </CardTitle>
              <CardDescription>
                {language === 'vi' ? 'Thay đổi template màu của các nút bấm' : 'Change the color template of interactive elements'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={accentColor}
                onValueChange={(val) => setAccentColor(val as AccentColor)}
                className="flex flex-wrap gap-4"
              >
                {COLORS.map((c) => (
                  <div key={c.value}>
                    <RadioGroupItem value={c.value} id={`color-${c.value}`} className="peer sr-only" />
                    <Label
                      htmlFor={`color-${c.value}`}
                      className="flex items-center gap-2 rounded-full border-2 border-border-subtle bg-transparent px-4 py-2 hover:bg-bg-subtle hover:text-ink peer-data-[state=checked]:border-accent peer-data-[state=checked]:text-accent cursor-pointer"
                    >
                      <div className={`h-4 w-4 rounded-full ${c.tailwind}`}></div>
                      <span className="text-sm font-medium">{c.label}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

        </div>

        {/* Cột phải */}
        <div className="space-y-6">
          
          {/* Ngôn ngữ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Globe className="h-5 w-5 text-accent" />
                {language === 'vi' ? 'Ngôn ngữ' : 'Language'}
              </CardTitle>
              <CardDescription>
                {language === 'vi' ? 'Lựa chọn ngôn ngữ hiển thị (Bản thử nghiệm)' : 'Select display language (Experimental)'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RadioGroup
                value={language}
                onValueChange={(val) => setLanguage(val as AppLanguage)}
                className="flex flex-col gap-3"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vi" id="lang-vi" />
                  <Label htmlFor="lang-vi" className="cursor-pointer">Tiếng Việt</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="en" id="lang-en" />
                  <Label htmlFor="lang-en" className="cursor-pointer">English</Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Thông báo */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Bell className="h-5 w-5 text-accent" />
                {language === 'vi' ? 'Thông báo' : 'Notifications'}
              </CardTitle>
              <CardDescription>
                {language === 'vi' ? 'Tùy chỉnh nhận thông báo hệ thống' : 'Customize system notifications'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Thông báo qua Email</Label>
                  <p className="text-sm text-ink-muted">
                    Nhận thông báo qua địa chỉ email của bạn
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Nhận bản tin (Newsletter)</Label>
                  <p className="text-sm text-ink-muted">
                    Thông tin cập nhật tính năng mới của hệ thống
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Cấu hình Cơ chế Hoa hồng & Lương thưởng True Home */}
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-950/20 to-slate-900">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-emerald-400">
                <Sliders className="h-5 w-5 text-emerald-400" />
                Cơ chế & Chính sách Hoa hồng
              </CardTitle>
              <CardDescription>
                Tùy biến thuật toán nội suy hoa hồng chủ nhà, tỷ lệ chia Sale và công cụ tính toán preview thực tế
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium">
                <a href="/admin/settings/commission-policies">
                  Truy cập Cấu hình Hoa hồng & Lương thưởng
                </a>
              </Button>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

