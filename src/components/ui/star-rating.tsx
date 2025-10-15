import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  setRating?: (rating: number) => void;
  className?: string;
}

export const StarRating = ({ rating, setRating, className }: StarRatingProps) => {
  const handleSetRating = (newRating: number) => {
    if (setRating) {
      setRating(newRating);
    }
  };

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {[...Array(5)].map((_, i) => {
        const ratingValue = i + 1;
        return (
          <Star
            key={ratingValue}
            className={cn(
              'h-5 w-5 cursor-pointer',
              ratingValue <= rating ? 'text-primary fill-primary' : 'text-muted-foreground'
            )}
            onClick={() => handleSetRating(ratingValue)}
          />
        );
      })}
    </div>
  );
};
