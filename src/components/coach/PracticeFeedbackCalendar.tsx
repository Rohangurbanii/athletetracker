import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarDays, MessageSquare, Eye } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface FeedbackItem {
  id: string;
  athleteId: string;
  athleteName: string;
  content: string;
  feedbackDate: string;
  created_at: string;
}

const PracticeFeedbackCalendar = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const weekRange = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return { start, end };
  }, [selectedDate]);

  const weekLabel = useMemo(() => {
    const { start, end } = weekRange;
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  }, [weekRange]);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);
      try {
        const { start, end } = weekRange;
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');

        // Fetch practice feedback for the selected week
        const { data: feedbackData, error: feedbackError } = await supabase
          .from('practice_feedback')
          .select(`
            id,
            athlete_id,
            content,
            feedback_date,
            created_at,
            athletes!inner(
              id,
              profile_id,
              profiles!inner(full_name)
            )
          `)
          .gte('feedback_date', startStr)
          .lte('feedback_date', endStr)
          .order('feedback_date', { ascending: false })
          .order('created_at', { ascending: false });

        if (feedbackError) throw feedbackError;

        const formattedFeedback: FeedbackItem[] = (feedbackData || []).map((item: any) => ({
          id: item.id,
          athleteId: item.athlete_id,
          athleteName: item.athletes?.profiles?.full_name || 'Unknown Athlete',
          content: item.content,
          feedbackDate: item.feedback_date,
          created_at: item.created_at
        }));

        setFeedback(formattedFeedback);
        setLoading(false);
      } catch (e: any) {
        console.error('Error loading practice feedback:', e);
        setError('Failed to load practice feedback');
        setLoading(false);
      }
    };

    fetchFeedback();
  }, [weekRange]);

  // Group feedback by date
  const feedbackByDate = useMemo(() => {
    const grouped: Record<string, FeedbackItem[]> = {};
    feedback.forEach(item => {
      const date = item.feedbackDate;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(item);
    });
    return grouped;
  }, [feedback]);

  return (
    <Card className="sport-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            Practice Feedback
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-[260px] justify-start text-left font-normal',
                  !selectedDate && 'text-muted-foreground'
                )}
              >
                {weekLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                initialFocus
                className={cn('p-3 pointer-events-auto')}
              />
            </PopoverContent>
          </Popover>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="animate-spin w-6 h-6 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-muted-foreground">{error}</div>
        ) : Object.keys(feedbackByDate).length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No feedback for this week</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(feedbackByDate)
              .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
              .map(([date, feedbackItems]) => (
                <div key={date} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm text-muted-foreground">
                      {format(new Date(date), 'MMM d, yyyy')}
                    </h4>
                    <div className="flex-1 h-px bg-border"></div>
                    <Badge variant="secondary" className="text-xs">
                      {feedbackItems.length} feedback{feedbackItems.length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  {feedbackItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start justify-between p-3 bg-card/50 rounded-lg border border-border/50"
                    >
                       <div className="flex-1 min-w-0">
                         <p className="font-medium text-sm">{item.athleteName}</p>
                         <p className="text-sm text-muted-foreground line-clamp-2">
                           {item.content.substring(0, 100)}
                           {item.content.length > 100 && '...'}
                         </p>
                       </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="ml-2 flex-shrink-0"
                          >
                            View
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center space-x-2">
                              <span>Practice Feedback</span>
                            </DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="p-3 bg-muted/50 rounded-lg">
                              <p className="font-medium">{item.athleteName}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(item.feedbackDate), 'MMM d, yyyy')} at {format(new Date(item.created_at), 'h:mm a')}
                              </p>
                            </div>
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Feedback:</p>
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {item.content}
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PracticeFeedbackCalendar;