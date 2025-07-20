import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import the chart components to reduce bundle size
const ChartContainer = lazy(() => 
  import('@/components/ui/chart').then(module => ({
    default: module.ChartContainer
  }))
);

const ChartTooltip = lazy(() => 
  import('@/components/ui/chart').then(module => ({
    default: module.ChartTooltip
  }))
);

const ChartTooltipContent = lazy(() => 
  import('@/components/ui/chart').then(module => ({
    default: module.ChartTooltipContent
  }))
);

const ChartLegend = lazy(() => 
  import('@/components/ui/chart').then(module => ({
    default: module.ChartLegend
  }))
);

const ChartLegendContent = lazy(() => 
  import('@/components/ui/chart').then(module => ({
    default: module.ChartLegendContent
  }))
);

// Loading fallback for charts
const ChartSkeleton = () => (
  <div className="h-[300px] w-full space-y-3">
    <Skeleton className="h-4 w-[250px]" />
    <Skeleton className="h-[200px] w-full" />
    <div className="flex space-x-2">
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-4 w-[100px]" />
      <Skeleton className="h-4 w-[100px]" />
    </div>
  </div>
);

// Wrapper component that provides Suspense boundary
export const DynamicChartContainer = (props: any) => (
  <Suspense fallback={<ChartSkeleton />}>
    <ChartContainer {...props} />
  </Suspense>
);

export const DynamicChartTooltip = (props: any) => (
  <Suspense fallback={null}>
    <ChartTooltip {...props} />
  </Suspense>
);

export const DynamicChartTooltipContent = (props: any) => (
  <Suspense fallback={null}>
    <ChartTooltipContent {...props} />
  </Suspense>
);

export const DynamicChartLegend = (props: any) => (
  <Suspense fallback={null}>
    <ChartLegend {...props} />
  </Suspense>
);

export const DynamicChartLegendContent = (props: any) => (
  <Suspense fallback={null}>
    <ChartLegendContent {...props} />
  </Suspense>
);