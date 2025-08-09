import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface StatDefinition { id: string; name: string; description?: string | null; }
interface Athlete { id: string; name: string; }

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

export default function AthleteStats() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [statDefs, setStatDefs] = useState<StatDefinition[]>([]);
  const [selectedStatId, setSelectedStatId] = useState<string>('');
  const [newStatName, setNewStatName] = useState('');
  const [newStatDesc, setNewStatDesc] = useState('');
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const isCoachOrAdmin = profile?.role === 'coach' || profile?.role === 'admin';

  useEffect(() => {
    setSeo('Athlete Stats - Coach', 'Create and update athlete stats for your club.', '/athlete-stats');
  }, []);

  useEffect(() => {
    if (!profile?.club_id) return;
    const fetchAll = async () => {
      // Load stat definitions for this club
      const { data: defs, error: defsErr } = await supabase
        .from('stat_definitions')
        .select('id, name, description')
        .eq('club_id', profile.club_id)
        .order('created_at', { ascending: false });
      if (!defsErr) setStatDefs(defs || []);

      // Load athletes in this club with their profile names
      const { data: clubAthletes } = await supabase
        .from('athletes')
        .select('id, profile_id');
      // Fetch profiles for names in bulk
      const profileIds = (clubAthletes || []).map(a => a.profile_id);
      let names: Record<string, string> = {};
      if (profileIds.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name, club_id')
          .in('id', profileIds)
          .eq('club_id', profile.club_id);
        (profs || []).forEach(p => { names[p.id] = p.full_name || 'Athlete'; });
      }
      const mapped: Athlete[] = (clubAthletes || [])
        .filter(a => names[a.profile_id])
        .map(a => ({ id: a.id, name: names[a.profile_id] }));
      setAthletes(mapped);
    };
    fetchAll();
  }, [profile?.club_id]);

  useEffect(() => {
    // When a stat is selected, load existing values to prefill
    const loadValues = async () => {
      if (!selectedStatId) return;
      const { data } = await supabase
        .from('stat_values')
        .select('athlete_id, value')
        .eq('stat_id', selectedStatId);
      const map: Record<string, string> = {};
      (data || []).forEach(v => { map[v.athlete_id] = String(v.value ?? ''); });
      setValues(map);
    };
    loadValues();
  }, [selectedStatId]);

  const handleCreateStat = async () => {
    if (!newStatName.trim() || !profile?.club_id || !profile?.id) return;
    const { data, error } = await supabase
      .from('stat_definitions')
      .insert({
        club_id: profile.club_id,
        name: newStatName.trim(),
        description: newStatDesc.trim() || null,
        created_by_profile_id: profile.id,
      })
      .select('id, name, description')
      .single();
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      return;
    }
    setStatDefs([data as StatDefinition, ...statDefs]);
    setSelectedStatId(data.id);
    setNewStatName('');
    setNewStatDesc('');
    toast({ title: 'Stat created', description: 'You can now enter values for each athlete.' });
  };

  const handleSaveAll = async () => {
    if (!selectedStatId) {
      toast({ variant: 'destructive', title: 'Select a stat', description: 'Choose or create a stat before saving.' });
      return;
    }
    const rows = Object.entries(values)
      .filter(([, v]) => v !== '' && !isNaN(Number(v)))
      .map(([athlete_id, v]) => ({ stat_id: selectedStatId, athlete_id, value: Number(v) }));
    if (rows.length === 0) {
      toast({ title: 'Nothing to save', description: 'Enter at least one value.' });
      return;
    }
    const { error } = await supabase
      .from('stat_values')
      .upsert(rows, { onConflict: 'stat_id,athlete_id' });
    if (error) {
      toast({ variant: 'destructive', title: 'Save failed', description: error.message });
    } else {
      toast({ title: 'Saved', description: 'Stat values updated.' });
    }
  };

  if (!isCoachOrAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Athlete Stats</h1>
        <p className="text-muted-foreground">Only coaches or admins can manage athlete stats.</p>
      </div>
    );
  }

  return (
    <main className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Athlete Stats</h1>
        <p className="text-muted-foreground">Define stats and input values for all athletes in your club.</p>
      </header>

      <Card className="sport-card">
        <CardHeader>
          <CardTitle>Choose Stat or Create New</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Select existing stat</Label>
              <Select value={selectedStatId} onValueChange={setSelectedStatId}>
                <SelectTrigger aria-label="Select stat">
                  <SelectValue placeholder="Select a stat" />
                </SelectTrigger>
                <SelectContent>
                  {statDefs.map(sd => (
                    <SelectItem key={sd.id} value={sd.id}>{sd.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Create new stat</Label>
              <div className="grid grid-cols-1 gap-2">
                <Input placeholder="e.g., Sprint Speed (m/s)" value={newStatName} onChange={(e) => setNewStatName(e.target.value)} />
                <Input placeholder="Optional description" value={newStatDesc} onChange={(e) => setNewStatDesc(e.target.value)} />
                <Button onClick={handleCreateStat} disabled={!newStatName.trim()}>Create Stat</Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="sport-card">
        <CardHeader>
          <CardTitle>Enter Values</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {athletes.length === 0 ? (
            <p className="text-muted-foreground">No athletes found in your club.</p>
          ) : (
            <div className="space-y-3">
              {athletes.map(a => (
                <div key={a.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <span className="font-medium">{a.name}</span>
                  </div>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Value"
                    value={values[a.id] ?? ''}
                    onChange={(e) => setValues(v => ({ ...v, [a.id]: e.target.value }))}
                    className="w-32"
                  />
                </div>
              ))}
              <div className="pt-2">
                <Button onClick={handleSaveAll}>Save All</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
