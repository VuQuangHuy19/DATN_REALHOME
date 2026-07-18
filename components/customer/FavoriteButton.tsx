'use client';

import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFavorites } from '@/src/lib/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface FavoriteButtonProps {
  roomId: string;
  className?: string;
}

export function FavoriteButton({ roomId, className }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(roomId);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite(roomId);
    if (!active) {
      toast.success('Đã lưu vào danh sách yêu thích');
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 rounded-full bg-white/90 shadow-sm backdrop-blur-sm border border-border-subtle hover:bg-white hover:scale-110 transition-all",
        active ? "text-danger" : "text-ink-muted hover:text-danger",
        className
      )}
      onClick={handleClick}
      title={active ? "Bỏ yêu thích" : "Lưu yêu thích"}
    >
      <Heart className={cn("h-4 w-4", active && "fill-danger")} />
    </Button>
  );
}
