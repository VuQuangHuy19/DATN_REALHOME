'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  DollarSign,
  Sparkles,
  Layers,
  ScrollText,
  Map,
} from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import {
  usePriceRanges,
  useAmenities,
  useRentalRules,
  useAreas,
  useRoomTypesCatalog,
} from '@/features/categories/hooks/useCategories';
import { CrudTable } from './CrudTable';
import { PriceRangeFormModal } from './dialogs/PriceRangeFormModal';
import { AmenityFormModal } from './dialogs/AmenityFormModal';
import { RentalRuleFormModal } from './dialogs/RentalRuleFormModal';
import { AreaFormModal } from './dialogs/AreaFormModal';
import { RoomTypeFormModal } from './dialogs/RoomTypeFormModal';
import { formatVNDNumber, parseVNDNumber } from '../utils/categories.utils';

type TabType = 'prices' | 'amenities' | 'roomtypes' | 'rules' | 'areas';

export function CategoriesPage() {
  const { company } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('prices');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Form states
  const [formName, setFormName] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formMin, setFormMin] = useState('');
  const [formMax, setFormMax] = useState('');

  // Repositories & Hooks
  const {
    items: prices,
    loading: loadingPrices,
    add: addPrice,
    update: updatePrice,
    remove: removePrice,
  } = usePriceRanges(company?.id);

  const {
    items: amenities,
    loading: loadingAmenities,
    add: addAmenity,
    update: updateAmenity,
    remove: removeAmenity,
  } = useAmenities(company?.id);

  const {
    items: rules,
    loading: loadingRules,
    add: addRule,
    update: updateRule,
    remove: removeRule,
  } = useRentalRules(company?.id);

  const {
    items: areas,
    loading: loadingAreas,
    add: addArea,
    update: updateArea,
    remove: removeArea,
  } = useAreas(company?.id);

  const {
    items: roomTypes,
    loading: loadingRoomTypes,
    add: addRoomType,
    update: updateRoomType,
    remove: removeRoomType,
  } = useRoomTypesCatalog(company?.id);

  const openAdd = () => {
    setEditItem(null);
    setFormIcon(
      activeTab === 'rules'
        ? '📜'
        : activeTab === 'areas'
        ? '📍'
        : activeTab === 'roomtypes'
        ? '🏢'
        : '✨'
    );
    setFormLabel('');
    setFormMin('');
    setFormMax('');
    setFormName('');
    setFormDesc(
      activeTab === 'areas'
        ? 'Khu vực chính'
        : activeTab === 'rules'
        ? 'Quy định chung'
        : ''
    );
    setIsDialogOpen(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    if (activeTab === 'prices') {
      setFormLabel(item.label || '');
      setFormMin(item.min !== null && item.min !== undefined ? formatVNDNumber(item.min) : '');
      setFormMax(item.max !== null && item.max !== undefined ? formatVNDNumber(item.max) : '');
    } else if (activeTab === 'amenities') {
      setFormName(item.name || '');
      setFormIcon(item.icon || '✨');
    } else if (activeTab === 'rules') {
      setFormName(item.name || '');
      setFormIcon(item.icon || '📜');
      setFormDesc(item.description || 'Quy định chung');
    } else if (activeTab === 'areas') {
      setFormName(item.name || '');
      setFormIcon(item.icon || '📍');
      setFormDesc(
        item.description ||
          (item.name?.toLowerCase().includes('giáp ranh')
            ? 'Vùng giáp ranh'
            : 'Khu vực chính')
      );
    } else if (activeTab === 'roomtypes') {
      setFormName(item.name || '');
      setFormIcon(item.icon || '🏢');
      setFormDesc(item.description || '');
    }
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (activeTab === 'prices') await removePrice(id);
    if (activeTab === 'amenities') await removeAmenity(id);
    if (activeTab === 'rules') await removeRule(id);
    if (activeTab === 'areas') await removeArea(id);
    if (activeTab === 'roomtypes') await removeRoomType(id);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!company?.id) return;
    setSaving(true);

    try {
      if (activeTab === 'prices') {
        const parsedMin = parseVNDNumber(formMin);
        const parsedMax = parseVNDNumber(formMax);
        const payload = {
          company_id: company.id,
          label: formLabel,
          min: parsedMin !== null ? parsedMin : 0,
          max: parsedMax,
        };
        if (editItem) await updatePrice(editItem.id, payload);
        else await addPrice(payload);
      }

      if (activeTab === 'amenities') {
        const payload = {
          company_id: company.id,
          name: formName,
          icon: formIcon || null,
          category: 'amenity',
        };
        if (editItem) await updateAmenity(editItem.id, payload);
        else await addAmenity(payload);
      }

      if (activeTab === 'rules') {
        const payload = {
          company_id: company.id,
          name: formName,
          icon: formIcon || '📜',
          category: 'rule',
          description: formDesc || 'Quy định chung',
        };
        if (editItem) await updateRule(editItem.id, payload);
        else await addRule(payload);
      }

      if (activeTab === 'areas') {
        const payload = {
          company_id: company.id,
          name: formName,
          icon: formIcon || '📍',
          category: 'area',
          description: formDesc || 'Khu vực chính',
        };
        if (editItem) await updateArea(editItem.id, payload);
        else await addArea(payload);
      }

      if (activeTab === 'roomtypes') {
        const payload = {
          company_id: company.id,
          name: formName,
          description: formDesc || null,
          icon: formIcon || '🏢',
        };
        if (editItem) await updateRoomType(editItem.id, payload);
        else await addRoomType(payload);
      }

      setIsDialogOpen(false);
    } catch (err) {
      console.error('Lỗi khi lưu danh mục:', err);
    } finally {
      setSaving(false);
    }
  };

  const getActiveData = () => {
    switch (activeTab) {
      case 'prices':
        return prices;
      case 'amenities':
        return amenities;
      case 'rules':
        return rules;
      case 'areas':
        return areas;
      case 'roomtypes':
        return roomTypes;
      default:
        return [];
    }
  };

  const getActiveColumns = () => {
    switch (activeTab) {
      case 'prices':
        return [
          { key: 'label', label: 'Tên nhãn khoảng giá' },
          { key: 'min', label: 'Giá tối thiểu' },
          { key: 'max', label: 'Giá tối đa' },
        ];
      case 'amenities':
        return [
          { key: 'name', label: 'Tên tiện ích' },
          { key: 'icon', label: 'Biểu tượng' },
        ];
      case 'rules':
        return [
          { key: 'name', label: 'Nội quy / Quy định' },
          { key: 'description', label: 'Phân loại quy định' },
        ];
      case 'areas':
        return [
          { key: 'name', label: 'Tên khu vực / Vùng giáp ranh' },
          { key: 'description', label: 'Phân loại vùng' },
        ];
      case 'roomtypes':
        return [
          { key: 'name', label: 'Loại phòng' },
          { key: 'description', label: 'Mô tả chi tiết' },
        ];
      default:
        return [];
    }
  };

  const getActiveIcon = () => {
    switch (activeTab) {
      case 'prices':
        return DollarSign;
      case 'amenities':
        return Sparkles;
      case 'rules':
        return ScrollText;
      case 'areas':
        return Map;
      case 'roomtypes':
        return Layers;
      default:
        return DollarSign;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'prices':
        return 'Khoảng giá';
      case 'amenities':
        return 'Tiện ích BĐS';
      case 'rules':
        return 'Quy định thuê';
      case 'areas':
        return 'Khu vực';
      case 'roomtypes':
        return 'Loại phòng';
    }
  };

  const popularEmojis = ['📶', '❄️', '🛵', '🧺', '🍳', '🛋️', '🚿', '🔒', '☀️', '🌆', '🛗', '🚗'];
  const popularRuleEmojis = ['📜', '🐶', '🔑', '🚭', '🆔', '⏱️', '🔊', '🧹', '⚡', '💳'];

  const pricePresets = [
    { label: 'Dưới 3 triệu', min: 0, max: 3000000 },
    { label: '3 - 5 triệu', min: 3000000, max: 5000000 },
    { label: '5 - 7 triệu', min: 5000000, max: 7000000 },
    { label: '7 - 10 triệu', min: 7000000, max: 10000000 },
    { label: 'Trên 10 triệu', min: 10000000, max: '' },
  ];

  const rulePresets = [
    { name: 'Cho phép nuôi thú cưng', icon: '🐶', desc: 'Quy định chung' },
    { name: 'Cấm hút thuốc trong phòng', icon: '🚭', desc: 'Quy định cho phòng' },
    { name: 'Giờ giấc tự do 24/7', icon: '🔑', desc: 'Quy định chung' },
    { name: 'Yêu cầu CCCD / Đăng ký tạm trú', icon: '🆔', desc: 'Quy định chung' },
    { name: 'Giới hạn tối đa 2 người ở', icon: '👥', desc: 'Quy định cho phòng' },
    { name: 'Cấm làm ồn sau 23h', icon: '🔇', desc: 'Quy định chung' },
  ];

  const areaPresets = [
    { name: 'Cầu Giấy', icon: '📍', desc: 'Khu vực chính' },
    { name: 'Đống Đa', icon: '📍', desc: 'Khu vực chính' },
    { name: 'Thanh Xuân', icon: '📍', desc: 'Khu vực chính' },
    { name: 'Nam Từ Liêm', icon: '📍', desc: 'Khu vực chính' },
    { name: 'Tây Hồ', icon: '📍', desc: 'Khu vực chính' },
    { name: 'Bắc Từ Liêm', icon: '📍', desc: 'Khu vực chính' },
    { name: 'Giáp ranh Cầu Giấy - Nam Từ Liêm', icon: '🗺️', desc: 'Vùng giáp ranh' },
    { name: 'Giáp ranh Thanh Xuân - Đống Đa', icon: '🗺️', desc: 'Vùng giáp ranh' },
  ];

  const roomTypePresets = [
    { name: 'Studio', icon: '🏢', desc: 'Căn hộ Studio khép kín' },
    { name: '1N1K', icon: '🛋️', desc: '1 Phòng ngủ 1 Phòng khách' },
    { name: '2N1K', icon: '🏡', desc: '2 Phòng ngủ 1 Phòng khách' },
    { name: '2N1K-1WC', icon: '🚪', desc: '2 Phòng ngủ 1 Khách 1 Vệ sinh' },
    { name: '1 Ngủ 1 Gác xép', icon: '🛏️', desc: 'Căn hộ có thêm gác xép lửng' },
    { name: 'Gác xép', icon: '🪜', desc: 'Phòng trọ gác xép cao ráo' },
    { name: 'Giường tầng', icon: '🛌', desc: 'Ký túc xá / Giường tầng cao cấp' },
    { name: 'MBKD', icon: '🏪', desc: 'Mặt bằng kinh doanh / Shophouse' },
    { name: 'Duplex', icon: '🌇', desc: 'Căn hộ thông tầng cao cấp' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Page */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-border shadow-xs">
        <div>
          <h1 className="font-heading text-2xl font-extrabold text-ink flex items-center gap-2.5">
            <Layers className="h-7 w-7 text-accent" /> Quản lý Danh mục & Quy định BDS
          </h1>
          <p className="text-xs text-ink-muted mt-1">
            Cấu hình bộ lọc khoảng giá, tiện ích căn hộ, loại phòng, quy định thuê và phân vùng khu vực BDS.
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-accent hover:bg-accent/90 text-white font-bold rounded-xl h-11 px-5 shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4 mr-2" /> Thêm {getTabTitle()} mới
        </Button>
      </div>

      {/* Quick Overview Cards / Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          onClick={() => setActiveTab('prices')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'prices'
              ? 'bg-emerald-500/10 border-emerald-500 ring-2 ring-emerald-500/20'
              : 'bg-white border-border hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              KHOẢNG GIÁ
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
              $
            </div>
          </div>
          <p className="text-2xl font-extrabold text-ink mt-2">{prices.length}</p>
          <p className="text-[11px] text-ink-muted truncate">Bộ lọc tìm phòng</p>
        </button>

        <button
          onClick={() => setActiveTab('amenities')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'amenities'
              ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/20'
              : 'bg-white border-border hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              TIỆN ÍCH BDS
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center text-base">
              ✨
            </div>
          </div>
          <p className="text-2xl font-extrabold text-ink mt-2">{amenities.length}</p>
          <p className="text-[11px] text-ink-muted truncate">Căn hộ & Tòa nhà</p>
        </button>

        <button
          onClick={() => setActiveTab('roomtypes')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'roomtypes'
              ? 'bg-indigo-500/10 border-indigo-500 ring-2 ring-indigo-500/20'
              : 'bg-white border-border hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              LOẠI PHÒNG
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-base">
              🏢
            </div>
          </div>
          <p className="text-2xl font-extrabold text-ink mt-2">{roomTypes.length}</p>
          <p className="text-[11px] text-ink-muted truncate">Studio, 1PN, Duplex</p>
        </button>

        <button
          onClick={() => setActiveTab('rules')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'rules'
              ? 'bg-violet-500/10 border-violet-500 ring-2 ring-violet-500/20'
              : 'bg-white border-border hover:border-violet-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              QUY ĐỊNH THUÊ
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center text-base">
              📜
            </div>
          </div>
          <p className="text-2xl font-extrabold text-ink mt-2">{rules.length}</p>
          <p className="text-[11px] text-ink-muted truncate">Nội quy tòa nhà</p>
        </button>

        <button
          onClick={() => setActiveTab('areas')}
          className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${
            activeTab === 'areas'
              ? 'bg-blue-500/10 border-blue-500 ring-2 ring-blue-500/20'
              : 'bg-white border-border hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
              KHU VỰC
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center text-base">
              📍
            </div>
          </div>
          <p className="text-2xl font-extrabold text-ink mt-2">{areas.length}</p>
          <p className="text-[11px] text-ink-muted truncate">Quận & Vùng giáp ranh</p>
        </button>
      </div>

      {/* Main Table Area */}
      <div className="bg-white p-6 rounded-2xl border border-border shadow-xs">
        {/* Modularized Crud Table */}
        <CrudTable
          data={getActiveData()}
          columns={getActiveColumns()}
          onEdit={openEdit}
          onDelete={handleDelete}
          loading={
            activeTab === 'prices'
              ? loadingPrices
              : activeTab === 'amenities'
              ? loadingAmenities
              : activeTab === 'rules'
              ? loadingRules
              : activeTab === 'areas'
              ? loadingAreas
              : loadingRoomTypes
          }
          icon={getActiveIcon()}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          tabTitle={getTabTitle()}
          type={activeTab}
        />
      </div>

      {/* Form Dialog Modals */}
      {activeTab === 'prices' && (
        <PriceRangeFormModal
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editItem={editItem}
          formLabel={formLabel}
          setFormLabel={setFormLabel}
          formMin={formMin}
          setFormMin={setFormMin}
          formMax={formMax}
          setFormMax={setFormMax}
          pricePresets={pricePresets}
          saving={saving}
          onSave={handleSave}
        />
      )}

      {activeTab === 'amenities' && (
        <AmenityFormModal
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editItem={editItem}
          formName={formName}
          setFormName={setFormName}
          formIcon={formIcon}
          setFormIcon={setFormIcon}
          popularEmojis={popularEmojis}
          saving={saving}
          onSave={handleSave}
        />
      )}

      {activeTab === 'rules' && (
        <RentalRuleFormModal
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editItem={editItem}
          formName={formName}
          setFormName={setFormName}
          formDesc={formDesc}
          setFormDesc={setFormDesc}
          formIcon={formIcon}
          setFormIcon={setFormIcon}
          rulePresets={rulePresets}
          popularRuleEmojis={popularRuleEmojis}
          saving={saving}
          onSave={handleSave}
        />
      )}

      {activeTab === 'areas' && (
        <AreaFormModal
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editItem={editItem}
          formName={formName}
          setFormName={setFormName}
          formDesc={formDesc}
          setFormDesc={setFormDesc}
          formIcon={formIcon}
          setFormIcon={setFormIcon}
          areaPresets={areaPresets}
          saving={saving}
          onSave={handleSave}
        />
      )}

      {activeTab === 'roomtypes' && (
        <RoomTypeFormModal
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          editItem={editItem}
          formName={formName}
          setFormName={setFormName}
          formDesc={formDesc}
          setFormDesc={setFormDesc}
          formIcon={formIcon}
          setFormIcon={setFormIcon}
          roomTypePresets={roomTypePresets}
          saving={saving}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

export default CategoriesPage;
