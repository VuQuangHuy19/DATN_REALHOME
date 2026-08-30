'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calculator, Users, Zap, Droplets, Wifi, Sparkles, Bike, Plus, Minus, Home } from 'lucide-react';

export interface RoomOption {
  id: string;
  code: string;
  price: number;
  floor?: number;
  roomType?: string;
}

interface MonthlyCostEstimatorProps {
  basePrice: number;
  electricityPrice?: number;
  waterPrice?: number;
  internetPrice?: number;
  commonServicePrice?: number;
  electricVehicleFee?: number;
  title?: string;
  roomOptions?: RoomOption[];
}

export function MonthlyCostEstimator({
  basePrice,
  electricityPrice = 4000,
  waterPrice = 35000,
  internetPrice = 100000,
  commonServicePrice = 200000,
  electricVehicleFee = 100000,
  title = 'Bảng tính chi phí hàng tháng',
  roomOptions,
}: MonthlyCostEstimatorProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string>(
    roomOptions && roomOptions.length > 0 ? roomOptions[0].id : ''
  );
  const [occupants, setOccupants] = useState<number>(1);
  const [electricityKwh, setElectricityKwh] = useState<number>(100);
  const [waterM3, setWaterM3] = useState<number>(3);
  const [hasVehicle, setHasVehicle] = useState<boolean>(true);

  const selectedRoom = roomOptions?.find((r) => r.id === selectedRoomId);
  const currentBasePrice = selectedRoom ? selectedRoom.price : basePrice;

  const electricityTotal = electricityKwh * electricityPrice;
  const waterTotal = waterM3 * waterPrice;
  const internetTotal = internetPrice;
  const serviceTotal = occupants * commonServicePrice;
  const vehicleTotal = hasVehicle ? electricVehicleFee : 0;

  const totalMonthly = currentBasePrice + electricityTotal + waterTotal + internetTotal + serviceTotal + vehicleTotal;

  return (
    <div className="border border-amber-200 dark:border-slate-800 rounded-2xl bg-gradient-to-b from-amber-500/5 via-card to-card shadow-sm overflow-hidden">
      <div className="p-4 border-b border-amber-100 dark:border-slate-800 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-amber-500 text-white shadow-xs">
            <Calculator className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 font-heading leading-tight">{title}</h3>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">Ước tính tổng tiền phòng + dịch vụ</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Room Selection Dropdown if provided */}
        {roomOptions && roomOptions.length > 0 && (
          <div className="p-2.5 rounded-xl border border-amber-200 dark:border-slate-800 bg-amber-500/10 dark:bg-amber-950/30 space-y-1">
            <label className="text-[11px] font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1">
              <Home className="h-3.5 w-3.5 text-amber-500" /> Chọn phòng dự định thuê:
            </label>
            <select
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
              className="w-full h-8 px-2 text-xs font-extrabold rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
            >
              {roomOptions.map((room) => (
                <option key={room.id} value={room.id}>
                  Phòng {room.code} {room.floor ? `(Tầng ${room.floor})` : ''} — {room.price.toLocaleString('vi-VN')}đ/tháng
                </option>
              ))}
            </select>
          </div>
        )}
        {/* Controls */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Occupants stepper */}
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex flex-col justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
              <Users className="h-3.5 w-3.5 text-amber-500" />
              <span>Số người ở</span>
            </div>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setOccupants(Math.max(1, occupants - 1))}
                className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Minus className="h-3 w-3" />
              </button>
              <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 font-mono">{occupants} người</span>
              <button
                type="button"
                onClick={() => setOccupants(Math.min(5, occupants + 1))}
                className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 transition-colors"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Vehicle toggle */}
          <div className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/60 flex flex-col justify-between gap-2">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold">
              <Bike className="h-3.5 w-3.5 text-teal-500" />
              <span>Gửi xe</span>
            </div>
            <button
              type="button"
              onClick={() => setHasVehicle(!hasVehicle)}
              className={`w-full py-1 px-2 rounded-lg font-bold transition-all text-center ${
                hasVehicle
                  ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-700'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}
            >
              {hasVehicle ? 'Có gửi xe (+1xe)' : 'Không gửi'}
            </button>
          </div>
        </div>

        {/* Sliders / Inputs for Elec & Water */}
        <div className="space-y-3 p-3 rounded-xl border border-amber-100 dark:border-slate-800/80 bg-amber-500/5 dark:bg-amber-950/20">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> Điện dự kiến:
              </span>
              <span className="font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                {electricityKwh} kWh ({electricityTotal.toLocaleString('vi-VN')}đ)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="300"
              step="10"
              value={electricityKwh}
              onChange={(e) => setElectricityKwh(Number(e.target.value))}
              className="w-full h-1.5 bg-amber-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                <Droplets className="h-3.5 w-3.5 text-sky-500" /> Nước dự kiến:
              </span>
              <span className="font-extrabold text-sky-600 dark:text-sky-400 font-mono">
                {waterM3} m³ ({waterTotal.toLocaleString('vi-VN')}đ)
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              step="1"
              value={waterM3}
              onChange={(e) => setWaterM3(Number(e.target.value))}
              className="w-full h-1.5 bg-sky-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500"
            />
          </div>
        </div>

        {/* Itemized Cost List */}
        <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Tiền phòng {selectedRoom ? `Phòng ${selectedRoom.code}` : 'cố định'}:</span>
            <span className="font-bold text-slate-900 dark:text-slate-100 font-mono">{currentBasePrice.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Internet:</span>
            <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">{internetTotal.toLocaleString('vi-VN')}đ</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Dịch vụ chung ({occupants} người):</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{serviceTotal.toLocaleString('vi-VN')}đ</span>
          </div>
          {hasVehicle && vehicleTotal > 0 && (
            <div className="flex justify-between text-slate-600 dark:text-slate-400">
              <span>Phí giữ / sạc xe:</span>
              <span className="font-semibold text-teal-600 dark:text-teal-400 font-mono">{vehicleTotal.toLocaleString('vi-VN')}đ</span>
            </div>
          )}
        </div>

        {/* Grand Total Box */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase font-bold text-amber-100 tracking-wider">Tổng chi phí ước tính</div>
            <div className="text-xs text-amber-100 font-medium">Bao gồm giá phòng + trọn gói dịch vụ</div>
          </div>
          <div className="text-right">
            <div className="text-lg sm:text-xl font-extrabold font-mono tracking-tight text-white drop-shadow-xs">
              {totalMonthly.toLocaleString('vi-VN')}đ
            </div>
            <div className="text-[10px] text-amber-100 font-semibold">/ tháng</div>
          </div>
        </div>
      </div>
    </div>
  );
}
