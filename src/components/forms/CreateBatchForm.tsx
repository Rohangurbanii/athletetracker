import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Users, Loader2 } from "lucide-react";

const createBatchSchema = z.object({
  name: z.string().min(1, "Batch name is required"),
  description: z.string().optional(),
  athleteIds: z.array(z.string()).min(1, "At least one athlete must be selected"),
});

type CreateBatchForm = z.infer<typeof createBatchSchema>;

interface Athlete {
  id: string;
  profile: {
    full_name: string;
    email: string;
  };
}

interface CreateBatchFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export const CreateBatchForm = ({ onSuccess, onCancel }: CreateBatchFormProps) => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingAthletes, setFetchingAthletes] = useState(true);
  const { toast } = useToast();

  const form = useForm<CreateBatchForm>({
    resolver: zodResolver(createBatchSchema),
    defaultValues: {
      name: "",
      description: "",
      athleteIds: [],
    },
  });

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    try {
      setFetchingAthletes(true);
      const { data: athletes, error } = await supabase
        .from("athletes")
        .select(`
          id,
          profile:profiles!athletes_profile_id_fkey (
            full_name,
            email
          )
        `);

      if (error) {
        console.error("Error fetching athletes:", error);
        toast({
          title: "Error",
          description: "Failed to fetch athletes",
          variant: "destructive",
        });
        return;
      }

      setAthletes(athletes || []);
    } catch (error) {
      console.error("Error fetching athletes:", error);
      toast({
        title: "Error",
        description: "Failed to fetch athletes",
        variant: "destructive",
      });
    } finally {
      setFetchingAthletes(false);
    }
  };

  const onSubmit = async (data: CreateBatchForm) => {
    try {
      setLoading(true);

      // Get current user's coach record
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast({
          title: "Error",
          description: "User not authenticated",
          variant: "destructive",
        });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, club_id")
        .eq("user_id", userData.user.id)
        .single();

      if (!profile) {
        toast({
          title: "Error",
          description: "Profile not found",
          variant: "destructive",
        });
        return;
      }

      const { data: coach } = await supabase
        .from("coaches")
        .select("id")
        .eq("profile_id", profile.id)
        .single();

      if (!coach) {
        toast({
          title: "Error",
          description: "Coach record not found",
          variant: "destructive",
        });
        return;
      }

      // Create the batch
      const { data: batch, error: batchError } = await supabase
        .from("batches")
        .insert({
          name: data.name,
          description: data.description,
          coach_id: coach.id,
          club_id: profile.club_id,
        })
        .select()
        .single();

      if (batchError) {
        console.error("Error creating batch:", batchError);
        toast({
          title: "Error",
          description: "Failed to create batch",
          variant: "destructive",
        });
        return;
      }

      // Add athletes to the batch
      const batchAthletes = data.athleteIds.map(athleteId => ({
        batch_id: batch.id,
        athlete_id: athleteId,
      }));

      const { error: athletesError } = await supabase
        .from("batch_athletes")
        .insert(batchAthletes);

      if (athletesError) {
        console.error("Error adding athletes to batch:", athletesError);
        toast({
          title: "Error",
          description: "Failed to add athletes to batch",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Batch "${data.name}" created successfully!`,
      });

      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error creating batch:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingAthletes) {
    return (
      <Card className="sport-card">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading athletes...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="sport-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Create New Batch
        </CardTitle>
        <CardDescription>
          Create a batch and assign athletes to it for better organization
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Batch Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Batch A, Advanced Group" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of this batch..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="athleteIds"
              render={() => (
                <FormItem>
                  <FormLabel>Select Athletes</FormLabel>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {athletes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No athletes available</p>
                    ) : (
                      athletes.map((athlete) => (
                        <FormField
                          key={athlete.id}
                          control={form.control}
                          name="athleteIds"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(athlete.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValue, athlete.id]);
                                    } else {
                                      field.onChange(
                                        currentValue.filter((value) => value !== athlete.id)
                                      );
                                    }
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="text-sm font-normal">
                                  {athlete.profile?.full_name || "Unknown"}
                                </FormLabel>
                                <p className="text-xs text-muted-foreground">
                                  {athlete.profile?.email || "No email"}
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Create Batch
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};