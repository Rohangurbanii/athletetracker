import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, X } from "lucide-react";

const editBatchSchema = z.object({
  name: z.string().min(1, "Batch name is required"),
  description: z.string().optional(),
  selectedAthletes: z.array(z.string()).min(0, "Select at least one athlete"),
});

type EditBatchForm = z.infer<typeof editBatchSchema>;

interface Athlete {
  id: string;
  profile: {
    full_name: string;
  };
}

interface BatchData {
  id: string;
  name: string;
  description: string;
  batch_athletes: Array<{
    athlete: Athlete;
  }>;
}

interface EditBatchFormProps {
  batch: BatchData;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EditBatchForm({ batch, onSuccess, onCancel }: EditBatchFormProps) {
  const [loading, setLoading] = useState(false);
  const [fetchingAthletes, setFetchingAthletes] = useState(true);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const { toast } = useToast();

  const form = useForm<EditBatchForm>({
    resolver: zodResolver(editBatchSchema),
    defaultValues: {
      name: batch.name,
      description: batch.description,
      selectedAthletes: batch.batch_athletes.map(ba => ba.athlete.id),
    },
  });

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    try {
      setFetchingAthletes(true);

      // Get current user's profile and club
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
        .select("club_id")
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

      // Get all athletes in the coach's club
      const { data: athletes, error } = await supabase
        .from("athletes")
        .select(`
          id,
          profile:profiles!athletes_profile_id_fkey(
            full_name
          )
        `)
        .eq("club_id", profile.club_id);

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

  const onSubmit = async (data: EditBatchForm) => {
    try {
      setLoading(true);

      // Update batch details
      const { error: updateError } = await supabase
        .from("batches")
        .update({
          name: data.name,
          description: data.description,
        })
        .eq("id", batch.id);

      if (updateError) {
        console.error("Error updating batch:", updateError);
        toast({
          title: "Error",
          description: "Failed to update batch",
          variant: "destructive",
        });
        return;
      }

      // Remove all existing athlete assignments for this batch
      const { error: deleteError } = await supabase
        .from("batch_athletes")
        .delete()
        .eq("batch_id", batch.id);

      if (deleteError) {
        console.error("Error removing old assignments:", deleteError);
        toast({
          title: "Error",
          description: "Failed to update athlete assignments",
          variant: "destructive",
        });
        return;
      }

      // Add new athlete assignments
      if (data.selectedAthletes.length > 0) {
        const batchAthletes = data.selectedAthletes.map((athleteId) => ({
          batch_id: batch.id,
          athlete_id: athleteId,
        }));

        const { error: insertError } = await supabase
          .from("batch_athletes")
          .insert(batchAthletes);

        if (insertError) {
          console.error("Error assigning athletes:", insertError);
          toast({
            title: "Error",
            description: "Failed to assign athletes to batch",
            variant: "destructive",
          });
          return;
        }
      }

      toast({
        title: "Success",
        description: `Batch "${data.name}" updated successfully!`,
      });

      onSuccess?.();
    } catch (error) {
      console.error("Error updating batch:", error);
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
          Edit Batch
        </CardTitle>
        <CardDescription>
          Update batch details and modify athlete assignments
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
                    <Input placeholder="Enter batch name" {...field} />
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
                      placeholder="Enter batch description"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="selectedAthletes"
              render={() => (
                <FormItem>
                  <FormLabel>Select Athletes</FormLabel>
                  <div className="grid gap-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                    {athletes.length === 0 ? (
                      <p className="text-muted-foreground text-center py-4">
                        No athletes found in your club
                      </p>
                    ) : (
                      athletes.map((athlete) => (
                        <FormField
                          key={athlete.id}
                          control={form.control}
                          name="selectedAthletes"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={athlete.id}
                                className="flex items-center space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(athlete.id)}
                                    onCheckedChange={(checked) => {
                                      const updatedValue = checked
                                        ? [...(field.value || []), athlete.id]
                                        : (field.value || []).filter(
                                            (value) => value !== athlete.id
                                          );
                                      field.onChange(updatedValue);
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal cursor-pointer">
                                  {athlete.profile.full_name}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3">
              <Button
                type="submit"
                disabled={loading}
                className="gradient-primary text-primary-foreground"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Batch
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={loading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}