import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import calendar component
const Calendar = lazy(() => 
  import('@/components/ui/calendar').then(module => ({
    default: module.Calendar
  }))
);

// Loading fallback for calendar
const CalendarSkeleton = () => (
  <div className="p-3 space-y-3">
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-[120px]" />
      <div className="flex gap-1">
        <Skeleton className="h-8 w-8" />
        <Skeleton className="h-8 w-8" />
      </div>
    </div>
    <div className="grid grid-cols-7 gap-1">
      {Array.from({ length: 42 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-8" />
      ))}
    </div>
  </div>
);

// Wrapper component with Suspense boundary
export const DynamicCalendar = (props: any) => (
  <Suspense fallback={<CalendarSkeleton />}>
    <Calendar {...props} />
  </Suspense>
);

export default DynamicCalendar;