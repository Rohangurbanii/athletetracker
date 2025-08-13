import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarDays, Moon } from 'lucide-react';
import { format, startOfWeek, endOfWeek, subWeeks, isValid } from 'date-fns';

interface RedFlagItem {
  athleteId: string;
  name: string;
  avatarUrl?: string | null;
  redFlagCount: number;
  weeksInList: number;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

const SleepRedFlags = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [items, setItems] = useState<RedFlagItem[]>([]);
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
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { start, end } = weekRange;
        const startStr = format(start, 'yyyy-MM-dd');
        const endStr = format(end, 'yyyy-MM-dd');

        // 1) Fetch all sleep logs visible to this coach for the selected week
        const { data: weekLogs, error: weekErr } = await supabase
          .from('sleep_logs')
          .select('athlete_id, duration_hours, sleep_date')
          .gte('sleep_date', startStr)
          .lte('sleep_date', endStr);

        if (weekErr) throw weekErr;

        // Count weekly red flags (< 8h)
        const weeklyCounts = new Map<string, number>();
        (weekLogs || []).forEach((row: any) => {
          const dur = Number(row.duration_hours ?? 0);
          if (isNaN(dur)) return;
          if (dur < 8) {
            weeklyCounts.set(row.athlete_id, (weeklyCounts.get(row.athlete_id) || 0) + 1);
          }
        });

        const athleteIds = Array.from(weeklyCounts.keys());
        if (athleteIds.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // 2) Historical weeks in list (last 52 weeks)
        const since = startOfWeek(subWeeks(new Date(), 52), { weekStartsOn: 1 });
        const { data: histLogs, error: histErr } = await supabase
          .from('sleep_logs')
          .select('athlete_id, sleep_date, duration_hours')
          .lt('duration_hours', 8)
          .in('athlete_id', athleteIds)
          .gte('sleep_date', format(since, 'yyyy-MM-dd'));
        if (histErr) throw histErr;

        const weeksByAthlete = new Map<string, Set<string>>();
        (histLogs || []).forEach((row: any) => {
          const d = new Date(row.sleep_date);
          if (!isValid(d)) return;
          const wkStart = startOfWeek(d, { weekStartsOn: 1 });
          const key = format(wkStart, 'yyyy-MM-dd');
          if (!weeksByAthlete.has(row.athlete_id)) weeksByAthlete.set(row.athlete_id, new Set());
          weeksByAthlete.get(row.athlete_id)!.add(key);
        });

        // 3) Resolve names/avatars
        const { data: athleteRows, error: athErr } = await supabase
          .from('athletes')
          .select('id, profile_id')
          .in('id', athleteIds);
        if (athErr) throw athErr;

        const profileIds = (athleteRows || []).map((a: any) => a.profile_id);
        const { data: profileRows, error: profErr } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', profileIds);
        if (profErr) throw profErr;

        const profileById = new Map<string, { full_name: string; avatar_url?: string | null }>();
        (profileRows || []).forEach((p: any) => profileById.set(p.id, { full_name: p.full_name, avatar_url: p.avatar_url }));

        const athleteToProfile = new Map<string, string>();
        (athleteRows || []).forEach((a: any) => athleteToProfile.set(a.id, a.profile_id));

        // 4) Assemble list and sort by weekly red flags desc
        const assembled: RedFlagItem[] = athleteIds.map((athleteId) => {
          const profileId = athleteToProfile.get(athleteId);
          const prof = profileId ? profileById.get(profileId) : undefined;
          return {
            athleteId,
            name: prof?.full_name || 'Unknown Athlete',
            avatarUrl: prof?.avatar_url || null,
            redFlagCount: weeklyCounts.get(athleteId) || 0,
            weeksInList: (weeksByAthlete.get(athleteId)?.size || 0),
          } as RedFlagItem;
        })
        .filter((i) => i.redFlagCount > 0)
        .sort((a, b) => b.redFlagCount - a.redFlagCount || a.name.localeCompare(b.name));

        setItems(assembled);
        setLoading(false);
      } catch (e: any) {
        console.error('Error loading sleep red flags:', e);
        setError('Failed to load sleep red flags');
        setLoading(false);
      }
    };

    run();
  }, [weekRange]);

  return (
    <Card className="sport-card">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Sleep Red Flags
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
                <CalendarDays className="mr-2 h-4 w-4" />
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
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No red flags for this week</div>
        ) : (
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.athleteId}
                className="flex items-center justify-between p-3 bg-card/50 rounded-lg border border-border/50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-md bg-accent flex items-center justify-center font-semibold">
                    {idx + 1}
                  </div>
                  <Avatar>
                    <AvatarImage src={item.avatarUrl || undefined} alt={`${item.name} avatar`} />
                    <AvatarFallback>{item.name.slice(0, 1).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{ordinal(item.weeksInList)} Week</p>
                  </div>
                </div>
                <Badge variant="destructive">{item.redFlagCount} red {item.redFlagCount === 1 ? 'log' : 'logs'}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SleepRedFlags;
