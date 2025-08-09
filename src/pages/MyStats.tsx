import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Row { value: number | null; stat_definitions: { name: string; description?: string | null } | null }

const setSeo = (title: string, description: string, canonicalPath: string) => {
  document.title = title;
  const desc = document.querySelector('meta[name="description"]') || (() => {
    const m = document.createElement('meta');
    m.setAttribute('name', 'description');
    document.head.appendChild(m);
    return m;
  })();
  desc.setAttribute('content', description);
  const link = document.querySelector('link[rel="canonical"]') || (() => {
    const l = document.createElement('link');
    l.setAttribute('rel', 'canonical');
    document.head.appendChild(l);
    return l;
  })();
  link.setAttribute('href', window.location.origin + canonicalPath);
};

export default function MyStats() {
  const { profile } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    setSeo('My Stats - Athlete', 'View your personal performance stats.', '/my-stats');
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!profile?.id) return;
      const { data: athlete } = await supabase
        .from('athletes')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle();
      if (!athlete) return;
      const { data } = await supabase
        .from('stat_values')
        .select('value, stat_definitions:stat_id(name, description)')
        .eq('athlete_id', athlete.id);
      setRows(data as any || []);
    };
    load();
  }, [profile?.id]);

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">My Stats</h1>
        <p className="text-muted-foreground">These are the stats set by your coach.</p>
      </header>

      {rows.length === 0 ? (
        <p className="text-muted-foreground">No stats available yet.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <Card key={i} className="sport-card">
              <CardHeader>
                <CardTitle>{r.stat_definitions?.name || 'Stat'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{r.value ?? '—'}</p>
                {r.stat_definitions?.description && (
                  <p className="text-muted-foreground mt-1">{r.stat_definitions.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
