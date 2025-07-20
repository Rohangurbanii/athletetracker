import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

// Dynamically import heavy form components with react-hook-form
const CreateBatchForm = lazy(() => 
  import('@/components/forms/CreateBatchForm').then(module => ({
    default: module.CreateBatchForm
  }))
);

const EditBatchForm = lazy(() => 
  import('@/components/forms/EditBatchForm').then(module => ({
    default: module.EditBatchForm
  }))
);

const TournamentCommentsModal = lazy(() => 
  import('@/components/forms/TournamentCommentsModal').then(module => ({
    default: module.TournamentCommentsModal
  }))
);

const TournamentResultsForm = lazy(() => 
  import('@/components/forms/TournamentResultsForm').then(module => ({
    default: module.TournamentResultsForm
  }))
);

const AddTournamentForm = lazy(() => 
  import('@/components/forms/AddTournamentForm').then(module => ({
    default: module.AddTournamentForm
  }))
);

const TournamentAthletesModal = lazy(() => 
  import('@/components/forms/TournamentAthletesModal').then(module => ({
    default: module.TournamentAthletesModal
  }))
);

// Loading fallback for forms
const FormSkeleton = () => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-8 w-[200px]" />
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-10 w-[100px]" />
      <Skeleton className="h-10 w-[100px]" />
    </div>
  </div>
);

// Modal skeleton
const ModalSkeleton = () => (
  <div className="space-y-6 p-6">
    <Skeleton className="h-6 w-[250px]" />
    <div className="space-y-4">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-[200px] w-full" />
    </div>
    <div className="flex justify-end gap-2">
      <Skeleton className="h-10 w-[100px]" />
      <Skeleton className="h-10 w-[100px]" />
    </div>
  </div>
);

// Wrapper components with Suspense boundaries
export const DynamicCreateBatchForm = (props: any) => (
  <Suspense fallback={<FormSkeleton />}>
    <CreateBatchForm {...props} />
  </Suspense>
);

export const DynamicEditBatchForm = (props: any) => (
  <Suspense fallback={<FormSkeleton />}>
    <EditBatchForm {...props} />
  </Suspense>
);

export const DynamicTournamentCommentsModal = (props: any) => (
  <Suspense fallback={<ModalSkeleton />}>
    <TournamentCommentsModal {...props} />
  </Suspense>
);

export const DynamicTournamentResultsForm = (props: any) => (
  <Suspense fallback={<FormSkeleton />}>
    <TournamentResultsForm {...props} />
  </Suspense>
);

export const DynamicAddTournamentForm = (props: any) => (
  <Suspense fallback={<FormSkeleton />}>
    <AddTournamentForm {...props} />
  </Suspense>
);

export const DynamicTournamentAthletesModal = (props: any) => (
  <Suspense fallback={<ModalSkeleton />}>
    <TournamentAthletesModal {...props} />
  </Suspense>
);