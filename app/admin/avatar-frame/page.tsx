'use client';

import { SocialMediaBrandGenerator } from '@/components/admin/SocialMediaBrandGenerator';
import { useAuth } from '@/lib/auth/AuthContext';

export default function AvatarFramePage() {
  const { profile } = useAuth();

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      <SocialMediaBrandGenerator
        defaultName={profile?.full_name || 'Quang Huy RealHome'}
        defaultPhone={profile?.phone || '0857.844.999'}
      />
    </div>
  );
}
